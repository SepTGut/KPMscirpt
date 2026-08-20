// ============================================
// WEB APP CONTROLLER & BUSINESS LOGIC (Web.gs)
// ============================================
// Single Source of Truth for WKPM Web App (Admin & User/Driver)

var WEB_CONFIG = {
  DRIVE_FOLDER_NAME: "Bukti_Pengiriman_KPM",
  WORKSHOPS: ["Candi Sewu", "Tiron", "Sukosari", "Remul"],
  PICS: ["Aang", "Eko", "Ruli", "Vany", "Taufiq"],
  UOMS: ["PCS", "M", "UNIT", "SET", "PSG", "SHT", "L", "ROLL", "STK"],
  STATUSES: ["Baru Dibuat", "Berangkat", "Tiba", "Selesai"]
};

// ============================================
// 1. MASTER DATA SERVICE
// ============================================

/**
 * Returns centralized master data for dropdowns and forms.
 */
function getMasterData() {
  return {
    workshops: WEB_CONFIG.WORKSHOPS,
    pics: WEB_CONFIG.PICS,
    uoms: WEB_CONFIG.UOMS,
    statuses: WEB_CONFIG.STATUSES
  };
}

// ============================================
// 2. TIME & FORMATTING BUSINESS HELPERS
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
// 3. MONITORING DOMAIN SERVICE (ADMIN VIEW)
// ============================================

/**
 * Reads sheet and produces fully server-computed KPM monitoring objects.
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

    var isArchived = statusAkhir.toLowerCase() === "selesai";
    if (!includeArchived && isArchived) continue;

    if (!kpmMap[kpm]) {
      var isDeparted = (statusAkhir === "Berangkat" || statusAkhir === "Tiba" || statusAkhir === "Selesai");
      var isArrived = (statusAkhir === "Tiba" || statusAkhir === "Selesai");

      var badgeClass = isArrived ? "b-tiba" : isDeparted ? "b-berangkat" : "b-dibuat";
      var badgeText = isArrived ? "TIBA" : isDeparted ? "BERANGKAT" : "DIBUAT";
      var timelineFill = isArrived ? "100%" : isDeparted ? "50%" : "0%";

      kpmMap[kpm] = {
        nomor: kpm,
        pic: pic,
        status: statusAkhir,
        lokasi: lokasi,
        proyek: proyek,
        waktuDibuat: waktuBuat,
        waktuBerangkat: waktuBer,
        waktuTiba: waktuTib,
        durasi: durasi,
        formattedCreated: formatWaktuDisplay(waktuBuat),
        formattedDeparted: formatWaktuDisplay(waktuBer),
        formattedArrived: formatWaktuDisplay(waktuTib),
        badgeClass: badgeClass,
        badgeText: badgeText,
        timelineProgress: timelineFill,
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
// 4. DELIVERY DOMAIN SERVICE (USER/DRIVER VIEW)
// ============================================

/**
 * Returns active KPMs decorated with server-directed nextStatus and validation requirements.
 */
function getAvailableDeliveries() {
  var allKpm = getKpmMonitoringData(false);
  var available = [];

  for (var i = 0; i < allKpm.length; i++) {
    var item = allKpm[i];
    // Driver can only process KPMs that have not arrived or finished
    if (item.status !== "Tiba" && item.status !== "Selesai") {
      var nextStatus = (item.status === "Berangkat") ? "Tiba" : "Berangkat";
      available.push({
        nomor: item.nomor,
        proyek: item.proyek,
        lokasi: item.lokasi,
        pic: item.pic,
        currentStatus: item.status,
        nextStatus: nextStatus,
        requiresPhoto: true,
        photoLabel: (nextStatus === "Berangkat")
          ? "📷 Unggah Bukti Foto Keberangkatan (Wajib):"
          : "📷 Unggah Bukti Foto Ketibaan (Wajib):",
        daftarBarang: item.daftarBarang
      });
    }
  }

  return available;
}

// ============================================
// 5. CREATION SERVICE (KPM CREATION)
// ============================================

/**
 * Validates and batch-creates new KPM rows.
 */
function validateAndCreateKpm(params) {
  if (!params) throw new Error("Parameter tidak ditemukan");
  var rawBarang = params.daftarBarang || "";
  if (!rawBarang.trim()) throw new Error("Daftar barang tidak boleh kosong");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) throw new Error("Sheet " + MONITOR_SHEET_NAME + " tidak ditemukan");

  var waktuSekarang = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  var items = rawBarang.split("|");
  var lokasiWorkshop = params.lokasiWorkshop || "";
  var statusKPM = params.statusKPM || "Baru Dibuat";
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

  return nomorBaruStr;
}

// ============================================
// 6. STATUS UPDATE & PHOTO SERVICE
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
    return "Error Drive: " + err.message;
  }
}

/**
 * Validates state transitions and updates KPM status, photo, timestamps, and duration.
 */
function validateAndUpdateStatus(params) {
  if (!params) throw new Error("Parameter tidak ditemukan");
  var nomorKPM = String(params.nomorKPM || "").trim().toUpperCase();
  var statusKPM = String(params.statusKPM || "").trim();
  if (!nomorKPM) throw new Error("Nomor KPM wajib diisi");
  if (!statusKPM) throw new Error("Status KPM wajib diisi");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) throw new Error("Sheet " + MONITOR_SHEET_NAME + " tidak ditemukan");

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);
  if (numDataRows === 0) throw new Error("KPM Tidak Ditemukan");

  var urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, statusKPM);
  var waktuSekarang = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  var fullRange = sheet.getRange(MONITOR_START_ROW, 1, numDataRows, MONITOR_TOTAL_COLS);
  var allData = fullRange.getValues();
  var adaYangDiupdate = false;

  var namaPIC = params.namaPIC || "";
  var lokasiWorkshop = params.lokasiWorkshop || "";

  for (var k = 0; k < allData.length; k++) {
    var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
    if (kpmDiSheet === nomorKPM) {
      adaYangDiupdate = true;

      if (statusKPM.toLowerCase() === "berangkat") {
        allData[k][MONITOR_COL_WKT_BERANGKAT - 1] = waktuSekarang;
        if (urlFoto) {
          allData[k][MONITOR_COL_FOTO_BER - 1] = '=HYPERLINK("' + urlFoto + '", "[Link]")';
        }
      } else if (statusKPM.toLowerCase() === "tiba") {
        allData[k][MONITOR_COL_WKT_TIBA - 1] = waktuSekarang;
        var waktuBerangkatTersimpan = allData[k][MONITOR_COL_WKT_BERANGKAT - 1];
        var hasilDurasi = hitungDurasi(waktuBerangkatTersimpan, waktuSekarang);
        if (hasilDurasi !== "") {
          allData[k][MONITOR_COL_DURASI - 1] = hasilDurasi;
        }
        if (urlFoto) {
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

  if (!adaYangDiupdate) throw new Error("KPM Tidak Ditemukan");

  fullRange.setValues(allData);
  return "Sukses";
}

// ============================================
// 7. ARCHIVE SERVICE
// ============================================

/**
 * Marks a completed KPM as 'Selesai' (archived from monitoring).
 */
function archiveKpm(nomorKPM) {
  if (!nomorKPM) throw new Error("Nomor KPM wajib diisi");
  return validateAndUpdateStatus({
    nomorKPM: nomorKPM,
    statusKPM: "Selesai"
  });
}

// ============================================
// 8. REST API ROUTING (doGet & doPost)
// ============================================

/**
 * Handles all GET requests. Routes by action param with backwards-compatible fallback.
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : "";
    var responseData;

    if (action === "getMasterData") {
      responseData = getMasterData();
    } else if (action === "getDeliveries") {
      responseData = getAvailableDeliveries();
    } else if (action === "getMonitoring") {
      var includeArchived = (e && e.parameter && e.parameter.includeArchived === "true");
      responseData = getKpmMonitoringData(includeArchived);
    } else {
      // Default: returns monitoring data for full backward-compatibility with existing apps
      responseData = getKpmMonitoringData(false);
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles all POST requests. Routes by action param with backwards-compatible fallback.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15-second concurrency lock

    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action ? String(params.action).trim() : "";

    // 1. Create KPM route
    if (action === "createKpm" || params.daftarBarang) {
      var newNomor = validateAndCreateKpm(params);
      return ContentService.createTextOutput(newNomor);
    }

    // 2. Archive KPM route
    if (action === "archiveKpm" || (params.statusKPM && params.statusKPM.toLowerCase() === "selesai")) {
      var archiveResult = archiveKpm(params.nomorKPM);
      return ContentService.createTextOutput(archiveResult);
    }

    // 3. Update Status route
    if (action === "updateStatus" || params.statusKPM) {
      var updateResult = validateAndUpdateStatus(params);
      return ContentService.createTextOutput(updateResult);
    }

    return ContentService.createTextOutput("Error: Perintah tidak dikenali");
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// 9. SETUP TRACKING HEADERS UTILITY
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
