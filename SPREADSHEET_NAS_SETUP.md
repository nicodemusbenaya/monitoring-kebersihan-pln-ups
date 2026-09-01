# Google Spreadsheet + NAS (arsitektur aktif)

## Arsitektur

- Google Spreadsheet adalah satu-satunya database aplikasi.
- NAS menyimpan evidence dan snapshot database dalam format Excel.
- Google Drive menahan evidence sementara ketika NAS tidak tersedia.
- MariaDB dan endpoint `/api/kebersihan/db/*` tidak digunakan; endpoint database
  lama mengembalikan HTTP 410 dengan kode `MARIADB_DISABLED`.
- Cache Apps Script hanya cache pembacaan, bukan database kedua dan bukan sumber
  kebenaran.

Konfigurasi Apps Script:

```text
DATABASE_MODE=SPREADSHEET
PRIMARY_STORAGE_MODE=SPREADSHEET
NAS_EVIDENCE_ENABLED=true
NAS_SHEET_BACKUP_ENABLED=true
DRIVE_EVIDENCE_FALLBACK_ENABLED=true
```

## Persiapan sebelum deployment

1. Simpan export terbaru Google Spreadsheet sebagai backup sebelum perubahan besar.
2. Pada database produksi, jangan menjalankan `setupApplication()` berulang kali dan
   jangan menjalankan `initializeMariaDbPrimary()`; MariaDB sudah dinonaktifkan.
3. Jalankan `activateSpreadsheetPrimaryMode()` bila perlu memastikan konfigurasi
   mode Spreadsheet aktif.
4. Jalankan `runRoomQrReconciliationCheck()` dan pastikan `ok: true`.
5. Jangan membuat ulang `QrToken`; QR yang sudah dicetak menggunakan token permanen.
6. Perbarui deployment Web App yang sama agar URL pada QR lama tetap berlaku.
   Setelah deployment, konfigurasikan template rekap bulanan dari menu **Konfigurasi**
   sebelum melakukan ekspor pertamanya.

## Template laporan

Di menu **Konfigurasi**, simpan dua template bila keduanya akan digunakan:

- Template laporan per ruangan untuk ekspor 6 hari yang sudah ada.
- `TEMPLATE REKAP MONITORING BULANAN SEMUA RUANGAN.xlsx` yang sudah dikonversi
  menjadi Google Sheets untuk mode rekap seluruh ruangan.

Mode rekap bulanan menghasilkan satu baris per ruangan aktif dan satu kolom status
per hari kalender. Kolom hari dibuat dinamis sesuai bulan (28–31 hari). `●` hijau
berarti seluruh sesi terjadwal selesai, `●` oranye berarti sebagian sesi selesai,
`●` merah berarti tidak ada sesi, dan `—` berarti hari nonjadwal. Senin–Jumat menjadi
jadwal default; Sabtu–Minggu tetap dihitung jika ada pemeriksaan yang tersimpan.
Ruangan yang disembunyikan dari tampilan rutin dikecualikan dari rekap bulanan.

## Gateway NAS v3

Salin seluruh folder `monitoring-gateway` ke NAS. Runtime gateway memakai `server.js`,
`package.json`, dan `.env`; berkas koneksi/schema MariaDB tidak diperlukan untuk
mode aplikasi saat ini. `.env` yang relevan:

```text
PORT=8080
STORAGE_ROOT=/data
API_TOKEN=token-acak-minimal-32-karakter
MAX_BODY_MB=12
TRUST_PROXY=1
TIMEZONE=Asia/Jakarta
```

Gateway menyediakan:

- `GET /health`
- `GET /api/kebersihan/status`
- `POST /api/kebersihan/evidence`
- `GET /api/kebersihan/evidence`
- `POST /api/kebersihan/snapshot`

Endpoint database lama mengembalikan HTTP 410.

Dengan `compose.yaml` bawaan, port container adalah `8080` dan port host yang
disarankan adalah `18081`. Reverse proxy publik yang dipakai aplikasi dapat
meneruskan `http://nasups01.myqnapcloud.com:18080/api/kebersihan/*` ke host
NAS `:18081`. Semua endpoint selain `/health` membutuhkan header `Authorization:
Bearer <API_TOKEN>`.

Folder evidence dan nama snapshot ditentukan menggunakan `TIMEZONE`. Untuk operasional PLN UPS, pertahankan nilainya `Asia/Jakarta` agar tanggal di NAS sama dengan tanggal pemeriksaan di dashboard.

## Aktivasi

1. Deploy source Apps Script ke deployment yang sudah digunakan QR; jangan membuat
   deployment baru untuk pembaruan biasa.
2. Jalankan `activateSpreadsheetPrimaryMode()` satu kali.
3. Jalankan `runRoomQrReconciliationCheck()`, lalu `runSelfCheck()` dan pastikan
   pemeriksaan inti lolos.
4. Dari menu admin, simpan URL/token NAS, aktifkan evidence dan backup Sheet, lalu tes koneksi.
5. Jalankan snapshot manual pertama dan pastikan file muncul di folder `SNAPSHOTS`.

## Uji kegagalan NAS

1. Matikan gateway NAS sementara.
2. Scan QR aktif dan kirim satu pemeriksaan.
3. Pastikan data muncul di `SCAN_EVENTS`, `INSPECTIONS`, `INSPECTION_DETAILS`, dan `INSPECTION_PHOTOS`.
4. Pastikan evidence memiliki referensi `DRIVE:<file-id>` dan antrean `EVIDENCE_UPLOAD` berstatus pending/failed.
5. Nyalakan NAS dan jalankan **Kirim ulang evidence**.
6. Pastikan referensi foto berubah menjadi path NAS dan file Drive sementara masuk sampah.

## Backup

- `runScheduledNasBackup` berjalan setiap hari sekitar pukul 01.00 zona waktu proyek.
- `runFrequentNasQueue` mencoba ulang evidence setiap lima menit.
- Snapshot harian yang gagal akan dicoba ulang paling sering satu kali per jam.
- Admin dapat membuat snapshot manual dari menu konfigurasi.
