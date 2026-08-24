// ============================================
// CONFIG & CONSTANTS
// ============================================
var PRINT = {
  LOGO_ID: "PASTE_YOUR_LOGO_FILE_ID_HERE"
};

var MATERIALDB_SHEET_NAME = "DataBase";
var MATERIALDB_HEADER_ROW = 4; // header labels on row 4
var MATERIALDB_START_ROW = 5;  // data starts at row 5

// DataBase columns (1-indexed, A to L):
// A=No., B=Kode Material, C=Deskripsi Material, D=Material Group,
// E=BUn, F=Plant, G=Update Data, H=Kategori, I=Lead Time (hari),
// J=Harga Satuan, K=2024, L=2025
var COL_KODE = 2;   // Col B: Kode Material
var COL_NAMA = 3;   // Col C: Deskripsi Material
var COL_SATUAN = 5; // Col E: BUn (Base Unit)

var PAGE_SIZE = 15; // Set page break to 15 items per page

// ============================================
// DEBUG
// ============================================
function debugListSheetNames() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  Logger.log('--- Nama sheet yang terdeteksi ---');
  for (var i = 0; i < sheets.length; i++) {
    Logger.log('[' + i + '] "' + sheets[i].getName() + '"');
  }
}

// ============================================
// MENU
// ============================================
function onOpen() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
    Logger.log("Sistem dinonaktifkan: Modul About.gs tidak valid atau telah diubah.");
    return;
  }

  SpreadsheetApp.getUi()
    .createMenu('Menu KPM')
    .addItem('🖨️ Cetak Dokumen KPM', 'printKpmM')
    .addItem('🧹 Bersihkan Baris Kosong', 'cleanOrphanedRows')
    .addItem('🛠️ Setup Kolom Tracking', 'setupTrackingHeaders')
    .addSeparator()
    .addItem('⚙️ Pengaturan Master KPM', 'openMasterKpm')
    .addItem('ℹ️ Tentang Pembuat', 'openAboutDialog')
    .addToUi();
}

// ============================================
// MASTER KPM SETTINGS
// ============================================
function openMasterKpm() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Integritas sistem gagal: Modul About.gs tidak ditemukan.");
    return;
  }

  var html = HtmlService.createHtmlOutputFromFile('MasterKPM')
    .setWidth(580)
    .setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pengaturan Master KPM');
}

var _masterSettingsCache = null;

function getMasterSettings() {
  if (_masterSettingsCache) return _masterSettingsCache;
  var props = PropertiesService.getDocumentProperties();
  _masterSettingsCache = {
    template: props.getProperty('KPM_TEMPLATE') || '{no}/PPO/LF/{month}/{year}',
    lampiranTemplate: props.getProperty('KPM_LAMPIRAN_TEMPLATE') || '{no}/KPM/{month}/{year}',
    startNo: props.getProperty('KPM_START_NO') || '1'
  };
  return _masterSettingsCache;
}

function saveMasterSettings(settings) {
  var props = PropertiesService.getDocumentProperties();
  props.setProperty('KPM_TEMPLATE', settings.template);
  props.setProperty('KPM_LAMPIRAN_TEMPLATE', settings.lampiranTemplate);
  props.setProperty('KPM_START_NO', settings.startNo);
  _masterSettingsCache = {
    template: settings.template,
    lampiranTemplate: settings.lampiranTemplate,
    startNo: settings.startNo
  };
  return true;
}

function getGeneratedKpmNumbers() {
  var settings = getMasterSettings();
  var date = new Date();
  var year = date.getFullYear();
  var monthIndex = date.getMonth(); // 0-indexed (0 = Jan, 7 = Aug)
  
  var romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  var monthRoman = romanMonths[monthIndex];
  var monthNum = String(monthIndex + 1).padStart(2, '0');
  
  var currentNo = parseInt(settings.startNo, 10) || 1;
  var formattedNo = String(currentNo).padStart(3, '0');
  
  function applyTemplate(tpl) {
    if (!tpl) return "";
    return tpl
      .replace(/\{no\}/g, formattedNo)
      .replace(/\{year\}/g, year)
      .replace(/\{month\}/g, monthRoman)
      .replace(/\{monthNum\}/g, monthNum);
  }

  return {
    kpmNo: applyTemplate(settings.template),
    lampiranNo: applyTemplate(settings.lampiranTemplate)
  };
}

// ============================================
// FAST CACHED LOOKUP FOR KODE MATERIAL
// ============================================
var _materialMemoryCache = {};
var _materialsLoadedInRam = false;

function getMaterialDatabaseMap() {
  if (_materialsLoadedInRam) return _materialMemoryCache;

  // 1. Try ScriptCache
  try {
    var cache = CacheService.getScriptCache();
    var countStr = cache.get("ALL_MATS_count");
    if (countStr) {
      var totalChunks = parseInt(countStr, 10);
      if (!isNaN(totalChunks) && totalChunks > 0) {
        var keys = [];
        for (var k = 0; k < totalChunks; k++) keys.push("ALL_MATS_" + k);
        var chunks = cache.getAll(keys);
        var json = "";
        var complete = true;
        for (var c = 0; c < totalChunks; c++) {
          if (!chunks["ALL_MATS_" + c]) { complete = false; break; }
          json += chunks["ALL_MATS_" + c];
        }
        if (complete && json) {
          var parsed = JSON.parse(json);
          _materialMemoryCache = parsed;
          _materialsLoadedInRam = true;
          return _materialMemoryCache;
        }
      }
    }
  } catch (e) {}

  // 2. Fallback: Fetch DataBase sheet (Read ONLY Cols B to E = 4 columns)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MATERIALDB_SHEET_NAME);
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var s = 0; s < sheets.length; s++) {
      if (sheets[s].getName().trim().toLowerCase() === MATERIALDB_SHEET_NAME.trim().toLowerCase()) {
        sheet = sheets[s];
        break;
      }
    }
  }
  if (!sheet) return _materialMemoryCache;

  var lastRow = sheet.getLastRow();
  if (lastRow < MATERIALDB_START_ROW) return _materialMemoryCache;

  var numRows = lastRow - MATERIALDB_START_ROW + 1;
  var data = sheet.getRange(MATERIALDB_START_ROW, 2, numRows, 4).getValues();

  for (var i = 0; i < data.length; i++) {
    var rowKode = data[i][0]; // Col B
    if (rowKode) {
      var kStr = rowKode.toString().trim().toUpperCase();
      var itemObj = {
        kode: rowKode.toString().trim(),
        nama: data[i][1] ? data[i][1].toString().trim() : "", // Col C
        satuan: data[i][3] ? data[i][3].toString().trim() : "" // Col E
      };
      _materialMemoryCache[kStr] = itemObj;
    }
  }
  _materialsLoadedInRam = true;

  // Cache in ScriptCache chunked
  try {
    var cacheService = CacheService.getScriptCache();
    var fullJson = JSON.stringify(_materialMemoryCache);
    var chunkSize = 90000;
    var count = Math.ceil(fullJson.length / chunkSize);
    var batch = { "ALL_MATS_count": String(count) };
    for (var j = 0; j < count; j++) {
      batch["ALL_MATS_" + j] = fullJson.substr(j * chunkSize, chunkSize);
    }
    cacheService.putAll(batch, 21600); // 6 hours
  } catch (e) {}

  return _materialMemoryCache;
}

function getMaterialByKode(kode) {
  if (!kode) return null;
  var kodeTrimmed = kode.toString().trim().toUpperCase();
  if (kodeTrimmed === "") return null;

  if (_materialMemoryCache[kodeTrimmed]) {
    return _materialMemoryCache[kodeTrimmed];
  }

  var map = getMaterialDatabaseMap();
  return map[kodeTrimmed] || null;
}

// ============================================
// OPENS THE PRINT-READY PREVIEW
// ============================================
function openPrintView(data) {
  var template = HtmlService.createTemplateFromFile('PrintKPM');
  template.data = data;

  var htmlOutput = template.evaluate()
    .setWidth(1200)
    .setHeight(820);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Preview KPM - ' + data.header.noRefKpp);
  return true;
}

// ============================================
// LOGO
// ============================================
var _logoMemoryCache = null;

function getEffectivePrintLogoId() {
  try {
    var envLogoId = PropertiesService.getScriptProperties().getProperty('KPM_LOGO_ID');
    if (envLogoId && String(envLogoId).trim() && String(envLogoId).trim() !== "PASTE_YOUR_LOGO_FILE_ID_HERE") {
      return String(envLogoId).trim();
    }
  } catch (e) {}
  return PRINT.LOGO_ID || "";
}

function getLogoSafe() {
  var defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='50' viewBox='0 0 120 50'><rect width='120' height='50' fill='%2316233B' rx='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23FFFFFF'>REKAINDO</text></svg>";
  var logoId = getEffectivePrintLogoId();
  if (!logoId || logoId === "PASTE_YOUR_LOGO_FILE_ID_HERE") {
    return defaultLogo;
  }

  // 1. RAM in-memory cache
  if (_logoMemoryCache && _logoMemoryCache.logoId === logoId) return _logoMemoryCache.dataUrl;

  // 2. ScriptCache
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("APP_PRINT_LOGO_" + logoId);
    if (cached) {
      _logoMemoryCache = { logoId: logoId, dataUrl: cached };
      return cached;
    }
  } catch (e) {}

  // 3. Fallback: DriveApp fetch
  try {
    var file = DriveApp.getFileById(PRINT.LOGO_ID);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var dataUrl = "data:" + contentType + ";base64," + base64;
    _logoMemoryCache = dataUrl;

    try {
      if (dataUrl.length < 100000) {
        CacheService.getScriptCache().put("APP_PRINT_LOGO_" + PRINT.LOGO_ID, dataUrl, 21600); // 6 hours
      }
    } catch (ce) {}

    return dataUrl;
  } catch (err) {
    Logger.log("getLogoSafe warning: " + err.message);
    return defaultLogo;
  }
}