// ============================================
// SHORT LINK ENGINE FOR RECIPIENT QR CODES (ShortLink.gs)
// ============================================
// Creates ultra-compact URLs (~38 chars) for physical QR printing.
// Architecture:
// 1. Primary: Firebase Realtime Database (/short_links/{shortId}) for sub-second lookup.
// 2. Direct Fallback: Clean deterministic slugs (e.g., /r/k001).
// 3. Redundancy: Local spreadsheet sheet "ShortLinks" for offline/cold fallback.

var SHORTLINKS_SHEET_NAME = "ShortLinks";
var WEB_APP_BASE_URL = "https://lnfd.vercel.app";

/**
 * Creates or retrieves a compact short URL for a given KPM number.
 * Returns e.g. "https://lnfd.vercel.app/r/k001"
 */
function createShortRecipientLink(nomorKPM) {
  if (!nomorKPM || String(nomorKPM).trim() === "") {
    return WEB_APP_BASE_URL + "/kpm/confirm";
  }

  var rawKpm = String(nomorKPM).trim();
  
  // 1. Generate clean, predictable short ID based on the KPM sequence
  // e.g. "001/PPO/LF/IX/2026" -> "k001"
  var numMatch = rawKpm.match(/(\d+)/);
  var seqPart = numMatch ? numMatch[1] : "";
  var shortId = "";
  
  if (seqPart) {
    shortId = "k" + seqPart.toLowerCase();
  } else {
    // Fallback: 5-character alphanumeric hash from KPM string
    var cleanStr = rawKpm.replace(/[^a-zA-Z0-9]/g, "");
    shortId = "k" + (cleanStr.substring(0, 4) || "001").toLowerCase();
  }

  var recordPayload = {
    nomorKPM: rawKpm,
    shortId: shortId,
    createdAt: new Date().toISOString()
  };

  // 2. Write to Firebase Realtime Database (Primary ultra-fast resolver)
  try {
    var fbConfig = (typeof getFirebaseConfig === 'function') ? getFirebaseConfig() : { firebaseDbUrl: WEB_CONFIG.DEFAULT_FIREBASE_DB_URL };
    var fbUrl = fbConfig.firebaseDbUrl;
    if (fbUrl) {
      var endpoint = fbUrl.replace(/\/+$/, '') + "/short_links/" + encodeURIComponent(shortId) + ".json";
      UrlFetchApp.fetch(endpoint, {
        method: "put",
        contentType: "application/json",
        payload: JSON.stringify(recordPayload),
        muteHttpExceptions: true
      });
    }
  } catch (fbErr) {
    Logger.log("Firebase short link write notice: " + fbErr.message);
  }

  // 3. Write to Google Sheets backup sheet (Secondary redundancy)
  try {
    saveShortLinkToSheet(shortId, rawKpm);
  } catch (sheetErr) {
    Logger.log("Sheet short link write notice: " + sheetErr.message);
  }

  return WEB_APP_BASE_URL + "/r/" + shortId;
}

/**
 * Creates or retrieves a compact short URL for Security Gate inspection.
 * Returns e.g. "https://lnfd.vercel.app/s/k001"
 */
function createShortSecurityLink(nomorKPM) {
  if (!nomorKPM || String(nomorKPM).trim() === "") {
    return WEB_APP_BASE_URL + "/kpm/gate";
  }

  var rawKpm = String(nomorKPM).trim();
  var numMatch = rawKpm.match(/(\d+)/);
  var seqPart = numMatch ? numMatch[1] : "";
  var shortId = "";

  if (seqPart) {
    shortId = "s" + seqPart.toLowerCase();
  } else {
    var cleanStr = rawKpm.replace(/[^a-zA-Z0-9]/g, "");
    shortId = "s" + (cleanStr.substring(0, 4) || "001").toLowerCase();
  }

  var recordPayload = {
    nomorKPM: rawKpm,
    shortId: shortId,
    type: "security_gate",
    createdAt: new Date().toISOString()
  };

  try {
    var fbConfig = (typeof getFirebaseConfig === 'function') ? getFirebaseConfig() : { firebaseDbUrl: WEB_CONFIG.DEFAULT_FIREBASE_DB_URL };
    var fbUrl = fbConfig.firebaseDbUrl;
    if (fbUrl) {
      var endpoint = fbUrl.replace(/\/+$/, '') + "/short_links/" + encodeURIComponent(shortId) + ".json";
      UrlFetchApp.fetch(endpoint, {
        method: "put",
        contentType: "application/json",
        payload: JSON.stringify(recordPayload),
        muteHttpExceptions: true
      });
    }
  } catch (fbErr) {
    Logger.log("Firebase security short link write notice: " + fbErr.message);
  }

  try {
    saveShortLinkToSheet(shortId, rawKpm);
  } catch (sheetErr) {
    Logger.log("Sheet security short link write notice: " + sheetErr.message);
  }

  return WEB_APP_BASE_URL + "/s/" + shortId;
}

/**
 * Resolves a short ID back to the full KPM number.
 * Checks Firebase RTDB first, then Google Sheets backup sheet.
 */
function resolveShortLink(params) {
  var shortId = (params && (params.shortId || params.id || params.code)) ? String(params.shortId || params.id || params.code).trim().toLowerCase() : "";
  if (!shortId) {
    throw { code: "INVALID_INPUT", message: "Short ID wajib disertakan." };
  }

  // 1. Check Firebase Realtime Database
  try {
    var fbConfig = (typeof getFirebaseConfig === 'function') ? getFirebaseConfig() : { firebaseDbUrl: WEB_CONFIG.DEFAULT_FIREBASE_DB_URL };
    var fbUrl = fbConfig.firebaseDbUrl;
    if (fbUrl) {
      var endpoint = fbUrl.replace(/\/+$/, '') + "/short_links/" + encodeURIComponent(shortId) + ".json";
      var res = UrlFetchApp.fetch(endpoint, { method: "get", muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        var data = JSON.parse(res.getContentText());
        if (data && data.nomorKPM) {
          return {
            shortId: shortId,
            nomorKPM: data.nomorKPM,
            source: "firebase"
          };
        }
      }
    }
  } catch (fbErr) {
    Logger.log("resolveShortLink Firebase error: " + fbErr.message);
  }

  // 2. Check Spreadsheet backup sheet
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHORTLINKS_SHEET_NAME);
    if (sheet && sheet.getLastRow() >= 2) {
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === shortId) {
          return {
            shortId: shortId,
            nomorKPM: String(data[i][1]).trim(),
            source: "spreadsheet"
          };
        }
      }
    }
  } catch (sheetErr) {
    Logger.log("resolveShortLink Spreadsheet error: " + sheetErr.message);
  }

  // 3. Fallback: Check active monitoring sheet for matching sequence number
  try {
    var allKpm = getKpmMonitoringData(true, false, true);
    for (var m = 0; m < allKpm.length; m++) {
      var kpmNum = allKpm[m].nomor || allKpm[m].kpmId || "";
      var numMatch = kpmNum.match(/(\d+)/);
      if (numMatch && ("k" + numMatch[1].toLowerCase()) === shortId) {
        return {
          shortId: shortId,
          nomorKPM: kpmNum,
          source: "monitor_scan"
        };
      }
    }
  } catch (scanErr) {}

  throw { code: "NOT_FOUND", message: "Short link '" + shortId + "' tidak ditemukan." };
}

/**
 * Initializes or updates the ShortLinks backup sheet.
 */
function setupShortLinksSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHORTLINKS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHORTLINKS_SHEET_NAME);
    var headers = [["Short ID", "Nomor KPM", "Dibuat Pada"]];
    sheet.getRange(1, 1, 1, 3).setValues(headers);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(1);
    try {
      sheet.hideSheet(); // Keep workbook tidy as background sheet
    } catch (e) {}
  }
  return sheet;
}

/**
 * Appends or updates a short ID record in the backup sheet.
 */
function saveShortLinkToSheet(shortId, nomorKPM) {
  var sheet = setupShortLinksSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim().toLowerCase() === shortId.toLowerCase()) {
        // Already recorded
        return;
      }
    }
  }
  sheet.appendRow([shortId, nomorKPM, new Date().toISOString()]);
}

/**
 * Strips http:// or https:// from a URL for clean visual display / human-readable text.
 */
function stripProtocol(url) {
  if (!url) return "";
  return String(url).replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
