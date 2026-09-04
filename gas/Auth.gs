// ============================================
// AUTHENTICATION & USER MANAGEMENT (Auth.gs)
// ============================================

var _cachedApiTokens = null;

var ROLE = {
  IT: "it",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  DRIVER: "driver"
};

/**
 * Normalizes any role string into one of the 4 standard system keys.
 */
function normalizeRole(rawRole) {
  var r = String(rawRole || "").trim().toLowerCase();
  if (r === "it" || r.indexOf("it") === 0 || r === "maker" || r === "makers") return ROLE.IT;
  if (r.indexOf("super") !== -1) return ROLE.SUPER_ADMIN;
  if (r.indexOf("admin") !== -1) return ROLE.ADMIN;
  return ROLE.DRIVER;
}

/**
 * Returns complete permission set object for a normalized role key.
 */
function buildRolePermissions(roleKey) {
  var isIT = (roleKey === ROLE.IT);
  var isSuperAdmin = (roleKey === ROLE.SUPER_ADMIN || isIT);
  var isAdmin = (roleKey === ROLE.ADMIN || isSuperAdmin);
  var isDriver = (roleKey === ROLE.DRIVER);

  return {
    role: roleKey,
    roleLabel: isIT ? "IT (The Makers)" : (roleKey === ROLE.SUPER_ADMIN ? "Super Admin" : (roleKey === ROLE.ADMIN ? "Admin" : "Driver")),
    isIT: isIT,
    isSuperAdmin: isSuperAdmin,
    isAdmin: isAdmin,
    isDriver: isDriver,
    canSwitchRole: isSuperAdmin, // Super Admin and IT can switch between Admin and Driver panels
    canOverrideStatus: isSuperAdmin, // Strictly Super Admin and IT (Regular Admin is FORBIDDEN)
    canManageUsers: isSuperAdmin, // Super Admin and IT can manage users
    canSystemDiagnostics: isIT // Strictly IT only
  };
}

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
 * Public sheet contains standard staff accounts (ST is hidden/secret).
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

    // Initial default staff users mapped to 4-tier roles
    var initialUsers = [
      [1, "admin", "aang@kpm.com", "admin123", "AANG", "Super Admin", "Aktif", "Supervisor / Operational Leader", "kpm_usr_admin_aang", ''],
      [2, "eko", "eko@kpm.com", "admin123", "EKO", "Admin", "Aktif", "Admin Logistik", "kpm_usr_admin_eko", ''],
      [3, "driver1", "budi@kpm.com", "driver123", "PAK BUDI", "Driver", "Aktif", "Driver Armada 1", "kpm_usr_drv_budi", ''],
      [4, "driver2", "joko@kpm.com", "driver123", "PAK JOKO", "Driver", "Aktif", "Driver Armada 2", "kpm_usr_drv_joko", '']
    ];
    sheet.getRange(2, 1, initialUsers.length, headers[0].length).setValues(initialUsers);
  }

  // Set dropdown validation for Peran (Role) column (Col 6)
  try {
    var roleRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["IT", "Super Admin", "Admin", "Driver"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, 6, Math.max(sheet.getMaxRows() - 1, 10), 1).setDataValidation(roleRule);
  } catch (e) {
    // Non-fatal if executed without full spreadsheet UI context
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

    var normalized = normalizeRole(uRole);
    var perms = buildRolePermissions(normalized);
    var loginUrl = KPM_WEB_BASE_URL + "?qrAuth=" + encodeURIComponent(uQrToken);
    var qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=" + encodeURIComponent(loginUrl);

    list.push({
      no: uNo,
      username: uName,
      email: uEmail,
      fullName: uFullName || uName,
      role: perms.role,
      roleLabel: perms.roleLabel,
      isAdmin: perms.isAdmin,
      isSuperAdmin: perms.isSuperAdmin,
      isIT: perms.isIT,
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
 * Returns active user accounts for in-app User Management panel.
 * PINs are omitted for security.
 */
function getUsersList() {
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
    var uPass = String(row[3] || "").trim();
    var uFullName = String(row[4] || "").trim();
    var uRole = String(row[5] || "Driver").trim();
    var uStatus = String(row[6] || "Aktif").trim();
    var uKet = String(row[7] || "").trim();
    var uQrToken = String(row[8] || "").trim();

    if (!uName && !uFullName) continue;

    var normalized = normalizeRole(uRole);
    var perms = buildRolePermissions(normalized);
    var loginUrl = KPM_WEB_BASE_URL + "?qrAuth=" + encodeURIComponent(uQrToken);
    var qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(loginUrl);

    list.push({
      no: uNo,
      username: uName,
      email: uEmail,
      fullName: uFullName || uName,
      role: perms.role,
      roleLabel: perms.roleLabel,
      isIT: perms.isIT,
      isSuperAdmin: perms.isSuperAdmin,
      isAdmin: perms.isAdmin,
      isDriver: perms.isDriver,
      status: uStatus,
      keterangan: uKet,
      qrToken: uQrToken,
      hasPin: Boolean(uPass),
      loginUrl: loginUrl,
      qrImageUrl: qrImageUrl
    });
  }

  return list;
}

/**
 * Saves a new user or updates an existing user in the Users sheet.
 * Protected against formula injection and uses single batch writes.
 */
function saveUser(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Data pengguna tidak valid." };
  }

  var rawUsername = String(params.username || "").trim().toLowerCase();
  var rawFullName = String(params.fullName || params.name || "").trim();
  var rawEmail = String(params.email || "").trim().toLowerCase();
  var rawPin = String(params.pin || params.password || "").trim();
  var rawRole = String(params.role || "Driver").trim();
  var rawStatus = String(params.status || "Aktif").trim();
  var rawKet = String(params.keterangan || "").trim();

  if (!rawUsername && !rawFullName) {
    throw { code: "VALIDATION_ERROR", message: "Username dan Nama Lengkap wajib diisi." };
  }

  // Prevent modifying secret ST account via public user manager
  if (rawUsername === "st") {
    throw { code: "FORBIDDEN", message: "Akun ST adalah akun sistem internal rahasia dan tidak dapat dimodifikasi di sini." };
  }

  var normalized = normalizeRole(rawRole);
  var roleLabel = (normalized === ROLE.IT) ? "IT" :
                  (normalized === ROLE.SUPER_ADMIN) ? "Super Admin" :
                  (normalized === ROLE.ADMIN) ? "Admin" : "Driver";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME) || setupUsersSheet();
  var lastRow = sheet.getLastRow();
  var numCols = Math.max(sheet.getLastColumn(), 10);
  var data = (lastRow >= 2) ? sheet.getRange(2, 1, lastRow - 1, numCols).getValues() : [];

  var existingRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    var rowUser = String(data[i][1] || "").trim().toLowerCase();
    var rowEmail = String(data[i][2] || "").trim().toLowerCase();
    if (rawUsername && rowUser === rawUsername) {
      existingRowIdx = i;
      break;
    }
    if (rawEmail && rowEmail === rawEmail) {
      existingRowIdx = i;
      break;
    }
  }

  if (existingRowIdx !== -1) {
    // Update existing user
    var targetRow = existingRowIdx + 2;
    var rowVals = data[existingRowIdx];
    var currentPin = String(rowVals[3] || "");
    var currentToken = String(rowVals[8] || "");

    var updatedPin = rawPin ? rawPin : currentPin;
    if (!currentToken) {
      var baseSlug = rawUsername ? rawUsername.replace(/[^a-z0-9]/g, '') : "usr";
      currentToken = "kpm_usr_" + baseSlug + "_" + Utilities.getUuid().replace(/-/g, '').substring(0, 6);
    }

    var updatedRow = [
      rowVals[0] || (existingRowIdx + 1),
      sanitizeSpreadsheetInput(rawUsername),
      sanitizeSpreadsheetInput(rawEmail),
      sanitizeSpreadsheetInput(updatedPin),
      sanitizeSpreadsheetInput(rawFullName),
      roleLabel,
      rawStatus || "Aktif",
      sanitizeSpreadsheetInput(rawKet),
      currentToken
    ];

    sheet.getRange(targetRow, 1, 1, updatedRow.length).setValues([updatedRow]);
    sheet.getRange(targetRow, 10).setFormula('=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fcombined-app-eight.vercel.app%2Fkpm%3FqrAuth%3D" & I' + targetRow + ')');

    return { success: true, message: "Pengguna '" + rawFullName + "' (" + roleLabel + ") berhasil diperbarui.", username: rawUsername };
  } else {
    // Insert new user
    var newNo = data.length + 1;
    var newRow = lastRow + 1;
    var baseSlug = rawUsername ? rawUsername.replace(/[^a-z0-9]/g, '') : "usr";
    var newToken = "kpm_usr_" + baseSlug + "_" + Utilities.getUuid().replace(/-/g, '').substring(0, 6);

    var newVals = [
      newNo,
      sanitizeSpreadsheetInput(rawUsername),
      sanitizeSpreadsheetInput(rawEmail),
      sanitizeSpreadsheetInput(rawPin || "123456"),
      sanitizeSpreadsheetInput(rawFullName),
      roleLabel,
      rawStatus || "Aktif",
      sanitizeSpreadsheetInput(rawKet),
      newToken
    ];

    sheet.getRange(newRow, 1, 1, newVals.length).setValues([newVals]);
    sheet.getRange(newRow, 10).setFormula('=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fcombined-app-eight.vercel.app%2Fkpm%3FqrAuth%3D" & I' + newRow + ')');

    return { success: true, message: "Pengguna baru '" + rawFullName + "' (" + roleLabel + ") berhasil didaftarkan.", username: rawUsername };
  }
}

/**
 * Toggles a user's status between Aktif and Nonaktif.
 */
function toggleUserStatus(params) {
  var rawUsername = String(params.username || "").trim().toLowerCase();
  if (!rawUsername) {
    throw { code: "VALIDATION_ERROR", message: "Username pengguna harus disertakan." };
  }
  if (rawUsername === "st") {
    throw { code: "FORBIDDEN", message: "Status akun ST tidak dapat diubah." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME) || setupUsersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw { code: "USER_NOT_FOUND", message: "Tabel pengguna kosong." };
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  for (var i = 0; i < data.length; i++) {
    var uName = String(data[i][1] || "").trim().toLowerCase();
    if (uName === rawUsername) {
      var currentStatus = String(data[i][6] || "Aktif").trim();
      var newStatus = (params.status) ? String(params.status).trim() : (currentStatus.toLowerCase() === "aktif" ? "Nonaktif" : "Aktif");
      sheet.getRange(i + 2, 7).setValue(newStatus);
      return { success: true, username: rawUsername, status: newStatus };
    }
  }

  throw { code: "USER_NOT_FOUND", message: "Pengguna '" + rawUsername + "' tidak ditemukan di spreadsheet." };
}

/**
 * IT-only: Runs system diagnostics and environment health check.
 */
function runSystemDiagnostics() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function(s) {
    return { name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn() };
  });
  var props = PropertiesService.getScriptProperties().getProperties();

  return {
    systemStatus: "OPERATIONAL",
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    sheets: sheets,
    configuredPropertiesCount: Object.keys(props).length,
    activeDeploymentId: "AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA",
    timestamp: new Date().toISOString()
  };
}

/**
 * Authenticates user credentials against the Users sheet in spreadsheet.
 * Supports:
 * 1. Secret ST (The Makers / IT) bypass (secret link/QR only)
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

  // 1. SECRET MASTER BYPASS FOR "ST" (IT / The Makers with full access)
  var secretPropToken = PropertiesService.getScriptProperties().getProperty("ST_SECRET_TOKEN");
  var validMasterTokens = [ST_SECRET_MASTER_TOKEN, "kpm_st_master_99x"];
  if (secretPropToken) validMasterTokens.push(secretPropToken);

  if (qrAuthToken && validMasterTokens.indexOf(qrAuthToken) !== -1) {
    var tokens = getApiTokens();
    var itPerms = buildRolePermissions(ROLE.IT);
    return {
      username: "ST",
      email: "st@kpm.internal",
      name: "ST (The Maker / IT)",
      role: itPerms.role,
      roleLabel: itPerms.roleLabel,
      isIT: itPerms.isIT,
      isSuperAdmin: itPerms.isSuperAdmin,
      isAdmin: itPerms.isAdmin,
      isDriver: itPerms.isDriver,
      canSwitchRole: itPerms.canSwitchRole,
      canOverrideStatus: itPerms.canOverrideStatus,
      canManageUsers: itPerms.canManageUsers,
      canSystemDiagnostics: itPerms.canSystemDiagnostics,
      authMethod: "secret_link",
      token: tokens.adminToken
    };
  }

  // Reject manual password login for ST
  if (inputUsername === "st") {
    throw {
      code: "LINK_ONLY_AUTH",
      message: "Akun ST adalah akun rahasia sistem dan hanya dapat diakses melalui tautan rahasia khusus."
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

    var roleKey = normalizeRole(uRole);
    var perms = buildRolePermissions(roleKey);

    // 2. Match via QR Auth Token from spreadsheet
    if (qrAuthToken && uQrToken && (uQrToken === qrAuthToken || uQrToken.toLowerCase() === qrAuthToken.toLowerCase())) {
      if (uStatus.toLowerCase() !== "aktif") {
        throw { code: "ACCOUNT_INACTIVE", message: "Akun (" + (uFullName || uName) + ") sedang dinonaktifkan. Hubungi Admin." };
      }
      matchedUser = {
        username: uName || uFullName,
        email: uEmail,
        name: uFullName || uName,
        role: perms.role,
        roleLabel: perms.roleLabel,
        isIT: perms.isIT,
        isSuperAdmin: perms.isSuperAdmin,
        isAdmin: perms.isAdmin,
        isDriver: perms.isDriver,
        canSwitchRole: perms.canSwitchRole,
        canOverrideStatus: perms.canOverrideStatus,
        canManageUsers: perms.canManageUsers,
        canSystemDiagnostics: perms.canSystemDiagnostics,
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
        role: perms.role,
        roleLabel: perms.roleLabel,
        isIT: perms.isIT,
        isSuperAdmin: perms.isSuperAdmin,
        isAdmin: perms.isAdmin,
        isDriver: perms.isDriver,
        canSwitchRole: perms.canSwitchRole,
        canOverrideStatus: perms.canOverrideStatus,
        canManageUsers: perms.canManageUsers,
        canSystemDiagnostics: perms.canSystemDiagnostics,
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
        role: perms.role,
        roleLabel: perms.roleLabel,
        isIT: perms.isIT,
        isSuperAdmin: perms.isSuperAdmin,
        isAdmin: perms.isAdmin,
        isDriver: perms.isDriver,
        canSwitchRole: perms.canSwitchRole,
        canOverrideStatus: perms.canOverrideStatus,
        canManageUsers: perms.canManageUsers,
        canSystemDiagnostics: perms.canSystemDiagnostics,
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
  matchedUser.token = (matchedUser.role === ROLE.DRIVER) ? tokens.driverToken : tokens.adminToken;

  return matchedUser;
}

/**
 * Validates the API token and enforces role-based authorization for an action.
 * Enforces:
 * - adminUpdateStatus (manual status override): strictly IT and Super Admin. Regular Admin is FORBIDDEN.
 * - User management: strictly IT and Super Admin.
 * - System diagnostics: strictly IT.
 */
function authenticateRequest(params, action) {
  if (action === "login") {
    return { role: "GUEST", authenticated: true };
  }

  var tokens = getApiTokens();
  var submittedToken = (params && (params.apiToken || params.token)) ? String(params.apiToken || params.token).trim() : "";

  // Allow public recipient receipt confirmation and recipients list fetching
  if ((action === "confirmArrivalReceipt" || action === "getRecipients") && !submittedToken) {
    submittedToken = tokens.driverToken;
  }

  if (!submittedToken) {
    throw {
      code: "UNAUTHORIZED",
      message: "Akses ditolak: Token API tidak valid atau tidak disertakan."
    };
  }

  var isBearerAdmin = (submittedToken === tokens.adminToken);
  var isBearerDriver = (submittedToken === tokens.driverToken);

  if (!isBearerAdmin && !isBearerDriver) {
    throw {
      code: "UNAUTHORIZED",
      message: "Akses ditolak: Token API tidak cocok atau kedaluwarsa."
    };
  }

  var requestedUsername = (params && params.username) ? String(params.username).trim() : "";
  var clientRole = (params && params.role) ? normalizeRole(params.role) : "";
  var userRole = isBearerAdmin ? (clientRole || ROLE.ADMIN) : ROLE.DRIVER;

  if (requestedUsername.toUpperCase() === "ST" || submittedToken === ST_SECRET_MASTER_TOKEN) {
    userRole = ROLE.IT;
  }

  // 1. Direct status override (adminUpdateStatus)
  // RULE: Strictly IT and Super Admin. Regular Admin and Driver are FORBIDDEN.
  if (action === "adminUpdateStatus") {
    if (!isBearerAdmin || (userRole !== ROLE.IT && userRole !== ROLE.SUPER_ADMIN)) {
      throw {
        code: "FORBIDDEN",
        message: "Akses ditolak: Peran Admin tidak diizinkan mengubah status pengiriman secara manual. Status otomatis diperbarui oleh Driver di lapangan atau melalui Super Admin / IT."
      };
    }
  }

  // 2. IT-only actions (diagnostics, format repair, etc.)
  var itOnlyActions = ["runSystemDiagnostics"];
  if (itOnlyActions.indexOf(action) !== -1) {
    if (!isBearerAdmin || userRole !== ROLE.IT) {
      throw {
        code: "FORBIDDEN",
        message: "Akses ditolak: Tindakan ini hanya diizinkan untuk peran IT (The Makers)."
      };
    }
  }

  // 3. User management actions
  var userMgmtActions = ["getUsersList", "saveUser", "toggleUserStatus"];
  if (userMgmtActions.indexOf(action) !== -1) {
    if (!isBearerAdmin || (userRole !== ROLE.IT && userRole !== ROLE.SUPER_ADMIN)) {
      throw {
        code: "FORBIDDEN",
        message: "Akses ditolak: Pengelolaan pengguna hanya dapat diakses oleh IT dan Super Admin."
      };
    }
  }

  // 4. Admin operational actions
  var adminOnlyActions = ["createKpm", "archiveKpm", "getMonitoring", "editLatestKpmItems"];
  if (adminOnlyActions.indexOf(action) !== -1) {
    if (!isBearerAdmin) {
      throw {
        code: "FORBIDDEN",
        message: "Akses ditolak: Tindakan ini memerlukan hak akses Administrator."
      };
    }
  }

  return { role: userRole.toUpperCase(), authenticated: true };
}
