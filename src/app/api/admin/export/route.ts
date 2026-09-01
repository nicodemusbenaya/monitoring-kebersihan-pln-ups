import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
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
    const lastColIndex = 4 + daysInMonth + 2; // No, Code, Name, Type + days + Selesai + %
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
        } else if (petugasSlots.length > 0 && petugasFinished < petugasSlots.length) {
          rowValues.push("◐");
          cellStyles.push({ colIndex, fill: "FFFEF3C7", fontColor: "FFD97706", symbol: "◐" }); // Kuning
          fullDaysCompleted += 0.4;
        } else if (spvSlots.length > 0 && spvFinished < spvSlots.length) {
          rowValues.push("◈");
          cellStyles.push({ colIndex, fill: "FFF3E8FF", fontColor: "FF7E22CE", symbol: "◈" }); // Ungu
          fullDaysCompleted += 0.8;
        } else {
          rowValues.push("●");
          cellStyles.push({ colIndex, fill: "FFDCFCE7", fontColor: "FF15803D", symbol: "●" }); // Hijau
          fullDaysCompleted += 1;
        }
      }

      const percent = Math.min(100, Math.round((fullDaysCompleted / daysInMonth) * 100));
      rowValues.push(fullDaysCompleted.toFixed(1), `${percent}%`);

      const addedRow = sheet.addRow(rowValues);
      addedRow.height = 20;
      addedRow.alignment = { vertical: "middle", horizontal: "center" };
      addedRow.getCell(3).alignment = { vertical: "middle", horizontal: "left" };

      // Apply specific color styling for day cells
      cellStyles.forEach(({ colIndex, fill, fontColor }) => {
        const cell = addedRow.getCell(colIndex);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: fontColor } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
    });

    // Add 4-Color Legend Section below
    sheet.addRow([]);
    const legendHeader = sheet.addRow(["KETERANGAN WARNA STATUS MONITORING:"]);
    legendHeader.getCell(1).font = { name: "Arial", size: 10, bold: true };

    const legendItems = [
      { symbol: "✕", label: "Merah", desc: "Tidak ada sesi yang disubmit", fill: "FFFEE2E2", fontColor: "FFDC2626" },
      { symbol: "◐", label: "Kuning", desc: "Sesi disubmit tapi sesi Petugas Kebersihan belum lengkap", fill: "FFFEF3C7", fontColor: "FFD97706" },
      { symbol: "◈", label: "Ungu", desc: "Sesi Petugas Kebersihan lengkap, belum inspeksi SPV", fill: "FFF3E8FF", fontColor: "FF7E22CE" },
      { symbol: "●", label: "Hijau", desc: "Semua sesi lengkap (Petugas & SPV)", fill: "FFDCFCE7", fontColor: "FF15803D" },
    ];

    legendItems.forEach((item) => {
      const row = sheet.addRow(["", item.symbol, `${item.label}: ${item.desc}`]);
      const symCell = row.getCell(2);
      symCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: item.fill } };
      symCell.font = { name: "Arial", size: 11, bold: true, color: { argb: item.fontColor } };
      symCell.alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(3).font = { name: "Arial", size: 9, italic: true };
    });

    // Column widths
    sheet.columns.forEach((col, idx) => {
      if (idx === 2) col.width = 32;
      else if (idx === 1 || idx === 3) col.width = 16;
      else if (idx >= 4 && idx < 4 + daysInMonth) col.width = 4.5;
      else col.width = 14;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="REKAP-MONITORING-PLN-UPS-${month}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal membuat berkas Excel." }, { status: 500 });
  }
}
