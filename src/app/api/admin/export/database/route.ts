import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    // Only ADMIN role can export full database
    await requireAuth(["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx"; // "xlsx" or "json"

    // Fetch all database records
    const [
      users,
      roomTypes,
      rooms,
      slots,
      activities,
      aspects,
      inspections,
      inspectionDetails,
      photos,
      evaluations,
    ] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, fullName: true, role: true, active: true, createdAt: true },
        orderBy: { username: "asc" },
      }),
      prisma.roomType.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.room.findMany({
        include: { roomType: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.slot.findMany({
        include: { roomType: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.activity.findMany({
        include: { roomType: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.evaluationAspect.findMany({
        include: { roomType: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.inspection.findMany({
        include: {
          room: { select: { code: true, name: true } },
          user: { select: { username: true, fullName: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.inspectionDetail.findMany({
        include: {
          activity: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.inspectionPhoto.findMany({
        orderBy: { capturedAt: "desc" },
      }),
      prisma.evaluation.findMany({
        include: {
          room: { select: { name: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);

    // ── JSON BACKUP FORMAT ──
    if (format === "json") {
      const backupData = {
        meta: {
          appName: "Monitoring Kebersihan PLN UPS",
          exportedAt: new Date().toISOString(),
          totalInspections: inspections.length,
          totalDetails: inspectionDetails.length,
          totalPhotos: photos.length,
          totalEvaluations: evaluations.length,
        },
        users,
        roomTypes,
        rooms,
        slots,
        activities,
        aspects,
        inspections,
        inspectionDetails,
        photos,
        evaluations,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      return new NextResponse(jsonStr, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="PLN_UPS_Database_Backup_${timestamp}.json"`,
        },
      });
    }

    // ── MULTI-SHEET EXCEL WORKBOOK ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PLN UPS Monitoring Kebersihan";
    workbook.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF072D3F" } } as ExcelJS.Fill,
      alignment: { vertical: "middle" as const, horizontal: "center" as const },
    };

    function applyHeaderStyle(sheet: ExcelJS.Worksheet) {
      const row = sheet.getRow(1);
      row.height = 28;
      row.eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });
    }

    // 1. Sheet: RINGKASAN
    const summarySheet = workbook.addWorksheet("RINGKASAN_DATABASE");
    summarySheet.columns = [
      { header: "Tabel Data", key: "table", width: 28 },
      { header: "Jumlah Baris", key: "count", width: 18 },
      { header: "Keterangan", key: "desc", width: 45 },
    ];
    summarySheet.addRows([
      { table: "Inspections (Pemeriksaan)", count: inspections.length, desc: "Sesi pemeriksaan harian kebersihan" },
      { table: "InspectionDetails (Butir 5S)", count: inspectionDetails.length, desc: "Rincian checklist per indikator aktivitas" },
      { table: "Photos (Log Foto Bukti)", count: photos.length, desc: "Log foto evidence (disimpan di NAS)" },
      { table: "Evaluations (Kepuasan Pengguna)", count: evaluations.length, desc: "Penilaian kepuasan pengunjung via QR" },
      { table: "Rooms (Ruangan)", count: rooms.length, desc: "Master 28 ruangan PLN UPS" },
      { table: "Activities (Indikator)", count: activities.length, desc: "Master 72 butir aktivitas 5S" },
      { table: "Slots (Shift)", count: slots.length, desc: "Master slot shift pemeriksaan" },
      { table: "Users (Pengguna)", count: users.length, desc: "Akun login petugas, SPV, dan admin" },
    ]);
    applyHeaderStyle(summarySheet);

    // 2. Sheet: INSPECTIONS
    const inspSheet = workbook.addWorksheet("INSPECTIONS");
    inspSheet.columns = [
      { header: "ID Pemeriksaan", key: "id", width: 42 },
      { header: "Tanggal", key: "dateKey", width: 14 },
      { header: "Kode Ruangan", key: "roomCode", width: 16 },
      { header: "Nama Ruangan", key: "roomName", width: 32 },
      { header: "Shift", key: "slotCode", width: 14 },
      { header: "Petugas", key: "officer", width: 24 },
      { header: "Status", key: "status", width: 16 },
      { header: "Temuan Kotor", key: "dirtyCount", width: 14 },
      { header: "Foto Evidence", key: "evidence", width: 36 },
      { header: "Waktu Submit", key: "submittedAt", width: 24 },
    ];
    inspections.forEach((i) => {
      inspSheet.addRow({
        id: i.id,
        dateKey: i.dateKey,
        roomCode: i.room?.code || i.roomId,
        roomName: i.room?.name || "",
        slotCode: i.slotCode,
        officer: i.user?.fullName || i.user?.username || i.userId,
        status: i.overallStatus,
        dirtyCount: i.dirtyCount,
        evidence: i.evidenceName || "-",
        submittedAt: i.submittedAt ? new Date(i.submittedAt).toLocaleString("id-ID") : "",
      });
    });
    applyHeaderStyle(inspSheet);

    // 3. Sheet: INSPECTION_DETAILS
    const detailSheet = workbook.addWorksheet("INSPECTION_DETAILS");
    detailSheet.columns = [
      { header: "Detail ID", key: "id", width: 42 },
      { header: "Inspection ID", key: "inspectionId", width: 42 },
      { header: "Indikator 5S", key: "activityName", width: 32 },
      { header: "Hasil Kebersihan", key: "qualityResult", width: 18 },
      { header: "Label Kebersihan", key: "qualityLabel", width: 18 },
      { header: "Hasil Fungsi", key: "functionResult", width: 16 },
      { header: "Label Fungsi", key: "functionLabel", width: 16 },
      { header: "Catatan Temuan", key: "note", width: 36 },
    ];
    inspectionDetails.forEach((d) => {
      detailSheet.addRow({
        id: d.id,
        inspectionId: d.inspectionId,
        activityName: d.activity?.name || d.activityId,
        qualityResult: d.qualityResult,
        qualityLabel: d.qualityLabel || "-",
        functionResult: d.functionResult,
        functionLabel: d.functionLabel || "-",
        note: d.note || "-",
      });
    });
    applyHeaderStyle(detailSheet);

    // 4. Sheet: PHOTOS
    const photoSheet = workbook.addWorksheet("PHOTOS");
    photoSheet.columns = [
      { header: "Photo ID", key: "id", width: 42 },
      { header: "Inspection ID", key: "inspectionId", width: 42 },
      { header: "Nama File", key: "fileName", width: 36 },
      { header: "Path / URL Evidence", key: "fileUrl", width: 55 },
      { header: "Waktu Ambil", key: "capturedAt", width: 24 },
    ];
    photos.forEach((p) => {
      photoSheet.addRow({
        id: p.id,
        inspectionId: p.inspectionId,
        fileName: p.fileName,
        fileUrl: p.fileUrl,
        capturedAt: p.capturedAt ? new Date(p.capturedAt).toLocaleString("id-ID") : "",
      });
    });
    applyHeaderStyle(photoSheet);

    // 5. Sheet: EVALUATIONS
    const evalSheet = workbook.addWorksheet("EVALUATIONS");
    evalSheet.columns = [
      { header: "Eval ID", key: "id", width: 42 },
      { header: "Ruangan", key: "roomName", width: 32 },
      { header: "Rating Bintang", key: "rating", width: 15 },
      { header: "Label Rating", key: "ratingLabel", width: 18 },
      { header: "Komentar / Saran", key: "comment", width: 45 },
      { header: "Tanggal", key: "dateKey", width: 14 },
      { header: "Waktu Submit", key: "submittedAt", width: 24 },
    ];
    evaluations.forEach((e) => {
      evalSheet.addRow({
        id: e.id,
        roomName: e.room?.name || e.roomId,
        rating: e.rating,
        ratingLabel: e.ratingLabel,
        comment: e.comment || "-",
        dateKey: e.dateKey,
        submittedAt: e.submittedAt ? new Date(e.submittedAt).toLocaleString("id-ID") : "",
      });
    });
    applyHeaderStyle(evalSheet);

    // 6. Sheet: ROOMS
    const roomSheet = workbook.addWorksheet("ROOMS");
    roomSheet.columns = [
      { header: "Room ID", key: "id", width: 42 },
      { header: "Kode", key: "code", width: 14 },
      { header: "Nama Ruangan", key: "name", width: 32 },
      { header: "Tipe Ruangan", key: "typeName", width: 20 },
      { header: "Token QR", key: "qrToken", width: 24 },
      { header: "Aktif", key: "active", width: 12 },
    ];
    rooms.forEach((r) => {
      roomSheet.addRow({
        id: r.id,
        code: r.code,
        name: r.name,
        typeName: r.roomType?.name || r.roomTypeId,
        qrToken: r.qrToken,
        active: r.active ? "Ya" : "Tidak",
      });
    });
    applyHeaderStyle(roomSheet);

    // 7. Sheet: USERS
    const userSheet = workbook.addWorksheet("USERS");
    userSheet.columns = [
      { header: "User ID", key: "id", width: 32 },
      { header: "Username", key: "username", width: 18 },
      { header: "Nama Lengkap", key: "fullName", width: 30 },
      { header: "Role", key: "role", width: 16 },
      { header: "Aktif", key: "active", width: 12 },
    ];
    users.forEach((u) => {
      userSheet.addRow({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        active: u.active ? "Ya" : "Tidak",
      });
    });
    applyHeaderStyle(userSheet);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="PLN_UPS_Full_Database_Export_${timestamp}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export database error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal mengekspor database." },
      { status: 500 }
    );
  }
}
