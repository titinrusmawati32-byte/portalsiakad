/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Classes.gs
 * Deskripsi: Manajemen data kelas guru dengan pembatasan kepemilikan mutlak (owner_user_id).
 */

/**
 * Guru: Mengambil seluruh kelas milik guru yang sedang login.
 */
function teacherGetClasses(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);
    var myClasses = [];

    for (var i = 0; i < allClasses.length; i++) {
      if (allClasses[i].owner_user_id === user.uid) {
        myClasses.push(allClasses[i]);
      }
    }

    // Urutkan berdasarkan grade_level kemudian class_name
    myClasses.sort(function(a, b) {
      if (a.grade_level !== b.grade_level) {
        return Number(a.grade_level) - Number(b.grade_level);
      }
      return String(a.class_name).localeCompare(String(b.class_name));
    });

    return createSuccessResponse(myClasses, "Daftar kelas berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_CLASSES_FAILED", err.message);
  }
}

/**
 * Guru: Membuat kelas baru.
 */
function teacherCreateClass(idToken, classData) {
  try {
    var user = verifyFirebaseUser(idToken);
    var teacherProfile = requireActiveTeacher(user);

    if (!classData || !classData.class_name) {
      return createErrorResponse("VALIDATION_ERROR", "Nama kelas wajib diisi.");
    }

    var classId = generateUuid();
    var nowIso = new Date().toISOString();
    var newClass = {
      class_id: classId,
      owner_user_id: user.uid, // Mutlak dari Firebase Token server-side
      school_id: teacherProfile.school_id || "",
      class_name: sanitizeString(classData.class_name),
      grade_level: parseInt(classData.grade_level, 10) || 4,
      academic_year: sanitizeString(classData.academic_year || CONFIG.DEFAULT_ACADEMIC_YEAR),
      semester: sanitizeString(classData.semester || CONFIG.DEFAULT_SEMESTER),
      class_type: sanitizeString(classData.class_type || "REGULAR"),
      subject_id: sanitizeString(classData.subject_id || ""),
      status: "ACTIVE",
      created_at: nowIso,
      updated_at: nowIso
    };

    insertTableRow(CONFIG.SHEETS.CLASSES, newClass);
    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "CREATE_CLASS", "CLASSES", classId, { class_name: newClass.class_name });

    return createSuccessResponse(newClass, "Kelas berhasil dibuat");
  } catch (err) {
    return createErrorResponse("CREATE_CLASS_FAILED", err.message);
  }
}

/**
 * Guru: Memperbarui data kelas milik sendiri.
 */
function teacherUpdateClass(idToken, classId, classData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid); // Validasi kepemilikan ketat

    var nowIso = new Date().toISOString();
    var updateFields = {
      class_name: sanitizeString(classData.class_name),
      grade_level: parseInt(classData.grade_level, 10) || 4,
      academic_year: sanitizeString(classData.academic_year),
      semester: sanitizeString(classData.semester),
      class_type: sanitizeString(classData.class_type || "REGULAR"),
      subject_id: sanitizeString(classData.subject_id || ""),
      updated_at: nowIso
    };

    updateTableRow(CONFIG.SHEETS.CLASSES, "class_id", classId, updateFields);
    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "UPDATE_CLASS", "CLASSES", classId, updateFields);

    return createSuccessResponse({ class_id: classId }, "Data kelas berhasil diperbarui");
  } catch (err) {
    return createErrorResponse("UPDATE_CLASS_FAILED", err.message);
  }
}

/**
 * Guru: Mengarsipkan kelas (Soft Delete / Archive).
 */
function teacherArchiveClass(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    var nowIso = new Date().toISOString();
    updateTableRow(CONFIG.SHEETS.CLASSES, "class_id", classId, {
      status: "ARCHIVED",
      updated_at: nowIso
    });

    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "ARCHIVE_CLASS", "CLASSES", classId, {});
    return createSuccessResponse({ class_id: classId }, "Kelas berhasil diarsipkan");
  } catch (err) {
    return createErrorResponse("ARCHIVE_CLASS_FAILED", err.message);
  }
}
