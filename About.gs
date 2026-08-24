// ============================================
// ABOUT & SYSTEM SIGNATURE (About.gs)
// ============================================
// Author      : Setyo Guntur Samudro
// Institution : SMK Negeri 1 Madiun
// Faculty     : T.I.T.L (Teknik Instalasi Tenaga Listrik)
// ============================================

var ABOUT_CONFIG = {
  AUTHOR: "Setyo Guntur Samudro",
  INSTITUTION: "SMK Negeri 1 Madiun",
  FACULTY: "T.I.T.L (Teknik Instalasi Tenaga Listrik)",
  APP_NAME: "Sistem Otomasi KPM 2026",
  VERSION: "8.0.0",
  YEAR: "2026",
  LOGO_ID: "1UWZKajgW8l1vJX7pTL8kYuF7A6tprIjT"
};

// ============================================
// PRE-HASHED DIGITAL SIGNATURE & SYSTEM SEAL
// ============================================
var _SYSTEM_SEAL = Object.freeze({
  _M_SEED: ["53475f53","4d4b4e31","4d414449","554e5f54","49544c5f","32303236","5f415554","484f525f","494e5445","47524954","595f5341","4c545f56","38"],
  EXPECTED_META_SEAL: "098c6958a07027c8e1e80ca4d8f4b932803bd74d60473906c5b6d601e72c762f"
});

var _cachedIntegrityVerified = null;

function _decodeSeedChunks(chunks) {
  var hex = chunks.join('');
  var str = '';
  for (var i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

function _normalizeText(str) {
  return String(str || '').trim().replace(/\s+/g, ' ');
}

function _computeSha256Hex(text) {
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < signature.length; i++) {
    var byteVal = signature[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hex += byteHex;
  }
  return hex;
}

/**
 * Core security integrity check.
 * Validates pre-hashed digital signatures across any account/environment.
 * If validation fails, all automation, web endpoints, and spreadsheet actions lockdown.
 */
function verifyAppSignature() {
  if (_cachedIntegrityVerified !== null) return _cachedIntegrityVerified;

  if (typeof ABOUT_CONFIG === 'undefined' || !ABOUT_CONFIG) {
    Logger.log("CRITICAL SECURITY: ABOUT_CONFIG is undefined.");
    _cachedIntegrityVerified = false;
    return false;
  }

  var metaSecret = _decodeSeedChunks(_SYSTEM_SEAL._M_SEED);

  // 1. Verify Metadata Seal with Secret Key
  var metaPayload = metaSecret + "::" +
    _normalizeText(ABOUT_CONFIG.AUTHOR) + "|" +
    _normalizeText(ABOUT_CONFIG.INSTITUTION) + "|" +
    _normalizeText(ABOUT_CONFIG.FACULTY) + "|" +
    _normalizeText(ABOUT_CONFIG.APP_NAME) + "|" +
    _normalizeText(ABOUT_CONFIG.YEAR) + "::" +
    metaSecret;

  var metaHash = _computeSha256Hex(metaPayload);
  if (metaHash !== _SYSTEM_SEAL.EXPECTED_META_SEAL) {
    Logger.log("CRITICAL SECURITY: Metadata integrity signature mismatch!");
    _cachedIntegrityVerified = false;
    return false;
  }

  // 2. Verify AboutDialog Template Existence
  try {
    var tpl = HtmlService.createTemplateFromFile('AboutDialog');
    if (!tpl) {
      Logger.log("CRITICAL SECURITY: AboutDialog template missing.");
      _cachedIntegrityVerified = false;
      return false;
    }
  } catch (err) {
    Logger.log("CRITICAL SECURITY: AboutDialog template missing or unreadable: " + err.message);
    _cachedIntegrityVerified = false;
    return false;
  }

  _cachedIntegrityVerified = true;
  return true;
}

/**
 * Reads the institution logo file ID from Script Properties (ABOUT_LOGO_ID or KPM_ABOUT_LOGO_ID) with fallback to ABOUT_CONFIG.LOGO_ID.
 */
function getEffectiveLogoId() {
  try {
    var props = PropertiesService.getScriptProperties();
    var envLogoId = props.getProperty('ABOUT_LOGO_ID') || props.getProperty('KPM_ABOUT_LOGO_ID');
    if (envLogoId && String(envLogoId).trim() && String(envLogoId).trim() !== "PASTE_YOUR_ABOUT_LOGO_FILE_ID_HERE") {
      return String(envLogoId).trim();
    }
  } catch (e) {
    Logger.log("getEffectiveLogoId warning: " + e.message);
  }
  return ABOUT_CONFIG.LOGO_ID || "";
}

/**
 * Returns author, institution, and faculty metadata.
 */
function getAppAuthorInfo() {
  var version = ABOUT_CONFIG.VERSION;
  try {
    var envVersion = PropertiesService.getScriptProperties().getProperty('APP_VERSION');
    if (envVersion && String(envVersion).trim()) {
      version = String(envVersion).trim();
    }
  } catch (e) {}

  return {
    author: ABOUT_CONFIG.AUTHOR,
    institution: ABOUT_CONFIG.INSTITUTION,
    faculty: ABOUT_CONFIG.FACULTY,
    appName: ABOUT_CONFIG.APP_NAME,
    version: version,
    year: ABOUT_CONFIG.YEAR,
    logo: getAboutLogoSafe()
  };
}

/**
 * Safely fetches the author/school logo from Google Drive using DriveApp.
 * Uses ABOUT_LOGO_ID Script Property if configured.
 */
var _aboutLogoMemoryCache = null;

function getAboutLogoSafe() {
  var defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><circle cx='60' cy='60' r='54' fill='none' stroke='%233b82f6' stroke-width='4'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' font-weight='bold' fill='%23FFFFFF'>SMKN 1</text></svg>";

  var logoId = getEffectiveLogoId();
  if (!logoId || logoId === "PASTE_YOUR_ABOUT_LOGO_FILE_ID_HERE") {
    return defaultLogo;
  }

  // 1. RAM in-memory cache
  if (_aboutLogoMemoryCache && _aboutLogoMemoryCache.logoId === logoId) {
    return _aboutLogoMemoryCache.dataUrl;
  }

  // 2. ScriptCache
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("APP_ABOUT_LOGO_" + logoId);
    if (cached) {
      _aboutLogoMemoryCache = { logoId: logoId, dataUrl: cached };
      return cached;
    }
  } catch (e) {}

  // 3. Fallback: DriveApp fetch
  try {
    var file = DriveApp.getFileById(logoId);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var dataUrl = "data:" + contentType + ";base64," + base64;
    _aboutLogoMemoryCache = { logoId: logoId, dataUrl: dataUrl };

    try {
      if (dataUrl.length < 100000) {
        CacheService.getScriptCache().put("APP_ABOUT_LOGO_" + logoId, dataUrl, 21600); // 6 hours
      }
    } catch (ce) {}

    return dataUrl;
  } catch (err) {
    Logger.log("getAboutLogoSafe warning: " + err.message);
    return defaultLogo;
  }
}

/**
 * Opens the modern About dialog with larger dimensions.
 */
function openAboutDialog() {
  if (!verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Peringatan Kritis: Integritas sistem tidak valid. Hak cipta telah dimodifikasi.");
    return;
  }

  var template = HtmlService.createTemplateFromFile('AboutDialog');
  template.info = getAppAuthorInfo();

  var htmlOutput = template.evaluate()
    .setWidth(530)
    .setHeight(580);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Tentang Pembuat & Instansi');
}
