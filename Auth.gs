/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Auth.gs
 * Deskripsi: Verifikasi Firebase Authentication token, manajemen status akun, dan registrasi profil guru.
 */

/**
 * Memvalidasi Firebase ID Token ke endpoint resmi Firebase Identity Toolkit.
 * Mengembalikan objek identitas terverifikasi { uid, email, name, photoUrl }.
 */
function verifyFirebaseUser(idToken) {
  if (!idToken || typeof idToken !== "string" || idToken.trim() === "") {
    throw new Error("UNAUTHORIZED: Token autentikasi tidak ditemukan.");
  }

  // Dukungan Mode Preview / Pengujian Lokal Terkendali
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
    // Jika API Key belum disetel di Script Properties, berikan pesan panduan yang jelas
    throw new Error("CONFIGURATION_REQUIRED: FIREBASE_API_KEY belum dikonfigurasi di Script Properties.");
  }

  var url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey);
  var payload = {
    idToken: idToken.trim()
  };

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
        emailVerified: fbUser.emailVerified === true,
        isMock: false
      };
    } else {
      var errMsg = (result.error && result.error.message) ? result.error.message : "Token tidak valid";
      throw new Error("INVALID_TOKEN: " + errMsg);
    }
  } catch (e) {
    throw new Error("AUTH_VERIFICATION_FAILED: " + e.message);
  }
}

/**
 * Mengambil status dan identitas akun dari Firebase ID Token.
 */
function getCurrentUser(idToken) {
  try {
    var verified = verifyFirebaseUser(idToken);
    var nowIso = new Date().toISOString();

    // 1. Periksa apakah terdaftar di tabel ADMIN_USERS (Otorisasi Server-Side Mutlak)
    var adminRows = getTableRows(CONFIG.SHEETS.ADMIN_USERS);
    for (var a = 0; a < adminRows.length; a++) {
      var adm = adminRows[a];
      var matchesUid = (adm.firebase_uid === verified.uid);
      var matchesEmail = (adm.email && String(adm.email).toLowerCase() === verified.email);

      if ((matchesUid || matchesEmail) && adm.status === "ACTIVE") {
        // Update UID jika sebelumnya hanya tersimpan via email
        if (!adm.firebase_uid || adm.firebase_uid !== verified.uid) {
          updateTableRow(CONFIG.SHEETS.ADMIN_USERS, "admin_id", adm.admin_id, {
            firebase_uid: verified.uid,
            updated_at: nowIso
          });
        }

        recordAuditLog(verified.uid, CONFIG.ROLES.SUPER_ADMIN, "LOGIN", "ADMIN_USERS", adm.admin_id, { email: verified.email });

        return createSuccessResponse({
          role: CONFIG.ROLES.SUPER_ADMIN,
          accountStatus: "ACTIVE",
          user: {
            admin_id: adm.admin_id,
            email: adm.email,
            admin_name: adm.admin_name,
            role: CONFIG.ROLES.SUPER_ADMIN
          }
        }, "Autentikasi Super Admin berhasil");
      }
    }

    // 2. Periksa apakah terdaftar di tabel USERS (Guru)
    var userRows = getTableRows(CONFIG.SHEETS.USERS);
    var existingTeacher = null;
    for (var u = 0; u < userRows.length; u++) {
      if (userRows[u].user_id === verified.uid || (userRows[u].email && userRows[u].email.toLowerCase() === verified.email)) {
        existingTeacher = userRows[u];
        break;
      }
    }

    if (existingTeacher) {
      // Sinkronkan UID jika ada perubahan
      if (existingTeacher.user_id !== verified.uid) {
        updateTableRow(CONFIG.SHEETS.USERS, "email", verified.email, {
          user_id: verified.uid,
          updated_at: nowIso
        });
        existingTeacher.user_id = verified.uid;
      }

      // Catat last_login jika akun aktif
      if (existingTeacher.account_status === CONFIG.ACCOUNT_STATUS.ACTIVE) {
        updateTableRow(CONFIG.SHEETS.USERS, "user_id", verified.uid, {
          last_login: nowIso
        });
        recordAuditLog(verified.uid, CONFIG.ROLES.TEACHER, "LOGIN", "USERS", verified.uid, { email: verified.email });
      }

      // Ambil data sekolah terkait jika ada
      var schoolInfo = null;
      if (existingTeacher.school_id) {
        var schools = getTableRows(CONFIG.SHEETS.SCHOOLS);
        for (var s = 0; s < schools.length; s++) {
          if (schools[s].school_id === existingTeacher.school_id) {
            schoolInfo = schools[s];
            break;
          }
        }
      }

      return createSuccessResponse({
        role: CONFIG.ROLES.TEACHER,
        accountStatus: existingTeacher.account_status,
        user: existingTeacher,
        school: schoolInfo
      }, "Profil pengguna ditemukan");
    }

    // 3. Pengguna baru: Buat entri awal PROFILE_INCOMPLETE
    var newUserRecord = {
      user_id: verified.uid,
      email: verified.email,
      full_name: verified.name || "Guru Baru",
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

    insertTableRow(CONFIG.SHEETS.USERS, newUserRecord);
    recordAuditLog(verified.uid, CONFIG.ROLES.TEACHER, "REGISTER_INITIATED", "USERS", verified.uid, { email: verified.email });

    return createSuccessResponse({
      role: CONFIG.ROLES.TEACHER,
      accountStatus: CONFIG.ACCOUNT_STATUS.PROFILE_INCOMPLETE,
      user: newUserRecord,
      school: null
    }, "Akun baru berhasil diinisialisasi, silakan lengkapi profil");

  } catch (err) {
    return createErrorResponse("AUTH_FAILED", err.message);
  }
}

/**
 * Melengkapi profil pendaftaran guru baru.
 * Mengubah status akun menjadi PENDING_VERIFICATION.
 */
function completeTeacherProfile(idToken, profilePayload) {
  try {
    var verified = verifyFirebaseUser(idToken);
    var nowIso = new Date().toISOString();

    if (!profilePayload || typeof profilePayload !== "object") {
      return createErrorResponse("INVALID_PAYLOAD", "Data profil tidak valid.");
    }

    var fullName = sanitizeString(profilePayload.full_name || verified.name);
    var nip = sanitizeString(profilePayload.nip || "");
    var phone = sanitizeString(profilePayload.phone || "");
    var teacherType = profilePayload.teacher_type === CONFIG.TEACHER_TYPES.SUBJECT_TEACHER 
      ? CONFIG.TEACHER_TYPES.SUBJECT_TEACHER 
      : CONFIG.TEACHER_TYPES.CLASS_TEACHER;
    var npsn = sanitizeString(profilePayload.npsn || "");
    var schoolName = sanitizeString(profilePayload.school_name || "");
    var kecamatan = sanitizeString(profilePayload.kecamatan || "Ambulu");
    var kabupaten = sanitizeString(profilePayload.kabupaten || "Jember");

    if (!fullName) {
      return createErrorResponse("VALIDATION_ERROR", "Nama lengkap wajib diisi.");
    }
    if (!npsn || !schoolName) {
      return createErrorResponse("VALIDATION_ERROR", "NPSN dan Nama Sekolah wajib diisi.");
    }

    // Cari atau buat referensi sekolah
    var schoolId = "";
    var schools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    for (var s = 0; s < schools.length; s++) {
      if (String(schools[s].npsn) === String(npsn)) {
        schoolId = schools[s].school_id;
        break;
      }
    }

    if (!schoolId) {
      schoolId = "SCH_" + npsn;
      insertTableRow(CONFIG.SHEETS.SCHOOLS, {
        school_id: schoolId,
        npsn: npsn,
        school_name: schoolName,
        jenjang: "SD",
        kecamatan: kecamatan,
        kabupaten: kabupaten,
        address: sanitizeString(profilePayload.school_address || ""),
        verification_status: "PENDING",
        created_at: nowIso,
        updated_at: nowIso
      });
    }

    // Perbarui profil guru menjadi PENDING_VERIFICATION
    var updated = updateTableRow(CONFIG.SHEETS.USERS, "user_id", verified.uid, {
      full_name: fullName,
      phone: phone,
      nip: nip,
      teacher_type: teacherType,
      school_id: schoolId,
      account_status: CONFIG.ACCOUNT_STATUS.PENDING_VERIFICATION,
      updated_at: nowIso
    });

    if (!updated) {
      return createErrorResponse("NOT_FOUND", "Data guru tidak ditemukan untuk diperbarui.");
    }

    // Catat pengajuan verifikasi ke SCHOOL_VERIFICATIONS
    var verificationId = generateUuid();
    insertTableRow(CONFIG.SHEETS.SCHOOL_VERIFICATIONS, {
      verification_id: verificationId,
      user_id: verified.uid,
      school_id: schoolId,
      submitted_data: JSON.stringify(profilePayload),
      decision: "PENDING",
      review_note: "Menunggu peninjauan Super Admin",
      reviewed_by: "",
      reviewed_at: "",
      created_at: nowIso
    });

    // Kirim notifikasi sistem
    sendNotification(verified.uid, "Pendaftaran Diajukan", "Profil Anda telah diserahkan dan sedang menunggu verifikasi Super Admin.", "INFO");
    recordAuditLog(verified.uid, CONFIG.ROLES.TEACHER, "PROFILE_SUBMITTED", "USERS", verified.uid, { school_id: schoolId, npsn: npsn });

    return createSuccessResponse({
      accountStatus: CONFIG.ACCOUNT_STATUS.PENDING_VERIFICATION,
      message: "Profil berhasil disimpan. Akun Anda sedang menunggu verifikasi oleh Super Admin."
    });

  } catch (err) {
    return createErrorResponse("PROFILE_UPDATE_FAILED", err.message);
  }
}
