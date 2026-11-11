/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Code.gs
 * Deskripsi: Web API Gateway (doPost / doGet) untuk Frontend di GitHub Pages & HTML Service Templating.
 */

/**
 * Entry point HTTP POST untuk API eksternal (GitHub Pages / Frontend Web App).
 * Mendukung pemanggilan via fetch() dengan output JSON standar dan penanganan CORS.
 */
function doPost(e) {
  var responseData;
  try {
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    var body = safeJsonParse(rawContents, {});
    var action = body.action || (e && e.parameter ? e.parameter.action : "");
    var idToken = body.idToken || (e && e.parameter ? e.parameter.idToken : "");
    var payload = body.payload || {};

    if (!action) {
      responseData = createErrorResponse("MISSING_ACTION", "Parameter 'action' wajib disertakan.");
    } else {
      responseData = routeApiAction(action, idToken, payload);
    }
  } catch (err) {
    responseData = createErrorResponse("INTERNAL_SERVER_ERROR", err.message);
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Entry point HTTP GET: Mendukung Health Check API, Web App HTML Service, atau ping sederhana.
 */
function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : "";

  // Jika dipanggil via API Ping / Status
  if (action === "status" || action === "ping") {
    return ContentService.createTextOutput(JSON.stringify(getSystemStatus()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Jika dibuka langsung sebagai GAS Web App
  try {
    var template = HtmlService.createTemplateFromFile("index");
    template.appName = CONFIG.APP_NAME;
    template.version = CONFIG.VERSION;
    template.defaultAcademicYear = CONFIG.DEFAULT_ACADEMIC_YEAR;
    template.firebaseApiKey = getFirebaseApiKey();
    template.firebaseProjectId = getFirebaseProjectId();

    return template.evaluate()
      .setTitle("Portal Administrasi Guru SD")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ONLINE",
      message: "Portal Administrasi Guru SD API Server Aktif",
      version: CONFIG.VERSION
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Router Terpusat: Memetakan permintaan API dari GitHub Pages ke fungsi internal yang sesuai.
 */
function routeApiAction(action, idToken, payload) {
  switch (action) {
    // === AUTENTIKASI & PROFIL ===
    case "getCurrentUser":
      return getCurrentUser(idToken);
    case "completeTeacherProfile":
      return completeTeacherProfile(idToken, payload);
    case "getPublicSchools":
      return getPublicSchools();

    // === GURU: DASHBOARD & KELAS ===
    case "teacherGetDashboard":
      return teacherGetDashboard(idToken);
    case "teacherGetProfile":
      return teacherGetProfile(idToken);
    case "teacherUpdateProfile":
      return teacherUpdateProfile(idToken, payload);
    case "teacherGetClasses":
      return teacherGetClasses(idToken);
    case "teacherCreateClass":
      return teacherCreateClass(idToken, payload);
    case "teacherUpdateClass":
      return teacherUpdateClass(idToken, payload.class_id, payload);
    case "teacherArchiveClass":
      return teacherArchiveClass(idToken, payload.class_id);

    // === GURU: SISWA & IMPOR EXCEL ===
    case "teacherGetStudents":
      return teacherGetStudents(idToken, payload.class_id);
    case "teacherCreateStudent":
      return teacherCreateStudent(idToken, payload.class_id, payload);
    case "teacherUpdateStudent":
      return teacherUpdateStudent(idToken, payload.student_id, payload);
    case "teacherDeleteStudent":
      return teacherDeleteStudent(idToken, payload.student_id);
    case "teacherImportStudents":
      return teacherImportStudents(idToken, payload.class_id, payload.studentsList);

    // === GURU: JADWAL PELAJARAN ===
    case "teacherGetSchedules":
      return teacherGetSchedules(idToken, payload.class_id);
    case "teacherSaveSchedule":
      return teacherSaveSchedule(idToken, payload);
    case "teacherDeleteSchedule":
      return teacherDeleteSchedule(idToken, payload.schedule_id);

    // === GURU: PRESENSI DIGITAL & QR ===
    case "teacherCreateAttendanceSession":
      return teacherCreateAttendanceSession(idToken, payload.class_id);
    case "studentScanQr":
      return studentScanQr(payload.sessionId, payload.rawQrToken, payload.studentId);
    case "teacherRecordAttendance":
      return teacherRecordAttendance(idToken, payload.class_id, payload.dateStr, payload.recordsArray);
    case "teacherGetAttendance":
      return teacherGetAttendance(idToken, payload.class_id, payload.dateFilter);

    // === GURU: JURNAL & PERANGKAT PEMBELAJARAN ===
    case "teacherGetJournals":
      return teacherGetJournals(idToken, payload.class_id, payload.dateFilter);
    case "teacherSaveJournal":
      return teacherSaveJournal(idToken, payload);
    case "teacherDeleteJournal":
      return teacherDeleteJournal(idToken, payload.journal_id);
    case "teacherGetResources":
      return teacherGetResources(idToken, payload.filter);
    case "teacherSaveResource":
      return teacherSaveResource(idToken, payload);
    case "teacherDeleteResource":
      return teacherDeleteResource(idToken, payload.resource_id);

    // === GURU: ASESMEN, NILAI & ANALISIS ===
    case "teacherGetAssessments":
      return teacherGetAssessments(idToken, payload.class_id);
    case "teacherSaveAssessment":
      return teacherSaveAssessment(idToken, payload);
    case "teacherDeleteAssessment":
      return teacherDeleteAssessment(idToken, payload.assessment_id);
    case "teacherGetGrades":
      return teacherGetGrades(idToken, payload.class_id, payload.assessment_id);
    case "teacherSaveBatchGrades":
      return teacherSaveBatchGrades(idToken, payload.class_id, payload.assessment_id, payload.gradesArray);
    case "teacherGetLearningAnalysis":
      return teacherGetLearningAnalysis(idToken, payload.class_id, payload.subject_id);

    // === GURU: RAPOR SISWA KURIKULUM MERDEKA ===
    case "teacherGetReports":
      return teacherGetReports(idToken, payload.class_id, payload.semester);
    case "teacherGenerateReport":
      return teacherGenerateReport(idToken, payload.class_id, payload.studentId, payload.semester, payload);
    case "teacherGetReportDetail":
      return teacherGetReportDetail(idToken, payload.class_id, payload.studentId, payload.semester);

    // === GURU: NOTIFIKASI ===
    case "teacherGetNotifications":
      return teacherGetNotifications(idToken);
    case "markNotificationAsRead":
      return markNotificationAsRead(idToken, payload.notificationId);

    // === SUPER ADMIN ENDPOINTS ===
    case "adminGetDashboard":
      return adminGetDashboard(idToken);
    case "adminGetPendingTeachers":
      return adminGetPendingTeachers(idToken);
    case "adminGetTeacherDetail":
      return adminGetTeacherDetail(idToken, payload.targetUserId);
    case "adminApproveTeacher":
      return adminApproveTeacher(idToken, payload.targetUserId, payload.note);
    case "adminRejectTeacher":
      return adminRejectTeacher(idToken, payload.targetUserId, payload.note);
    case "adminSuspendTeacher":
      return adminSuspendTeacher(idToken, payload.targetUserId, payload.note);
    case "adminReactivateTeacher":
      return adminReactivateTeacher(idToken, payload.targetUserId);
    case "adminGetTeachers":
      return adminGetTeachers(idToken, payload.filter);
    case "adminGetSchools":
      return adminGetSchools(idToken);
    case "adminCreateSchool":
      return adminCreateSchool(idToken, payload);
    case "adminVerifySchool":
      return adminVerifySchool(idToken, payload.schoolId, payload.status);
    case "adminCreateResource":
      return adminCreateResource(idToken, payload);
    case "adminDeleteResource":
      return adminDeleteResource(idToken, payload.resource_id);
    case "adminGetResources":
      return adminGetResources(idToken);
    case "adminPublishAnnouncement":
      return adminPublishAnnouncement(idToken, payload);
    case "adminGetSupportTickets":
      return adminGetSupportTickets(idToken);
    case "adminUpdateSupportTicket":
      return adminUpdateSupportTicket(idToken, payload.ticketId, payload);
    case "adminGetPlatformSettings":
      return adminGetPlatformSettings(idToken);
    case "adminUpdatePlatformSettings":
      return adminUpdatePlatformSettings(idToken, payload);
    case "adminGetAuditLogs":
      return adminGetAuditLogs(idToken, payload.limit);

    // === SISTEM & PEMELIHARAAN ===
    case "setupDatabase":
      return setupDatabase();
    case "getSystemStatus":
      return getSystemStatus();

    default:
      return createErrorResponse("UNKNOWN_ACTION", "Aksi '" + action + "' tidak dikenali oleh server API.");
  }
}

/**
 * Helper untuk menyertakan berkas HTML di GAS.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Status sistem dan pemeriksaan koneksi.
 */
function getSystemStatus() {
  return createSuccessResponse({
    version: CONFIG.VERSION,
    appName: CONFIG.APP_NAME,
    databaseConfigured: !!getSpreadsheetId(),
    firebaseConfigured: !!getFirebaseApiKey() && !!getFirebaseProjectId(),
    academicYear: CONFIG.DEFAULT_ACADEMIC_YEAR,
    serverTime: new Date().toISOString()
  }, "Status server API aktif");
}
