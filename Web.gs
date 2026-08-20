// ============================================
// WEB APP CONTROLLER & BUSINESS LOGIC (Web.gs)
// ============================================
// Single Source of Truth for KPM/LF Web System (Admin & Driver/User)

var WEB_CONFIG = {
  DRIVE_FOLDER_NAME: "Bukti_Pengiriman_KPM",
  WORKSHOPS: ["Candi Sewu", "Tiron", "Sukosari", "Remul"],
  PICS: ["Aang", "Eko", "Ruli", "Vany", "Taufiq"],
  UOMS: ["PCS", "M", "UNIT", "SET", "PSG", "SHT", "L", "ROLL", "STK"]
};

// ============================================
// 1. STATE MACHINE & STATUS DEFINITIONS
// ============================================

var KPM_STATUS = Object.freeze({
  BARU_DIBUAT: 'Baru Dibuat',
  BERANGKAT: 'Berangkat',
  TIBA: 'Tiba',
  SELESAI: 'Selesai'
});

var STATUS_TRANSITIONS = Object.freeze({
  'Baru Dibuat': ['Berangkat'],
  'Berangkat': ['Tiba'],
  'Tiba': ['Selesai'],
  'Selesai': []
});

var STATUS_CODES = Object.freeze({
  'Baru Dibuat': 'BARU_DIBUAT',
  'Berangkat': 'BERANGKAT',
  'Tiba': 'TIBA',
  'Selesai': 'SELESAI'
});

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
// 3. MASTER DATA SERVICE
// ============================================

/**
 * Returns centralized master data for dropdowns and forms.
 */
function getMasterData() {
  return {
    workshops: WEB_CONFIG.WORKSHOPS,
    pics: WEB_CONFIG.PICS,
    uoms: WEB_CONFIG.UOMS,
    statuses: [
      KPM_STATUS.BARU_DIBUAT,
      KPM_STATUS.BERANGKAT,
      KPM_STATUS.TIBA,
      KPM_STATUS.SELESAI
    ],
    statusCodes: STATUS_CODES
  };
}

// ============================================
// 4. TIME & FORMATTING HELPERS
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

// ============================================
// 5. MONITORING DOMAIN SERVICE (ADMIN VIEW)
// ============================================

/**
 * Reads sheet and produces fully server-computed KPM monitoring objects.
 * Decouples business data (status, progress percent, dates) from UI presentation.
 */
function getKpmMonitoringData(includeArchived) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < MONITOR_START_ROW) return [];

  var numRows = lastRow - MONITOR_START_ROW + 1;
  var range = sheet.getRange(MONITOR_START_ROW, 1, numRows, MONITOR_TOTAL_COLS);
  var displayData = range.getDisplayValues();
  var formulaData = range.getFormulas();
  var rawData = range.getValues();
  var kpmMap = {};

  for (var i = 0; i < displayData.length; i++) {
    var row = displayData[i];
    var kpm = String(row[MONITOR_COL_NOLF - 1] || "").trim();
    if (!kpm) continue;

    var spek = String(row[MONITOR_COL_SPEK - 1] || "").trim();
    var kode = String(row[MONITOR_COL_KODE - 1] || "").trim();
    var barang = spek || kode;
    var qty = String(row[MONITOR_COL_QTY - 1] || "").trim();
    var uom = String(row[MONITOR_COL_UOM - 1] || "").trim();
    var proyek = String(row[MONITOR_COL_PROYEK - 1] || "").trim();

    var waktuBuat = String(row[MONITOR_COL_POST_DATE - 1] || "").trim();
    var waktuBer = String(row[MONITOR_COL_WKT_BERANGKAT - 1] || "").trim();
    var waktuTib = String(row[MONITOR_COL_WKT_TIBA - 1] || "").trim();
    var durasi = String(row[MONITOR_COL_DURASI - 1] || "").trim();

    var pic = String(row[MONITOR_COL_PIC - 1] || "").trim();
    var statusAkhir = String(row[MONITOR_COL_STATUS - 1] || "").trim();
    if (!statusAkhir) statusAkhir = KPM_STATUS.BARU_DIBUAT;

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
        pic: pic,
        status: statusAkhir,
        statusCode: statusCode,
        lokasi: lokasi,
        proyek: proyek,
        createdAt: waktuBuat,
        createdAtFormatted: formatWaktuDisplay(waktuBuat),
        departureAt: waktuBer,
        departureAtFormatted: formatWaktuDisplay(waktuBer),
        arrivalAt: waktuTib,
        arrivalAtFormatted: formatWaktuDisplay(waktuTib),
        duration: durasi,
        fillPercent: fillPercent,
        isDeparted: isDeparted,
        isArrived: isArrived,
        buktiBerangkat: buktiBerangkat,
        buktiTiba: buktiTiba,
        daftarBarang: []
      };
    }

    if (barang) {
      kpmMap[kpm].daftarBarang.push({ nama: barang, qty: qty, uom: uom });
    }
  }

  var listKPM = [];
  for (var key in kpmMap) {
    listKPM.push(kpmMap[key]);
  }
  listKPM.reverse();
  return listKPM;
}

// ============================================
// 6. DELIVERY DOMAIN SERVICE (DRIVER/USER VIEW)
// ============================================

/**
 * Returns active KPMs decorated with server-directed nextAction and requirements.
 */
function getAvailableDeliveries() {
  var allKpm = getKpmMonitoringData(false);
  var available = [];

  for (var i = 0; i < allKpm.length; i++) {
    var item = allKpm[i];
    // Driver can only interact with KPMs that are not finished or arrived
    if (item.status !== KPM_STATUS.TIBA && item.status !== KPM_STATUS.SELESAI) {
      var allowedNext = STATUS_TRANSITIONS[item.status] || [];
      var nextAction = allowedNext.length > 0 ? allowedNext[0] : "";
      var nextActionCode = STATUS_CODES[nextAction] || "";

      available.push({
        kpmId: item.nomor,
        nomor: item.nomor,
        proyek: item.proyek,
        lokasi: item.lokasi,
        pic: item.pic,
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
// 7. CREATION SERVICE (KPM CREATION)
// ============================================

/**
 * Validates and batch-creates new KPM rows.
 */
function validateAndCreateKpm(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Parameter tidak ditemukan." };
  }
  var rawBarang = params.daftarBarang || "";
  if (!rawBarang.trim()) {
    throw { code: "INVALID_MATERIAL", message: "Daftar barang tidak boleh kosong." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    throw { code: "SERVER_ERROR", message: "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan." };
  }

  var waktuSekarang = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  var items = rawBarang.split("|");
  var lokasiWorkshop = params.lokasiWorkshop || "";
  var statusKPM = params.statusKPM || KPM_STATUS.BARU_DIBUAT;
  var namaPIC = params.namaPIC || "";
  var namaProyek = params.namaProyek || "";

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);

  // Determine next sequence No LF
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
      var mat = (typeof getMaterialByKode === "function") ? getMaterialByKode(spekNama) : null;
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

  return {
    kpmId: nomorBaruStr,
    nomor: nomorBaruStr,
    itemCount: rowsToInsert.length,
    status: statusKPM,
    statusCode: STATUS_CODES[statusKPM] || "BARU_DIBUAT"
  };
}

// ============================================
// 8. STATUS UPDATE & PHOTO SERVICE (STATE MACHINE)
// ============================================

/**
 * Handles Base64 image upload to Google Drive.
 */
function uploadProofPhoto(fotoData, nomorKPM, statusKPM) {
  if (!fotoData || fotoData.indexOf(",") === -1) return "";
  try {
    var folderName = WEB_CONFIG.DRIVE_FOLDER_NAME;
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var mimePart = fotoData.split(';')[0];
    var type = (mimePart && mimePart.indexOf(':') !== -1) ? mimePart.split(':')[1] : "image/jpeg";
    var base64 = fotoData.split(',')[1];

    var safeNomor = (nomorKPM || "KPM").replace(/\//g, "_");
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "ddMMyy_HHmm");
    var namaFile = safeNomor + "_" + (statusKPM || "Foto") + "_" + timestamp + ".jpg";

    var blob = Utilities.newBlob(Utilities.base64Decode(base64), type, namaFile);
    var file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log("uploadProofPhoto error: " + err.message);
    return "";
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
  var targetStatus = String(params.statusKPM || params.status || "").trim();

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

  for (var k = 0; k < allData.length; k++) {
    var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
    if (kpmDiSheet === nomorKPM) {
      matchingRows.push(k);
      if (!currentStatus) {
        currentStatus = String(allData[k][MONITOR_COL_STATUS - 1] || "").trim() || KPM_STATUS.BARU_DIBUAT;
      }
    }
  }

  if (matchingRows.length === 0) {
    throw { code: "KPM_NOT_FOUND", message: "KPM " + nomorKPM + " tidak ditemukan di sistem." };
  }

  // Enforce State Machine Transitions
  var allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
  if (allowedNext.indexOf(targetStatus) === -1) {
    throw {
      code: "INVALID_TRANSITION",
      message: "Transisi status tidak valid: Tidak dapat mengubah status dari '" + currentStatus + "' ke '" + targetStatus + "'."
    };
  }

  // Photo requirement validation for Berangkat / Tiba (unless bypassing for archive)
  var requiresPhoto = (targetStatus === KPM_STATUS.BERANGKAT || targetStatus === KPM_STATUS.TIBA);
  var hasPhotoData = (params.fotoData && params.fotoData.indexOf(",") !== -1);
  if (requiresPhoto && !hasPhotoData && !params.bypassPhoto) {
    throw {
      code: "PHOTO_REQUIRED",
      message: "Foto bukti pengiriman wajib dilampirkan untuk status '" + targetStatus + "'."
    };
  }

  var urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, targetStatus);
  var waktuSekarang = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  var namaPIC = params.namaPIC || "";
  var lokasiWorkshop = params.lokasiWorkshop || "";

  for (var idx = 0; idx < matchingRows.length; idx++) {
    var rIndex = matchingRows[idx];

    if (targetStatus === KPM_STATUS.BERANGKAT) {
      allData[rIndex][MONITOR_COL_WKT_BERANGKAT - 1] = waktuSekarang;
      if (urlFoto) {
        allData[rIndex][MONITOR_COL_FOTO_BER - 1] = '=HYPERLINK("' + urlFoto + '", "[Link]")';
      }
    } else if (targetStatus === KPM_STATUS.TIBA) {
      allData[rIndex][MONITOR_COL_WKT_TIBA - 1] = waktuSekarang;
      var waktuBerangkatTersimpan = allData[rIndex][MONITOR_COL_WKT_BERANGKAT - 1];
      var hasilDurasi = hitungDurasi(waktuBerangkatTersimpan, waktuSekarang);
      if (hasilDurasi !== "") {
        allData[rIndex][MONITOR_COL_DURASI - 1] = hasilDurasi;
      }
      if (urlFoto) {
        allData[rIndex][MONITOR_COL_FOTO_TIB - 1] = '=HYPERLINK("' + urlFoto + '", "[Link]")';
      }
    }

    if (namaPIC) allData[rIndex][MONITOR_COL_PIC - 1] = namaPIC;
    allData[rIndex][MONITOR_COL_STATUS - 1] = targetStatus;
    if (lokasiWorkshop) {
      if (targetStatus === KPM_STATUS.TIBA) {
        allData[rIndex][MONITOR_COL_WSTUJUAN - 1] = lokasiWorkshop;
      } else {
        allData[rIndex][MONITOR_COL_WSAWAL - 1] = lokasiWorkshop;
      }
    }
  }

  fullRange.setValues(allData);

  return {
    kpmId: nomorKPM,
    nomor: nomorKPM,
    previousStatus: currentStatus,
    currentStatus: targetStatus,
    statusCode: STATUS_CODES[targetStatus] || "",
    updatedAt: waktuSekarang,
    photoUrl: urlFoto
  };
}

// ============================================
// 9. ARCHIVE SERVICE
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

// ============================================
// 10. REST API ROUTING (doGet & doPost)
// ============================================

/**
 * Handles all GET requests. Returns unified { success, action, data, error } envelope.
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : "getMonitoring";
  try {
    var responseData;

    if (action === "getMasterData") {
      responseData = getMasterData();
    } else if (action === "getDeliveries") {
      responseData = getAvailableDeliveries();
    } else if (action === "getMonitoring") {
      var includeArchived = (e && e.parameter && e.parameter.includeArchived === "true");
      responseData = getKpmMonitoringData(includeArchived);
    } else {
      // Default: returns monitoring data
      action = "getMonitoring";
      responseData = getKpmMonitoringData(false);
    }

    return jsonOutput(createSuccessResponse(action, responseData));
  } catch (error) {
    var code = (error && error.code) ? error.code : "SERVER_ERROR";
    var msg = (error && error.message) ? error.message : String(error);
    return jsonOutput(createErrorResponse(action, code, msg));
  }
}

/**
 * Handles all POST requests with LockService concurrency protection.
 * Returns unified { success, action, data, error } envelope.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action ? String(params.action).trim() : "";

  // Deduce action if not explicitly supplied
  if (!action) {
    if (params.daftarBarang) action = "createKpm";
    else if (params.statusKPM && (params.statusKPM === KPM_STATUS.SELESAI || params.statusKPM.toLowerCase() === "selesai")) action = "archiveKpm";
    else if (params.statusKPM) action = "updateStatus";
    else action = "unknown";
  }

  try {
    lock.waitLock(15000); // 15-second concurrency lock

    var resultData;

    if (action === "createKpm") {
      resultData = validateAndCreateKpm(params);
    } else if (action === "archiveKpm") {
      resultData = archiveKpm(params.nomorKPM);
    } else if (action === "updateStatus") {
      resultData = validateAndUpdateStatus(params);
    } else {
      throw { code: "INVALID_REQUEST", message: "Perintah/action '" + action + "' tidak dikenali." };
    }

    return jsonOutput(createSuccessResponse(action, resultData));
  } catch (error) {
    var code = (error && error.code) ? error.code : "SERVER_ERROR";
    var msg = (error && error.message) ? error.message : String(error);
    return jsonOutput(createErrorResponse(action, code, msg));
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// 11. SETUP TRACKING HEADERS UTILITY
// ============================================

/**
 * Automatically sets up tracking column headers on row 8 of "KPM Monitor 2026".
 */
function setupTrackingHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    if (typeof SpreadsheetApp.getUi === "function") {
      SpreadsheetApp.getUi().alert("Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan.");
    }
    return;
  }

  var headers = [
    ["Waktu Berangkat", "Waktu Tiba", "Durasi", "Status Tracking", "Foto Berangkat", "Foto Tiba"]
  ];

  sheet.getRange(MONITOR_HEADER_ROW, MONITOR_COL_WKT_BERANGKAT, 1, 6).setValues(headers);
  if (typeof SpreadsheetApp.getUi === "function") {
    SpreadsheetApp.getUi().alert("Setup Selesai: Kolom Tracking S hingga X telah dikonfigurasi.");
  }
}
