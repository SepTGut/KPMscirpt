// ============================================
// WEB APP CONFIGURATION & CONSTANTS (WebConfig.gs)
// ============================================

var WEB_CONFIG = {
  VERSION: "1P-PROD",
  DEFAULT_FIREBASE_DB_URL: "https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app",
  DRIVE_FOLDER_NAME: "Bukti_Pengiriman_KPM",
  WORKSHOPS: ["Candi Sewu", "Tiron", "Sukosari", "Remul"],
  TEST_WORKSHOPS: ["Test0", "Test1"],
  PICS: ["AANG", "EKO", "RULI", "EGI", "NUGRAHA", "TAUFIQ"],
  TEST_PICS: ["IT", "ST"],
  TEST_DRIVERS: ["IT", "ST"],
  TEST_RECIPIENTS: ["IT", "ST"],
  UOMS: ["PCS", "M", "UNIT", "SET", "PSG", "SHT", "L", "ROLL", "STK"],
  MAX_PHOTO_BASE64_BYTES: 7000000, // ~5MB raw image
  ALLOWED_IMAGE_MIMES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  RECIPIENTS_SHEET_NAME: "Penerima",
  DEFAULT_RECIPIENTS: ["AANG", "EKO", "RULI", "EGI", "NUGRAHA", "TAUFIQ"],
  // Dynamic External Material Database (IMPORTRANGE source)
  MATERIAL_DB_URL: "https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit?gid=1881214309#gid=1881214309",
  MATERIAL_DB_SPREADSHEET_ID: "1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk",
  MATERIAL_DB_GID: "1881214309",
  MATERIAL_DB_SHEET_NAME: "DataBase",
  MATERIAL_DB_HEADER_ROW: 4,
  MATERIAL_DB_START_ROW: 5,
  MATERIAL_DB_RANGE: "DataBase!A:V",
  MATERIAL_DB_IMPORTRANGE_FORMULA: '=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit"; "DataBase!A:V")',
  // Dynamic External Arrival Log (Log Kedatangan IMPORTRANGE source)
  LOG_KEDATANGAN_URL: "https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit?gid=745488400#gid=745488400",
  LOG_KEDATANGAN_SPREADSHEET_ID: "1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk",
  LOG_KEDATANGAN_GID: "745488400",
  LOG_KEDATANGAN_SHEET_NAME: "Log Kedatangan",
  LOG_KEDATANGAN_SOURCE_SHEET_NAME: "Kedatangan Log 2026",
  LOG_KEDATANGAN_HEADER_ROW: 1,
  LOG_KEDATANGAN_START_ROW: 3,
  LOG_KEDATANGAN_RANGE: "'Kedatangan Log 2026'!A:N",
  LOG_KEDATANGAN_IMPORTRANGE_FORMULA: '=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit"; "\'Kedatangan Log 2026\'!A:N")',
  // Tokens must be configured in Apps Script Script Properties.
  DEFAULT_ADMIN_TOKEN: "",
  DEFAULT_DRIVER_TOKEN: ""
};

// ============================================
// 1. STATE MACHINE & STATUS DEFINITIONS
// ============================================

var KPM_STATUS = Object.freeze({
  BARU_DIBUAT: 'Baru Dibuat',
  BELUM_BERANGKAT: 'Belum Berangkat',
  BERANGKAT: 'Jalan',
  TIBA: 'Tiba',
  SELESAI: 'Selesai'
});

var STATUS_TRANSITIONS = Object.freeze({
  'Baru Dibuat': ['Belum Berangkat'],
  'Belum Berangkat': ['Jalan'],
  'Jalan': ['Tiba'],
  'Tiba': ['Selesai'],
  'Selesai': []
});

var STATUS_CODES = Object.freeze({
  'Baru Dibuat': 'BARU_DIBUAT',
  'Belum Berangkat': 'BELUM_BERANGKAT',
  'Jalan': 'BERANGKAT',
  'Tiba': 'TIBA',
  'Selesai': 'SELESAI'
});

var _STATUS_ALIASES = {
  'Baru Dibuat': KPM_STATUS.BARU_DIBUAT,
  'Belum Berangkat': KPM_STATUS.BELUM_BERANGKAT,
  'Berangkat': KPM_STATUS.BERANGKAT,
  'Jalan': KPM_STATUS.BERANGKAT,
  'Tiba': KPM_STATUS.TIBA,
  'Selesai': KPM_STATUS.SELESAI
};

/** Normalizes legacy spreadsheet/client labels to the current three-step flow. */
function normalizeKpmStatus(value) {
  var status = String(value || '').trim();
  return _STATUS_ALIASES[status] || status;
}

function isOneMinuteOld(timestamp) {
  var parts = String(timestamp || '').trim().split(/[\/ :]/);
  if (parts.length < 6) return false;
  var createdAt = new Date(
    Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]),
    Number(parts[3]), Number(parts[4]), Number(parts[5])
  );
  return !isNaN(createdAt.getTime()) && (new Date().getTime() - createdAt.getTime() >= 1 * 60 * 1000);
}

// ============================================
// 2. UNIFIED API RESPONSE HELPERS
// ============================================

function createSuccessResponse(action, data) {
  return {
    success: true,
    action: action || "",
    data: data || null,
    error: null
  };
}

function createErrorResponse(action, code, message) {
  return {
    success: false,
    action: action || "",
    data: null,
    error: {
      code: code || "SERVER_ERROR",
      message: message || "Terjadi kesalahan pada server."
    }
  };
}

/**
 * Sanitizes user-provided string inputs to prevent Spreadsheet Formula Injection.
 * Escapes characters (=, +, -, @, \t, \r) by prepending a single quote.
 */
function sanitizeSpreadsheetInput(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  var trimmed = value.trim();
  if (trimmed.length > 0 && /^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Calculates duration between two timestamp strings (dd/MM/yyyy HH:mm:ss).
 * Returns duration formatted as HH:mm:ss.
 */
function hitungDurasi(waktuAwal, waktuAkhir) {
  if (!waktuAwal || !waktuAkhir) return "";
  try {
    function parseDate(input) {
      if (!input) return null;
      var str = String(input).trim();
      var parts = str.split(" ");
      if (parts.length < 2) return null;
      var d = parts[0].split("/");
      var t = parts[1].split(":");
      return new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]);
    }

    var start = parseDate(waktuAwal);
    var end = parseDate(waktuAkhir);
    if (!start || !end) return "";
    var selisihMs = end.getTime() - start.getTime();
    if (selisihMs < 0 || isNaN(selisihMs)) return "";

    var jam = Math.floor(selisihMs / (1000 * 60 * 60));
    var menit = Math.floor((selisihMs % (1000 * 60 * 60)) / (1000 * 60));
    var detik = Math.floor((selisihMs % (1000 * 60)) / 1000);

    return (jam < 10 ? "0" + jam : jam) + ":" + (menit < 10 ? "0" + menit : menit) + ":" + (detik < 10 ? "0" + detik : detik);
  } catch (e) {
    return "";
  }
}

/**
 * Formats a raw date/time string (dd/MM/yyyy HH:mm:ss) to user-friendly "dd/MM/yyyy, HH:mm WIB"
 */
function formatWaktuDisplay(timestampStr) {
  if (!timestampStr || timestampStr === "-") return "Menunggu update...";
  var str = String(timestampStr).trim();
  var parts = str.split(/\s+/);
  if (parts.length > 1) {
    var time = parts[1].split(":");
    return parts[0] + ", " + (time[0] || "00") + ":" + (time[1] || "00") + " WIB";
  }
  return str;
}

/**
 * Extracts raw HTTP URL from a cell that may contain =HYPERLINK("...", "[Link]")
 */
function extractHyperlinkUrl(dispVal, formulaVal, rawVal) {
  if (formulaVal && formulaVal.indexOf("HYPERLINK") !== -1) {
    var match = formulaVal.match(/=HYPERLINK\(\s*"([^"]+)"/i);
    if (match) return match[1];
  }
  var rawStr = String(rawVal || "").trim();
  if (rawStr.indexOf("http") === 0) return rawStr;
  var dispStr = String(dispVal || "").trim();
  if (dispStr.indexOf("http") === 0) return dispStr;
  return "";
}

var _cachedSpreadsheetLocale = null;

/**
 * Creates standard =HYPERLINK("url", "[Link]") formula for setValues().
 * Range.setValues() in Apps Script is locale-invariant and strictly requires comma (,) as formula argument separator.
 */
function createHyperlinkFormula(url, label) {
  if (!url) return "";
  var cleanLabel = String(label || '[Link]').replace(/"/g, '""');
  return '=HYPERLINK("' + url + '", "' + cleanLabel + '")';
}

/**
 * Validates route/workshop string against WEB_CONFIG.WORKSHOPS (or with test workshops if allowTest is true).
 */
function validateWorkshopRoute(routeStr, allowTest) {
  if (!routeStr || typeof routeStr !== "string") {
    throw { code: "INVALID_LOCATION", message: "Lokasi workshop / rute wajib diisi." };
  }
  var cleanStr = routeStr.trim();
  var allowedWorkshops = allowTest
    ? WEB_CONFIG.WORKSHOPS.concat(WEB_CONFIG.TEST_WORKSHOPS || [])
    : WEB_CONFIG.WORKSHOPS;
  var separator = cleanStr.indexOf("➔") !== -1 ? "➔" : (cleanStr.indexOf("->") !== -1 ? "->" : "");
  if (separator) {
    var parts = cleanStr.split(separator);
    if (parts.length !== 2) {
      throw { code: "INVALID_LOCATION", message: "Rute workshop harus memiliki tepat satu lokasi awal dan satu lokasi tujuan." };
    }
    var origin = (parts[0] || "").trim();
    var dest = (parts[1] || "").trim();
    if (!origin || allowedWorkshops.indexOf(origin) === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi workshop awal '" + origin + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    if (!dest || allowedWorkshops.indexOf(dest) === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi workshop tujuan '" + dest + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    return origin + " ➔ " + dest;
  } else {
    if (allowedWorkshops.indexOf(cleanStr) === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi workshop '" + cleanStr + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    return cleanStr;
  }
}

/**
 * Checks if a given row/record belongs to testing data (Test0/Test1 or IT/ST).
 */
function isTestRecord(nomorKpm, origin, dest, pic, driver, penerima) {
  var n = String(nomorKpm || "").trim().toUpperCase();
  var o = String(origin || "").trim();
  var d = String(dest || "").trim();
  var p = String(pic || "").trim().toUpperCase();
  var drv = String(driver || "").trim().toUpperCase();
  var r = String(penerima || "").trim().toUpperCase();

  if (n.indexOf("TEST") !== -1) return true;
  if (o === "Test0" || o === "Test1" || d === "Test0" || d === "Test1") return true;
  if (p === "IT" || p === "ST") return true;
  if (drv === "IT" || drv === "ST") return true;
  if (r === "IT" || r === "ST") return true;
  return false;
}

