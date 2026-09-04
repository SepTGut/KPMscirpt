// ============================================
// REST API ROUTING & DISPATCHER (Router.gs)
// ============================================

/**
 * Handles all GET requests with API token authentication.
 * Returns unified { success, action, data, error } envelope.
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : "getMonitoring";
  try {
    if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
      throw { code: "SYSTEM_INTEGRITY_VIOLATION", message: "Akses ditolak: Integritas hak cipta dan modul sistem telah dimodifikasi secara tidak sah." };
    }

    var params = (e && e.parameter) ? e.parameter : {};
    var allowedGetActions = ["getMasterData", "getDeliveries", "getMonitoring", "createKpm", "archiveKpm", "updateStatus", "adminUpdateStatus", "editLatestKpmItems", "login", "getUsersList", "runSystemDiagnostics", "getRecipients"];
    if (allowedGetActions.indexOf(action) === -1) {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }

    authenticateRequest(params, action);

    var responseData;

    if (action === "getMasterData") {
      responseData = getMasterData();
    } else if (action === "getRecipients") {
      responseData = getRecipientsList();
    } else if (action === "getDeliveries") {
      responseData = getAvailableDeliveries();
    } else if (action === "getMonitoring") {
      var includeArchived = (params.includeArchived === "true");
      var bypassCache = (params.bypassCache === "true" || params.refresh === "true");
      responseData = getKpmMonitoringData(includeArchived, bypassCache);
    } else if (action === "createKpm") {
      responseData = validateAndCreateKpm(params);
    } else if (action === "archiveKpm") {
      responseData = archiveKpm(params.nomorKPM);
    } else if (action === "updateStatus") {
      responseData = validateAndUpdateStatus(params);
    } else if (action === "adminUpdateStatus") {
      responseData = adminUpdateStatus(params);
    } else if (action === "editLatestKpmItems") {
      responseData = editLatestKpmItems(params);
    } else if (action === "login") {
      responseData = loginUser(params);
    } else if (action === "getUsersList") {
      responseData = getUsersList();
    } else if (action === "runSystemDiagnostics") {
      responseData = runSystemDiagnostics();
    } else {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }

    return jsonOutput(createSuccessResponse(action, responseData));
  } catch (error) {
    var code = (error && error.code) ? error.code : "SERVER_ERROR";
    var msg = (error && error.message) ? error.message : String(error);
    return jsonOutput(createErrorResponse(action, code, msg));
  }
}

/**
 * Handles all POST requests with LockService concurrency protection and token authentication.
 * Returns unified { success, action, data, error } envelope.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action ? String(params.action).trim() : "";

  // Deduce action if not explicitly supplied
  if (!action) {
    if (params.daftarBarang && !params.editItems) action = "createKpm";
    else if (params.statusKPM && normalizeKpmStatus(params.statusKPM) === KPM_STATUS.SELESAI) action = "archiveKpm";
    else if (params.statusKPM) action = "updateStatus";
    else action = "unknown";
  }

  var lockAcquired = false;
  try {
    if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
      throw { code: "SYSTEM_INTEGRITY_VIOLATION", message: "Akses ditolak: Integritas hak cipta dan modul sistem telah dimodifikasi secara tidak sah." };
    }
    var allowedPostActions = ["createKpm", "archiveKpm", "updateStatus", "adminUpdateStatus", "editLatestKpmItems", "getMasterData", "getDeliveries", "getMonitoring", "login", "getUsersList", "saveUser", "toggleUserStatus", "runSystemDiagnostics", "stageArrival", "confirmArrivalReceipt", "getRecipients"];
    if (allowedPostActions.indexOf(action) === -1) {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }
    lockAcquired = lock.tryLock(15000);
    if (!lockAcquired) {
      throw { code: "CONCURRENCY_ERROR", message: "Server sedang sibuk memproses permintaan lain. Harap coba beberapa saat lagi." };
    }

    authenticateRequest(params, action);

    var resultData;

    if (action === "createKpm") {
      resultData = validateAndCreateKpm(params);
    } else if (action === "archiveKpm") {
      resultData = archiveKpm(params.nomorKPM);
    } else if (action === "updateStatus") {
      resultData = validateAndUpdateStatus(params);
    } else if (action === "stageArrival") {
      resultData = stageArrival(params);
    } else if (action === "confirmArrivalReceipt") {
      resultData = confirmArrivalReceipt(params);
    } else if (action === "adminUpdateStatus") {
      resultData = adminUpdateStatus(params);
    } else if (action === "editLatestKpmItems") {
      resultData = editLatestKpmItems(params);
    } else if (action === "getMasterData") {
      resultData = getMasterData();
    } else if (action === "getRecipients") {
      resultData = getRecipientsList();
    } else if (action === "getDeliveries") {
      resultData = getAvailableDeliveries();
    } else if (action === "getMonitoring") {
      var includeArchived = (params.includeArchived === "true");
      var bypassCache = (params.bypassCache === "true" || params.refresh === "true");
      resultData = getKpmMonitoringData(includeArchived, bypassCache);
    } else if (action === "login") {
      resultData = loginUser(params);
    } else if (action === "getUsersList") {
      resultData = getUsersList();
    } else if (action === "saveUser") {
      resultData = saveUser(params);
    } else if (action === "toggleUserStatus") {
      resultData = toggleUserStatus(params);
    } else if (action === "runSystemDiagnostics") {
      resultData = runSystemDiagnostics();
    } else {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }

    return jsonOutput(createSuccessResponse(action, resultData));
  } catch (error) {
    var code = (error && error.code) ? error.code : "SERVER_ERROR";
    var msg = (error && error.message) ? error.message : String(error);
    return jsonOutput(createErrorResponse(action, code, msg));
  } finally {
    if (lockAcquired) {
      try {
        lock.releaseLock();
      } catch (lockErr) {
        Logger.log("lock.releaseLock error: " + lockErr);
      }
    }
  }
}
