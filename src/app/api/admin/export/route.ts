import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "monthly"; // "room" or "monthly"

    // ──────────────────────────── 1. SINGLE ROOM TEMPLATE-BASED WORKBOOK EXPORT ────────────────────────────
    if (exportType === "room") {
      const roomId = searchParams.get("roomId");
      const startDate = searchParams.get("startDate") || todayKey();

      let room = null;
      if (roomId && roomId.trim() !== "" && roomId !== "undefined" && roomId !== "null") {
        room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            roomType: {
              include: {
                activities: { orderBy: { sortOrder: "asc" } },
                slots: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        });
      }

      if (!room) {
        room = await prisma.room.findFirst({
          where: { active: true },
          include: {
            roomType: {
              include: {
                activities: { orderBy: { sortOrder: "asc" } },
                slots: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        });
      }

      if (!room) {
        return NextResponse.json({ ok: false, message: "Ruangan tidak ditemukan." }, { status: 404 });
      }

      // Generate 6 Days
      const days: { dayIndex: number; dateKey: string; dateFormatted: string }[] = [];
      const baseDate = new Date(startDate);
      for (let i = 0; i < 6; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        days.push({
          dayIndex: i + 1,
          dateKey: d.toISOString().slice(0, 10),
          dateFormatted: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d),
        });
      }

      const dateKeys = days.map((d) => d.dateKey);
      const inspections = await prisma.inspection.findMany({
        where: {
          roomId: room.id,
          dateKey: { in: dateKeys },
          state: "SUBMITTED",
        },
        include: {
          slot: true,
          user: true,
          details: { include: { activity: true } },
          photos: true,
        },
      });

      // Load official PLN template "Ceklis Ruangan UPS (1).xlsx"
      const templateCandidates = [
        path.join(process.cwd(), "Ceklis Ruangan UPS (1).xlsx"),
        path.join(process.cwd(), "public/templates/Ceklis Ruangan UPS (1).xlsx"),
        path.join(process.cwd(), "Ceklis Ruangan UPS (3).xlsx"),
        path.join(process.cwd(), "public/templates/Ceklis Ruangan UPS (3).xlsx"),
      ];
      const templatePath = templateCandidates.find((p) => fs.existsSync(p)) || templateCandidates[0];

      const workbook = new ExcelJS.Workbook();
      if (fs.existsSync(templatePath)) {
        await workbook.xlsx.readFile(templatePath);
      } else {
        workbook.addWorksheet("Ceklis Ruangan New");
      }

      // Determine the matching sheet name based on room type
      let targetSheetName = "Ceklis Ruangan New";
      const isToilet = room.roomType?.id === "TOILET" || room.roomType?.name.toLowerCase().includes("toilet");
      const isPantry = room.roomType?.id === "PANTRY" || room.roomType?.name.toLowerCase().includes("pantry");
      const isClass = room.roomType?.id === "CLASS" || room.roomType?.name.toLowerCase().includes("kelas") || room.roomType?.name.toLowerCase().includes("tuk");

      if (isToilet) targetSheetName = "Ceklis Toilet New";
      else if (isPantry) targetSheetName = "Ceklis Pantry";
      else if (isClass) targetSheetName = "Ceklis Ruang Kelas";

      let sheet = workbook.getWorksheet(targetSheetName);
      if (!sheet) {
        sheet = workbook.worksheets[0] || workbook.addWorksheet("Ceklis");
      }

      // Safe sheet name (e.g. "R_01" or room code)
      sheet.name = (room.code || "Ceklis").replace(/[:\\/?*\[\]]/g, "_").slice(0, 30);

      // ── Populate Header & Metadata ──
      sheet.getCell("A2").value = `CEKLIS KEBERSIHAN & KESIAPAN ${room.name.toUpperCase()}`;
      sheet.getCell("A3").value = "LOKASI";
      sheet.getCell("B3").value = ":";
      sheet.getCell("C3").value = room.name;

      sheet.getCell("A4").value = "PERIODE";
      sheet.getCell("B4").value = ":";
      sheet.getCell("C4").value = `${days[0].dateFormatted} s.d. ${days[5].dateFormatted}`;

      // Check which officers worked during the period
      const hasPagi = inspections.some((i) => (i.slot?.code || i.slotCode || "").toUpperCase().includes("PAGI"));
      const hasSore = inspections.some((i) => (i.slot?.code || i.slotCode || "").toUpperCase().includes("SORE"));

      const sulaimanPagi = inspections.some(
        (i) =>
          (i.user?.username === "sulaiman" || i.user?.fullName?.toLowerCase().includes("sulaiman")) &&
          (i.slot?.code || i.slotCode || "").toUpperCase().includes("PAGI")
      );
      const sulaimanSore = inspections.some(
        (i) =>
          (i.user?.username === "sulaiman" || i.user?.fullName?.toLowerCase().includes("sulaiman")) &&
          (i.slot?.code || i.slotCode || "").toUpperCase().includes("SORE")
      );

      const arifPagi = sulaimanPagi ? false : hasPagi;
      const arifSore = sulaimanSore ? false : hasSore;

      sheet.getCell("D5").value = arifPagi ? "[✓]" : "[   ]";
      sheet.getCell("H5").value = arifSore ? "[✓]" : "[   ]";
      sheet.getCell("D6").value = sulaimanPagi ? "[✓]" : "[   ]";
      sheet.getCell("H6").value = sulaimanSore ? "[✓]" : "[   ]";

      // ── Update Day Headers with Dates (Row 8) ──
      days.forEach((day, dIdx) => {
        const colStart = isToilet ? 4 + dIdx * 24 : 4 + dIdx * 12;
        sheet.getCell(8, colStart).value = `Hari ke ${day.dayIndex} (${day.dateKey})`;
      });

      // ── Populate Activity Rows in Column C ──
      // For standard non-toilet/pantry/class sheets (like ARCHIVE or custom rooms), ensure activities match DB
      const acts = room.roomType.activities;
      if (!isToilet && !isPantry && !isClass) {
        acts.forEach((act, idx) => {
          const rowNum = 12 + idx;
          sheet.getCell(rowNum, 1).value = idx + 1;
          sheet.getCell(rowNum, 3).value = act.name;
        });

        // Clear excess rows in template
        for (let r = 12 + acts.length; r <= 35; r++) {
          sheet.getCell(r, 1).value = null;
          sheet.getCell(r, 2).value = null;
          sheet.getCell(r, 3).value = null;
          for (let c = 4; c <= 76; c++) {
            sheet.getCell(r, c).value = null;
          }
        }
      }

      // Dynamic Row Mapping for activities
      const activityRowMap = new Map<string, number>();
      acts.forEach((act, idx) => {
        if (!isToilet && !isPantry && !isClass) {
          activityRowMap.set(act.id, 12 + idx);
        } else {
          // Search matching row in template Col C
          const normAct = act.name.toUpperCase().replace(/[\s\/\-_()]/g, "");
          for (let r = 12; r <= 35; r++) {
            const rawVal = sheet.getCell(r, 3).value || sheet.getCell(r, 2).value;
            if (rawVal) {
              const normText = String(rawVal).toUpperCase().replace(/[\s\/\-_()]/g, "");
              if (normText === normAct || normText.includes(normAct) || normAct.includes(normText)) {
                if (!activityRowMap.has(act.id)) {
                  activityRowMap.set(act.id, r);
                }
              }
            }
          }
          if (!activityRowMap.has(act.id)) {
            activityRowMap.set(act.id, 12 + idx);
          }
        }
      });

      // ── Populate Grid Matrix Rows ──
      acts.forEach((act, aIdx) => {
        const rowNum = activityRowMap.get(act.id) || (12 + aIdx);

        days.forEach((day, dIdx) => {
          const dayInspections = inspections.filter((i) => i.dateKey === day.dateKey);

          dayInspections.forEach((insp) => {
            const detail = insp.details.find((d) => d.activityId === act.id);
            if (!detail) return;

            const isClean = detail.qualityResult !== "NEGATIVE" && detail.qualityResult !== "KOTOR";
            const isNormal = detail.functionResult !== "NEGATIVE" && detail.functionResult !== "RUSAK" && detail.functionResult !== "TIDAK";

            const sCode = (insp.slot?.code || insp.slotCode || "PAGI").toUpperCase();

            let slotOffset = 0;
            if (isToilet) {
              if (sCode.includes("PAGI")) slotOffset = 0;
              else if (sCode.includes("INSP_1") || sCode.includes("INSP")) slotOffset = 4;
              else if (sCode.includes("SIANG")) slotOffset = 8;
              else if (sCode.includes("INSP_2")) slotOffset = 12;
              else if (sCode.includes("SORE")) slotOffset = 16;
              else if (sCode.includes("INSP_3")) slotOffset = 20;
            } else {
              if (sCode.includes("PAGI")) slotOffset = 0;
              else if (sCode.includes("SORE")) slotOffset = 4;
              else if (sCode.includes("INSP")) slotOffset = 8;
            }

            const baseCol = isToilet ? 4 + dIdx * 24 + slotOffset : 4 + dIdx * 12 + slotOffset;

            // Aktv: Sudah (col + 0) or Belum (col + 1) - tidak boleh bolong
            sheet.getCell(rowNum, baseCol + 0).value = isClean ? "v" : null;
            sheet.getCell(rowNum, baseCol + 1).value = !isClean ? "v" : null;

            // Fung: Normal/Ya (col + 2) or Rusak/Tidak (col + 3) - tidak boleh bolong
            sheet.getCell(rowNum, baseCol + 2).value = isNormal ? "v" : null;
            sheet.getCell(rowNum, baseCol + 3).value = !isNormal ? "v" : null;
          });
        });
      });

      // Safely remove other template sheets without mutating array during iteration
      const sheetsToRemove = workbook.worksheets.filter((ws) => ws.id !== sheet.id && !ws.name.startsWith("Standar"));
      sheetsToRemove.forEach((ws) => workbook.removeWorksheet(ws.id));

      // ── Sheet 2: EVIDENCE (Bukti Foto) ──
      const evidenceSheet = workbook.addWorksheet("EVIDENCE");
      evidenceSheet.getCell("A1").value = `EVIDENCE FOTO KEBERSIHAN - ${room.name}`;
      evidenceSheet.getCell("A1").font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      evidenceSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0076A8" } };
      evidenceSheet.getRow(1).height = 26;

      const evHeaders = ["No", "Waktu", "Sesi / Shift", "Petugas", "Status", "Catatan", "URL Bukti Foto (NAS)"];
      const hRow = evidenceSheet.addRow(evHeaders);
      hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005A82" } };
      hRow.height = 20;

      inspections.forEach((insp, iIdx) => {
        const timeStr = insp.submittedAt ? insp.submittedAt.toLocaleString("id-ID") : insp.dateKey;
        const photoUrl = insp.photos?.[0]?.fileUrl || "http://nasups01.myqnapcloud.com:18080/Public/Checklist_Evidence";
        const statusStr = insp.overallStatus === "BERSIH" ? "Bersih" : "Ada Temuan";

        evidenceSheet.addRow([
          iIdx + 1,
          timeStr,
          insp.slot?.name || insp.slotCode,
          insp.user?.fullName || "Petugas",
          statusStr,
          insp.overallStatus === "BERSIH" ? "Kondisi baik & bersih" : "Perlu perbaikan",
          photoUrl,
        ]);
      });

      evidenceSheet.columns = [
        { width: 6 },
        { width: 22 },
        { width: 16 },
        { width: 24 },
        { width: 14 },
        { width: 30 },
        { width: 50 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const safeFileName = (room.code || "Ruangan").replace(/[^a-zA-Z0-9_-]/g, "_");

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Ceklis_${safeFileName}_${startDate}.xlsx"`,
        },
      });
    }

    // ──────────────────────────── 2. MONTHLY ALL-ROOM MATRIX EXPORT ────────────────────────────
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const hiddenIdsExport = (await prisma.room.findMany({ where: { hidden: true }, select: { id: true } })).map((r) => r.id);
    const rooms = await prisma.room.findMany({
      where: { active: true, hidden: false },
      include: {
        roomType: {
          include: {
            slots: { where: { active: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const inspections = await prisma.inspection.findMany({
      where: {
        dateKey: { startsWith: month },
        state: "SUBMITTED",
        ...(hiddenIdsExport.length > 0 ? { roomId: { notIn: hiddenIdsExport } } : {}),
      },
      include: {
        slot: true,
        user: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PLN Unit Pelaksana Transmisi (UPS)";
    workbook.lastModifiedBy = "Sistem Monitoring Kebersihan Next.js";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Rekap ${month}`);

    // Header Title
    const lastColIndex = 4 + daysInMonth + 2;
    const lastColLetter = sheet.getColumn(lastColIndex).letter;

    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = sheet.getCell("A1");
    titleCell.value = `REKAPITULASI MONITORING KEBERSIHAN RUANGAN - BULAN ${monthNum}/${year}`;
    titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0076A8" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 28;

    // Header Row
    const headers = ["No", "Kode Ruangan", "Nama Ruangan", "Tipe"];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(String(d).padStart(2, "0"));
    }
    headers.push("Hari Lengkap", "Persentase");

    const headerRow = sheet.addRow(headers);
    headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005A82" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 22;

    // Populate data with 4 status colors
    rooms.forEach((room, idx) => {
      const petugasSlots = room.roomType.slots.filter((s) => s.role === "PETUGAS");
      const spvSlots = room.roomType.slots.filter((s) => s.role === "SUPERVISOR");

      const rowValues: any[] = [idx + 1, room.code, room.name, room.roomType.name];
      const cellStyles: { colIndex: number; fill: string; fontColor: string; symbol: string }[] = [];

      let fullDaysCompleted = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayInsps = inspections.filter((i) => i.roomId === room.id && i.dateKey === dateKey);

        const petugasFinished = dayInsps.filter((i) => i.slot.role === "PETUGAS").length;
        const spvFinished = dayInsps.filter((i) => i.slot.role === "SUPERVISOR").length;
        const totalFinished = dayInsps.length;

        const colIndex = 4 + d; // 1-indexed

        // 4 COLOR RULES:
        // 1. Merah: Tidak ada sesi yang disubmit
        // 2. Kuning: Ada sesi disubmit tapi sesi petugas belum lengkap
        // 3. Ungu: Sesi petugas sudah lengkap tapi belum ada/lengkap inspeksi SPV
        // 4. Hijau: Sesi petugas lengkap DAN sesi SPV lengkap (semuanya lengkap)
        if (totalFinished === 0) {
          rowValues.push("✕");
          cellStyles.push({ colIndex, fill: "FFFEE2E2", fontColor: "FFDC2626", symbol: "✕" }); // Merah
        } else if (petugasFinished < petugasSlots.length) {
          rowValues.push("◐");
          cellStyles.push({ colIndex, fill: "FFFEF3C7", fontColor: "FFD97706", symbol: "◐" }); // Kuning
        } else if (spvFinished < spvSlots.length) {
          rowValues.push("◈");
          cellStyles.push({ colIndex, fill: "FFF3E8FF", fontColor: "FF7E22CE", symbol: "◈" }); // Ungu
        } else {
          rowValues.push("●");
          cellStyles.push({ colIndex, fill: "FFDCFCE7", fontColor: "FF15803D", symbol: "●" }); // Hijau
          fullDaysCompleted++;
        }
      }

      const percentage = daysInMonth > 0 ? Math.round((fullDaysCompleted / daysInMonth) * 100) : 0;
      rowValues.push(`${fullDaysCompleted} / ${daysInMonth}`);
      rowValues.push(`${percentage}%`);

      const addedRow = sheet.addRow(rowValues);
      addedRow.height = 20;

      // Apply borders & alignment
      addedRow.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (colNum >= 5 && colNum <= 4 + daysInMonth) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNum === 1 || colNum > 4 + daysInMonth) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });

      // Apply specific cell fills based on 4-color status rules
      cellStyles.forEach(({ colIndex, fill, fontColor }) => {
        const targetCell = addedRow.getCell(colIndex);
        targetCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        targetCell.font = { name: "Arial", size: 10, bold: true, color: { argb: fontColor } };
      });
    });

    // Auto-fit column widths
    sheet.columns.forEach((col, idx) => {
      if (idx === 0) col.width = 6;
      else if (idx === 1) col.width = 16;
      else if (idx === 2) col.width = 32;
      else if (idx === 3) col.width = 16;
      else if (idx <= 3 + daysInMonth) col.width = 4.5;
      else col.width = 14;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Rekap_Kebersihan_PLN_UPS_${month}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal ekspor excel." }, { status: 500 });
  }
}
