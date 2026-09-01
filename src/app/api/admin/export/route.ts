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

    // Title styling
    sheet.mergeCells("A1:AJ1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `REKAPITULASI MONITORING KEBERSIHAN RUANGAN - BULAN ${monthNum}/${year}`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0076A8" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    // Header row
    const headers = ["No", "Kode Ruangan", "Nama Ruangan", "Tipe"];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(String(d).padStart(2, "0"));
    }
    headers.push("Total Selesai", "Persentase");

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005A82" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 24;

    // Populate data
    rooms.forEach((room, idx) => {
      const rowData: any[] = [idx + 1, room.code, room.name, room.roomType.name];
      let completedDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const roomDayInsps = inspections.filter((i) => i.roomId === room.id && i.dateKey === dateKey);

        const totalSlots = room.roomType.slots.length;
        const finished = roomDayInsps.length;

        if (finished === 0) {
          rowData.push("—");
        } else if (finished >= totalSlots) {
          rowData.push("●"); // Green complete
          completedDays++;
        } else {
          rowData.push("◐"); // Partial
          completedDays += 0.5;
        }
      }

      const percent = Math.round((completedDays / daysInMonth) * 100);
      rowData.push(completedDays, `${percent}%`);

      const addedRow = sheet.addRow(rowData);
      addedRow.alignment = { vertical: "middle", horizontal: "center" };
      addedRow.getCell(3).alignment = { vertical: "middle", horizontal: "left" };
    });

    // Auto-fit columns
    sheet.columns.forEach((col, idx) => {
      if (idx === 2) col.width = 30;
      else if (idx === 1 || idx === 3) col.width = 16;
      else col.width = 5;
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
