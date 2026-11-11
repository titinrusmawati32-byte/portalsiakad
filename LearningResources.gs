/**
 * PORTAL ADMINISTRASI GURU SD
 * File: LearningResources.gs
 * Deskripsi: Manajemen perangkat ajar guru (Modul Ajar, RPP, CP, TP, ATP, LKPD) & pustaka pusat.
 */

/**
 * Guru: Mengambil perangkat ajar milik sendiri dan perangkat ajar dari pustaka pusat.
 */
function teacherGetResources(idToken, filter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    var allRes = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    var result = {
      myResources: [],
      centralResources: []
    };

    for (var i = 0; i < allRes.length; i++) {
      var r = allRes[i];
      if (r.status === "ARCHIVED") continue;

      if (r.owner_user_id === user.uid) {
        result.myResources.push(r);
      } else if (r.visibility === "PUBLIC_CENTRAL") {
        result.centralResources.push(r);
      }
    }

    if (filter) {
      if (filter.resource_type) {
        result.myResources = result.myResources.filter(function(item) { return item.resource_type === filter.resource_type; });
        result.centralResources = result.centralResources.filter(function(item) { return item.resource_type === filter.resource_type; });
      }
      if (filter.grade_level) {
        result.myResources = result.myResources.filter(function(item) { return Number(item.grade_level) === Number(filter.grade_level); });
        result.centralResources = result.centralResources.filter(function(item) { return Number(item.grade_level) === Number(filter.grade_level); });
      }
    }

    return createSuccessResponse(result, "Perangkat pembelajaran berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_RESOURCES_FAILED", err.message);
  }
}

/**
 * Guru: Menyimpan atau memperbarui perangkat ajar pribadi.
 */
function teacherSaveResource(idToken, resourceData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    if (!resourceData || !resourceData.title || !resourceData.drive_url) {
      return createErrorResponse("VALIDATION_ERROR", "Judul dan Tautan Dokumen (Google Drive) wajib diisi.");
    }

    var nowIso = new Date().toISOString();
    var resourceId = resourceData.resource_id || generateUuid();

    if (resourceData.resource_id) {
      // Periksa kepemilikan
      var allRes = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
      var owned = false;
      for (var i = 0; i < allRes.length; i++) {
        if (allRes[i].resource_id === resourceId && allRes[i].owner_user_id === user.uid) {
          owned = true;
          break;
        }
      }
      if (!owned) return createErrorResponse("FORBIDDEN", "Anda tidak memiliki akses ke berkas ini.");

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
      var newResource = {
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
      };

      insertTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, newResource);
      recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "CREATE_RESOURCE", "LEARNING_RESOURCES", resourceId, { title: newResource.title });

      return createSuccessResponse(newResource, "Perangkat ajar berhasil ditambahkan");
    }
  } catch (err) {
    return createErrorResponse("SAVE_RESOURCE_FAILED", err.message);
  }
}

/**
 * Guru: Menghapus perangkat ajar pribadi.
 */
function teacherDeleteResource(idToken, resourceId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    var allRes = getTableRows(CONFIG.SHEETS.LEARNING_RESOURCES);
    var owned = false;
    for (var i = 0; i < allRes.length; i++) {
      if (allRes[i].resource_id === resourceId && allRes[i].owner_user_id === user.uid) {
        owned = true;
        break;
      }
    }
    if (!owned) return createErrorResponse("FORBIDDEN", "Anda tidak memiliki akses ke berkas ini.");

    updateTableRow(CONFIG.SHEETS.LEARNING_RESOURCES, "resource_id", resourceId, {
      status: "ARCHIVED",
      updated_at: new Date().toISOString()
    });

    return createSuccessResponse({ resource_id: resourceId }, "Perangkat ajar berhasil dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_RESOURCE_FAILED", err.message);
  }
}
