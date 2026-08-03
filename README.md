# Monitoring Kebersihan PLN UPS

Aplikasi mobile berbasis Google Apps Script dengan MariaDB dan NAS sebagai penyimpanan utama. MariaDB menyimpan seluruh data operasional, folder NAS menyimpan evidence dan laporan, sedangkan Spreadsheet/Drive hanya menjadi cache dan antrean sementara ketika gateway tidak tersedia.

## Alur aplikasi

1. Pengguna login sekali dengan username dan password aplikasi.
2. Petugas atau supervisor memindai QR ruangan dengan Google Lens atau kamera bawaan HP.
3. QR membuka URL bertoken, menampilkan template ruangan yang sesuai, dan mencatat waktu scan.
4. Pengguna memilih slot secara manual.
5. Setiap indikator diisi pada dua dimensi yang berlaku: aktivitas/kualitas dan fungsi/kondisi.
6. Temuan negatif wajib diberi catatan.
7. Tepat satu foto evidence wajib diambil langsung dengan kamera pada akhir pemeriksaan.
8. Data disimpan ke MariaDB dan foto langsung ke NAS. Saat gateway gagal, data masuk cache/outbox Spreadsheet dan foto ditahan sementara di Drive untuk dikirim ulang otomatis.

Tidak ada pemeriksaan GPS. Satu ruangan dan slot hanya dapat dikirim satu kali per hari, kecuali data dibuka kembali oleh admin.

## Template dari workbook

Konfigurasi mengikuti `Ceklis Ruangan UPS.xlsx`:

- `Ceklis Ruangan New`: Ruangan UPS, Ruang Arsip, dan Ruang Rapat.
- `Ceklis Toilet New`: Toilet.
- `Ceklis Pantry`: Pantry.
- `Ceklis Ruang Kelas`: Ruang Kelas / TUK.

Ruangan umum, pantry, dan kelas memakai Senin–Sabtu dengan slot Pagi, Sore, dan Inspeksi. Toilet memakai Senin–Jumat dengan Pagi, Inspeksi 1, Siang, Inspeksi 2, Sore, dan Inspeksi 3. Slot pekerjaan hanya dapat diisi `PETUGAS`; slot inspeksi hanya dapat diisi `SUPERVISOR`.

Indikator tersimpan pada sheet `ACTIVITIES`, sehingga nama, pilihan, urutan, serta penerapannya dapat diubah tanpa mengubah kode. Kolom `ExportRow` mempertahankan posisi indikator pada workbook.

## Akun awal

| Username | Nama | Peran | Password awal |
|---|---|---|---|
| `arif` | Arif Budi Hartono | Petugas | `ArifPLN123!` |
| `sulaiman` | Sulaiman | Petugas | `SulaimanPLN123!` |
| `ipal` | Ipal Hapidz | Supervisor | `IpalPLN123!` |
| `dwi` | Dwi Meyrizka Prativi | Admin | `DwiPLN123!` |

Semua akun wajib mengganti password saat login pertama.

## Instalasi Google Apps Script

1. Buat proyek baru di Google Apps Script.
2. Salin semua berkas `.gs`, `Index.html`, `Styles.html`, dan `Scripts.html`. Pastikan nama file HTML persis sama; kesalahan `No HTML file named Styles` berarti `Styles.html` belum dibuat pada proyek.
3. Tampilkan manifest, lalu salin isi `appsscript.json`.
4. Jalankan `setupApplication()` satu kali dari editor dan berikan izin yang diminta.
5. Jalankan `runSelfCheck()`. Hasil yang benar adalah `ok: true`.
6. Buka URL `spreadsheetUrl` dari hasil `setupApplication()` untuk melihat database.
7. Deploy sebagai Web App:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Buka URL deployment, login sebagai `dwi`, lalu cetak QR pada menu **QR Ruangan**.

Sesi disimpan pada browser perangkat dan bertahan sampai pengguna menekan **Keluar**. Setelah login pertama, QR berikutnya langsung membuka ruangan selama Google Lens membuka tautan pada browser yang sama. Jika perangkat berpindah tangan, pengguna harus logout.

## Memasang template ekspor Excel

1. Unggah `Ceklis Ruangan UPS.xlsx` ke Google Drive.
2. Buka sebagai Google Sheets dan simpan hasil konversinya.
3. Salin ID dari URL Google Sheets tersebut.
4. Pada aplikasi admin, buka **Konfigurasi**, isi **ID Google Sheets hasil konversi workbook**, lalu simpan.

Saat diekspor, aplikasi menyalin sheet template yang sesuai, mengisi tanda `X` pada kolom S/B dan Y/T, serta menambahkan sheet `EVIDENCE` berisi metadata dan foto. Hasil `.xlsx` disimpan ke folder `REPORTS` di NAS.

## Database yang dibuat

- `SETTINGS`
- `USERS`
- `ROOM_TYPES`
- `ROOMS`
- `ACTIVITIES`
- `ROOM_ACTIVITIES` (kompatibilitas versi awal)
- `SLOTS`
- `SCAN_EVENTS`
- `INSPECTIONS`
- `INSPECTION_DETAILS`
- `BACKUP_QUEUE`
- `SESSIONS`
- `AUDIT_LOG`

Nama tabel fisik di MariaDB menggunakan huruf kecil, sedangkan API mempertahankan nama kolom aplikasi. Password aplikasi disimpan sebagai hash dengan salt dan pepper. Spreadsheet fallback dan folder Drive sementara tidak dibagikan secara publik.

## Container NAS khusus

Folder `monitoring-gateway` adalah layanan mandiri dan tidak mengubah `gateway-v3` milik E-Arsip.

Struktur QNAP yang disarankan:

```text
/share/Container/monitoring-kebersihan-gateway/
  compose.yaml
  server.js
  database.js
  schema.sql
  package.json
  .env

/share/MONITORING-KEBERSIHAN/
  EVIDENCE/
  REPORTS/
  SNAPSHOTS/
```

Langkah pemasangan:

1. Salin isi folder `monitoring-gateway` ke `/share/Container/monitoring-kebersihan-gateway`.
2. Salin `.env.example` menjadi `.env`.
3. Ganti `API_TOKEN` dengan token acak minimal 32 karakter dan isi `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, serta `DB_PASSWORD`.
4. Jalankan compose pada Container Station. Port host default adalah `18081`; container E-Arsip tetap memakai `18080`.
5. Gateway E-Arsip port `18080` meneruskan jalur `/api/kebersihan/*` ke container monitoring pada `10.10.200.166:18081`.
6. Di aplikasi admin, buka **Konfigurasi**, masukkan `http://nasups01.myqnapcloud.com:18080` dan token monitoring.
7. Klik **Tes koneksi**. Jika reverse proxy HTTPS tersedia di kemudian hari, alamat HTTP dapat diganti dengan alamat HTTPS.

Endpoint container:

- `GET /health`
- `GET /api/kebersihan/status`
- `POST /api/kebersihan/inspection`
- `POST /api/kebersihan/snapshot`
- `GET /api/kebersihan/evidence`

Gateway v2 membuat tabel MariaDB otomatis dari `schema.sql`. Evidence disimpan pada `EVIDENCE/tahun/bulan/tanggal`, laporan pada `REPORTS/tahun/bulan`, dan snapshot cache pada `SNAPSHOTS`. Trigger Apps Script memproses outbox setiap lima menit. Evidence sementara di Drive dipindahkan ke sampah setelah file NAS dan referensi MariaDB berhasil disinkronkan.

Panduan pemasangan lengkap tersedia di [`MARIADB_NAS_SETUP.md`](MARIADB_NAS_SETUP.md).

## Berkas utama

- `MonitoringConfig.gs`: template ruangan, indikator, slot, dan akun awal.
- `MonitoringApi.gs`: scan QR, slot, checklist, dashboard, dan validasi.
- `WorkbookExport.gs`: pengisian template serta ekspor `.xlsx`.
- `NasBackup.gs`: koneksi primary storage, outbox fallback, evidence, dan snapshot cache.
- `monitoring-gateway/`: container NAS khusus aplikasi.
- `Code.gs`, `Core.gs`, `Auth.gs`: setup, database, API, dan autentikasi.
- `Index.html`, `Styles.html`, `Scripts.html`: antarmuka aplikasi.
