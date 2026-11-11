/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Reports.gs
 * Deskripsi: Penyusunan Rapor Siswa Kurikulum Merdeka, deskripsi capaian kompetensi, dan cetak PDF.
 */

/**
 * Guru: Mengambil daftar draf/final rapor siswa per kelas.
 */
function teacherGetReports(idToken, classId, semester) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    var allReports = getTableRows(CONFIG.SHEETS.REPORTS);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);

    var studentMap = {};
    for (var s = 0; s < allStudents.length; s++) {
      if (allStudents[s].class_id === classId) {
        studentMap[allStudents[s].student_id] = allStudents[s];
      }
    }

    var reportList = [];
    var semTarget = semester || "1";

    var studentIds = Object.keys(studentMap);
    for (var i = 0; i < studentIds.length; i++) {
      var stdId = studentIds[i];
      var std = studentMap[stdId];
      var foundReport = null;

      for (var r = 0; r < allReports.length; r++) {
        if (allReports[r].class_id === classId && 
            allReports[r].student_id === stdId && 
            String(allReports[r].semester) === String(semTarget)) {
          foundReport = allReports[r];
          break;
        }
      }

      reportList.push({
        student_id: stdId,
        nis: std.nis,
        full_name: std.full_name,
        gender: std.gender,
        report_id: foundReport ? foundReport.report_id : "",
        status: foundReport ? foundReport.status : "DRAFT",
        hasReport: !!foundReport,
        updated_at: foundReport ? foundReport.updated_at : ""
      });
    }

    reportList.sort(function(a, b) {
      return String(a.full_name).localeCompare(String(b.full_name));
    });

    return createSuccessResponse(reportList, "Daftar rapor siswa berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_REPORTS_FAILED", err.message);
  }
}

/**
 * Guru: Menyusun / memperbarui dokumen Rapor Kurikulum Merdeka untuk seorang murid.
 */
function teacherGenerateReport(idToken, classId, studentId, semester, payload) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    verifyStudentOwnership(studentId, user.uid);

    var nowIso = new Date().toISOString();
    var allReports = getTableRows(CONFIG.SHEETS.REPORTS);
    var semTarget = semester || "1";
    var existing = null;

    for (var r = 0; r < allReports.length; r++) {
      if (allReports[r].class_id === classId && 
          allReports[r].student_id === studentId && 
          String(allReports[r].semester) === String(semTarget)) {
        existing = allReports[r];
        break;
      }
    }

    var reportId = existing ? existing.report_id : generateUuid();
    var reportDataJson = JSON.stringify(payload || {});

    if (existing) {
      updateTableRow(CONFIG.SHEETS.REPORTS, "report_id", reportId, {
        report_data: reportDataJson,
        status: sanitizeString(payload.status || "FINAL"),
        updated_at: nowIso
      });
    } else {
      insertTableRow(CONFIG.SHEETS.REPORTS, {
        report_id: reportId,
        owner_user_id: user.uid,
        class_id: classId,
        student_id: studentId,
        academic_year: sanitizeString(payload.academic_year || CONFIG.DEFAULT_ACADEMIC_YEAR),
        semester: semTarget,
        report_data: reportDataJson,
        file_id: "",
        status: sanitizeString(payload.status || "FINAL"),
        created_at: nowIso,
        updated_at: nowIso
      });
    }

    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "GENERATE_REPORT", "REPORTS", reportId, { student_id: studentId });
    return createSuccessResponse({ report_id: reportId }, "Rapor siswa berhasil disimpan");
  } catch (err) {
    return createErrorResponse("GENERATE_REPORT_FAILED", err.message);
  }
}

/**
 * Guru: Mengambil data rapor lengkap untuk dicetak / dipratinjau.
 */
function teacherGetReportDetail(idToken, classId, studentId, semester) {
  try {
    var user = verifyFirebaseUser(idToken);
    var teacherProfile = requireActiveTeacher(user);
    var classObj = verifyClassOwnership(classId, user.uid);
    var studentObj = verifyStudentOwnership(studentId, user.uid);

    // Ambil data sekolah
    var schoolObj = null;
    if (teacherProfile.school_id) {
      var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
      for (var s = 0; s < allSchools.length; s++) {
        if (allSchools[s].school_id === teacherProfile.school_id) {
          schoolObj = allSchools[s];
          break;
        }
      }
    }

    // Ambil presensi siswa
    var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);
    var attSummary = { sick: 0, permission: 0, absent: 0 };
    for (var a = 0; a < allAttendance.length; a++) {
      var att = allAttendance[a];
      if (att.class_id === classId && att.student_id === studentId) {
        if (att.status === "SICK") attSummary.sick++;
        else if (att.status === "PERMISSION") attSummary.permission++;
        else if (att.status === "ABSENT") attSummary.absent++;
      }
    }

    // Ambil rekap nilai rapor jika sudah tersimpan
    var allReports = getTableRows(CONFIG.SHEETS.REPORTS);
    var savedReport = null;
    for (var r = 0; r < allReports.length; r++) {
      if (allReports[r].class_id === classId && allReports[r].student_id === studentId && String(allReports[r].semester) === String(semester || "1")) {
        savedReport = allReports[r];
        break;
      }
    }

    var parsedData = savedReport ? safeJsonParse(savedReport.report_data, {}) : {};

    return createSuccessResponse({
      student: studentObj,
      teacher: teacherProfile,
      class: classObj,
      school: schoolObj,
      attendance: attSummary,
      reportContent: parsedData,
      semester: semester || "1",
      academic_year: classObj.academic_year || CONFIG.DEFAULT_ACADEMIC_YEAR
    }, "Data pratinjau rapor berhasil dimuat");
  } catch (err) {
    return createErrorResponse("REPORT_DETAIL_FAILED", err.message);
  }
}
