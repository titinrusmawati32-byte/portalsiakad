/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Config.gs
 * Deskripsi: Konfigurasi global, manajemen Script Properties, dan konstanta sistem.
 */

var CONFIG = {
  APP_NAME: "Portal Administrasi Guru SD",
  VERSION: "1.0.0",
  DEFAULT_REGION: "Kecamatan Ambulu, Kabupaten Jember",
  DEFAULT_ACADEMIC_YEAR: "2026/2027",
  DEFAULT_SEMESTER: "1",
  
  // Nama-nama Sheet Database
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

  // Peran Pengguna
  ROLES: {
    SUPER_ADMIN: "SUPER_ADMIN",
    TEACHER: "TEACHER"
  },

  // Status Akun Guru
  ACCOUNT_STATUS: {
    PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
    SUSPENDED: "SUSPENDED"
  },

  // Jenis Guru
  TEACHER_TYPES: {
    CLASS_TEACHER: "CLASS_TEACHER",
    SUBJECT_TEACHER: "SUBJECT_TEACHER"
  },

  // Status Kehadiran
  ATTENDANCE_STATUS: {
    PRESENT: "PRESENT",
    SICK: "SICK",
    PERMISSION: "PERMISSION",
    ABSENT: "ABSENT"
  },

  // Batas Waktu Default Sesi QR Presensi (Menit)
  QR_SESSION_DURATION_MINUTES: 30,

  // Lock Timeout (Milidetik)
  LOCK_TIMEOUT_MS: 20000
};

/**
 * Mengambil nilai konfigurasi dari Script Properties.
 * Jika tidak ditemukan, gunakan nilai fallback / default.
 */
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

/**
 * Menyimpan nilai ke Script Properties.
 */
function setScriptProperty(key, value) {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty(key, value);
}

/**
 * Mengambil ID Spreadsheet utama.
 */
function getSpreadsheetId() {
  var propId = getScriptProperty("SPREADSHEET_ID", "");
  if (propId) return propId;
  
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      return activeSs.getId();
    }
  } catch (e) {
    // Berjalan di standalone script tanpa active spreadsheet
  }
  return "";
}

/**
 * Mengambil Firebase Web API Key.
 */
function getFirebaseApiKey() {
  return getScriptProperty("FIREBASE_API_KEY", "");
}

/**
 * Mengambil Firebase Project ID.
 */
function getFirebaseProjectId() {
  return getScriptProperty("FIREBASE_PROJECT_ID", "");
}

/**
 * Mengambil Folder ID Google Drive untuk pustaka pusat.
 */
function getDriveResourceFolderId() {
  return getScriptProperty("DRIVE_RESOURCE_FOLDER_ID", "");
}

/**
 * Mengambil daftar email Super Admin awal.
 */
function getSuperAdminEmails() {
  var emailsStr = getScriptProperty("SUPER_ADMIN_EMAILS", "");
  if (!emailsStr) return [];
  return emailsStr.split(",").map(function(item) {
    return item.trim().toLowerCase();
  }).filter(function(item) {
    return item.length > 0;
  });
}
