# ACCESS CONTROL & DATA ISOLATION TEST SUITE
# PORTAL ADMINISTRASI GURU SD

Dokumen pengujian ini memverifikasi aturan keamanan paling kritis dalam arsitektur sistem:
1. **Isolasi Mutlak Antar-Guru**: Guru A tidak dapat membaca atau memanipulasi data kelas, siswa, presensi, jadwal, nilai, dan rapor milik Guru B.
2. **Batas Kewenangan Admin**: Super Admin tidak dapat membaca atau mengedit data akademik guru.

---

## 1. Skenario Pengujian Isolasi Data

### TC-SEC-01: Guru A Mencoba Mengakses Siswa di Kelas Milik Guru B
- **Aktor**: Guru A (UID: `TCH_A`)
- **Target**: Kelas `CLS_IVB` milik Guru B (UID: `TCH_B`)
- **Tindakan**:
  - Guru A memanggil `teacherGetStudents(token_A, "CLS_IVB")`.
- **Hasil yang Diharapkan**:
  - Backend memanggil `verifyClassOwnership("CLS_IVB", "TCH_A")`.
  - Backend mendeteksi ketidaksesuaian `owner_user_id` (`TCH_B != TCH_A`).
  - Sistem melempar exception `FORBIDDEN`.
  - Upaya akses ilegal tercatat di `AUDIT_LOGS` dengan action `ILLEGAL_CLASS_ACCESS_ATTEMPT`.
  - Data siswa Guru B **TIDAK PERNAH** dikembalikan ke browser Guru A.
- **Status**: PASSED

### TC-SEC-02: Guru A Mencoba Mengubah Nilai Siswa Milik Guru B
- **Aktor**: Guru A (UID: `TCH_A`)
- **Target**: Siswa `STD_B_01` dan Asesmen `ASM_B_01` milik Guru B
- **Tindakan**:
  - Guru A mengirim payload `teacherSaveBatchGrades(token_A, "CLS_B", "ASM_B_01", [{ student_id: "STD_B_01", score: 100 }])`.
- **Hasil yang Diharapkan**:
  - Validasi kepemilikan kelas gagal pada tahap pertama.
  - Operasi penulisan dibatalkan sebelum menyentuh `LockService` atau Google Sheets.
  - Mengembalikan kode respons `FORBIDDEN`.
- **Status**: PASSED

### TC-SEC-03: Super Admin Mencoba Mengakses Endpoint Nilai / Presensi Guru
- **Aktor**: Super Admin (UID: `SUPER_ADMIN_01`)
- **Target**: Fungsi akademik guru (`teacherGetGrades` atau `teacherRecordAttendance`)
- **Tindakan**:
  - Super Admin mengirim tokennya ke `teacherGetGrades(token_admin, "CLS_IVA", "ASM_01")`.
- **Hasil yang Diharapkan**:
  - Backend memanggil `requireActiveTeacher(user)`.
  - Super Admin tidak memiliki profil di `USERS` dengan `account_status == ACTIVE`.
  - Eksekusi ditolak dengan error `TEACHER_NOT_FOUND` atau `FORBIDDEN`.
  - Admin dilarang mencampuri administrasi akademik guru.
- **Status**: PASSED

### TC-SEC-04: Penolakan Manipulasi Identitas (Spoofing UID) dari Klien
- **Langkah**:
  - Pengguna mengirim HTTP request dengan mengubah header atau parameter manual `{ owner_user_id: "TCH_B" }`.
- **Hasil yang Diharapkan**:
  - Backend sama sekali tidak membaca `owner_user_id` dari parameter klien.
  - Backend selalu mengekstrak UID dari hasil verifikasi resmi Firebase ID Token server-side (`verified.uid`).
  - Parameter manipulasi diabaikan sepenuhnya.
- **Status**: PASSED
