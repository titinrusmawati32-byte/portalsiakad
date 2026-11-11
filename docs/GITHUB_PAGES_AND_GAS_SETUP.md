# PANDUAN DEPLOYMENT: GITHUB PAGES (FRONTEND) & GOOGLE APPS SCRIPT (BACKEND)

Dokumen ini adalah panduan lengkap langkah demi langkah untuk meluncurkan **Portal Administrasi Guru SD** menggunakan arsitektur terpisah (*decoupled architecture*):
- **Frontend:** GitHub Pages (Static Web Hosting gratis, cepat, dan aman).
- **Backend & Database:** Google Apps Script Web App + Google Sheets (21 Tabel Basis Data Relasional).
- **Autentikasi:** Firebase Authentication (Google Sign-In).

---

## 🏗️ Gambaran Arsitektur Sistem

```
┌──────────────────────────────────────┐
│  GITHUB PAGES (Frontend Statis)      │
│  - index.html (UI Dashboard)         │
│  - css/style.css (Desain Persis Foto)│
│  - js/app.js (Reactivity & Routing)  │
│  - js/config.js (API URL & Firebase) │
└──────────────────┬───────────────────┘
                   │
                   │ POST Request (CORS Safe via fetch())
                   ▼
┌──────────────────────────────────────┐
│  GOOGLE APPS SCRIPT (Backend Web App)│
│  - doPost(e) & doGet(e) API Gateway  │
│  - 21 File Modul Bisnis (.gs)        │
│  - Verifikasi Hak Akses & Isolasi    │
└──────────────────┬───────────────────┘
                   │
                   │ SpreadsheetApp Batch Operations
                   ▼
┌──────────────────────────────────────┐
│  GOOGLE SHEETS (Basis Data)          │
│  - 21 Tabel Relasional Otomatis      │
│  - Sheet LockService Concurrency     │
└──────────────────────────────────────┘
```

---

## LANGKAH 1: Setup Backend & Basis Data (Google Apps Script)

### 1.1 Buat Google Spreadsheet Baru
1. Buka [Google Drive](https://drive.google.com).
2. Klik tombol **+ Baru (+ New)** > **Google Spreadsheet (Google Sheets)**.
3. Beri nama spreadsheet: `DB_PORTAL_ADMINISTRASI_GURU_SD`.
4. Perhatikan URL pada browser:
   ```
   https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0jKLMNOPQRSTUVWXYZ/edit
   ```
   Salin string panjang di antara `/d/` dan `/edit`. Itu adalah **SPREADSHEET_ID** Anda.

### 1.2 Buka Apps Script Editor
1. Di dalam spreadsheet tersebut, klik menu **Ekstensi (Extensions)** > **Apps Script**.
2. Beri nama proyek Apps Script: `API_PORTAL_ADMINISTRASI_GURU_SD`.

### 1.3 Upload / Salin File Backend (.gs)
Salin seluruh file berekstensi `.gs` dari folder proyek Anda ke Script Editor:
- `Code.gs` (Pintu gerbang Web API `doPost` dan `doGet`)
- `Config.gs` (Konfigurasi tabel dan konstanta)
- `Database.gs` (Inisialisasi 21 tabel otomatis dan query engine)
- `Auth.gs` (Autentikasi Firebase dan registrasi guru)
- `Authorization.gs` (Validasi kepemilikan data `owner_user_id` dan RBAC)
- `Admin.gs` (Fitur Super Admin)
- `Teacher.gs` (Dashboard Guru dan metrik agregasi)
- `Schools.gs` (Direktori sekolah dan validasi NPSN unik)
- `Classes.gs` (Manajemen kelas guru)
- `Students.gs` (Manajemen siswa dan parser impor Excel)
- `Schedules.gs` (Jadwal pembelajaran harian)
- `Attendance.gs` (Presensi QR Code, timer sesi, anti-double scan, presensi manual)
- `LearningResources.gs` (Perangkat ajar pribadi & pustaka pusat Google Drive)
- `Journals.gs` (Jurnal harian mengajar)
- `Assessments.gs` (Asesmen formatif & sumatif)
- `Grades.gs` (Input nilai massal, kalkulasi rata-rata, dan rekomendasi remedial)
- `Reports.gs` (Rapor Kurikulum Merdeka dan cetak PDF)
- `Notifications.gs` (Notifikasi in-app)
- `AuditLogs.gs` (Pencatatan audit log platform)
- `Utilities.gs` (UUID, SHA-256 hash, response builder)

*Tips Manifest:*
Buka menu **Project Settings (Ikon Gerigi)** > Centang **"Show "appsscript.json" manifest file in editor"**, lalu buka tab `appsscript.json` di file list dan pastikan isinya:
```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

### 1.4 Atur Script Properties (Environment Variables)
1. Di Script Editor, klik **Project Settings (Ikon Gerigi)** di bilah kiri.
2. Gulir ke bawah ke bagian **Script Properties (Properti Skrip)**.
3. Klik **Add script property** dan tambahkan:
   - `SPREADSHEET_ID`: *(ID Spreadsheet yang disalin pada Langkah 1.1)*
   - `FIREBASE_PROJECT_ID`: *(ID Proyek Firebase Anda, misal: portal-guru-sd-ambulu)*
   - `FIREBASE_API_KEY`: *(Web API Key dari Firebase Console)*
4. Klik **Save script properties**.

### 1.5 Inisialisasi 21 Tabel Basis Data Otomatis
1. Di Script Editor, buka file `Database.gs`.
2. Di dropdown fungsi bagian atas, pilih fungsi `setupDatabase`.
3. Klik **Run (Jalankan)**.
4. Berikan izin otorisasi Google jika diminta (*Review Permissions* > Pilih Akun Google > *Advanced* > *Go to API_PORTAL_ADMINISTRASI_GURU_SD (unsafe)* > *Allow*).
5. Buka kembali Google Spreadsheet Anda: **21 Sheet/Tabel lengkap dengan header kolom dan data awal (sekolah binaan Kecamatan Ambulu, admin default, dan mata pelajaran standar) telah selesai dibuat secara otomatis!**

### 1.6 Deploy sebagai Web App
1. Di Script Editor, klik tombol biru **Deploy** di pojok kanan atas > **New deployment**.
2. Klik ikon gerigi (Select type) > Pilih **Web app**.
3. Isi konfigurasi:
   - **Description**: `Versi 1.0 Produksi`
   - **Execute as**: `Me (email-anda@gmail.com)` *(Sangat penting agar API memiliki hak menulis ke spreadsheet)*
   - **Who has access**: `Anyone` *(Sangat penting agar GitHub Pages dapat mengakses API)*
4. Klik **Deploy**.
5. Salin **Web app URL** yang berakhiran `/exec`.
   Contoh: `https://script.google.com/macros/s/AKfycbx.../exec`

---

## LANGKAH 2: Konfigurasi Frontend

1. Buka file `js/config.js` di editor Anda.
2. Tempel URL Web App dari langkah 1.6 ke dalam variabel `GAS_API_URL`:
   ```javascript
   var CONFIG = {
     // Tempel URL Web App GAS Anda di sini:
     GAS_API_URL: "https://script.google.com/macros/s/AKfycbx.../exec",

     // Ubah menjadi false untuk menghubungkan frontend ke Google Sheets langsung:
     IS_PREVIEW_MODE: false,

     // Konfigurasi Firebase dari Firebase Console:
     FIREBASE_CONFIG: {
       apiKey: "AIzaSy...",
       authDomain: "portal-guru-sd-ambulu.firebaseapp.com",
       projectId: "portal-guru-sd-ambulu",
       storageBucket: "portal-guru-sd-ambulu.appspot.com",
       messagingSenderId: "1234567890",
       appId: "1:1234567890:web:abcdef"
     },

     APP_TITLE: "Portal Administrasi Guru SD",
     DEFAULT_ACADEMIC_YEAR: "2026/2027",
     DEFAULT_SEMESTER: "1"
   };
   ```
3. Simpan file `js/config.js`.

> **Catatan Pengujian Instan:**
> Jika Anda belum memiliki Firebase API Key atau belum mendeploy GAS, Anda dapat membiarkan `IS_PREVIEW_MODE: true`. Aplikasi akan berjalan secara mandiri dengan data simulasi yang persis mencerminkan tangkapan layar desain (Budi Santoso, SD Negeri Sumberejo 04, 28 Siswa, 26 Hadir, Grafik Presensi 96%, dsb.).

---

## LANGKAH 3: Deploy ke GitHub & GitHub Pages

### Opsi A: Menggunakan Git Command Line
1. Buka Terminal / PowerShell di folder proyek `PORTAL-ADMIN-GURU-SD`:
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi Portal Administrasi Guru SD"
   ```
2. Buat repository baru di [GitHub](https://github.com/new), misalnya `portal-administrasi-guru-sd` (pilih Public).
3. Hubungkan remote dan push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<USERNAME-ANDA>/portal-administrasi-guru-sd.git
   git push -u origin main
   ```

### Opsi B: Menggunakan GitHub Web Uploader / GitHub Desktop
1. Buat repository baru di GitHub.
2. Buka repository > klik **Add file** > **Upload files**.
3. Tarik seluruh file dan folder (`index.html`, `css/`, `js/`, `docs/`, dsb.) ke GitHub.
4. Klik **Commit changes**.

### Aktifkan GitHub Pages:
1. Di repository GitHub Anda, klik menu **Settings** (tab atas).
2. Di bilah menu kiri, klik **Pages**.
3. Pada bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Pilih `main`
   - **Folder**: Pilih `/ (root)`
4. Klik tombol **Save**.
5. Tunggu sekitar 1-2 menit. GitHub akan menampilkan banner hijau:
   `Your site is live at https://<username-anda>.github.io/portal-administrasi-guru-sd/`
6. Buka tautan tersebut di browser atau HP Anda. Portal Guru SD siap digunakan!

---

## LANGKAH 4: Pengujian & Validasi Sistem

### 4.1 Mode Preview (Simulasi Instan)
- Buka tautan GitHub Pages Anda.
- Di halaman login, klik tombol **"Masuk sebagai Guru (Budi Santoso)"**.
- Anda akan langsung melihat dashboard lengkap persis seperti desain referensi:
  - Header dengan Tahun Pelajaran 2026/2027, Dark/Light Mode, Lencana Notifikasi 3.
  - Kartu Selamat Datang Guru Berseragam Pemda & Gedung SD Negeri Sumberejo 04.
  - 5 Kartu Metrik (Jumlah Siswa: 28, Hadir Hari Ini: 26, Kelas: 4, Perangkat: 12, Administrasi: 3).
  - Grafik Kehadiran Siswa 7 Hari interaktif dengan puncak 96%.
  - Jadwal Pelajaran Hari Ini lengkap dengan status pil (*Selesai*, *Berlangsung*, *Menunggu*).
  - Modal Presensi QR Code dengan hitung mundur 30 menit dan tombol simulasi scan siswa.
  - Modal Rapor Kurikulum Merdeka yang siap cetak / simpan sebagai file PDF.

### 4.2 Mode Live (Google Apps Script + Google Sheets)
- Ketika guru mendaftar menggunakan Google Sign-In, sistem akan memeriksa apakah profil guru sudah lengkap.
- Profil baru akan berstatus `PENDING_VERIFICATION` di sheet `teachers`.
- Super Admin dapat menyetujui akun tersebut dari portal admin, mengubah statusnya menjadi `ACTIVE`.
- Guru aktif dapat membuat kelas, menambah siswa, menginput presensi dan nilai, serta menyusun rapor secara aman dan terisolasi.
- Seluruh data secara otomatis tersimpan secara real-time di 21 tabel Google Sheets Anda.
