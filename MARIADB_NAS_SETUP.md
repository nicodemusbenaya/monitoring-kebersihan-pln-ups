# Status legacy MariaDB

MariaDB tidak lagi digunakan sebagai database aplikasi Monitoring Kebersihan.
Google Spreadsheet adalah satu-satunya database aktif; cache Apps Script hanya
mempercepat pembacaan.

Gunakan panduan terbaru: [`SPREADSHEET_NAS_SETUP.md`](SPREADSHEET_NAS_SETUP.md).

Fungsi `initializeMariaDbPrimary()` dan pembacaan MariaDB sengaja dinonaktifkan
untuk mencegah database Spreadsheet produksi terganti atau dibangun ulang.
Endpoint `/api/kebersihan/db/*` pada gateway juga mengembalikan HTTP 410 dengan
kode `MARIADB_DISABLED`.

Untuk pemeriksaan produksi, gunakan `activateSpreadsheetPrimaryMode()`,
`runRoomQrReconciliationCheck()`, dan `runSelfCheck()`. Jangan melakukan migrasi
balik ke MariaDB dan jangan membuat ulang `QrToken`; tindakan tersebut tidak
diperlukan untuk perbaikan NAS evidence/snapshot dan berisiko membuat data
Spreadsheet serta QR tercetak tidak konsisten.
