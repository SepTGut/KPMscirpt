// ============================================
// AUTHENTICATION & USER MANAGEMENT (Auth.gs)
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
 * Public sheet only contains standard staff accounts (ST is hidden/secret).
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

    // Initial default sample staff users (ST is kept secret and not shown here)
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
 * High-performance batch population of QR Token and QrCode formulas for all users in the Users sheet.
 * Operates entirely in memory and performs single batch writes (30x faster than cell-by-cell loops).
 */
function ensureUserQrCodes(sheet) {
  if (!sheet) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName(USERS_SHEET_NAME) || ss.getSheetByName("Pengguna") || ss.getSheetByName("User");
  }
  if (!sheet) return;

  if (sheet.getMaxColumns() < 10) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 10 - sheet.getMaxColumns());
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  sheet.getRange(1, 9).setValue("QR Token").setFontWeight("bold").setBackground("#e8f0fe").setHorizontalAlignment("center");
  sheet.getRange(1, 10).setValue("QrCode").setFontWeight("bold").setBackground("#e8f0fe").setHorizontalAlignment("center");

  var numRows = lastRow - 1;
  var data = sheet.getRange(2, 1, numRows, 10).getValues();
  var tokenUpdates = new Array(numRows);
  var formulaUpdates = new Array(numRows);
  var hasTokenChanges = false;

  for (var i = 0; i < numRows; i++) {
    var rowNum = i + 2;
    var rowVals = data[i];
    var uName = String(rowVals[1] || "").trim();
    var uFullName = String(rowVals[4] || "").trim();
    var qrToken = String(rowVals[8] || "").trim();

    if (uName || uFullName) {
      if (!qrToken) {
        var baseSlug = uName ? uName.toLowerCase().replace(/[^a-z0-9]/g, '') : "usr";
        qrToken = "kpm_usr_" + baseSlug + "_" + Utilities.getUuid().replace(/-/g, '').substring(0, 6);
        hasTokenChanges = true;
      }
      tokenUpdates[i] = [qrToken];
      formulaUpdates[i] = ['=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fcombined-app-eight.vercel.app%2Fkpm%3FqrAuth%3D" & I' + rowNum + ')'];
    } else {
      tokenUpdates[i] = [qrToken];
      formulaUpdates[i] = [""];
    }
  }

  if (hasTokenChanges) {
    sheet.getRange(2, 9, numRows, 1).setValues(tokenUpdates);
  }
  sheet.getRange(2, 10, numRows, 1).setFormulas(formulaUpdates);

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

    var isSuper = (uName.toUpperCase() === "ST" || uRole.toLowerCase().includes("super"));
    var loginUrl = KPM_WEB_BASE_URL + "?qrAuth=" + encodeURIComponent(uQrToken);
    var qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(loginUrl);

    list.push({
      no: uNo,
      username: uName,
      email: uEmail,
      fullName: uFullName || uName,
      role: isSuper ? "Super Admin" : uRole,
      isAdmin: isSuper || uRole.toLowerCase() === "admin",
      isSuperAdmin: isSuper,
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
 * 3. Google OAuth ID Token (Email match)
 * 4. Username/Email + Password/PIN
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
  var sheet = ss.getSheetByName(USERS_SHEET_NAME) || ss.getSheetByName("Pengguna") || ss.getSheetByName("User") || ss.getSheetByName("users");
  if (!sheet) {
    sheet = setupUsersSheet();
  }
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    setupUsersSheet();
    sheet = ss.getSheetByName(USERS_SHEET_NAME) || ss.getSheetByName("Pengguna") || ss.getSheetByName("User");
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

    // 4. Match via Username / Email / Full Name + Password / PIN
    var isUserMatch = inputUsername && (
      uName === inputUsername ||
      uEmail === inputUsername ||
      uFullName.toLowerCase() === inputUsername ||
      (uName && inputUsername.includes(uName)) ||
      (uFullName && uFullName.toLowerCase().includes(inputUsername))
    );

    if (isUserMatch) {
      if (uPass !== inputPassword && uPass.trim() !== inputPassword.trim()) {
        throw { code: "INVALID_CREDENTIALS", message: "PIN / Password untuk akun '" + (uFullName || uName) + "' salah." };
      }
      if (uStatus.toLowerCase() !== "aktif") {
        throw { code: "ACCOUNT_INACTIVE", message: "Akun '" + (uFullName || uName) + "' sedang berstatus nonaktif. Hubungi Admin." };
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
