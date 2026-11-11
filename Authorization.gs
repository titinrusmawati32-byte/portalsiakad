/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Authorization.gs
 * Deskripsi: Penegakan aturan hak akses, verifikasi peran, dan isolasi data per guru (Zero-Trust).
 */

/**
 * Memastikan pengguna memiliki peran SUPER_ADMIN yang aktif di database.
 */
function requireSuperAdmin(verifiedUser) {
  if (!verifiedUser || !verifiedUser.uid) {
    throw new Error("UNAUTHORIZED: Pengguna tidak terautentikasi.");
  }

  var admins = getTableRows(CONFIG.SHEETS.ADMIN_USERS);
  for (var i = 0; i < admins.length; i++) {
    var adm = admins[i];
    var matchesUid = (adm.firebase_uid === verifiedUser.uid);
    var matchesEmail = (adm.email && String(adm.email).toLowerCase() === String(verifiedUser.email).toLowerCase());

    if ((matchesUid || matchesEmail) && adm.status === "ACTIVE" && adm.role === CONFIG.ROLES.SUPER_ADMIN) {
      return adm;
    }
  }

  recordAuditLog(verifiedUser.uid, "UNKNOWN", "FORBIDDEN_ADMIN_ACCESS_ATTEMPT", "SYSTEM", "PORTAL_ADMIN", { email: verifiedUser.email });
  throw new Error("FORBIDDEN: Anda tidak memiliki akses ke portal Super Admin.");
}

/**
 * Memastikan pengguna adalah Guru dengan status akun ACTIVE.
 */
function requireActiveTeacher(verifiedUser) {
  if (!verifiedUser || !verifiedUser.uid) {
    throw new Error("UNAUTHORIZED: Pengguna tidak terautentikasi.");
  }

  var users = getTableRows(CONFIG.SHEETS.USERS);
  for (var i = 0; i < users.length; i++) {
    var usr = users[i];
    if (usr.user_id === verifiedUser.uid || (usr.email && String(usr.email).toLowerCase() === String(verifiedUser.email).toLowerCase())) {
      if (usr.account_status !== CONFIG.ACCOUNT_STATUS.ACTIVE) {
        throw new Error("ACCOUNT_NOT_ACTIVE: Status akun Anda adalah " + usr.account_status + ". Fitur operasional belum dapat digunakan.");
      }
      return usr;
    }
  }

  throw new Error("TEACHER_NOT_FOUND: Data profil guru belum terdaftar di sistem.");
}

/**
 * Memvalidasi kepemilikan kelas oleh guru yang sedang aktif.
 * Mencegah Guru A mengakses atau memanipulasi kelas milik Guru B.
 */
function verifyClassOwnership(classId, teacherUid) {
  if (!classId) throw new Error("VALIDATION_ERROR: ID Kelas wajib disertakan.");
  
  var classes = getTableRows(CONFIG.SHEETS.CLASSES);
  for (var i = 0; i < classes.length; i++) {
    var cls = classes[i];
    if (String(cls.class_id) === String(classId)) {
      if (String(cls.owner_user_id) !== String(teacherUid)) {
        recordAuditLog(teacherUid, CONFIG.ROLES.TEACHER, "ILLEGAL_CLASS_ACCESS_ATTEMPT", "CLASSES", classId, { target_owner: cls.owner_user_id });
        throw new Error("FORBIDDEN: Anda tidak memiliki hak akses terhadap kelas ini.");
      }
      return cls;
    }
  }

  throw new Error("NOT_FOUND: Data kelas tidak ditemukan.");
}

/**
 * Memvalidasi kepemilikan murid oleh guru yang sedang aktif.
 */
function verifyStudentOwnership(studentId, teacherUid) {
  if (!studentId) throw new Error("VALIDATION_ERROR: ID Siswa wajib disertakan.");

  var students = getTableRows(CONFIG.SHEETS.STUDENTS);
  for (var i = 0; i < students.length; i++) {
    var std = students[i];
    if (String(std.student_id) === String(studentId)) {
      if (String(std.owner_user_id) !== String(teacherUid)) {
        recordAuditLog(teacherUid, CONFIG.ROLES.TEACHER, "ILLEGAL_STUDENT_ACCESS_ATTEMPT", "STUDENTS", studentId, { target_owner: std.owner_user_id });
        throw new Error("FORBIDDEN: Anda tidak memiliki hak akses terhadap data siswa ini.");
      }
      return std;
    }
  }

  throw new Error("NOT_FOUND: Data siswa tidak ditemukan.");
}

/**
 * Memvalidasi kepemilikan asesmen oleh guru.
 */
function verifyAssessmentOwnership(assessmentId, teacherUid) {
  if (!assessmentId) throw new Error("VALIDATION_ERROR: ID Asesmen wajib disertakan.");

  var assessments = getTableRows(CONFIG.SHEETS.ASSESSMENTS);
  for (var i = 0; i < assessments.length; i++) {
    var asm = assessments[i];
    if (String(asm.assessment_id) === String(assessmentId)) {
      if (String(asm.owner_user_id) !== String(teacherUid)) {
        throw new Error("FORBIDDEN: Anda tidak memiliki hak akses terhadap asesmen ini.");
      }
      return asm;
    }
  }

  throw new Error("NOT_FOUND: Data asesmen tidak ditemukan.");
}

/**
 * Memvalidasi kepemilikan jurnal mengajar oleh guru.
 */
function verifyJournalOwnership(journalId, teacherUid) {
  if (!journalId) throw new Error("VALIDATION_ERROR: ID Jurnal wajib disertakan.");

  var journals = getTableRows(CONFIG.SHEETS.TEACHING_JOURNALS);
  for (var i = 0; i < journals.length; i++) {
    var jrn = journals[i];
    if (String(jrn.journal_id) === String(journalId)) {
      if (String(jrn.owner_user_id) !== String(teacherUid)) {
        throw new Error("FORBIDDEN: Anda tidak memiliki hak akses terhadap jurnal ini.");
      }
      return jrn;
    }
  }

  throw new Error("NOT_FOUND: Data jurnal tidak ditemukan.");
}
