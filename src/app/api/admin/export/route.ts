import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "monthly"; // "room" or "monthly"

    // ──────────────────────────── 1. SINGLE ROOM WORKBOOK EXPORT ────────────────────────────
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

      // 6 Days
      const days: { dayIndex: number; dateKey: string; dateFormatted: string }[] = [];
      const baseDate = new Date(startDate);
      for (let i = 0; i < 6; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        days.push({
          dayIndex: i + 1,
          dateKey: d.toISOString().slice(0, 10),
          dateFormatted: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d),
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

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "PLN Unit Pelaksana Transmisi (UPS)";
      workbook.created = new Date();

      const safeSheetName = (room.code || "Ceklis").replace(/[:\\/?*\[\]]/g, "_").slice(0, 30);
      const sheet = workbook.addWorksheet(safeSheetName);

      // Title
      sheet.mergeCells("A1:N1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = `CEKLIS KEBERSIHAN RUANGAN & KESIAPAN RUANGAN - ${room.name.toUpperCase()}`;
      titleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0076A8" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 28;

      // Metadata
      sheet.getCell("A3").value = "LOKASI";
      sheet.getCell("B3").value = `: ${room.name}`;
      sheet.getCell("A4").value = "PERIODE";
      sheet.getCell("B4").value = `: ${days[0].dateKey} s.d. ${days[days.length - 1].dateKey}`;
      sheet.getCell("A5").value = "Cleaning Service";
      sheet.getCell("B5").value = ": Arif Budi Hartono  [ ] Pagi  [ ] Sore";
      sheet.getCell("A6").value = "Cleaning Service";
      sheet.getCell("B6").value = ": Sulaiman  [✓] Pagi  [ ] Sore";
      sheet.getCell("A7").value = "Supervisor";
      sheet.getCell("B7").value = ": Ipal Hapidz";

      // Table Header Row 9
      sheet.getCell("A9").value = "NO";
      sheet.getCell("B9").value = "BAGIAN YANG DIPERIKSA";
      sheet.getCell("C9").value = `Hari ke-1 (${days[0]?.dateKey})`;
      sheet.getCell("D9").value = `Hari ke-2 (${days[1]?.dateKey})`;
      sheet.getCell("E9").value = `Hari ke-3 (${days[2]?.dateKey})`;
      sheet.getCell("F9").value = `Hari ke-4 (${days[3]?.dateKey})`;
      sheet.getCell("G9").value = `Hari ke-5 (${days[4]?.dateKey})`;
      sheet.getCell("H9").value = `Hari ke-6 (${days[5]?.dateKey})`;

      const hRow = sheet.getRow(9);
      hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005A82" } };
      hRow.alignment = { horizontal: "center", vertical: "middle" };

      // Activities rows
      room.roomType.activities.forEach((act, idx) => {
        const rowNum = 10 + idx;
        sheet.getCell(`A${rowNum}`).value = idx + 1;
        sheet.getCell(`B${rowNum}`).value = act.name;

        // Check if inspected
        days.forEach((day, dIdx) => {
          const dayInsp = inspections.find((i) => i.dateKey === day.dateKey);
          const colLetter = String.fromCharCode(67 + dIdx); // C, D, E, F...
          if (dayInsp) {
            const dt = dayInsp.details.find((d) => d.activityId === act.id);
            if (dt) {
              const isClean = dt.qualityResult === "POSITIVE" || dt.qualityResult === "BERSIH";
              sheet.getCell(`${colLetter}${rowNum}`).value = isClean ? "✓ Pos" : "✕ Neg";
              sheet.getCell(`${colLetter}${rowNum}`).alignment = { horizontal: "center" };
            }
          }
        });
      });

      // Sheet 2: EVIDENCE
      const evidenceSheet = workbook.addWorksheet("EVIDENCE");
      evidenceSheet.getCell("A1").value = `EVIDENCE FOTO KEBERSIHAN - ${room.name}`;
      evidenceSheet.getCell("A1").font = { bold: true, size: 12 };
      evidenceSheet.getCell("A3").value = "Waktu";
      evidenceSheet.getCell("B3").value = "Sesi / Shift";
      evidenceSheet.getCell("C3").value = "Petugas";
      evidenceSheet.getCell("D3").value = "Catatan";
      evidenceSheet.getCell("E3").value = "URL Bukti Foto (NAS)";

      inspections.forEach((insp, iIdx) => {
        const rNum = 4 + iIdx;
        const timeStr = insp.submittedAt ? insp.submittedAt.toISOString() : insp.dateKey;
        evidenceSheet.getCell(`A${rNum}`).value = timeStr;
        evidenceSheet.getCell(`B${rNum}`).value = insp.slot?.name || insp.slotCode;
        evidenceSheet.getCell(`C${rNum}`).value = insp.user?.fullName || "Sulaiman";
        evidenceSheet.getCell(`D${rNum}`).value = insp.overallStatus === "BERSIH" ? "Kondisi baik & bersih" : "Ada temuan";
        evidenceSheet.getCell(`E${rNum}`).value = insp.photos?.[0]?.fileUrl || "http://nasups01.myqnapcloud.com:18080/Public/Checklist_Evidence";
      });

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

    const rooms = await prisma.room.findMany({
      where: { active: true },
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
