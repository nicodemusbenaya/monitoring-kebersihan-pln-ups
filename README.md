# Monitoring Kebersihan PLN UPS (Next.js & QNAP NAS Edition)

Aplikasi Web Modern Berkinerja Tinggi untuk Pemantauan dan Checklist Kebersihan Harian Ruangan di **PLN Unit Pelaksana Transmisi (UPS)**.

Sistem ini dibangun ulang menggunakan **Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ORM**, dan terintegrasi langsung dengan **QNAP NAS Gateway** untuk penyimpanan mandiri foto bukti (*evidence*).

---

## 🚀 Fitur Utama & Keunggulan

1. **Performa Tinggi (< 0.5s Response Time)**:
   - Tidak ada lagi *cold-start* atau *loading* lama Google Apps Script.
   - Pemuatan halaman instan berkat optimasi Next.js SSR/SSG & CDN Vercel Edge.
2. **PWA & Offline Capable**:
   - Dapat di-install ke layar utama (*Home Screen*) HP petugas seperti aplikasi native Android.
   - Kompresi foto otomatis di sisi klien (< 50 KB WebP/JPEG) sehingga hemat kuota dan sangat cepat diunggah.
3. **Penyimpanan Mandiri di QNAP NAS**:
   - Foto bukti fisik (*evidence*) otomatis tersimpan rapi di QNAP NAS PLN UPS (`/share/MONITORING-KEBERSIHAN/EVIDENCE`).
4. **Fitur Lengkap Sesuai Standar 5S PLN**:
   - **Petugas**: Pemindai kamera langsung QR ruangan, checklist 2 dimensi (Kualitas & Fungsi), catatan temuan, multi-foto hingga 8 foto.
   - **Supervisor**: Evaluasi & inspeksi terjadwal (Inspeksi 1, 2, 3 untuk toilet dan ruangan), monitoring hasil kerja petugas hari ini.
   - **Administrator**: Dashboard metrik, rekap performa petugas, kepuasan pengguna, pembuat/pencetak QR Code ruangan, kelola data master, dan tes koneksi NAS.
   - **Mode Display TV**: Dashboard widescreen 16:9 auto-refresh 20s untuk monitor display operasional.
   - **Evaluasi Kepuasan Anonim**: QR Code publik di ruangan untuk tamu/karyawan (Rating bintang 1–4, aspek perbaikan, dan komentar).
   - **Ekspor Excel Instan (ExcelJS)**: Unduh rekap status 31 hari seluruh ruangan dalam hitungan detik.

---

## 👥 Akun Awal Bawaan (*Default Accounts*)

| Username | Nama Lengkap | Peran | Password Awal |
|---|---|---|---|
| `arif` | Arif Budi Hartono | PETUGAS | `ArifPLN123!` |
| `sulaiman` | Sulaiman | PETUGAS | `SulaimanPLN123!` |
| `ipal` | Ipal Hapidz | SUPERVISOR | `IpalPLN123!` |
| `dwi` | Dwi Meyrizka Prativi | ADMIN | `DwiPLN123!` |

---

## 🛠️ Panduan Menjalankan Secara Lokal

### 1. Prasyarat
- Node.js versi 18+ atau 20+
- npm atau pnpm

### 2. Instalasi & Setup Database
```bash
# 1. Install dependensi
npm install

# 2. Sinkronisasi schema database (SQLite / PostgreSQL)
npx prisma db push

# 3. Masukkan data seed awal (Daftar ruangan PLN UPS, Indikator 5S, Akun)
node prisma/seed.mjs
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 🌐 Panduan Deploy ke Vercel (100% Gratis)

1. Push cabang `main` ini ke repositori GitHub Anda.
2. Buka [vercel.com](https://vercel.com) dan impor repositori ini.
3. Konfigurasikan **Environment Variables** di dashboard Vercel:
   - `DATABASE_URL`: URL database Anda (SQLite default `file:./dev.db`, Turso/LibSQL, atau Supabase/Postgres).
   - `JWT_SECRET`: Kunci rahasia minimal 32 karakter.
   - `NAS_GATEWAY_URL`: `http://nasups01.myqnapcloud.com:18080` (alamat QNAP NAS).
   - `NAS_GATEWAY_TOKEN`: Token rahasia container QNAP NAS Anda.
   - `NAS_EVIDENCE_ENABLED`: `true`
4. Klik **Deploy**. Aplikasi akan live dan dapat diakses publik dengan kecepatan tinggi.

---

## 📁 Struktur Cabang Git

- **`main`**: Versi aplikasi modern berbasis **Next.js + QNAP NAS** (aktif).
- **`google-script`**: Arsip versi lama berbasis **Google Apps Script & Google Spreadsheet**.
