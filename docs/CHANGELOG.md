# CHANGELOG
# PORTAL ADMINISTRASI GURU SD

## [1.0.0] - 2026-11-11
### Ditambahkan
- **Fondasi Sistem**: Arsitektur Multi-teacher SaaS berbasis Google Apps Script HTML Service dan Google Sheets.
- **Autentikasi & Otorisasi**: Integrasi Google Sign-In Firebase Auth dengan validasi token server-side dan pemisahan portal Super Admin vs Guru.
- **Isolasi Data**: Pembatasan akses berbasis `owner_user_id` di setiap endpoint akademik guru.
- **Database Terstruktur**: 21 tabel Google Sheets dengan skema relasional, indeks UUID, dan LockService.
- **Portal Super Admin**:
  - Dashboard statistik agregat platform.
  - Modul verifikasi guru & validasi NPSN sekolah.
  - Manajemen akun guru dan direktori sekolah.
  - Pengelolaan Pustaka Perangkat Ajar Pusat (Google Drive).
  - Manajemen pengumuman, pusat bantuan, pengaturan platform, dan audit log.
- **Portal Guru**:
  - Dashboard modern dengan hero banner kustom, indikator metrik, grafik kehadiran 7 hari, dan jadwal harian mengajar.
  - Manajemen kelas (Tingkat 1-6) dan manajemen siswa dengan pratinjau impor Excel.
  - Presensi digital dengan QR Code sesi berbatas waktu & presensi manual.
  - Pengelolaan jadwal pelajaran dan kalender akademik.
  - Modul perangkat ajar pribadi & integrasi pustaka pusat.
  - Jurnal mengajar harian dengan ekspor cetak.
  - Modul asesmen/kuis, penginputan nilai massal, serta analisis capaian belajar.
  - Penyusunan dan pencetakan Rapor Kurikulum Merdeka.
- **Desain UI/UX Modern**:
  - Tema visual Navy `#142B4A` & Royal Blue `#2563EB`.
  - Mode Terang / Gelap (Dark Mode).
  - Mode Pratinjau Interaktif (Standalone Preview) untuk pengujian lokal instan.
