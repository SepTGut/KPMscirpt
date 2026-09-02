// ============================================
// GPS TRACKING & LOG RETENTION ENGINE (Gps.gs)
// ============================================
// Dedicated module for GPS coordinate links, Google Maps Router,
// Firebase Realtime DB configuration, and T.Log automated archiving.

/**
 * Resolves Firebase Realtime Database URL from ScriptProperties or default configuration.
 */
function getFirebaseConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    firebaseDbUrl: props.getProperty("FIREBASE_DB_URL") || (typeof WEB_CONFIG !== 'undefined' ? WEB_CONFIG.DEFAULT_FIREBASE_DB_URL : "") || ""
  };
}

/**
 * Generates Google Maps Point/Live location URL
 */
function createGpsLiveUrl(coordStr) {
  if (!coordStr) return "";
  return "https://www.google.com/maps?q=" + encodeURIComponent(String(coordStr).trim());
}

/**
 * Generates Google Maps Driving Route (Router / Directions) URL between two points
 */
function createGpsRouterUrl(originCoord, destCoord) {
  if (!destCoord) return "";
  if (!originCoord) return createGpsLiveUrl(destCoord);
  return "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(String(originCoord).trim()) + "&destination=" + encodeURIComponent(String(destCoord).trim()) + "&travelmode=driving";
}

/**
 * Extracts coordinate pair (latitude,longitude) from a stored Google Maps URL
 */
function extractCoordinatesFromUrl(url) {
  if (!url) return "";
  var match = String(url).match(/q=([^&"'\s\)]+)/i);
  if (match) return match[1];
  var destMatch = String(url).match(/destination=([^&"'\s\)]+)/i);
  if (destMatch) return destMatch[1];
  return "";
}

/**
 * Initializes and formats the T.Log sheet for cold retention archiving.
 */
function setupTLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = typeof TLOG_SHEET_NAME !== 'undefined' ? TLOG_SHEET_NAME : "T.Log";
  var tlogSheet = ss.getSheetByName(sheetName);
  if (!tlogSheet) {
    tlogSheet = ss.insertSheet(sheetName);
  }
  var headers = [
    ["No", "Tanggal", "No LF / KPM", "Driver", "PIC", "Proyek", "Rute Asal ➔ Tujuan", "Waktu Berangkat", "Waktu Tiba", "Durasi", "GPS Track Router", "Foto Berangkat", "Foto Tiba", "Arsip Pada"]
  ];
  tlogSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  tlogSheet.getRange(1, 1, 1, headers[0].length).setFontWeight("bold").setBackground("#e8f0fe");
  tlogSheet.setFrozenRows(1);
  return tlogSheet;
}

/**
 * Appends a completed delivery trip record into the T.Log sheet.
 */
function appendTLogRecord(record) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = typeof TLOG_SHEET_NAME !== 'undefined' ? TLOG_SHEET_NAME : "T.Log";
    var sheet = ss.getSheetByName(sheetName) || setupTLogSheet();
    var lastRow = sheet.getLastRow();
    var nextNo = Math.max(1, lastRow);
    var row = [
      nextNo,
      record.tanggal || "",
      record.nomorKPM || "",
      record.driver || "",
      record.pic || "",
      record.proyek || "",
      record.rute || "",
      record.waktuBerangkat || "",
      record.waktuTiba || "",
      record.durasi || "",
      record.gpsTrack ? createHyperlinkFormula(record.gpsTrack, "🗺️ Buka Rute Maps") : "",
      record.fotoBerangkat ? createHyperlinkFormula(record.fotoBerangkat, "📷 Foto Asal") : "",
      record.fotoTiba ? createHyperlinkFormula(record.fotoTiba, "📷 Foto Tiba") : "",
      Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss")
    ];
    sheet.appendRow(row);
  } catch (err) {
    Logger.log("appendTLogRecord error: " + err.message);
  }
}

/**
 * Automatically sets up tracking column headers on row 8 of "KPM Monitor 2026".
 */
function setupTrackingHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    if (typeof SpreadsheetApp.getUi === "function") {
      SpreadsheetApp.getUi().alert("Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan.");
    }
    return;
  }

  var headers = [
    ["Driver", "Waktu Berangkat", "Waktu Tiba", "Durasi", "Status Tracking", "Foto Berangkat", "Foto Tiba", "GPS Track"]
  ];

  sheet.getRange(MONITOR_HEADER_ROW, MONITOR_COL_DRIVER, 1, 8).setValues(headers);

  // Keep the visible tracking choices limited to the tracking states.
  var statusValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      KPM_STATUS.BARU_DIBUAT,
      KPM_STATUS.BELUM_BERANGKAT,
      KPM_STATUS.BERANGKAT,
      KPM_STATUS.TIBA,
      KPM_STATUS.SELESAI
    ], true)
    .setAllowInvalid(true)
    .build();
  var statusRowCount = Math.max(1, sheet.getMaxRows() - MONITOR_START_ROW + 1);
  sheet.getRange(MONITOR_START_ROW, MONITOR_COL_STATUS, statusRowCount, 1)
    .setDataValidation(statusValidation);

  // Ensure T.Log sheet is also set up
  setupTLogSheet();

  if (typeof SpreadsheetApp.getUi === "function") {
    SpreadsheetApp.getUi().alert("Setup Selesai: Kolom Tracking S hingga Z (Driver, Waktu Berangkat, Waktu Tiba, Durasi, Status, Foto Berangkat, Foto Tiba, GPS Track) dan Sheet T.Log telah dikonfigurasi.");
  }
}
