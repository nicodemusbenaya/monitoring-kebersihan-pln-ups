# Pemasangan MariaDB + NAS sebagai Penyimpanan Utama

Arsitektur akhir:

```text
HP pengguna -> Google Apps Script -> Gateway NAS
                                  |-> MariaDB: seluruh data operasional
                                  |-> /share/Container/gateway-v3/MONITORING-KEBERSIHAN-DATA/EVIDENCE: foto
                                  |-> /share/Container/gateway-v3/MONITORING-KEBERSIHAN-DATA/REPORTS: laporan

Saat gateway gagal:
Google Spreadsheet = cache/outbox sementara
Google Drive       = penampung evidence sementara
```

Data pada Spreadsheet lama tidak dimigrasikan. Fungsi inisialisasi menyimpan ID Spreadsheet lama sebagai `LEGACY_SPREADSHEET_ID` dan membuat Spreadsheet fallback baru.

## 1. Buat database dan user khusus

Buka phpMyAdmin, pilih tab **SQL**, lalu jalankan:

```sql
CREATE DATABASE IF NOT EXISTS monitoring_kebersihan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'monitoring_app'@'%'
  IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_ACAK_YANG_KUAT';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, REFERENCES
ON monitoring_kebersihan.*
TO 'monitoring_app'@'%';

FLUSH PRIVILEGES;
```

Jangan memakai akun `root` dan jangan membuka port `3307` ke internet. User `monitoring_app` hanya boleh mengelola database aplikasi ini.

## 2. Perbarui berkas gateway gabungan di NAS

Container E-Arsip dan monitoring sekarang digabung untuk menghindari masalah jaringan antar-container QNAP. Folder kode monitoring tetap terpisah dan dipasang read-only ke container E-Arsip.

Perbarui folder berikut:

```text
/share/Container/gateway-v3
/share/Container/monitoring-kebersihan-gateway
```

Salin `server.js`, `package.json`, `package-lock.json`, dan `compose.yaml` terbaru dari `gateway-v3`. Salin berkas berikut dari `monitoring-gateway`:

```text
server.js
database.js
schema.sql
package.json
```

Jangan menimpa `.env` dengan `.env.example`.

## 3. Isi `.env` gateway gabungan

Tambahkan konfigurasi berikut ke `/share/Container/gateway-v3/.env`. Pertahankan konfigurasi E-Arsip yang sudah ada:

```env
MONITORING_API_TOKEN=TOKEN_GATEWAY_MONITORING_YANG_SUDAH_DIGUNAKAN
MONITORING_MAX_BODY_MB=12

DB_HOST=10.10.200.166
DB_PORT=3307
DB_NAME=monitoring_kebersihan
DB_USER=monitoring_app
DB_PASSWORD=PASSWORD_YANG_DIBUAT_DI_PHPMYADMIN
DB_CONNECTION_LIMIT=10
```

Jangan mengirim atau memasukkan `.env` ke Git.

## 4. Recreate satu container

Di Container Station, lakukan **Recreate** pada `ups-earsip-gateway-v3`, bukan hanya Restart. Recreate diperlukan agar dependensi `mysql2`, mount folder monitoring, dan konfigurasi lingkungan baru diterapkan.

Mapping yang digunakan tetap:

```text
Host 18080 -> container 8080
/share/UPS-EARSIP -> /data
/share/Container/monitoring-kebersihan-gateway -> /monitoring (read-only)
/share/Container/gateway-v3/MONITORING-KEBERSIHAN-DATA -> /monitoring-data
```

Container akan membuat seluruh tabel aplikasi secara otomatis. User database memerlukan izin `CREATE` saat proses pertama. Setelah endpoint monitoring pada port 18080 berhasil diuji, container `monitoring-kebersihan-gateway` lama dapat dihentikan.

## 5. Periksa health gateway

Pastikan health E-Arsip masih dapat dibuka:

```text
http://nasups01.myqnapcloud.com:18080/health
```

Endpoint berikut akan menampilkan `Unauthorized` jika dibuka langsung tanpa token; itu berarti rutenya aktif:

```text
http://nasups01.myqnapcloud.com:18080/api/kebersihan/status
```

Untuk pemeriksaan lengkap dengan token, jalankan `testMonitoringNasConnection()` dari Apps Script.

Hasil yang benar:

```json
{
  "ok": true,
  "storageWritable": true,
  "databaseConnected": true,
  "database": "monitoring_kebersihan"
}
```

Jika `databaseConnected` bernilai `false`, lihat `message` dan log container. Jangan melanjutkan inisialisasi Apps Script sebelum nilai tersebut `true`.

## 6. Perbarui Google Apps Script

Salin seluruh berkas `.gs` dan `.html` versi terbaru ke project Apps Script, termasuk `Core.gs`, `NasBackup.gs`, `Inspection.gs`, `MonitoringApi.gs`, `Code.gs`, `Scripts.html`, dan `SelfCheck.gs`.

Pastikan Script Properties masih memiliki:

```text
NAS_GATEWAY_URL=http://nasups01.myqnapcloud.com:18080
NAS_GATEWAY_TOKEN=<token yang sama dengan API_TOKEN>
```

Token tidak boleh ditulis di source code.

## 7. Aktifkan primary storage

Jalankan fungsi berikut sekali dari editor Apps Script:

```javascript
initializeMariaDbPrimary()
```

Fungsi tersebut akan:

1. Memastikan folder NAS dan MariaDB dapat diakses.
2. Menyimpan Spreadsheet lama sebagai arsip tanpa menghapusnya.
3. Membuat Spreadsheet `Monitoring Kebersihan PLN UPS - Fallback Cache`.
4. Mengisi konfigurasi awal, ruangan, aktivitas, slot, dan akun ke MariaDB.
5. Mengaktifkan trigger sinkronisasi lima menit.

Catat URL fallback Spreadsheet dari hasil eksekusi.

## 8. Jalankan pemeriksaan

Jalankan:

```javascript
runSelfCheck()
```

Semua pemeriksaan harus lulus, khususnya:

```text
Mode penyimpanan utama MariaDB + NAS
MariaDB terhubung
Folder NAS dapat ditulis
```

## 9. Deploy ulang Web App

Buat deployment versi baru dengan pengaturan yang sama:

```text
Execute as: Me
Who has access: Anyone
```

Kemudian uji:

1. Login.
2. Scan satu QR ruangan.
3. Kirim checklist dan satu foto.
4. Pastikan record muncul di tabel `inspections` dan `inspection_details`.
5. Pastikan foto muncul di `/share/MONITORING-KEBERSIHAN/EVIDENCE/...`.
6. Pastikan `BackupStatus` pada dashboard bernilai `SYNCED`.

## 10. Uji mode gangguan

Untuk pengujian terkontrol, hentikan gateway sebentar lalu kirim satu pemeriksaan:

1. Data harus masuk Spreadsheet fallback.
2. Foto harus masuk folder Drive sementara.
3. Hidupkan gateway kembali.
4. Jalankan `runFrequentNasQueue()` atau tunggu maksimal lima menit.
5. Pastikan data masuk MariaDB dan foto masuk NAS.
6. File sementara akan dipindahkan ke Trash Google Drive setelah sinkronisasi berhasil.

## 11. HTTPS wajib sebelum produksi

Konfigurasi HTTP saat ini hanya untuk pengujian. Karena permintaan Apps Script berasal dari server Google, token, data pemeriksaan, dan foto melewati jaringan luar.

Sebelum operasional produksi, sediakan endpoint HTTPS melalui reverse proxy QNAP, sertifikat domain, atau tunnel HTTPS. Setelah tersedia, ganti `NAS_GATEWAY_URL` melalui menu admin tanpa mengubah database atau file evidence.
