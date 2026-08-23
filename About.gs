// ============================================
// ABOUT & SYSTEM SIGNATURE (About.gs)
// ============================================
// Author      : Setyo Guntur Samudro
// Institution : SMK Negeri 1 Madiun
// ============================================

var ABOUT_CONFIG = {
  AUTHOR: "Setyo Guntur Samudro",
  INSTITUTION: "SMK Negeri 1 Madiun",
  APP_NAME: "Sistem Otomasi KPM 2026",
  VERSION: "2.5.0",
  YEAR: "2026",
  LOGO_ID: "1UWZKajgW8l1vJX7pTL8kYuF7A6tprIjT"
};

// Cryptographic hash / signature token to verify integrity
var SYSTEM_TOKEN = "SG-SMKN1MDN-KPM2026-SETYO-GUNTUR-SAMUDRO";

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
 * Returns author and institution metadata.
 */
function getAppAuthorInfo() {
  return {
    author: ABOUT_CONFIG.AUTHOR,
    institution: ABOUT_CONFIG.INSTITUTION,
    appName: ABOUT_CONFIG.APP_NAME,
    version: ABOUT_CONFIG.VERSION,
    year: ABOUT_CONFIG.YEAR,
    logo: getAboutLogoSafe()
  };
}

/**
 * Core security integrity check.
 * If About.gs is deleted, renamed, or modified without matching tokens,
 * all automation and printing functions across the project will immediately stop.
 */
function verifyAppSignature() {
  if (typeof ABOUT_CONFIG === 'undefined' || !ABOUT_CONFIG) return false;
  if (ABOUT_CONFIG.AUTHOR !== "Setyo Guntur Samudro") return false;
  if (ABOUT_CONFIG.INSTITUTION !== "SMK Negeri 1 Madiun") return false;
  if (typeof SYSTEM_TOKEN === 'undefined' || SYSTEM_TOKEN !== "SG-SMKN1MDN-KPM2026-SETYO-GUNTUR-SAMUDRO") return false;
  return true;
}

/**
 * Safely fetches the author/school logo from Google Drive using DriveApp.
 * Uses KPM_LOGO_ID Script Property if configured.
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
    SpreadsheetApp.getUi().alert("Peringatan: Integritas sistem tidak valid.");
    return;
  }

  var template = HtmlService.createTemplateFromFile('AboutDialog');
  template.info = getAppAuthorInfo();

  var htmlOutput = template.evaluate()
    .setWidth(520)
    .setHeight(560);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Tentang Pembuat & Instansi');
}
