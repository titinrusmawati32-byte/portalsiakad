# DATABASE SCHEMA GOOGLE SHEETS
# PORTAL ADMINISTRASI GURU SD

Spreadsheet utama bertindak sebagai relational-like database dengan struktur sheet dan kolom sebagai berikut:

---

### 1. USERS
Menyimpan profil guru terdaftar melalui Firebase Authentication.
- `user_id` (String - PK): Firebase UID
- `email` (String): Alamat email akun Google
- `full_name` (String): Nama lengkap beserta gelar guru
- `photo_url` (String): URL foto profil
- `phone` (String): Nomor WhatsApp/telepon
- `nip` (String): NIP (Nomor Induk Pegawai) jika ASN/P3K, atau strip
- `teacher_type` (String): `CLASS_TEACHER` (Guru Kelas) atau `SUBJECT_TEACHER` (Guru Mapel)
- `school_id` (String - FK): Relasi ke tabel SCHOOLS
- `role` (String): Nilai tetap `TEACHER`
- `account_status` (String): `PROFILE_INCOMPLETE`, `PENDING_VERIFICATION`, `ACTIVE`, `REJECTED`, `SUSPENDED`
- `created_at` (DateTime): Tanggal pendaftaran
- `updated_at` (DateTime): Tanggal pembaruan profil
- `last_login` (DateTime): Waktu login terakhir

---

### 2. ADMIN_USERS
Daftar Super Administrator platform yang diotorisasi secara mandiri di sisi server (tidak dapat dimanipulasi dari frontend).
- `admin_id` (String - PK): UUID admin
- `firebase_uid` (String): Firebase UID
- `email` (String): Email administrator
- `admin_name` (String): Nama lengkap administrator
- `role` (String): `SUPER_ADMIN`
- `status` (String): `ACTIVE`, `INACTIVE`
- `created_at` (DateTime): Tanggal ditambahkan
- `updated_at` (DateTime): Terakhir diubah

---

### 3. SCHOOLS
Direktori sekolah dasar (SD) terverifikasi.
- `school_id` (String - PK): UUID sekolah
- `npsn` (String - Unique): Nomor Pokok Sekolah Nasional (8 digit string)
- `school_name` (String): Nama resmi sekolah (contoh: SDN SUMBEREJO 04)
- `jenjang` (String): Nilai default `SD`
- `kecamatan` (String): Contoh: Ambulu
- `kabupaten` (String): Contoh: Jember
- `address` (String): Alamat jalan lengkap sekolah
- `verification_status` (String): `VERIFIED`, `PENDING`, `REJECTED`
- `created_at` (DateTime): Tanggal pembuatan
- `updated_at` (DateTime): Tanggal pembaruan

---

### 4. SCHOOL_VERIFICATIONS
Riwayat pengajuan verifikasi guru dan sekolah.
- `verification_id` (String - PK): UUID verifikasi
- `user_id` (String - FK): Referensi pengguna pemohon
- `school_id` (String - FK): Referensi sekolah
- `submitted_data` (JSON): Snapshot data pendaftaran guru & sekolah
- `decision` (String): `APPROVED`, `REJECTED`, `PENDING`
- `review_note` (String): Catatan verifikator dari Super Admin
- `reviewed_by` (String): Nama atau ID Super Admin peninjau
- `reviewed_at` (DateTime): Waktu keputusan diambil
- `created_at` (DateTime): Waktu pendaftaran diajukan

---

### 5. CLASSES
Kelas-kelas yang dibuat dan dikelola secara mandiri oleh guru.
- `class_id` (String - PK): UUID kelas
- `owner_user_id` (String - FK): UID guru pemilik kelas (Kunci Isolasi Data)
- `school_id` (String - FK): Sekolah tempat kelas berada
- `class_name` (String): Contoh: "Kelas IV A"
- `grade_level` (Number): 1, 2, 3, 4, 5, atau 6
- `academic_year` (String): Contoh: "2026/2027"
- `semester` (String): `1` (Ganjil) atau `2` (Genap)
- `class_type` (String): `REGULAR` (Wali Kelas) atau `SUBJECT` (Mata Pelajaran)
- `subject_id` (String - FK): Opsional, jika guru mata pelajaran
- `status` (String): `ACTIVE`, `ARCHIVED`
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 6. STUDENTS
Data murid per kelas.
- `student_id` (String - PK): UUID siswa
- `owner_user_id` (String - FK): UID guru pengelola siswa
- `class_id` (String - FK): ID kelas terdaftar
- `nis` (String): Nomor Induk Siswa lokal
- `nisn` (String): NISN nasional (10 digit)
- `full_name` (String): Nama lengkap murid
- `gender` (String): `L` (Laki-laki) atau `P` (Perempuan)
- `birth_date` (Date): Tanggal lahir format YYYY-MM-DD
- `status` (String): `ACTIVE`, `MUTATED`, `GRADUATED`
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 7. SUBJECTS
Daftar mata pelajaran SD standar (Kurikulum Merdeka).
- `subject_id` (String - PK): Contoh: `MAPEL_BINDO_4`
- `subject_name` (String): Contoh: "Bahasa Indonesia", "Matematika", "IPAS", "PPKn", "Seni Budaya", "PJOK", "Pendidikan Agama"
- `grade_level` (Number): 1 s.d. 6
- `status` (String): `ACTIVE`

---

### 8. SCHEDULES
Jadwal mengajar guru.
- `schedule_id` (String - PK): UUID jadwal
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `subject_id` (String - FK): ID mata pelajaran
- `day_of_week` (String): `Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`
- `start_time` (String): Contoh: "07:00"
- `end_time` (String): Contoh: "08:35"
- `room` (String): Ruang kelas
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 9. ATTENDANCE_SESSIONS
Sesi presensi digital berbatas waktu.
- `session_id` (String - PK): UUID sesi
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `session_date` (Date): Tanggal sesi presensi
- `qr_token_hash` (String): Hash SHA-256 token QR
- `expires_at` (DateTime): Waktu kedaluwarsa QR Code
- `status` (String): `OPEN`, `CLOSED`
- `created_at` (DateTime)

---

### 10. ATTENDANCE
Rekam kehadiran siswa (QR scan atau manual input).
- `attendance_id` (String - PK): UUID presensi
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `session_id` (String - FK): ID sesi presensi
- `student_id` (String - FK): ID siswa
- `attendance_date` (Date): Tanggal presensi
- `status` (String): `PRESENT`, `SICK`, `PERMISSION`, `ABSENT`
- `method` (String): `QR_SCAN`, `MANUAL`
- `recorded_at` (DateTime): Timestamp pencatatan
- `note` (String): Keterangan surat dokter / surat izin

---

### 11. LEARNING_RESOURCES
Perangkat ajar pribadi guru & pustaka pusat.
- `resource_id` (String - PK): UUID perangkat
- `owner_user_id` (String - FK): UID guru (atau `SYSTEM_CENTRAL` untuk pustaka pusat)
- `resource_type` (String): `MODUL_AJAR`, `RPP`, `CP_TP`, `ATP`, `LKPD`, `PROSEM`, `PROTA`
- `title` (String): Judul dokumen
- `description` (String): Ringkasan materi
- `subject_id` (String - FK): Mata pelajaran
- `class_id` (String - FK): Kelas terkait (jika pribadi)
- `grade_level` (Number): 1 s.d. 6
- `semester` (String): `1` atau `2`
- `academic_year` (String): "2026/2027"
- `drive_url` (String): Tautan Google Drive / PDF viewer
- `visibility` (String): `PRIVATE` (Pribadi Guru) atau `PUBLIC_CENTRAL` (Pustaka Pusat Admin)
- `status` (String): `ACTIVE`, `ARCHIVED`
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 12. TEACHING_JOURNALS
Jurnal harian pelaksanaan pembelajaran.
- `journal_id` (String - PK): UUID jurnal
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `subject_id` (String - FK): ID mata pelajaran
- `journal_date` (Date): Tanggal pelaksanaan
- `topic` (String): Materi pokok bahasan
- `learning_objective` (String): Tujuan pembelajaran (TP)
- `activities` (String): Uraian kegiatan belajar mengajar
- `reflection` (String): Refleksi proses belajar
- `notes` (String): Catatan khusus / kendala siswa
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 13. ASSESSMENTS
Kegiatan evaluasi, tugas, dan ujian siswa.
- `assessment_id` (String - PK): UUID asesmen
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `subject_id` (String - FK): ID mata pelajaran
- `title` (String): Judul asesmen (contoh: "Ulangan Harian Bab 1 Bilangan Cacah")
- `assessment_type` (String): `FORMATIF`, `SUMATIF_LINGKUP_MATERI`, `SUMATIF_AKHIR_SEMESTER`, `TUGAS`, `PROYEK`, `PRAKTIK`
- `assessment_date` (Date): Tanggal pelaksanaan
- `description` (String): Keterangan / petunjuk pengerjaan
- `status` (String): `ACTIVE`, `COMPLETED`
- `created_at` (DateTime)

---

### 14. GRADES
Daftar nilai individu siswa.
- `grade_id` (String - PK): UUID nilai
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `student_id` (String - FK): ID siswa
- `assessment_id` (String - FK): ID asesmen
- `score` (Number): Nilai angka (0 - 100)
- `notes` (String): Catatan capaian kualitatif / feedback
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 15. REPORTS
Rapor siswa per semester.
- `report_id` (String - PK): UUID rapor
- `owner_user_id` (String - FK): UID guru
- `class_id` (String - FK): ID kelas
- `student_id` (String - FK): ID siswa
- `academic_year` (String): "2026/2027"
- `semester` (String): "1" atau "2"
- `report_data` (JSON): Nilai rekapitulasi, capaian kompetensi, kehadiran, ekstrakurikuler, catatan wali kelas
- `file_id` (String): ID PDF cetak di Drive (opsional)
- `status` (String): `DRAFT`, `FINAL`
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 16. NOTIFICATIONS
Notifikasi dalam aplikasi.
- `notification_id` (String - PK): UUID notifikasi
- `recipient_user_id` (String - FK): UID penerima
- `title` (String): Judul notifikasi
- `message` (String): Isi pesan
- `notification_type` (String): `INFO`, `WARNING`, `SUCCESS`, `VERIFICATION`
- `is_read` (Boolean): TRUE / FALSE
- `created_at` (DateTime)

---

### 17. ANNOUNCEMENTS
Papan pengumuman platform dari Super Admin.
- `announcement_id` (String - PK): UUID pengumuman
- `title` (String): Judul pengumuman
- `content` (String): Isi pengumuman
- `audience` (String): `ALL_TEACHERS`, `KECAMATAN_AMBULU`, `PUBLIC`
- `publish_at` (DateTime): Tanggal tayang
- `expires_at` (DateTime): Tanggal berakhir
- `status` (String): `PUBLISHED`, `DRAFT`, `ARCHIVED`
- `created_by` (String): Nama Super Admin
- `created_at` (DateTime)

---

### 18. SUPPORT_TICKETS
Pusat bantuan guru ke pengelola platform.
- `ticket_id` (String - PK): UUID tiket
- `user_id` (String - FK): UID guru pelapor
- `subject` (String): Judul kendala
- `description` (String): Uraian masalah
- `priority` (String): `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `status` (String): `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- `admin_note` (String): Tanggapan/solusi Super Admin
- `created_at` (DateTime)
- `updated_at` (DateTime)

---

### 19. AUDIT_LOGS
Jejak audit keamanan platform.
- `log_id` (String - PK): UUID log
- `actor_user_id` (String): UID pelaku aktivitas
- `actor_role` (String): `SUPER_ADMIN`, `TEACHER`, `SYSTEM`
- `action` (String): Contoh: `APPROVE_TEACHER`, `CREATE_CLASS`, `DELETE_STUDENT`, `RECORD_ATTENDANCE`
- `entity_type` (String): Entitas yang diubah
- `entity_id` (String): ID entitas
- `details` (JSON): Data tambahan atau payload
- `timestamp` (DateTime): Waktu pasti aktivitas (ISO string)

---

### 20. APP_SETTINGS
Konfigurasi parameter global aplikasi.
- `setting_key` (String - PK): Kunci setting (contoh: `CURRENT_ACADEMIC_YEAR`, `CURRENT_SEMESTER`, `PLATFORM_NAME`)
- `setting_value` (String): Nilai setting
- `updated_by` (String): Super Admin yang mengubah
- `updated_at` (DateTime): Waktu perubahan

---

### 21. SCHOOL_DOCUMENTS
Dokumen legal dan administrasi sekolah pendukung verifikasi.
- `document_id` (String - PK): UUID dokumen
- `school_id` (String - FK): ID sekolah
- `document_name` (String): Nama dokumen (contoh: SK Operasional, Akreditasi)
- `drive_file_id` (String): ID berkas Google Drive
- `drive_url` (String): URL berkas Google Drive
- `document_type` (String): `SK_OPERASIONAL`, `AKREDITASI`, `SURAT_TUGAS`
- `status` (String): `VALID`, `EXPIRED`, `PENDING`
- `created_at` (DateTime)
