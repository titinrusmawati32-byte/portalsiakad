/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Grades.gs
 * Deskripsi: Manajemen penginputan nilai formatif-sumatif dan analisis hasil capaian pembelajaran.
 */

/**
 * Guru: Mengambil rekap nilai seluruh siswa untuk asesmen tertentu.
 */
function teacherGetGrades(idToken, classId, assessmentId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    if (assessmentId) {
      verifyAssessmentOwnership(assessmentId, user.uid);
    }

    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var allGrades = getTableRows(CONFIG.SHEETS.GRADES);

    var classStudents = allStudents.filter(function(s) {
      return s.class_id === classId && s.status !== "ARCHIVED";
    });

    var gradeMap = {};
    for (var g = 0; g < allGrades.length; g++) {
      var item = allGrades[g];
      if (item.class_id === classId && item.assessment_id === assessmentId) {
        gradeMap[item.student_id] = item;
      }
    }

    var resultList = [];
    for (var i = 0; i < classStudents.length; i++) {
      var std = classStudents[i];
      var gradeRec = gradeMap[std.student_id] || null;
      resultList.push({
        student_id: std.student_id,
        nis: std.nis,
        full_name: std.full_name,
        gender: std.gender,
        grade_id: gradeRec ? gradeRec.grade_id : "",
        score: gradeRec ? gradeRec.score : "",
        notes: gradeRec ? gradeRec.notes : ""
      });
    }

    resultList.sort(function(a, b) {
      return String(a.full_name).localeCompare(String(b.full_name));
    });

    return createSuccessResponse(resultList, "Data nilai berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_GRADES_FAILED", err.message);
  }
}

/**
 * Guru: Menyimpan nilai siswa secara massal untuk sebuah asesmen dengan LockService.
 */
function teacherSaveBatchGrades(idToken, classId, assessmentId, gradesArray) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    verifyAssessmentOwnership(assessmentId, user.uid);

    if (!Array.isArray(gradesArray) || gradesArray.length === 0) {
      return createErrorResponse("VALIDATION_ERROR", "Daftar nilai tidak boleh kosong.");
    }

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
      var allGrades = getTableRows(CONFIG.SHEETS.GRADES);
      var nowIso = new Date().toISOString();
      var savedCount = 0;

      for (var i = 0; i < gradesArray.length; i++) {
        var item = gradesArray[i];
        if (!item.student_id) continue;

        var rawScore = item.score !== "" && item.score !== null ? Number(item.score) : "";
        if (rawScore !== "" && (isNaN(rawScore) || rawScore < 0 || rawScore > 100)) {
          continue; // Lewati nilai di luar 0-100
        }

        // Cari record yang sudah ada
        var existing = null;
        for (var g = 0; g < allGrades.length; g++) {
          if (allGrades[g].class_id === classId && 
              allGrades[g].assessment_id === assessmentId && 
              allGrades[g].student_id === item.student_id) {
            existing = allGrades[g];
            break;
          }
        }

        if (existing) {
          updateTableRow(CONFIG.SHEETS.GRADES, "grade_id", existing.grade_id, {
            score: rawScore,
            notes: sanitizeString(item.notes || ""),
            updated_at: nowIso
          });
        } else if (rawScore !== "") {
          var gradeId = generateUuid();
          insertTableRow(CONFIG.SHEETS.GRADES, {
            grade_id: gradeId,
            owner_user_id: user.uid,
            class_id: classId,
            student_id: item.student_id,
            assessment_id: assessmentId,
            score: rawScore,
            notes: sanitizeString(item.notes || ""),
            created_at: nowIso,
            updated_at: nowIso
          });
        }
        savedCount++;
      }

      recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "SAVE_BATCH_GRADES", "GRADES", assessmentId, { class_id: classId, count: savedCount });
      return createSuccessResponse({ savedCount: savedCount }, "Nilai berhasil disimpan untuk " + savedCount + " siswa.");
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createErrorResponse("SAVE_GRADES_FAILED", err.message);
  }
}

/**
 * Guru: Mengambil analisis hasil belajar kelas (Statistik, Distribusi, dan Remidial).
 */
function teacherGetLearningAnalysis(idToken, classId, subjectId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    var allGrades = getTableRows(CONFIG.SHEETS.GRADES);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var allAssessments = getTableRows(CONFIG.SHEETS.ASSESSMENTS);

    // Filter asesmen terkait
    var targetAssessmentIds = [];
    for (var a = 0; a < allAssessments.length; a++) {
      var asm = allAssessments[a];
      if (asm.class_id === classId && (!subjectId || asm.subject_id === subjectId)) {
        targetAssessmentIds.push(asm.assessment_id);
      }
    }

    var studentMap = {};
    for (var s = 0; s < allStudents.length; s++) {
      if (allStudents[s].class_id === classId && allStudents[s].status !== "ARCHIVED") {
        studentMap[allStudents[s].student_id] = {
          name: allStudents[s].full_name,
          nis: allStudents[s].nis,
          scores: []
        };
      }
    }

    var totalScores = [];
    for (var g = 0; g < allGrades.length; g++) {
      var gr = allGrades[g];
      if (gr.class_id === classId && targetAssessmentIds.indexOf(gr.assessment_id) !== -1) {
        var num = Number(gr.score);
        if (!isNaN(num) && gr.score !== "") {
          totalScores.push(num);
          if (studentMap[gr.student_id]) {
            studentMap[gr.student_id].scores.push(num);
          }
        }
      }
    }

    if (totalScores.length === 0) {
      return createSuccessResponse({
        hasData: false,
        message: "Belum ada data nilai yang diinput untuk kelas ini."
      });
    }

    var sum = totalScores.reduce(function(acc, val) { return acc + val; }, 0);
    var avg = Math.round((sum / totalScores.length) * 10) / 10;
    var max = Math.max.apply(null, totalScores);
    var min = Math.min.apply(null, totalScores);

    // Distribusi Nilai
    var distribution = { A: 0, B: 0, C: 0, D: 0 };
    for (var i = 0; i < totalScores.length; i++) {
      var sc = totalScores[i];
      if (sc >= 86) distribution.A++;
      else if (sc >= 71) distribution.B++;
      else if (sc >= 56) distribution.C++;
      else distribution.D++;
    }

    // Siswa yang memerlukan pendampingan khusus (Nilai rata-rata < 70)
    var remedialStudents = [];
    var stdKeys = Object.keys(studentMap);
    for (var k = 0; k < stdKeys.length; k++) {
      var stData = studentMap[stdKeys[k]];
      if (stData.scores.length > 0) {
        var stSum = stData.scores.reduce(function(acc, val) { return acc + val; }, 0);
        var stAvg = Math.round((stSum / stData.scores.length) * 10) / 10;
        if (stAvg < 70) {
          remedialStudents.push({
            student_id: stdKeys[k],
            full_name: stData.name,
            nis: stData.nis,
            averageScore: stAvg,
            recommendation: "Perlu pendampingan belajar tambahan dan asesmen remidial materi dasar."
          });
        }
      }
    }

    return createSuccessResponse({
      hasData: true,
      average: avg,
      highest: max,
      lowest: min,
      totalEntries: totalScores.length,
      distribution: distribution,
      remedialStudents: remedialStudents
    }, "Analisis hasil belajar berhasil dihitung");
  } catch (err) {
    return createErrorResponse("ANALYSIS_FAILED", err.message);
  }
}
