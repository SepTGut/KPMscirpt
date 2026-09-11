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
    var allowedGetActions = ["getMasterData", "getDeliveries", "getMonitoring", "createKpm", "archiveKpm", "updateStatus", "adminUpdateStatus", "editLatestKpmItems", "login", "getUsersList", "runSystemDiagnostics", "getRecipients", "checkArrivalStatus", "resolveShortLink", "cleanOrphanedAndTestRows", "stageDeparture", "confirmDepartureSecurity", "checkDepartureStatus", "rejectDepartureSecurity", "searchMaterials", "setupMaterialDb"];
    if (allowedGetActions.indexOf(action) === -1) {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }

    var authInfo = authenticateRequest(params, action);
    var isIT = Boolean(authInfo && authInfo.isIT);

    var responseData;

    if (action === "getMasterData") {
      responseData = getMasterData(isIT);
    } else if (action === "searchMaterials") {
      var q = params.query || params.q || "";
      var limit = parseInt(params.limit || "30", 10);
      responseData = searchMaterialDatabase(q, limit);
    } else if (action === "setupMaterialDb") {
      responseData = setupMaterialDatabaseImportRange();
    } else if (action === "resolveShortLink") {
      responseData = resolveShortLink(params);
    } else if (action === "getRecipients") {
      responseData = getRecipientsList(isIT);
    } else if (action === "getDeliveries") {
      responseData = getAvailableDeliveries(isIT);
    } else if (action === "getMonitoring") {
      var includeArchived = (params.includeArchived === "true");
      var bypassCache = (params.bypassCache === "true" || params.refresh === "true");
      responseData = getKpmMonitoringData(includeArchived, bypassCache, isIT);
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
      responseData = getUsersList(isIT);
    } else if (action === "cleanOrphanedAndTestRows") {
      responseData = cleanOrphanedRows();
    } else if (action === "runSystemDiagnostics") {
      responseData = runSystemDiagnostics();
    } else if (action === "checkArrivalStatus") {
      responseData = checkArrivalStatus(params, isIT);
    } else if (action === "checkDepartureStatus") {
      responseData = checkDepartureStatus(params, isIT);
    } else if (action === "stageDeparture") {
      responseData = stageDeparture(params);
    } else if (action === "confirmDepartureSecurity") {
      responseData = confirmDepartureSecurity(params);
    } else if (action === "rejectDepartureSecurity") {
      responseData = rejectDepartureSecurity(params);
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
    var allowedPostActions = ["createKpm", "archiveKpm", "updateStatus", "adminUpdateStatus", "editLatestKpmItems", "getMasterData", "getDeliveries", "getMonitoring", "login", "getUsersList", "saveUser", "toggleUserStatus", "runSystemDiagnostics", "stageArrival", "confirmArrivalReceipt", "getRecipients", "checkArrivalStatus", "resolveShortLink", "cleanOrphanedAndTestRows", "stageDeparture", "confirmDepartureSecurity", "rejectDepartureSecurity", "checkDepartureStatus", "searchMaterials", "setupMaterialDb"];
    if (allowedPostActions.indexOf(action) === -1) {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }
    lockAcquired = lock.tryLock(15000);
    if (!lockAcquired) {
      throw { code: "CONCURRENCY_ERROR", message: "Server sedang sibuk memproses permintaan lain. Harap coba beberapa saat lagi." };
    }

    var authInfo = authenticateRequest(params, action);
    var isIT = Boolean(authInfo && authInfo.isIT);

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
    } else if (action === "resolveShortLink") {
      resultData = resolveShortLink(params);
    } else if (action === "adminUpdateStatus") {
      resultData = adminUpdateStatus(params);
    } else if (action === "editLatestKpmItems") {
      resultData = editLatestKpmItems(params);
    } else if (action === "getMasterData") {
      resultData = getMasterData(isIT);
    } else if (action === "searchMaterials") {
      var q = params.query || params.q || "";
      var limit = parseInt(params.limit || "30", 10);
      resultData = searchMaterialDatabase(q, limit);
    } else if (action === "setupMaterialDb") {
      resultData = setupMaterialDatabaseImportRange();
    } else if (action === "getRecipients") {
      resultData = getRecipientsList(isIT);
    } else if (action === "getDeliveries") {
      resultData = getAvailableDeliveries(isIT);
    } else if (action === "getMonitoring") {
      var includeArchived = (params.includeArchived === "true");
      var bypassCache = (params.bypassCache === "true" || params.refresh === "true");
      resultData = getKpmMonitoringData(includeArchived, bypassCache, isIT);
    } else if (action === "login") {
      resultData = loginUser(params);
    } else if (action === "getUsersList") {
      resultData = getUsersList(isIT);
    } else if (action === "cleanOrphanedAndTestRows") {
      resultData = cleanOrphanedRows();
    } else if (action === "saveUser") {
      resultData = saveUser(params);
    } else if (action === "toggleUserStatus") {
      resultData = toggleUserStatus(params);
    } else if (action === "runSystemDiagnostics") {
      resultData = runSystemDiagnostics();
    } else if (action === "checkArrivalStatus") {
      resultData = checkArrivalStatus(params, isIT);
    } else if (action === "stageDeparture") {
      resultData = stageDeparture(params);
    } else if (action === "confirmDepartureSecurity") {
      resultData = confirmDepartureSecurity(params);
    } else if (action === "rejectDepartureSecurity") {
      resultData = rejectDepartureSecurity(params);
    } else if (action === "checkDepartureStatus") {
      resultData = checkDepartureStatus(params, isIT);
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
