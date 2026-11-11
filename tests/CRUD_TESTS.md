# CRUD & BUSINESS LOGIC TEST SUITE
# PORTAL ADMINISTRASI GURU SD

Dokumen pengujian ini memvalidasi seluruh fungsionalitas CRUD (Create, Read, Update, Delete) pada modul kelas, siswa, presensi QR, jurnal mengajar, nilai, dan rapor.

---

## 1. Modul Kelas (`Classes.gs`)
- **TC-CRUD-CLS-01**: Membuat kelas baru dengan tahun ajaran "2026/2027", tingkat 4, semester 1.
  - *Hasil*: Kelas tersimpan di sheet `CLASSES` dengan UUID dan `owner_user_id` sesuai token.
- **TC-CRUD-CLS-02**: Memperbarui nama kelas dari "Kelas IV A" menjadi "Kelas 4 Unggulan A".
  - *Hasil*: Baris pada sheet ter-update via `updateTableRow`.
- **TC-CRUD-CLS-03**: Mengarsipkan kelas (Soft Delete).
  - *Hasil*: Status kelas berubah menjadi `ARCHIVED` dan tidak muncul di daftar kelas aktif.

---

## 2. Modul Siswa & Impor Excel (`Students.gs`)
- **TC-CRUD-STD-01**: Tambah siswa tunggal dengan NIS "20240401" dan Nama "Ahmad Fauzan".
  - *Hasil*: Tersimpan di sheet `STUDENTS`.
- **TC-CRUD-STD-02**: Impor data siswa massal dari pratinjau teks Excel (10 siswa).
  - *Hasil*: Seluruh 10 baris tersimpan dengan aman menggunakan `LockService`. Tidak terjadi duplikasi ID.

---

## 3. Modul Presensi & QR Code Sesi (`Attendance.gs`)
- **TC-PRES-01**: Guru membuka sesi presensi QR.
  - *Hasil*: Sesi berstatus `OPEN` dibuat di sheet `ATTENDANCE_SESSIONS` dengan `expires_at` 30 menit ke depan dan hash SHA-256.
- **TC-PRES-02**: Siswa memindai QR code sebelum masa berlaku habis.
  - *Hasil*: Siswa otomatis berstatus `PRESENT` dengan method `QR_SCAN`.
- **TC-PRES-03**: Siswa mencoba memindai ulang untuk kedua kalinya dalam sesi yang sama (Anti Double-Scan).
  - *Hasil*: Sistem mendeteksi entri ganda dan menolak pencatatan berulang (`alreadyRecorded: true`).
- **TC-PRES-04**: Siswa memindai QR code setelah waktu sesi kedaluwarsa.
  - *Hasil*: Sesi ditutup otomatis (`CLOSED`) dan scan ditolak (`SESSION_EXPIRED`).
- **TC-PRES-05**: Guru menyimpan presensi manual (Hadir, Izin, Sakit, Alpa) secara massal.
  - *Hasil*: Rekap harian terbarui di sheet `ATTENDANCE`.

---

## 4. Modul Jurnal Mengajar (`Journals.gs`)
- **TC-JRN-01**: Guru menyimpan jurnal harian pembelajaran (Materi FPB & KPK).
  - *Hasil*: Tersimpan di `TEACHING_JOURNALS` dan dapat dicetak sebagai arsip supervisi akademik.

---

## 5. Modul Nilai & Analisis (`Grades.gs`)
- **TC-GRD-01**: Guru menginput nilai ulangan sumatif untuk 28 siswa.
  - *Hasil*: Seluruh nilai tersimpan di `GRADES`.
- **TC-GRD-02**: Sistem menghitung statistik capaian belajar kelas.
  - *Hasil*: Rata-rata kelas, nilai tertinggi, nilai terendah, serta daftar siswa yang membutuhkan remidial (nilai < 70) ditampilkan secara akurat.

---

## 6. Modul Rapor Kurikulum Merdeka (`Reports.gs`)
- **TC-REP-01**: Guru menyusun draf rapor untuk siswa Ahmad Fauzan.
  - *Hasil*: Data capaian kompetensi, kehadiran, dan catatan wali kelas tersimpan di `REPORTS`.
- **TC-REP-02**: Membuka dialog cetak rapor resmi.
  - *Hasil*: Format cetak resmi Kemendikbud lengkap dengan kop sekolah, identitas siswa, tabel capaian, rekap presensi, dan kolom tanda tangan siap dicetak atau diunduh sebagai PDF.
