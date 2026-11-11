/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Schools.gs
 * Deskripsi: Manajemen direktori sekolah, keunikan NPSN, dan verifikasi sekolah.
 */

/**
 * Mengambil daftar sekolah terverifikasi (dapat diakses oleh publik/pendaftaran guru).
 */
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

/**
 * Super Admin: Mengambil seluruh direktori sekolah.
 */
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

/**
 * Super Admin: Menambahkan sekolah baru dengan validasi NPSN unik.
 */
function adminCreateSchool(idToken, schoolData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    if (!schoolData || !schoolData.npsn || !schoolData.school_name) {
      return createErrorResponse("VALIDATION_ERROR", "NPSN dan Nama Sekolah wajib diisi.");
    }

    var npsn = sanitizeString(schoolData.npsn);
    var existing = getTableRows(CONFIG.SHEETS.SCHOOLS);
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i].npsn) === npsn) {
        return createErrorResponse("DUPLICATE_NPSN", "Sekolah dengan NPSN " + npsn + " sudah terdaftar di sistem.");
      }
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
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "CREATE_SCHOOL", "SCHOOLS", schoolId, { npsn: npsn, name: newSchool.school_name });

    return createSuccessResponse(newSchool, "Sekolah berhasil ditambahkan");
  } catch (err) {
    return createErrorResponse("CREATE_SCHOOL_FAILED", err.message);
  }
}

/**
 * Super Admin: Memverifikasi status sekolah.
 */
function adminVerifySchool(idToken, schoolId, status) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var validStatus = ["VERIFIED", "PENDING", "REJECTED"];
    if (validStatus.indexOf(status) === -1) {
      return createErrorResponse("INVALID_STATUS", "Status verifikasi tidak valid.");
    }

    var nowIso = new Date().toISOString();
    var updated = updateTableRow(CONFIG.SHEETS.SCHOOLS, "school_id", schoolId, {
      verification_status: status,
      updated_at: nowIso
    });

    if (!updated) {
      return createErrorResponse("NOT_FOUND", "Data sekolah tidak ditemukan.");
    }

    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "VERIFY_SCHOOL", "SCHOOLS", schoolId, { status: status });
    return createSuccessResponse({ school_id: schoolId, status: status }, "Status verifikasi sekolah diperbarui");
  } catch (err) {
    return createErrorResponse("VERIFY_SCHOOL_FAILED", err.message);
  }
}
