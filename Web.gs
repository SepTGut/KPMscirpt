// ============================================
// WEB APP CONTROLLER & BUSINESS LOGIC (Web.gs)
// ============================================
// Single Source of Truth for KPM/LF Web System (Admin & Driver/User)

var WEB_CONFIG = {
  VERSION: "2026.2.0-ULTRA",
  DEFAULT_FIREBASE_DB_URL: "https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app",
  DRIVE_FOLDER_NAME: "Bukti_Pengiriman_KPM",
  WORKSHOPS: ["Candi Sewu", "Tiron", "Sukosari", "Remul"],
  PICS: ["AANG", "EKO", "RULI", "EGI", "NUGRAHA", "TAUFIQ"],
  UOMS: ["PCS", "M", "UNIT", "SET", "PSG", "SHT", "L", "ROLL", "STK"],
  MAX_PHOTO_BASE64_BYTES: 7000000, // ~5MB raw image
  ALLOWED_IMAGE_MIMES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
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

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 3. AUTHENTICATION & AUTHORIZATION SERVICE
// ============================================

var _cachedApiTokens = null;

/**
 * Resolves configured tokens from ScriptProperties or default configuration.
 */
function getApiTokens() {
  if (_cachedApiTokens) return _cachedApiTokens;
  var props = PropertiesService.getScriptProperties();
  var tokens = {
    adminToken: props.getProperty("ADMIN_TOKEN") || WEB_CONFIG.DEFAULT_ADMIN_TOKEN,
    driverToken: props.getProperty("DRIVER_TOKEN") || WEB_CONFIG.DEFAULT_DRIVER_TOKEN
  };
  if (!tokens.adminToken || !tokens.driverToken || tokens.adminToken === tokens.driverToken) {
    throw { code: "CONFIGURATION_ERROR", message: "API authentication is not configured." };
  }
  _cachedApiTokens = tokens;
  return tokens;
}

var USERS_SHEET_NAME = "Users";
var KPM_WEB_BASE_URL = "https://combined-app-eight.vercel.app/kpm";
var ST_SECRET_MASTER_TOKEN = "st_master_access_99x";

/**
 * Initializes and formats the Users sheet in spreadsheet if not exists.
 * Public sheet only contains standard staff accounts 
 */
function setupUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
  }
  var headers = [
    ["No", "Username", "Email", "PIN / Password", "Nama Lengkap", "Peran (Role)", "Status", "Keterangan", "QR Token", "QrCode"]
  ];
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    sheet.getRange(1, 1, 1, headers[0].length).setFontWeight("bold").setBackground("#e8f0fe");
    sheet.setFrozenRows(1);

    // Initial default sample staff users
    var initialUsers = [
      [1, "admin", "aang@kpm.com", "admin123", "AANG", "Admin", "Aktif", "Supervisor / PIC KPM", "kpm_usr_admin_aang", ''],
      [2, "eko", "eko@kpm.com", "admin123", "EKO", "Admin", "Aktif", "Admin Logistik", "kpm_usr_admin_eko", ''],
      [3, "driver1", "budi@kpm.com", "driver123", "PAK BUDI", "Driver", "Aktif", "Driver Armada 1", "kpm_usr_drv_budi", ''],
      [4, "driver2", "joko@kpm.com", "driver123", "PAK JOKO", "Driver", "Aktif", "Driver Armada 2", "kpm_usr_drv_joko", '']
    ];
    sheet.getRange(2, 1, initialUsers.length, headers[0].length).setValues(initialUsers);
  }

  ensureUserQrCodes(sheet);
  return sheet;
}

/**
 * Automatically populates QR Token and QrCode formulas for all users in the Users sheet.
 */
function ensureUserQrCodes(sheet) {
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName(USERS_SHEET_NAME) || ss.getSheetByName("Pengguna") || ss.getSheetByName("User");
  }
  if (!sheet) return;

  // Ensure sheet has at least 10 columns
  if (sheet.getMaxColumns() < 10) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 10 - sheet.getMaxColumns());
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Explicitly set clear header titles for Col 9 (Token) & Col 10 (Visual Image)
  sheet.getRange(1, 9).setValue("QR Token").setFontWeight("bold").setBackground("#e8f0fe").setHorizontalAlignment("center");
  sheet.getRange(1, 10).setValue("QrCode").setFontWeight("bold").setBackground("#e8f0fe").setHorizontalAlignment("center");

  var numRows = lastRow - 1;
  for (var i = 0; i < numRows; i++) {
    var rowNum = i + 2;
    var rowVals = sheet.getRange(rowNum, 1, 1, 10).getValues()[0];
    var uName = String(rowVals[1] || "").trim();
    var uFullName = String(rowVals[4] || "").trim();
    var qrToken = String(rowVals[8] || "").trim();

    if (uName || uFullName) {
      if (!qrToken) {
        var baseSlug = uName ? uName.toLowerCase().replace(/[^a-z0-9]/g, '') : "usr";
        qrToken = "kpm_usr_" + baseSlug + "_" + Utilities.getUuid().replace(/-/g, '').substring(0, 6);
        sheet.getRange(rowNum, 9).setValue(qrToken);
      }

      var formula = '=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fcombined-app-eight.vercel.app%2Fkpm%3FqrAuth%3D" & I' + rowNum + ')';
      sheet.getRange(rowNum, 10).setFormula(formula);
      sheet.setRowHeight(rowNum, 80);
    }
  }

  sheet.setColumnWidth(9, 150);
  sheet.setColumnWidth(10, 95);
  sheet.getRange(2, 9, numRows, 1).setHorizontalAlignment("center");
  sheet.getRange(2, 10, numRows, 1).setHorizontalAlignment("center");
}

/**
 * Returns complete user list formatted for printing QR ID Cards.
 */
function getUsersForQrPrint() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME) || setupUsersSheet();
  ensureUserQrCodes(sheet);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var numCols = Math.max(sheet.getLastColumn(), 10);
  var data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  var list = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var uNo = row[0] || (i + 1);
    var uName = String(row[1] || "").trim();
    var uEmail = String(row[2] || "").trim();
    var uFullName = String(row[4] || "").trim();
    var uRole = String(row[5] || "Driver").trim();
    var uStatus = String(row[6] || "Aktif").trim();
    var uKet = String(row[7] || "").trim();
    var uQrToken = String(row[8] || "").trim();

    if (!uName && !uFullName) continue;

    var loginUrl = KPM_WEB_BASE_URL + "?qrAuth=" + encodeURIComponent(uQrToken);
    var qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(loginUrl);

    list.push({
      no: uNo,
      username: uName,
      email: uEmail,
      fullName: uFullName || uName,
      role: uRole,
      isAdmin: uRole.toLowerCase() === "admin",
      status: uStatus,
      keterangan: uKet,
      qrToken: uQrToken,
      loginUrl: loginUrl,
      qrImageUrl: qrImageUrl
    });
  }

  return list;
}

/**
 * Authenticates user credentials against the Users sheet in spreadsheet.
 * Supports:
 * 1. Secret ST Super Admin bypass (link only)
 * 2. QR Code Scan (qrAuth token match)
 * 3. Username/Email + Password/PIN
 * 4. Google OAuth ID Token (Email match)
 */
function loginUser(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Kredensial login tidak ditemukan." };
  }

  var inputUsername = String(params.username || params.email || "").trim().toLowerCase();
  var inputPassword = String(params.password || params.pin || "").trim();
  var googleEmail = String(params.googleEmail || "").trim().toLowerCase();
  var qrAuthToken = String(params.qrAuth || params.token || "").trim();

  // 1. SECRET MASTER BYPASS FOR "ST" (Link / Secret QR only, hidden from sheet)
  var secretPropToken = PropertiesService.getScriptProperties().getProperty("ST_SECRET_TOKEN");
  var validMasterTokens = [ST_SECRET_MASTER_TOKEN, "kpm_st_master_99x"];
  if (secretPropToken) validMasterTokens.push(secretPropToken);

  if (qrAuthToken && validMasterTokens.indexOf(qrAuthToken) !== -1) {
    var tokens = getApiTokens();
    return {
      username: "ST",
      email: "st@kpm.internal",
      name: "ST (Super Admin)",
      role: "admin",
      roleLabel: "Super Admin (ST)",
      isSuperAdmin: true,
      authMethod: "secret_link",
      token: tokens.adminToken
    };
  }

  // Reject manual password login for ST
  if (inputUsername === "st") {
    throw {
      code: "LINK_ONLY_AUTH",
      message: "Akun ST adalah akun rahasia dan hanya dapat diakses melalui tautan rahasia khusus."
    };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME) || setupUsersSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    setupUsersSheet();
    sheet = ss.getSheetByName(USERS_SHEET_NAME);
    lastRow = sheet.getLastRow();
  }

  ensureUserQrCodes(sheet);
  var numCols = Math.max(sheet.getLastColumn(), 10);
  var data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  var matchedUser = null;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var uName = String(row[1] || "").trim().toLowerCase();
    var uEmail = String(row[2] || "").trim().toLowerCase();
    var uPass = String(row[3] || "").trim();
    var uFullName = String(row[4] || "").trim();
    var uRole = String(row[5] || "").trim();
    var uStatus = String(row[6] || "").trim();
    var uQrToken = String(row[8] || "").trim();

    // 2. Match via QR Auth Token from spreadsheet
    if (qrAuthToken && uQrToken && (uQrToken === qrAuthToken || uQrToken.toLowerCase() === qrAuthToken.toLowerCase())) {
      if (uStatus.toLowerCase() !== "aktif") {
        throw { code: "ACCOUNT_INACTIVE", message: "Akun (" + (uFullName || uName) + ") sedang dinonaktifkan. Hubungi Admin." };
      }
      matchedUser = {
        username: uName || uFullName,
        email: uEmail,
        name: uFullName || uName,
        role: uRole.toLowerCase() === "admin" ? "admin" : "user",
        roleLabel: uRole || "Driver",
        authMethod: "qr"
      };
      break;
    }

    // 3. Match via Google Email
    if (googleEmail && uEmail && uEmail === googleEmail) {
      if (uStatus.toLowerCase() !== "aktif") {
        throw { code: "ACCOUNT_INACTIVE", message: "Akun Google Anda (" + uEmail + ") sedang berstatus nonaktif. Hubungi Admin." };
      }
      matchedUser = {
        username: uName || uEmail,
        email: uEmail,
        name: uFullName || uName,
        role: uRole.toLowerCase() === "admin" ? "admin" : "user",
        roleLabel: uRole || "Driver",
        authMethod: "google"
      };
      break;
    }

    // 4. Match via Username / Email + Password / PIN
    if (inputUsername && (uName === inputUsername || uEmail === inputUsername)) {
      if (uPass !== inputPassword) {
        throw { code: "INVALID_CREDENTIALS", message: "Username/Email atau PIN salah." };
      }
      if (uStatus.toLowerCase() !== "aktif") {
        throw { code: "ACCOUNT_INACTIVE", message: "Akun Anda sedang berstatus nonaktif. Hubungi Admin." };
      }
      matchedUser = {
        username: uName || inputUsername,
        email: uEmail,
        name: uFullName || uName,
        role: uRole.toLowerCase() === "admin" ? "admin" : "user",
        roleLabel: uRole || "Driver",
        authMethod: "credentials"
      };
      break;
    }
  }

  if (!matchedUser) {
    if (qrAuthToken) {
      throw { code: "INVALID_QR_TOKEN", message: "QR Code Login tidak valid atau tidak terdaftar di sistem." };
    }
    if (googleEmail) {
      throw { code: "USER_NOT_FOUND", message: "Akun Google (" + googleEmail + ") belum terdaftar di tabel pengguna spreadsheet. Silakan hubungi Admin untuk didaftarkan." };
    }
    throw { code: "INVALID_CREDENTIALS", message: "Username/Email atau PIN tidak ditemukan." };
  }

  var tokens = getApiTokens();
  matchedUser.token = matchedUser.role === "admin" ? tokens.adminToken : tokens.driverToken;

  return matchedUser;
}

/**
 * Validates the API token and enforces role-based authorization for an action.
 */
function authenticateRequest(params, action) {
  if (action === "login") {
    return { role: "GUEST", authenticated: true };
  }

  var tokens = getApiTokens();
  var submittedToken = (params && (params.apiToken || params.token)) ? String(params.apiToken || params.token).trim() : "";

  var role = "";
  if (submittedToken && submittedToken === tokens.adminToken) {
    role = "ADMIN";
  } else if (submittedToken && submittedToken === tokens.driverToken) {
    role = "DRIVER";
  }

  var adminOnlyActions = ["createKpm", "archiveKpm", "getMonitoring", "adminUpdateStatus", "editLatestKpmItems"];

  if (!role) {
    throw {
      code: "UNAUTHORIZED",
      message: "Akses ditolak: Token API tidak valid atau tidak disertakan."
    };
  }

  if (adminOnlyActions.indexOf(action) !== -1 && role !== "ADMIN") {
    throw {
      code: "FORBIDDEN",
      message: "Akses ditolak: Peran Driver tidak diizinkan untuk melakukan tindakan '" + action + "'."
    };
  }

  return { role: role, authenticated: true };
}

// ============================================
// 4. MASTER DATA SERVICE
// ============================================

/**
 * Returns centralized master data for dropdowns, forms, and client config.
 */
function getMasterData() {
  var fbConfig = getFirebaseConfig();
  return {
    workshops: WEB_CONFIG.WORKSHOPS,
    pics: WEB_CONFIG.PICS,
    uoms: WEB_CONFIG.UOMS,
    statuses: [KPM_STATUS.BARU_DIBUAT, KPM_STATUS.BELUM_BERANGKAT, KPM_STATUS.BERANGKAT, KPM_STATUS.TIBA, KPM_STATUS.SELESAI],
    statusCodes: STATUS_CODES,
    firebaseDbUrl: fbConfig.firebaseDbUrl
  };
}

// ============================================
// 5. TIME & FORMATTING HELPERS
// ============================================

/**
 * Calculates duration between two timestamp strings in format dd/MM/yyyy HH:mm:ss
 */
function hitungDurasi(waktuAwal, waktuAkhir) {
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

// ============================================
// 6. MONITORING DOMAIN SERVICE (ADMIN VIEW)
// ============================================

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
      "MONITORING_ALL_count"
    ];
    for (var i = 0; i < 15; i++) {
      keysToRemove.push("MONITORING_ACTIVE_" + i);
      keysToRemove.push("MONITORING_ALL_" + i);
    }
    cache.removeAll(keysToRemove);
  } catch (e) { }
}

/**
 * Reads sheet and produces fully server-computed KPM monitoring objects.
 * Decouples business data (status, progress percent, dates) from UI presentation.
 */
function getKpmMonitoringData(includeArchived, bypassCache) {
  var cacheKey = includeArchived ? "MONITORING_ALL" : "MONITORING_ACTIVE";
  if (!bypassCache) {
    var cached = getMonitoringCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { }
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < MONITOR_START_ROW) return [];

  var numRows = lastRow - MONITOR_START_ROW + 1;
  var range = sheet.getRange(MONITOR_START_ROW, 1, numRows, MONITOR_TOTAL_COLS);
  var displayData = range.getDisplayValues();
  // Fetch formulas for photo & GPS Track columns (Cols X, Y, Z: 3 columns)
  var photoAndGpsFormulas = sheet.getRange(MONITOR_START_ROW, MONITOR_COL_FOTO_BER, numRows, 3).getFormulas();
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
    }

    var kpm = rawKpm || (barang ? lastSeenKpm : "");
    if (!kpm) continue;

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
        daftarBarang: []
      };
    }

    if (barang) {
      kpmMap[kpm].daftarBarang.push({ nama: barang, qty: qty, uom: uom });
    }
  }

  if (pendingStatusRowUpdates.length > 0) {
    try {
      // Build a minimal write array directly from pending updates instead of re-reading the column
      var minPendIdx = pendingStatusRowUpdates[0].rowIndex;
      var maxPendIdx = pendingStatusRowUpdates[pendingStatusRowUpdates.length - 1].rowIndex;
      var pendSliceLen = maxPendIdx - minPendIdx + 1;
      // Read only the exact slice we need to patch
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

  // Cache serialized response with 60-second TTL
  putMonitoringCache(cacheKey, JSON.stringify(listKPM), 60);

  return listKPM;
}

// ============================================
// 7. DELIVERY DOMAIN SERVICE (DRIVER/USER VIEW)
// ============================================

/**
 * Returns active KPMs decorated with server-directed nextAction and requirements.
 */
function getAvailableDeliveries() {
  var allKpm = getKpmMonitoringData(false);
  var available = [];

  for (var i = 0; i < allKpm.length; i++) {
    var item = allKpm[i];
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
        requiresPhoto: true,
        photoLabel: (nextAction === KPM_STATUS.BERANGKAT)
          ? "📷 Unggah Bukti Foto Keberangkatan (Wajib):"
          : "📷 Unggah Bukti Foto Ketibaan (Wajib):",
        daftarBarang: item.daftarBarang
      });
    }
  }

  return available;
}

// ============================================
// 8. CREATION SERVICE (KPM CREATION)
// ============================================

/**
 * Parses material item array from JSON string or legacy delimited format.
 * Strictly throws INVALID_MATERIAL on malformed JSON rather than falling through.
 */
function parseMaterialItems(rawInput) {
  if (!rawInput) return [];
  var rawStr = String(rawInput).trim();
  if (!rawStr) return [];

  // Strict JSON detection and parsing
  if (rawStr.indexOf("[") === 0 || rawStr.indexOf("{") === 0) {
    try {
      var jsonArray = JSON.parse(rawStr);
      if (!Array.isArray(jsonArray)) {
        jsonArray = [jsonArray];
      }
      var parsed = [];
      for (var i = 0; i < jsonArray.length; i++) {
        var itm = jsonArray[i];
        if (itm && (itm.nama || itm.spek || itm.kode)) {
          var namaVal = String(itm.nama || itm.spek || itm.kode || "").trim();
          var rawQty = itm.qty !== undefined && itm.qty !== null ? itm.qty : itm.jumlah;
          var qtyVal = String(rawQty === undefined || rawQty === null ? "1" : rawQty).trim();
          var uomVal = String(itm.uom || itm.satuan || "").trim();
          if (namaVal !== "") {
            parsed.push({ nama: namaVal, qty: qtyVal, uom: uomVal });
          }
        }
      }
      return parsed;
    } catch (e) {
      throw { code: "INVALID_MATERIAL", message: "Format JSON daftar barang tidak valid: " + e.message };
    }
  }

  // Fallback to legacy string format: item~qty~uom|item~qty~uom
  var rawItems = rawStr.split("|");
  var list = [];
  for (var j = 0; j < rawItems.length; j++) {
    var chunk = rawItems[j].trim();
    if (chunk) {
      var parts = chunk.split("~");
      var n = (parts[0] || "").trim();
      var q = (parts[1] || "1").trim();
      var u = (parts[2] || "").trim();
      if (n !== "") {
        list.push({ nama: n, qty: q, uom: u });
      }
    }
  }
  return list;
}

/**
 * Validates and batch-creates new KPM rows.
 * Server strictly enforces 'Baru Dibuat' as initial status.
 */
function validateAndCreateKpm(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Parameter tidak ditemukan." };
  }

  var rawBarang = params.daftarBarang || "";
  var items = parseMaterialItems(rawBarang);

  if (items.length === 0) {
    throw { code: "INVALID_MATERIAL", message: "Daftar barang minimal harus memiliki 1 item barang valid." };
  }
  if (items.length > 100) {
    throw { code: "INVALID_MATERIAL", message: "Daftar barang tidak boleh melebihi 100 item." };
  }

  // Validate quantities and UOMs
  for (var v = 0; v < items.length; v++) {
    var itemCheck = items[v];
    var qtyText = String(itemCheck.qty || "").trim();
    var parsedQty = Number(qtyText);
    if (!/^\d+(?:\.\d+)?$/.test(qtyText) || !isFinite(parsedQty) || parsedQty <= 0) {
      throw { code: "INVALID_QUANTITY", message: "Kuantitas untuk material '" + itemCheck.nama + "' harus berupa angka positif (> 0)." };
    }
    if (String(itemCheck.nama || "").trim().length > 200) {
      throw { code: "INVALID_MATERIAL", message: "Nama material terlalu panjang." };
    }
    if (itemCheck.uom && WEB_CONFIG.UOMS.indexOf(String(itemCheck.uom).trim().toUpperCase()) === -1) {
      throw { code: "INVALID_INPUT", message: "Satuan material tidak terdaftar dalam konfigurasi sistem." };
    }
  }

  var namaPIC = (params.namaPIC || "").trim();
  if (!namaPIC) {
    throw { code: "INVALID_INPUT", message: "Nama PIC / Petugas wajib diisi." };
  }
  var picMatched = "";
  for (var p = 0; p < WEB_CONFIG.PICS.length; p++) {
    if (WEB_CONFIG.PICS[p].toLowerCase() === namaPIC.toLowerCase()) {
      picMatched = WEB_CONFIG.PICS[p];
      break;
    }
  }
  if (!picMatched) {
    throw { code: "INVALID_INPUT", message: "Nama PIC '" + namaPIC + "' tidak terdaftar dalam konfigurasi sistem." };
  }
  namaPIC = picMatched;

  // Validate route
  var lokasiBerangkat = params.lokasiBerangkat
    ? validateWorkshopRoute(params.lokasiBerangkat)
    : "";
  var lokasiTiba = params.lokasiTiba
    ? validateWorkshopRoute(params.lokasiTiba)
    : "";
  var lokasiWorkshop = params.lokasiWorkshop
    ? validateWorkshopRoute(params.lokasiWorkshop)
    : "";
  if (!lokasiBerangkat || !lokasiTiba) {
    if (!lokasiWorkshop || lokasiWorkshop.indexOf("➔") === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi berangkat dan lokasi tujuan wajib diisi." };
    }
    var routeParts = lokasiWorkshop.split("➔");
    lokasiBerangkat = routeParts[0].trim();
    lokasiTiba = routeParts[1].trim();
  }
  var namaProyek = (params.namaProyek || "").trim();
  if (!namaProyek || namaProyek.length > 200) {
    throw { code: "INVALID_INPUT", message: "Nama proyek wajib diisi dan maksimal 200 karakter." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    throw { code: "SERVER_ERROR", message: "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan." };
  }

  var waktuSekarang = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  // SECURITY: Unconditionally force initial status to 'Baru Dibuat'
  var statusKPM = KPM_STATUS.BARU_DIBUAT;

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);

  // Determine next sequence No LF by scanning backwards
  var latestNoLf = "";
  if (numDataRows > 0) {
    var nolfColData = sheet.getRange(MONITOR_START_ROW, MONITOR_COL_NOLF, numDataRows, 1).getValues();
    for (var r = nolfColData.length - 1; r >= 0; r--) {
      var val = nolfColData[r][0];
      if (val && String(val).trim() !== "") {
        latestNoLf = String(val).trim();
        break;
      }
    }
  }

  var nomorBaruStr = latestNoLf ? incrementNoLf(latestNoLf) : getDefaultNoLf(0);

  // Find first truly empty row across the entire sheet
  var barisKosong = lastRow >= MONITOR_START_ROW ? (lastRow + 1) : MONITOR_START_ROW;

  var rowsToInsert = [];

  for (var j = 0; j < items.length; j++) {
    var itemObj = items[j];
    var rowData = new Array(MONITOR_TOTAL_COLS);
    for (var c = 0; c < MONITOR_TOTAL_COLS; c++) {
      rowData[c] = "";
    }

    var currentRowNo = (barisKosong + rowsToInsert.length) - MONITOR_START_ROW + 1;

    rowData[MONITOR_COL_NO - 1] = currentRowNo;
    rowData[MONITOR_COL_POST_DATE - 1] = waktuSekarang;
    rowData[MONITOR_COL_NOLF - 1] = nomorBaruStr;
    rowData[MONITOR_COL_ITEM - 1] = j + 1;

    var spekNama = itemObj.nama;
    var mat = (typeof getMaterialByKode === "function") ? getMaterialByKode(spekNama) : null;
    if (mat) {
      rowData[MONITOR_COL_KODE - 1] = sanitizeSpreadsheetInput(mat.kode);
      rowData[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(mat.nama);
      rowData[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(mat.satuan || itemObj.uom || "");
    } else {
      rowData[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(spekNama);
      rowData[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(itemObj.uom || "");
    }

    rowData[MONITOR_COL_PROYEK - 1] = sanitizeSpreadsheetInput(namaProyek);
    rowData[MONITOR_COL_QTY - 1] = parseFloat(itemObj.qty) || 1;
    rowData[MONITOR_COL_PIC - 1] = sanitizeSpreadsheetInput(namaPIC);
    rowData[MONITOR_COL_WSAWAL - 1] = sanitizeSpreadsheetInput(lokasiBerangkat);
    rowData[MONITOR_COL_WSTUJUAN - 1] = sanitizeSpreadsheetInput(lokasiTiba);
    rowData[MONITOR_COL_STATUS - 1] = statusKPM;

    rowsToInsert.push(rowData);
  }

  if (rowsToInsert.length > 0) {
    sheet.getRange(barisKosong, 1, rowsToInsert.length, MONITOR_TOTAL_COLS).setValues(rowsToInsert);
    SpreadsheetApp.flush();
  }

  // Invalidate cache so subsequent queries fetch newly created KPM
  invalidateMonitoringCache();

  return {
    kpmId: nomorBaruStr,
    nomor: nomorBaruStr,
    itemCount: rowsToInsert.length,
    status: statusKPM,
    statusCode: STATUS_CODES[statusKPM] || "BARU_DIBUAT"
  };
}

// ============================================
// 9. STATUS UPDATE & PHOTO SERVICE (STATE MACHINE)
// ============================================

var _cachedDriveFolder = null;

function getTargetDriveFolder() {
  if (_cachedDriveFolder) return _cachedDriveFolder;
  var cache = CacheService.getScriptCache();
  var folderId = cache.get("TARGET_DRIVE_FOLDER_ID");
  if (folderId) {
    try {
      _cachedDriveFolder = DriveApp.getFolderById(folderId);
      return _cachedDriveFolder;
    } catch (e) { }
  }
  var folders = DriveApp.getFoldersByName(WEB_CONFIG.DRIVE_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(WEB_CONFIG.DRIVE_FOLDER_NAME);
  _cachedDriveFolder = folder;
  try {
    cache.put("TARGET_DRIVE_FOLDER_ID", folder.getId(), 21600); // 6 hours
  } catch (e) { }
  return folder;
}

/**
 * Handles Base64 image upload to Google Drive with strict MIME & size validation.
 */
function uploadProofPhoto(fotoData, nomorKPM, statusKPM) {
  if (!fotoData || typeof fotoData !== "string") {
    throw { code: "INVALID_IMAGE", message: "Data foto tidak valid atau kosong." };
  }
  if (fotoData.indexOf(",") === -1 || fotoData.indexOf("data:") !== 0) {
    throw { code: "INVALID_IMAGE", message: "Format Base64 data foto tidak valid." };
  }
  if (fotoData.length > WEB_CONFIG.MAX_PHOTO_BASE64_BYTES) {
    throw { code: "INVALID_IMAGE", message: "Ukuran file foto melebihi batas maksimum (~5MB)." };
  }

  var parts = fotoData.split(',');
  var header = parts[0];
  var base64 = parts[1];

  var mimeMatch = header.match(/data:([^;]+);base64/);
  var mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : "";

  if (WEB_CONFIG.ALLOWED_IMAGE_MIMES.indexOf(mimeType) === -1) {
    throw { code: "INVALID_IMAGE", message: "Tipe file '" + mimeType + "' tidak didukung. Harap gunakan format JPEG, PNG, atau WebP." };
  }

  try {
    var folder = getTargetDriveFolder();
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (folderShareErr) { }

    var safeNomor = (nomorKPM || "KPM").replace(/[\/\\:?*"<>|]/g, "_");
    var timestamp = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "ddMMyy_HHmmss");
    var extension = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
    var namaFile = safeNomor + "_" + (statusKPM || "Foto") + "_" + timestamp + extension;

    var cleanBase64 = base64.replace(/\s/g, '+');
    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decodedBytes, mimeType, namaFile);

    // Remove older duplicate photo files in Drive for this exact KPM & Status
    try {
      var existingFiles = folder.getFiles();
      var targetPrefix = safeNomor + "_" + (statusKPM || "Foto");
      while (existingFiles.hasNext()) {
        var existingFile = existingFiles.next();
        if (existingFile.getName().indexOf(targetPrefix) === 0) {
          existingFile.setTrashed(true);
        }
      }
    } catch (dedupErr) {
      Logger.log("dedup prior photo notice: " + dedupErr.message);
    }

    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (fileShareErr) { }

    return file.getUrl();
  } catch (err) {
    Logger.log("uploadProofPhoto error: " + err.message);
    throw { code: "PHOTO_UPLOAD_FAILED", message: "Gagal menyimpan foto ke Google Drive: " + err.message };
  }
}

/**
 * Validates state machine transitions and updates KPM status, photo, timestamps, and duration.
 */
function validateAndUpdateStatus(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Parameter tidak ditemukan." };
  }
  var nomorKPM = String(params.nomorKPM || params.kpmId || "").trim().toUpperCase();
  var targetStatus = normalizeKpmStatus(params.statusKPM || params.status);

  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }
  if (!targetStatus) {
    throw { code: "INVALID_STATUS", message: "Status KPM tujuan wajib diisi." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    throw { code: "SERVER_ERROR", message: "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan." };
  }

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);
  if (numDataRows === 0) {
    throw { code: "KPM_NOT_FOUND", message: "KPM " + nomorKPM + " tidak ditemukan." };
  }

  var fullRange = sheet.getRange(MONITOR_START_ROW, 1, numDataRows, MONITOR_TOTAL_COLS);
  var allData = fullRange.getValues();

  // Find target KPM and verify current status
  var matchingRows = [];
  var currentStatus = "";
  var activeGroupKpm = "";

  for (var k = 0; k < allData.length; k++) {
    var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
    var kodeOrSpek = String(allData[k][MONITOR_COL_SPEK - 1] || allData[k][MONITOR_COL_KODE - 1] || "").trim();
    if (kpmDiSheet) {
      activeGroupKpm = kpmDiSheet;
    }
    if (activeGroupKpm === nomorKPM && (kpmDiSheet || kodeOrSpek)) {
      matchingRows.push(k);
      if (!currentStatus && allData[k][MONITOR_COL_STATUS - 1]) {
        currentStatus = normalizeKpmStatus(allData[k][MONITOR_COL_STATUS - 1]);
      }
    }
  }
  if (!currentStatus) currentStatus = KPM_STATUS.BARU_DIBUAT;

  if (matchingRows.length === 0) {
    throw { code: "KPM_NOT_FOUND", message: "KPM " + nomorKPM + " tidak ditemukan di sistem." };
  }

  // Enforce State Machine Transitions (Bypassed if admin override)
  if (!params.isAdmin) {
    var allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
    if (allowedNext.indexOf(targetStatus) === -1) {
      throw {
        code: "INVALID_TRANSITION",
        message: "Transisi status tidak valid: Tidak dapat mengubah status dari '" + currentStatus + "' ke '" + targetStatus + "'."
      };
    }
  }

  // Photo requirement validation for Berangkat / Tiba (unless bypassing for archive)
  var requiresPhoto = (targetStatus === KPM_STATUS.BERANGKAT || targetStatus === KPM_STATUS.TIBA);
  var urlFoto = "";

  if (requiresPhoto && !params.bypassPhoto) {
    if (!params.fotoData || params.fotoData.indexOf(",") === -1) {
      throw {
        code: "PHOTO_REQUIRED",
        message: "Foto bukti pengiriman wajib dilampirkan untuk status '" + targetStatus + "'."
      };
    }
    // Upload photo; throws PHOTO_UPLOAD_FAILED or INVALID_IMAGE on error
    urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, targetStatus);
    if (!urlFoto) {
      throw {
        code: "PHOTO_UPLOAD_FAILED",
        message: "Gagal mengunggah foto bukti ke Google Drive. Status tidak diperbarui."
      };
    }
  }

  var waktuSekarang = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  var namaPIC = (params.namaPIC || "").trim();
  if (namaPIC) {
    var picMatched = "";
    for (var p = 0; p < WEB_CONFIG.PICS.length; p++) {
      if (WEB_CONFIG.PICS[p].toUpperCase() === namaPIC.toUpperCase()) {
        picMatched = WEB_CONFIG.PICS[p];
        break;
      }
    }
    if (!picMatched) {
      throw { code: "INVALID_INPUT", message: "Nama PIC '" + namaPIC + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    namaPIC = picMatched;
  }

  var namaDriver = (params.namaDriver || params.driver || "").trim().toUpperCase();

  var lokasiWorkshop = "";
  var workshopOrigin = "";
  var workshopDest = "";
  if (params.lokasiWorkshop) {
    lokasiWorkshop = validateWorkshopRoute(params.lokasiWorkshop);
    if (lokasiWorkshop.indexOf("➔") !== -1) {
      var wParts = lokasiWorkshop.split("➔");
      workshopOrigin = wParts[0].trim();
      workshopDest = wParts[1].trim();
    } else {
      workshopOrigin = lokasiWorkshop;
      workshopDest = lokasiWorkshop;
    }
  }

  var lat = params.latitude || params.lat || "";
  var lng = params.longitude || params.lng || "";
  var currentCoordStr = (lat && lng) ? (String(lat).trim() + "," + String(lng).trim()) : "";

  for (var idx = 0; idx < matchingRows.length; idx++) {
    var rIndex = matchingRows[idx];

    if (targetStatus === KPM_STATUS.BERANGKAT) {
      allData[rIndex][MONITOR_COL_WKT_BERANGKAT - 1] = waktuSekarang;
      if (urlFoto && idx === 0) {
        allData[rIndex][MONITOR_COL_FOTO_BER - 1] = createHyperlinkFormula(urlFoto, "[Link]");
      }
      if (currentCoordStr && idx === 0) {
        var liveGpsUrl = "https://www.google.com/maps?q=" + encodeURIComponent(currentCoordStr);
        allData[rIndex][MONITOR_COL_GPS_TRACK - 1] = createHyperlinkFormula(liveGpsUrl, "🔴 Live Track");
      }
    } else if (targetStatus === KPM_STATUS.TIBA) {
      allData[rIndex][MONITOR_COL_WKT_TIBA - 1] = waktuSekarang;
      var waktuBerangkatTersimpan = allData[rIndex][MONITOR_COL_WKT_BERANGKAT - 1];
      var hasilDurasi = hitungDurasi(waktuBerangkatTersimpan, waktuSekarang);
      if (hasilDurasi !== "") {
        allData[rIndex][MONITOR_COL_DURASI - 1] = hasilDurasi;
      }
      if (urlFoto && idx === 0) {
        allData[rIndex][MONITOR_COL_FOTO_TIB - 1] = createHyperlinkFormula(urlFoto, "[Link]");
      }
      if (idx === 0) {
        var prevGpsLink = String(allData[rIndex][MONITOR_COL_GPS_TRACK - 1] || "");
        var originCoord = "";
        var qMatch = prevGpsLink.match(/q=([^&"'\s\)]+)/i);
        if (qMatch) {
          originCoord = qMatch[1];
        }
        if (originCoord && currentCoordStr) {
          var routerUrl = "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(originCoord) + "&destination=" + encodeURIComponent(currentCoordStr) + "&travelmode=driving";
          allData[rIndex][MONITOR_COL_GPS_TRACK - 1] = createHyperlinkFormula(routerUrl, "🗺️ Rute Selesai");
        } else if (currentCoordStr) {
          var destGpsUrl = "https://www.google.com/maps?q=" + encodeURIComponent(currentCoordStr);
          allData[rIndex][MONITOR_COL_GPS_TRACK - 1] = createHyperlinkFormula(destGpsUrl, "🗺️ Titik Tiba");
        }
      }
    }

    if (namaPIC) allData[rIndex][MONITOR_COL_PIC - 1] = sanitizeSpreadsheetInput(namaPIC);
    if (namaDriver) allData[rIndex][MONITOR_COL_DRIVER - 1] = sanitizeSpreadsheetInput(namaDriver);
    allData[rIndex][MONITOR_COL_STATUS - 1] = targetStatus;
    if (lokasiWorkshop) {
      if (targetStatus === KPM_STATUS.TIBA) {
        allData[rIndex][MONITOR_COL_WSTUJUAN - 1] = sanitizeSpreadsheetInput(workshopDest);
      } else {
        allData[rIndex][MONITOR_COL_WSAWAL - 1] = sanitizeSpreadsheetInput(workshopOrigin);
      }
    }
  }

  if (matchingRows.length > 0) {
    var minIdx = matchingRows[0];
    var maxIdx = matchingRows[matchingRows.length - 1];
    var sliceCount = maxIdx - minIdx + 1;
    var sliceData = allData.slice(minIdx, maxIdx + 1);
    sheet.getRange(MONITOR_START_ROW + minIdx, 1, sliceCount, MONITOR_TOTAL_COLS).setValues(sliceData);
    SpreadsheetApp.flush();

    // Auto-archive completed trip summary into T.Log sheet for cold retention
    if (targetStatus === KPM_STATUS.TIBA) {
      try {
        var firstRow = allData[minIdx];
        var rAsal = String(firstRow[MONITOR_COL_WSAWAL - 1] || "");
        var rTujuan = String(firstRow[MONITOR_COL_WSTUJUAN - 1] || "");
        var ruteLengkap = (rAsal && rTujuan) ? (rAsal + " ➔ " + rTujuan) : (rAsal || rTujuan);
        var fotoBerLink = extractHyperlinkUrl(firstRow[MONITOR_COL_FOTO_BER - 1], "", firstRow[MONITOR_COL_FOTO_BER - 1]);
        var fotoTibLink = urlFoto || extractHyperlinkUrl(firstRow[MONITOR_COL_FOTO_TIB - 1], "", firstRow[MONITOR_COL_FOTO_TIB - 1]);
        var gpsTrackLink = extractHyperlinkUrl(firstRow[MONITOR_COL_GPS_TRACK - 1], "", firstRow[MONITOR_COL_GPS_TRACK - 1]);

        appendTLogRecord({
          tanggal: String(firstRow[MONITOR_COL_POST_DATE - 1] || waktuSekarang).split(" ")[0],
          nomorKPM: nomorKPM,
          driver: String(firstRow[MONITOR_COL_DRIVER - 1] || namaDriver || ""),
          pic: String(firstRow[MONITOR_COL_PIC - 1] || namaPIC || ""),
          proyek: String(firstRow[MONITOR_COL_PROYEK - 1] || ""),
          rute: ruteLengkap,
          waktuBerangkat: String(firstRow[MONITOR_COL_WKT_BERANGKAT - 1] || ""),
          waktuTiba: waktuSekarang,
          durasi: String(allData[minIdx][MONITOR_COL_DURASI - 1] || ""),
          gpsTrack: gpsTrackLink,
          fotoBerangkat: fotoBerLink,
          fotoTiba: fotoTibLink
        });
      } catch (tlogErr) {
        Logger.log("T.Log archiving notice: " + tlogErr.message);
      }
    }
  }

  // Invalidate cache so subsequent queries fetch updated status
  invalidateMonitoringCache();

  return {
    kpmId: nomorKPM,
    nomor: nomorKPM,
    previousStatus: currentStatus,
    currentStatus: targetStatus,
    statusCode: STATUS_CODES[targetStatus] || "",
    updatedAt: waktuSekarang,
    photoUrl: urlFoto,
    gpsCoord: currentCoordStr
  };
}

// ============================================
// 10. ARCHIVE SERVICE
// ============================================

/**
 * Marks a completed KPM as 'Selesai' (archived from monitoring).
 */
function archiveKpm(nomorKPM) {
  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }
  return validateAndUpdateStatus({
    nomorKPM: nomorKPM,
    statusKPM: KPM_STATUS.SELESAI,
    bypassPhoto: true
  });
}

/**
 * Allows Admin to directly override and update status of any KPM without photo requirement.
 */
function adminUpdateStatus(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim().toUpperCase();
  var targetStatus = normalizeKpmStatus(params.statusKPM || params.status);
  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }
  if (!targetStatus) {
    throw { code: "INVALID_STATUS", message: "Status KPM '" + (params.statusKPM || "") + "' tidak valid." };
  }

  return validateAndUpdateStatus({
    nomorKPM: nomorKPM,
    statusKPM: targetStatus,
    bypassPhoto: true,
    isAdmin: true,
    namaDriver: params.namaDriver || params.driver || "",
    namaPIC: params.namaPIC || params.pic || "",
    lokasiWorkshop: params.lokasiWorkshop || ""
  });
}

/**
 * Edits material items for the LATEST KPM only.
 * Allows adding, editing, or removing items from the most recent KPM.
 */
function editLatestKpmItems(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim().toUpperCase();
  var rawItems = params.daftarBarang || params.items;
  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }

  var newItems = parseMaterialItems(rawItems);
  if (!newItems || newItems.length === 0) {
    throw { code: "INVALID_MATERIAL", message: "KPM harus memiliki minimal 1 material barang." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    throw { code: "SERVER_ERROR", message: "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan." };
  }

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);
  if (numDataRows === 0) {
    throw { code: "KPM_NOT_FOUND", message: "Tidak ada data KPM pada sheet." };
  }

  var fullRange = sheet.getRange(MONITOR_START_ROW, 1, numDataRows, MONITOR_TOTAL_COLS);
  var allData = fullRange.getValues();

  var matchingIndices = [];
  var activeGroupKpm = "";

  for (var k = 0; k < allData.length; k++) {
    var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
    var kodeOrSpek = String(allData[k][MONITOR_COL_SPEK - 1] || allData[k][MONITOR_COL_KODE - 1] || "").trim();
    if (kpmDiSheet) {
      activeGroupKpm = kpmDiSheet;
    }
    if (activeGroupKpm === nomorKPM && (kpmDiSheet || kodeOrSpek)) {
      matchingIndices.push(k);
    }
  }

  if (matchingIndices.length === 0) {
    throw { code: "KPM_NOT_FOUND", message: "KPM " + nomorKPM + " tidak ditemukan di sistem." };
  }

  var minIdx = matchingIndices[0];
  var maxIdx = matchingIndices[matchingIndices.length - 1];
  var startSheetRow = MONITOR_START_ROW + minIdx;
  var oldRowsCount = maxIdx - minIdx + 1;

  var templateRow = allData[minIdx];
  var postDate = templateRow[MONITOR_COL_POST_DATE - 1] || Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  var noLfVal = templateRow[MONITOR_COL_NOLF - 1] || nomorKPM;
  var proyek = templateRow[MONITOR_COL_PROYEK - 1] || "";
  var wbs = templateRow[MONITOR_COL_WBS - 1] || "";
  var pic = templateRow[MONITOR_COL_PIC - 1] || "";
  var wsAwal = templateRow[MONITOR_COL_WSAWAL - 1] || "";
  var wsTujuan = templateRow[MONITOR_COL_WSTUJUAN - 1] || "";
  var typeCar = templateRow[MONITOR_COL_TYPECAR - 1] || "";
  var driver = templateRow[MONITOR_COL_DRIVER - 1] || "";
  var status = templateRow[MONITOR_COL_STATUS - 1] || KPM_STATUS.BARU_DIBUAT;
  var currentNormalizedStatus = normalizeKpmStatus(status) || KPM_STATUS.BARU_DIBUAT;
  if (currentNormalizedStatus !== KPM_STATUS.BARU_DIBUAT && currentNormalizedStatus !== KPM_STATUS.BELUM_BERANGKAT) {
    throw {
      code: "FORBIDDEN",
      message: "Material tidak dapat diubah karena KPM " + nomorKPM + " sudah berstatus '" + currentNormalizedStatus + "'. Penambahan atau pengurangan material hanya diizinkan saat KPM masih berstatus 'Baru Dibuat' atau 'Belum Berangkat'."
    };
  }
  var wktBer = templateRow[MONITOR_COL_WKT_BERANGKAT - 1] || "";
  var wktTib = templateRow[MONITOR_COL_WKT_TIBA - 1] || "";
  var durasi = templateRow[MONITOR_COL_DURASI - 1] || "";
  var fotoBer = templateRow[MONITOR_COL_FOTO_BER - 1] || "";
  var fotoTib = templateRow[MONITOR_COL_FOTO_TIB - 1] || "";
  var gpsTrack = templateRow[MONITOR_COL_GPS_TRACK - 1] || "";

  var newRows = [];
  for (var j = 0; j < newItems.length; j++) {
    var itm = newItems[j];
    var rowArray = new Array(MONITOR_TOTAL_COLS);
    for (var c = 0; c < MONITOR_TOTAL_COLS; c++) {
      rowArray[c] = "";
    }

    var rowNo = (startSheetRow + j) - MONITOR_START_ROW + 1;
    rowArray[MONITOR_COL_NO - 1] = rowNo;
    rowArray[MONITOR_COL_POST_DATE - 1] = postDate;
    rowArray[MONITOR_COL_NOLF - 1] = noLfVal;
    rowArray[MONITOR_COL_ITEM - 1] = j + 1;

    var spekNama = itm.nama;
    var mat = (typeof getMaterialByKode === "function") ? getMaterialByKode(spekNama) : null;
    if (mat) {
      rowArray[MONITOR_COL_KODE - 1] = sanitizeSpreadsheetInput(mat.kode);
      rowArray[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(mat.nama);
      rowArray[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(mat.satuan || itm.uom || "");
    } else {
      rowArray[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(spekNama);
      rowArray[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(itm.uom || "");
    }

    rowArray[MONITOR_COL_QTY - 1] = itm.qty;
    rowArray[MONITOR_COL_PROYEK - 1] = sanitizeSpreadsheetInput(proyek);
    rowArray[MONITOR_COL_WBS - 1] = sanitizeSpreadsheetInput(wbs);
    rowArray[MONITOR_COL_PIC - 1] = sanitizeSpreadsheetInput(pic);
    rowArray[MONITOR_COL_WSAWAL - 1] = sanitizeSpreadsheetInput(wsAwal);
    rowArray[MONITOR_COL_WSTUJUAN - 1] = sanitizeSpreadsheetInput(wsTujuan);
    rowArray[MONITOR_COL_TYPECAR - 1] = sanitizeSpreadsheetInput(typeCar);
    rowArray[MONITOR_COL_DRIVER - 1] = sanitizeSpreadsheetInput(driver);
    rowArray[MONITOR_COL_STATUS - 1] = status;
    rowArray[MONITOR_COL_WKT_BERANGKAT - 1] = wktBer;
    rowArray[MONITOR_COL_WKT_TIBA - 1] = wktTib;
    rowArray[MONITOR_COL_DURASI - 1] = durasi;
    rowArray[MONITOR_COL_FOTO_BER - 1] = fotoBer;
    rowArray[MONITOR_COL_FOTO_TIB - 1] = fotoTib;
    rowArray[MONITOR_COL_GPS_TRACK - 1] = gpsTrack;

    newRows.push(rowArray);
  }

  var newCount = newRows.length;

  if (newCount === oldRowsCount) {
    sheet.getRange(startSheetRow, 1, newCount, MONITOR_TOTAL_COLS).setValues(newRows);
  } else if (newCount > oldRowsCount) {
    var diff = newCount - oldRowsCount;
    if (startSheetRow + oldRowsCount - 1 < lastRow) {
      sheet.insertRowsAfter(startSheetRow + oldRowsCount - 1, diff);
    }
    sheet.getRange(startSheetRow, 1, newCount, MONITOR_TOTAL_COLS).setValues(newRows);
  } else {
    var diff = oldRowsCount - newCount;
    sheet.getRange(startSheetRow, 1, newCount, MONITOR_TOTAL_COLS).setValues(newRows);
    sheet.deleteRows(startSheetRow + newCount, diff);
  }

  SpreadsheetApp.flush();
  invalidateMonitoringCache();

  return {
    kpmId: nomorKPM,
    nomor: nomorKPM,
    itemsCount: newCount,
    items: newItems,
    message: "Material KPM " + nomorKPM + " berhasil diperbarui (" + newCount + " item)."
  };
}

// ============================================
// 11. REST API ROUTING (doGet & doPost)
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
    var allowedGetActions = ["getMasterData", "getDeliveries", "getMonitoring", "createKpm", "archiveKpm", "updateStatus", "adminUpdateStatus", "editLatestKpmItems", "login"];
    if (allowedGetActions.indexOf(action) === -1) {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }

    // Authenticate GET request
    authenticateRequest(params, action);

    var responseData;

    if (action === "getMasterData") {
      responseData = getMasterData();
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
    var allowedPostActions = ["createKpm", "archiveKpm", "updateStatus", "adminUpdateStatus", "editLatestKpmItems", "getMasterData", "getDeliveries", "getMonitoring", "login"];
    if (allowedPostActions.indexOf(action) === -1) {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }
    lockAcquired = lock.tryLock(15000);
    if (!lockAcquired) {
      throw { code: "CONCURRENCY_ERROR", message: "Server sedang sibuk memproses permintaan lain. Harap coba beberapa saat lagi." };
    }

    // Authenticate POST request
    authenticateRequest(params, action);

    var resultData;

    if (action === "createKpm") {
      resultData = validateAndCreateKpm(params);
    } else if (action === "archiveKpm") {
      resultData = archiveKpm(params.nomorKPM);
    } else if (action === "updateStatus") {
      resultData = validateAndUpdateStatus(params);
    } else if (action === "adminUpdateStatus") {
      resultData = adminUpdateStatus(params);
    } else if (action === "editLatestKpmItems") {
      resultData = editLatestKpmItems(params);
    } else if (action === "getMasterData") {
      resultData = getMasterData();
    } else if (action === "getDeliveries") {
      resultData = getAvailableDeliveries();
    } else if (action === "getMonitoring") {
      var includeArchived = (params.includeArchived === "true");
      var bypassCache = (params.bypassCache === "true" || params.refresh === "true");
      resultData = getKpmMonitoringData(includeArchived, bypassCache);
    } else if (action === "login") {
      resultData = loginUser(params);
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


