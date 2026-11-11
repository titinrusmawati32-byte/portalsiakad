/**
 * PORTAL ADMINISTRASI GURU SD
 * File: Notifications.gs
 * Deskripsi: Manajemen notifikasi sistem internal untuk Guru dan Administrator.
 */

/**
 * Mengirim notifikasi baru ke pengguna.
 */
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
    Logger.log("Gagal mengirim notifikasi: " + err.toString());
    return false;
  }
}

/**
 * Mengambil daftar notifikasi pengguna yang sedang login.
 */
function teacherGetNotifications(idToken) {
  try {
    var user = verifyFirebaseUser(idToken);
    var allNotes = getTableRows(CONFIG.SHEETS.NOTIFICATIONS);
    var userNotes = [];

    for (var i = 0; i < allNotes.length; i++) {
      if (allNotes[i].recipient_user_id === user.uid) {
        userNotes.push(allNotes[i]);
      }
    }

    userNotes.sort(function(a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return createSuccessResponse(userNotes.slice(0, 30), "Notifikasi berhasil diambil");
  } catch (err) {
    return createErrorResponse("NOTIFICATIONS_FAILED", err.message);
  }
}

/**
 * Menandai notifikasi sebagai sudah dibaca.
 */
function markNotificationAsRead(idToken, notificationId) {
  try {
    var user = verifyFirebaseUser(idToken);
    var allNotes = getTableRows(CONFIG.SHEETS.NOTIFICATIONS);
    var found = false;

    for (var i = 0; i < allNotes.length; i++) {
      if (allNotes[i].notification_id === notificationId && allNotes[i].recipient_user_id === user.uid) {
        found = true;
        break;
      }
    }

    if (!found) {
      return createErrorResponse("NOT_FOUND", "Notifikasi tidak ditemukan.");
    }

    updateTableRow(CONFIG.SHEETS.NOTIFICATIONS, "notification_id", notificationId, {
      is_read: true
    });

    return createSuccessResponse({ marked: true }, "Notifikasi ditandai sudah dibaca");
  } catch (err) {
    return createErrorResponse("UPDATE_NOTIFICATION_FAILED", err.message);
  }
}
