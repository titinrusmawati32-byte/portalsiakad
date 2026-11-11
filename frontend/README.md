# Frontend - Portal Administrasi Guru SD

Antarmuka web statis modern untuk **Portal Administrasi Guru SD** yang di-host di GitHub Pages.

## 🚀 Fitur Frontend
- **100% Vanilla Web Standards**: HTML5, CSS3 Modern, Vanilla ES6 JavaScript (Tanpa build step / npm / webpack / vite).
- **Desain Presisi Sesuai Mockup**:
  - Sidebar Navy `#142B4A` dengan logo Tut Wuri Handayani.
  - Kartu Selamat Datang Guru Berseragam SD & Gedung Sekolah.
  - 5 Metrik KPI Administrasi Sekolah.
  - Grafik Kehadiran Siswa 7 Hari interaktif (SVG).
  - Presensi Digital QR Code dengan batas waktu 30 menit.
  - Pratinjau & Impor Data Siswa Massal dari Excel / CSV.
  - Penginputan Nilai Siswa Formatif & Sumatif.
  - Cetak Dokumen Rapor Siswa Kurikulum Merdeka (PDF Ready).
  - Mode Gelap / Terang (Dark Mode Toggle).
- **Mode Uji Coba (Preview Simulator)**: Dapat diuji langsung di browser tanpa backend aktif.

## 📁 Struktur Berkas
- `index.html` — Halaman tunggal utama aplikasi (Single Page Dashboard).
- `css/style.css` — Seluruh stylesheet desain antarmuka & responsivitas mobile.
- `js/config.js` — Konfigurasi URL Google Apps Script dan Firebase Authentication.
- `js/app.js` — Mesin interaktivitas, simulasi lokal, router menu, dan koneksi API.

## 🌐 Cara Mengaktifkan GitHub Pages
1. Unggah seluruh isi folder ini ke repository GitHub Anda.
2. Masuk ke **Settings** repository > pilih menu **Pages**.
3. Di bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`, Folder: `/ (root)`
4. Klik **Save**. Situs akan aktif dalam 1 menit.
