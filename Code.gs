// ============================================
// CONFIG
// ============================================
var PRINT = {
  LOGO_ID: "PASTE_YOUR_LOGO_FILE_ID_HERE"
};

var MATERIALDB_SHEET_NAME = "DataBase";
var MATERIALDB_START_ROW = 4; // data starts at row 4

// DataBase columns (1-indexed):
// A=No, B=Kode Material, C=Material Name, D=Material Group,
// E=UoM, F=Plant, G=Update Date, H=Category, I=Lead Time
var COL_KODE = 2;
var COL_NAMA = 3;
var COL_SATUAN = 5;

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
  SpreadsheetApp.getUi()
    .createMenu('Menu KPM')
    .addItem('🆕 Buat KPM Baru', 'openKpmForm')
    .addItem('⚙️ Pengaturan Master', 'openMasterKpm')
    .addToUi();
}

// ============================================
// MASTER KPM SETTINGS
// ============================================
function openMasterKpm() {
  var html = HtmlService.createHtmlOutputFromFile('MasterKpm')
    .setWidth(450)
    .setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pengaturan Master KPM');
}

function getMasterSettings() {
  var props = PropertiesService.getDocumentProperties();
  return {
    template: props.getProperty('KPM_TEMPLATE') || '{no}/REKA/KPM/{month}/{year}',
    lampiranTemplate: props.getProperty('KPM_LAMPIRAN_TEMPLATE') || '{no}/KPM-LAMP/{month}/{year}',
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
// Open the popup form
// ============================================
function openKpmForm() {
  var html = HtmlService.createHtmlOutputFromFile('KpmForm')
    .setWidth(500)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Buat KPM Baru');
}

// ============================================
// Lookup a material by its Kode Material
// ============================================
function getMaterialByKode(kode) {
  if (!kode) return null;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MATERIALDB_SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + MATERIALDB_SHEET_NAME + '" tidak ditemukan.');

  var lastRow = sheet.getLastRow();
  if (lastRow < MATERIALDB_START_ROW) return null;

  var numRows = lastRow - MATERIALDB_START_ROW + 1;
  var data = sheet.getRange(MATERIALDB_START_ROW, 1, numRows, 9).getValues();

  var kodeTrimmed = kode.toString().trim().toUpperCase();

  for (var i = 0; i < data.length; i++) {
    var rowKode = data[i][COL_KODE - 1];
    if (rowKode && rowKode.toString().trim().toUpperCase() === kodeTrimmed) {
      return {
        kode: rowKode,
        nama: data[i][COL_NAMA - 1],
        satuan: data[i][COL_SATUAN - 1]
      };
    }
  }

  return null;
}

// ============================================
// Submit KPM Form
// ============================================
function submitKpmForm(formData) {
  if (!formData.noRefKpp) {
    throw new Error('No Ref. KPP wajib diisi.');
  }
  if (!formData.items || formData.items.length === 0) {
    throw new Error('Belum ada material yang ditambahkan.');
  }

  var props = PropertiesService.getDocumentProperties();
  var currentNo = parseInt(props.getProperty('KPM_START_NO') || '1', 10);
  props.setProperty('KPM_START_NO', (currentNo + 1).toString());

  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  var material = formData.items.map(function(item) {
    var desc = item.nama;
    if (item.spesifikasi) desc += " - " + item.spesifikasi;
    return {
      kode: item.kode,
      deskripsiSpesifikasi: desc,
      qty: item.qty,
      satuan: item.satuan,
      wsAwal: item.wsAwal,
      wsTujuan: item.wsTujuan,
      keterangan: ""
    };
  });

  var totalPage = Math.max(1, Math.ceil(material.length / PAGE_SIZE));

  var data = {
    logo: getLogoSafe(),
    tanggalCetak: today,
    totalPage: totalPage,
    pageSize: PAGE_SIZE,
    header: {
      noRefKpp: formData.noRefKpp,
      noLampiranKpm: formData.noLampiranKpm,
      tanggal: today,
      serial: formData.serial,
      proyek: formData.proyek
    },
    groups: [
      {
        reservasi: formData.reservasi || "",
        tanggal: today,
        serial: formData.serial,
        proyek: formData.proyek,
        noLampiranKpm: formData.noLampiranKpm,
        isSplit: false,
        batches: [
          {
            totalBatch: 1,
            batchNo: 1,
            material: material
          }
        ]
      }
    ]
  };

  return data;
}

// ============================================
// Opens the print-ready preview
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