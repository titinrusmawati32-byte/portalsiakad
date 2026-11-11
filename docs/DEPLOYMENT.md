# DEPLOYMENT GUIDE
# PORTAL ADMINISTRASI GURU SD

Panduan langkah demi langkah untuk menyebarkan aplikasi ke Google Apps Script dan menghubungkannya dengan Google Spreadsheet serta Firebase Authentication.

---

## Prasyarat
1. Akun Google aktif (akun pemilik proyek / instansi sekolah).
2. Proyek Firebase dengan fitur Authentication (Google Sign-In) aktif.
3. Spreadsheet Google Sheets baru yang dibuat sebagai basis data.
4. Node.js & Clasp (Google Apps Script CLI) terpasang di komputer lokal.

---

## Langkah 1: Persiapan Google Spreadsheet & Script Editor
1. Buat Google Spreadsheet baru di Google Drive Anda, beri nama: `DB_PORTAL_ADMINISTRASI_GURU_SD`.
2. Salin **ID Spreadsheet** dari URL browser:
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. Buka menu **Ekstensi > Apps Script** untuk membuka editor proyek GAS.

---

## Langkah 2: Konfigurasi Script Properties di Apps Script
1. Pada editor Apps Script, klik ikon gerigi **Project Settings (Setelan Proyek)** di bilah kiri.
2. Gulir ke bawah ke bagian **Script Properties (Properti Skrip)**.
3. Klik **Add script property (Tambahkan properti skrip)** dan masukkan pasangan kunci-nilai berikut:

| Kunci Properti | Nilai Contoh | Keterangan |
|---|---|---|
| `SPREADSHEET_ID` | `1AbCdEfGhIjKlMnOpQrStUvWxYz...` | ID spreadsheet yang dibuat pada Langkah 1 |
| `FIREBASE_API_KEY` | `AIzaSyBxxxxxxx...` | Web API Key dari Firebase Console |
| `FIREBASE_PROJECT_ID` | `portal-guru-sd-ambulu` | Project ID Firebase |
| `DRIVE_RESOURCE_FOLDER_ID` | `1ZyxWvUtSrQpOnMlKj...` | ID Folder Google Drive pustaka pusat |
| `SUPER_ADMIN_EMAILS` | `admin@sdn.sch.id,superadmin@gmail.com` | Daftar email super admin awal (dipisah koma) |

---

## Langkah 3: Sinkronisasi Kode Menggunakan Clasp
1. Di terminal lokal folder `PORTAL-ADMIN-GURU-SD`:
   ```bash
   clasp login
   clasp clone {YOUR_APPS_SCRIPT_ID}
   ```
   Atau masukkan Script ID Anda ke dalam file `.clasp.json`.
2. Unggah seluruh kode ke Google Apps Script:
   ```bash
   clasp push
   ```

---

## Langkah 4: Inisialisasi Database
1. Di editor Apps Script, pilih fungsi `setupDatabase` pada dropdown fungsi bilah atas.
2. Klik **Run (Jalankan)**.
3. Berikan izin otorisasi akses Google Sheets dan Drive saat diminta dialog "Authorization Required".
4. Buka spreadsheet Anda; 21 sheet lengkap dengan baris header dan data inisialisasi dasar (mata pelajaran, pengaturan platform) akan terbuat secara otomatis.

---

## Langkah 5: Deployment Web App
1. Klik tombol biru **Deploy > New deployment (Penerapan baru)** di pojok kanan atas editor Apps Script.
2. Pilih jenis penerapan: **Web app (Aplikasi web)**.
3. Atur konfigurasi:
   - **Description**: `Versi 1.0 - Produksi Portal Guru SD`
   - **Execute as**: `User accessing the web app` ATAU `Me (pemilik proyek)` (Rekomendasi: `Me`).
   - **Who has access**: `Anyone` (Siapa saja, login ditangani secara aman oleh Firebase di dalam aplikasi).
4. Klik **Deploy**.
5. Salin tautan **Web App URL** yang dihasilkan:
   `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
6. Tautan tersebut siap diakses oleh para guru dan administrator.
