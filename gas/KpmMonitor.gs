// ============================================
// MONITORING & QUERY DOMAIN SERVICE (KpmMonitor.gs)
// ============================================

/**
 * Returns list of recipient names from sheet 'Penerima' with auto-creation & fallback.
 */
function getRecipientsList(isIT) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      var baseRecipients = (WEB_CONFIG.DEFAULT_RECIPIENTS || []).slice();
      return isIT ? baseRecipients.concat(WEB_CONFIG.TEST_RECIPIENTS || []) : baseRecipients;
    }
    var sheetName = WEB_CONFIG.RECIPIENTS_SHEET_NAME || "Penerima";
    var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("Recipients");
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1).setValue("Nama Penerima").setFontWeight("bold");
      var defaultRecipients = (WEB_CONFIG.DEFAULT_RECIPIENTS || []).map(function(name) { return [name]; });
      if (defaultRecipients.length > 0) {
        sheet.getRange(2, 1, defaultRecipients.length, 1).setValues(defaultRecipients);
      }
      SpreadsheetApp.flush();
      var base = (WEB_CONFIG.DEFAULT_RECIPIENTS || []).slice();
      return isIT ? base.concat(WEB_CONFIG.TEST_RECIPIENTS || []) : base;
    }
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      var defaultRecipients = (WEB_CONFIG.DEFAULT_RECIPIENTS || []).map(function(name) { return [name]; });
      if (defaultRecipients.length > 0) {
        sheet.getRange(2, 1, defaultRecipients.length, 1).setValues(defaultRecipients);
      }
      SpreadsheetApp.flush();
      var base = (WEB_CONFIG.DEFAULT_RECIPIENTS || []).slice();
      return isIT ? base.concat(WEB_CONFIG.TEST_RECIPIENTS || []) : base;
    }
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var recipients = [];
    for (var i = 0; i < values.length; i++) {
      var name = String(values[i][0] || "").trim();
      var upper = name.toUpperCase();
      // If not IT, strictly hide any test recipient like IT, ST, Test0, Test1
      if (!isIT && (upper === "IT" || upper === "ST" || upper === "TEST0" || upper === "TEST1")) {
        continue;
      }
      if (name && recipients.indexOf(name) === -1) {
        recipients.push(name);
      }
    }
    var finalRecipients = recipients.length > 0 ? recipients : (WEB_CONFIG.DEFAULT_RECIPIENTS || []).slice();
    if (isIT) {
      var testRecipients = WEB_CONFIG.TEST_RECIPIENTS || ["IT", "ST"];
      for (var t = 0; t < testRecipients.length; t++) {
        if (finalRecipients.indexOf(testRecipients[t]) === -1) {
          finalRecipients.push(testRecipients[t]);
        }
      }
    }
    return finalRecipients;
  } catch (e) {
    Logger.log("getRecipientsList error: " + e.message);
    var base = (WEB_CONFIG.DEFAULT_RECIPIENTS || []).slice();
    return isIT ? base.concat(WEB_CONFIG.TEST_RECIPIENTS || []) : base;
  }
}

/**
 * Explicit setup & initialization utility for sheet 'Penerima'.
 * Can be run manually from Apps Script Editor or the Sheets Custom Menu.
 */
function setupRecipientsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Tidak ada spreadsheet aktif.");
  var sheetName = (typeof WEB_CONFIG !== 'undefined' && WEB_CONFIG.RECIPIENTS_SHEET_NAME) ? WEB_CONFIG.RECIPIENTS_SHEET_NAME : "Penerima";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var headers = [["Nama Penerima"]];
  sheet.getRange(1, 1).setValue("Nama Penerima").setFontWeight("bold").setBackground("#e8f0fe");
  sheet.setFrozenRows(1);

  var defaultRecipients = (typeof WEB_CONFIG !== 'undefined' && WEB_CONFIG.DEFAULT_RECIPIENTS) 
    ? WEB_CONFIG.DEFAULT_RECIPIENTS 
    : ["AANG", "EKO", "RULI", "EGI", "NUGRAHA", "TAUFIQ"];

  var currentValues = sheet.getLastRow() >= 2 
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0] || "").trim(); })
    : [];

  var rowsToAdd = [];
  for (var i = 0; i < defaultRecipients.length; i++) {
    if (currentValues.indexOf(defaultRecipients[i]) === -1) {
      rowsToAdd.push([defaultRecipients[i]]);
    }
  }

  if (rowsToAdd.length > 0) {
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, rowsToAdd.length, 1).setValues(rowsToAdd);
  }

  return sheet;
}

/**
 * Returns centralized master data for dropdowns, forms, and client config.
 * Filtered so non-IT accounts NEVER see Test0, Test1, or IT/ST.
 */
function getMasterData(isIT) {
  var fbConfig = (typeof getFirebaseConfig === "function") ? getFirebaseConfig() : { firebaseDbUrl: WEB_CONFIG.DEFAULT_FIREBASE_DB_URL };
  var workshops = (isIT && WEB_CONFIG.TEST_WORKSHOPS)
    ? WEB_CONFIG.WORKSHOPS.concat(WEB_CONFIG.TEST_WORKSHOPS)
    : WEB_CONFIG.WORKSHOPS.slice();
  var pics = (isIT && WEB_CONFIG.TEST_PICS)
    ? WEB_CONFIG.PICS.concat(WEB_CONFIG.TEST_PICS)
    : WEB_CONFIG.PICS.slice();
  var recipients = getRecipientsList(Boolean(isIT));
  var drivers = isIT ? (WEB_CONFIG.TEST_DRIVERS || ["IT", "ST"]) : [];

  return {
    version: (typeof ABOUT_CONFIG !== 'undefined' ? ABOUT_CONFIG.VERSION : '1P'),
    isIT: Boolean(isIT),
    workshops: workshops,
    pics: pics,
    drivers: drivers,
    uoms: WEB_CONFIG.UOMS,
    statuses: [KPM_STATUS.BARU_DIBUAT, KPM_STATUS.BELUM_BERANGKAT, KPM_STATUS.BERANGKAT, KPM_STATUS.TIBA, KPM_STATUS.SELESAI],
    statusCodes: STATUS_CODES,
    recipients: recipients,
    firebaseDbUrl: fbConfig.firebaseDbUrl
  };
}

/**
 * Chunked caching helpers to safely store large responses (>100KB) in ScriptCache.
 */
function putMonitoringCache(keyPrefix, jsonString, ttlSeconds) {
  try {
    var cache = CacheService.getScriptCache();
    var chunkSize = 90000;
    var totalChunks = Math.ceil(jsonString.length / chunkSize);
    var batch = {};
    batch[keyPrefix + "_count"] = String(totalChunks);
    for (var i = 0; i < totalChunks; i++) {
      batch[keyPrefix + "_" + i] = jsonString.substr(i * chunkSize, chunkSize);
    }
    cache.putAll(batch, ttlSeconds || 60);
  } catch (e) {
    Logger.log("putMonitoringCache notice: " + e.message);
  }
}

function getMonitoringCache(keyPrefix) {
  try {
    var cache = CacheService.getScriptCache();
    var countStr = cache.get(keyPrefix + "_count");
    if (!countStr) return null;
    var totalChunks = parseInt(countStr, 10);
    if (isNaN(totalChunks) || totalChunks <= 0) return null;

    var keys = [];
    for (var i = 0; i < totalChunks; i++) {
      keys.push(keyPrefix + "_" + i);
    }
    var chunks = cache.getAll(keys);
    var combined = "";
    for (var j = 0; j < totalChunks; j++) {
      var part = chunks[keyPrefix + "_" + j];
      if (part === undefined || part === null) return null;
      combined += part;
    }
    return combined;
  } catch (e) {
    Logger.log("getMonitoringCache notice: " + e.message);
    return null;
  }
}

function invalidateMonitoringCache() {
  try {
    var cache = CacheService.getScriptCache();
    var keysToRemove = [
      "MONITORING_ACTIVE_count",
      "MONITORING_ALL_count",
      "MONITORING_IT_ACTIVE_count",
      "MONITORING_IT_ALL_count"
    ];
    for (var i = 0; i < 15; i++) {
      keysToRemove.push("MONITORING_ACTIVE_" + i);
      keysToRemove.push("MONITORING_ALL_" + i);
      keysToRemove.push("MONITORING_IT_ACTIVE_" + i);
      keysToRemove.push("MONITORING_IT_ALL_" + i);
    }
    cache.removeAll(keysToRemove);
  } catch (e) { }
}

/**
 * Reads sheet and produces fully server-computed KPM monitoring objects.
 * Decouples business data (status, progress percent, dates) from UI presentation.
 * Excludes Test0/Test1/IT/ST records completely if isIT is false.
 */
function getKpmMonitoringData(includeArchived, bypassCache, isIT) {
  var cacheKey = isIT
    ? (includeArchived ? "MONITORING_IT_ALL" : "MONITORING_IT_ACTIVE")
    : (includeArchived ? "MONITORING_ALL" : "MONITORING_ACTIVE");
  if (!bypassCache) {
    var cached = getMonitoringCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { }
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getMonitoringSheet(ss);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < MONITOR_START_ROW) return [];

  var numRows = lastRow - MONITOR_START_ROW + 1;
  var range = sheet.getRange(MONITOR_START_ROW, 1, numRows, MONITOR_TOTAL_COLS);
  var displayData = range.getDisplayValues();
  // Fetch formulas for photo & GPS Track & recipient photo columns (Cols X, Y, Z, AA, AB: 5 columns)
  var photoAndGpsFormulas = sheet.getRange(MONITOR_START_ROW, MONITOR_COL_FOTO_BER, numRows, 5).getFormulas();
  var kpmMap = {};

  var lastSeenKpm = "";
  var lastSeenPic = "";
  var lastSeenDriver = "";
  var lastSeenProyek = "";
  var lastSeenWsAwal = "";
  var lastSeenWsTujuan = "";
  var lastSeenWaktuBuat = "";
  var lastSeenWaktuBer = "";
  var lastSeenWaktuTib = "";
  var lastSeenDurasi = "";
  var lastSeenStatus = "";
  var lastSeenBuktiBer = "";
  var lastSeenBuktiTib = "";
  var lastSeenGpsTrack = "";
  var lastSeenPenerima = "";
  var lastSeenBuktiDiterima = "";

  var pendingStatusRowUpdates = [];

  for (var i = 0; i < displayData.length; i++) {
    var row = displayData[i];
    var rawKpm = String(row[MONITOR_COL_NOLF - 1] || "").trim();
    var spek = String(row[MONITOR_COL_SPEK - 1] || "").trim();
    var kode = String(row[MONITOR_COL_KODE - 1] || "").trim();
    var barang = spek || kode;
    var qty = String(row[MONITOR_COL_QTY - 1] || "").trim();
    var uom = String(row[MONITOR_COL_UOM - 1] || "").trim();

    if (rawKpm) {
      lastSeenKpm = rawKpm;
      lastSeenPic = String(row[MONITOR_COL_PIC - 1] || "").trim();
      lastSeenDriver = String(row[MONITOR_COL_DRIVER - 1] || "").trim();
      lastSeenProyek = String(row[MONITOR_COL_PROYEK - 1] || "").trim();
      lastSeenWaktuBuat = String(row[MONITOR_COL_POST_DATE - 1] || "").trim();
      lastSeenWaktuBer = String(row[MONITOR_COL_WKT_BERANGKAT - 1] || "").trim();
      lastSeenWaktuTib = String(row[MONITOR_COL_WKT_TIBA - 1] || "").trim();
      lastSeenDurasi = String(row[MONITOR_COL_DURASI - 1] || "").trim();

      var rawStatus = String(row[MONITOR_COL_STATUS - 1] || '').trim();
      var statusAkhir = normalizeKpmStatus(rawStatus);
      if (!statusAkhir) statusAkhir = KPM_STATUS.BARU_DIBUAT;
      lastSeenStatus = statusAkhir;

      var wsAwal = String(row[MONITOR_COL_WSAWAL - 1] || "").trim();
      var wsTujuan = String(row[MONITOR_COL_WSTUJUAN - 1] || "").trim();
      if (!wsTujuan) {
        var legacySeparator = wsAwal.indexOf("➔") !== -1 ? "➔" : (wsAwal.indexOf("->") !== -1 ? "->" : "");
        if (legacySeparator) {
          var legacyRoute = wsAwal.split(legacySeparator);
          if (legacyRoute.length === 2) {
            wsAwal = legacyRoute[0].trim();
            wsTujuan = legacyRoute[1].trim();
          }
        }
      }
      lastSeenWsAwal = wsAwal;
      lastSeenWsTujuan = wsTujuan;

      lastSeenBuktiBer = extractHyperlinkUrl(
        displayData[i][MONITOR_COL_FOTO_BER - 1],
        photoAndGpsFormulas[i][0],
        displayData[i][MONITOR_COL_FOTO_BER - 1]
      );
      lastSeenBuktiTib = extractHyperlinkUrl(
        displayData[i][MONITOR_COL_FOTO_TIB - 1],
        photoAndGpsFormulas[i][1],
        displayData[i][MONITOR_COL_FOTO_TIB - 1]
      );
      lastSeenGpsTrack = extractHyperlinkUrl(
        displayData[i][MONITOR_COL_GPS_TRACK - 1],
        photoAndGpsFormulas[i][2],
        displayData[i][MONITOR_COL_GPS_TRACK - 1]
      );
      lastSeenPenerima = String(row[MONITOR_COL_PENERIMA - 1] || "").trim();
      lastSeenBuktiDiterima = extractHyperlinkUrl(
        displayData[i][MONITOR_COL_FOTO_DITERIMA - 1],
        photoAndGpsFormulas[i][4],
        displayData[i][MONITOR_COL_FOTO_DITERIMA - 1]
      );
    }

    var kpm = rawKpm || (barang ? lastSeenKpm : "");
    if (!kpm) continue;

    var penerima = String(row[MONITOR_COL_PENERIMA - 1] || "").trim() || lastSeenPenerima;

    var statusAkhir = lastSeenStatus || KPM_STATUS.BARU_DIBUAT;
    var currentCellStatus = normalizeKpmStatus(row[MONITOR_COL_STATUS - 1]);
    if (barang && currentCellStatus !== statusAkhir) {
      pendingStatusRowUpdates.push({ rowIndex: i, status: statusAkhir });
    }
    var wsAwal = String(row[MONITOR_COL_WSAWAL - 1] || "").trim() || lastSeenWsAwal;
    var wsTujuan = String(row[MONITOR_COL_WSTUJUAN - 1] || "").trim() || lastSeenWsTujuan;
    var lokasi = wsAwal && wsTujuan ? wsAwal + " ➔ " + wsTujuan : (wsAwal || wsTujuan);
    var buktiBerangkat = extractHyperlinkUrl(
      displayData[i][MONITOR_COL_FOTO_BER - 1],
      photoAndGpsFormulas[i][0],
      displayData[i][MONITOR_COL_FOTO_BER - 1]
    ) || lastSeenBuktiBer;
    var buktiTiba = extractHyperlinkUrl(
      displayData[i][MONITOR_COL_FOTO_TIB - 1],
      photoAndGpsFormulas[i][1],
      displayData[i][MONITOR_COL_FOTO_TIB - 1]
    ) || lastSeenBuktiTib;
    var gpsTrack = extractHyperlinkUrl(
      displayData[i][MONITOR_COL_GPS_TRACK - 1],
      photoAndGpsFormulas[i][2],
      displayData[i][MONITOR_COL_GPS_TRACK - 1]
    ) || lastSeenGpsTrack;
    var buktiDiterima = extractHyperlinkUrl(
      displayData[i][MONITOR_COL_FOTO_DITERIMA - 1],
      photoAndGpsFormulas[i][4],
      displayData[i][MONITOR_COL_FOTO_DITERIMA - 1]
    ) || lastSeenBuktiDiterima;

    var isTest = (typeof isTestRecord === 'function')
      ? isTestRecord(kpm, wsAwal, wsTujuan, lastSeenPic, lastSeenDriver, penerima)
      : false;

    // Strict cloaking: non-IT users NEVER see test records
    if (!isIT && isTest) continue;

    var isArchived = (statusAkhir === KPM_STATUS.SELESAI || statusAkhir.toLowerCase() === "selesai");
    if (!includeArchived && isArchived) continue;

    if (!kpmMap[kpm]) {
      var isDeparted = (statusAkhir === KPM_STATUS.BERANGKAT || statusAkhir === KPM_STATUS.TIBA || statusAkhir === KPM_STATUS.SELESAI);
      var isArrived = (statusAkhir === KPM_STATUS.TIBA || statusAkhir === KPM_STATUS.SELESAI);
      var statusCode = STATUS_CODES[statusAkhir] || "BARU_DIBUAT";
      var fillPercent = isArrived ? 100 : (isDeparted ? 50 : 0);

      kpmMap[kpm] = {
        kpmId: kpm,
        nomor: kpm,
        pic: lastSeenPic,
        driver: lastSeenDriver,
        status: statusAkhir,
        statusCode: statusCode,
        lokasi: lokasi,
        lokasiBerangkat: wsAwal,
        lokasiTiba: wsTujuan,
        proyek: lastSeenProyek,
        createdAt: lastSeenWaktuBuat,
        createdAtFormatted: formatWaktuDisplay(lastSeenWaktuBuat),
        departureAt: lastSeenWaktuBer,
        departureAtFormatted: formatWaktuDisplay(lastSeenWaktuBer),
        arrivalAt: lastSeenWaktuTib,
        arrivalAtFormatted: formatWaktuDisplay(lastSeenWaktuTib),
        duration: lastSeenDurasi,
        fillPercent: fillPercent,
        isDeparted: isDeparted,
        isArrived: isArrived,
        buktiBerangkat: buktiBerangkat,
        buktiTiba: buktiTiba,
        gpsTrack: gpsTrack,
        penerima: penerima,
        buktiDiterima: buktiDiterima,
        isTest: isTest,
        daftarBarang: []
      };
    }

    if (barang) {
      kpmMap[kpm].daftarBarang.push({ nama: barang, qty: qty, uom: uom });
    }
  }

  if (pendingStatusRowUpdates.length > 0) {
    try {
      var minPendIdx = pendingStatusRowUpdates[0].rowIndex;
      var maxPendIdx = pendingStatusRowUpdates[pendingStatusRowUpdates.length - 1].rowIndex;
      var pendSliceLen = maxPendIdx - minPendIdx + 1;
      var statusSlice = sheet.getRange(MONITOR_START_ROW + minPendIdx, MONITOR_COL_STATUS, pendSliceLen, 1).getValues();
      for (var u = 0; u < pendingStatusRowUpdates.length; u++) {
        var localIdx = pendingStatusRowUpdates[u].rowIndex - minPendIdx;
        statusSlice[localIdx][0] = pendingStatusRowUpdates[u].status;
      }
      sheet.getRange(MONITOR_START_ROW + minPendIdx, MONITOR_COL_STATUS, pendSliceLen, 1).setValues(statusSlice);
    } catch (e) {
      Logger.log("Batch status update error: " + e.message);
    }
  }

  var listKPM = [];
  for (var key in kpmMap) {
    listKPM.push(kpmMap[key]);
  }
  listKPM.reverse();
  if (listKPM.length > 0) {
    listKPM[0].isLatest = true;
  }

  putMonitoringCache(cacheKey, JSON.stringify(listKPM), 60);
  return listKPM;
}

/**
 * Returns active KPMs decorated with server-directed nextAction and requirements.
 * Excludes test records for non-IT users.
 */
function getAvailableDeliveries(isIT) {
  var allKpm = getKpmMonitoringData(false, false, Boolean(isIT));
  var available = [];

  for (var i = 0; i < allKpm.length; i++) {
    var item = allKpm[i];
    if (!isIT && item.isTest) continue;
    if (item.status !== KPM_STATUS.BARU_DIBUAT && item.status !== KPM_STATUS.TIBA && item.status !== KPM_STATUS.SELESAI) {
      var allowedNext = STATUS_TRANSITIONS[item.status] || [];
      var nextAction = allowedNext.length > 0 ? allowedNext[0] : "";
      var nextActionCode = STATUS_CODES[nextAction] || "";

      available.push({
        kpmId: item.nomor,
        nomor: item.nomor,
        proyek: item.proyek,
        lokasi: item.lokasi,
        lokasiBerangkat: item.lokasiBerangkat,
        lokasiTiba: item.lokasiTiba,
        pic: item.pic,
        driver: item.driver || "",
        currentStatus: item.status,
        statusCode: item.statusCode,
        nextAction: nextAction,
        nextActionCode: nextActionCode,
        requiresPhoto: false,
        photoLabel: (nextAction === KPM_STATUS.BERANGKAT)
          ? "📷 Unggah Bukti Foto Keberangkatan (Opsional):"
          : "📷 Unggah Bukti Foto Ketibaan (Opsional):",
        daftarBarang: item.daftarBarang,
        isTest: item.isTest
      });
    }
  }

  return available;
}
