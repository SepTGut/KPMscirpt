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

  var namaPIC = (params.namaPIC || "").trim();
  if (!namaPIC) {
    throw { code: "INVALID_INPUT", message: "Nama PIC / Petugas wajib diisi." };
  }
  var picMatched = "";
  for (var p = 0; p < WEB_CONFIG.PICS.length; p++) {
    if (WEB_CONFIG.PICS[p].toLowerCase() === namaPIC.toLowerCase()) {
      picMatched = WEB_CONFIG.PICS[p];
      break;
    }
  }
  if (!picMatched) {
    throw { code: "INVALID_INPUT", message: "Nama PIC '" + namaPIC + "' tidak terdaftar dalam konfigurasi sistem." };
  }
  namaPIC = picMatched;

  var lokasiBerangkat = params.lokasiBerangkat
    ? validateWorkshopRoute(params.lokasiBerangkat)
    : "";
  var lokasiTiba = params.lokasiTiba
    ? validateWorkshopRoute(params.lokasiTiba)
    : "";
  var lokasiWorkshop = params.lokasiWorkshop
    ? validateWorkshopRoute(params.lokasiWorkshop)
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
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
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

  var nomorBaruStr = latestNoLf ? incrementNoLf(latestNoLf) : getDefaultNoLf(0);
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
    sheet.getRange(barisKosong, 1, rowsToInsert.length, MONITOR_TOTAL_COLS).setValues(rowsToInsert);
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

  var requiresPhoto = (targetStatus === KPM_STATUS.BERANGKAT || targetStatus === KPM_STATUS.TIBA);
  var urlFoto = "";

  if (requiresPhoto && !params.bypassPhoto) {
    if (!params.fotoData || params.fotoData.indexOf(",") === -1) {
      throw {
        code: "PHOTO_REQUIRED",
        message: "Foto bukti pengiriman wajib dilampirkan untuk status '" + targetStatus + "'."
      };
    }
    urlFoto = uploadProofPhoto(params.fotoData, nomorKPM, targetStatus);
    if (!urlFoto) {
      throw {
        code: "PHOTO_UPLOAD_FAILED",
        message: "Gagal mengunggah foto bukti ke Google Drive. Status tidak diperbarui."
      };
    }
  }

  var waktuSekarang = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  var namaPIC = (params.namaPIC || "").trim();
  if (namaPIC) {
    var picMatched = "";
    for (var p = 0; p < WEB_CONFIG.PICS.length; p++) {
      if (WEB_CONFIG.PICS[p].toUpperCase() === namaPIC.toUpperCase()) {
        picMatched = WEB_CONFIG.PICS[p];
        break;
      }
    }
    if (!picMatched) {
      throw { code: "INVALID_INPUT", message: "Nama PIC '" + namaPIC + "' tidak terdaftar dalam konfigurasi sistem." };
    }
    namaPIC = picMatched;
  }

  var namaDriver = (params.namaDriver || params.driver || "").trim().toUpperCase();

  var lokasiWorkshop = "";
  var workshopOrigin = "";
  var workshopDest = "";
  if (params.lokasiWorkshop) {
    lokasiWorkshop = validateWorkshopRoute(params.lokasiWorkshop);
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
    sheet.getRange(MONITOR_START_ROW + minIdx, 1, sliceCount, MONITOR_TOTAL_COLS).setValues(sliceData);
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
          fotoTiba: fotoTibLink
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
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
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
