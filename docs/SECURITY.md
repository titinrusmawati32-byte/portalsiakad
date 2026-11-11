# SECURITY POLICY & ACCESS CONTROL
# PORTAL ADMINISTRASI GURU SD

Dokumen ini mendefinisikan arsitektur keamanan, kebijakan isolasi data antarguru, serta perlindungan terhadap kerentanan web standar.

---

## 1. Prinsip Nol Kepercayaan (Zero-Trust) pada Klien
Frontend (Browser) dianggap sebagai lingkungan yang tidak aman.
1. **Tidak Ada Identitas yang Dipercaya dari Klien**: Parameter seperti `user_id`, `owner_user_id`, dan `role` yang dikirim dari browser **TIDAK PERNAH** dipercaya secara langsung.
2. **Ekstraksi Identitas Terverifikasi**: Backend mengekstrak `uid` dan `email` langsung dari Firebase ID Token yang telah divalidasi ke endpoint resmi Google Firebase Authentication:
   `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}`
3. **Otorisasi Server-Side**: Pemeriksaan hak akses dilakukan secara ketat di backend Apps Script sebelum operasi pembacaan atau penulisan data dilakukan.

---

## 2. Isolasi Data Multi-Tenant (Guru A vs Guru B)
Setiap entitas operasional (Kelas, Siswa, Presensi, Jadwal, Nilai, Jurnal, Asesmen, Rapor) memiliki kolom wajib:
`owner_user_id`

Setiap endpoint guru menerapkan pola validasi berjenjang:
```javascript
// Pola Wajib Pemeriksaan Kepemilikan Data
const user = verifyFirebaseUser(idToken);
requireActiveTeacher(user);

const classRecord = getClassById(classId);
if (!classRecord) {
  return createErrorResponse("NOT_FOUND", "Data kelas tidak ditemukan");
}
if (classRecord.owner_user_id !== user.uid) {
  // Catat upaya akses ilegal ke Audit Log
  recordAuditLog(user.uid, "TEACHER", "UNAUTHORIZED_ACCESS_ATTEMPT", "CLASSES", classId, { reason: "Mencoba mengakses kelas milik guru lain" });
  return createErrorResponse("FORBIDDEN", "Anda tidak memiliki hak akses terhadap kelas ini");
}
```

---

## 3. Batas Kewenangan Super Admin
Sesuai mandat PRD:
1. Super Admin **DILARANG** mengedit, menambah, atau menghapus kelas guru, siswa, presensi, jurnal, nilai, maupun rapor.
2. Super Admin **HANYA** memiliki akses ke:
   - Verifikasi status pendaftaran guru (`USERS` & `SCHOOL_VERIFICATIONS`).
   - Direktori sekolah (`SCHOOLS`).
   - Pustaka ajar pusat (`LEARNING_RESOURCES` dengan visibility `PUBLIC_CENTRAL`).
   - Pengumuman platform (`ANNOUNCEMENTS`).
   - Tiket bantuan (`SUPPORT_TICKETS`).
   - Rekap log aktivitas (`AUDIT_LOGS`).
   - Pengaturan platform (`APP_SETTINGS`).

---

## 4. Keamanan Presensi QR Code
Fitur presensi menggunakan QR Code menerapkan mekanisme pencegahan pemalsuan:
1. **Token Dinamis & Hash**: Sesi presensi menghasilkan token acak unik yang di-hash dengan SHA-256 dan disimpan di sheet `ATTENDANCE_SESSIONS`.
2. **Batas Waktu (Expiration Time)**: Sesi memiliki batas waktu aktif (contoh: 30 menit). Presensi yang dicoba setelah masa berlaku berakhir akan ditolak otomatis.
3. **Pencegahan Scan Ganda**: Kombinasi `session_id` + `student_id` dikunci melalui `LockService` di backend untuk memastikan satu siswa hanya dapat tercatat satu kali per sesi.
4. **Verifikasi Guru**: Status kehadiran akhir tetap di bawah pengawasan dan dapat ditinjau/diedit secara manual oleh guru yang bersangkutan.

---

## 5. Konkurensi & Integritas Data dengan LockService
Google Sheets tidak memiliki mekanisme ACID lock bawaan seperti SQL. Oleh karena itu:
- Operasi tulis penting (seperti penyimpanan nilai massal, pencatatan presensi, dan persetujuan verifikasi guru) dibungkus menggunakan `LockService.getScriptLock()` dengan batas tunggu timeout maksimal (contoh: 20 detik).
- Setelah selesai, lock dilepas menggunakan `lock.releaseLock()` di dalam blok `finally`.

---

## 6. Pengelolaan Kunci Rahasia (Script Properties)
Konfigurasi sensitif tidak pernah ditulis keras (hardcoded) di kode sumber atau dikirim ke frontend:
- `FIREBASE_API_KEY`: Kunci API Firebase Web
- `FIREBASE_PROJECT_ID`: ID Proyek Firebase
- `SPREADSHEET_ID`: ID Spreadsheet Utama
- `DRIVE_RESOURCE_FOLDER_ID`: ID Folder Google Drive Pustaka Pusat
Konfigurasi ini disimpan di **Apps Script Project Properties (Script Properties)**.
