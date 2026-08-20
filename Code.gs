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

  var html = HtmlService.createHtmlOutputFromFile('MasterKpm')
    .setWidth(450)
    .setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pengaturan Master KPM');
}

function getMasterSettings() {
  var props = PropertiesService.getDocumentProperties();
  return {
    template: props.getProperty('KPM_TEMPLATE') || '{no}/PPO/LF/{month}/{year}',
    lampiranTemplate: props.getProperty('KPM_LAMPIRAN_TEMPLATE') || '{no}/KPM/{month}/{year}',
    startNo: props.getProperty('KPM_START_NO') || '1'
  };
}

function saveMasterSettings(settings) {
  var props = PropertiesService.getDocumentProperties();
  props.setProperty('KPM_TEMPLATE', settings.template);
  props.setProperty('KPM_LAMPIRAN_TEMPLATE', settings.lampiranTemplate);
  props.setProperty('KPM_START_NO', settings.startNo);
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

function getMaterialByKode(kode) {
  if (!kode) return null;
  var kodeTrimmed = kode.toString().trim().toUpperCase();
  if (kodeTrimmed === "") return null;

  // 1. Check in-memory RAM cache (0.001ms instant)
  if (_materialMemoryCache[kodeTrimmed]) {
    return _materialMemoryCache[kodeTrimmed];
  }

  // 2. Check ScriptCache (2ms)
  var cache = CacheService.getScriptCache();
  var cachedJson = cache.get("MAT_" + encodeURIComponent(kodeTrimmed));
  if (cachedJson) {
    try {
      var parsed = JSON.parse(cachedJson);
      _materialMemoryCache[kodeTrimmed] = parsed;
      return parsed;
    } catch(e) {}
  }

  // 3. Fallback: Fetch DataBase sheet (Read ONLY Cols B to E = 4 columns)
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
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  if (lastRow < MATERIALDB_START_ROW) return null;

  var numRows = lastRow - MATERIALDB_START_ROW + 1;
  var data = sheet.getRange(MATERIALDB_START_ROW, 2, numRows, 4).getValues();

  var found = null;
  var batchToCache = {};

  for (var i = 0; i < data.length; i++) {
    var rowKode = data[i][0]; // Col B (index 0)
    if (rowKode) {
      var kStr = rowKode.toString().trim().toUpperCase();
      var itemObj = {
        kode: rowKode.toString().trim(),
        nama: data[i][1] ? data[i][1].toString().trim() : "", // Col C
        satuan: data[i][3] ? data[i][3].toString().trim() : "" // Col E
      };
      _materialMemoryCache[kStr] = itemObj;

      if (kStr === kodeTrimmed) {
        found = itemObj;
      }
      if (kStr.length < 40) {
        batchToCache["MAT_" + encodeURIComponent(kStr)] = JSON.stringify(itemObj);
      }
    }
  }

  // Cache materials for fast subsequent lookups
  try {
    cache.putAll(batchToCache, 21600);
  } catch(e) {}

  return found;
}

// ============================================
// OPENS THE PRINT-READY PREVIEW
// ============================================
function openPrintView(data) {
  var template = HtmlService.createTemplateFromFile('PrintKPM');
  template.data = data;

  var htmlOutput = template.evaluate()
    .setWidth(1100)
    .setHeight(750);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Preview KPM - ' + data.header.noRefKpp);
  return true;
}

// ============================================
// LOGO
// ============================================
function getLogoSafe() {
  var defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='50' viewBox='0 0 120 50'><rect width='120' height='50' fill='%2316233B' rx='4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23FFFFFF'>REKAINDO</text></svg>";
  if (!PRINT.LOGO_ID || PRINT.LOGO_ID === "PASTE_YOUR_LOGO_FILE_ID_HERE") {
    return defaultLogo;
  }
  try {
    var file = DriveApp.getFileById(PRINT.LOGO_ID);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    return "data:" + contentType + ";base64," + base64;
  } catch (err) {
    Logger.log("getLogoSafe warning: " + err.message);
    return defaultLogo;
  }
}

// ============================================
// TRACKING TELEMETRY & WEB APP REST API (doGet / doPost)
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
 * Helper to extract the actual HTTP URL from a cell that might contain =HYPERLINK("...", "[Link]")
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

/**
 * REST API GET: Fetches active (unfinished) KPMs for external tracking apps.
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < MONITOR_START_ROW) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var numRows = lastRow - MONITOR_START_ROW + 1;
    var range = sheet.getRange(MONITOR_START_ROW, 1, numRows, MONITOR_TOTAL_COLS);
    var displayData = range.getDisplayValues();
    var formulaData = range.getFormulas();
    var rawData = range.getValues();
    var kpmMap = {};

    for (var i = 0; i < displayData.length; i++) {
      var row = displayData[i];
      var kpm = String(row[MONITOR_COL_NOLF - 1] || "").trim();
      var spek = String(row[MONITOR_COL_SPEK - 1] || "").trim();
      var kode = String(row[MONITOR_COL_KODE - 1] || "").trim();
      var barang = spek || kode;
      var qty = String(row[MONITOR_COL_QTY - 1] || "").trim();
      var uom = String(row[MONITOR_COL_UOM - 1] || "").trim();
      var proyek = String(row[MONITOR_COL_PROYEK - 1] || "").trim();

      var waktuBuat = String(row[MONITOR_COL_POST_DATE - 1] || "").trim();
      var waktuBer = String(row[MONITOR_COL_WKT_BERANGKAT - 1] || "").trim();
      var waktuTib = String(row[MONITOR_COL_WKT_TIBA - 1] || "").trim();

      var pic = String(row[MONITOR_COL_PIC - 1] || "").trim();
      var statusAkhir = String(row[MONITOR_COL_STATUS - 1] || "").trim();
      if (!statusAkhir) statusAkhir = "Baru Dibuat";

      var wsAwal = String(row[MONITOR_COL_WSAWAL - 1] || "").trim();
      var wsTujuan = String(row[MONITOR_COL_WSTUJUAN - 1] || "").trim();
      var lokasi = wsAwal || wsTujuan;

      var buktiBerangkat = extractHyperlinkUrl(
        displayData[i][MONITOR_COL_FOTO_BER - 1],
        formulaData[i][MONITOR_COL_FOTO_BER - 1],
        rawData[i][MONITOR_COL_FOTO_BER - 1]
      );
      var buktiTiba = extractHyperlinkUrl(
        displayData[i][MONITOR_COL_FOTO_TIB - 1],
        formulaData[i][MONITOR_COL_FOTO_TIB - 1],
        rawData[i][MONITOR_COL_FOTO_TIB - 1]
      );

      if (kpm !== "" && statusAkhir.toLowerCase() !== "selesai") {
        if (!kpmMap[kpm]) {
          kpmMap[kpm] = {
            nomor: kpm,
            pic: pic,
            status: statusAkhir,
            lokasi: lokasi,
            proyek: proyek,
            waktuDibuat: waktuBuat,
            waktuBerangkat: waktuBer,
            waktuTiba: waktuTib,
            buktiBerangkat: buktiBerangkat,
            buktiTiba: buktiTiba,
            daftarBarang: []
          };
        }
        if (barang !== "") {
          kpmMap[kpm].daftarBarang.push({ nama: barang, qty: qty, uom: uom });
        }
      }
    }

    var listKPM = [];
    for (var key in kpmMap) {
      listKPM.push(kpmMap[key]);
    }

    listKPM.reverse();
    return ContentService.createTextOutput(JSON.stringify(listKPM))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * REST API POST: Handles KPM Creation, Status Updates, and Photo Uploads from external web apps.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15-second concurrency lock

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput("Error: Sheet " + MONITOR_SHEET_NAME + " tidak ditemukan");
    }

    var waktuSekarang = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    // 1. Process Google Drive Photo upload if present
    var urlFoto = "";
    if (e && e.parameter && e.parameter.fotoData && e.parameter.fotoData.indexOf(",") !== -1) {
      try {
        var folderName = "Bukti_Pengiriman_KPM";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

        var dataImage = e.parameter.fotoData;
        var mimePart = dataImage.split(';')[0];
        var type = (mimePart && mimePart.indexOf(':') !== -1) ? mimePart.split(':')[1] : "image/jpeg";
        var base64 = dataImage.split(',')[1];

        var namaFile = (e.parameter.nomorKPM || "KPM_Baru").replace(/\//g, "_") + "_" + (e.parameter.statusKPM || "Foto") + "_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "ddMMyy_HHmm") + ".jpg";
        var blob = Utilities.newBlob(Utilities.base64Decode(base64), type, namaFile);
        var file = folder.createFile(blob);

        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        urlFoto = file.getUrl();
      } catch (err) {
        urlFoto = "Error Drive: " + err.message;
      }
    }

    var lastRow = sheet.getLastRow();
    var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);

    // 2. Branch A: Create New KPM from external web app
    if (e && e.parameter && e.parameter.daftarBarang) {
      var items = e.parameter.daftarBarang.split("|");
      var lokasiWorkshop = e.parameter.lokasiWorkshop || "";
      var statusKPM = e.parameter.statusKPM || "Baru Dibuat";
      var namaPIC = e.parameter.namaPIC || "";
      var namaProyek = e.parameter.namaProyek || "";

      // Determine next No LF sequence
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

      // Find first empty row starting from MONITOR_START_ROW
      var barisKosong = MONITOR_START_ROW;
      if (numDataRows > 0) {
        var allNoCol = sheet.getRange(MONITOR_START_ROW, MONITOR_COL_NOLF, numDataRows, 1).getValues();
        var foundLast = 0;
        for (var b = allNoCol.length - 1; b >= 0; b--) {
          if (String(allNoCol[b][0]).trim() !== "") {
            foundLast = b + 1;
            break;
          }
        }
        barisKosong = MONITOR_START_ROW + foundLast;
      }

      var rowsToInsert = [];
      var itemIndex = 1;

      for (var j = 0; j < items.length; j++) {
        if (items[j].trim() !== "") {
          var detail = items[j].split("~");
          var rowData = new Array(MONITOR_TOTAL_COLS);
          for (var c = 0; c < MONITOR_TOTAL_COLS; c++) {
            rowData[c] = "";
          }

          var currentRowNo = (barisKosong + rowsToInsert.length) - MONITOR_START_ROW + 1;

          rowData[MONITOR_COL_NO - 1] = currentRowNo;
          rowData[MONITOR_COL_POST_DATE - 1] = waktuSekarang;
          rowData[MONITOR_COL_NOLF - 1] = nomorBaruStr;
          rowData[MONITOR_COL_ITEM - 1] = itemIndex;

          var spekNama = detail[0] || "";
          var mat = getMaterialByKode(spekNama);
          if (mat) {
            rowData[MONITOR_COL_KODE - 1] = mat.kode;
            rowData[MONITOR_COL_SPEK - 1] = mat.nama;
            rowData[MONITOR_COL_UOM - 1] = mat.satuan || detail[2] || "";
          } else {
            rowData[MONITOR_COL_SPEK - 1] = spekNama;
            rowData[MONITOR_COL_UOM - 1] = detail[2] || "";
          }

          rowData[MONITOR_COL_PROYEK - 1] = namaProyek;
          rowData[MONITOR_COL_QTY - 1] = detail[1] || 1;
          rowData[MONITOR_COL_PIC - 1] = namaPIC;
          rowData[MONITOR_COL_WSAWAL - 1] = lokasiWorkshop;
          rowData[MONITOR_COL_STATUS - 1] = statusKPM;

          rowsToInsert.push(rowData);
          itemIndex++;
        }
      }

      if (rowsToInsert.length > 0) {
        sheet.getRange(barisKosong, 1, rowsToInsert.length, MONITOR_TOTAL_COLS).setValues(rowsToInsert);
      }
      return ContentService.createTextOutput(nomorBaruStr);
    }

    // 3. Branch B: Update Status KPM (Berangkat / Tiba / Selesai)
    else if (e && e.parameter && e.parameter.statusKPM) {
      var nomorKPM = String(e.parameter.nomorKPM || "").trim().toUpperCase();
      var statusKPM = String(e.parameter.statusKPM).trim();
      var namaPIC = e.parameter.namaPIC || "";
      var lokasiWorkshop = e.parameter.lokasiWorkshop || "";

      if (numDataRows === 0) {
        return ContentService.createTextOutput("KPM Tidak Ditemukan");
      }

      var fullRange = sheet.getRange(MONITOR_START_ROW, 1, numDataRows, MONITOR_TOTAL_COLS);
      var allData = fullRange.getValues();
      var adaYangDiupdate = false;

      for (var k = 0; k < allData.length; k++) {
        var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
        if (kpmDiSheet === nomorKPM) {
          adaYangDiupdate = true;

          if (statusKPM.toLowerCase() === "berangkat") {
            allData[k][MONITOR_COL_WKT_BERANGKAT - 1] = waktuSekarang;
            if (urlFoto !== "") {
              allData[k][MONITOR_COL_FOTO_BER - 1] = '=HYPERLINK("' + urlFoto + '", "[Link]")';
            }
          } else if (statusKPM.toLowerCase() === "tiba") {
            allData[k][MONITOR_COL_WKT_TIBA - 1] = waktuSekarang;
            var waktuBerangkatTersimpan = allData[k][MONITOR_COL_WKT_BERANGKAT - 1];
            var hasilDurasi = hitungDurasi(waktuBerangkatTersimpan, waktuSekarang);
            if (hasilDurasi !== "") allData[k][MONITOR_COL_DURASI - 1] = hasilDurasi;
            if (urlFoto !== "") {
              allData[k][MONITOR_COL_FOTO_TIB - 1] = '=HYPERLINK("' + urlFoto + '", "[Link]")';
            }
          }

          if (namaPIC) allData[k][MONITOR_COL_PIC - 1] = namaPIC;
          allData[k][MONITOR_COL_STATUS - 1] = statusKPM;
          if (lokasiWorkshop) {
            if (statusKPM.toLowerCase() === "tiba") {
              allData[k][MONITOR_COL_WSTUJUAN - 1] = lokasiWorkshop;
            } else {
              allData[k][MONITOR_COL_WSAWAL - 1] = lokasiWorkshop;
            }
          }
        }
      }

      if (!adaYangDiupdate) {
        return ContentService.createTextOutput("KPM Tidak Ditemukan");
      }

      // Batch write all updated rows back to sheet
      fullRange.setValues(allData);
      return ContentService.createTextOutput("Sukses");
    }

    return ContentService.createTextOutput("Error: Perintah tidak dikenali");
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Automatically sets up the tracking column headers on row 8 of "KPM Monitor 2026".
 */
function setupTrackingHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan.");
    return;
  }

  var headers = [
    ["Waktu Berangkat", "Waktu Tiba", "Durasi", "Status Tracking", "Foto Berangkat", "Foto Tiba"]
  ];

  sheet.getRange(MONITOR_HEADER_ROW, MONITOR_COL_WKT_BERANGKAT, 1, 6).setValues(headers);
  SpreadsheetApp.getUi().alert("Setup Selesai: Kolom Tracking S hingga X telah dikonfigurasi.");
}