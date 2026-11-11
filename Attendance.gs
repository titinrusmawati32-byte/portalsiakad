/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Attendance.gs
 * Deskripsi: Sistem presensi QR Code berbatas waktu, presensi manual, dan rekapitulasi kehadiran.
 */

/**
 * Guru: Membuka sesi presensi baru dengan token QR dinamis berbatas waktu.
 */
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
    recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "OPEN_ATTENDANCE_SESSION", "ATTENDANCE_SESSIONS", sessionId, { class_id: classId });

    return createSuccessResponse({
      sessionId: sessionId,
      rawQrToken: rawQrToken, // Dikirim ke guru untuk ditampilkan sebagai QR Code
      expiresAt: expiresAt.toISOString(),
      sessionDate: sessionDate
    }, "Sesi presensi QR berhasil dibuka (berlaku " + CONFIG.QR_SESSION_DURATION_MINUTES + " menit)");
  } catch (err) {
    return createErrorResponse("CREATE_SESSION_FAILED", err.message);
  }
}

/**
 * Murid / Perangkat Pemindai: Memvalidasi QR scan dan mencatat kehadiran siswa.
 * Mencegah scan ganda dan memvalidasi masa berlaku token.
 */
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

    if (!session || session.status !== "OPEN") {
      return createErrorResponse("INVALID_SESSION", "Sesi presensi telah ditutup atau tidak valid.");
    }

    // Periksa kedaluwarsa waktu
    var expiresTime = new Date(session.expires_at).getTime();
    if (new Date().getTime() > expiresTime) {
      updateTableRow(CONFIG.SHEETS.ATTENDANCE_SESSIONS, "session_id", sessionId, { status: "CLOSED" });
      return createErrorResponse("SESSION_EXPIRED", "Masa berlaku QR Code telah habis.");
    }

    // Validasi kecocokan token hash
    var hashedInput = generateSha256(rawQrToken);
    if (hashedInput !== session.qr_token_hash) {
      return createErrorResponse("INVALID_QR_TOKEN", "Kode QR tidak valid atau telah diperbarui.");
    }

    // Periksa apakah siswa valid
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var student = null;
    for (var std = 0; std < allStudents.length; std++) {
      if (allStudents[std].student_id === studentId) {
        student = allStudents[std];
        break;
      }
    }

    if (!student || student.class_id !== session.class_id) {
      return createErrorResponse("STUDENT_NOT_IN_CLASS", "Data siswa tidak terdaftar dalam kelas sesi ini.");
    }

    // Cegah scan ganda: periksa apakah sudah tercatat pada sesi ini
    var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);
    for (var a = 0; a < allAttendance.length; a++) {
      if (allAttendance[a].session_id === sessionId && allAttendance[a].student_id === studentId) {
        return createSuccessResponse({ alreadyRecorded: true }, "Presensi " + student.full_name + " sudah tercatat sebelumnya.");
      }
    }

    // Catat kehadiran siswa
    var attendanceId = generateUuid();
    var nowIso = new Date().toISOString();
    var record = {
      attendance_id: attendanceId,
      owner_user_id: session.owner_user_id,
      class_id: session.class_id,
      session_id: sessionId,
      student_id: studentId,
      attendance_date: session.session_date,
      status: CONFIG.ATTENDANCE_STATUS.PRESENT,
      method: "QR_SCAN",
      recorded_at: nowIso,
      note: ""
    };

    insertTableRow(CONFIG.SHEETS.ATTENDANCE, record);
    return createSuccessResponse({ student_name: student.full_name, status: "PRESENT" }, "Presensi berhasil dicatat untuk: " + student.full_name);
  } catch (err) {
    return createErrorResponse("SCAN_QR_FAILED", err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Guru: Menyimpan presensi manual (Hadir, Izin, Sakit, Alpa) per siswa atau massal.
 */
function teacherRecordAttendance(idToken, classId, dateStr, recordsArray) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    if (!Array.isArray(recordsArray) || recordsArray.length === 0) {
      return createErrorResponse("VALIDATION_ERROR", "Data presensi tidak boleh kosong.");
    }

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
      var targetDate = dateStr ? formatDateIso(dateStr) : formatDateIso(new Date());
      var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);
      var nowIso = new Date().toISOString();
      var savedCount = 0;

      for (var i = 0; i < recordsArray.length; i++) {
        var item = recordsArray[i];
        if (!item.student_id || !item.status) continue;

        // Cari apakah sudah ada data untuk tanggal & murid ini
        var existing = null;
        for (var a = 0; a < allAttendance.length; a++) {
          if (allAttendance[a].class_id === classId && 
              allAttendance[a].student_id === item.student_id && 
              formatDateIso(allAttendance[a].attendance_date) === targetDate) {
            existing = allAttendance[a];
            break;
          }
        }

        if (existing) {
          updateTableRow(CONFIG.SHEETS.ATTENDANCE, "attendance_id", existing.attendance_id, {
            status: sanitizeString(item.status),
            method: "MANUAL",
            recorded_at: nowIso,
            note: sanitizeString(item.note || "")
          });
        } else {
          var attendanceId = generateUuid();
          insertTableRow(CONFIG.SHEETS.ATTENDANCE, {
            attendance_id: attendanceId,
            owner_user_id: user.uid,
            class_id: classId,
            session_id: "MANUAL_" + targetDate,
            student_id: item.student_id,
            attendance_date: targetDate,
            status: sanitizeString(item.status),
            method: "MANUAL",
            recorded_at: nowIso,
            note: sanitizeString(item.note || "")
          });
        }
        savedCount++;
      }

      recordAuditLog(user.uid, CONFIG.ROLES.TEACHER, "RECORD_ATTENDANCE", "ATTENDANCE", classId, { date: targetDate, count: savedCount });
      return createSuccessResponse({ savedCount: savedCount }, "Presensi tanggal " + targetDate + " berhasil disimpan (" + savedCount + " siswa).");
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createErrorResponse("RECORD_ATTENDANCE_FAILED", err.message);
  }
}

/**
 * Guru: Mengambil rekap presensi kelas pada tanggal tertentu beserta daftar siswa.
 */
function teacherGetAttendance(idToken, classId, dateFilter) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireActiveTeacher(user);
    verifyClassOwnership(classId, user.uid);

    var targetDate = dateFilter ? formatDateIso(dateFilter) : formatDateIso(new Date());
    var allStudents = getTableRows(CONFIG.SHEETS.STUDENTS);
    var allAttendance = getTableRows(CONFIG.SHEETS.ATTENDANCE);

    var classStudents = allStudents.filter(function(s) {
      return s.class_id === classId && s.status !== "ARCHIVED";
    });

    var attendanceMap = {};
    for (var a = 0; a < allAttendance.length; a++) {
      var att = allAttendance[a];
      if (att.class_id === classId && formatDateIso(att.attendance_date) === targetDate) {
        attendanceMap[att.student_id] = att;
      }
    }

    var summary = {
      date: targetDate,
      totalStudents: classStudents.length,
      present: 0,
      sick: 0,
      permission: 0,
      absent: 0,
      unrecorded: 0,
      list: []
    };

    for (var i = 0; i < classStudents.length; i++) {
      var std = classStudents[i];
      var rec = attendanceMap[std.student_id] || null;
      var status = rec ? rec.status : "UNRECORDED";

      if (status === "PRESENT") summary.present++;
      else if (status === "SICK") summary.sick++;
      else if (status === "PERMISSION") summary.permission++;
      else if (status === "ABSENT") summary.absent++;
      else summary.unrecorded++;

      summary.list.push({
        student_id: std.student_id,
        nis: std.nis,
        full_name: std.full_name,
        gender: std.gender,
        status: status,
        method: rec ? rec.method : "-",
        recorded_at: rec ? rec.recorded_at : "",
        note: rec ? rec.note : ""
      });
    }

    return createSuccessResponse(summary, "Rekap presensi berhasil dimuat");
  } catch (err) {
    return createErrorResponse("GET_ATTENDANCE_FAILED", err.message);
  }
}
