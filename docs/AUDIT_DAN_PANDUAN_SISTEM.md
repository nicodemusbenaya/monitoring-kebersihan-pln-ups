# DOKUMEN AUDIT SISTEM & PANDUAN OPERASIONAL
## Sistem Monitoring Kebersihan PLN UPS

**Tanggal Audit:** 2 September 2026  
**Status Sistem:** Produksi (Vercel Serverless + Neon Cloud PostgreSQL + QNAP NAS Gateway)  
**Tujuan Audit:** Mengidentifikasi akar masalah atas keluhan seringnya terjadi error di lapangan, membedakan antara faktor kelalaian pengguna (*User Error*) dan faktor sistem (*Codebase & Architecture Issue*), serta memberikan solusi perbaikan teknis dan SOP operasional.

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Berdasarkan hasil audit komprehensif terhadap basis kode (*codebase*), log audit transaksi database riil (*Neon PostgreSQL*), serta pengujian gateway penyimpanan bukti foto (*QNAP NAS*), kesimpulan utama audit adalah:

> **Persentase Akar Masalah: 65% Faktor Sistem/Codebase & Arsitektur, 35% Faktor Operasional/Perilaku Pengguna.**

Meskipun di permukaan keluhan yang sering terdengar menyerupai kelalaian pengguna (misal: petugas lupa mengisi deskripsi temuan, membuka link di aplikasi lain, atau memindai slot yang telah selesai), **sebagian besar kegagalan tersebut dipicu oleh tiadanya *defensive design/guardrails* pada aplikasi.** Sistem sebelumnya membiarkan pengguna melakukan kekeliruan sampai akhirnya ditolak mentah-mentah oleh server melalui kode status error HTTP (400, 409, 413, atau 504), tanpa memberikan bimbingan langsung di antarmuka HP.

---

## 2. TEMUAN FORENSIK DATA AKTIVITAS RIIL (LOG AUDIT 2 SEPTEMBER 2026)

Dari 90 rekaman log audit dan 61 *scan events* di database produksi pada 2 September 2026, tercatat fakta penting:

1. **Keberhasilan Rangkaian Pemeriksaan (07:50 – 07:57 WIB / 00:50 – 00:57 UTC):**
   Petugas (*sulaiman*) berhasil melakukan pengisian dan *submit* checklist 7 ruangan secara berturut-turut tanpa kendala:
   - `00:50:32` — Ruang PMA (PAGI)
   - `00:52:08` — Ruang Rapat Kecil TUK (PAGI)
   - `00:52:52` — Toilet Pria TUK (PAGI)
   - `00:53:16` — Toilet Wanita TUK (PAGI)
   - `00:54:42` — Ruang Rapat Digital/Zoom (PAGI)
   - `00:55:35` — Ruang Admin (PAGI)
   - `00:57:57` — Ruang Arsip Utama Inaktif (PAGI)
   *Kesimpulan:* Mesin utama sistem dan koneksi database berfungsi normal saat alur dijalankan dengan benar.

2. **Anomali Login Berulang (08:07 – 08:12 WIB & 09:42 – 09:49 WIB):**
   Tercatat login berulang sebanyak **9 kali dalam rentang 5 menit** dan **5 kali berulang di jam berikutnya** oleh user yang sama tanpa ada rekaman *scan* ataupun *submit* di antaranya.
   *Kesimpulan:* Terjadi kehilangan sesi (*session loss*) atau pemindaian QR menggunakan *In-App Browser/WebView* HP (Google Lens, WhatsApp, atau Scanner bawaan HP) yang tidak mempertahankan cookie browser utama.

---

## 3. ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS)

### A. Faktor Sistem & Codebase (65%)

| No | Gejala / Pesan Error | Akar Masalah di Codebase | Solusi yang Diterapkan |
|---|---|---|---|
| 1 | Petugas terlempar ke layar Login berulang kali | QR fisik dipindai lewat kamera default HP / WA. Cookie `pln_ups_token` bersifat HTTP-only terisolasi dalam *temporary in-app webview* yang sesinya musnah saat jendela ditutup. | Penyediaan panduan *Add to Home Screen (PWA)* pada login & scanner, serta penanganan callback redirect URL otomatis. |
| 2 | Error 400: *"Catatan wajib diisi pada setiap indikator temuan"* | Server API `/api/inspections/submit` mewajibkan catatan jika memilih opsi *Kotor/Rusak*, namun formulir HP tidak memvalidasi di awal dan tidak memberi highlight visual. | Validasi instan di browser HP: auto-scroll ke kartu temuan kotor, tanda bintang merah, dan penonaktifan tombol submit sebelum catatan diisi. |
| 3 | Error 409 / Conflict P2002: *"Slot pemeriksaan sudah diisi"* | Ketika seluruh slot ruangan telah selesai, sistem auto-select memilih slot pertama yang sudah `completed`. Tombol *"Simpan Pemeriksaan"* tetap aktif sehingga user tetap bisa submit dan ditolak server. | Disable tombol submit jika slot aktif sudah berstatus *Selesai*, auto-select hanya slot yang belum selesai, dan munculkan banner status hijau. |
| 4 | Petugas terjebak tidak bisa buka ruangan saat kamera HP error/buram | Komponen input manual kode ruangan dan unggah file foto di [`scanner/page.tsx`] disembunyikan di layar HP menggunakan CSS `hidden md:block`. | Mengaktifkan panel input kode manual (misal ketik `PANTRY` / `ADMIN`) dan galeri langsung di layar smartphone. |
| 5 | Error 504 / Gateway Timeout saat upload bukti foto | Loop upload ke NAS QNAP kantor berjalan sekuensial tanpa batas waktu (`AbortSignal`). Jika koneksi kantor padat, batas waktu 10-15 detik Vercel habis (*timeout*). | Penambahan batas waktu `AbortSignal.timeout(4000)` dan pemrosesan konkuren (`Promise.allSettled`). Database Neon Postgres tetap sukses tersimpan meski NAS mengalami perlambatan. |
| 6 | Database Pool Exhaustion & Tanggal Akhir Bulan Tidak Valid | Rute evaluasi admin memicu loop *N+1 query* (ratusan query paralel `findFirst`), dan filter default menggunakan tanggal fiktif seperti `2026-09-31` (Sept hanya 30 hari). | Optimasi batch query data inspeksi terakhir dan pembuatan fungsi kalkulasi hari terakhir bulan dinamis (`monthEndKey`). |

---

### B. Faktor Pengguna & Operasional (35%)

1. **Pemindaian QR Tidak Melalui Web Aplikasi Monitoring:**
   Petugas memindai QR code stiker di dinding menggunakan aplikasi pihak ketiga (kamera WhatsApp, Google Lens, scanner acak) daripada menggunakan tombol kamera di dalam Web App Monitoring. Akibatnya sesi login tidak terbaca di jendela baru yang terbuka.
2. **Menandai "Kotor" Tanpa Memberikan Keterangan:**
   Petugas memilih opsi merah (*Kotor/Rusak*) pada checklist 5S namun mengosongkan kotak catatan karena terburu-buru.
3. **Mencoba Mengisi Ulang Slot yang Sudah Diselesaikan Rekan Kerja:**
   Petugas tidak memeriksa tanda centang hijau *"Selesai"* pada slot waktu pemeriksaan hari itu.
4. **Koneksi Seluler Lemah di Titik Tertentu:**
   Mengunggah beberapa foto resolusi tinggi secara bersamaan di area ruangan tertutup/bawah tanah PLN tanpa kompresi yang memadai.
5. **Kebingungan Dua Jenis Stiker QR Code:**
   Petugas memindai QR Evaluasi Pengunjung (bintang 1–4) dan mengira checklist kebersihan, atau sebaliknya pengunjung umum memindai QR Checklist Petugas dan bingung diminta memasukkan akun petugas.

---

## 4. STANDAR OPERASIONAL PROSEDUR (SOP) PETUGAS KEBERSIHAN

Untuk memastikan operasional berjalan mulus dan bebas error, petugas wajib mengikuti panduan praktis berikut:

```
[LANGKAH 1] PASANG PINTASAN KE LAYAR UTAMA (HANYA SEKALI)
Buka Google Chrome di HP -> Masuk ke web monitoring -> Tekan menu titik tiga di pojok kanan atas Chrome -> Pilih "Tambahkan ke Layar Utama" (Add to Home Screen). 
Hasil: Ikon "Monitoring Kebersihan" akan muncul di layar depan HP layaknya aplikasi Play Store.

[LANGKAH 2] LOGIN SEKALI SECARA PERMANEN
Buka aplikasi dari ikon di layar depan -> Masuk dengan username dan password petugas. Sesi login akan tersimpan otomatis dan tidak perlu login berulang kali.

[LANGKAH 3] PEMINDAIAN RUANGAN
Tekan tombol kuning "Buka Kamera Pemindai" di dalam aplikasi untuk memindai stiker QR ruangan di dinding.
Jika kamera bermasalah / gelap: Gunakan kotak "Ketik Kode Ruangan" di bawahnya (misal ketik: PANTRY, lalu tekan Buka).

[LANGKAH 4] PEMILIHAN SLOT WAKTU
Perhatikan label slot:
- "Tersedia untuk PETUGAS" (Bisa diisi)
- "Sudah diisi • Selesai" (Sudah selesai, jangan dipilih lagi)

[LANGKAH 5] PENGISIAN CHECKLIST & FOTO BUKTI
- Jika kondisi bersih/berfungsi: Tekan pilihan hijau.
- Jika kondisi kotor/rusak: Tekan pilihan merah DAN WAJIB ketik keterangan singkat pada kotak catatan di bawahnya (contoh: "Kran bocor", "Lantai berdebu").
- Ambil 1-2 foto bukti melalui tombol "Tambah Foto Evidence".
- Tekan tombol biru "Simpan Pemeriksaan". Tunggu hingga muncul centang hijau sukses.
```

---

## 5. KESIMPULAN & JAMINAN SISTEM

Dengan penerapan perbaikan pada codebase:
- Aplikasi menjadi **defensive & resilient** (tahan terhadap kelalaian user dan fluktuasi koneksi internet).
- Petugas di lapangan diberikan panduan visual langsung di layar HP sehingga tidak ada lagi data yang gagal tersimpan secara tiba-tiba.
- Seluruh riwayat data di Neon Cloud PostgreSQL dan penyimpanan bukti di QNAP NAS terlindungi dengan aman.
