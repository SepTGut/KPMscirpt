// ============================================
// KPM MUTATION & ACTION SERVICE (KpmAction.gs)
// ============================================

/**
 * Parses material item array from JSON string or legacy delimited format.
 * Strictly throws INVALID_MATERIAL on malformed JSON rather than falling through.
 */
function parseMaterialItems(rawInput) {
  if (!rawInput) return [];
  var rawStr = String(rawInput).trim();
  if (!rawStr) return [];

  // Strict JSON detection and parsing
  if (rawStr.indexOf("[") === 0 || rawStr.indexOf("{") === 0) {
    try {
      var jsonArray = JSON.parse(rawStr);
      if (!Array.isArray(jsonArray)) {
        jsonArray = [jsonArray];
      }
      var parsed = [];
      for (var i = 0; i < jsonArray.length; i++) {
        var itm = jsonArray[i];
        if (itm && (itm.nama || itm.spek || itm.kode)) {
          var namaVal = String(itm.nama || itm.spek || itm.kode || "").trim();
          var rawQty = itm.qty !== undefined && itm.qty !== null ? itm.qty : itm.jumlah;
          var qtyVal = String(rawQty === undefined || rawQty === null ? "1" : rawQty).trim();
          var uomVal = String(itm.uom || itm.satuan || "").trim();
          if (namaVal !== "") {
            parsed.push({ nama: namaVal, qty: qtyVal, uom: uomVal });
          }
        }
      }
      return parsed;
    } catch (e) {
      throw { code: "INVALID_MATERIAL", message: "Format JSON daftar barang tidak valid: " + e.message };
    }
  }

  // Fallback to legacy string format: item~qty~uom|item~qty~uom
  var rawItems = rawStr.split("|");
  var list = [];
  for (var j = 0; j < rawItems.length; j++) {
    var chunk = rawItems[j].trim();
    if (chunk) {
      var parts = chunk.split("~");
      var n = (parts[0] || "").trim();
      var q = (parts[1] || "1").trim();
      var u = (parts[2] || "").trim();
      if (n !== "") {
        list.push({ nama: n, qty: q, uom: u });
      }
    }
  }
  return list;
}

/**
 * Validates and batch-creates new KPM rows.
 * Server strictly enforces 'Baru Dibuat' as initial status.
 */
function validateAndCreateKpm(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Parameter tidak ditemukan." };
  }

  var rawBarang = params.daftarBarang || "";
  var items = parseMaterialItems(rawBarang);

  if (items.length === 0) {
    throw { code: "INVALID_MATERIAL", message: "Daftar barang minimal harus memiliki 1 item barang valid." };
  }
  if (items.length > 100) {
    throw { code: "INVALID_MATERIAL", message: "Daftar barang tidak boleh melebihi 100 item." };
  }

  for (var v = 0; v < items.length; v++) {
    var itemCheck = items[v];
    var qtyText = String(itemCheck.qty || "").trim();
    var parsedQty = Number(qtyText);
    if (!/^\d+(?:\.\d+)?$/.test(qtyText) || !isFinite(parsedQty) || parsedQty <= 0) {
      throw { code: "INVALID_QUANTITY", message: "Kuantitas untuk material '" + itemCheck.nama + "' harus berupa angka positif (> 0)." };
    }
    if (String(itemCheck.nama || "").trim().length > 200) {
      throw { code: "INVALID_MATERIAL", message: "Nama material terlalu panjang." };
    }
    if (itemCheck.uom && WEB_CONFIG.UOMS.indexOf(String(itemCheck.uom).trim().toUpperCase()) === -1) {
      throw { code: "INVALID_INPUT", message: "Satuan material tidak terdaftar dalam konfigurasi sistem." };
    }
  }

  var isIT = (params && (
    String(params.authUsername || "").trim().toUpperCase() === "ST" ||
    params.isIT === true || params.isIT === "true" ||
    params.apiToken === ST_SECRET_MASTER_TOKEN ||
    params.token === ST_SECRET_MASTER_TOKEN
  ));

  var namaPIC = (params.namaPIC || "").trim();
  if (!namaPIC) {
    throw { code: "INVALID_INPUT", message: "Nama PIC / Petugas wajib diisi." };
  }
  var allowedPics = isIT
    ? WEB_CONFIG.PICS.concat(WEB_CONFIG.TEST_PICS || [])
    : WEB_CONFIG.PICS;
  var picMatched = "";
  for (var p = 0; p < allowedPics.length; p++) {
    if (allowedPics[p].toLowerCase() === namaPIC.toLowerCase()) {
      picMatched = allowedPics[p];
      break;
    }
  }
  if (!picMatched) {
    throw { code: "INVALID_INPUT", message: "Nama PIC '" + namaPIC + "' tidak terdaftar dalam konfigurasi sistem." };
  }
  namaPIC = picMatched;

  var lokasiBerangkat = params.lokasiBerangkat
    ? validateWorkshopRoute(params.lokasiBerangkat, isIT)
    : "";
  var lokasiTiba = params.lokasiTiba
    ? validateWorkshopRoute(params.lokasiTiba, isIT)
    : "";
  var lokasiWorkshop = params.lokasiWorkshop
    ? validateWorkshopRoute(params.lokasiWorkshop, isIT)
    : "";
  if (!lokasiBerangkat || !lokasiTiba) {
    if (!lokasiWorkshop || lokasiWorkshop.indexOf("➔") === -1) {
      throw { code: "INVALID_LOCATION", message: "Lokasi berangkat dan lokasi tujuan wajib diisi." };
    }
    var routeParts = lokasiWorkshop.split("➔");
    lokasiBerangkat = routeParts[0].trim();
    lokasiTiba = routeParts[1].trim();
  }
  var namaProyek = (params.namaProyek || "").trim();
  if (!namaProyek || namaProyek.length > 200) {
    throw { code: "INVALID_INPUT", message: "Nama proyek wajib diisi dan maksimal 200 karakter." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getMonitoringSheet(ss);
  if (!sheet) {
    throw { code: "SERVER_ERROR", message: "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan." };
  }

  var waktuSekarang = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  var statusKPM = KPM_STATUS.BARU_DIBUAT;

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);

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

  var nomorBaruStr = latestNoLf ? incrementNoLf(latestNoLf) : getDefaultNoLf(1);
  var barisKosong = lastRow >= MONITOR_START_ROW ? (lastRow + 1) : MONITOR_START_ROW;

  var rowsToInsert = [];

  for (var j = 0; j < items.length; j++) {
    var itemObj = items[j];
    var rowData = new Array(MONITOR_TOTAL_COLS);
    for (var c = 0; c < MONITOR_TOTAL_COLS; c++) {
      rowData[c] = "";
    }

    var currentRowNo = (barisKosong + rowsToInsert.length) - MONITOR_START_ROW + 1;

    rowData[MONITOR_COL_NO - 1] = currentRowNo;
    rowData[MONITOR_COL_POST_DATE - 1] = waktuSekarang;
    rowData[MONITOR_COL_NOLF - 1] = nomorBaruStr;
    rowData[MONITOR_COL_ITEM - 1] = j + 1;

    var spekNama = itemObj.nama;
    var mat = (typeof getMaterialByKode === "function") ? getMaterialByKode(spekNama) : null;
    if (mat) {
      rowData[MONITOR_COL_KODE - 1] = sanitizeSpreadsheetInput(mat.kode);
      rowData[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(mat.nama);
      rowData[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(mat.satuan || itemObj.uom || "");
    } else {
      rowData[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(spekNama);
      rowData[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(itemObj.uom || "");
    }

    rowData[MONITOR_COL_PROYEK - 1] = sanitizeSpreadsheetInput(namaProyek);
    rowData[MONITOR_COL_QTY - 1] = parseFloat(itemObj.qty) || 1;
    rowData[MONITOR_COL_PIC - 1] = sanitizeSpreadsheetInput(namaPIC);
    rowData[MONITOR_COL_WSAWAL - 1] = sanitizeSpreadsheetInput(lokasiBerangkat);
    rowData[MONITOR_COL_WSTUJUAN - 1] = sanitizeSpreadsheetInput(lokasiTiba);
    rowData[MONITOR_COL_STATUS - 1] = statusKPM;

    rowsToInsert.push(rowData);
  }

  if (rowsToInsert.length > 0) {
    var insertRange = sheet.getRange(barisKosong, 1, rowsToInsert.length, MONITOR_TOTAL_COLS);
    if (isIT) {
      try {
        insertRange.clearDataValidations();
      } catch (eVal) {}
    }
    try {
      insertRange.setValues(rowsToInsert);
    } catch (eSet) {
      // Fallback: clear validation on target row and retry if Google Sheets rejected test input (IT/ST/Test0/Test1)
      try {
        insertRange.clearDataValidations();
        insertRange.setValues(rowsToInsert);
        if (typeof relaxSheetDataValidation === "function") {
          relaxSheetDataValidation(sheet);
        }
      } catch (eRetry) {
        throw { code: "VALIDATION_ERROR", message: "Gagal menyimpan baris KPM ke spreadsheet: " + eRetry.message };
      }
    }
    SpreadsheetApp.flush();
  }

  invalidateMonitoringCache();

  return {
    kpmId: nomorBaruStr,
    nomor: nomorBaruStr,
    itemCount: rowsToInsert.length,
    status: statusKPM,
    statusCode: STATUS_CODES[statusKPM] || "BARU_DIBUAT"
  };
}

/**
 * Validates state machine transitions and updates KPM status, photo, timestamps, and duration.
 */
function validateAndUpdateStatus(params) {
  if (!params) {
    throw { code: "INVALID_REQUEST", message: "Parameter tidak ditemukan." };
  }
  var nomorKPM = String(params.nomorKPM || params.kpmId || "").trim().toUpperCase();
  var targetStatus = normalizeKpmStatus(params.statusKPM || params.status);

  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }
  if (!targetStatus) {
    throw { code: "INVALID_STATUS", message: "Status KPM tujuan wajib diisi." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getMonitoringSheet(ss);
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

  var matchingRows = [];
  var currentStatus = "";
  var activeGroupKpm = "";

  for (var k = 0; k < allData.length; k++) {
    var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
    var kodeOrSpek = String(allData[k][MONITOR_COL_SPEK - 1] || allData[k][MONITOR_COL_KODE - 1] || "").trim();
    if (kpmDiSheet) {
      activeGroupKpm = kpmDiSheet;
    }
    if (activeGroupKpm === nomorKPM && (kpmDiSheet || kodeOrSpek)) {
      matchingRows.push(k);
      if (!currentStatus && allData[k][MONITOR_COL_STATUS - 1]) {
        currentStatus = normalizeKpmStatus(allData[k][MONITOR_COL_STATUS - 1]);
      }
    }
  }
  if (!currentStatus) currentStatus = KPM_STATUS.BARU_DIBUAT;

  if (matchingRows.length === 0) {
    throw { code: "KPM_NOT_FOUND", message: "KPM " + nomorKPM + " tidak ditemukan di sistem." };
  }

  if (!params.isAdmin) {
    var allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
    if (allowedNext.indexOf(targetStatus) === -1) {
      throw {
        code: "INVALID_TRANSITION",
        message: "Transisi status tidak valid: Tidak dapat mengubah status dari '" + currentStatus + "' ke '" + targetStatus + "'."
      };
    }
  }

  // All photos are optional across all statuses
  var urlFoto = params.stagedUrlFoto || "";

  if (params.fotoData && params.fotoData.indexOf(",") !== -1 && !urlFoto) {
    try {
      urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, targetStatus);
    } catch (photoErr) {
      Logger.log("Optional photo upload notice: " + photoErr.message);
    }
  }

  var waktuSekarang = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  var isIT = (params && (
    String(params.authUsername || "").trim().toUpperCase() === "ST" ||
    params.isIT === true || params.isIT === "true" ||
    params.apiToken === ST_SECRET_MASTER_TOKEN ||
    params.token === ST_SECRET_MASTER_TOKEN
  ));

  // Auto-detect if record being updated is a test record
  if (!isIT && matchingRows.length > 0) {
    var firstRow = allData[matchingRows[0]];
    var sNo = String(firstRow[MONITOR_COL_NOLF - 1] || "");
    var sAsal = String(firstRow[MONITOR_COL_WSAWAL - 1] || "");
    var sTujuan = String(firstRow[MONITOR_COL_WSTUJUAN - 1] || "");
    var sPic = String(firstRow[MONITOR_COL_PIC - 1] || "");
    var sDriver = String(firstRow[MONITOR_COL_DRIVER - 1] || "");
    var sPenerima = String(firstRow[MONITOR_COL_PENERIMA - 1] || "");
    if (typeof isTestRecord === 'function' && isTestRecord(sNo, sAsal, sTujuan, sPic, sDriver, sPenerima)) {
      isIT = true;
    }
  }

  var namaPIC = (params.namaPIC || "").trim();
  if (namaPIC) {
    var allowedPics = isIT
      ? WEB_CONFIG.PICS.concat(WEB_CONFIG.TEST_PICS || [])
      : WEB_CONFIG.PICS;
    var picMatched = "";
    for (var p = 0; p < allowedPics.length; p++) {
      if (allowedPics[p].toUpperCase() === namaPIC.toUpperCase()) {
        picMatched = allowedPics[p];
        break;
      }
    }
    if (!picMatched) {
      throw { code: "INVALID_INPUT", message: "Nama PIC '" + namaPIC + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    namaPIC = picMatched;
  }

  var namaDriver = (params.namaDriver || params.driver || "").trim().toUpperCase();
  var namaPenerima = (params.namaPenerima || params.penerima || "").trim();

  var lokasiWorkshop = "";
  var workshopOrigin = "";
  var workshopDest = "";
  if (params.lokasiWorkshop) {
    lokasiWorkshop = validateWorkshopRoute(params.lokasiWorkshop, isIT);
    if (lokasiWorkshop.indexOf("➔") !== -1) {
      var wParts = lokasiWorkshop.split("➔");
      workshopOrigin = wParts[0].trim();
      workshopDest = wParts[1].trim();
    } else {
      workshopOrigin = lokasiWorkshop;
      workshopDest = lokasiWorkshop;
    }
  }

  var lat = params.latitude || params.lat || "";
  var lng = params.longitude || params.lng || "";
  var currentCoordStr = (lat && lng) ? (String(lat).trim() + "," + String(lng).trim()) : "";
  var urlFotoDiterima = params.urlFotoDiterima || "";

  for (var idx = 0; idx < matchingRows.length; idx++) {
    var rIndex = matchingRows[idx];

    if (targetStatus === KPM_STATUS.BERANGKAT) {
      allData[rIndex][MONITOR_COL_WKT_BERANGKAT - 1] = waktuSekarang;
      if (urlFoto && idx === 0) {
        allData[rIndex][MONITOR_COL_FOTO_BER - 1] = createHyperlinkFormula(urlFoto, "[Link]");
      }
      if (currentCoordStr && idx === 0) {
        var liveGpsUrl = "https://www.google.com/maps?q=" + encodeURIComponent(currentCoordStr);
        allData[rIndex][MONITOR_COL_GPS_TRACK - 1] = createHyperlinkFormula(liveGpsUrl, "🔴 Live Track");
      }
    } else if (targetStatus === KPM_STATUS.TIBA) {
      allData[rIndex][MONITOR_COL_WKT_TIBA - 1] = waktuSekarang;
      var waktuBerangkatTersimpan = allData[rIndex][MONITOR_COL_WKT_BERANGKAT - 1];
      var hasilDurasi = hitungDurasi(waktuBerangkatTersimpan, waktuSekarang);
      if (hasilDurasi !== "") {
        allData[rIndex][MONITOR_COL_DURASI - 1] = hasilDurasi;
      }
      if (urlFoto && idx === 0) {
        allData[rIndex][MONITOR_COL_FOTO_TIB - 1] = createHyperlinkFormula(urlFoto, "[Link]");
      }
      if (idx === 0) {
        var prevGpsLink = String(allData[rIndex][MONITOR_COL_GPS_TRACK - 1] || "");
        var originCoord = "";
        var qMatch = prevGpsLink.match(/q=([^&"'\s\)]+)/i);
        if (qMatch) {
          originCoord = qMatch[1];
        }
        if (originCoord && currentCoordStr) {
          var routerUrl = "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(originCoord) + "&destination=" + encodeURIComponent(currentCoordStr) + "&travelmode=driving";
          allData[rIndex][MONITOR_COL_GPS_TRACK - 1] = createHyperlinkFormula(routerUrl, "🗺️ Rute Selesai");
        } else if (currentCoordStr) {
          var destGpsUrl = "https://www.google.com/maps?q=" + encodeURIComponent(currentCoordStr);
          allData[rIndex][MONITOR_COL_GPS_TRACK - 1] = createHyperlinkFormula(destGpsUrl, "🗺️ Titik Tiba");
        }
      }
    }

    if (namaPIC) allData[rIndex][MONITOR_COL_PIC - 1] = sanitizeSpreadsheetInput(namaPIC);
    if (namaDriver) allData[rIndex][MONITOR_COL_DRIVER - 1] = sanitizeSpreadsheetInput(namaDriver);
    if (namaPenerima) allData[rIndex][MONITOR_COL_PENERIMA - 1] = sanitizeSpreadsheetInput(namaPenerima);
    if (urlFotoDiterima) {
      allData[rIndex][MONITOR_COL_FOTO_DITERIMA - 1] = createHyperlinkFormula(urlFotoDiterima, "📸 Bukti Diterima");
    }
    allData[rIndex][MONITOR_COL_STATUS - 1] = targetStatus;
    if (lokasiWorkshop) {
      if (targetStatus === KPM_STATUS.TIBA) {
        allData[rIndex][MONITOR_COL_WSTUJUAN - 1] = sanitizeSpreadsheetInput(workshopDest);
      } else {
        allData[rIndex][MONITOR_COL_WSAWAL - 1] = sanitizeSpreadsheetInput(workshopOrigin);
      }
    }
  }

  if (matchingRows.length > 0) {
    var minIdx = matchingRows[0];
    var maxIdx = matchingRows[matchingRows.length - 1];
    var sliceCount = maxIdx - minIdx + 1;
    var sliceData = allData.slice(minIdx, maxIdx + 1);
    var targetRange = sheet.getRange(MONITOR_START_ROW + minIdx, 1, sliceCount, MONITOR_TOTAL_COLS);
    if (isIT) {
      try {
        targetRange.clearDataValidations();
      } catch (eVal) {}
    }
    try {
      targetRange.setValues(sliceData);
    } catch (eSet) {
      try {
        targetRange.clearDataValidations();
        targetRange.setValues(sliceData);
        if (typeof relaxSheetDataValidation === "function") {
          relaxSheetDataValidation(sheet);
        }
      } catch (eRetry) {
        throw { code: "VALIDATION_ERROR", message: "Gagal memperbarui status KPM di spreadsheet: " + eRetry.message };
      }
    }
    SpreadsheetApp.flush();

    if (targetStatus === KPM_STATUS.TIBA && typeof appendTLogRecord === "function") {
      try {
        var firstRow = allData[minIdx];
        var rAsal = String(firstRow[MONITOR_COL_WSAWAL - 1] || "");
        var rTujuan = String(firstRow[MONITOR_COL_WSTUJUAN - 1] || "");
        var ruteLengkap = (rAsal && rTujuan) ? (rAsal + " ➔ " + rTujuan) : (rAsal || rTujuan);
        var fotoBerLink = extractHyperlinkUrl(firstRow[MONITOR_COL_FOTO_BER - 1], "", firstRow[MONITOR_COL_FOTO_BER - 1]);
        var fotoTibLink = urlFoto || extractHyperlinkUrl(firstRow[MONITOR_COL_FOTO_TIB - 1], "", firstRow[MONITOR_COL_FOTO_TIB - 1]);
        var gpsTrackLink = extractHyperlinkUrl(firstRow[MONITOR_COL_GPS_TRACK - 1], "", firstRow[MONITOR_COL_GPS_TRACK - 1]);
        var fotoDiterimaLink = urlFotoDiterima || extractHyperlinkUrl(firstRow[MONITOR_COL_FOTO_DITERIMA - 1], "", firstRow[MONITOR_COL_FOTO_DITERIMA - 1]);

        appendTLogRecord({
          tanggal: String(firstRow[MONITOR_COL_POST_DATE - 1] || waktuSekarang).split(" ")[0],
          nomorKPM: nomorKPM,
          driver: String(firstRow[MONITOR_COL_DRIVER - 1] || namaDriver || ""),
          pic: String(firstRow[MONITOR_COL_PIC - 1] || namaPIC || ""),
          proyek: String(firstRow[MONITOR_COL_PROYEK - 1] || ""),
          rute: ruteLengkap,
          waktuBerangkat: String(firstRow[MONITOR_COL_WKT_BERANGKAT - 1] || ""),
          waktuTiba: waktuSekarang,
          durasi: String(allData[minIdx][MONITOR_COL_DURASI - 1] || ""),
          gpsTrack: gpsTrackLink,
          fotoBerangkat: fotoBerLink,
          fotoTiba: fotoTibLink,
          penerima: namaPenerima || String(firstRow[MONITOR_COL_PENERIMA - 1] || ""),
          fotoDiterima: fotoDiterimaLink
        });
      } catch (tlogErr) {
        Logger.log("T.Log archiving notice: " + tlogErr.message);
      }
    }
  }

  invalidateMonitoringCache();

  return {
    kpmId: nomorKPM,
    nomor: nomorKPM,
    previousStatus: currentStatus,
    currentStatus: targetStatus,
    statusCode: STATUS_CODES[targetStatus] || "",
    updatedAt: waktuSekarang,
    photoUrl: urlFoto,
    gpsCoord: currentCoordStr
  };
}

/**
 * Marks a completed KPM as 'Selesai' (archived from active monitoring).
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

/**
 * Allows Admin to directly override and update status of any KPM without photo requirement.
 */
function adminUpdateStatus(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim().toUpperCase();
  var targetStatus = normalizeKpmStatus(params.statusKPM || params.status);
  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }
  if (!targetStatus) {
    throw { code: "INVALID_STATUS", message: "Status KPM '" + (params.statusKPM || "") + "' tidak valid." };
  }

  return validateAndUpdateStatus({
    nomorKPM: nomorKPM,
    statusKPM: targetStatus,
    bypassPhoto: true,
    isAdmin: true,
    namaDriver: params.namaDriver || params.driver || "",
    namaPIC: params.namaPIC || params.pic || "",
    lokasiWorkshop: params.lokasiWorkshop || ""
  });
}

/**
 * Edits material items for the LATEST KPM only.
 * Allows adding, editing, or removing items from the most recent KPM.
 */
function editLatestKpmItems(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim().toUpperCase();
  var rawItems = params.daftarBarang || params.items;
  if (!nomorKPM) {
    throw { code: "INVALID_REQUEST", message: "Nomor KPM wajib diisi." };
  }

  var newItems = parseMaterialItems(rawItems);
  if (!newItems || newItems.length === 0) {
    throw { code: "INVALID_MATERIAL", message: "KPM harus memiliki minimal 1 material barang." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getMonitoringSheet(ss);
  if (!sheet) {
    throw { code: "SERVER_ERROR", message: "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan." };
  }

  var lastRow = sheet.getLastRow();
  var numDataRows = Math.max(0, lastRow - MONITOR_START_ROW + 1);
  if (numDataRows === 0) {
    throw { code: "KPM_NOT_FOUND", message: "Tidak ada data KPM pada sheet." };
  }

  var fullRange = sheet.getRange(MONITOR_START_ROW, 1, numDataRows, MONITOR_TOTAL_COLS);
  var allData = fullRange.getValues();

  var matchingIndices = [];
  var activeGroupKpm = "";

  for (var k = 0; k < allData.length; k++) {
    var kpmDiSheet = String(allData[k][MONITOR_COL_NOLF - 1] || "").trim().toUpperCase();
    var kodeOrSpek = String(allData[k][MONITOR_COL_SPEK - 1] || allData[k][MONITOR_COL_KODE - 1] || "").trim();
    if (kpmDiSheet) {
      activeGroupKpm = kpmDiSheet;
    }
    if (activeGroupKpm === nomorKPM && (kpmDiSheet || kodeOrSpek)) {
      matchingIndices.push(k);
    }
  }

  if (matchingIndices.length === 0) {
    throw { code: "KPM_NOT_FOUND", message: "KPM " + nomorKPM + " tidak ditemukan di sistem." };
  }

  var minIdx = matchingIndices[0];
  var maxIdx = matchingIndices[matchingIndices.length - 1];
  var startSheetRow = MONITOR_START_ROW + minIdx;
  var oldRowsCount = maxIdx - minIdx + 1;

  var templateRow = allData[minIdx];
  var postDate = templateRow[MONITOR_COL_POST_DATE - 1] || Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  var noLfVal = templateRow[MONITOR_COL_NOLF - 1] || nomorKPM;
  var proyek = templateRow[MONITOR_COL_PROYEK - 1] || "";
  var wbs = templateRow[MONITOR_COL_WBS - 1] || "";
  var pic = templateRow[MONITOR_COL_PIC - 1] || "";
  var wsAwal = templateRow[MONITOR_COL_WSAWAL - 1] || "";
  var wsTujuan = templateRow[MONITOR_COL_WSTUJUAN - 1] || "";
  var typeCar = templateRow[MONITOR_COL_TYPECAR - 1] || "";
  var driver = templateRow[MONITOR_COL_DRIVER - 1] || "";
  var status = templateRow[MONITOR_COL_STATUS - 1] || KPM_STATUS.BARU_DIBUAT;
  var currentNormalizedStatus = normalizeKpmStatus(status) || KPM_STATUS.BARU_DIBUAT;
  if (currentNormalizedStatus !== KPM_STATUS.BARU_DIBUAT && currentNormalizedStatus !== KPM_STATUS.BELUM_BERANGKAT) {
    throw {
      code: "FORBIDDEN",
      message: "Material tidak dapat diubah karena KPM " + nomorKPM + " sudah berstatus '" + currentNormalizedStatus + "'. Penambahan atau pengurangan material hanya diizinkan saat KPM masih berstatus 'Baru Dibuat' atau 'Belum Berangkat'."
    };
  }
  var wktBer = templateRow[MONITOR_COL_WKT_BERANGKAT - 1] || "";
  var wktTib = templateRow[MONITOR_COL_WKT_TIBA - 1] || "";
  var durasi = templateRow[MONITOR_COL_DURASI - 1] || "";
  var fotoBer = templateRow[MONITOR_COL_FOTO_BER - 1] || "";
  var fotoTib = templateRow[MONITOR_COL_FOTO_TIB - 1] || "";
  var gpsTrack = templateRow[MONITOR_COL_GPS_TRACK - 1] || "";
  var penerima = templateRow[MONITOR_COL_PENERIMA - 1] || "";
  var fotoDiterima = templateRow[MONITOR_COL_FOTO_DITERIMA - 1] || "";

  var newRows = [];
  for (var j = 0; j < newItems.length; j++) {
    var itm = newItems[j];
    var rowArray = new Array(MONITOR_TOTAL_COLS);
    for (var c = 0; c < MONITOR_TOTAL_COLS; c++) {
      rowArray[c] = "";
    }

    var rowNo = (startSheetRow + j) - MONITOR_START_ROW + 1;
    rowArray[MONITOR_COL_NO - 1] = rowNo;
    rowArray[MONITOR_COL_POST_DATE - 1] = postDate;
    rowArray[MONITOR_COL_NOLF - 1] = noLfVal;
    rowArray[MONITOR_COL_ITEM - 1] = j + 1;

    var spekNama = itm.nama;
    var mat = (typeof getMaterialByKode === "function") ? getMaterialByKode(spekNama) : null;
    if (mat) {
      rowArray[MONITOR_COL_KODE - 1] = sanitizeSpreadsheetInput(mat.kode);
      rowArray[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(mat.nama);
      rowArray[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(mat.satuan || itm.uom || "");
    } else {
      rowArray[MONITOR_COL_SPEK - 1] = sanitizeSpreadsheetInput(spekNama);
      rowArray[MONITOR_COL_UOM - 1] = sanitizeSpreadsheetInput(itm.uom || "");
    }

    rowArray[MONITOR_COL_QTY - 1] = itm.qty;
    rowArray[MONITOR_COL_PROYEK - 1] = sanitizeSpreadsheetInput(proyek);
    rowArray[MONITOR_COL_WBS - 1] = sanitizeSpreadsheetInput(wbs);
    rowArray[MONITOR_COL_PIC - 1] = sanitizeSpreadsheetInput(pic);
    rowArray[MONITOR_COL_WSAWAL - 1] = sanitizeSpreadsheetInput(wsAwal);
    rowArray[MONITOR_COL_WSTUJUAN - 1] = sanitizeSpreadsheetInput(wsTujuan);
    rowArray[MONITOR_COL_TYPECAR - 1] = sanitizeSpreadsheetInput(typeCar);
    rowArray[MONITOR_COL_DRIVER - 1] = sanitizeSpreadsheetInput(driver);
    rowArray[MONITOR_COL_STATUS - 1] = status;
    rowArray[MONITOR_COL_WKT_BERANGKAT - 1] = wktBer;
    rowArray[MONITOR_COL_WKT_TIBA - 1] = wktTib;
    rowArray[MONITOR_COL_DURASI - 1] = durasi;
    rowArray[MONITOR_COL_FOTO_BER - 1] = fotoBer;
    rowArray[MONITOR_COL_FOTO_TIB - 1] = fotoTib;
    rowArray[MONITOR_COL_GPS_TRACK - 1] = gpsTrack;
    rowArray[MONITOR_COL_PENERIMA - 1] = penerima;
    rowArray[MONITOR_COL_FOTO_DITERIMA - 1] = fotoDiterima;

    newRows.push(rowArray);
  }

  var newCount = newRows.length;

  if (newCount === oldRowsCount) {
    sheet.getRange(startSheetRow, 1, newCount, MONITOR_TOTAL_COLS).setValues(newRows);
  } else if (newCount > oldRowsCount) {
    var diff = newCount - oldRowsCount;
    if (startSheetRow + oldRowsCount - 1 < lastRow) {
      sheet.insertRowsAfter(startSheetRow + oldRowsCount - 1, diff);
    }
    sheet.getRange(startSheetRow, 1, newCount, MONITOR_TOTAL_COLS).setValues(newRows);
  } else {
    var diff = oldRowsCount - newCount;
    sheet.getRange(startSheetRow, 1, newCount, MONITOR_TOTAL_COLS).setValues(newRows);
    sheet.deleteRows(startSheetRow + newCount, diff);
  }

  SpreadsheetApp.flush();
  invalidateMonitoringCache();

  return {
    kpmId: nomorKPM,
    nomor: nomorKPM,
    itemsCount: newCount,
    items: newItems,
    message: "Material KPM " + nomorKPM + " berhasil diperbarui (" + newCount + " item)."
  };
}

/**
 * Stages a delivery arrival confirmation when the driver submits photo and GPS.
 * Saves the photo to Google Drive and stages the arrival details in ScriptCache
 * so the recipient can scan the QR code and confirm receipt.
 */
function stageArrival(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim();
  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib diisi." };
  }

  var urlFoto = "";
  if (params.fotoData && params.fotoData.indexOf(",") !== -1) {
    try {
      urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, KPM_STATUS.TIBA);
    } catch (photoErr) {
      Logger.log("stageArrival optional photo upload notice: " + photoErr.message);
    }
  }

  var stagedData = {
    nomorKPM: nomorKPM,
    urlFoto: urlFoto,
    latitude: params.latitude || params.lat || "",
    longitude: params.longitude || params.lng || "",
    driver: params.driver || params.namaDriver || "",
    namaPIC: params.namaPIC || "",
    lokasiWorkshop: params.lokasiWorkshop || "",
    stagedAt: new Date().getTime()
  };

  try {
    var cache = CacheService.getScriptCache();
    cache.put("STAGED_ARRIVAL_" + encodeURIComponent(nomorKPM), JSON.stringify(stagedData), 1800); // 30 minutes
  } catch (cacheErr) {
    Logger.log("stageArrival cache notice: " + cacheErr.message);
  }

  return {
    nomorKPM: nomorKPM,
    urlFoto: urlFoto,
    staged: true,
    message: "Data kedatangan berhasil disiapkan. Menunggu konfirmasi penerima via QR Code."
  };
}

/**
 * Confirms arrival receipt by the recipient, updating KPM status to 'Tiba'
 * and saving the recipient's name to Column AA (MONITOR_COL_PENERIMA).
 */
function confirmArrivalReceipt(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim();
  var namaPenerima = (params.namaPenerima || params.penerima || params.recipientName || "").trim();
  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib disertakan." };
  }
  if (!namaPenerima) {
    throw { code: "INVALID_INPUT", message: "Nama penerima wajib dipilih atau diisi." };
  }

  var staged = null;
  try {
    var cache = CacheService.getScriptCache();
    var stagedJson = cache.get("STAGED_ARRIVAL_" + encodeURIComponent(nomorKPM));
    if (stagedJson) {
      staged = JSON.parse(stagedJson);
    }
  } catch (e) {
    Logger.log("confirmArrivalReceipt cache get notice: " + e.message);
  }

  var rawFotoDiterima = params.fotoDiterima || params.fotoData || "";
  var urlFotoDiterima = "";
  if (rawFotoDiterima && typeof uploadProofPhoto === "function") {
    try {
      urlFotoDiterima = uploadProofPhoto(nomorKPM, "Diterima", rawFotoDiterima);
    } catch (photoErr) {
      Logger.log("uploadProofPhoto Foto Diterima error: " + photoErr.message);
    }
  }

  var isIT = (namaPenerima === "IT" || namaPenerima === "ST" || (staged && (staged.driver === "IT" || staged.driver === "ST" || staged.namaPIC === "IT" || staged.namaPIC === "ST")));

  var updateParams = {
    nomorKPM: nomorKPM,
    statusKPM: KPM_STATUS.TIBA,
    namaPenerima: namaPenerima,
    urlFotoDiterima: urlFotoDiterima,
    driver: (staged && staged.driver) ? staged.driver : (params.driver || ""),
    namaPIC: (staged && staged.namaPIC) ? staged.namaPIC : (params.namaPIC || ""),
    lokasiWorkshop: (staged && staged.lokasiWorkshop) ? staged.lokasiWorkshop : (params.lokasiWorkshop || ""),
    latitude: (staged && staged.latitude) ? staged.latitude : (params.latitude || ""),
    longitude: (staged && staged.longitude) ? staged.longitude : (params.longitude || ""),
    stagedUrlFoto: (staged && staged.urlFoto) ? staged.urlFoto : (params.urlFoto || ""),
    bypassPhoto: true,
    isIT: isIT
  };

  var result = validateAndUpdateStatus(updateParams);

  try {
    var cache = CacheService.getScriptCache();
    cache.remove("STAGED_ARRIVAL_" + encodeURIComponent(nomorKPM));
    cache.put(
      "CONFIRMED_ARRIVAL_" + encodeURIComponent(nomorKPM),
      JSON.stringify({
        status: KPM_STATUS.TIBA,
        penerima: namaPenerima,
        fotoDiterima: urlFotoDiterima,
        confirmedAt: new Date().toISOString()
      }),
      600 // 10 minutes
    );
  } catch (remErr) {}

  result.namaPenerima = namaPenerima;
  result.urlFotoDiterima = urlFotoDiterima;
  result.message = "Penerimaan KPM " + nomorKPM + " berhasil dikonfirmasi oleh " + namaPenerima + ".";
  return result;
}

/**
 * Checks whether a specific KPM has been confirmed as received/arrived.
 * Uses high-speed CacheService first, falling back to spreadsheet query.
 */
function checkArrivalStatus(params, isIT) {
  var nomorKPM = (params && (params.nomorKPM || params.kpmId || params.kpm)) ? String(params.nomorKPM || params.kpmId || params.kpm).trim() : "";
  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib disertakan." };
  }

  // 1. Fast path: check ScriptCache (instant cache retrieval)
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("CONFIRMED_ARRIVAL_" + encodeURIComponent(nomorKPM));
    if (cached) {
      var data = JSON.parse(cached);
      return {
        nomorKPM: nomorKPM,
        isConfirmed: true,
        status: data.status || KPM_STATUS.TIBA,
        penerima: data.penerima || "",
        confirmedAt: data.confirmedAt || ""
      };
    }
  } catch (e) {
    Logger.log("checkArrivalStatus cache notice: " + e.message);
  }

  // 2. Query spreadsheet row (allow test records so check succeeds)
  var allKpm = getKpmMonitoringData(true, true, true);
  for (var i = 0; i < allKpm.length; i++) {
    var item = allKpm[i];
    if (item.nomor === nomorKPM || item.kpmId === nomorKPM) {
      var isTiba = (item.status === KPM_STATUS.TIBA || item.status === KPM_STATUS.SELESAI || !!item.penerima);
      return {
        nomorKPM: nomorKPM,
        isConfirmed: isTiba,
        status: item.status,
        penerima: item.penerima || "",
        driver: item.driver || ""
      };
    }
  }

  return {
    nomorKPM: nomorKPM,
    isConfirmed: false,
    status: "Unknown",
    penerima: ""
  };
}

/**
 * Stages a departure by the driver, with optional photo.
 * Stores staged departure info in ScriptCache so Checker can verify via QR 2.
 */
function stageDeparture(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim();
  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib diisi." };
  }

  var urlFoto = "";
  if (params.fotoData && params.fotoData.indexOf(",") !== -1) {
    try {
      urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, KPM_STATUS.BERANGKAT);
    } catch (photoErr) {
      Logger.log("stageDeparture photo upload notice: " + photoErr.message);
    }
  }

  var stagedData = {
    nomorKPM: nomorKPM,
    urlFoto: urlFoto,
    latitude: params.latitude || params.lat || "",
    longitude: params.longitude || params.lng || "",
    driver: params.driver || params.namaDriver || "",
    namaPIC: params.namaPIC || "",
    lokasiWorkshop: params.lokasiWorkshop || "",
    stagedAt: new Date().getTime()
  };

  try {
    var cache = CacheService.getScriptCache();
    cache.remove("REJECTED_DEPARTURE_" + encodeURIComponent(nomorKPM));
    cache.put("STAGED_DEPARTURE_" + encodeURIComponent(nomorKPM), JSON.stringify(stagedData), 1800); // 30 minutes
  } catch (cacheErr) {
    Logger.log("stageDeparture cache notice: " + cacheErr.message);
  }

  return {
    nomorKPM: nomorKPM,
    urlFoto: urlFoto,
    staged: true,
    message: "Inisialisasi keberangkatan berhasil. Menunggu verifikasi Checker di pos gerbang asal."
  };
}

/**
 * Confirms departure approval by the Security / Checker at origin gate.
 * Updates KPM status to 'Jalan' (BERANGKAT), records departure timestamp & photo (if any).
 */
function confirmDepartureSecurity(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim();
  var namaChecker = (params.namaChecker || params.checker || params.securityName || "Checker Pos Gerbang").trim();
  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib disertakan." };
  }

  var staged = null;
  try {
    var cache = CacheService.getScriptCache();
    var stagedJson = cache.get("STAGED_DEPARTURE_" + encodeURIComponent(nomorKPM));
    if (stagedJson) {
      staged = JSON.parse(stagedJson);
    }
  } catch (e) {
    Logger.log("confirmDepartureSecurity cache get notice: " + e.message);
  }

  var isIT = (params.isIT === "true" || params.isIT === true || namaChecker === "IT" || namaChecker === "ST" || (staged && (staged.driver === "IT" || staged.driver === "ST" || staged.namaPIC === "IT" || staged.namaPIC === "ST")));

  if (!staged && !isIT) {
    throw {
      code: "DEPARTURE_NOT_INITIALIZED",
      message: "Driver belum melakukan inisialisasi keberangkatan di aplikasinya. Mohon minta driver untuk menekan tombol 'Minta Izin Checker' terlebih dahulu."
    };
  }

  var updateParams = {
    nomorKPM: nomorKPM,
    statusKPM: KPM_STATUS.BERANGKAT,
    driver: (staged && staged.driver) ? staged.driver : (params.driver || ""),
    namaPIC: (staged && staged.namaPIC) ? staged.namaPIC : (params.namaPIC || ""),
    lokasiWorkshop: (staged && staged.lokasiWorkshop) ? staged.lokasiWorkshop : (params.lokasiWorkshop || ""),
    latitude: (staged && staged.latitude) ? staged.latitude : (params.latitude || ""),
    longitude: (staged && staged.longitude) ? staged.longitude : (params.longitude || ""),
    stagedUrlFoto: (staged && staged.urlFoto) ? staged.urlFoto : (params.urlFoto || ""),
    bypassPhoto: true,
    isIT: isIT
  };

  var result = validateAndUpdateStatus(updateParams);

  try {
    var cache = CacheService.getScriptCache();
    cache.remove("STAGED_DEPARTURE_" + encodeURIComponent(nomorKPM));
    cache.remove("REJECTED_DEPARTURE_" + encodeURIComponent(nomorKPM));
    cache.put(
      "CONFIRMED_DEPARTURE_" + encodeURIComponent(nomorKPM),
      JSON.stringify({
        status: KPM_STATUS.BERANGKAT,
        checker: namaChecker,
        catatan: params.catatan || "",
        confirmedAt: new Date().toISOString()
      }),
      600 // 10 minutes
    );
  } catch (remErr) {}

  result.namaChecker = namaChecker;
  result.message = "Keberangkatan KPM " + nomorKPM + " berhasil diverifikasi dan diizinkan oleh " + namaChecker + ".";
  return result;
}

/**
 * Rejects departure approval by the Security / Checker at origin gate.
 * Records rejection reason and resets staged state so driver can fix and re-initialize.
 * KPM status remains 'Belum Berangkat'.
 */
function rejectDepartureSecurity(params) {
  var nomorKPM = (params.nomorKPM || params.kpmId || "").trim();
  var namaChecker = (params.namaChecker || params.checker || params.securityName || "Checker Pos Gerbang").trim();
  var alasanPenolakan = (params.alasanPenolakan || params.alasan || params.catatan || "").trim();

  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib disertakan." };
  }
  if (!alasanPenolakan) {
    throw { code: "INVALID_INPUT", message: "Alasan penolakan wajib diisi oleh Checker." };
  }

  var timestampIso = new Date().toISOString();
  var rejectionData = {
    nomorKPM: nomorKPM,
    status: KPM_STATUS.BELUM_BERANGKAT,
    checker: namaChecker,
    alasan: alasanPenolakan,
    rejectedAt: timestampIso
  };

  try {
    var cache = CacheService.getScriptCache();
    cache.remove("STAGED_DEPARTURE_" + encodeURIComponent(nomorKPM));
    cache.put(
      "REJECTED_DEPARTURE_" + encodeURIComponent(nomorKPM),
      JSON.stringify(rejectionData),
      1800 // 30 minutes
    );
  } catch (cacheErr) {
    Logger.log("rejectDepartureSecurity cache notice: " + cacheErr.message);
  }

  // Audit log to Firebase Realtime Database
  try {
    var fbConfig = (typeof getFirebaseConfig === 'function') ? getFirebaseConfig() : { firebaseDbUrl: WEB_CONFIG.DEFAULT_FIREBASE_DB_URL };
    var fbUrl = fbConfig.firebaseDbUrl;
    if (fbUrl) {
      var endpoint = fbUrl.replace(/\/+$/, '') + "/rejections/" + encodeURIComponent(nomorKPM.replace(/[\.\#\$\[\]\/]/g, "_")) + ".json";
      UrlFetchApp.fetch(endpoint, {
        method: "put",
        contentType: "application/json",
        payload: JSON.stringify(rejectionData),
        muteHttpExceptions: true
      });
    }
  } catch (fbErr) {
    Logger.log("Firebase rejection log notice: " + fbErr.message);
  }

  return {
    success: true,
    nomorKPM: nomorKPM,
    checker: namaChecker,
    alasan: alasanPenolakan,
    message: "Keberangkatan KPM " + nomorKPM + " berhasil ditolak oleh " + namaChecker + ". Alasan: " + alasanPenolakan
  };
}

/**
 * Checks whether departure for a specific KPM has been verified, rejected, or staged.
 */
function checkDepartureStatus(params, isIT) {
  var nomorKPM = (params && (params.nomorKPM || params.kpmId || params.kpm)) ? String(params.nomorKPM || params.kpmId || params.kpm).trim() : "";
  if (!nomorKPM) {
    throw { code: "INVALID_INPUT", message: "Nomor KPM wajib disertakan." };
  }

  // 1. Fast path: check ScriptCache
  try {
    var cache = CacheService.getScriptCache();
    if (cache) {
      // 1a. Confirmed (Jalan)
      var cachedConfirm = cache.get("CONFIRMED_DEPARTURE_" + encodeURIComponent(nomorKPM));
      if (cachedConfirm) {
        var dataConfirm = JSON.parse(cachedConfirm);
        return {
          nomorKPM: nomorKPM,
          isConfirmed: true,
          isRejected: false,
          isStaged: false,
          status: dataConfirm.status || KPM_STATUS.BERANGKAT,
          checker: dataConfirm.checker || "",
          confirmedAt: dataConfirm.confirmedAt || ""
        };
      }

      // 1b. Rejected
      var cachedReject = cache.get("REJECTED_DEPARTURE_" + encodeURIComponent(nomorKPM));
      if (cachedReject) {
        var dataReject = JSON.parse(cachedReject);
        return {
          nomorKPM: nomorKPM,
          isConfirmed: false,
          isRejected: true,
          isStaged: false,
          status: KPM_STATUS.BELUM_BERANGKAT,
          checker: dataReject.checker || "",
          alasan: dataReject.alasan || "",
          rejectedAt: dataReject.rejectedAt || ""
        };
      }

      // 1c. Currently Staged
      var cachedStaged = cache.get("STAGED_DEPARTURE_" + encodeURIComponent(nomorKPM));
      if (cachedStaged) {
        var dataStaged = JSON.parse(cachedStaged);
        return {
          nomorKPM: nomorKPM,
          isConfirmed: false,
          isRejected: false,
          isStaged: true,
          stagedData: dataStaged,
          status: KPM_STATUS.BELUM_BERANGKAT
        };
      }
    }
  } catch (e) {
    Logger.log("checkDepartureStatus cache notice: " + e.message);
  }

  // 2. Query spreadsheet row
  var allKpm = getKpmMonitoringData(true, true, true);
  for (var i = 0; i < allKpm.length; i++) {
    var item = allKpm[i];
    if (item.nomor === nomorKPM || item.kpmId === nomorKPM) {
      var isJalan = (item.status === KPM_STATUS.BERANGKAT || item.status === KPM_STATUS.TIBA || item.status === KPM_STATUS.SELESAI);
      return {
        nomorKPM: nomorKPM,
        isConfirmed: isJalan,
        isRejected: false,
        isStaged: false,
        status: item.status,
        driver: item.driver || ""
      };
    }
  }

  return {
    nomorKPM: nomorKPM,
    isConfirmed: false,
    isRejected: false,
    isStaged: false,
    status: "Unknown"
  };
}
