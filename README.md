# PORTAL ADMINISTRASI GURU SD
### Multi-Teacher Educational Administration SaaS
**Platform:** Google Apps Script (HTML Service) + Google Sheets + Firebase Authentication + Google Drive  
**Wilayah Implementasi Awal:** Kecamatan Ambulu, Kabupaten Jember, Jawa Timur  
**Status:** Produksi Versi 1.0

---

## 🌟 Gambaran Aplikasi
Portal Administrasi Guru SD adalah solusi SaaS komprehensif bagi guru sekolah dasar untuk mengelola seluruh administrasi akademik, kelas, presensi QR Code, jurnal harian mengajar, asesmen, nilai formatif-sumatif, dan penyusunan rapor siswa secara digital, terintegrasi, dan mandiri.

Aplikasi dilengkapi dua portal mandiri dengan pemisahan peran yang tegas:
1. **Portal Super Admin**: Pengelolaan platform, verifikasi pendaftaran guru, direktori sekolah, pustaka perangkat ajar pusat (Google Drive), pengumuman, dan audit log.
2. **Portal Guru**: Pengelolaan kelas, siswa, presensi QR, jadwal, jurnal mengajar, asesmen, input nilai, analisis hasil belajar, dan cetak rapor.

---

## 🎨 Antarmuka & Desain Visual
Mengacu pada standar desain edukasi modern:
- **Warna Utama**: Deep Navy (`#142B4A`), Royal Blue (`#2563EB`), Surface White (`#FFFFFF`), Background Soft Gray (`#F5F7FB`).
- **Fitur Unggulan**:
  - Banner Selamat Datang tematik SD Negeri dengan sapaan nama guru dan badge sekolah/kelas.
  - 5 Kartu Metrik Utama (Jumlah Siswa, Hadir Hari Ini, Kelas yang Diampu, Perangkat Ajar, Administrasi Pending).
  - Grafik Kehadiran 7 Hari Terakhir & Jadwal Pelajaran Interaktif.
  - Akses Cepat Presensi QR Code, Presensi Manual, Nilai, Jurnal, dan Laporan.
  - Dukungan Dark Mode dan tampilan responsif mobile (Drawer / Bottom Nav).

---

## 📁 Struktur Direktori Proyek
```text
PORTAL-ADMIN-GURU-SD/
│
├── appsscript.json            # Manifest GAS (timezone Asia/Jakarta, runtime V8)
├── .clasp.json                # Konfigurasi Google Clasp
├── README.md                  # Dokumentasi induk proyek
│
├── Code.gs                    # Entry point doGet(e) & template router
├── Config.gs                  # Pengaturan Script Properties & konstanta
├── Database.gs                # Mesin database Sheets, setupDatabase(), LockService
├── Auth.gs                    # Verifikasi Firebase Auth Token server-side
├── Authorization.gs           # Otorisasi role & isolasi data owner_user_id
├── Admin.gs                   # Seluruh endpoint & fungsi Super Admin
├── Teacher.gs                 # Endpoint dashboard & profil guru
├── Schools.gs                 # Manajemen sekolah & validasi NPSN unik
├── Classes.gs                 # Manajemen kelas & validasi kepemilikan
├── Students.gs                # Manajemen siswa & parser impor Excel
├── Schedules.gs               # Pengelolaan jadwal pelajaran
├── Attendance.gs              # Presensi QR Code sesi & manual
├── LearningResources.gs       # Perangkat ajar guru & pustaka pusat
├── Journals.gs                # Jurnal mengajar harian & ekspor cetak
├── Assessments.gs             # Asesmen & kuis pembelajaran
├── Grades.gs                  # Input nilai massal & analisis capaian
├── Reports.gs                 # Generator rapor siswa Kurikulum Merdeka
├── Notifications.gs           # Notifikasi dalam aplikasi
├── AuditLogs.gs               # Pencatatan jejak audit sistem
├── Utilities.gs               # Helper umum & format respons standar
│
├── index.html                 # Shell aplikasi web & kerangka navigasi
├── stylesheet.html            # Desain visual lengkap, tema, animasi, responsif
├── javascript.html            # Logika frontend, router, mode preview & GAS API
├── login.html                 # Halaman login Google & formulir profil
├── admin-dashboard.html       # Seluruh tampilan Portal Super Admin
├── teacher-dashboard.html     # Seluruh tampilan Portal Guru (sesuai referensi desain)
├── components.html            # Komponen modal dialog, QR code, pratinjau rapor
│
├── docs/                      # Dokumentasi komprehensif
│   ├── PRD.md                 # Product Requirements Document
│   ├── DATABASE_SCHEMA.md     # Spesifikasi 21 sheet database
│   ├── API_SPECIFICATION.md   # Spesifikasi fungsi backend
│   ├── SECURITY.md            # Kebijakan isolasi & keamanan
│   ├── DEPLOYMENT.md          # Panduan deployment GAS & Firebase
│   └── CHANGELOG.md           # Riwayat rilis sistem
│
└── tests/                     # Skenario pengujian lengkap
    ├── AUTH_TESTS.md
    ├── ACCESS_CONTROL_TESTS.md
    ├── CRUD_TESTS.md
    └── UI_TESTS.md
```

---

## 🚀 Panduan Ringkas Deployment
1. Buka Google Spreadsheet baru di akun Google Anda.
2. Buka menu **Ekstensi > Apps Script**.
3. Di tab Setelan Proyek, tambahkan **Script Properties**:
   - `SPREADSHEET_ID`: ID spreadsheet database Anda.
   - `FIREBASE_API_KEY`: Kunci Web API Firebase Authentication.
   - `FIREBASE_PROJECT_ID`: ID Proyek Firebase Anda.
   - `SUPER_ADMIN_EMAILS`: Email Super Admin (pisahkan koma jika lebih dari satu).
4. Jalankan fungsi `setupDatabase()` sekali untuk membuat 21 tabel otomatis.
5. Klik **Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone**.
6. Buka tautan Web App yang dihasilkan.
