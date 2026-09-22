// ============================================
// CONFIG & CONSTANTS
// ============================================
var PRINT = {
  LOGO_ID: "PASTE_YOUR_LOGO_FILE_ID_HERE"
};

var MATERIALDB_SHEET_NAME = "DataBase";
var MATERIALDB_HEADER_ROW = 4; // header labels on row 4
var MATERIALDB_START_ROW = 5;  // data starts at row 5

var LOG_KEDATANGAN_SHEET_NAME = "Log Kedatangan";
var LOG_KEDATANGAN_SOURCE_SHEET_NAME = "Kedatangan Log 2026";
var LOG_KEDATANGAN_HEADER_ROW = 1; // row 1 = column headers, row 2 = aliases/codes
var LOG_KEDATANGAN_START_ROW = 3;  // data starts at row 3

// DataBase columns (1-indexed, A to L):
// A=No., B=Kode Material, C=Deskripsi Material, D=Material Group,
// E=BUn, F=Plant, G=Update Data, H=Kategori, I=Lead Time (hari),
// J=Harga Satuan, K=2024, L=2025
var COL_KODE = 2;   // Col B: Kode Material
var COL_NAMA = 3;   // Col C: Deskripsi Material
var COL_SATUAN = 5; // Col E: BUn (Base Unit)

var PAGE_SIZE = 15; // Set page break to 15 items per page (maximizes room for layout, signatures & QR codes)

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

  var ui = SpreadsheetApp.getUi();

  var masterMenu = ui.createMenu('📊 Master Data & Konfigurasi')
    .addItem('⚙️ Pengaturan Format Nomor KPM', 'openMasterKpm')
    .addItem('🔄 Setup / Sinkronisasi IMPORTRANGE DataBase Material', 'setupMaterialDatabaseImportRange')
    .addItem('📥 Setup / Sinkronisasi IMPORTRANGE Log Kedatangan', 'setupLogKedatanganImportRange')
    .addItem('👥 Inisialisasi Sheet Pengguna (Users)', 'setupUsersSheet')
    .addItem('📦 Inisialisasi Sheet Penerima (Recipients)', 'setupRecipientsSheet');

  var maintMenu = ui.createMenu('🛠️ Pemeliharaan & Format')
    .addItem('📐 Perbaiki Format Sheet (Fix Format)', 'fixFormat')
    .addItem('🧹 Bersihkan Baris Kosong', 'cleanOrphanedRows')
    .addItem('📡 Setup Kolom Tracking GPS', 'setupTrackingHeaders');

  var helpMenu = ui.createMenu('📖 Bantuan & Informasi')
    .addItem('📗 Panduan Penggunaan Spreadsheet', 'openSpreadsheetTutorialDialog')
    .addItem('📖 Buku Panduan & Tutorial Interaktif (Web & App)', 'openTutorialDialog')
    .addItem('ℹ️ Tentang Sistem & Developer', 'openAboutDialog');

  ui.createMenu('⚡ Menu KPM')
    .addItem('🖨️ Cetak Dokumen KPM', 'printKpmM')
    .addItem('📄 Cetak Lembar KPM Kosong (Blank Sheet)', 'printKpmBlank')
    .addItem('📇 Cetak Kartu QR Pengguna (ID Card)', 'openPrintUserQrDialog')
    .addSeparator()
    .addSubMenu(masterMenu)
    .addSubMenu(maintMenu)
    .addSeparator()
    .addSubMenu(helpMenu)
    .addToUi();
}

// ============================================
// SPREADSHEET TUTORIAL & HANDBOOK DIALOG
// ============================================
function openSpreadsheetTutorialDialog() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Integritas sistem gagal: Modul About.gs tidak ditemukan.");
    return;
  }

  var html = HtmlService.createHtmlOutputFromFile('SpreadsheetTutorialDialog')
    .setWidth(860)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, '📗 Panduan Penggunaan Spreadsheet KPM');
}

// ============================================
// TUTORIAL & USER GUIDE DIALOG
// ============================================
function openTutorialDialog() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Integritas sistem gagal: Modul About.gs tidak ditemukan.");
    return;
  }

  var html = HtmlService.createHtmlOutputFromFile('TutorialDialog')
    .setWidth(840)
    .setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, '📖 Panduan & Tutorial Aplikasi KPM');
}

// ============================================
// USER QR CODE CARDS DIALOG
// ============================================
function openPrintUserQrDialog() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Integritas sistem gagal: Modul About.gs tidak ditemukan.");
    return;
  }

  var html = HtmlService.createHtmlOutputFromFile('PrintUserQR')
    .setWidth(860)
    .setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(html, 'Cetak Kartu QR Login Pengguna');
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
// DYNAMIC IMPORTRANGE & CACHED LOOKUP FOR MATERIAL DATABASE
// ============================================
var _materialMemoryCache = {};
var _materialsLoadedInRam = false;

/**
 * Sets up the DataBase sheet with an IMPORTRANGE formula pointing to the external master database.
 * External link: https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit?gid=1881214309#gid=1881214309
 * Headers start from Row 4 (Columns A to L):
 * A=No., B=Kode Material, C=Deskripsi Material, D=Material Group, E=BUn, F=Plant,
 * G=Update Data, H=Kategori, I=Lead Time (hari), J=Harga Satuan, K=2024, L=2025
 */
function setupMaterialDatabaseImportRange() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MATERIALDB_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MATERIALDB_SHEET_NAME);
  }

  // Clear existing content completely so the IMPORTRANGE array expands freely from A1 without spill error
  sheet.clearContents();

  // Set the IMPORTRANGE formula directly in cell A1 (Source rows 1-4 are headers A-V, row 5+ is material data A-L)
  var importUrl = "https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit";
  var importRangeFormulaSemicolon = '=IMPORTRANGE("' + importUrl + '"; "DataBase!A:V")';
  var importRangeFormulaComma = '=IMPORTRANGE("' + importUrl + '", "DataBase!A:V")';

  var cellA1 = sheet.getRange("A1");
  try {
    cellA1.setFormulaLocal(importRangeFormulaSemicolon);
  } catch (e1) {
    try {
      cellA1.setFormula(importRangeFormulaSemicolon);
    } catch (e2) {
      cellA1.setValue(importRangeFormulaComma);
    }
  }

  // Freeze the first 4 rows so headers remain visible when scrolling data
  try {
    sheet.setFrozenRows(4);
  } catch (e) { }

  // Invalidate memory and script caches to force fresh reload
  clearMaterialCache_();

  var alertMsg = "Rumus IMPORTRANGE berhasil dipasang pada sheet DataBase sel A1!\n\n" +
    "Formula di A1:\n" +
    "• Bahasa Indonesia (Titik Koma): " + importRangeFormulaSemicolon + "\n" +
    "• Bahasa Inggris (Koma): " + importRangeFormulaComma + "\n\n" +
    "PENTING (Jika Muncul 'Error mengurai formula'):\n" +
    "Google Sheets dengan setelan regional Indonesia menggunakan pemisah TITIK KOMA (;).\n" +
    "Jika Anda mengetik manual di formula bar, pastikan gunakan tanda titik koma (;), bukan koma (,).\n\n" +
    "LANGKAH SELANJUTNYA:\n" +
    "Jika sel A1 menampilkan '#REF!' bertuliskan 'You need to connect these sheets', " +
    "klik sel A1 lalu klik tombol biru 'Izinkan Akses' (Allow Access).";

  try {
    SpreadsheetApp.getUi().alert("✅ IMPORTRANGE Terpasang di Sel A1", alertMsg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(alertMsg);
  }

  return { success: true, formula: importRangeFormulaSemicolon, formulaIndo: importRangeFormulaSemicolon, cell: "A1", message: alertMsg };
}

/**
 * Purges material memory cache and ScriptCache keys so dynamic updates reload cleanly.
 */
function clearMaterialCache_() {
  _materialMemoryCache = {};
  _materialsLoadedInRam = false;
  try {
    var cacheService = CacheService.getScriptCache();
    cacheService.remove("ALL_MATS_count");
    cacheService.remove("ALL_MATS_V2_count");
  } catch (e) { }
}

/**
 * Returns the material dictionary map { [KODE_UPPER]: { kode, nama, satuan, source } }.
 * Multi-tiered lookup:
 * 1. Fast in-memory RAM cache
 * 2. ScriptCache (chunked for master catalog)
 * 3. Primary Source: Local sheet 'DataBase' (populated by IMPORTRANGE) or external fallback A/B
 * 4. Secondary Source: Local sheet 'Log Kedatangan' (Komat on G3:G*, Deskripsi on H3:H*)
 *
 * PRECEDENCE & COLLISION RULE:
 * The 'DataBase' sheet is the PRIMARY master source. If the same 'Komat' code exists in both
 * 'DataBase' and 'Log Kedatangan', the 'DataBase' item name and details are STRICTLY preserved.
 */
function getMaterialDatabaseMap() {
  if (_materialsLoadedInRam && Object.keys(_materialMemoryCache).length > 0) {
    return _materialMemoryCache;
  }

  // 1. Try ScriptCache (Version 2)
  try {
    var cache = CacheService.getScriptCache();
    var countStr = cache.get("ALL_MATS_V2_count");
    if (countStr) {
      var totalChunks = parseInt(countStr, 10);
      if (!isNaN(totalChunks) && totalChunks > 0) {
        var keys = [];
        for (var k = 0; k < totalChunks; k++) keys.push("ALL_MATS_V2_" + k);
        var chunks = cache.getAll(keys);
        var json = "";
        var complete = true;
        for (var c = 0; c < totalChunks; c++) {
          if (!chunks["ALL_MATS_V2_" + c]) { complete = false; break; }
          json += chunks["ALL_MATS_V2_" + c];
        }
        if (complete && json) {
          var parsed = JSON.parse(json);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            _materialMemoryCache = parsed;
            _materialsLoadedInRam = true;
            return _materialMemoryCache;
          }
        }
      }
    }
  } catch (e) { }

  // 2. Fetch from PRIMARY SOURCE: Local DataBase sheet (Read Cols B to E = 4 columns, starting row 5)
  var loadedFromLocal = false;
  try {
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

    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= MATERIALDB_START_ROW) {
        var numRows = lastRow - MATERIALDB_START_ROW + 1;
        var data = sheet.getRange(MATERIALDB_START_ROW, 2, numRows, 4).getValues();
        if (data.length > 0 && data[0][0] && !String(data[0][0]).startsWith('#')) {
          for (var i = 0; i < data.length; i++) {
            var rowKode = data[i][0]; // Col B
            if (rowKode) {
              var kStr = rowKode.toString().trim().toUpperCase();
              _materialMemoryCache[kStr] = {
                kode: rowKode.toString().trim(),
                nama: data[i][1] ? data[i][1].toString().trim() : "", // Col C
                satuan: data[i][3] ? data[i][3].toString().trim() : "", // Col E
                source: "database"
              };
            }
          }
          if (Object.keys(_materialMemoryCache).length > 0) {
            loadedFromLocal = true;
          }
        }
      }
    }
  } catch (localErr) {
    Logger.log("Local DataBase read note: " + localErr.message);
  }

  // 3. Robust Primary Fallback: If local sheet has no data or IMPORTRANGE waiting for authorization,
  // read directly from external master spreadsheet
  if (!loadedFromLocal) {
    var extSpreadsheetId = (typeof WEB_CONFIG !== 'undefined' && WEB_CONFIG.MATERIAL_DB_SPREADSHEET_ID)
      ? WEB_CONFIG.MATERIAL_DB_SPREADSHEET_ID
      : "1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk";

    // Fallback: Public CSV export endpoint via UrlFetchApp and Utilities.parseCsv
    try {
      var csvGid = (typeof WEB_CONFIG !== 'undefined' && WEB_CONFIG.MATERIAL_DB_GID) ? WEB_CONFIG.MATERIAL_DB_GID : "1881214309";
      var csvUrl = "https://docs.google.com/spreadsheets/d/" + extSpreadsheetId + "/export?format=csv&gid=" + csvGid;
      var resp = UrlFetchApp.fetch(csvUrl, { muteHttpExceptions: true });
        if (resp.getResponseCode() === 200) {
          var csvText = resp.getContentText();
          var csvRows = Utilities.parseCsv(csvText);
          for (var c = 4; c < csvRows.length; c++) {
            var cRow = csvRows[c];
            if (cRow && cRow.length > 2 && cRow[1]) {
              var cKode = cRow[1].toString().trim();
              if (cKode) {
                var ckStr = cKode.toUpperCase();
                _materialMemoryCache[ckStr] = {
                  kode: cKode,
                  nama: cRow[2] ? cRow[2].toString().trim() : "",
                  satuan: cRow[4] ? cRow[4].toString().trim() : "",
                  source: "database"
                };
              }
            }
          }
        }
      } catch (csvErr) {
        Logger.log("UrlFetch CSV export fallback note: " + csvErr.message);
      }
    }

  // 4. SECONDARY SOURCE: 'Log Kedatangan' Sheet
  // Komat is in column G starting from row 3 (G3:G*), and description in column H (H3:H*).
  // RULE: 'DataBase' is the PRIMARY master source. If the same 'Komat' code exists in both,
  // the 'DataBase' item name/details MUST be preserved and never overwritten.
  try {
    var logRows = getAllLogKedatanganRows();
    if (logRows && logRows.length > 0) {
      for (var l = 0; l < logRows.length; l++) {
        var logItem = logRows[l];
        var logKomat = logItem && logItem.komat ? logItem.komat.toString().trim() : "";
        if (!logKomat) continue;

        var logKey = logKomat.toUpperCase();
        // PRIMARY PRECEDENCE CHECK:
        // If the Komat already exists in _materialMemoryCache (from DataBase or an earlier row),
        // DO NOT overwrite it. The primary DataBase record stays intact!
        if (!_materialMemoryCache.hasOwnProperty(logKey)) {
          _materialMemoryCache[logKey] = {
            kode: logKomat,
            nama: logItem.deskripsi ? logItem.deskripsi.toString().trim() : ("Material " + logKomat),
            satuan: "PCS", // Default to PCS because Log Kedatangan has no UOM column
            source: "log_kedatangan"
          };
        } else if (_materialMemoryCache[logKey].source === "log_kedatangan") {
          // If previously added from Log Kedatangan without description, update with non-empty description
          if ((!_materialMemoryCache[logKey].nama || _materialMemoryCache[logKey].nama === ("Material " + logKomat)) && logItem.deskripsi) {
            _materialMemoryCache[logKey].nama = logItem.deskripsi.toString().trim();
          }
        }
      }
    }
  } catch (logErr) {
    Logger.log("Secondary Log Kedatangan komat merge note: " + logErr.message);
  }

  _materialsLoadedInRam = Object.keys(_materialMemoryCache).length > 0;

  // Cache in ScriptCache chunked for up to 6 hours
  if (_materialsLoadedInRam) {
    try {
      var cacheService = CacheService.getScriptCache();
      var fullJson = JSON.stringify(_materialMemoryCache);
      var chunkSize = 90000;
      var count = Math.ceil(fullJson.length / chunkSize);
      var batch = { "ALL_MATS_V2_count": String(count) };
      for (var j = 0; j < count; j++) {
        batch["ALL_MATS_V2_" + j] = fullJson.substr(j * chunkSize, chunkSize);
      }
      cacheService.putAll(batch, 21600); // 6 hours
    } catch (e) { }
  }

  return _materialMemoryCache;
}

function getMaterialByKode(kode) {
  if (!kode) return null;
  var kodeTrimmed = kode.toString().trim().toUpperCase();
  if (kodeTrimmed === "") return null;

  var map = getMaterialDatabaseMap();
  return map[kodeTrimmed] || null;
}

/**
 * Searches the dynamic material database for matching materials by code or description.
 * @param {string} query - Keyword to search
 * @param {number} limit - Maximum number of results to return (default 30, max 100)
 * @returns {Array<Object>} Matches [{kode, nama, satuan}, ...]
 */
function searchMaterialDatabase(query, limit) {
  var q = String(query || "").trim().toUpperCase();
  if (!q) return [];
  var maxResults = Math.min(Math.max(parseInt(limit || "30", 10), 1), 100);

  var map = getMaterialDatabaseMap();
  var results = [];
  var keys = Object.keys(map);

  // Exact prefix match on kode first
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var mat = map[k];
    if (!mat) continue;
    if (k.indexOf(q) === 0) {
      results.push(mat);
      if (results.length >= maxResults) return results;
    }
  }

  // Substring match on kode or description
  for (var j = 0; j < keys.length; j++) {
    var kSub = keys[j];
    var matSub = map[kSub];
    if (!matSub) continue;
    if (kSub.indexOf(q) === 0) continue; // already added

    var kodeMatch = kSub.indexOf(q) !== -1;
    var namaMatch = matSub.nama && matSub.nama.toUpperCase().indexOf(q) !== -1;

    if (kodeMatch || namaMatch) {
      results.push(matSub);
      if (results.length >= maxResults) break;
    }
  }

  return results;
}

// ============================================
// LOG KEDATANGAN (Arrival Log) IMPORTRANGE & QUERY API
// Source: https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit?gid=745488400#gid=745488400
// External Tab: 'Kedatangan Log 2026'
// Columns (A to N):
// A: No.
// B: Tanggal
// C: TURUN (Workshop / Drop Location: CS, SS, TR, RM, etc.)
// D: No. PO
// E: Vendor
// F: Nomer SJN
// G: Komat (Kode Material)
// H: Deskripsi
// I: Jumlah (SJN)
// J: Cek Jumlah Ekspedisi
// K: Deviasi
// L: Proyek
// M: Keterangan
// N: Operator Hitung Ekspedisi
// ============================================

var _logKedatanganMemoryCache = null;
var _logKedatanganLoadedInRam = false;

/**
 * Sets up the "Log Kedatangan" sheet with an IMPORTRANGE formula pointing to the external arrival log.
 * External tab: 'Kedatangan Log 2026'
 */
function setupLogKedatanganImportRange() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LOG_KEDATANGAN_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_KEDATANGAN_SHEET_NAME);
  }

  // Clear existing content completely so the IMPORTRANGE array expands freely from A1 without spill error
  sheet.clearContents();

  var importUrl = "https://docs.google.com/spreadsheets/d/1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk/edit";
  var importRangeFormulaSemicolon = '=IMPORTRANGE("' + importUrl + '"; "\'Kedatangan Log 2026\'!A:N")';
  var importRangeFormulaComma = '=IMPORTRANGE("' + importUrl + '", "\'Kedatangan Log 2026\'!A:N")';

  var cellA1 = sheet.getRange("A1");
  try {
    cellA1.setFormulaLocal(importRangeFormulaSemicolon);
  } catch (e1) {
    try {
      cellA1.setFormula(importRangeFormulaComma);
    } catch (e2) {
      cellA1.setValue(importRangeFormulaSemicolon);
    }
  }

  // Freeze top 2 rows (Row 1 = Headers, Row 2 = Column Codes/Aliases)
  try {
    sheet.setFrozenRows(2);
  } catch (e) { }

  // Invalidate memory caches (including secondary material database)
  _logKedatanganMemoryCache = null;
  _logKedatanganLoadedInRam = false;
  clearMaterialCache_();

  var alertMsg = "Rumus IMPORTRANGE berhasil dipasang pada sheet '" + LOG_KEDATANGAN_SHEET_NAME + "' sel A1!\n\n" +
    "Formula di A1:\n" +
    "• Bahasa Indonesia (Titik Koma): " + importRangeFormulaSemicolon + "\n" +
    "• Bahasa Inggris (Koma): " + importRangeFormulaComma + "\n\n" +
    "PENTING (Jika Muncul 'Error mengurai formula'):\n" +
    "Google Sheets dengan setelan regional Indonesia menggunakan pemisah TITIK KOMA (;).\n" +
    "Jika Anda mengetik manual di formula bar, pastikan gunakan tanda titik koma (;), bukan koma (,).\n\n" +
    "LANGKAH SELANJUTNYA:\n" +
    "Jika sel A1 menampilkan '#REF!' bertuliskan 'You need to connect these sheets', " +
    "klik sel A1 lalu klik tombol biru 'Izinkan Akses' (Allow Access).";

  try {
    SpreadsheetApp.getUi().alert("✅ IMPORTRANGE Log Kedatangan Terpasang di Sel A1", alertMsg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(alertMsg);
  }

  return {
    success: true,
    sheetName: LOG_KEDATANGAN_SHEET_NAME,
    sourceSheet: LOG_KEDATANGAN_SOURCE_SHEET_NAME,
    formula: importRangeFormulaSemicolon,
    formulaIndo: importRangeFormulaSemicolon,
    cell: "A1",
    message: alertMsg
  };
}

/**
 * Returns all arrival log records with multi-tiered fallback:
 * 1. In-memory RAM cache
 * 2. Local sheet 'Log Kedatangan' (populated by IMPORTRANGE)
 * 3. Fallback: Public CSV export endpoint via UrlFetchApp
 * 4. Fallback B: Public CSV export endpoint via UrlFetchApp & Utilities.parseCsv
 */
function getAllLogKedatanganRows() {
  if (_logKedatanganLoadedInRam && _logKedatanganMemoryCache && _logKedatanganMemoryCache.length > 0) {
    return _logKedatanganMemoryCache;
  }

  var records = [];
  var loadedFromLocal = false;

  // 1. Fetch from Local 'Log Kedatangan' sheet (Rows 3+ onwards, Cols A to N = 14 cols)
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(LOG_KEDATANGAN_SHEET_NAME);
    if (!sheet) {
      var sheets = ss.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        if (sheets[s].getName().trim().toLowerCase() === LOG_KEDATANGAN_SHEET_NAME.trim().toLowerCase()) {
          sheet = sheets[s];
          break;
        }
      }
    }

    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= LOG_KEDATANGAN_START_ROW) {
        var numRows = lastRow - LOG_KEDATANGAN_START_ROW + 1;
        var data = sheet.getRange(LOG_KEDATANGAN_START_ROW, 1, numRows, 14).getValues();
        if (data.length > 0 && data[0][0] !== "" && !String(data[0][0]).startsWith('#')) {
          for (var i = 0; i < data.length; i++) {
            var row = data[i];
            if (row[0] || row[1] || row[3] || row[7]) {
              records.push(parseLogKedatanganRow_(row));
            }
          }
          if (records.length > 0) {
            loadedFromLocal = true;
          }
        }
      }
    }
  } catch (localErr) {
    Logger.log("Local Log Kedatangan read note: " + localErr.message);
  }

  // 2. Direct external spreadsheet read fallback
  if (!loadedFromLocal) {
    var extSpreadsheetId = (typeof WEB_CONFIG !== 'undefined' && WEB_CONFIG.LOG_KEDATANGAN_SPREADSHEET_ID)
      ? WEB_CONFIG.LOG_KEDATANGAN_SPREADSHEET_ID
      : "1NJZ6D9KuPiaEpC8qey1fn2rrZivHnNLlMGurpGX87yk";

    // Fallback: Public CSV export endpoint via UrlFetchApp
    try {
      var gid = (typeof WEB_CONFIG !== 'undefined' && WEB_CONFIG.LOG_KEDATANGAN_GID) ? WEB_CONFIG.LOG_KEDATANGAN_GID : "745488400";
      var csvUrl = "https://docs.google.com/spreadsheets/d/" + extSpreadsheetId + "/export?format=csv&gid=" + gid;
      var resp = UrlFetchApp.fetch(csvUrl, { muteHttpExceptions: true });
        if (resp.getResponseCode() === 200) {
          var csvText = resp.getContentText();
          var csvRows = Utilities.parseCsv(csvText);
          // CSV index 0 = row 1 (Header), index 1 = row 2 (Keys), index 2+ = row 3+ (Data)
          for (var c = 2; c < csvRows.length; c++) {
            var cRow = csvRows[c];
            if (cRow && (cRow[0] || cRow[1] || cRow[3] || cRow[7])) {
              records.push(parseLogKedatanganRow_(cRow));
            }
          }
        }
      } catch (csvErr) {
        Logger.log("UrlFetch CSV Log Kedatangan fallback note: " + csvErr.message);
      }
    }

  _logKedatanganMemoryCache = records;
  _logKedatanganLoadedInRam = records.length > 0;
  return _logKedatanganMemoryCache;
}

/**
 * Parses raw array row (14 columns) into a structured Log Kedatangan object.
 */
function parseLogKedatanganRow_(row) {
  var tanggalVal = row[1];
  var tanggalStr = "";
  if (tanggalVal instanceof Date) {
    try {
      tanggalStr = Utilities.formatDate(tanggalVal, Session.getScriptTimeZone() || "GMT+7", "dd/MM/yyyy");
    } catch (e) {
      tanggalStr = String(tanggalVal);
    }
  } else {
    tanggalStr = String(tanggalVal || "").trim();
  }

  return {
    no: String(row[0] || "").trim(),
    tanggal: tanggalStr,
    turun: String(row[2] || "").trim(),
    noPo: String(row[3] || "").trim(),
    vendor: String(row[4] || "").trim(),
    nomerSjn: String(row[5] || "").trim(),
    komat: String(row[6] || "").trim(),
    deskripsi: String(row[7] || "").trim(),
    jumlahSjn: row[8] !== undefined && row[8] !== null ? String(row[8]).trim() : "",
    cekJumlahEkspedisi: row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : "",
    deviasi: String(row[10] || "").trim(),
    proyek: String(row[11] || "").trim(),
    keterangan: String(row[12] || "").trim(),
    operatorHitung: String(row[13] || "").trim()
  };
}

/**
 * Returns paginated / filtered list of Log Kedatangan.
 * Supports params: query, limit, offset, turun/workshop, vendor.
 */
function getLogKedatanganData(params) {
  params = params || {};
  var limit = Math.min(Math.max(parseInt(params.limit || "50", 10), 1), 200);
  var offset = Math.max(parseInt(params.offset || "0", 10), 0);
  var query = (params.query || params.q || "").toString().trim().toLowerCase();
  var filterTurun = (params.turun || params.workshop || "").toString().trim().toUpperCase();
  var filterVendor = (params.vendor || "").toString().trim().toLowerCase();

  var allRows = getAllLogKedatanganRows();
  var filtered = allRows;

  if (filterTurun) {
    filtered = filtered.filter(function (r) {
      return String(r.turun || "").trim().toUpperCase() === filterTurun;
    });
  }

  if (filterVendor) {
    filtered = filtered.filter(function (r) {
      return String(r.vendor || "").toLowerCase().indexOf(filterVendor) !== -1;
    });
  }

  if (query) {
    filtered = filtered.filter(function (r) {
      return (
        String(r.noPo || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.vendor || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.nomerSjn || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.komat || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.deskripsi || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.proyek || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.keterangan || "").toLowerCase().indexOf(query) !== -1 ||
        String(r.operatorHitung || "").toLowerCase().indexOf(query) !== -1
      );
    });
  }

  var total = filtered.length;
  var paginated = filtered.slice(offset, offset + limit);

  return {
    total: total,
    limit: limit,
    offset: offset,
    items: paginated
  };
}

/**
 * Searches Log Kedatangan records by query string.
 */
function searchLogKedatanganData(query, limit) {
  return getLogKedatanganData({ query: query, limit: limit || 30, offset: 0 });
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

  var dialogTitle = (data && data.isBlank)
    ? 'Cetak Lembar KPM Kosong (Blank Sheet)'
    : ('Cetak Dokumen KPM - ' + ((data && data.header && data.header.noRefKpp) ? data.header.noRefKpp : ''));

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, dialogTitle);
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
  } catch (e) { }
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
  } catch (e) { }

  // 3. Fallback: DriveApp fetch
  try {
    var file = DriveApp.getFileById(logoId);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var dataUrl = "data:" + contentType + ";base64," + base64;
    _logoMemoryCache = { logoId: logoId, dataUrl: dataUrl };

    try {
      if (dataUrl.length < 100000) {
        CacheService.getScriptCache().put("APP_PRINT_LOGO_" + logoId, dataUrl, 21600); // 6 hours
      }
    } catch (ce) { }

    return dataUrl;
  } catch (err) {
    Logger.log("getLogoSafe warning: " + err.message);
    return defaultLogo;
  }
}