/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Schedules.gs
 * Deskripsi: Manajemen jadwal mengajar guru mingguan dan agenda kelas.
 */

/**
 * Guru: Mengambil seluruh jadwal pelajaran milik guru yang aktif.
 */
function teacherGetSchedules(idToken, classId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    var allSchedules = getTableRows(CONFIG.SHEETS.SCHEDULES);
    var allSubjects = getTableRows(CONFIG.SHEETS.SUBJECTS);
    var allClasses = getTableRows(CONFIG.SHEETS.CLASSES);

    var subjectMap = {};
    for (var sub = 0; sub < allSubjects.length; sub++) {
      subjectMap[allSubjects[sub].subject_id] = allSubjects[sub].subject_name;
    }

    var classMap = {};
    for (var c = 0; c < allClasses.length; c++) {
      classMap[allClasses[c].class_id] = allClasses[c].class_name;
    }

    var result = [];
    for (var i = 0; i < allSchedules.length; i++) {
      var sch = allSchedules[i];
      if (sch.owner_user_id === user.uid) {
        if (!classId || sch.class_id === classId) {
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
    }

    // Urutkan berdasarkan hari (Senin -> Sabtu) dan start_time
    var dayOrder = { "Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5, "Sabtu": 6 };
    result.sort(function(a, b) {
      var dayDiff = (dayOrder[a.day_of_week] || 7) - (dayOrder[b.day_of_week] || 7);
      if (dayDiff !== 0) return dayDiff;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

    return createSuccessResponse(result, "Jadwal pelajaran berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_SCHEDULES_FAILED", err.message);
  }
}

/**
 * Guru: Menyimpan atau memperbarui jadwal pelajaran.
 */
function teacherSaveSchedule(idToken, scheduleData) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    if (!scheduleData || !scheduleData.class_id || !scheduleData.day_of_week || !scheduleData.start_time) {
      return createErrorResponse("VALIDATION_ERROR", "Kelas, hari, dan jam mulai wajib diisi.");
    }

    verifyClassOwnership(scheduleData.class_id, user.uid);

    var nowIso = new Date().toISOString();
    var scheduleId = scheduleData.schedule_id || generateUuid();

    if (scheduleData.schedule_id) {
      // Perbarui
      var updated = updateTableRow(CONFIG.SHEETS.SCHEDULES, "schedule_id", scheduleId, {
        class_id: scheduleData.class_id,
        subject_id: sanitizeString(scheduleData.subject_id || ""),
        day_of_week: sanitizeString(scheduleData.day_of_week),
        start_time: sanitizeString(scheduleData.start_time),
        end_time: sanitizeString(scheduleData.end_time || ""),
        room: sanitizeString(scheduleData.room || ""),
        updated_at: nowIso
      });
      if (!updated) return createErrorResponse("NOT_FOUND", "Jadwal tidak ditemukan.");
      return createSuccessResponse({ schedule_id: scheduleId }, "Jadwal berhasil diperbarui");
    } else {
      // Buat Baru
      var newSchedule = {
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
      };
      insertTableRow(CONFIG.SHEETS.SCHEDULES, newSchedule);
      return createSuccessResponse(newSchedule, "Jadwal baru berhasil ditambahkan");
    }
  } catch (err) {
    return createErrorResponse("SAVE_SCHEDULE_FAILED", err.message);
  }
}

/**
 * Guru: Menghapus jadwal.
 */
function teacherDeleteSchedule(idToken, scheduleId) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);

    var allSchedules = getTableRows(CONFIG.SHEETS.SCHEDULES);
    var found = false;
    for (var i = 0; i < allSchedules.length; i++) {
      if (allSchedules[i].schedule_id === scheduleId && allSchedules[i].owner_user_id === user.uid) {
        found = true;
        break;
      }
    }

    if (!found) return createErrorResponse("FORBIDDEN", "Jadwal tidak ditemukan atau bukan milik Anda.");

    deleteTableRow(CONFIG.SHEETS.SCHEDULES, "schedule_id", scheduleId);
    return createSuccessResponse({ schedule_id: scheduleId }, "Jadwal berhasil dihapus");
  } catch (err) {
    return createErrorResponse("DELETE_SCHEDULE_FAILED", err.message);
  }
}
