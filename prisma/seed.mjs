import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database Monitoring Kebersihan PLN UPS...");

  // 1. Seed Users
  const passwordArif = await bcrypt.hash("ArifPLN123!", 10);
  const passwordSulaiman = await bcrypt.hash("SulaimanPLN123!", 10);
  const passwordIpal = await bcrypt.hash("IpalPLN123!", 10);
  const passwordDwi = await bcrypt.hash("DwiPLN123!", 10);

  const users = [
    { username: "arif", fullName: "Arif Budi Hartono", role: "PETUGAS", passwordHash: passwordArif, mustChangePassword: false },
    { username: "sulaiman", fullName: "Sulaiman", role: "PETUGAS", passwordHash: passwordSulaiman, mustChangePassword: false },
    { username: "ipal", fullName: "Ipal Hapidz", role: "SUPERVISOR", passwordHash: passwordIpal, mustChangePassword: false },
    { username: "dwi", fullName: "Dwi Meyrizka Prativi", role: "ADMIN", passwordHash: passwordDwi, mustChangePassword: false },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, role: u.role, active: true },
      create: u,
    });
  }
  console.log("✓ Akun pengguna berhasil disiapkan.");

  // 2. Seed Room Types
  const roomTypes = [
    { id: "GENERAL", name: "Ruangan Umum / Kerja", templateSheet: "Ceklis Ruangan New", workDays: 6, sortOrder: 1 },
    { id: "TOILET", name: "Toilet", templateSheet: "Ceklis Toilet New", workDays: 6, sortOrder: 2 },
    { id: "PANTRY", name: "Pantry", templateSheet: "Ceklis Pantry", workDays: 6, sortOrder: 3 },
    { id: "CLASS", name: "Ruang Kelas / TUK", templateSheet: "Ceklis Ruang Kelas", workDays: 6, sortOrder: 4 },
    { id: "ARCHIVE", name: "Ruang Arsip & Penyimpanan", templateSheet: "Ceklis Ruang Arsip", workDays: 6, sortOrder: 5 },
  ];

  for (const rt of roomTypes) {
    await prisma.roomType.upsert({
      where: { id: rt.id },
      update: { name: rt.name, templateSheet: rt.templateSheet, workDays: rt.workDays, sortOrder: rt.sortOrder },
      create: rt,
    });
  }
  console.log("✓ Tipe ruangan berhasil disiapkan.");

  // 3. Seed Rooms
  const rooms = [
    { code: "UPS", name: "Ruangan UPS", roomTypeId: "GENERAL", qrToken: "ROOM-UPS-01", sortOrder: 1 },
    { code: "SENIOR_MGR", name: "Ruang Senior Manager", roomTypeId: "GENERAL", qrToken: "ROOM-SENIOR-MGR-02", sortOrder: 2 },
    { code: "TOILET_SR_MGR", name: "Toilet Ruang Senior Manager", roomTypeId: "TOILET", qrToken: "ROOM-TOILET-SR-MGR-03", sortOrder: 3 },
    { code: "LOBBY_UTAMA", name: "Ruang Lobby Utama", roomTypeId: "GENERAL", qrToken: "ROOM-LOBBY-UTAMA-04", sortOrder: 4 },
    { code: "RAPAT_UTAMA", name: "Ruang Rapat G. Utama", roomTypeId: "GENERAL", qrToken: "ROOM-RAPAT-UTAMA-05", sortOrder: 5 },
    { code: "TOILET_PRIA_UTAMA", name: "Toilet Pria Gedung Utama", roomTypeId: "TOILET", qrToken: "ROOM-TOILET-PRIA-06", sortOrder: 6 },
    { code: "TOILET_WANITA_UTAMA", name: "Toilet Wanita Gedung Utama", roomTypeId: "TOILET", qrToken: "ROOM-TOILET-WANITA-07", sortOrder: 7 },
    { code: "ATK_FAST", name: "Ruang Penyimpanan ATK Fast Moving", roomTypeId: "GENERAL", qrToken: "ROOM-ATK-FAST-08", sortOrder: 8 },
    { code: "ASET_SLOW", name: "Ruang Penyimpanan Aset Slow Moving", roomTypeId: "ARCHIVE", qrToken: "ROOM-ASET-SLOW-09", sortOrder: 9 },
    { code: "WELLBEING", name: "Ruang Wellbeing", roomTypeId: "GENERAL", qrToken: "ROOM-WELLBEING-10", sortOrder: 10 },
    { code: "PMKU", name: "Ruang PMKU", roomTypeId: "GENERAL", qrToken: "ROOM-PMKU-11", sortOrder: 11 },
    { code: "PSA", name: "Ruang PSA", roomTypeId: "GENERAL", qrToken: "ROOM-PSA-12", sortOrder: 12 },
    { code: "PMA", name: "Ruang PMA", roomTypeId: "GENERAL", qrToken: "ROOM-PMA-13", sortOrder: 13 },
    { code: "PKSM", name: "Ruang PKSM", roomTypeId: "GENERAL", qrToken: "ROOM-PKSM-14", sortOrder: 14 },
    { code: "PANTRY", name: "Pantry Gedung Utama", roomTypeId: "PANTRY", qrToken: "ROOM-PANTRY-15", sortOrder: 15 },
    { code: "LOBBY_TUK", name: "Lobby Gedung TUK", roomTypeId: "GENERAL", qrToken: "ROOM-LOBBY-TUK-16", sortOrder: 16 },
    { code: "TUK_ADMIN", name: "Ruang Kelas TUK / Admin", roomTypeId: "CLASS", qrToken: "ROOM-TUK-ADMIN-17", sortOrder: 17 },
    { code: "PJT", name: "Ruang PJT", roomTypeId: "GENERAL", qrToken: "ROOM-PJT-18", sortOrder: 18 },
    { code: "RAPAT_KECIL_TUK", name: "Rapat Kecil Gedung TUK", roomTypeId: "GENERAL", qrToken: "ROOM-RAPAT-TUK-19", sortOrder: 19 },
    { code: "TOILET_PRIA_TUK", name: "Toilet Pria Gedung TUK", roomTypeId: "TOILET", qrToken: "ROOM-TOILET-PRIA-TUK-20", sortOrder: 20 },
    { code: "TOILET_WANITA_TUK", name: "Toilet Wanita Gedung TUK", roomTypeId: "TOILET", qrToken: "ROOM-TOILET-WANITA-TUK-21", sortOrder: 21 },
    { code: "RAPAT_ZOOM", name: "Ruang Rapat Digital / Zoom", roomTypeId: "CLASS", qrToken: "ROOM-RAPAT-ZOOM-22", sortOrder: 22 },
    { code: "ARSIP_AKTIF", name: "Ruang Arsip Aktif", roomTypeId: "ARCHIVE", qrToken: "ROOM-ARSIP-AKTIF-23", sortOrder: 23 },
    { code: "ARSIP_INAKTIF", name: "Ruang Arsip Utama Inaktif", roomTypeId: "ARCHIVE", qrToken: "ROOM-ARSIP-INAKTIF-24", sortOrder: 24 },
  ];

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { code: r.code },
      update: { name: r.name, roomTypeId: r.roomTypeId, sortOrder: r.sortOrder },
      create: r,
    });
  }
  console.log("✓ Seluruh ruangan PLN UPS berhasil disiapkan.");

  // 4. Seed Slots
  const slots = [
    // GENERAL
    { id: "GEN-PAGI", roomTypeId: "GENERAL", code: "PAGI", name: "Pagi", role: "PETUGAS", sortOrder: 1 },
    { id: "GEN-SORE", roomTypeId: "GENERAL", code: "SORE", name: "Sore", role: "PETUGAS", sortOrder: 2 },
    { id: "GEN-INSP", roomTypeId: "GENERAL", code: "INSPEKSI", name: "Inspeksi", role: "SUPERVISOR", sortOrder: 3 },
    // PANTRY
    { id: "PANTRY-PAGI", roomTypeId: "PANTRY", code: "PAGI", name: "Pagi", role: "PETUGAS", sortOrder: 1 },
    { id: "PANTRY-SORE", roomTypeId: "PANTRY", code: "SORE", name: "Sore", role: "PETUGAS", sortOrder: 2 },
    { id: "PANTRY-INSP", roomTypeId: "PANTRY", code: "INSPEKSI", name: "Inspeksi", role: "SUPERVISOR", sortOrder: 3 },
    // CLASS
    { id: "CLASS-PAGI", roomTypeId: "CLASS", code: "PAGI", name: "Pagi", role: "PETUGAS", sortOrder: 1 },
    { id: "CLASS-SORE", roomTypeId: "CLASS", code: "SORE", name: "Sore", role: "PETUGAS", sortOrder: 2 },
    { id: "CLASS-INSP", roomTypeId: "CLASS", code: "INSPEKSI", name: "Inspeksi", role: "SUPERVISOR", sortOrder: 3 },
    // ARCHIVE
    { id: "ARCHIVE-PAGI", roomTypeId: "ARCHIVE", code: "PAGI", name: "Pagi", role: "PETUGAS", sortOrder: 1 },
    { id: "ARCHIVE-SORE", roomTypeId: "ARCHIVE", code: "SORE", name: "Sore", role: "PETUGAS", sortOrder: 2 },
    { id: "ARCHIVE-INSP", roomTypeId: "ARCHIVE", code: "INSPEKSI", name: "Inspeksi", role: "SUPERVISOR", sortOrder: 3 },
    // TOILET (3x shift + 3x inspeksi)
    { id: "TOILET-PAGI", roomTypeId: "TOILET", code: "PAGI", name: "Pagi", role: "PETUGAS", sortOrder: 1 },
    { id: "TOILET-INSP1", roomTypeId: "TOILET", code: "INSPEKSI_1", name: "Inspeksi 1", role: "SUPERVISOR", sortOrder: 2 },
    { id: "TOILET-SIANG", roomTypeId: "TOILET", code: "SIANG", name: "Siang", role: "PETUGAS", sortOrder: 3 },
    { id: "TOILET-INSP2", roomTypeId: "TOILET", code: "INSPEKSI_2", name: "Inspeksi 2", role: "SUPERVISOR", sortOrder: 4 },
    { id: "TOILET-SORE", roomTypeId: "TOILET", code: "SORE", name: "Sore", role: "PETUGAS", sortOrder: 5 },
    { id: "TOILET-INSP3", roomTypeId: "TOILET", code: "INSPEKSI_3", name: "Inspeksi 3", role: "SUPERVISOR", sortOrder: 6 },
  ];

  for (const s of slots) {
    await prisma.slot.upsert({
      where: { id: s.id },
      update: { name: s.name, role: s.role, sortOrder: s.sortOrder },
      create: s,
    });
  }
  console.log("✓ Slot monitoring berhasil disiapkan.");

  // 5. Seed Activities / 5S Indicators
  const items = [
    // GENERAL
    { roomTypeId: "GENERAL", name: "LANTAI", row: 12, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "LANGIT-LANGIT / PLAFON", row: 13, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "DINDING", row: 14, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "TEMPAT SAMPAH", row: 15, qp: "Sampah sudah diangkut", qn: "Sampah belum diangkut", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "BAU RUANGAN", row: 16, qp: "Tidak bau", qn: "Bau tidak sedap", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "SELASAR", row: 17, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "VENTILASI / JENDELA", row: 18, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "AC (AIR CONDITIONER)", row: 19, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "LAMPU", row: 20, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "STOP KONTAK", row: 21, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "LEMARI", row: 22, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "MEJA", row: 23, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "KURSI", row: 24, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "PAPAN TULIS / WHITEBOARD", row: 25, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "DISPENSER", row: 26, qp: "Bersih", qn: "Kotor", fp: "Galon terisi", fn: "Galon habis" },
    { roomTypeId: "GENERAL", name: "JARINGAN WIFI / INTERNET", row: 27, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "GENERAL", name: "KOTAK P3K DAN ISINYA", row: 28, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Lengkap", fn: "Tidak lengkap" },
    { roomTypeId: "GENERAL", name: "MEDIA DISPLAY (PROYEKTOR / VIDEOTRON)", row: 29, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },

    // TOILET
    { roomTypeId: "TOILET", name: "LANTAI", row: 12, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "DINDING", row: 13, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "VENTILASI", row: 14, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "CLOSET", row: 15, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "JET SHOWER / BIDET", row: 16, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "URINOIR", row: 17, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "PENGHARUM TOILET", row: 18, qp: "Tidak bau", qn: "Bau tidak sedap", fp: "Ada", fn: "Tidak ada" },
    { roomTypeId: "TOILET", name: "WASTAFEL & KRAN AIR", row: 19, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "CERMIN", row: 20, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "TEMPAT SAMPAH", row: 21, qp: "Sampah sudah diangkut", qn: "Sampah belum diangkut", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "PINTU", row: 22, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "LAMPU", row: 23, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "HANDRAIL (DISABILITAS)", row: 24, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "TOILET", name: "SABUN CUCI TANGAN", row: 28, qp: "Bersih", qn: "Kotor", fp: "Ada", fn: "Tidak ada" },
    { roomTypeId: "TOILET", name: "DRYER / TISU", row: 29, qp: "Bersih", qn: "Kotor", fp: "Ada", fn: "Tidak ada" },

    // PANTRY
    { roomTypeId: "PANTRY", name: "LANTAI", row: 12, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "DINDING", row: 13, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "LAMPU", row: 14, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "VENTILASI", row: 15, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "TEMPAT SAMPAH", row: 16, qp: "Sampah sudah diangkut", qn: "Sampah belum diangkut", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "MEJA", row: 17, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "KURSI", row: 18, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "TEMPAT CUCI PIRING", row: 19, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "PERALATAN MAKAN", row: 20, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "PANTRY", name: "PERALATAN PANTRY", row: 21, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },

    // CLASS
    { roomTypeId: "CLASS", name: "LANTAI", row: 12, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "LANGIT-LANGIT / PLAFON", row: 13, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "DINDING", row: 14, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "TEMPAT SAMPAH", row: 15, qp: "Sampah sudah diangkut", qn: "Sampah belum diangkut", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "BAU RUANGAN", row: 16, qp: "Tidak bau", qn: "Bau tidak sedap", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "VENTILASI / JENDELA", row: 17, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "AC (AIR CONDITIONER)", row: 18, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "LAMPU", row: 19, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "STOP KONTAK", row: 20, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "LEMARI", row: 21, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "MEJA", row: 22, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "KURSI", row: 23, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "PAPAN TULIS / WHITEBOARD", row: 24, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "DISPENSER", row: 25, qp: "Bersih", qn: "Kotor", fp: "Galon terisi", fn: "Galon habis" },
    { roomTypeId: "CLASS", name: "JARINGAN WIFI / INTERNET", row: 26, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "KOTAK P3K DAN ISINYA", row: 27, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Lengkap", fn: "Tidak lengkap" },
    { roomTypeId: "CLASS", name: "MEDIA DISPLAY (PROYEKTOR / VIDEOTRON)", row: 28, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "TRANSMITTER / KABEL HDMI", row: 29, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "CLASS", name: "SOUND SYSTEM", row: 30, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },

    // ARCHIVE
    { roomTypeId: "ARCHIVE", name: "LANTAI", row: 12, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "ARCHIVE", name: "DINDING & PLAFON", row: 13, qp: "Bersih", qn: "Kotor", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "ARCHIVE", name: "KELEMBABAN / BEBAS JAMUR", row: 14, qp: "Kering / Normal", qn: "Lembab / Berjamur", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "ARCHIVE", name: "TEMPAT SAMPAH", row: 15, qp: "Sampah sudah diangkut", qn: "Sampah belum diangkut", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "ARCHIVE", name: "RAK ARSIP / ROLL O PACT", row: 16, qp: "Bersih & Rapi", qn: "Kotor / Berantakan", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "ARCHIVE", name: "LAMPU & PENERANGAN", row: 17, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Normal", fn: "Rusak" },
    { roomTypeId: "ARCHIVE", name: "PINTU & KUNCI AKSES", row: 18, qp: "Sudah diperiksa", qn: "Belum diperiksa", fp: "Terkunci Aman", fn: "Rusak" },
  ];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const existing = await prisma.activity.findFirst({
      where: { roomTypeId: it.roomTypeId, name: it.name },
    });
    if (!existing) {
      await prisma.activity.create({
        data: {
          roomTypeId: it.roomTypeId,
          name: it.name,
          standardCategory: "Standar Kebersihan 5S",
          qualityApplicable: true,
          qualityPositive: it.qp,
          qualityNegative: it.qn,
          functionApplicable: true,
          functionPositive: it.fp,
          functionNegative: it.fn,
          exportRow: it.row,
          sortOrder: i + 1,
        },
      });
    }
  }
  console.log("✓ Indikator 5S berhasil disiapkan.");

  // 6. Seed Evaluation Aspects
  const aspects = [
    { roomTypeId: "TOILET", code: "AROMA", label: "Aroma / Bau tidak sedap" },
    { roomTypeId: "TOILET", code: "SABUN_TISU", label: "Sabun / Tisu habis" },
    { roomTypeId: "TOILET", code: "LANTAI_BASAH", label: "Lantai kotor / becek" },
    { roomTypeId: "TOILET", code: "KRAN_CLOSET", label: "Kran air / Closet macet" },
    { roomTypeId: "GENERAL", code: "DEBU", label: "Meja / Kursi berdebu" },
    { roomTypeId: "GENERAL", code: "SAMPAH", label: "Tempat sampah penuh" },
    { roomTypeId: "GENERAL", code: "LANTAI_KOTOR", label: "Lantai berdebu / bernoda" },
    { roomTypeId: "GENERAL", code: "DISPENSER", label: "Air galon dispenser habis" },
  ];

  for (let i = 0; i < aspects.length; i++) {
    const asp = aspects[i];
    const ex = await prisma.evaluationAspect.findFirst({
      where: { roomTypeId: asp.roomTypeId, code: asp.code },
    });
    if (!ex) {
      await prisma.evaluationAspect.create({
        data: {
          roomTypeId: asp.roomTypeId,
          code: asp.code,
          label: asp.label,
          sortOrder: i + 1,
        },
      });
    }
  }
  console.log("✓ Aspek evaluasi anonim berhasil disiapkan.");

  // 7. Settings
  const settings = [
    { key: "APP_NAME", value: "Monitoring Kebersihan PLN UPS" },
    { key: "INSTITUTION", value: "PLN UPS" },
    { key: "TIMEZONE", value: "Asia/Jakarta" },
    { key: "LOGO_URL", value: "https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("🎉 Seeding database selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("Error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
