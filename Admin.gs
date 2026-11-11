/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Admin.gs
 * Deskripsi: Seluruh API dan pengontrol fungsionalitas Super Admin (Platform Operator).
 * 
 * ATURAN KEAMANAN MUTLAK:
 * Super Admin TIDAK BOLEH memanipulasi kelas, siswa, presensi, jurnal, nilai, atau rapor guru.
 */

/**
 * Super Admin: Mengambil ringkasan dashboard statistik platform.
 */
function adminGetDashboard(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var allUsers = getTableRows(CONFIG.SHEETS.USERS);
    var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var allResources = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    var allAuditLogs = getTableRows(CONFIG.SHEETS.AUDIT_LOGS);

    var stats = {
      totalTeachers: allUsers.length,
      activeTeachers: 0,
      pendingTeachers: 0,
      rejectedTeachers: 0,
      suspendedTeachers: 0,
      totalSchools: allSchools.length,
      verifiedSchools: 0,
      centralResourcesCount: 0
    };

    for (var u = 0; u < allUsers.length; u++) {
      var st = allUsers[u].account_status;
      if (st === CONFIG.ACCOUNT_STATUS.ACTIVE) stats.activeTeachers++;
      else if (st === CONFIG.ACCOUNT_STATUS.PENDING_VERIFICATION) stats.pendingTeachers++;
      else if (st === CONFIG.ACCOUNT_STATUS.REJECTED) stats.rejectedTeachers++;
      else if (st === CONFIG.ACCOUNT_STATUS.SUSPENDED) stats.suspendedTeachers++;
    }

    for (var s = 0; s < allSchools.length; s++) {
      if (allSchools[s].verification_status === "VERIFIED") stats.verifiedSchools++;
    }

    for (var r = 0; r < allResources.length; r++) {
      if (allResources[r].visibility === "PUBLIC_CENTRAL") stats.centralResourcesCount++;
    }

    // Ambil 10 aktivitas log terbaru
    allAuditLogs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    var recentActivities = allAuditLogs.slice(0, 10);

    return createSuccessResponse({
      stats: stats,
      recentActivities: recentActivities
    }, "Dashboard Super Admin berhasil dimuat");
  } catch (err) {
    return createErrorResponse("ADMIN_DASHBOARD_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengambil daftar guru yang menunggu verifikasi.
 */
function adminGetPendingTeachers(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var allUsers = getTableRows(CONFIG.SHEETS.USERS);
    var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var allVerifications = getTableRows(CONFIG.SHEETS.SCHOOL_VERIFICATIONS);

    var schoolMap = {};
    for (var s = 0; s < allSchools.length; s++) {
      schoolMap[allSchools[s].school_id] = allSchools[s];
    }

    var verifMap = {};
    for (var v = 0; v < allVerifications.length; v++) {
      verifMap[allVerifications[v].user_id] = allVerifications[v];
    }

    var pendingList = [];
    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u];
      if (usr.account_status === CONFIG.ACCOUNT_STATUS.PENDING_VERIFICATION) {
        var schoolObj = usr.school_id ? schoolMap[usr.school_id] : null;
        var verifObj = verifMap[usr.user_id] || null;
        pendingList.push({
          user: usr,
          school: schoolObj,
          verification: verifObj
        });
      }
    }

    return createSuccessResponse(pendingList, "Daftar antrean verifikasi guru berhasil diambil");
  } catch (err) {
    return createErrorResponse("PENDING_TEACHERS_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengambil detail lengkap seorang guru.
 */
function adminGetTeacherDetail(idToken, targetUserId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var allUsers = getTableRows(CONFIG.SHEETS.USERS);
    var target = null;
    for (var i = 0; i < allUsers.length; i++) {
      if (allUsers[i].user_id === targetUserId) {
        target = allUsers[i];
        break;
      }
    }

    if (!target) {
      return createErrorResponse("NOT_FOUND", "Data guru tidak ditemukan.");
    }

    var schoolObj = null;
    if (target.school_id) {
      var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
      for (var s = 0; s < allSchools.length; s++) {
        if (allSchools[s].school_id === target.school_id) {
          schoolObj = allSchools[s];
          break;
        }
      }
    }

    return createSuccessResponse({
      user: target,
      school: schoolObj
    }, "Detail guru berhasil diambil");
  } catch (err) {
    return createErrorResponse("TEACHER_DETAIL_FAILED", err.message);
  }
}

/**
 * Super Admin: Menyetujui pendaftaran guru.
 */
function adminApproveTeacher(idToken, targetUserId, note) {
  try {
    var user = verifyFirebaseUser(idToken);
    var adminObj = requireSuperAdmin(user);

    var nowIso = new Date().toISOString();
    var updated = updateTableRow(CONFIG.SHEETS.USERS, "user_id", targetUserId, {
      account_status: CONFIG.ACCOUNT_STATUS.ACTIVE,
      updated_at: nowIso
    });

    if (!updated) {
      return createErrorResponse("NOT_FOUND", "Data guru tidak ditemukan.");
    }

    // Perbarui riwayat verifikasi
    var verifs = getTableRows(CONFIG.SHEETS.SCHOOL_VERIFICATIONS);
    for (var v = 0; v < verifs.length; v++) {
      if (verifs[v].user_id === targetUserId && verifs[v].decision === "PENDING") {
        updateTableRow(CONFIG.SHEETS.SCHOOL_VERIFICATIONS, "verification_id", verifs[v].verification_id, {
          decision: "APPROVED",
          review_note: sanitizeString(note || "Disetujui oleh Super Admin"),
          reviewed_by: adminObj.admin_name || user.email,
          reviewed_at: nowIso
        });
        break;
      }
    }

    // Kirim notifikasi ke Guru
    sendNotification(targetUserId, "Akun Disetujui!", "Selamat! Akun Anda telah diverifikasi oleh Super Admin. Seluruh fitur administrasi telah aktif.", "SUCCESS");
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "APPROVE_TEACHER", "USERS", targetUserId, { note: note });

    return createSuccessResponse({ user_id: targetUserId, status: CONFIG.ACCOUNT_STATUS.ACTIVE }, "Guru berhasil disetujui dan diaktifkan");
  } catch (err) {
    return createErrorResponse("APPROVE_TEACHER_FAILED", err.message);
  }
}

/**
 * Super Admin: Menolak pendaftaran guru.
 */
function adminRejectTeacher(idToken, targetUserId, note) {
  try {
    var user = verifyFirebaseUser(idToken);
    var adminObj = requireSuperAdmin(user);

    var nowIso = new Date().toISOString();
    var updated = updateTableRow(CONFIG.SHEETS.USERS, "user_id", targetUserId, {
      account_status: CONFIG.ACCOUNT_STATUS.REJECTED,
      updated_at: nowIso
    });

    if (!updated) {
      return createErrorResponse("NOT_FOUND", "Data guru tidak ditemukan.");
    }

    // Perbarui verifikasi
    var verifs = getTableRows(CONFIG.SHEETS.SCHOOL_VERIFICATIONS);
    for (var v = 0; v < verifs.length; v++) {
      if (verifs[v].user_id === targetUserId && verifs[v].decision === "PENDING") {
        updateTableRow(CONFIG.SHEETS.SCHOOL_VERIFICATIONS, "verification_id", verifs[v].verification_id, {
          decision: "REJECTED",
          review_note: sanitizeString(note || "Pendaftaran ditolak"),
          reviewed_by: adminObj.admin_name || user.email,
          reviewed_at: nowIso
        });
        break;
      }
    }

    sendNotification(targetUserId, "Pendaftaran Ditolak", "Mohon maaf, pendaftaran akun Anda ditolak dengan alasan: " + (note || "Data belum lengkap."), "WARNING");
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "REJECT_TEACHER", "USERS", targetUserId, { note: note });

    return createSuccessResponse({ user_id: targetUserId, status: CONFIG.ACCOUNT_STATUS.REJECTED }, "Pendaftaran guru telah ditolak");
  } catch (err) {
    return createErrorResponse("REJECT_TEACHER_FAILED", err.message);
  }
}

/**
 * Super Admin: Menangguhkan akun guru (SUSPEND).
 */
function adminSuspendTeacher(idToken, targetUserId, note) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var nowIso = new Date().toISOString();
    updateTableRow(CONFIG.SHEETS.USERS, "user_id", targetUserId, {
      account_status: CONFIG.ACCOUNT_STATUS.SUSPENDED,
      updated_at: nowIso
    });

    sendNotification(targetUserId, "Akun Ditangguhkan", "Akun Anda telah ditangguhkan sementara: " + (note || "Hubungi admin."), "WARNING");
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "SUSPEND_TEACHER", "USERS", targetUserId, { note: note });

    return createSuccessResponse({ user_id: targetUserId, status: CONFIG.ACCOUNT_STATUS.SUSPENDED }, "Akun guru ditangguhkan");
  } catch (err) {
    return createErrorResponse("SUSPEND_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengaktifkan kembali akun guru yang ditangguhkan.
 */
function adminReactivateTeacher(idToken, targetUserId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var nowIso = new Date().toISOString();
    updateTableRow(CONFIG.SHEETS.USERS, "user_id", targetUserId, {
      account_status: CONFIG.ACCOUNT_STATUS.ACTIVE,
      updated_at: nowIso
    });

    sendNotification(targetUserId, "Akun Diaktifkan Kembali", "Akun Anda telah diaktifkan kembali oleh Super Admin.", "SUCCESS");
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "REACTIVATE_TEACHER", "USERS", targetUserId, {});

    return createSuccessResponse({ user_id: targetUserId, status: CONFIG.ACCOUNT_STATUS.ACTIVE }, "Akun guru berhasil diaktifkan kembali");
  } catch (err) {
    return createErrorResponse("REACTIVATE_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengambil daftar seluruh guru dengan filter opsional.
 */
function adminGetTeachers(idToken, filter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var allUsers = getTableRows(CONFIG.SHEETS.USERS);
    var allSchools = getTableRows(CONFIG.SHEETS.SCHOOLS);
    var schoolMap = {};
    for (var s = 0; s < allSchools.length; s++) {
      schoolMap[allSchools[s].school_id] = allSchools[s];
    }

    var result = allUsers.map(function(u) {
      return {
        user: u,
        school: u.school_id ? schoolMap[u.school_id] : null
      };
    });

    if (filter) {
      if (filter.status) {
        result = result.filter(function(item) { return item.user.account_status === filter.status; });
      }
      if (filter.school_id) {
        result = result.filter(function(item) { return item.user.school_id === filter.school_id; });
      }
    }

    return createSuccessResponse(result, "Data guru berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_TEACHERS_FAILED", err.message);
  }
}

/**
 * Super Admin: Menambahkan dokumen ke Pustaka Perangkat Ajar Pusat (Drive).
 */
function adminCreateResource(idToken, resourceData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    if (!resourceData || !resourceData.title || !resourceData.drive_url) {
      return createErrorResponse("VALIDATION_ERROR", "Judul dokumen dan URL Google Drive wajib diisi.");
    }

    var resourceId = generateUuid();
    var nowIso = new Date().toISOString();
    var newResource = {
      resource_id: resourceId,
      owner_user_id: "SYSTEM_CENTRAL",
      resource_type: sanitizeString(resourceData.resource_type || "MODUL_AJAR"),
      title: sanitizeString(resourceData.title),
      description: sanitizeString(resourceData.description || ""),
      subject_id: sanitizeString(resourceData.subject_id || ""),
      class_id: "",
      grade_level: parseInt(resourceData.grade_level, 10) || 4,
      semester: sanitizeString(resourceData.semester || "1"),
      academic_year: sanitizeString(resourceData.academic_year || "2026/2027"),
      drive_url: sanitizeString(resourceData.drive_url),
      visibility: "PUBLIC_CENTRAL",
      status: "ACTIVE",
      created_at: nowIso,
      updated_at: nowIso
    };

    insertTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, newResource);
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "CREATE_CENTRAL_RESOURCE", "LEARNING_RESOURCES", resourceId, { title: newResource.title });

    return createSuccessResponse(newResource, "Perangkat ajar pusat berhasil ditambahkan");
  } catch (err) {
    return createErrorResponse("CREATE_RESOURCE_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengambil seluruh berkas Pustaka Perangkat Ajar Pusat.
 */
function adminGetResources(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var allRes = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    var central = allRes.filter(function(r) { return r.visibility === "PUBLIC_CENTRAL" && r.status === "ACTIVE"; });

    return createSuccessResponse(central, "Pustaka pusat berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_RESOURCES_FAILED", err.message);
  }
}

/**
 * Super Admin: Menghapus perangkat ajar dari pustaka pusat.
 */
function adminDeleteResource(idToken, resourceId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var updated = updateTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, "resource_id", resourceId, {
      status: "ARCHIVED",
      updated_at: new Date().toISOString()
    });

    if (!updated) return createErrorResponse("NOT_FOUND", "Dokumen tidak ditemukan.");

    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "DELETE_CENTRAL_RESOURCE", "LEARNING_RESOURCES", resourceId, {});
    return createSuccessResponse({ resource_id: resourceId }, "Dokumen berhasil dihapus dari pustaka pusat");
  } catch (err) {
    return createErrorResponse("DELETE_RESOURCE_FAILED", err.message);
  }
}

/**
 * Super Admin: Menerbitkan pengumuman platform.
 */
function adminPublishAnnouncement(idToken, payload) {
  try {
    var user = verifyFirebaseUser(idToken);
    var adminObj = requireSuperAdmin(user);

    if (!payload || !payload.title || !payload.content) {
      return createErrorResponse("VALIDATION_ERROR", "Judul dan isi pengumuman wajib diisi.");
    }

    var announcementId = generateUuid();
    var nowIso = new Date().toISOString();
    var announcement = {
      announcement_id: announcementId,
      title: sanitizeString(payload.title),
      content: sanitizeString(payload.content),
      audience: sanitizeString(payload.audience || "ALL_TEACHERS"),
      publish_at: nowIso,
      expires_at: payload.expires_at || "",
      status: "PUBLISHED",
      created_by: adminObj.admin_name || user.email,
      created_at: nowIso
    };

    insertTableRow(CONFIG.SHEETS.ANNOUNCEMENTS, announcement);
    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "PUBLISH_ANNOUNCEMENT", "ANNOUNCEMENTS", announcementId, { title: announcement.title });

    return createSuccessResponse(announcement, "Pengumuman berhasil diterbitkan");
  } catch (err) {
    return createErrorResponse("PUBLISH_ANNOUNCEMENT_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengambil daftar tiket bantuan guru.
 */
function adminGetSupportTickets(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var tickets = getTableRows(CONFIG.SHEETS.SUPPORT_TICKETS);
    tickets.sort(function(a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return createSuccessResponse(tickets, "Daftar tiket bantuan berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_TICKETS_FAILED", err.message);
  }
}

/**
 * Super Admin: Membalas dan memperbarui status tiket bantuan.
 */
function adminUpdateSupportTicket(idToken, ticketId, responseData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var nowIso = new Date().toISOString();
    var updated = updateTableRow(CONFIG.SHEETS.SUPPORT_TICKETS, "ticket_id", ticketId, {
      status: sanitizeString(responseData.status || "RESOLVED"),
      admin_note: sanitizeString(responseData.admin_note || ""),
      updated_at: nowIso
    });

    if (!updated) return createErrorResponse("NOT_FOUND", "Tiket tidak ditemukan.");

    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "RESOLVE_TICKET", "SUPPORT_TICKETS", ticketId, responseData);
    return createSuccessResponse({ ticket_id: ticketId }, "Tiket bantuan berhasil ditindaklanjuti");
  } catch (err) {
    return createErrorResponse("UPDATE_TICKET_FAILED", err.message);
  }
}

/**
 * Super Admin: Mengambil konfigurasi platform.
 */
function adminGetPlatformSettings(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var settings = getTableRows(CONFIG.SHEETS.APP_SETTINGS);
    var settingsMap = {};
    for (var i = 0; i < settings.length; i++) {
      settingsMap[settings[i].setting_key] = settings[i].setting_value;
    }

    return createSuccessResponse(settingsMap, "Pengaturan platform berhasil diambil");
  } catch (err) {
    return createErrorResponse("GET_SETTINGS_FAILED", err.message);
  }
}

/**
 * Super Admin: Memperbarui pengaturan platform.
 */
function adminUpdatePlatformSettings(idToken, settingsObj) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var nowIso = new Date().toISOString();
    var keys = Object.keys(settingsObj);

    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var val = String(settingsObj[key]);
      var updated = updateTableRow(CONFIG.SHEETS.APP_SETTINGS, "setting_key", key, {
        setting_value: val,
        updated_by: user.email,
        updated_at: nowIso
      });
      if (!updated) {
        insertTableRow(CONFIG.SHEETS.APP_SETTINGS, {
          setting_key: key,
          setting_value: val,
          updated_by: user.email,
          updated_at: nowIso
        });
      }
    }

    recordAuditLog(user.uid, CONFIG.ROLES.SUPER_ADMIN, "UPDATE_SETTINGS", "APP_SETTINGS", "GLOBAL", settingsObj);
    return createSuccessResponse(settingsObj, "Pengaturan platform berhasil disimpan");
  } catch (err) {
    return createErrorResponse("UPDATE_SETTINGS_FAILED", err.message);
  }
}
