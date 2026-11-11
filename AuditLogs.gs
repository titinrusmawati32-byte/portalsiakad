/**
 * PORTAL ADMINISTRASI GURU SD
 * File: AuditLogs.gs
 * Deskripsi: Pencatatan jejak audit sistem dan riwayat tindakan pengguna/admin.
 */

/**
 * Mencatat peristiwa/aktivitas penting ke sheet AUDIT_LOGS.
 */
function recordAuditLog(actorUserId, actorRole, action, entityType, entityId, details) {
  try {
    var logId = generateUuid();
    var nowIso = new Date().toISOString();
    var detailsStr = (typeof details === "object") ? JSON.stringify(details) : String(details || "");

    insertTableRow(CONFIG.SHEETS.AUDIT_LOGS, {
      log_id: logId,
      actor_user_id: actorUserId || "ANONYMOUS",
      actor_role: actorRole || "SYSTEM",
      action: action || "UNKNOWN_ACTION",
      entity_type: entityType || "SYSTEM",
      entity_id: entityId || "-",
      details: detailsStr,
      timestamp: nowIso
    });
  } catch (err) {
    Logger.log("Gagal mencatat audit log: " + err.toString());
  }
}

/**
 * Mengambil log audit sistem (Hanya untuk Super Admin).
 */
function adminGetAuditLogs(idToken, limit) {
  try {
    var user = verifyFirebaseUser(idToken);
    requireSuperAdmin(user);

    var maxLimit = parseInt(limit, 10) || 50;
    var allLogs = getTableRows(CONFIG.SHEETS.AUDIT_LOGS);

    // Urutkan dari yang paling baru
    allLogs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    var sliced = allLogs.slice(0, maxLimit);
    return createSuccessResponse(sliced, "Data audit log berhasil diambil");
  } catch (err) {
    return createErrorResponse("AUDIT_LOGS_FAILED", err.message);
  }
}
