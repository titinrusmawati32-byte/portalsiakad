/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Utilities.gs
 * Deskripsi: Helper utility, standard response builder, hash generator, dan date formatter.
 */

/**
 * Membentuk respons sukses standar aplikasi.
 */
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

/**
 * Membentuk respons gagal standar aplikasi (tanpa membocorkan stack trace).
 */
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

/**
 * Menghasilkan UUID v4 unik.
 */
function generateUuid() {
  return Utilities.getUuid();
}

/**
 * Menghitung hash SHA-256 dari teks input (digunakan untuk validasi token QR).
 */
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

/**
 * Memformat tanggal ke string ISO YYYY-MM-DD.
 */
function formatDateIso(dateObj) {
  if (!dateObj) return "";
  var d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  var year = d.getFullYear();
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

/**
 * Memformat tanggal ke Bahasa Indonesia (Contoh: "9 November 2026").
 */
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

/**
 * Memformat waktu ke HH:mm WIB.
 */
function formatTimeIndo(dateObj) {
  if (!dateObj) return "";
  var d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  var hours = ("0" + d.getHours()).slice(-2);
  var minutes = ("0" + d.getMinutes()).slice(-2);
  return hours + ":" + minutes;
}

/**
 * Parsing JSON yang aman tanpa crash.
 */
function safeJsonParse(jsonString, fallback) {
  if (!jsonString) return fallback !== undefined ? fallback : {};
  if (typeof jsonString === "object") return jsonString;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return fallback !== undefined ? fallback : {};
  }
}

/**
 * Sanitasi string input dasar untuk mencegah injeksi berbahaya.
 */
function sanitizeString(str) {
  if (str === null || str === undefined) return "";
  var clean = String(str).trim();
  // Bersihkan karakter kontrol berbahaya
  return clean.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
}
