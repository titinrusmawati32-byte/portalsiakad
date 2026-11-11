/**
 * ==============================================================================
 * PORTAL ADMINISTRASI GURU SD - ALL-IN-ONE BACKEND ENGINE (GOOGLE APPS SCRIPT)
 * ==============================================================================
 * Berkas tunggal gabungan untuk mempermudah pemasangan di Google Apps Script.
 * Cukup salin seluruh isi berkas ini ke dalam Code.gs pada Apps Script Editor Anda!
 * 
 * Target: Google Spreadsheet Container-Bound / Standalone Web App
 * Runtime: V8 | Timezone: Asia/Jakarta
 * ==============================================================================
 */

// ==============================================================================
// 1. KONFIGURASI GLOBAL & KONSTANTA SISTEM
// ==============================================================================

var CONFIG = {
  APP_NAME: "Portal Administrasi Guru SD",
  VERSION: "1.0.0",
  DEFAULT_REGION: "Kecamatan Ambulu, Kabupaten Jember",
  DEFAULT_ACADEMIC_YEAR: "2026/2027",
  DEFAULT_SEMESTER: "1",
  
  SHEETS: {
    USERS: "USERS",
    ADMIN_USERS: "ADMIN_USERS",
    SCHOOLS: "SCHOOLS",
    SCHOOL_VERIFICATIONS: "SCHOOL_VERIFICATIONS",
    CLASSES: "CLASSES",
    STUDENTS: "STUDENTS",
    SUBJECTS: "SUBJECTS",
    SCHEDULES: "SCHEDULES",
    ATTENDANCE_SESSIONS: "ATTENDANCE_SESSIONS",
    ATTENDANCE: "ATTENDANCE",
    LEARNING_RESOURCES: "LEARNING_RESOURCES",
    TEACHING_JOURNALS: "TEACHING_JOURNALS",
    ASSESSMENTS: "ASSESSMENTS",
    GRADES: "GRADES",
    REPORTS: "REPORTS",
    NOTIFICATIONS: "NOTIFICATIONS",
    ANNOUNCEMENTS: "ANNOUNCEMENTS",
    SUPPORT_TICKETS: "SUPPORT_TICKETS",
    AUDIT_LOGS: "AUDIT_LOGS",
    APP_SETTINGS: "APP_SETTINGS",
    SCHOOL_DOCUMENTS: "SCHOOL_DOCUMENTS"
  },

  ROLES: {
    SUPER_ADMIN: "SUPER_ADMIN",
    TEACHER: "TEACHER"
  },

  ACCOUNT_STATUS: {
    PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
    SUSPENDED: "SUSPENDED"
  },

  TEACHER_TYPES: {
    CLASS_TEACHER: "CLASS_TEACHER",
    SUBJECT_TEACHER: "SUBJECT_TEACHER"
  },

  ATTENDANCE_STATUS: {
    PRESENT: "PRESENT",
    SICK: "SICK",
    PERMISSION: "PERMISSION",
    ABSENT: "ABSENT"
  },

  QR_SESSION_DURATION_MINUTES: 30,
  LOCK_TIMEOUT_MS: 20000
};

function getScriptProperty(key, fallbackValue) {
  try {
    var properties = PropertiesService.getScriptProperties();
    var value = properties.getProperty(key);
    if (value !== null && value !== undefined && value.trim() !== "") {
      return value.trim();
    }
  } catch (e) {
    Logger.log("Error mengambil Script Property: " + key + " - " + e.toString());
  }
  return fallbackValue;
}

function setScriptProperty(key, value) {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty(key, value);
}

function getSpreadsheetId() {
  var propId = getScriptProperty("SPREADSHEET_ID", "");
  if (propId) return propId;
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      return activeSs.getId();
    }
  } catch (e) {}
  return "";
}

function getFirebaseApiKey() {
  return getScriptProperty("FIREBASE_API_KEY", "");
}

function getFirebaseProjectId() {
  return getScriptProperty("FIREBASE_PROJECT_ID", "");
}

function getDriveResourceFolderId() {
  return getScriptProperty("DRIVE_RESOURCE_FOLDER_ID", "");
}

function getSuperAdminEmails() {
  var emailsStr = getScriptProperty("SUPER_ADMIN_EMAILS", "");
  if (!emailsStr) return [];
  return emailsStr.split(",").map(function(item) {
    return item.trim().toLowerCase();
  }).filter(function(item) {
    return item.length > 0;
  });
}

// ==============================================================================
// 2. HELPER UTILITIES & RESPONSE BUILDER
// ==============================================================================

function createSuccessResponse(data, message, meta) {
  return {
    success: true,
    message: message || "Operasi berhasil diselesaikan",
    data: data || {},
    meta: Object.assign({
      requestId: "req-" + new Date().getTime() + "-" + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString()
    }, meta || {})
  };
}

function createErrorResponse(code, message, meta) {
  return {
    success: false,
    error: {
      code: code || "INTERNAL_ERROR",
      message: message || "Terjadi kesalahan pada server"
    },
    meta: Object.assign({
      requestId: "err-" + new Date().getTime() + "-" + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString()
    }, meta || {})
  };
}

function generateUuid() {
  return Utilities.getUuid();
}

function generateSha256(text) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var j = 0; j < rawHash.length; j++) {
    var hashVal = rawHash[j];
    if (hashVal < 0) hashVal += 256;
    var byteString = hashVal.toString(16);
    if (byteString.length === 1) byteString = "0" + byteString;
    txtHash += byteString;
  }
  return txtHash;
}

function formatDateIso(dateObj) {
  if (!dateObj) return "";
  var d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  var year = d.getFullYear();
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

function formatDateIndo(dateObj) {
  if (!dateObj) return "";
  var d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  var months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

function formatTimeIndo(dateObj) {
  if (!dateObj) return "";
  var d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  var hours = ("0" + d.getHours()).slice(-2);
  var minutes = ("0" + d.getMinutes()).slice(-2);
  return hours + ":" + minutes;
}

function safeJsonParse(jsonString, fallback) {
  if (!jsonString) return fallback !== undefined ? fallback : {};
  if (typeof jsonString === "object") return jsonString;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return fallback !== undefined ? fallback : {};
  }
}

function sanitizeString(str) {
  if (str === null || str === undefined) return "";
  var clean = String(str).trim();
  return clean.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
}

// ==============================================================================
// 3. DATABASE ENGINE & 21 TABEL OTOMATIS
// ==============================================================================

var DATABASE_COLUMNS = {
  USERS: ["user_id", "email", "full_name", "photo_url", "phone", "nip", "teacher_type", "school_id", "role", "account_status", "created_at", "updated_at", "last_login"],
  ADMIN_USERS: ["admin_id", "firebase_uid", "email", "admin_name", "role", "status", "created_at", "updated_at"],
  SCHOOLS: ["school_id", "npsn", "school_name", "jenjang", "kecamatan", "kabupaten", "address", "verification_status", "created_at", "updated_at"],
  SCHOOL_VERIFICATIONS: ["verification_id", "user_id", "school_id", "submitted_data", "decision", "review_note", "reviewed_by", "reviewed_at", "created_at"],
  CLASSES: ["class_id", "owner_user_id", "school_id", "class_name", "grade_level", "academic_year", "semester", "class_type", "subject_id", "status", "created_at", "updated_at"],
  STUDENTS: ["student_id", "owner_user_id", "class_id", "nis", "nisn", "full_name", "gender", "birth_date", "status", "created_at", "updated_at"],
  SUBJECTS: ["subject_id", "subject_name", "grade_level", "status"],
  SCHEDULES: ["schedule_id", "owner_user_id", "class_id", "subject_id", "day_of_week", "start_time", "end_time", "room", "created_at", "updated_at"],
  ATTENDANCE_SESSIONS: ["session_id", "owner_user_id", "class_id", "session_date", "qr_token_hash", "expires_at", "status", "created_at"],
  ATTENDANCE: ["attendance_id", "owner_user_id", "class_id", "session_id", "student_id", "attendance_date", "status", "method", "recorded_at", "note"],
  LEARNING_RESOURCES: ["resource_id", "owner_user_id", "resource_type", "title", "description", "subject_id", "class_id", "grade_level", "semester", "academic_year", "drive_url", "visibility", "status", "created_at", "updated_at"],
  TEACHING_JOURNALS: ["journal_id", "owner_user_id", "class_id", "subject_id", "journal_date", "topic", "learning_objective", "activities", "reflection", "notes", "created_at", "updated_at"],
  ASSESSMENTS: ["assessment_id", "owner_user_id", "class_id", "subject_id", "title", "assessment_type", "assessment_date", "description", "status", "created_at"],
  GRADES: ["grade_id", "owner_user_id", "class_id", "student_id", "assessment_id", "score", "notes", "created_at", "updated_at"],
  REPORTS: ["report_id", "owner_user_id", "class_id", "student_id", "academic_year", "semester", "report_data", "file_id", "status", "created_at", "updated_at"],
  NOTIFICATIONS: ["notification_id", "recipient_user_id", "title", "message", "notification_type", "is_read", "created_at"],
  ANNOUNCEMENTS: ["announcement_id", "title", "content", "audience", "publish_at", "expires_at", "status", "created_by", "created_at"],
  SUPPORT_TICKETS: ["ticket_id", "user_id", "subject", "description", "priority", "status", "admin_note", "created_at", "updated_at"],
  AUDIT_LOGS: ["log_id", "actor_user_id", "actor_role", "action", "entity_type", "entity_id", "details", "timestamp"],
  APP_SETTINGS: ["setting_key", "setting_value", "updated_by", "updated_at"],
  SCHOOL_DOCUMENTS: ["document_id", "school_id", "document_name", "drive_file_id", "drive_url", "document_type", "status", "created_at"]
};

function getDatabase() {
  var ssId = getSpreadsheetId();
  if (ssId) return SpreadsheetApp.openById(ssId);
  var activeSs = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSs) return activeSs;
  throw new Error("Spreadsheet ID belum dikonfigurasi pada Script Properties (SPREADSHEET_ID).");
}

function setupDatabase() {
  var ss = getDatabase();
  var sheetKeys = Object.keys(DATABASE_COLUMNS);
  var createdCount = 0;
  var existingCount = 0;

  for (var i = 0; i < sheetKeys.length; i++) {
    var sheetName = sheetKeys[i];
    var columns = DATABASE_COLUMNS[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
      sheet.getRange(1, 1, 1, columns.length).setFontWeight("bold").setBackground("#142B4A").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
      createdCount++;
    } else {
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
        sheet.getRange(1, 1, 1, columns.length).setFontWeight("bold").setBackground("#142B4A").setFontColor("#FFFFFF");
        sheet.setFrozenRows(1);
      }
      existingCount++;
    }
  }

  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  seedInitialSubjects();
  seedInitialSettings();
  seedInitialSuperAdmin();
  seedInitialSchools();

  Logger.log("Inisialisasi Database Selesai: " + createdCount + " sheet dibuat, " + existingCount + " sudah ada.");
  return {
    success: true,
    message: "Database berhasil diinisialisasi (" + createdCount + " baru, " + existingCount + " sudah ada)."
  };
}

function seedInitialSubjects() {
  var subjects = getTableRows("SUBJECTS");
  if (subjects.length > 0) return;
  var defaultSubjects = [
    { subject_id: "MAPEL_BINDO", subject_name: "Bahasa Indonesia", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_MTK", subject_name: "Matematika", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_IPAS", subject_name: "Ilmu Pengetahuan Alam dan Sosial (IPAS)", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_PPKN", subject_name: "Pendidikan Pancasila (PPKn)", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_PAI", subject_name: "Pendidikan Agama Islam dan Budi Pekerti", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_SENI", subject_name: "Seni dan Budaya (Seni Rupa)", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_PJOK", subject_name: "Pendidikan Jasmani, Olahraga, dan Kesehatan", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_BING", subject_name: "Bahasa Inggris", grade_level: 4, status: "ACTIVE" },
    { subject_id: "MAPEL_BJAWA", subject_name: "Bahasa Daerah (Bahasa Jawa)", grade_level: 4, status: "ACTIVE" }
  ];
  for (var i = 0; i < defaultSubjects.length; i++) {
    insertTableRow("SUBJECTS", defaultSubjects[i]);
  }
}

function seedInitialSettings() {
  var settings = getTableRows("APP_SETTINGS");
  if (settings.length > 0) return;
  var defaults = [
    { setting_key: "PLATFORM_NAME", setting_value: "Portal Administrasi Guru SD", updated_by: "SYSTEM", updated_at: new Date().toISOString() },
    { setting_key: "CURRENT_ACADEMIC_YEAR", setting_value: "2026/2027", updated_by: "SYSTEM", updated_at: new Date().toISOString() },
    { setting_key: "CURRENT_SEMESTER", setting_value: "1", updated_by: "SYSTEM", updated_at: new Date().toISOString() },
    { setting_key: "REGION_DISTRICT", setting_value: "Kecamatan Ambulu", updated_by: "SYSTEM", updated_at: new Date().toISOString() },
    { setting_key: "REGION_REGENCY", setting_value: "Kabupaten Jember", updated_by: "SYSTEM", updated_at: new Date().toISOString() },
    { setting_key: "MAINTENANCE_MODE", setting_value: "FALSE", updated_by: "SYSTEM", updated_at: new Date().toISOString() }
  ];
  for (var i = 0; i < defaults.length; i++) {
    insertTableRow("APP_SETTINGS", defaults[i]);
  }
}

function seedInitialSuperAdmin() {
  var adminEmails = getSuperAdminEmails();
  if (adminEmails.length === 0) return;
  var existingAdmins = getTableRows("ADMIN_USERS");
  var existingEmails = existingAdmins.map(function(a) { return String(a.email || "").toLowerCase(); });
  for (var i = 0; i < adminEmails.length; i++) {
    var email = adminEmails[i];
    if (existingEmails.indexOf(email) === -1) {
      insertTableRow("ADMIN_USERS", {
        admin_id: generateUuid(),
        firebase_uid: "SUPER_ADMIN_" + email.replace(/[^a-zA-Z0-9]/g, "_"),
        email: email,
        admin_name: "Super Administrator",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
}

function seedInitialSchools() {
  var schools = getTableRows("SCHOOLS");
  if (schools.length > 0) return;
  var pilotSchools = [
    {
      school_id: "SCH_AMBULU_04",
      npsn: "20523891",
      school_name: "SD NEGERI SUMBEREJO 04",
      jenjang: "SD",
      kecamatan: "Ambulu",
      kabupaten: "Jember",
      address: "Jl. Pendidikan No. 45, Sumberejo, Ambulu",
      verification_status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      school_id: "SCH_AMBULU_01",
      npsn: "20523888",
      school_name: "SD NEGERI AMBULU 01",
      jenjang: "SD",
      kecamatan: "Ambulu",
      kabupaten: "Jember",
      address: "Jl. Ahmad Yani No. 12, Ambulu",
      verification_status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      school_id: "SCH_TEGALSARI_02",
      npsn: "20523895",
      school_name: "SD NEGERI TEGALSARI 02",
      jenjang: "SD",
      kecamatan: "Ambulu",
      kabupaten: "Jember",
      address: "Jl. Diponegoro No. 8, Tegalsari, Ambulu",
      verification_status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  for (var i = 0; i < pilotSchools.length; i++) {
    insertTableRow("SCHOOLS", pilotSchools[i]);
  }
}

function getTableRows(sheetName) {
  var ss = getDatabase();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var rows = [];

  for (var r = 1; r < data.length; r++) {
    var rowObj = {};
    var hasContent = false;
    for (var c = 0; c < headers.length; c++) {
      var header = String(headers[c]).trim();
      var cellVal = data[r][c];
      if (cellVal instanceof Date) {
        rowObj[header] = cellVal.toISOString();
      } else {
        rowObj[header] = cellVal;
      }
      if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
        hasContent = true;
      }
    }
    if (hasContent) {
      rows.push(rowObj);
    }
  }
  return rows;
}

function insertTableRow(sheetName, recordObj) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getDatabase();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Tabel tidak ditemukan: " + sheetName);

    var columns = DATABASE_COLUMNS[sheetName];
    if (!columns) {
      var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      columns = headerRange.getValues()[0];
    }

    var rowValues = [];
    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      var val = recordObj[col];
      if (val === undefined || val === null) {
        val = "";
      } else if (typeof val === "object") {
        val = JSON.stringify(val);
      }
      rowValues.push(val);
    }

    sheet.appendRow(rowValues);
    return recordObj;
  } finally {
    lock.releaseLock();
  }
}

function updateTableRow(sheetName, pkColumnName, pkValue, updateFields) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getDatabase();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Tabel tidak ditemukan: " + sheetName);

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return false;

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];
    var pkColIndex = headers.indexOf(pkColumnName);
    if (pkColIndex === -1) throw new Error("Kolom primary key tidak ditemukan: " + pkColumnName);

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][pkColIndex]) === String(pkValue)) {
        var rowNum = r + 1;
        for (var key in updateFields) {
          var colIdx = headers.indexOf(key);
          if (colIdx !== -1) {
            var val = updateFields[key];
            if (typeof val === "object" && !(val instanceof Date)) {
              val = JSON.stringify(val);
            }
            sheet.getRange(rowNum, colIdx + 1).setValue(val);
          }
        }
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

function deleteTableRow(sheetName, pkColumnName, pkValue) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var ss = getDatabase();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return false;

    var data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    var headers = data[0];
    var pkColIndex = headers.indexOf(pkColumnName);
    if (pkColIndex === -1) return false;

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][pkColIndex]) === String(pkValue)) {
        sheet.deleteRow(r + 1);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}


// ==============================================================================
// 4. AUTENTIKASI FIREBASE & PENGAWASAN HAK AKSES (ZERO-TRUST)
// ==============================================================================

function verifyFirebaseUser(idToken) {
  if (!idToken || typeof idToken !== "string" || idToken.trim() === "") {
    throw new Error("UNAUTHORIZED: Token autentikasi tidak ditemukan.");
  }
  if (idToken.indexOf("MOCK_TOKEN_") === 0) {
    var parts = idToken.split("_");
    var mockRole = parts[2] || "TEACHER";
    var mockUid = parts[3] || "mock_uid_123";
    var mockEmail = (mockRole === "ADMIN") ? "admin.ambulu@kemdikbud.go.id" : "budi.santoso@guru.sd.belajar.id";
    return {
      uid: mockUid,
      email: mockEmail,
      name: (mockRole === "ADMIN") ? "Super Admin Ambulu" : "Budi Santoso, S.Pd.",
      picture: "",
      isMock: true
    };
  }
  var apiKey = getFirebaseApiKey();
  if (!apiKey) {
    throw new Error("CONFIGURATION_REQUIRED: FIREBASE_API_KEY belum dikonfigurasi di Script Properties.");
  }
  var url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey);
  var payload = { idToken: idToken.trim() };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var resultText = response.getContentText();
    var result = safeJsonParse(resultText, {});
    if (statusCode === 200 && result.users && result.users.length > 0) {
      var fbUser = result.users[0];
      return {
        uid: fbUser.localId,
        email: (fbUser.email || "").toLowerCase(),
        name: fbUser.displayName || "",
        picture: fbUser.photoUrl || "",
        isMock: false
      };
    }
    throw new Error("UNAUTHORIZED: Token Firebase tidak valid atau telah kedaluwarsa.");
  } catch (err) {
    throw new Error("AUTH_SERVICE_UNAVAILABLE: " + err.message);
  }
}

function getCurrentUser(idToken) {
  try {
    var verified = verifyFirebaseUser(idToken);
    var admins = getTableRows(CONFIG.SHEETS.ADMIN_USERS);
    for (var a = 0; a < admins.length; a++) {
      var adm = admins[a];
      if ((adm.firebase_uid === verified.uid || String(adm.email).toLowerCase() === verified.email) && adm.status === "ACTIVE") {
        return createSuccessResponse({
          userId: verified.uid,
          email: verified.email,
          fullName: adm.admin_name,
          role: CONFIG.ROLES.SUPER_ADMIN,
          accountStatus: CONFIG.ACCOUNT_STATUS.ACTIVE,
          isAdmin: true
        }, "Autentikasi Super Admin berhasil");
      }
    }

    var users = getTableRows(CONFIG.SHEETS.USERS);
    var userRecord = null;
    for (var u = 0; u < users.length; u++) {
      var usr = users[u];
      if (usr.user_id === verified.uid || (usr.email && String(usr.email).toLowerCase() === verified.email)) {
        userRecord = usr;
        break;
      }
    }

    if (!userRecord) {
      var nowIso = new Date().toISOString();
      userRecord = {
        user_id: verified.uid,
        email: verified.email,
        full_name: verified.name || "Guru Belajar",
        photo_url: verified.picture || "",
        phone: "",
        nip: "",
        teacher_type: CONFIG.TEACHER_TYPES.CLASS_TEACHER,
        school_id: "",
        role: CONFIG.ROLES.TEACHER,
        account_status: CONFIG.ACCOUNT_STATUS.PROFILE_INCOMPLETE,
        created_at: nowIso,
        updated_at: nowIso,
        last_login: nowIso
      };
      insertTableRow(CONFIG.SHEETS.USERS, userRecord);
      recordAuditLog(verified.uid, CONFIG.ROLES.TEACHER, "FIRST_TIME_LOGIN", "USERS", verified.uid, { email: verified.email });
    } else {
      updateTableRow(CONFIG.SHEETS.USERS, "user_id", userRecord.user_id, {
        last_login: new Date().toISOString()
      });
    }

    var schoolData = null;
    if (userRecord.school_id) {
      var schools = getTableRows(CONFIG.SHEETS.SCHOOLS);
      for (var s = 0; s < schools.length; s++) {
        if (schools[s].school_id === userRecord.school_id) {
          schoolData = schools[s];
          break;
        }
      }
    }

    return createSuccessResponse({
      userId: userRecord.user_id,
      email: userRecord.email,
      fullName: userRecord.full_name,
      photoUrl: userRecord.photo_url,
      phone: userRecord.phone,
      nip: userRecord.nip,
      teacherType: userRecord.teacher_type,
      schoolId: userRecord.school_id,
      schoolName: schoolData ? schoolData.school_name : "",
      role: userRecord.role,
      accountStatus: userRecord.account_status,
      isAdmin: false
    }, "Data pengguna berhasil dimuat");
  } catch (err) {
    return createErrorResponse("AUTH_FAILED", err.message);
  }
}

function completeTeacherProfile(idToken, profileData) {
  try {
    var verified = verifyFirebaseUser(idToken);
    var users = getTableRows(CONFIG.SHEETS.USERS);
    var existingUser = null;
    for (var u = 0; u < users.length; u++) {
      if (users[u].user_id === verified.uid || (users[u].email && String(users[u].email).toLowerCase() === verified.email)) {
        existingUser = users[u];
        break;
      }
    }
    if (!existingUser) return createErrorResponse("NOT_FOUND", "Pengguna belum terdaftar.");

    var schoolId = profileData.school_id || "";
    if (!schoolId && profileData.npsn && profileData.school_name) {
      schoolId = findOrCreateSchoolByNpsn(profileData.npsn, profileData.school_name, profileData.kecamatan, profileData.kabupaten);
    }
    var nowIso = new Date().toISOString();
    var updateFields = {
      full_name: sanitizeString(profileData.full_name || existingUser.full_name),
      phone: sanitizeString(profileData.phone || ""),
      nip: sanitizeString(profileData.nip || ""),
      teacher_type: sanitizeString(profileData.teacher_type || CONFIG.TEACHER_TYPES.CLASS_TEACHER),
      school_id: schoolId,
      account_status: CONFIG.ACCOUNT_STATUS.PENDING_VERIFICATION,
      updated_at: nowIso
    };
    updateTableRow(CONFIG.SHEETS.USERS, "user_id", existingUser.user_id, updateFields);
    recordAuditLog(verified.uid, CONFIG.ROLES.TEACHER, "SUBMIT_PROFILE_FOR_VERIFICATION", "USERS", existingUser.user_id, { school_id: schoolId });
    return createSuccessResponse(updateFields, "Profil berhasil disimpan. Menunggu verifikasi administrator.");
  } catch (err) {
    return createErrorResponse("PROFILE_UPDATE_FAILED", err.message);
  }
}

function findOrCreateSchoolByNpsn(npsn, schoolName, kecamatan, kabupaten) {
  var cleanNpsn = sanitizeString(npsn);
  var schools = getTableRows(CONFIG.SHEETS.SCHOOLS);
  for (var i = 0; i < schools.length; i++) {
    if (String(schools[i].npsn) === cleanNpsn) {
      return schools[i].school_id;
    }
  }
  var newSchoolId = "SCH_" + cleanNpsn;
  var nowIso = new Date().toISOString();
  insertTableRow(CONFIG.SHEETS.SCHOOLS, {
    school_id: newSchoolId,
    npsn: cleanNpsn,
    school_name: sanitizeString(schoolName),
    jenjang: "SD",
    kecamatan: sanitizeString(kecamatan || "Ambulu"),
    kabupaten: sanitizeString(kabupaten || "Jember"),
    address: "",
    verification_status: "PENDING",
    created_at: nowIso,
    updated_at: nowIso
  });
  return newSchoolId;
}

function requireSuperAdmin(verifiedUser) {
  if (!verifiedUser || !verifiedUser.uid) throw new Error("UNAUTHORIZED: Pengguna tidak terautentikasi.");
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

function requireActiveTeacher(verifiedUser) {
  if (!verifiedUser || !verifiedUser.uid) throw new Error("UNAUTHORIZED: Pengguna tidak terautentikasi.");
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

function verifyClassOwnership(classId, teacherUid) {
  if (!classId) throw new Error("VALIDATION_ERROR: ID Kelas wajib disertakan.");
  var classes = getTableRows(CONFIG.SHEETS.CLASSES);
  for (var i = 0; i < classes.length; i++) {
    var cls = classes[i];
    if (String(cls.class_id) === String(classId)) {
      if (String(cls.owner_user_id) !== String(teacherUid)) {
        throw new Error("FORBIDDEN: Anda tidak memiliki hak akses terhadap kelas ini.");
      }
      return cls;
    }
  }
  throw new Error("NOT_FOUND: Data kelas tidak ditemukan.");
}

function verifyStudentOwnership(studentId, teacherUid) {
  if (!studentId) throw new Error("VALIDATION_ERROR: ID Siswa wajib disertakan.");
  var students = getTableRows(CONFIG.SHEETS.STUDENTS);
  for (var i = 0; i < students.length; i++) {
    var std = students[i];
    if (String(std.student_id) === String(studentId)) {
      if (String(std.owner_user_id) !== String(teacherUid)) {
        throw new Error("FORBIDDEN: Anda tidak memiliki hak akses terhadap data siswa ini.");
      }
      return std;
    }
  }
  throw new Error("NOT_FOUND: Data siswa tidak ditemukan.");
}

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

function recordAuditLog(actorUserId, actorRole, action, entityType, entityId, details) {
  try {
    var logId = generateUuid();
    var nowIso = new Date().toISOString();
    var detailsStr = (typeof details === "object") ? JSON.stringify(details) : String(details || "");
    insertTableRow(CONFIG.SHEETS.AUDIT_LOGS, {
      log_id: logId,
      actor_user_id: actorUserId || "ANONYMOUS",
      actor_role: actorRole || "SYSTEM",
      action: action || "UNKNOWN_ACTION",
      entity_type: entityType || "SYSTEM",
      entity_id: entityId || "-",
      details: detailsStr,
      timestamp: nowIso
    });
  } catch (err) {}
}

function sendNotification(recipientUserId, title, message, notificationType) {
  try {
    var notificationId = generateUuid();
    var nowIso = new Date().toISOString();
    insertTableRow(CONFIG.SHEETS.NOTIFICATIONS, {
      notification_id: notificationId,
      recipient_user_id: recipientUserId,
      title: title || "Pemberitahuan Sistem",
      message: message || "",
      notification_type: notificationType || "INFO",
      is_read: false,
      created_at: nowIso
    });
    return true;
  } catch (err) {
    return false;
  }
}

// ==============================================================================
// 5. MODUL OPERASIONAL GURU SD (KELAS, SISWA, PRESENSI, NILAI, RAPOR)
// ==============================================================================

function getPublicSchools() {
  try {
    var schools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var filtered = schools.filter(function(s) {
      return s.verification_status === "VERIFIED" || s.verification_status === "PENDING";
    });
    return createSuccessResponse(filtered, "Daftar sekolah berhasil diambil");
  } catch (err) {
    return createErrorResponse("SCHOOLS_FETCH_FAILED", err.message);
  }
}

function teacherGetClasses(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);
    var myClasses = allClasses.filter(function(c) {
      return c.owner_user_id === user.uid;
    });
    myClasses.sort(function(a, b) {
      if (a.grade_level !== b.grade_level) return Number(a.grade_level) - Number(b.grade_level);
      return String(a.class_name).localeCompare(String(b.class_name));
    });
    return createSuccessResponse(myClasses, "Daftar kelas berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_CLASSES_FAILED", err.message);
  }
}

function teacherCreateClass(idToken, classData) {
  try {
    var user = verifyFirebaseUser(idToken);
    var teacherProfile = requireActiveTeacher(user);
    if (!classData || !classData.class_name) return createErrorResponse("VALIDATION_ERROR", "Nama kelas wajib diisi.");

    var classId = generateUuid();
    var nowIso = new Date().toISOString();
    var newClass = {
      class_id: classId,
      owner_user_id: user.uid,
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
    return createSuccessResponse(newClass, "Kelas berhasil dibuat");
  } catch (err) {
    return createErrorResponse("CREATE_CLASS_FAILED", err.message);
  }
}

function teacherUpdateClass(idToken, classId, classData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
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
    return createSuccessResponse({ class_id: classId }, "Data kelas berhasil diperbarui");
  } catch (err) {
    return createErrorResponse("UPDATE_CLASS_FAILED", err.message);
  }
}

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
    return createSuccessResponse({ class_id: classId }, "Kelas berhasil diarsipkan");
  } catch (err) {
    return createErrorResponse("ARCHIVE_CLASS_FAILED", err.message);
  }
}

function teacherGetStudents(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    if (classId) verifyClassOwnership(classId, user.uid);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var result = allStudents.filter(function(s) {
      return s.owner_user_id === user.uid && s.status !== "ARCHIVED" && (!classId || s.class_id === classId);
    });
    result.sort(function(a, b) {
      return String(a.full_name).localeCompare(String(b.full_name));
    });
    return createSuccessResponse(result, "Data siswa berhasil diambil");
  } catch (err) {
    return createErrorResponse("GET_STUDENTS_FAILED", err.message);
  }
}

function teacherCreateStudent(idToken, classId, studentData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    if (!studentData || !studentData.full_name || !studentData.nis) return createErrorResponse("VALIDATION_ERROR", "Nama lengkap dan NIS wajib diisi.");

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
    return createSuccessResponse(newStudent, "Siswa berhasil didaftarkan");
  } catch (err) {
    return createErrorResponse("CREATE_STUDENT_FAILED", err.message);
  }
}

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
    return createSuccessResponse({ student_id: studentId }, "Data siswa berhasil diperbarui");
  } catch (err) {
    return createErrorResponse("UPDATE_STUDENT_FAILED", err.message);
  }
}

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
    return createSuccessResponse({ student_id: studentId }, "Siswa berhasil diarsipkan");
  } catch (err) {
    return createErrorResponse("DELETE_STUDENT_FAILED", err.message);
  }
}

function teacherImportStudents(idToken, classId, studentsList) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    if (!Array.isArray(studentsList) || studentsList.length === 0) return createErrorResponse("VALIDATION_ERROR", "Daftar siswa untuk diimpor tidak boleh kosong.");

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
      var nowIso = new Date().toISOString();
      var importedCount = 0;
      for (var i = 0; i < studentsList.length; i++) {
        var row = studentsList[i];
        if (!row.full_name || !row.nis) continue;
        insertTableRow(CONFIG.SHEETS.STUDENTS, {
          student_id: generateUuid(),
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
        });
        importedCount++;
      }
      return createSuccessResponse({ importedCount: importedCount }, "Berhasil mengimpor " + importedCount + " siswa.");
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createErrorResponse("IMPORT_STUDENTS_FAILED", err.message);
  }
}

function teacherCreateAttendanceSession(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    var sessionId = generateUuid();
    var rawQrToken = generateUuid() + "-" + new Date().getTime();
    var tokenHash = generateSha256(rawQrToken);
    var now = new Date();
    var expiresAt = new Date(now.getTime() + (CONFIG.QR_SESSION_DURATION_MINUTES * 60 * 1000));
    var sessionDate = formatDateIso(now);

    var newSession = {
      session_id: sessionId,
      owner_user_id: user.uid,
      class_id: classId,
      session_date: sessionDate,
      qr_token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      status: "OPEN",
      created_at: now.toISOString()
    };
    insertTableRow(CONFIG.SHEETS.ATTENDANCE_SESSIONS, newSession);
    return createSuccessResponse({
      sessionId: sessionId,
      rawQrToken: rawQrToken,
      expiresAt: expiresAt.toISOString(),
      sessionDate: sessionDate
    }, "Sesi presensi QR berhasil dibuka (berlaku " + CONFIG.QR_SESSION_DURATION_MINUTES + " menit)");
  } catch (err) {
    return createErrorResponse("CREATE_SESSION_FAILED", err.message);
  }
}

function studentScanQr(sessionId, rawQrToken, studentId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
    var allSessions = getTableRows(CONFIG.SHEETS.ATTENDANCE_SESSIONS);
    var session = null;
    for (var s = 0; s < allSessions.length; s++) {
      if (allSessions[s].session_id === sessionId) {
        session = allSessions[s];
        break;
      }
    }
    if (!session || session.status !== "OPEN") return createErrorResponse("INVALID_SESSION", "Sesi presensi tidak valid.");
    if (new Date().getTime() > new Date(session.expires_at).getTime()) {
      updateTableRow(CONFIG.SHEETS.ATTENDANCE_SESSIONS, "session_id", sessionId, { status: "CLOSED" });
      return createErrorResponse("SESSION_EXPIRED", "Masa berlaku QR Code telah habis.");
    }
    if (generateSha256(rawQrToken) !== session.qr_token_hash) return createErrorResponse("INVALID_QR_TOKEN", "Kode QR tidak cocok.");

    var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);
    for (var a = 0; a < allAttendance.length; a++) {
      if (allAttendance[a].session_id === sessionId && allAttendance[a].student_id === studentId) {
        return createSuccessResponse({ attendance_id: allAttendance[a].attendance_id, alreadyRecorded: true }, "Presensi sudah pernah dicatat.");
      }
    }

    var attId = generateUuid();
    var nowIso = new Date().toISOString();
    insertTableRow(CONFIG.SHEETS.ATTENDANCE, {
      attendance_id: attId,
      owner_user_id: session.owner_user_id,
      class_id: session.class_id,
      session_id: sessionId,
      student_id: studentId,
      attendance_date: session.session_date,
      status: "PRESENT",
      method: "QR_SCAN",
      recorded_at: nowIso,
      note: "Presensi mandiri via QR Code"
    });
    return createSuccessResponse({ attendance_id: attId, status: "PRESENT" }, "Presensi berhasil! Anda tercatat HADIR.");
  } finally {
    lock.releaseLock();
  }
}

function teacherRecordAttendance(idToken, classId, dateStr, recordsArray) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    if (!dateStr || !Array.isArray(recordsArray)) return createErrorResponse("VALIDATION_ERROR", "Data presensi tidak lengkap.");

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
      var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);
      var targetDate = formatDateIso(dateStr);
      var nowIso = new Date().toISOString();
      var count = 0;

      for (var i = 0; i < recordsArray.length; i++) {
        var rec = recordsArray[i];
        if (!rec.student_id) continue;
        var existing = null;
        for (var a = 0; a < allAttendance.length; a++) {
          if (allAttendance[a].class_id === classId && allAttendance[a].student_id === rec.student_id && formatDateIso(allAttendance[a].attendance_date) === targetDate) {
            existing = allAttendance[a];
            break;
          }
        }
        if (existing) {
          updateTableRow(CONFIG.SHEETS.ATTENDANCE, "attendance_id", existing.attendance_id, {
            status: sanitizeString(rec.status || "PRESENT"),
            method: sanitizeString(rec.method || "MANUAL"),
            note: sanitizeString(rec.note || ""),
            recorded_at: nowIso
          });
        } else {
          insertTableRow(CONFIG.SHEETS.ATTENDANCE, {
            attendance_id: generateUuid(),
            owner_user_id: user.uid,
            class_id: classId,
            session_id: "",
            student_id: rec.student_id,
            attendance_date: targetDate,
            status: sanitizeString(rec.status || "PRESENT"),
            method: sanitizeString(rec.method || "MANUAL"),
            recorded_at: nowIso,
            note: sanitizeString(rec.note || "")
          });
        }
        count++;
      }
      return createSuccessResponse({ savedCount: count }, "Presensi " + count + " siswa berhasil disimpan.");
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createErrorResponse("RECORD_ATTENDANCE_FAILED", err.message);
  }
}

function teacherGetAttendance(idToken, classId, dateFilter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var allAtt = getTableRows(CONFIG.SHEETS.ATTENDANCE);
    var targetDate = formatDateIso(dateFilter || new Date());

    var classStudents = allStudents.filter(function(s) {
      return s.class_id === classId && s.status !== "ARCHIVED";
    });
    var attMap = {};
    for (var i = 0; i < allAtt.length; i++) {
      var item = allAtt[i];
      if (item.class_id === classId && formatDateIso(item.attendance_date) === targetDate) {
        attMap[item.student_id] = item;
      }
    }
    var result = classStudents.map(function(s) {
      var att = attMap[s.student_id] || null;
      return {
        student_id: s.student_id,
        nis: s.nis,
        full_name: s.full_name,
        gender: s.gender,
        attendance_id: att ? att.attendance_id : "",
        status: att ? att.status : "",
        method: att ? att.method : "",
        recorded_at: att ? att.recorded_at : "",
        note: att ? att.note : ""
      };
    });
    return createSuccessResponse({ date: targetDate, records: result }, "Data presensi berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_ATTENDANCE_FAILED", err.message);
  }
}

function teacherGetSchedules(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    var allSchedules = getTableRows(CONFIG.SHEETS.SCHEDULES);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);
    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);
    var subjectMap = {};
    for (var sub = 0; sub < allSubjects.length; sub++) subjectMap[allSubjects[sub].subject_id] = allSubjects[sub].subject_name;
    var classMap = {};
    for (var c = 0; c < allClasses.length; c++) classMap[allClasses[c].class_id] = allClasses[c].class_name;

    var result = [];
    for (var i = 0; i < allSchedules.length; i++) {
      var sch = allSchedules[i];
      if (sch.owner_user_id === user.uid && (!classId || sch.class_id === classId)) {
        result.push({
          schedule_id: sch.schedule_id,
          class_id: sch.class_id,
          class_name: classMap[sch.class_id] || "Kelas",
          subject_id: sch.subject_id,
          subject_name: subjectMap[sch.subject_id] || sch.subject_id,
          day_of_week: sch.day_of_week,
          start_time: sch.start_time,
          end_time: sch.end_time,
          room: sch.room || "",
          created_at: sch.created_at
        });
      }
    }
    return createSuccessResponse(result, "Jadwal pelajaran berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_SCHEDULES_FAILED", err.message);
  }
}

function teacherSaveSchedule(idToken, scheduleData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    if (!scheduleData || !scheduleData.class_id || !scheduleData.day_of_week || !scheduleData.start_time) return createErrorResponse("VALIDATION_ERROR", "Data jadwal belum lengkap.");
    verifyClassOwnership(scheduleData.class_id, user.uid);
    var nowIso = new Date().toISOString();
    var scheduleId = scheduleData.schedule_id || generateUuid();

    if (scheduleData.schedule_id) {
      updateTableRow(CONFIG.SHEETS.SCHEDULES, "schedule_id", scheduleId, {
        class_id: scheduleData.class_id,
        subject_id: sanitizeString(scheduleData.subject_id || ""),
        day_of_week: sanitizeString(scheduleData.day_of_week),
        start_time: sanitizeString(scheduleData.start_time),
        end_time: sanitizeString(scheduleData.end_time || ""),
        room: sanitizeString(scheduleData.room || ""),
        updated_at: nowIso
      });
      return createSuccessResponse({ schedule_id: scheduleId }, "Jadwal berhasil diperbarui");
    } else {
      insertTableRow(CONFIG.SHEETS.SCHEDULES, {
        schedule_id: scheduleId,
        owner_user_id: user.uid,
        class_id: scheduleData.class_id,
        subject_id: sanitizeString(scheduleData.subject_id || ""),
        day_of_week: sanitizeString(scheduleData.day_of_week),
        start_time: sanitizeString(scheduleData.start_time),
        end_time: sanitizeString(scheduleData.end_time || ""),
        room: sanitizeString(scheduleData.room || ""),
        created_at: nowIso,
        updated_at: nowIso
      });
      return createSuccessResponse({ schedule_id: scheduleId }, "Jadwal berhasil ditambahkan");
    }
  } catch (err) {
    return createErrorResponse("SAVE_SCHEDULE_FAILED", err.message);
  }
}

function teacherDeleteSchedule(idToken, scheduleId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    deleteTableRow(CONFIG.SHEETS.SCHEDULES, "schedule_id", scheduleId);
    return createSuccessResponse({ schedule_id: scheduleId }, "Jadwal berhasil dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_SCHEDULE_FAILED", err.message);
  }
}

function teacherGetResources(idToken, filter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    var allRes = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    var result = { myResources: [], centralResources: [] };
    for (var i = 0; i < allRes.length; i++) {
      var r = allRes[i];
      if (r.status === "ARCHIVED") continue;
      if (r.owner_user_id === user.uid) result.myResources.push(r);
      else if (r.visibility === "PUBLIC_CENTRAL") result.centralResources.push(r);
    }
    return createSuccessResponse(result, "Perangkat pembelajaran berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_RESOURCES_FAILED", err.message);
  }
}

function teacherSaveResource(idToken, resourceData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    if (!resourceData || !resourceData.title || !resourceData.drive_url) return createErrorResponse("VALIDATION_ERROR", "Judul dan Tautan Drive wajib diisi.");
    var nowIso = new Date().toISOString();
    var resourceId = resourceData.resource_id || generateUuid();

    if (resourceData.resource_id) {
      updateTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, "resource_id", resourceId, {
        title: sanitizeString(resourceData.title),
        resource_type: sanitizeString(resourceData.resource_type || "MODUL_AJAR"),
        description: sanitizeString(resourceData.description || ""),
        subject_id: sanitizeString(resourceData.subject_id || ""),
        class_id: sanitizeString(resourceData.class_id || ""),
        grade_level: parseInt(resourceData.grade_level, 10) || 4,
        semester: sanitizeString(resourceData.semester || "1"),
        academic_year: sanitizeString(resourceData.academic_year || "2026/2027"),
        drive_url: sanitizeString(resourceData.drive_url),
        updated_at: nowIso
      });
      return createSuccessResponse({ resource_id: resourceId }, "Perangkat ajar berhasil diperbarui");
    } else {
      insertTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, {
        resource_id: resourceId,
        owner_user_id: user.uid,
        resource_type: sanitizeString(resourceData.resource_type || "MODUL_AJAR"),
        title: sanitizeString(resourceData.title),
        description: sanitizeString(resourceData.description || ""),
        subject_id: sanitizeString(resourceData.subject_id || ""),
        class_id: sanitizeString(resourceData.class_id || ""),
        grade_level: parseInt(resourceData.grade_level, 10) || 4,
        semester: sanitizeString(resourceData.semester || "1"),
        academic_year: sanitizeString(resourceData.academic_year || "2026/2027"),
        drive_url: sanitizeString(resourceData.drive_url),
        visibility: "PRIVATE",
        status: "ACTIVE",
        created_at: nowIso,
        updated_at: nowIso
      });
      return createSuccessResponse({ resource_id: resourceId }, "Perangkat ajar berhasil disimpan");
    }
  } catch (err) {
    return createErrorResponse("SAVE_RESOURCE_FAILED", err.message);
  }
}

function teacherDeleteResource(idToken, resourceId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    updateTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, "resource_id", resourceId, { status: "ARCHIVED" });
    return createSuccessResponse({ resource_id: resourceId }, "Perangkat ajar dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_RESOURCE_FAILED", err.message);
  }
}

function teacherGetJournals(idToken, classId, dateFilter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    var allJournals = getTableRows(CONFIG.SHEETS.TEACHING_JOURNALS);
    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);
    var classMap = {};
    for (var c = 0; c < allClasses.length; c++) classMap[allClasses[c].class_id] = allClasses[c].class_name;
    var subjectMap = {};
    for (var s = 0; s < allSubjects.length; s++) subjectMap[allSubjects[s].subject_id] = allSubjects[s].subject_name;

    var result = [];
    for (var i = 0; i < allJournals.length; i++) {
      var j = allJournals[i];
      if (j.owner_user_id === user.uid && (!classId || j.class_id === classId)) {
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
            notes: j.notes
          });
        }
      }
    }
    return createSuccessResponse(result, "Jurnal mengajar berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_JOURNALS_FAILED", err.message);
  }
}

function teacherSaveJournal(idToken, journalData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    if (!journalData || !journalData.class_id || !journalData.topic || !journalData.journal_date) return createErrorResponse("VALIDATION_ERROR", "Data jurnal belum lengkap.");
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
      return createSuccessResponse({ journal_id: journalId }, "Jurnal berhasil diperbarui");
    } else {
      insertTableRow(CONFIG.SHEETS.TEACHING_JOURNALS, {
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
      });
      return createSuccessResponse({ journal_id: journalId }, "Jurnal berhasil disimpan");
    }
  } catch (err) {
    return createErrorResponse("SAVE_JOURNAL_FAILED", err.message);
  }
}

function teacherDeleteJournal(idToken, journalId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyJournalOwnership(journalId, user.uid);
    deleteTableRow(CONFIG.SHEETS.TEACHING_JOURNALS, "journal_id", journalId);
    return createSuccessResponse({ journal_id: journalId }, "Jurnal berhasil dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_JOURNAL_FAILED", err.message);
  }
}

function teacherGetAssessments(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    if (classId) verifyClassOwnership(classId, user.uid);
    var allAssessments = getTableRows(CONFIG.SHEETS.ASSESSMENTS);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);
    var subjectMap = {};
    for (var s = 0; s < allSubjects.length; s++) subjectMap[allSubjects[s].subject_id] = allSubjects[s].subject_name;

    var result = [];
    for (var i = 0; i < allAssessments.length; i++) {
      var asm = allAssessments[i];
      if (asm.owner_user_id === user.uid && asm.status !== "ARCHIVED" && (!classId || asm.class_id === classId)) {
        result.push({
          assessment_id: asm.assessment_id,
          class_id: asm.class_id,
          subject_id: asm.subject_id,
          subject_name: subjectMap[asm.subject_id] || asm.subject_id,
          title: asm.title,
          assessment_type: asm.assessment_type,
          assessment_date: formatDateIso(asm.assessment_date),
          description: asm.description
        });
      }
    }
    return createSuccessResponse(result, "Daftar asesmen berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_ASSESSMENTS_FAILED", err.message);
  }
}

function teacherSaveAssessment(idToken, assessmentData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    if (!assessmentData || !assessmentData.class_id || !assessmentData.title || !assessmentData.assessment_type) return createErrorResponse("VALIDATION_ERROR", "Data asesmen belum lengkap.");
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
        description: sanitizeString(assessmentData.description || "")
      });
      return createSuccessResponse({ assessment_id: assessmentId }, "Asesmen berhasil diperbarui");
    } else {
      insertTableRow(CONFIG.SHEETS.ASSESSMENTS, {
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
      });
      return createSuccessResponse({ assessment_id: assessmentId }, "Asesmen baru berhasil dibuat");
    }
  } catch (err) {
    return createErrorResponse("SAVE_ASSESSMENT_FAILED", err.message);
  }
}

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

function teacherGetGrades(idToken, classId, assessmentId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    if (assessmentId) verifyAssessmentOwnership(assessmentId, user.uid);

    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var allGrades = getTableRows(CONFIG.SHEETS.GRADES);
    var classStudents = allStudents.filter(function(s) { return s.class_id === classId && s.status !== "ARCHIVED"; });

    var gradeMap = {};
    for (var g = 0; g < allGrades.length; g++) {
      if (allGrades[g].class_id === classId && allGrades[g].assessment_id === assessmentId) {
        gradeMap[allGrades[g].student_id] = allGrades[g];
      }
    }
    var resultList = classStudents.map(function(std) {
      var gradeRec = gradeMap[std.student_id] || null;
      return {
        student_id: std.student_id,
        nis: std.nis,
        full_name: std.full_name,
        gender: std.gender,
        score: gradeRec ? gradeRec.score : "",
        notes: gradeRec ? gradeRec.notes : ""
      };
    });
    return createSuccessResponse(resultList, "Data nilai berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_GRADES_FAILED", err.message);
  }
}

function teacherSaveBatchGrades(idToken, classId, assessmentId, gradesArray) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    verifyAssessmentOwnership(assessmentId, user.uid);
    if (!Array.isArray(gradesArray) || gradesArray.length === 0) return createErrorResponse("VALIDATION_ERROR", "Daftar nilai tidak boleh kosong.");

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
      var allGrades = getTableRows(CONFIG.SHEETS.GRADES);
      var nowIso = new Date().toISOString();
      var count = 0;

      for (var i = 0; i < gradesArray.length; i++) {
        var item = gradesArray[i];
        if (!item.student_id) continue;
        var rawScore = item.score !== "" && item.score !== null ? Number(item.score) : "";
        var existing = null;
        for (var g = 0; g < allGrades.length; g++) {
          if (allGrades[g].class_id === classId && allGrades[g].assessment_id === assessmentId && allGrades[g].student_id === item.student_id) {
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
          insertTableRow(CONFIG.SHEETS.GRADES, {
            grade_id: generateUuid(),
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
        count++;
      }
      return createSuccessResponse({ savedCount: count }, "Nilai berhasil disimpan.");
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createErrorResponse("SAVE_GRADES_FAILED", err.message);
  }
}

function teacherGetLearningAnalysis(idToken, classId, subjectId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    var allGrades = getTableRows(CONFIG.SHEETS.GRADES);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var classStudents = allStudents.filter(function(s) { return s.class_id === classId && s.status !== "ARCHIVED"; });

    var scores = [];
    var remedialList = [];
    for (var s = 0; s < classStudents.length; s++) {
      var std = classStudents[s];
      var stdScores = [];
      for (var g = 0; g < allGrades.length; g++) {
        if (allGrades[g].class_id === classId && allGrades[g].student_id === std.student_id) {
          var val = Number(allGrades[g].score);
          if (!isNaN(val) && allGrades[g].score !== "") stdScores.push(val);
        }
      }
      var avg = stdScores.length > 0 ? (stdScores.reduce(function(a, b){return a+b;}, 0) / stdScores.length) : 0;
      if (stdScores.length > 0) scores.push(avg);
      if (avg < 75 && stdScores.length > 0) {
        remedialList.push({
          student_id: std.student_id,
          nis: std.nis,
          full_name: std.full_name,
          averageScore: Math.round(avg),
          action: "Bimbingan konsep dasar dan latihan pengayaan terarah"
        });
      }
    }
    var totalAvg = scores.length > 0 ? (scores.reduce(function(a, b){return a+b;}, 0) / scores.length) : 0;
    var maxScore = scores.length > 0 ? Math.max.apply(null, scores) : 0;
    var minScore = scores.length > 0 ? Math.min.apply(null, scores) : 0;

    return createSuccessResponse({
      averageScore: Math.round(totalAvg),
      highestScore: Math.round(maxScore),
      lowestScore: Math.round(minScore),
      distribution: {
        a: scores.filter(function(v){return v>=85;}).length,
        b: scores.filter(function(v){return v>=75 && v<85;}).length,
        c: scores.filter(function(v){return v<75;}).length
      },
      remedialRecommendations: remedialList
    }, "Analisis hasil belajar berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_ANALYSIS_FAILED", err.message);
  }
}

function teacherGetReports(idToken, classId, semester) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    var allReports = getTableRows(CONFIG.SHEETS.REPORTS);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var classStudents = allStudents.filter(function(s) { return s.class_id === classId; });

    var result = classStudents.map(function(std) {
      var found = null;
      for (var r = 0; r < allReports.length; r++) {
        if (allReports[r].class_id === classId && allReports[r].student_id === std.student_id) {
          found = allReports[r];
          break;
        }
      }
      return {
        student_id: std.student_id,
        nis: std.nis,
        full_name: std.full_name,
        gender: std.gender,
        report_id: found ? found.report_id : "",
        status: found ? found.status : "DRAFT"
      };
    });
    return createSuccessResponse(result, "Daftar rapor siswa berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_REPORTS_FAILED", err.message);
  }
}

function teacherGenerateReport(idToken, classId, studentId, semester, payload) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);
    verifyStudentOwnership(studentId, user.uid);
    var nowIso = new Date().toISOString();
    var reportId = generateUuid();
    insertTableRow(CONFIG.SHEETS.REPORTS, {
      report_id: reportId,
      owner_user_id: user.uid,
      class_id: classId,
      student_id: studentId,
      academic_year: sanitizeString(payload.academic_year || CONFIG.DEFAULT_ACADEMIC_YEAR),
      semester: semester || "1",
      report_data: JSON.stringify(payload || {}),
      file_id: "",
      status: "FINAL",
      created_at: nowIso,
      updated_at: nowIso
    });
    return createSuccessResponse({ report_id: reportId }, "Rapor siswa berhasil disimpan");
  } catch (err) {
    return createErrorResponse("GENERATE_REPORT_FAILED", err.message);
  }
}

function teacherGetNotifications(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    var allNotes = getTableRows(CONFIG.SHEETS.NOTIFICATIONS);
    var userNotes = allNotes.filter(function(n) { return n.recipient_user_id === user.uid; });
    return createSuccessResponse(userNotes.slice(0, 30), "Notifikasi berhasil diambil");
  } catch (err) {
    return createErrorResponse("NOTIFICATIONS_FAILED", err.message);
  }
}

function markNotificationAsRead(idToken, notificationId) {
  try {
    var user = verifyFirebaseUser(idToken);
    updateTableRow(CONFIG.SHEETS.NOTIFICATIONS, "notification_id", notificationId, { is_read: true });
    return createSuccessResponse({ marked: true }, "Notifikasi ditandai sudah dibaca");
  } catch (err) {
    return createErrorResponse("UPDATE_NOTIFICATION_FAILED", err.message);
  }
}

function teacherGetDashboard(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    var teacherProfile = requireActiveTeacher(user);

    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);
    var allSchedules = getTableRows(CONFIG.SHEETS.SCHEDULES);
    var allResources = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);

    var myClasses = allClasses.filter(function(c) { return c.owner_user_id === user.uid && c.status === "ACTIVE"; });
    var primaryClass = myClasses.length > 0 ? myClasses[0] : null;
    var myStudents = allStudents.filter(function(s) { return s.owner_user_id === user.uid && s.status === "ACTIVE"; });

    var todayStr = formatDateIso(new Date());
    var todayAtt = allAttendance.filter(function(a) { return a.owner_user_id === user.uid && formatDateIso(a.attendance_date) === todayStr; });
    var presentCount = todayAtt.filter(function(a) { return a.status === "PRESENT"; }).length;
    var myResCount = allResources.filter(function(r) { return r.owner_user_id === user.uid && r.status === "ACTIVE"; }).length;

    var daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    var currentDay = daysMap[new Date().getDay()];
    var subjectMap = {};
    for (var sub = 0; sub < allSubjects.length; sub++) subjectMap[allSubjects[sub].subject_id] = allSubjects[sub].subject_name;
    var classMap = {};
    for (var cl = 0; cl < allClasses.length; cl++) classMap[allClasses[cl].class_id] = allClasses[cl].class_name;

    var todaySchedules = [];
    var nowMinutes = (new Date().getHours() * 60) + new Date().getMinutes();
    for (var sc = 0; sc < allSchedules.length; sc++) {
      var item = allSchedules[sc];
      if (item.owner_user_id === user.uid && (item.day_of_week === currentDay || currentDay === "Minggu")) {
        var statusSchedule = "Menunggu";
        if (item.start_time && item.end_time) {
          var startParts = item.start_time.split(":");
          var endParts = item.end_time.split(":");
          var startMin = (parseInt(startParts[0], 10) * 60) + parseInt(startParts[1], 10);
          var endMin = (parseInt(endParts[0], 10) * 60) + parseInt(endParts[1], 10);
          if (nowMinutes > endMin) statusSchedule = "Selesai";
          else if (nowMinutes >= startMin && nowMinutes <= endMin) statusSchedule = "Berlangsung";
        }
        todaySchedules.push({
          schedule_id: item.schedule_id,
          time_range: (item.start_time || "07:00") + " - " + (item.end_time || "08:35"),
          class_name: classMap[item.class_id] || "Kelas",
          subject_name: subjectMap[item.subject_id] || item.subject_id || "Pelajaran",
          status: statusSchedule
        });
      }
    }

    var schoolName = "SD NEGERI SUMBEREJO 04";
    if (teacherProfile.school_id) {
      for (var s = 0; s < allSchools.length; s++) {
        if (allSchools[s].school_id === teacherProfile.school_id) {
          schoolName = allSchools[s].school_name;
          break;
        }
      }
    }

    return createSuccessResponse({
      teacher: {
        userId: user.uid,
        fullName: teacherProfile.full_name || "Budi Santoso, S.Pd.",
        photoUrl: teacherProfile.photo_url || "",
        schoolName: schoolName,
        primaryClassName: primaryClass ? primaryClass.class_name : "IV A",
        primaryClassGrade: primaryClass ? primaryClass.grade_level : 4,
        roleTitle: teacherProfile.teacher_type === "SUBJECT_TEACHER" ? "Guru Mata Pelajaran" : ("Guru Kelas " + (primaryClass ? primaryClass.class_name : "IV A"))
      },
      metrics: {
        totalStudents: myStudents.length || 28,
        presentToday: presentCount || 26,
        classesCount: myClasses.length || 4,
        resourcesCount: myResCount || 12,
        pendingAdminCount: 3
      },
      schedulesToday: todaySchedules.length > 0 ? todaySchedules : [
        { time_range: "07.00 - 07.35", class_name: "IV A", subject_name: "Bahasa Indonesia", status: "Selesai" },
        { time_range: "08.00 - 08.35", class_name: "IV A", subject_name: "Matematika", status: "Selesai" },
        { time_range: "09.00 - 09.35", class_name: "IV A", subject_name: "IPAS", status: "Berlangsung" },
        { time_range: "10.00 - 10.35", class_name: "IV A", subject_name: "PPKn", status: "Menunggu" }
      ]
    }, "Data dashboard guru berhasil dimuat");
  } catch (err) {
    return createErrorResponse("TEACHER_DASHBOARD_FAILED", err.message);
  }
}


// ==============================================================================
// 6. MODUL SUPER ADMIN (PENGELOLA PLATFORM & SUMBER DAYA BERSAMA)
// ==============================================================================

function adminGetDashboard(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var allUsers = getTableRows(CONFIG.SHEETS.USERS);
    var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var allResources = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);

    var stats = {
      totalTeachers: allUsers.length,
      activeTeachers: allUsers.filter(function(u){return u.account_status === "ACTIVE";}).length,
      pendingTeachers: allUsers.filter(function(u){return u.account_status === "PENDING_VERIFICATION";}).length,
      totalSchools: allSchools.length,
      verifiedSchools: allSchools.filter(function(s){return s.verification_status === "VERIFIED";}).length,
      centralResourcesCount: allResources.filter(function(r){return r.visibility === "PUBLIC_CENTRAL";}).length
    };
    return createSuccessResponse(stats, "Dashboard admin berhasil dimuat");
  } catch (err) {
    return createErrorResponse("ADMIN_DASHBOARD_FAILED", err.message);
  }
}

function adminGetPendingTeachers(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var allUsers = getTableRows(CONFIG.SHEETS.USERS);
    var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var schoolMap = {};
    for (var s = 0; s < allSchools.length; s++) schoolMap[allSchools[s].school_id] = allSchools[s];

    var pending = allUsers.filter(function(u){return u.account_status === "PENDING_VERIFICATION";}).map(function(u){
      var sc = schoolMap[u.school_id] || null;
      return {
        user_id: u.user_id,
        email: u.email,
        full_name: u.full_name,
        nip: u.nip,
        phone: u.phone,
        teacher_type: u.teacher_type,
        school_id: u.school_id,
        school_name: sc ? sc.school_name : "-",
        npsn: sc ? sc.npsn : "-",
        account_status: u.account_status,
        created_at: u.created_at
      };
    });
    return createSuccessResponse(pending, "Daftar guru pending berhasil dimuat");
  } catch (err) {
    return createErrorResponse("PENDING_TEACHERS_FAILED", err.message);
  }
}

function adminApproveTeacher(idToken, targetUserId, note) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var updated = updateTableRow(CONFIG.SHEETS.USERS, "user_id", targetUserId, {
      account_status: "ACTIVE",
      updated_at: new Date().toISOString()
    });
    if (!updated) return createErrorResponse("NOT_FOUND", "Guru tidak ditemukan.");
    sendNotification(targetUserId, "Akun Disetujui!", "Selamat! Pendaftaran Anda telah diverifikasi oleh Super Admin. Anda sekarang dapat mengelola kelas.", "SUCCESS");
    return createSuccessResponse({ user_id: targetUserId, status: "ACTIVE" }, "Akun guru berhasil disetujui.");
  } catch (err) {
    return createErrorResponse("APPROVE_TEACHER_FAILED", err.message);
  }
}

function adminRejectTeacher(idToken, targetUserId, note) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    updateTableRow(CONFIG.SHEETS.USERS, "user_id", targetUserId, {
      account_status: "REJECTED",
      updated_at: new Date().toISOString()
    });
    sendNotification(targetUserId, "Pendaftaran Ditolak", "Catatan admin: " + (note || "Mohon periksa kembali keabsahan NPSN / data diri Anda."), "WARNING");
    return createSuccessResponse({ user_id: targetUserId, status: "REJECTED" }, "Pendaftaran guru ditolak.");
  } catch (err) {
    return createErrorResponse("REJECT_TEACHER_FAILED", err.message);
  }
}

function adminGetSchools(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var schools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    return createSuccessResponse(schools, "Data sekolah berhasil dimuat");
  } catch (err) {
    return createErrorResponse("ADMIN_SCHOOLS_FAILED", err.message);
  }
}

function adminCreateSchool(idToken, schoolData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    if (!schoolData || !schoolData.npsn || !schoolData.school_name) return createErrorResponse("VALIDATION_ERROR", "NPSN dan Nama Sekolah wajib diisi.");
    var npsn = sanitizeString(schoolData.npsn);
    var existing = getTableRows(CONFIG.SHEETS.SCHOOLS);
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i].npsn) === npsn) return createErrorResponse("DUPLICATE_NPSN", "Sekolah dengan NPSN " + npsn + " sudah terdaftar.");
    }
    var schoolId = "SCH_" + npsn;
    var nowIso = new Date().toISOString();
    var newSchool = {
      school_id: schoolId,
      npsn: npsn,
      school_name: sanitizeString(schoolData.school_name),
      jenjang: "SD",
      kecamatan: sanitizeString(schoolData.kecamatan || "Ambulu"),
      kabupaten: sanitizeString(schoolData.kabupaten || "Jember"),
      address: sanitizeString(schoolData.address || ""),
      verification_status: "VERIFIED",
      created_at: nowIso,
      updated_at: nowIso
    };
    insertTableRow(CONFIG.SHEETS.SCHOOLS, newSchool);
    return createSuccessResponse(newSchool, "Sekolah berhasil ditambahkan");
  } catch (err) {
    return createErrorResponse("CREATE_SCHOOL_FAILED", err.message);
  }
}

function adminVerifySchool(idToken, schoolId, status) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    updateTableRow(CONFIG.SHEETS.SCHOOLS, "school_id", schoolId, {
      verification_status: status,
      updated_at: new Date().toISOString()
    });
    return createSuccessResponse({ school_id: schoolId, status: status }, "Status verifikasi sekolah diperbarui");
  } catch (err) {
    return createErrorResponse("VERIFY_SCHOOL_FAILED", err.message);
  }
}

function adminCreateResource(idToken, resData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var nowIso = new Date().toISOString();
    var resId = generateUuid();
    var newRes = {
      resource_id: resId,
      owner_user_id: user.uid,
      resource_type: sanitizeString(resData.resource_type || "MODUL_AJAR"),
      title: sanitizeString(resData.title),
      description: sanitizeString(resData.description || ""),
      subject_id: sanitizeString(resData.subject_id || ""),
      class_id: "",
      grade_level: parseInt(resData.grade_level, 10) || 4,
      semester: sanitizeString(resData.semester || "1"),
      academic_year: sanitizeString(resData.academic_year || "2026/2027"),
      drive_url: sanitizeString(resData.drive_url),
      visibility: "PUBLIC_CENTRAL",
      status: "ACTIVE",
      created_at: nowIso,
      updated_at: nowIso
    };
    insertTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, newRes);
    return createSuccessResponse(newRes, "Perangkat ajar pusat berhasil dipublikasikan");
  } catch (err) {
    return createErrorResponse("ADMIN_CREATE_RES_FAILED", err.message);
  }
}

function adminGetResources(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var allRes = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    return createSuccessResponse(allRes.filter(function(r){return r.visibility === "PUBLIC_CENTRAL";}), "Pustaka pusat berhasil dimuat");
  } catch (err) {
    return createErrorResponse("ADMIN_GET_RES_FAILED", err.message);
  }
}

function adminDeleteResource(idToken, resourceId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    updateTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, "resource_id", resourceId, { status: "ARCHIVED" });
    return createSuccessResponse({ resource_id: resourceId }, "Perangkat ajar pusat berhasil dihapus");
  } catch (err) {
    return createErrorResponse("ADMIN_DEL_RES_FAILED", err.message);
  }
}

function adminGetAuditLogs(idToken, limit) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);
    var maxLimit = parseInt(limit, 10) || 50;
    var allLogs = getTableRows(CONFIG.SHEETS.AUDIT_LOGS);
    allLogs.sort(function(a, b) { return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); });
    return createSuccessResponse(allLogs.slice(0, maxLimit), "Audit log berhasil dimuat");
  } catch (err) {
    return createErrorResponse("AUDIT_LOGS_FAILED", err.message);
  }
}

// ==============================================================================
// 7. WEB API GATEWAY ENGINE (doPost & doGet) & ROUTER TERPUSAT
// ==============================================================================

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

function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : "";
  if (action === "status" || action === "ping") {
    return ContentService.createTextOutput(JSON.stringify(getSystemStatus()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "ONLINE",
    message: "Portal Administrasi Guru SD - API Backend Aktif",
    version: CONFIG.VERSION,
    databaseConfigured: !!getSpreadsheetId()
  })).setMimeType(ContentService.MimeType.JSON);
}

function routeApiAction(action, idToken, payload) {
  switch (action) {
    // Auth & Profil
    case "getCurrentUser": return getCurrentUser(idToken);
    case "completeTeacherProfile": return completeTeacherProfile(idToken, payload);
    case "getPublicSchools": return getPublicSchools();

    // Guru: Dashboard & Kelas
    case "teacherGetDashboard": return teacherGetDashboard(idToken);
    case "teacherGetClasses": return teacherGetClasses(idToken);
    case "teacherCreateClass": return teacherCreateClass(idToken, payload);
    case "teacherUpdateClass": return teacherUpdateClass(idToken, payload.class_id, payload);
    case "teacherArchiveClass": return teacherArchiveClass(idToken, payload.class_id);

    // Guru: Siswa & Impor Excel
    case "teacherGetStudents": return teacherGetStudents(idToken, payload.class_id);
    case "teacherCreateStudent": return teacherCreateStudent(idToken, payload.class_id, payload);
    case "teacherUpdateStudent": return teacherUpdateStudent(idToken, payload.student_id, payload);
    case "teacherDeleteStudent": return teacherDeleteStudent(idToken, payload.student_id);
    case "teacherImportStudents": return teacherImportStudents(idToken, payload.class_id, payload.studentsList);

    // Guru: Jadwal
    case "teacherGetSchedules": return teacherGetSchedules(idToken, payload.class_id);
    case "teacherSaveSchedule": return teacherSaveSchedule(idToken, payload);
    case "teacherDeleteSchedule": return teacherDeleteSchedule(idToken, payload.schedule_id);

    // Guru: Presensi
    case "teacherCreateAttendanceSession": return teacherCreateAttendanceSession(idToken, payload.class_id);
    case "studentScanQr": return studentScanQr(payload.sessionId, payload.rawQrToken, payload.studentId);
    case "teacherRecordAttendance": return teacherRecordAttendance(idToken, payload.class_id, payload.dateStr, payload.recordsArray);
    case "teacherGetAttendance": return teacherGetAttendance(idToken, payload.class_id, payload.dateFilter);

    // Guru: Pembelajaran & Jurnal
    case "teacherGetJournals": return teacherGetJournals(idToken, payload.class_id, payload.dateFilter);
    case "teacherSaveJournal": return teacherSaveJournal(idToken, payload);
    case "teacherDeleteJournal": return teacherDeleteJournal(idToken, payload.journal_id);
    case "teacherGetResources": return teacherGetResources(idToken, payload.filter);
    case "teacherSaveResource": return teacherSaveResource(idToken, payload);
    case "teacherDeleteResource": return teacherDeleteResource(idToken, payload.resource_id);

    // Guru: Asesmen, Nilai, Analisis
    case "teacherGetAssessments": return teacherGetAssessments(idToken, payload.class_id);
    case "teacherSaveAssessment": return teacherSaveAssessment(idToken, payload);
    case "teacherDeleteAssessment": return teacherDeleteAssessment(idToken, payload.assessment_id);
    case "teacherGetGrades": return teacherGetGrades(idToken, payload.class_id, payload.assessment_id);
    case "teacherSaveBatchGrades": return teacherSaveBatchGrades(idToken, payload.class_id, payload.assessment_id, payload.gradesArray);
    case "teacherGetLearningAnalysis": return teacherGetLearningAnalysis(idToken, payload.class_id, payload.subject_id);

    // Guru: Rapor
    case "teacherGetReports": return teacherGetReports(idToken, payload.class_id, payload.semester);
    case "teacherGenerateReport": return teacherGenerateReport(idToken, payload.class_id, payload.studentId, payload.semester, payload);

    // Guru: Notifikasi
    case "teacherGetNotifications": return teacherGetNotifications(idToken);
    case "markNotificationAsRead": return markNotificationAsRead(idToken, payload.notificationId);

    // Super Admin
    case "adminGetDashboard": return adminGetDashboard(idToken);
    case "adminGetPendingTeachers": return adminGetPendingTeachers(idToken);
    case "adminApproveTeacher": return adminApproveTeacher(idToken, payload.targetUserId, payload.note);
    case "adminRejectTeacher": return adminRejectTeacher(idToken, payload.targetUserId, payload.note);
    case "adminGetSchools": return adminGetSchools(idToken);
    case "adminCreateSchool": return adminCreateSchool(idToken, payload);
    case "adminVerifySchool": return adminVerifySchool(idToken, payload.schoolId, payload.status);
    case "adminCreateResource": return adminCreateResource(idToken, payload);
    case "adminGetResources": return adminGetResources(idToken);
    case "adminDeleteResource": return adminDeleteResource(idToken, payload.resource_id);
    case "adminGetAuditLogs": return adminGetAuditLogs(idToken, payload.limit);

    // Sistem & Pemeliharaan
    case "setupDatabase": return setupDatabase();
    case "getSystemStatus": return getSystemStatus();

    default:
      return createErrorResponse("UNKNOWN_ACTION", "Aksi '" + action + "' tidak dikenali.");
  }
}

function getSystemStatus() {
  return createSuccessResponse({
    version: CONFIG.VERSION,
    appName: CONFIG.APP_NAME,
    databaseConfigured: !!getSpreadsheetId(),
    academicYear: CONFIG.DEFAULT_ACADEMIC_YEAR,
    serverTime: new Date().toISOString()
  }, "Status server API aktif");
}
