/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Database.gs
 * Deskripsi: Mesin abstraksi Google Sheets, inisialisasi tabel, operasi CRUD batch, dan LockService.
 */

// Definisi Header Skema untuk 21 Tabel
var DATABASE_COLUMNS = {
  USERS: [
    "user_id", "email", "full_name", "photo_url", "phone", "nip", 
    "teacher_type", "school_id", "role", "account_status", 
    "created_at", "updated_at", "last_login"
  ],
  ADMIN_USERS: [
    "admin_id", "firebase_uid", "email", "admin_name", "role", 
    "status", "created_at", "updated_at"
  ],
  SCHOOLS: [
    "school_id", "npsn", "school_name", "jenjang", "kecamatan", 
    "kabupaten", "address", "verification_status", "created_at", "updated_at"
  ],
  SCHOOL_VERIFICATIONS: [
    "verification_id", "user_id", "school_id", "submitted_data", 
    "decision", "review_note", "reviewed_by", "reviewed_at", "created_at"
  ],
  CLASSES: [
    "class_id", "owner_user_id", "school_id", "class_name", "grade_level", 
    "academic_year", "semester", "class_type", "subject_id", "status", 
    "created_at", "updated_at"
  ],
  STUDENTS: [
    "student_id", "owner_user_id", "class_id", "nis", "nisn", 
    "full_name", "gender", "birth_date", "status", "created_at", "updated_at"
  ],
  SUBJECTS: [
    "subject_id", "subject_name", "grade_level", "status"
  ],
  SCHEDULES: [
    "schedule_id", "owner_user_id", "class_id", "subject_id", 
    "day_of_week", "start_time", "end_time", "room", "created_at", "updated_at"
  ],
  ATTENDANCE_SESSIONS: [
    "session_id", "owner_user_id", "class_id", "session_date", 
    "qr_token_hash", "expires_at", "status", "created_at"
  ],
  ATTENDANCE: [
    "attendance_id", "owner_user_id", "class_id", "session_id", 
    "student_id", "attendance_date", "status", "method", "recorded_at", "note"
  ],
  LEARNING_RESOURCES: [
    "resource_id", "owner_user_id", "resource_type", "title", "description", 
    "subject_id", "class_id", "grade_level", "semester", "academic_year", 
    "drive_url", "visibility", "status", "created_at", "updated_at"
  ],
  TEACHING_JOURNALS: [
    "journal_id", "owner_user_id", "class_id", "subject_id", "journal_date", 
    "topic", "learning_objective", "activities", "reflection", "notes", 
    "created_at", "updated_at"
  ],
  ASSESSMENTS: [
    "assessment_id", "owner_user_id", "class_id", "subject_id", "title", 
    "assessment_type", "assessment_date", "description", "status", "created_at"
  ],
  GRADES: [
    "grade_id", "owner_user_id", "class_id", "student_id", "assessment_id", 
    "score", "notes", "created_at", "updated_at"
  ],
  REPORTS: [
    "report_id", "owner_user_id", "class_id", "student_id", "academic_year", 
    "semester", "report_data", "file_id", "status", "created_at", "updated_at"
  ],
  NOTIFICATIONS: [
    "notification_id", "recipient_user_id", "title", "message", 
    "notification_type", "is_read", "created_at"
  ],
  ANNOUNCEMENTS: [
    "announcement_id", "title", "content", "audience", "publish_at", 
    "expires_at", "status", "created_by", "created_at"
  ],
  SUPPORT_TICKETS: [
    "ticket_id", "user_id", "subject", "description", "priority", 
    "status", "admin_note", "created_at", "updated_at"
  ],
  AUDIT_LOGS: [
    "log_id", "actor_user_id", "actor_role", "action", "entity_type", 
    "entity_id", "details", "timestamp"
  ],
  APP_SETTINGS: [
    "setting_key", "setting_value", "updated_by", "updated_at"
  ],
  SCHOOL_DOCUMENTS: [
    "document_id", "school_id", "document_name", "drive_file_id", 
    "drive_url", "document_type", "status", "created_at"
  ]
};

/**
 * Mendapatkan referensi Spreadsheet utama.
 */
function getDatabase() {
  var ssId = getSpreadsheetId();
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }
  var activeSs = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSs) {
    return activeSs;
  }
  throw new Error("Spreadsheet ID belum dikonfigurasi pada Script Properties (SPREADSHEET_ID).");
}

/**
 * Menginisialisasi 21 tabel database, header, dan konfigurasi dasar.
 * Aman dipanggil berulang kali tanpa merusak data yang sudah ada.
 */
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
      // Tulis baris header
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
      sheet.getRange(1, 1, 1, columns.length)
        .setFontWeight("bold")
        .setBackground("#142B4A")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
      createdCount++;
    } else {
      // Pastikan baris header sudah sesuai jika sheet masih kosong
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
        sheet.getRange(1, 1, 1, columns.length)
          .setFontWeight("bold")
          .setBackground("#142B4A")
          .setFontColor("#FFFFFF");
        sheet.setFrozenRows(1);
      }
      existingCount++;
    }
  }

  // Hapus sheet default "Sheet1" atau "Sheet 1" jika kosong dan ada sheet lain
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // Abaikan jika tidak diizinkan
    }
  }

  // Inisialisasi Data Dasar: Mata Pelajaran Standar SD
  seedInitialSubjects();

  // Inisialisasi Pengaturan Platform Default
  seedInitialSettings();

  // Inisialisasi Super Admin awal jika dikonfigurasi
  seedInitialSuperAdmin();

  // Inisialisasi Direktori Sekolah Wilayah Ambulu
  seedInitialSchools();

  Logger.log("Inisialisasi Database Selesai: " + createdCount + " sheet dibuat, " + existingCount + " sudah ada.");
  return {
    success: true,
    message: "Database berhasil diinisialisasi (" + createdCount + " baru, " + existingCount + " sudah ada)."
  };
}

/**
 * Mengisi daftar Mata Pelajaran SD standar jika sheet SUBJECTS masih kosong.
 */
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

/**
 * Mengisi pengaturan platform awal jika kosong.
 */
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

/**
 * Mengisi akun Super Admin pertama jika dikonfigurasi di Script Properties.
 */
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
      Logger.log("Super Admin didaftarkan: " + email);
    }
  }
}

/**
 * Mengisi sekolah perintis di Kecamatan Ambulu jika tabel kosong.
 */
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

/**
 * Membaca seluruh baris dari sebuah tabel sebagai daftar Objek.
 * Menggunakan batch read untuk efisiensi tinggi.
 */
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

/**
 * Menyisipkan baris baru ke dalam tabel dengan penguncian LockService.
 */
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

/**
 * Memperbarui baris berdasarkan Primary Key dengan LockService.
 */
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

/**
 * Menghapus baris berdasarkan Primary Key dengan LockService.
 */
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
