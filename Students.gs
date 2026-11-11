/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Students.gs
 * Deskripsi: Manajemen data siswa, pencegahan kebocoran lintas guru, dan impor massal dari Excel.
 */

/**
 * Guru: Mengambil daftar siswa pada kelas tertentu.
 */
function teacherGetStudents(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    if (classId) {
      verifyClassOwnership(classId, user.uid); // Pastikan guru memiliki kelas ini
    }

    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var result = [];

    for (var i = 0; i < allStudents.length; i++) {
      var s = allStudents[i];
      if (s.owner_user_id === user.uid && s.status !== "ARCHIVED") {
        if (!classId || s.class_id === classId) {
          result.push(s);
        }
      }
    }

    result.sort(function(a, b) {
      return String(a.full_name).localeCompare(String(b.full_name));
    });

    return createSuccessResponse(result, "Data siswa berhasil diambil");
  } catch (err) {
    return createErrorResponse("GET_STUDENTS_FAILED", err.message);
  }
}

/**
 * Guru: Menambahkan murid tunggal ke dalam kelas.
 */
function teacherCreateStudent(idToken, classId, studentData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    if (!studentData || !studentData.full_name || !studentData.nis) {
      return createErrorResponse("VALIDATION_ERROR", "Nama lengkap dan NIS wajib diisi.");
    }

    var studentId = generateUuid();
    var nowIso = new Date().toISOString();
    var newStudent = {
      student_id: studentId,
      owner_user_id: user.uid,
      class_id: classId,
      nis: sanitizeString(studentData.nis),
      nisn: sanitizeString(studentData.nisn || ""),
      full_name: sanitizeString(studentData.full_name),
      gender: (studentData.gender === "P" || studentData.gender === "Perempuan") ? "P" : "L",
      birth_date: studentData.birth_date ? formatDateIso(studentData.birth_date) : "",
      status: "ACTIVE",
      created_at: nowIso,
      updated_at: nowIso
    };

    insertTableRow(CONFIG.SHEETS.STUDENTS, newStudent);
    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "CREATE_STUDENT", "STUDENTS", studentId, { name: newStudent.full_name, class_id: classId });

    return createSuccessResponse(newStudent, "Siswa berhasil didaftarkan");
  } catch (err) {
    return createErrorResponse("CREATE_STUDENT_FAILED", err.message);
  }
}

/**
 * Guru: Memperbarui data murid.
 */
function teacherUpdateStudent(idToken, studentId, studentData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyStudentOwnership(studentId, user.uid);

    var nowIso = new Date().toISOString();
    var updateFields = {
      nis: sanitizeString(studentData.nis),
      nisn: sanitizeString(studentData.nisn || ""),
      full_name: sanitizeString(studentData.full_name),
      gender: (studentData.gender === "P" || studentData.gender === "Perempuan") ? "P" : "L",
      birth_date: studentData.birth_date ? formatDateIso(studentData.birth_date) : "",
      updated_at: nowIso
    };

    updateTableRow(CONFIG.SHEETS.STUDENTS, "student_id", studentId, updateFields);
    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "UPDATE_STUDENT", "STUDENTS", studentId, updateFields);

    return createSuccessResponse({ student_id: studentId }, "Data siswa berhasil diperbarui");
  } catch (err) {
    return createErrorResponse("UPDATE_STUDENT_FAILED", err.message);
  }
}

/**
 * Guru: Menghapus (mengarsipkan) data murid.
 */
function teacherDeleteStudent(idToken, studentId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyStudentOwnership(studentId, user.uid);

    var nowIso = new Date().toISOString();
    updateTableRow(CONFIG.SHEETS.STUDENTS, "student_id", studentId, {
      status: "ARCHIVED",
      updated_at: nowIso
    });

    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "DELETE_STUDENT", "STUDENTS", studentId, {});
    return createSuccessResponse({ student_id: studentId }, "Siswa berhasil diarsipkan");
  } catch (err) {
    return createErrorResponse("DELETE_STUDENT_FAILED", err.message);
  }
}

/**
 * Guru: Mengimpor daftar murid massal hasil pratinjau (preview) Excel.
 */
function teacherImportStudents(idToken, classId, studentsList) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return createErrorResponse("VALIDATION_ERROR", "Daftar siswa untuk diimpor tidak boleh kosong.");
    }

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
      var nowIso = new Date().toISOString();
      var importedCount = 0;

      for (var i = 0; i < studentsList.length; i++) {
        var row = studentsList[i];
        if (!row.full_name || !row.nis) continue;

        var studentId = generateUuid();
        var studentRecord = {
          student_id: studentId,
          owner_user_id: user.uid,
          class_id: classId,
          nis: sanitizeString(row.nis),
          nisn: sanitizeString(row.nisn || ""),
          full_name: sanitizeString(row.full_name),
          gender: (row.gender === "P" || row.gender === "Perempuan") ? "P" : "L",
          birth_date: row.birth_date ? formatDateIso(row.birth_date) : "",
          status: "ACTIVE",
          created_at: nowIso,
          updated_at: nowIso
        };

        insertTableRow(CONFIG.SHEETS.STUDENTS, studentRecord);
        importedCount++;
      }

      recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "IMPORT_STUDENTS", "STUDENTS", classId, { count: importedCount });
      return createSuccessResponse({ importedCount: importedCount }, importedCount + " siswa berhasil diimpor.");
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createErrorResponse("IMPORT_STUDENTS_FAILED", err.message);
  }
}
