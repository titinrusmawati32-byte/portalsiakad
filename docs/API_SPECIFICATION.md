# API SPECIFICATION (GAS HTML SERVICE & GOOGLE.SCRIPT.RUN)
# PORTAL ADMINISTRASI GURU SD

Seluruh komunikasi antara Frontend Browser dan Backend Google Apps Script menggunakan jembatan asynchronous `google.script.run` dengan penanganan error berbasis Promise standar.

Setiap pemanggilan fungsi backend wajib menyertakan `idToken` resmi dari Firebase Authentication sebagai parameter pertama.

---

## 1. Format Standar Respons

### 1.1 Respons Sukses
```json
{
  "success": true,
  "message": "Operasi berhasil diselesaikan",
  "data": {},
  "meta": {
    "requestId": "req-1731338000-abc1234",
    "timestamp": "2026-11-11T21:55:00.000Z"
  }
}
```

### 1.2 Respons Gagal
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Anda tidak memiliki hak akses terhadap entitas data ini"
  },
  "meta": {
    "requestId": "req-1731338000-err5678",
    "timestamp": "2026-11-11T21:55:00.000Z"
  }
}
```

---

## 2. Modul Autentikasi (`Auth.gs`)

### `getCurrentUser(idToken)`
- **Deskripsi**: Memvalidasi token Google Firebase ke server `identitytoolkit.googleapis.com`, mencocokkan identitas dengan tabel `USERS` dan `ADMIN_USERS`.
- **Parameter**: `idToken: String`
- **Output**: 
  - `role`: `"SUPER_ADMIN"` | `"TEACHER"`
  - `accountStatus`: `"PROFILE_INCOMPLETE"` | `"PENDING_VERIFICATION"` | `"ACTIVE"` | `"REJECTED"` | `"SUSPENDED"`
  - `user`: Data profil guru atau admin.

### `completeTeacherProfile(idToken, profilePayload)`
- **Deskripsi**: Melengkapi formulir pendaftaran awal (NIP, tipe guru, sekolah/NPSN) dan mengubah status menjadi `PENDING_VERIFICATION`.
- **Parameter**: `idToken: String`, `profilePayload: Object`
- **Output**: Objek profil baru yang tersimpan di Google Sheets.

---

## 3. Modul Super Admin (`Admin.gs`)
Hanya dapat diakses jika `actor_role == "SUPER_ADMIN"`. Dilarang mengutak-atik kelas, siswa, jurnal, maupun rapor guru.

| Nama Fungsi | Parameter | Deskripsi & Validasi |
|---|---|---|
| `adminGetDashboard(idToken)` | `idToken` | Agregat total guru, guru aktif, sekolah terverifikasi, jumlah berkas pustaka |
| `adminGetPendingTeachers(idToken)` | `idToken` | Daftar guru dengan status `PENDING_VERIFICATION` |
| `adminGetTeacherDetail(idToken, targetUserId)` | `idToken, targetUserId` | Detail profil lengkap, sekolah, dan dokumen pendukung guru |
| `adminApproveTeacher(idToken, targetUserId, note)` | `idToken, targetUserId, note` | Menyetujui pendaftaran, mengubah status menjadi `ACTIVE`, mencatat audit log |
| `adminRejectTeacher(idToken, targetUserId, note)` | `idToken, targetUserId, note` | Menolak pendaftaran dengan alasan/catatan resmi |
| `adminSuspendTeacher(idToken, targetUserId, note)` | `idToken, targetUserId, note` | Menangguhkan akun bermasalah |
| `adminReactivateTeacher(idToken, targetUserId)` | `idToken, targetUserId` | Mengaktifkan kembali akun yang ditangguhkan |
| `adminGetTeachers(idToken, filter)` | `idToken, filter` | Mengambil daftar seluruh guru dengan filter sekolah, status, dan jenis guru |
| `adminGetSchools(idToken)` | `idToken` | Direktori seluruh sekolah di database |
| `adminCreateSchool(idToken, schoolData)` | `idToken, schoolData` | Mendaftarkan sekolah baru dengan validasi NPSN unik |
| `adminVerifySchool(idToken, schoolId, status)` | `idToken, schoolId, status` | Memverifikasi sekolah binaan |
| `adminCreateResource(idToken, resourceData)` | `idToken, resourceData` | Menambahkan materi ajar ke Pustaka Pusat (`PUBLIC_CENTRAL`) |
| `adminUpdateResource(idToken, resourceId, data)` | `idToken, resourceId, data` | Mengubah metadata dokumen pustaka pusat |
| `adminDeleteResource(idToken, resourceId)` | `idToken, resourceId` | Menghapus dokumen pustaka pusat |
| `adminGetResources(idToken)` | `idToken` | Menampilkan seluruh dokumen pustaka pusat |
| `adminPublishAnnouncement(idToken, payload)` | `idToken, payload` | Menerbitkan pengumuman platform baru |
| `adminGetSupportTickets(idToken)` | `idToken` | Menampilkan daftar keluhan bantuan dari guru |
| `adminUpdateSupportTicket(idToken, ticketId, responseData)` | `idToken, ticketId, responseData` | Membalas dan menyelesaikan tiket bantuan |
| `adminGetAuditLogs(idToken, limit)` | `idToken, limit` | Menampilkan riwayat jejak audit sistem |
| `adminGetPlatformSettings(idToken)` | `idToken` | Mengambil variabel konfigurasi platform |
| `adminUpdatePlatformSettings(idToken, settings)` | `idToken, settings` | Menyimpan perubahan konfigurasi platform |

---

## 4. Modul Operasional Guru (`Teacher.gs` & Modul Terkait)
Semua fungsi guru menerapkan validasi kepemilikan data (`owner_user_id == user.uid`).

### 4.1 Dashboard & Profil
- `teacherGetDashboard(idToken)`: Mengembalikan metrik jumlah kelas, jumlah murid aktif, presensi hari ini, jadwal hari ini, 7 hari riwayat kehadiran, aktivitas terbaru, dan pengumuman.
- `teacherGetProfile(idToken)`: Profil lengkap guru yang sedang aktif.
- `teacherUpdateProfile(idToken, profileData)`: Memperbarui kontak, nama, dan foto profil.

### 4.2 Manajemen Kelas (`Classes.gs`)
- `teacherGetClasses(idToken)`: Mengambil daftar kelas milik guru yang login.
- `teacherCreateClass(idToken, classData)`: Membuat kelas baru (Tingkat 1-6, semester, tahun ajaran).
- `teacherUpdateClass(idToken, classId, classData)`: Memperbarui nama/detail kelas milik sendiri.
- `teacherArchiveClass(idToken, classId)`: Mengarsipkan kelas yang telah usai.

### 4.3 Manajemen Siswa (`Students.gs`)
- `teacherGetStudents(idToken, classId)`: Menampilkan daftar murid pada kelas yang dipilih (wajib lolos verifikasi kepemilikan kelas).
- `teacherCreateStudent(idToken, classId, studentData)`: Menambahkan murid tunggal.
- `teacherUpdateStudent(idToken, studentId, studentData)`: Memperbarui data murid.
- `teacherDeleteStudent(idToken, studentId)`: Menghapus/menonaktifkan murid.
- `teacherImportStudents(idToken, classId, studentsList)`: Impor massal data siswa dari Excel setelah pratinjau (preview) dan validasi di frontend.

### 4.4 Presensi & Sesi QR Code (`Attendance.gs`)
- `teacherCreateAttendanceSession(idToken, classId)`: Membuka sesi presensi baru berdurasi terbatas (misal 30 menit). Menghasilkan token SHA-256 QR dinamis.
- `teacherRecordAttendance(idToken, classId, sessionId, studentId, status, method, note)`: Mencatat status presensi murid (QR Scan atau manual input Guru). Mencegah scan ganda.
- `teacherGetAttendance(idToken, classId, dateFilter)`: Mengambil rekap presensi harian / bulanan kelas.
- `studentScanQr(sessionId, qrToken, studentId)`: Validasi scan QR murid ke backend.

### 4.5 Jadwal Pelajaran (`Schedules.gs`)
- `teacherGetSchedules(idToken, classId)`: Mengambil jadwal mengajar mingguan.
- `teacherSaveSchedule(idToken, scheduleData)`: Menyimpan / memperbarui slot jadwal.
- `teacherDeleteSchedule(idToken, scheduleId)`: Menghapus slot jadwal.

### 4.6 Perangkat Pembelajaran & Materi (`LearningResources.gs`)
- `teacherGetResources(idToken, filter)`: Mengambil pustaka pribadi guru + pustaka pusat dari admin.
- `teacherSaveResource(idToken, resourceData)`: Menyimpan tautan perangkat ajar pribadi (Modul ajar, RPP, CP, TP, ATP).
- `teacherDeleteResource(idToken, resourceId)`: Menghapus perangkat ajar pribadi.

### 4.7 Jurnal Mengajar (`Journals.gs`)
- `teacherGetJournals(idToken, classId, dateFilter)`: Mengambil daftar jurnal harian mengajar.
- `teacherSaveJournal(idToken, journalData)`: Menyimpan / memperbarui jurnal mengajar (topik, TP, aktivitas, refleksi, catatan).
- `teacherDeleteJournal(idToken, journalId)`: Menghapus jurnal mengajar.

### 4.8 Asesmen, Kuis & Nilai (`Assessments.gs`, `Grades.gs`)
- `teacherGetAssessments(idToken, classId)`: Mengambil daftar asesmen kelas.
- `teacherSaveAssessment(idToken, assessmentData)`: Membuat kegiatan asesmen/ulangan baru.
- `teacherGetGrades(idToken, classId, assessmentId)`: Mengambil rekap nilai per siswa untuk suatu asesmen.
- `teacherSaveBatchGrades(idToken, classId, assessmentId, gradesArray)`: Menyimpan nilai siswa secara massal dengan `LockService`.
- `teacherGetLearningAnalysis(idToken, classId, subjectId)`: Mengolah statistik nilai (rata-rata, tertinggi, terendah, distribusi, serta rekomendasi siswa yang butuh remidial/pendampingan).

### 4.9 Buku Rapor (`Reports.gs`)
- `teacherGetReports(idToken, classId, semester)`: Mengambil draf/final rapor siswa per kelas.
- `teacherGenerateReport(idToken, classId, studentId, semester, payload)`: Menyusun rapor Kurikulum Merdeka (akumulasi nilai, deskripsi capaian kompetensi, presensi, ekstrakurikuler, dan catatan wali kelas).
- `teacherExportReportPdf(idToken, reportId)`: Mengonversi data rapor ke format cetak PDF terstandar.

### 4.10 Pengumuman, Kalender & Bantuan
- `teacherGetAnnouncements(idToken)`: Menampilkan pengumuman resmi dari Super Admin.
- `teacherGetAcademicCalendar(idToken)`: Menampilkan kalender hari efektif belajar, libur, dan kegiatan dinas pendidikan.
- `teacherCreateSupportTicket(idToken, ticketData)`: Mengirimkan kendala ke pusat bantuan Super Admin.
