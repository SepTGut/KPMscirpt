// ============================================
// WEB APP CONFIGURATION & CONSTANTS (WebConfig.gs)
// ============================================

var WEB_CONFIG = {
  VERSION: "2026.2.0-ULTRA",
  DEFAULT_FIREBASE_DB_URL: "https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app",
  DRIVE_FOLDER_NAME: "Bukti_Pengiriman_KPM",
  WORKSHOPS: ["Candi Sewu", "Tiron", "Sukosari", "Remul"],
  PICS: ["AANG", "EKO", "RULI", "EGI", "NUGRAHA", "TAUFIQ"],
  UOMS: ["PCS", "M", "UNIT", "SET", "PSG", "SHT", "L", "ROLL", "STK"],
  MAX_PHOTO_BASE64_BYTES: 7000000, // ~5MB raw image
  ALLOWED_IMAGE_MIMES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  RECIPIENTS_SHEET_NAME: "Penerima",
  DEFAULT_RECIPIENTS: ["AANG", "EKO", "RULI", "EGI", "NUGRAHA", "TAUFIQ"],
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
 * Creates locale-aware =HYPERLINK("url"; "[Link]") formula for setValues().
 * Uses semicolon (;) for Indonesian and comma (,) for US English locales.
 * Caches the locale to avoid repeated getSpreadsheetLocale() calls in batch loops.
 */
function createHyperlinkFormula(url, label) {
  if (!url) return "";
  if (_cachedSpreadsheetLocale === null) {
    try {
      _cachedSpreadsheetLocale = (SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetLocale() || "").toLowerCase();
    } catch (e) {
      _cachedSpreadsheetLocale = "";
    }
  }
  var loc = _cachedSpreadsheetLocale;
  // Indonesia, German, French, Spanish, Italian use semicolon formula separator
  var isSemicolon = (!loc || loc.indexOf("id") === 0 || loc.indexOf("in") === 0 || loc.indexOf("de") === 0 || loc.indexOf("fr") === 0 || loc.indexOf("es") === 0 || loc.indexOf("it") === 0);
  var sep = isSemicolon ? ";" : ",";
  return '=HYPERLINK("' + url + '"' + sep + ' "' + (label || '[Link]') + '")';
}

/**
 * Validates route/workshop string against WEB_CONFIG.WORKSHOPS.
 */
function validateWorkshopRoute(routeStr) {
  if (!routeStr || typeof routeStr !== "string") {
    throw { code: "INVALID_LOCATION", message: "Lokasi workshop / rute wajib diisi." };
  }
  var cleanStr = routeStr.trim();
  var separator = cleanStr.indexOf("➔") !== -1 ? "➔" : (cleanStr.indexOf("->") !== -1 ? "->" : "");
  if (separator) {
    var parts = cleanStr.split(separator);
    if (parts.length !== 2) {
      throw { code: "INVALID_LOCATION", message: "Rute workshop harus memiliki tepat satu lokasi awal dan satu lokasi tujuan." };
    }
    var origin = (parts[0] || "").trim();
    var dest = (parts[1] || "").trim();
    if (!origin || WEB_CONFIG.WORKSHOPS.indexOf(origin) === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi workshop awal '" + origin + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    if (!dest || WEB_CONFIG.WORKSHOPS.indexOf(dest) === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi workshop tujuan '" + dest + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    return origin + " ➔ " + dest;
  } else {
    if (WEB_CONFIG.WORKSHOPS.indexOf(cleanStr) === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi workshop '" + cleanStr + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    return cleanStr;
  }
}
