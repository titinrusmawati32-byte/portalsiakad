/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Assessments.gs
 * Deskripsi: Manajemen kegiatan evaluasi pembelajaran (Formatif, Sumatif, Tugas, Proyek).
 */

/**
 * Guru: Mengambil daftar kegiatan asesmen per kelas.
 */
function teacherGetAssessments(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    if (classId) {
      verifyClassOwnership(classId, user.uid);
    }

    var allAssessments = getTableRows(CONFIG.SHEETS.ASSESSMENTS);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);
    var subjectMap = {};
    for (var s = 0; s < allSubjects.length; s++) {
      subjectMap[allSubjects[s].subject_id] = allSubjects[s].subject_name;
    }

    var result = [];
    for (var i = 0; i < allAssessments.length; i++) {
      var asm = allAssessments[i];
      if (asm.owner_user_id === user.uid && asm.status !== "ARCHIVED") {
        if (!classId || asm.class_id === classId) {
          result.push({
            assessment_id: asm.assessment_id,
            class_id: asm.class_id,
            subject_id: asm.subject_id,
            subject_name: subjectMap[asm.subject_id] || asm.subject_id,
            title: asm.title,
            assessment_type: asm.assessment_type,
            assessment_date: formatDateIso(asm.assessment_date),
            description: asm.description,
            status: asm.status,
            created_at: asm.created_at
          });
        }
      }
    }

    result.sort(function(a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return createSuccessResponse(result, "Daftar asesmen berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_ASSESSMENTS_FAILED", err.message);
  }
}

/**
 * Guru: Membuat atau memperbarui kegiatan asesmen.
 */
function teacherSaveAssessment(idToken, assessmentData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    if (!assessmentData || !assessmentData.class_id || !assessmentData.title || !assessmentData.assessment_type) {
      return createErrorResponse("VALIDATION_ERROR", "Kelas, judul, dan tipe asesmen wajib diisi.");
    }

    verifyClassOwnership(assessmentData.class_id, user.uid);

    var nowIso = new Date().toISOString();
    var assessmentId = assessmentData.assessment_id || generateUuid();

    if (assessmentData.assessment_id) {
      verifyAssessmentOwnership(assessmentId, user.uid);

      updateTableRow(CONFIG.SHEETS.ASSESSMENTS, "assessment_id", assessmentId, {
        class_id: assessmentData.class_id,
        subject_id: sanitizeString(assessmentData.subject_id || ""),
        title: sanitizeString(assessmentData.title),
        assessment_type: sanitizeString(assessmentData.assessment_type),
        assessment_date: formatDateIso(assessmentData.assessment_date || new Date()),
        description: sanitizeString(assessmentData.description || ""),
        status: sanitizeString(assessmentData.status || "ACTIVE")
      });

      return createSuccessResponse({ assessment_id: assessmentId }, "Asesmen berhasil diperbarui");
    } else {
      var newAssessment = {
        assessment_id: assessmentId,
        owner_user_id: user.uid,
        class_id: assessmentData.class_id,
        subject_id: sanitizeString(assessmentData.subject_id || ""),
        title: sanitizeString(assessmentData.title),
        assessment_type: sanitizeString(assessmentData.assessment_type),
        assessment_date: formatDateIso(assessmentData.assessment_date || new Date()),
        description: sanitizeString(assessmentData.description || ""),
        status: "ACTIVE",
        created_at: nowIso
      };

      insertTableRow(CONFIG.SHEETS.ASSESSMENTS, newAssessment);
      recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "CREATE_ASSESSMENT", "ASSESSMENTS", assessmentId, { title: newAssessment.title });

      return createSuccessResponse(newAssessment, "Asesmen baru berhasil dibuat");
    }
  } catch (err) {
    return createErrorResponse("SAVE_ASSESSMENT_FAILED", err.message);
  }
}

/**
 * Guru: Menghapus asesmen.
 */
function teacherDeleteAssessment(idToken, assessmentId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyAssessmentOwnership(assessmentId, user.uid);

    updateTableRow(CONFIG.SHEETS.ASSESSMENTS, "assessment_id", assessmentId, { status: "ARCHIVED" });
    return createSuccessResponse({ assessment_id: assessmentId }, "Asesmen berhasil dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_ASSESSMENT_FAILED", err.message);
  }
}
