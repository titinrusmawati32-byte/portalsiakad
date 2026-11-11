/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Journals.gs
 * Deskripsi: Manajemen jurnal harian mengajar guru dan rekap kegiatan pembelajaran.
 */

/**
 * Guru: Mengambil daftar jurnal mengajar milik guru.
 */
function teacherGetJournals(idToken, classId, dateFilter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    var allJournals = getTableRows(CONFIG.SHEETS.TEACHING_JOURNALS);
    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);

    var classMap = {};
    for (var c = 0; c < allClasses.length; c++) {
      classMap[allClasses[c].class_id] = allClasses[c].class_name;
    }

    var subjectMap = {};
    for (var s = 0; s < allSubjects.length; s++) {
      subjectMap[allSubjects[s].subject_id] = allSubjects[s].subject_name;
    }

    var result = [];
    for (var i = 0; i < allJournals.length; i++) {
      var j = allJournals[i];
      if (j.owner_user_id === user.uid) {
        if (!classId || j.class_id === classId) {
          if (!dateFilter || formatDateIso(j.journal_date) === formatDateIso(dateFilter)) {
            result.push({
              journal_id: j.journal_id,
              class_id: j.class_id,
              class_name: classMap[j.class_id] || "Kelas",
              subject_id: j.subject_id,
              subject_name: subjectMap[j.subject_id] || j.subject_id,
              journal_date: formatDateIso(j.journal_date),
              journal_date_formatted: formatDateIndo(j.journal_date),
              topic: j.topic,
              learning_objective: j.learning_objective,
              activities: j.activities,
              reflection: j.reflection,
              notes: j.notes,
              created_at: j.created_at
            });
          }
        }
      }
    }

    result.sort(function(a, b) {
      return new Date(b.journal_date).getTime() - new Date(a.journal_date).getTime();
    });

    return createSuccessResponse(result, "Jurnal mengajar berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_JOURNALS_FAILED", err.message);
  }
}

/**
 * Guru: Menyimpan atau memperbarui jurnal mengajar harian.
 */
function teacherSaveJournal(idToken, journalData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    if (!journalData || !journalData.class_id || !journalData.topic || !journalData.journal_date) {
      return createErrorResponse("VALIDATION_ERROR", "Kelas, tanggal, dan topik materi wajib diisi.");
    }

    verifyClassOwnership(journalData.class_id, user.uid);

    var nowIso = new Date().toISOString();
    var journalId = journalData.journal_id || generateUuid();

    if (journalData.journal_id) {
      verifyJournalOwnership(journalId, user.uid);

      updateTableRow(CONFIG.SHEETS.TEACHING_JOURNALS, "journal_id", journalId, {
        class_id: journalData.class_id,
        subject_id: sanitizeString(journalData.subject_id || ""),
        journal_date: formatDateIso(journalData.journal_date),
        topic: sanitizeString(journalData.topic),
        learning_objective: sanitizeString(journalData.learning_objective || ""),
        activities: sanitizeString(journalData.activities || ""),
        reflection: sanitizeString(journalData.reflection || ""),
        notes: sanitizeString(journalData.notes || ""),
        updated_at: nowIso
      });

      return createSuccessResponse({ journal_id: journalId }, "Jurnal mengajar berhasil diperbarui");
    } else {
      var newJournal = {
        journal_id: journalId,
        owner_user_id: user.uid,
        class_id: journalData.class_id,
        subject_id: sanitizeString(journalData.subject_id || ""),
        journal_date: formatDateIso(journalData.journal_date),
        topic: sanitizeString(journalData.topic),
        learning_objective: sanitizeString(journalData.learning_objective || ""),
        activities: sanitizeString(journalData.activities || ""),
        reflection: sanitizeString(journalData.reflection || ""),
        notes: sanitizeString(journalData.notes || ""),
        created_at: nowIso,
        updated_at: nowIso
      };

      insertTableRow(CONFIG.SHEETS.TEACHING_JOURNALS, newJournal);
      recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "CREATE_JOURNAL", "TEACHING_JOURNALS", journalId, { topic: newJournal.topic });

      return createSuccessResponse(newJournal, "Jurnal mengajar berhasil disimpan");
    }
  } catch (err) {
    return createErrorResponse("SAVE_JOURNAL_FAILED", err.message);
  }
}

/**
 * Guru: Menghapus jurnal mengajar.
 */
function teacherDeleteJournal(idToken, journalId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyJournalOwnership(journalId, user.uid);

    deleteTableRow(CONFIG.SHEETS.TEACHING_JOURNALS, "journal_id", journalId);
    return createSuccessResponse({ journal_id: journalId }, "Jurnal mengajar berhasil dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_JOURNAL_FAILED", err.message);
  }
}
