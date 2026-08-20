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
 */
function getAboutLogoSafe() {
  var defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='%230B57D0'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='36' font-weight='bold' fill='%23FFFFFF'>SG</text></svg>";

  if (!ABOUT_CONFIG.LOGO_ID || ABOUT_CONFIG.LOGO_ID === "PASTE_YOUR_ABOUT_LOGO_FILE_ID_HERE") {
    return defaultLogo;
  }

  try {
    var file = DriveApp.getFileById(ABOUT_CONFIG.LOGO_ID);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    return "data:" + contentType + ";base64," + base64;
  } catch (err) {
    Logger.log("getAboutLogoSafe warning: " + err.message);
    return defaultLogo;
  }
}

/**
 * Opens the modern About dialog.
 */
function openAboutDialog() {
  if (!verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Peringatan: Integritas sistem tidak valid.");
    return;
  }

  var template = HtmlService.createTemplateFromFile('About');
  template.info = getAppAuthorInfo();

  var htmlOutput = template.evaluate()
    .setWidth(450)
    .setHeight(480);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Tentang Pembuat');
}
