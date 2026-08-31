# Monitoring Kebersihan PLN UPS

Dokumentasi ini mengikuti kode yang dipakai deployment Web App saat ini.
Pembaruan terakhir: 28 Agustus 2026. Deployment aktif yang dipertahankan adalah
deployment yang sama dengan QR tercetak, terakhir diperbarui ke versi `@82`.

## Arsitektur saat ini

Google Spreadsheet adalah satu-satunya database aplikasi dan sumber kebenaran
untuk ruangan, akun, jadwal, checklist, inspeksi, evaluasi, sesi, dan audit.
Cache Apps Script hanya dipakai untuk mempercepat pembacaan; cache bukan database
kedua. Google Drive menyimpan evidence sementara ketika NAS tidak tersedia dan
menyimpan folder laporan ekspor. NAS gateway hanya menyimpan evidence dan
snapshot Spreadsheet dalam format Excel.

MariaDB sudah dinonaktifkan sebagai database aplikasi. Fungsi lama
`initializeMariaDbPrimary()` dan endpoint `/api/kebersihan/db/*` sengaja gagal
dengan status `MARIADB_DISABLED` agar data Spreadsheet tidak tertimpa. Jika log
masih menyebut MariaDB, periksa deployment atau source lama yang belum
diperbarui.

## Alur aplikasi

1. Pengguna login sekali dengan username dan password aplikasi.
2. Petugas membuka **Baca QR Ruangan**. Tombol ini menggunakan kamera native
   perangkat untuk mengambil foto QR; aplikasi membaca foto dengan
   `BarcodeDetector` atau decoder multi-pass. Google Lens atau kamera bawaan
   yang langsung membuka URL QR juga tetap dapat digunakan.
3. QR membuka URL bertoken, menampilkan template ruangan yang sesuai, dan mencatat waktu scan.
4. Pengguna memilih slot secara manual.
5. Setiap indikator diisi pada dua dimensi yang berlaku: aktivitas/kualitas dan fungsi/kondisi.
6. Temuan negatif wajib diberi catatan.
7. Minimal satu foto evidence wajib diambil langsung dengan kamera pada akhir pemeriksaan; setiap slot dapat menyimpan hingga delapan foto.
8. Data selalu disimpan ke Spreadsheet. Foto dikirim langsung ke NAS; ketika gateway gagal, foto ditahan sementara di Drive dan dikirim ulang otomatis.

Tidak ada pemeriksaan GPS. Satu ruangan dan slot hanya dapat dikirim satu kali per hari, kecuali data dibuka kembali oleh admin.

## Evaluasi kepuasan anonim

Admin dapat mencetak dua jenis QR untuk setiap ruangan: QR pemeriksaan petugas dan QR evaluasi anonim. QR evaluasi dapat dibuka siapa pun tanpa login. Pengguna memilih rating bulat 1–4; rating 1–2 wajib memilih aspek yang perlu ditingkatkan dan menuliskan alasan, sedangkan rating 3–4 dapat diberi komentar opsional. Nama pengisi tidak disimpan, tetapi tanggal dan waktu tetap dicatat pada sheet `EVALUATIONS`.

Menu **Performa Petugas** menampilkan rekapitulasi kinerja petugas kebersihan, grafik volume pemeriksaan & status kebersihan (sumbu X & Y jelas), grafik rata-rata skor bintang/rating dari ulasan anonim, pemenuhan target sesi monitoring per ruangan (Toilet 3x/hari & Ruangan 2x/hari), matriks coverage, serta detail per petugas.

Menu **Kepuasan Pengguna** menampilkan histori evaluasi anonim, distribusi rating, persentase kepuasan, serta rekap aspek yang perlu ditingkatkan berdasarkan rentang tanggal dan ruangan. Rekap dapat diunduh sebagai Excel mentah atau PDF.

Menu **Pengguna** menyediakan pengelolaan akun petugas, supervisor, dan administrator secara lengkap: metrik ringkasan jumlah akun per peran, pencarian & filter, penambahan akun baru, pengubahan nama/username/peran, ubah password dengan validasi mandiri, serta pengaktifan/penonaktifan akun.

Menu **Ekspor Excel** tetap menyediakan laporan 6 hari untuk satu ruangan. Mode
**Rekap bulanan semua ruangan** membuat satu workbook dengan satu baris per
ruangan aktif dan satu kolom status per hari kalender (28–31 kolom). Status
dihitung dari sesi yang benar-benar berstatus `SUBMITTED`: `●` hijau berarti
semua sesi terjadwal selesai, `●` oranye berarti sebagian sesi selesai, dan `●`
merah berarti belum ada sesi. Hari nonjadwal diberi `—`. Senin–Jumat menjadi jadwal
default; Sabtu–Minggu tetap dapat dihitung apabila ada pemeriksaan weekend yang
benar-benar tersimpan. Rekap bulanan hanya mencakup ruangan aktif yang tampil,
sedangkan ruangan hidden dikecualikan; QR, identitas ruangan, dan histori tidak diubah.

## Template dari workbook

Konfigurasi mengikuti `Ceklis Ruangan UPS.xlsx`:

- `Ceklis Ruangan New`: Ruangan umum, ruang kerja, lobby, rapat umum, dan penyimpanan ATK.
- `Ceklis Ruang Arsip`: Ruang Arsip.
- `Ceklis Toilet New`: Toilet.
- `Ceklis Pantry`: Pantry.
- `Ceklis Ruang Kelas`: Ruang Kelas / TUK.

Daftar seed instalasi baru juga mencakup Ruangan UPS, Ruang Arsip, Ruang Rapat
G. Utama, Toilet, Pantry, dan Ruang TUK. Daftar lengkapnya mencakup Ruang Senior Manager, Toilet Ruang Senior Manager,
Ruang Lobby, Ruang Rapat G. Utama, Toilet Wanita dan Pria Gedung Utama,
ruang penyimpanan ATK Fast Moving, ruang penyimpanan aset Slow Moving,
Ruang Wellbeing, PMKU, PSA, PMA, PKSM, Pantry, Lobby Gedung TUK, TUK,
Admin, PJT, Rapat Kecil Gedung TUK, Toilet Wanita dan Pria Gedung TUK,
Rapat Digital/Zoom, Arsip Aktif, serta Arsip Utama Inaktif.

Seed ruangan hanya berjalan ketika sheet `ROOMS` masih kosong. Pada database
yang sudah berisi data, baris `ROOMS` adalah sumber kebenaran dan setup/repair
tidak membuat token QR baru. `Inaktif` pada nama Ruang Arsip Utama Inaktif
adalah bagian dari nama ruangan, bukan status `Active`.

Template ruangan yang digunakan adalah `GENERAL` untuk ruang kerja, lobby,
rapat umum, dan penyimpanan ATK; `TOILET` untuk seluruh toilet; `PANTRY`
untuk pantry; `CLASS` untuk TUK dan ruang rapat digital; serta `ARCHIVE`
untuk ruang arsip dan penyimpanan aset.

Konfigurasi operasional ruangan umum, pantry, dan kelas yang sudah ada tetap memakai slot Pagi, Sore, dan Inspeksi; toilet memakai Pagi, Inspeksi 1, Siang, Inspeksi 2, Sore, dan Inspeksi 3. Slot pekerjaan hanya dapat diisi `PETUGAS`; slot inspeksi hanya dapat diisi `SUPERVISOR`. Khusus **Rekap bulanan semua ruangan**, Senin–Jumat adalah jadwal default dan weekend hanya tampil sebagai status bila ada pemeriksaan yang tersimpan.

Indikator tersimpan pada sheet `ACTIVITIES`, sehingga nama, standar 5S, pilihan, urutan, serta penerapannya dapat diubah tanpa mengubah kode. Kolom `StandardCategory` dan `StandardText` menyimpan panduan dari sheet standar kebersihan, sedangkan `ExportRow` mempertahankan posisi indikator pada workbook.

## Aturan QR, ruangan, dan urutan

- `RoomId`, `QrToken`, dan URL QR adalah identitas tetap. Mengubah nama, template,
  nomor urut, jadwal, indikator, atau tampilan tidak mengubah QR yang sudah dicetak.
- URL pemeriksaan memakai `?room=<QrToken>`, sedangkan URL evaluasi anonim memakai
  `?evaluate=<QrToken>`. QR hanya berubah jika admin secara sengaja memilih **Buat
  ulang token QR** atau membuat ruangan baru.
- Perapian nomor urut hanya mengubah kolom `SortOrder` di `ROOMS`, bukan token,
  `RoomId`, atau URL. Tombol/fitur yang memakai identitas ruangan tetap bekerja.
- Nonaktifkan/hapus ruangan memakai soft delete: baris dan token dipertahankan untuk
  histori, tetapi QR tidak lagi dapat membuka ruangan selama `Active=false`.
- **Sembunyikan** berbeda dari nonaktif: hidden hanya disimpan pada pengaturan UI
  bersama (`UI_HIDDEN_ROOM_IDS`), sehingga ruangan tidak tampil di ringkasan, daftar
  QR, dan daftar aktif pengelolaan data. QR ruangan yang disembunyikan tetap berlaku.
  Pengembalian ruangan dilakukan dari tab **Disembunyikan**.
- `restoreAllRoomsOnce_()` hanya mengaktifkan kembali baris ruangan yang sudah ada;
  fungsi ini tidak membuat token QR baru. `applyApprovedRoomListMigration()` sengaja
  dinonaktifkan untuk mencegah daftar ruangan produksi menginvalidasi QR tercetak.

## Mode presentasi

Mode **Presentasi** menampilkan ringkasan operasional dan **Suara pengguna** dalam
layout khusus TV/desktop. Sidebar dan elemen administrasi dipadatkan, hero dibuat
ringkas, chart tren harian ditampilkan lebih tinggi, dan panel **Perlu perhatian**
dapat tampil sebagian tanpa memotong ringkasan kepuasan. Mode ini melakukan refresh
data berkala; gunakan refresh manual jika ingin memuat data terbaru segera.

Layout presentasi memiliki aturan responsif untuk layar TV yang lebarnya tidak sama
dengan rasio 16:9. Tampilan mobile dan desktop biasa tetap memakai layout normal.

## Akun awal

| Username | Nama | Peran | Password awal |
|---|---|---|---|
| `arif` | Arif Budi Hartono | Petugas | `ArifPLN123!` |
| `sulaiman` | Sulaiman | Petugas | `SulaimanPLN123!` |
| `ipal` | Ipal Hapidz | Supervisor | `IpalPLN123!` |
| `dwi` | Dwi Meyrizka Prativi | Admin | `DwiPLN123!` |

Semua akun wajib mengganti password saat login pertama.

## Instalasi Google Apps Script

1. Buat atau gunakan proyek Google Apps Script yang terhubung ke project ID pada `.clasp.json`.
2. Deployment `clasp` proyek ini menggunakan berkas `.js`, seluruh `.html`, dan `appsscript.json` sesuai `.claspignore`. Pasangan `.gs` dan `.js` sengaja tidak diunggah bersamaan karena akan mendefinisikan fungsi dua kali; berkas `.gs` adalah salinan kerja/historis.
3. Tampilkan manifest, lalu salin isi `appsscript.json` jika project dibuat ulang.
4. Jalankan `setupApplication()` hanya untuk instalasi baru. Untuk project yang sudah berisi data, jalankan `activateSpreadsheetPrimaryMode()` agar mode Spreadsheet aktif tanpa membangun ulang MariaDB atau mengganti data produksi.
5. Jalankan `runRoomQrReconciliationCheck()` untuk memeriksa token QR, `RoomId`, kode, dan duplikasi; lanjutkan hanya jika hasilnya `ok: true`.
6. Jalankan `runSelfCheck()`. Hasil yang benar adalah `ok: true`.
7. Buka URL `spreadsheetUrl` dari hasil setup untuk melihat database.
8. Deploy sebagai Web App:
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Pertahankan deployment yang sama dengan QR tercetak. Dengan `clasp`, gunakan deployment ID yang sama, misalnya:

   ```text
   npx --yes @google/clasp push --force
   npx --yes @google/clasp deploy --deploymentId <DEPLOYMENT_ID> --description "Pembaruan aplikasi"
   ```

10. Buka URL deployment, login sebagai `dwi`, lalu cetak QR pada menu **QR Ruangan** hanya untuk ruangan baru atau token yang memang sengaja dibuat ulang.

Sesi disimpan pada browser perangkat selama 20 tahun sejak login, tetapi bukan permanen tanpa batas. Sesi berakhir jika pengguna menekan **Keluar**, akun dibuat tidak aktif, masa 20 tahun terlewati, atau data browser/perangkat dihapus. Setelah login pertama, QR berikutnya langsung membuka ruangan selama Google Lens membuka tautan pada browser yang sama. Jika perangkat berpindah tangan, pengguna harus logout.

## Memasang template ekspor Excel

1. Unggah `Ceklis Ruangan UPS.xlsx` ke Google Drive.
2. Buka sebagai Google Sheets dan simpan hasil konversinya.
3. Salin ID dari URL Google Sheets tersebut.
4. Pada aplikasi admin, buka **Konfigurasi**, isi **ID Google Sheets hasil konversi workbook**, lalu simpan.

Saat diekspor, aplikasi menyalin sheet template yang sesuai, mengisi tanda `X` pada kolom S/B dan Y/T, serta menambahkan sheet `EVIDENCE` berisi metadata dan foto. Hasil `.xlsx` disimpan ke folder laporan di Google Drive.

Untuk mode rekap bulanan, konversikan `TEMPLATE REKAP MONITORING BULANAN SEMUA RUANGAN.xlsx`
menjadi Google Sheets dan simpan URL/ID-nya pada **Konfigurasi → Template rekap
bulanan semua ruangan**. Sheet `Ceklis Ruangan New` pada template itu hanya menjadi
acuan tata letak; aplikasi menormalkan blok hari menjadi satu sel status per hari,
menambah hari sampai tanggal terakhir bulan, menyesuaikan jumlah baris ruangan,
dan membuat sheet `EVIDENCE` metadata untuk seluruh ruangan. Workbook juga membuat
dua sheet `CETAK A4 - Hari ...` yang membagi hari kalender menjadi dua kelompok.
Gunakan kedua sheet tersebut saat mencetak A4 landscape agar ukuran tulisan lebih
terbaca; sheet `Rekap Bulanan` tetap tersedia untuk melihat seluruh bulan dalam satu
tabel lebar.

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
- `INSPECTION_PHOTOS`
- `EVALUATION_ASPECTS`
- `EVALUATIONS`
- `BACKUP_QUEUE`
- `SESSIONS`
- `AUDIT_LOG`

Seluruh tabel di atas berada pada satu Google Spreadsheet. Password aplikasi disimpan sebagai hash dengan salt dan pepper. Spreadsheet dan folder Drive sementara tidak boleh dibagikan secara publik.

## Container NAS khusus

Folder `monitoring-gateway` adalah layanan mandiri dan tidak mengubah `gateway-v3` milik E-Arsip.

Struktur QNAP yang disarankan:

```text
/share/Container/monitoring-kebersihan-gateway/
  compose.yaml
  server.js
  package.json
  .env

/share/MONITORING-KEBERSIHAN/
  EVIDENCE/
  SNAPSHOTS/
```

Langkah pemasangan:

1. Salin isi folder `monitoring-gateway` ke `/share/Container/monitoring-kebersihan-gateway`.
2. Salin `.env.example` menjadi `.env`.
3. Ganti `API_TOKEN` dengan token acak minimal 32 karakter. Konfigurasi MariaDB tidak diperlukan.
4. Jalankan compose pada Container Station. Port host default adalah `18081`; container E-Arsip tetap memakai `18080`.
5. Gateway E-Arsip port `18080` meneruskan jalur `/api/kebersihan/*` ke container monitoring pada `10.10.200.166:18081`.
6. Di aplikasi admin, buka **Konfigurasi**, masukkan `http://nasups01.myqnapcloud.com:18080` dan token monitoring.
7. Klik **Tes koneksi**. Jika reverse proxy HTTPS tersedia di kemudian hari, alamat HTTP dapat diganti dengan alamat HTTPS.

Endpoint container:

- `GET /health`
- `GET /api/kebersihan/status`
- `POST /api/kebersihan/evidence`
- `POST /api/kebersihan/snapshot`
- `GET /api/kebersihan/evidence`

Monitoring gateway hanya mengelola evidence dan snapshot; gateway-v3 adalah layanan E-Arsip terpisah. Evidence disimpan pada `EVIDENCE/tahun/bulan/tanggal` dan snapshot Google Spreadsheet pada `SNAPSHOTS`. Nama folder dan file memakai zona waktu `Asia/Jakarta`, sehingga unggahan sebelum pukul 07.00 WIB tidak lagi masuk ke tanggal sebelumnya. Trigger Apps Script memproses antrean evidence setiap lima menit dan membuat snapshot Excel setiap hari. File Drive sementara dipindahkan ke sampah setelah evidence berhasil disimpan di NAS dan referensinya diperbarui pada Sheet.

Panduan pemasangan lengkap tersedia di [`SPREADSHEET_NAS_SETUP.md`](SPREADSHEET_NAS_SETUP.md).

## Berkas utama

- `MonitoringConfig.js`: template ruangan, indikator, slot, dan akun awal yang diunggah.
- `MonitoringApi.js`: scan QR, slot, checklist, dashboard, dan validasi.
- `Evaluation.js`: evaluasi anonim, dashboard kepuasan, histori, serta ekspor Excel/PDF.
- `WorkbookExport.js`: pengisian template serta ekspor `.xlsx`.
- `NasBackup.js`: evidence NAS, antrean Drive, dan snapshot database Sheet.
- `monitoring-gateway/`: container NAS khusus aplikasi.
- `Code.js`, `Core.js`, `Auth.js`: setup, database Spreadsheet, API, dan autentikasi.
- `Index.html`, `Styles.html`, `Scripts.html`: antarmuka aplikasi.

Berkas `.gs` dengan nama serupa dipertahankan sebagai salinan kerja/historis.
Daftar deployment dikendalikan oleh `.claspignore`; jangan mengunggah pasangan
`.gs` dan `.js` bersamaan ke project Apps Script.
