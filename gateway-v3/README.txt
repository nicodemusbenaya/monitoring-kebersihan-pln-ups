UPS E-ARSIP NAS GATEWAY - SESUAI STRUKTUR APLIKASI
==================================================

FUNGSI YANG SUDAH DISESUAIKAN
- Struktur folder: SUB BIDANG / TAHUN / 01 - Januari / KODE - BANTEX
- Banyak nama arsip dan banyak lampiran dalam satu bantex
- Nama file: File 1 - KODE - Nama Arsip.ext
- Respons API memakai field fileUrl, folderUrl, fileDetails seperti Code.gs Anda
- Edit arsip dapat menghapus lampiran lama dengan clearExistingFiles=true
- Link preview/download memakai signature, tanpa membuka API token di browser
- Audit log disimpan di /share/UPS-EARSIP/_audit.log
- Tidak memakai MariaDB dan tidak memakai phpMyAdmin

PEMASANGAN DI QNAP
1. Backup folder /share/Container/gateway-v3.
2. Salin server.js, package.json, compose.yaml, dan .env ke:
   /share/Container/gateway-v3
3. Buat .env berdasarkan .env.example:
   API_TOKEN=token-rahasia-minimal-32-karakter
   PUBLIC_BASE_URL=http://nasups01.myqnapcloud.com:18080
4. Recreate aplikasi Container Station, jangan hanya Restart.
5. Mapping yang dipakai: host 18080 -> container 8080.
6. Uji:
   http://192.168.1.36:18080/health
   http://nasups01.myqnapcloud.com:18080/health

INTEGRASI GOOGLE APPS SCRIPT
1. Tambahkan NasIntegration.gs ke project.
2. Hapus atau ganti dua fungsi lama berikut dari Code.gs agar tidak duplikat:
   - uploadFilesArsipBantexByStruktur_
   - uploadFileArsipByStruktur_
3. Jalankan sekali dari editor Apps Script:
   nasSetToken('TOKEN_YANG_SAMA_DENGAN_ENV');
4. Jalankan nasHealthCheck().

CATATAN PENTING TENTANG HAPUS ARSIP
Code.gs lama hanya menyimpan kolom File URL. Agar penghapusan seluruh folder bantex di NAS presisi,
tambahkan kolom Spreadsheet bernama "NAS Folder Path" dan simpan nilai result.folderPath saat save/update.
File ini belum otomatis memodifikasi Code.gs lengkap karena versi final Code.gs harus dipastikan terlebih dahulu.

RUANG LINGKUP
Paket ini sudah sesuai untuk modul Arsip Umum: input, multi-file, edit/ganti file, preview, download,
struktur folder, dan audit. Modul Arsip Rahasia R masih menggunakan fungsi Google Drive pada Code.gs Anda;
migrasi R perlu tahap terpisah karena mencakup approval SM, preview konversi, watermark, dan batas akses.
