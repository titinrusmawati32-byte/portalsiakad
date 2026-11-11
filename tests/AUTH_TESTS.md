# AUTHENTICATION & REGISTRATION TEST SUITE
# PORTAL ADMINISTRASI GURU SD

Dokumen pengujian ini memvalidasi seluruh alur login Google Firebase Authentication, inisialisasi akun baru, pengisian profil, verifikasi token, dan proteksi sesi.

---

## 1. Skenario Pengujian

### TC-AUTH-01: Login Pengguna Pertama Kali (Akun Belum Lengkap)
- **Prasyarat**: Pengguna belum terdaftar di tabel `USERS`.
- **Langkah**:
  1. Klik tombol "Masuk dengan Google".
  2. Firebase mengembalikan token valid untuk email baru: `guru.baru@gmail.com`.
  3. Frontend memanggil `getCurrentUser(idToken)`.
  4. Backend memverifikasi token ke Firebase Identity Toolkit.
  5. Baris baru dibuat di `USERS` dengan status `PROFILE_INCOMPLETE`.
- **Hasil yang Diharapkan**:
  - Respons backend `{ role: "TEACHER", accountStatus: "PROFILE_INCOMPLETE" }`.
  - Frontend menampilkan Modal "Lengkapi Profil Guru".
  - Pengguna belum dapat membuka menu operasional kelas atau presensi.
- **Status**: PASSED

### TC-AUTH-02: Pengajuan Kelengkapan Profil Guru
- **Prasyarat**: Akun berstatus `PROFILE_INCOMPLETE`.
- **Langkah**:
  1. Pengguna mengisi nama lengkap, NIP, tipe guru, nama sekolah ("SDN SUMBEREJO 04"), dan NPSN ("20523891").
  2. Klik "Ajukan Verifikasi Akun".
  3. Frontend memanggil `completeTeacherProfile(idToken, payload)`.
  4. Backend memvalidasi format NPSN dan data wajib.
  5. Status akun di `USERS` berubah menjadi `PENDING_VERIFICATION`.
  6. Entri baru tercatat di `SCHOOL_VERIFICATIONS` dengan status `PENDING`.
- **Hasil yang Diharapkan**:
  - Respons `{ success: true, accountStatus: "PENDING_VERIFICATION" }`.
  - Notifikasi konfirmasi tampil di antarmuka.
- **Status**: PASSED

### TC-AUTH-03: Akses Operasional oleh Akun PENDING_VERIFICATION
- **Langkah**:
  1. Guru dengan akun `PENDING_VERIFICATION` mencoba memanggil `teacherGetClasses(idToken)`.
- **Hasil yang Diharapkan**:
  - Backend melempar error `ACCOUNT_NOT_ACTIVE`.
  - Frontend menampilkan peringatan bahwa akun masih menunggu verifikasi Super Admin.
  - Akses data ditolak.
- **Status**: PASSED

### TC-AUTH-04: Penolakan Token Palsu / Kedaluwarsa
- **Langkah**:
  1. Frontend mengirimkan token sembarang `idToken = "fake-token-xyz"`.
  2. Backend memvalidasi ke Google Identity Toolkit endpoint.
- **Hasil yang Diharapkan**:
  - Google API merespons error `INVALID_ID_TOKEN`.
  - Backend mengembalikan status `AUTH_FAILED`.
  - Tidak ada data sheet yang dibaca atau dikembalikan.
- **Status**: PASSED

### TC-AUTH-05: Verifikasi Identitas Super Admin
- **Langkah**:
  1. Pengguna login dengan email yang terdaftar di `ADMIN_USERS` dengan status `ACTIVE`.
  2. Backend mengekstrak email dari token dan mencocokkan ke `ADMIN_USERS`.
- **Hasil yang Diharapkan**:
  - Backend mengembalikan `{ role: "SUPER_ADMIN", accountStatus: "ACTIVE" }`.
  - Frontend membuka Portal Super Admin secara terisolasi.
  - Menu operasional kelas guru tidak ditampilkan.
- **Status**: PASSED
