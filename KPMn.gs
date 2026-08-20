// ============================================
// KPM MONITOR 2026 HIGH-PERFORMANCE ENGINE (KPMn.gs)
// ============================================

// KPM Monitor Sheet Config
var MONITOR_SHEET_NAME = "KPM Monitor 2026";
var MONITOR_HEADER_ROW = 8;    // header labels are on row 8
var MONITOR_START_ROW = 10;    // data starts at row 10
var MONITOR_TOTAL_COLS = 24;   // Total 24 columns (A to X)

// Column mapping (1-indexed, A to X):
var MONITOR_COL_NO = 1;             // Column A: NO (Oto)
var MONITOR_COL_POST_DATE = 2;      // Column B: Post Date (Otomatis)
var MONITOR_COL_NOLF = 3;           // Column C: No LF (Counting Manual/Auto)
var MONITOR_COL_ITEM = 4;           // Column D: Item (1, 2, 3...)
var MONITOR_COL_KODE = 5;           // Column E: Kode Material
var MONITOR_COL_SPEK = 6;           // Column F: Spesifikasi (Semi-Otomatis)
var MONITOR_COL_WBS = 7;            // Column G: WBS
var MONITOR_COL_PROYEK = 8;         // Column H: Proyek
var MONITOR_COL_TYPECAR = 9;        // Column I: Type Car
var MONITOR_COL_BATCH = 10;         // Column J: TS/Batch/Set
var MONITOR_COL_QTY = 11;           // Column K: Qty Diminta
var MONITOR_COL_QTYDISERAHKAN = 12; // Column L: Qty Diserahkan
var MONITOR_COL_UOM = 13;           // Column M: UoM/stn (Optional Auto-fill)
var MONITOR_COL_SN = 14;            // Column N: SN
var MONITOR_COL_PIC = 15;           // Column O: PIC KPM
var MONITOR_COL_KET = 16;           // Column P: Keterangan
var MONITOR_COL_WSAWAL = 17;        // Column Q: Dari/ws awal
var MONITOR_COL_WSTUJUAN = 18;      // Column R: Tujuan/ws tujuan
var MONITOR_COL_WKT_BERANGKAT = 19; // Column S: Waktu Berangkat
var MONITOR_COL_WKT_TIBA = 20;      // Column T: Waktu Tiba
var MONITOR_COL_DURASI = 21;        // Column U: Durasi Perjalanan
var MONITOR_COL_STATUS = 22;        // Column V: Status Tracking
var MONITOR_COL_FOTO_BER = 23;      // Column W: Foto Berangkat (URL Drive)
var MONITOR_COL_FOTO_TIB = 24;      // Column X: Foto Tiba (URL Drive)

// ============================================
// FAST IN-MEMORY HELPERS FOR NO LF, ITEM & GROUP
// ============================================

/**
 * FAST IN-MEMORY SEARCH: Reads preceding data block in 1 batch call and scans in RAM.
 */
function getPreviousActiveRow(sheet, currentRow) {
  var lookback = Math.min(currentRow - MONITOR_START_ROW, 20);
  if (lookback <= 0) return null;

  var startR = currentRow - lookback;
  var block = sheet.getRange(startR, 1, lookback, 6).getValues();
  for (var i = block.length - 1; i >= 0; i--) {
    var itemVal = block[i][MONITOR_COL_ITEM - 1];
    var nolfVal = block[i][MONITOR_COL_NOLF - 1];
    var kodeVal = block[i][MONITOR_COL_KODE - 1];
    var spekVal = block[i][MONITOR_COL_SPEK - 1];

    if (itemVal || nolfVal || kodeVal || spekVal) {
      return {
        row: startR + i,
        item: parseInt(itemVal, 10) || 1,
        noLf: nolfVal ? nolfVal.toString().trim() : ""
      };
    }
  }
  return null;
}

/**
 * Increments the numeric sequence portion inside any No LF string.
 * Example: "100/PPO/LF/VIII/2026" -> "101/PPO/LF/VIII/2026"
 */
function incrementNoLf(noLfStr) {
  if (!noLfStr) return getDefaultNoLf(0);

  var match = noLfStr.match(/^(.*?)(\d+)(.*)$/);
  if (match) {
    var prefix = match[1];
    var numStr = match[2];
    var suffix = match[3];
    var nextNum = parseInt(numStr, 10) + 1;
    var targetLength = Math.max(numStr.length, 3);
    var paddedNum = String(nextNum).padStart(targetLength, '0');
    return prefix + paddedNum + suffix;
  }
  return noLfStr;
}

/**
 * Formats a default No LF string based on Master Settings or default template.
 * Starts from "000" by default (e.g. 000/PPO/LF/VIII/2026).
 */
function getDefaultNoLf(startSeq) {
  var settings = typeof getMasterSettings === 'function' ? getMasterSettings() : {};
  var date = new Date();
  var year = date.getFullYear();
  var monthIndex = date.getMonth();
  var romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  var monthRoman = romanMonths[monthIndex];
  var monthNum = String(monthIndex + 1).padStart(2, '0');

  var seq = (startSeq !== undefined && startSeq !== null) ? startSeq : 0;
  var formattedNo = String(seq).padStart(3, '0');

  var tpl = settings.template || settings.lampiranTemplate || "{no}/PPO/LF/{month}/{year}";
  return tpl
    .replace(/\{no\}/g, formattedNo)
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, monthRoman)
    .replace(/\{monthNum\}/g, monthNum);
}

/**
 * FAST BATCH GROUP SYNC: Updates downstream rows in 1 single setValues call.
 */
function syncDownstreamGroupMetadata(sheet, row, col, newValue) {
  var maxLookahead = 25;
  var maxRow = sheet.getLastRow();
  var count = Math.min(maxRow - row, maxLookahead);
  if (count <= 0) return;

  var currentNoLf = sheet.getRange(row, MONITOR_COL_NOLF).getValue();
  if (!currentNoLf) return;
  var targetNoLf = currentNoLf.toString().trim();

  // Read downstream slice in 1 batch call
  var dataNolf = sheet.getRange(row + 1, MONITOR_COL_NOLF, count, 1).getValues();
  var dataTarget = sheet.getRange(row + 1, col, count, 1).getValues();
  var hasChanges = false;

  for (var i = 0; i < count; i++) {
    var rNoLf = dataNolf[i][0] ? dataNolf[i][0].toString().trim() : "";
    if (rNoLf === targetNoLf) {
      dataTarget[i][0] = newValue;
      hasChanges = true;
    } else if (rNoLf !== "") {
      break; // Stop when next group begins
    }
  }

  if (hasChanges) {
    sheet.getRange(row + 1, col, count, 1).setValues(dataTarget);
  }
}

// In-memory helper functions for onEdit
function ensureItemAndNoLfInMemory(sheet, row, rowData) {
  var currentItem = parseInt(rowData[MONITOR_COL_ITEM - 1], 10);
  var currentNoLf = rowData[MONITOR_COL_NOLF - 1];

  if (!currentItem) {
    var prev = getPreviousActiveRow(sheet, row);
    if (prev) {
      rowData[MONITOR_COL_ITEM - 1] = prev.item + 1;
      if (!currentNoLf) rowData[MONITOR_COL_NOLF - 1] = prev.noLf;
    } else {
      rowData[MONITOR_COL_ITEM - 1] = 1;
      if (!currentNoLf) rowData[MONITOR_COL_NOLF - 1] = getDefaultNoLf(0);
    }
  } else if (currentItem === 1 && !currentNoLf) {
    var prev = getPreviousActiveRow(sheet, row);
    rowData[MONITOR_COL_NOLF - 1] = (prev && prev.noLf) ? incrementNoLf(prev.noLf) : getDefaultNoLf(0);
  }
}

function inheritGroupMetadataInMemory(sheet, row, rowData) {
  var itemVal = parseInt(rowData[MONITOR_COL_ITEM - 1], 10);
  var currentNoLf = rowData[MONITOR_COL_NOLF - 1];

  if (itemVal > 1 && currentNoLf) {
    var prev = getPreviousActiveRow(sheet, row);
    if (prev && prev.noLf === currentNoLf.toString().trim()) {
      var prevRowData = sheet.getRange(prev.row, 1, 1, MONITOR_TOTAL_COLS).getValues()[0];
      var groupCols = [
        MONITOR_COL_WSAWAL, MONITOR_COL_WSTUJUAN, MONITOR_COL_PROYEK,
        MONITOR_COL_WBS, MONITOR_COL_PIC, MONITOR_COL_TYPECAR,
        MONITOR_COL_STATUS, MONITOR_COL_WKT_BERANGKAT, MONITOR_COL_WKT_TIBA,
        MONITOR_COL_DURASI, MONITOR_COL_FOTO_BER, MONITOR_COL_FOTO_TIB
      ];
      for (var i = 0; i < groupCols.length; i++) {
        var cIdx = groupCols[i] - 1;
        if (prevRowData[cIdx] && (!rowData[cIdx] || rowData[cIdx].toString().trim() === "")) {
          rowData[cIdx] = prevRowData[cIdx];
        }
      }
    }
  }
}

function clearRowDataInMemory(rowData) {
  for (var c = 0; c < rowData.length; c++) {
    rowData[c] = "";
  }
}

// ============================================
// HIGH-SPEED BATCH ON EDIT TRIGGER
// ============================================
function onEdit(e) {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) return;
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  if (sheet.getName().trim().toLowerCase() !== MONITOR_SHEET_NAME.trim().toLowerCase()) return;

  var startRow = e.range.getRow();
  var numRows = e.range.getNumRows();
  var startCol = e.range.getColumn();
  var numCols = e.range.getNumColumns();

  // If the edited range is completely above the data start row, skip
  if (startRow + numRows - 1 < MONITOR_START_ROW) return;

  var effectiveStartRow = Math.max(startRow, MONITOR_START_ROW);
  var effectiveRowCount = (startRow + numRows) - effectiveStartRow;
  if (effectiveRowCount <= 0) return;

  // -------------------------------------------------------------
  // MULTI-ROW BULK DELETE / EDIT HANDLER
  // -------------------------------------------------------------
  if (effectiveRowCount > 1) {
    var range = sheet.getRange(effectiveStartRow, 1, effectiveRowCount, MONITOR_TOTAL_COLS);
    var allRows = range.getValues();
    var hasModifications = false;

    for (var i = 0; i < effectiveRowCount; i++) {
      var rowData = allRows[i];
      var kode = rowData[MONITOR_COL_KODE - 1] ? rowData[MONITOR_COL_KODE - 1].toString().trim() : "";
      var spek = rowData[MONITOR_COL_SPEK - 1] ? rowData[MONITOR_COL_SPEK - 1].toString().trim() : "";

      // If no material on this row, wipe all metadata cleanly
      if (kode === "" && spek === "") {
        clearRowDataInMemory(rowData);
        hasModifications = true;
      }
    }

    if (hasModifications) {
      range.setValues(allRows);
    }
    return;
  }

  // -------------------------------------------------------------
  // SINGLE ROW FAST IN-MEMORY HANDLER
  // -------------------------------------------------------------
  var row = effectiveStartRow;
  var col = startCol;
  var cellVal = (e.value !== undefined) ? e.value : e.range.getValue();
  var cellStr = (cellVal !== null && cellVal !== undefined) ? cellVal.toString().trim() : "";

  var rowRange = sheet.getRange(row, 1, 1, MONITOR_TOTAL_COLS);
  var rowData = rowRange.getValues()[0];
  var modified = false;

  var autoNoValue = row - MONITOR_START_ROW + 1; // Row 10 = 1, Row 11 = 2, etc.

  // Current values on this row
  var currentKode = rowData[MONITOR_COL_KODE - 1] ? rowData[MONITOR_COL_KODE - 1].toString().trim() : "";
  var currentSpek = rowData[MONITOR_COL_SPEK - 1] ? rowData[MONITOR_COL_SPEK - 1].toString().trim() : "";

  // -------------------------------------------------------------
  // INSTANT DELETION / CLEAR HANDLERS
  // -------------------------------------------------------------
  if (cellStr === "") {
    if (col === MONITOR_COL_ITEM || col === MONITOR_COL_KODE || col === MONITOR_COL_NOLF) {
      clearRowDataInMemory(rowData);
      rowRange.setValues([rowData]);
      return;
    }
    if (col === MONITOR_COL_SPEK && currentKode === "") {
      clearRowDataInMemory(rowData);
      rowRange.setValues([rowData]);
      return;
    }
  }

  // Case A: Editing "Item" (Column 4 / Col D)
  if (col === MONITOR_COL_ITEM) {
    var itemVal = parseInt(cellStr, 10);
    if (!isNaN(itemVal)) {
      if (itemVal === 1) {
        var prev = getPreviousActiveRow(sheet, row);
        rowData[MONITOR_COL_NOLF - 1] = (prev && prev.noLf) ? incrementNoLf(prev.noLf) : getDefaultNoLf(0);
      } else if (itemVal > 1) {
        var prev = getPreviousActiveRow(sheet, row);
        if (prev && prev.noLf) {
          rowData[MONITOR_COL_NOLF - 1] = prev.noLf;
        }
      }
      inheritGroupMetadataInMemory(sheet, row, rowData);

      if (!rowData[MONITOR_COL_NO - 1]) {
        rowData[MONITOR_COL_NO - 1] = autoNoValue;
      }
      if (!rowData[MONITOR_COL_POST_DATE - 1]) {
        rowData[MONITOR_COL_POST_DATE - 1] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      }
      modified = true;
    }
  }

  // Case B: Editing "No LF" (Column 3 / Col C) directly
  if (col === MONITOR_COL_NOLF && cellStr !== "") {
    if (!rowData[MONITOR_COL_ITEM - 1]) {
      rowData[MONITOR_COL_ITEM - 1] = 1;
    }
    if (!rowData[MONITOR_COL_NO - 1]) {
      rowData[MONITOR_COL_NO - 1] = autoNoValue;
    }
    if (!rowData[MONITOR_COL_POST_DATE - 1]) {
      rowData[MONITOR_COL_POST_DATE - 1] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    }
    modified = true;
  }

  // Case C: Editing Group Metadata fields
  if (col === MONITOR_COL_WSAWAL || col === MONITOR_COL_WSTUJUAN ||
      col === MONITOR_COL_PROYEK || col === MONITOR_COL_WBS ||
      col === MONITOR_COL_PIC || col === MONITOR_COL_TYPECAR ||
      col === MONITOR_COL_STATUS || col === MONITOR_COL_WKT_BERANGKAT ||
      col === MONITOR_COL_WKT_TIBA || col === MONITOR_COL_DURASI ||
      col === MONITOR_COL_FOTO_BER || col === MONITOR_COL_FOTO_TIB) {
    syncDownstreamGroupMetadata(sheet, row, col, cellVal);
  }

  // Case D: Editing "Kode Material" (Column 5 / Col E)
  if (col === MONITOR_COL_KODE) {
    var mat = getMaterialByKode(cellStr);
    if (mat) {
      rowData[MONITOR_COL_SPEK - 1] = mat.nama;
      if (mat.satuan) rowData[MONITOR_COL_UOM - 1] = mat.satuan;
    }

    ensureItemAndNoLfInMemory(sheet, row, rowData);
    inheritGroupMetadataInMemory(sheet, row, rowData);

    if (!rowData[MONITOR_COL_NO - 1]) {
      rowData[MONITOR_COL_NO - 1] = autoNoValue;
    }
    if (!rowData[MONITOR_COL_POST_DATE - 1]) {
      rowData[MONITOR_COL_POST_DATE - 1] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    }
    modified = true;
  }

  // Case E: Editing "Spesifikasi" (Column 6 / Col F) directly
  if (col === MONITOR_COL_SPEK) {
    if (cellStr !== "") {
      ensureItemAndNoLfInMemory(sheet, row, rowData);
      inheritGroupMetadataInMemory(sheet, row, rowData);

      if (!rowData[MONITOR_COL_NO - 1]) {
        rowData[MONITOR_COL_NO - 1] = autoNoValue;
      }
      if (!rowData[MONITOR_COL_POST_DATE - 1]) {
        rowData[MONITOR_COL_POST_DATE - 1] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      }
      modified = true;
    }
  }

  // Guard: If both Kode and Spek are empty AND Item is empty, wipe row completely
  var finalKode = rowData[MONITOR_COL_KODE - 1] ? rowData[MONITOR_COL_KODE - 1].toString().trim() : "";
  var finalSpek = rowData[MONITOR_COL_SPEK - 1] ? rowData[MONITOR_COL_SPEK - 1].toString().trim() : "";
  var finalItem = rowData[MONITOR_COL_ITEM - 1] ? rowData[MONITOR_COL_ITEM - 1].toString().trim() : "";

  if (finalKode === "" && finalSpek === "" && finalItem === "") {
    clearRowDataInMemory(rowData);
    modified = true;
  }

  // 1 BATCH WRITE: Write all modified columns in 1 single network call
  if (modified) {
    rowRange.setValues([rowData]);
  }
}

/**
 * Sweeps the entire "KPM Monitor 2026" sheet and purges any orphaned rows
 * that have lingering metadata without active material codes or descriptions.
 */
function cleanOrphanedRows() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < MONITOR_START_ROW) return;

  var numRows = lastRow - MONITOR_START_ROW + 1;
  var range = sheet.getRange(MONITOR_START_ROW, 1, numRows, MONITOR_TOTAL_COLS);
  var allRows = range.getValues();
  var cleanedCount = 0;

  for (var i = 0; i < allRows.length; i++) {
    var rowData = allRows[i];
    var kode = rowData[MONITOR_COL_KODE - 1] ? rowData[MONITOR_COL_KODE - 1].toString().trim() : "";
    var spek = rowData[MONITOR_COL_SPEK - 1] ? rowData[MONITOR_COL_SPEK - 1].toString().trim() : "";
    var item = rowData[MONITOR_COL_ITEM - 1] ? rowData[MONITOR_COL_ITEM - 1].toString().trim() : "";

    if (kode === "" && spek === "") {
      var hasLingering = false;
      for (var c = 0; c < rowData.length; c++) {
        if (rowData[c] !== "") {
          hasLingering = true;
          break;
        }
      }
      if (hasLingering) {
        clearRowDataInMemory(rowData);
        cleanedCount++;
      }
    }
  }

  if (cleanedCount > 0) {
    range.setValues(allRows);
  }

  SpreadsheetApp.getUi().alert("Pembersihan Selesai: " + cleanedCount + " baris tanpa material telah dibersihkan.");
}

// ============================================
// PRINT KPM FROM MONITOR SHEET (printKpmM)
// ============================================
/**
 * Reads the selected No. LF document group from "KPM Monitor 2026"
 * and opens the printable KPM document dialog (PrintKPM.html).
 */
function printKpmM() {
  if (typeof verifyAppSignature !== 'function' || !verifyAppSignature()) {
    SpreadsheetApp.getUi().alert("Integritas sistem gagal: Modul About.gs tidak ditemukan atau telah diubah.");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var ui = SpreadsheetApp.getUi();

  if (sheet.getName().trim().toLowerCase() !== MONITOR_SHEET_NAME.trim().toLowerCase()) {
    ui.alert('Fitur ini hanya dapat digunakan pada sheet "' + MONITOR_SHEET_NAME + '".');
    return;
  }

  var lastRow = sheet.getLastRow();

  // Determine active row's No. LF (if any) and latest No. LF in sheet
  var activeRow = sheet.getActiveCell().getRow();
  var selectedNoLf = "";
  if (activeRow >= MONITOR_START_ROW) {
    selectedNoLf = sheet.getRange(activeRow, MONITOR_COL_NOLF).getValue() || "";
    selectedNoLf = selectedNoLf.toString().trim();
  }

  var latestNoLf = "";
  for (var r = lastRow; r >= MONITOR_START_ROW; r--) {
    var val = sheet.getRange(r, MONITOR_COL_NOLF).getValue();
    if (val && val.toString().trim() !== "") {
      latestNoLf = val.toString().trim();
      break;
    }
  }

  var defaultChoice = selectedNoLf || latestNoLf;
  var promptMsg = 'Masukkan No. LF yang ingin dicetak:\n' +
                    '(Kosongkan untuk mencetak No. LF terbaru' + (defaultChoice ? ': "' + defaultChoice + '"' : '') + ')';

  var response = ui.prompt('Cetak KPM dari Monitor', promptMsg, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) {
    return; // User clicked Cancel
  }

  var inputNoLf = response.getResponseText().trim();
  var targetNoLfStr = inputNoLf !== "" ? inputNoLf : defaultChoice;

  if (!targetNoLfStr) {
    ui.alert('Tidak ada No. LF yang tersedia untuk dicetak.');
    return;
  }

  var materialList = [];
  var headerInfo = {
    noRefKpp: targetNoLfStr,
    tanggal: "",
    serial: "",
    proyek: "",
    noLampiranKpm: ""
  };

  // Collect all material rows matching targetNoLfStr in 1 batch table read
  var numDataRows = lastRow - MONITOR_START_ROW + 1;
  if (numDataRows > 0) {
    var allRows = sheet.getRange(MONITOR_START_ROW, 1, numDataRows, MONITOR_TOTAL_COLS).getValues();

    for (var i = 0; i < allRows.length; i++) {
      var rowArray = allRows[i];
      var rNoLf = rowArray[MONITOR_COL_NOLF - 1];

      if (rNoLf) {
        var rNoLfStr = rNoLf.toString().trim();
        var isMatch = (rNoLfStr.toLowerCase() === targetNoLfStr.toLowerCase()) ||
                      (targetNoLfStr.length < 10 && rNoLfStr.toLowerCase().indexOf(targetNoLfStr.toLowerCase()) === 0);

        if (isMatch) {
          if (!headerInfo.noRefKpp || headerInfo.noRefKpp === inputNoLf) {
            headerInfo.noRefKpp = rNoLfStr;
          }

          var kode = rowArray[MONITOR_COL_KODE - 1];
          var spek = rowArray[MONITOR_COL_SPEK - 1];
          var qty = rowArray[MONITOR_COL_QTY - 1];
          var qtyDiserahkan = rowArray[MONITOR_COL_QTYDISERAHKAN - 1];
          var satuan = rowArray[MONITOR_COL_UOM - 1];
          var wsAwal = rowArray[MONITOR_COL_WSAWAL - 1];
          var wsTujuan = rowArray[MONITOR_COL_WSTUJUAN - 1];
          var ket = rowArray[MONITOR_COL_KET - 1];

          if (kode || spek) {
            materialList.push({
              kode: kode ? kode.toString().trim() : "",
              deskripsiSpesifikasi: spek ? spek.toString().trim() : "",
              qty: qty || 1,
              qtyDiserahkan: (qtyDiserahkan !== null && qtyDiserahkan !== undefined) ? qtyDiserahkan.toString().trim() : "",
              satuan: satuan ? satuan.toString().trim() : "",
              wsAwal: wsAwal ? wsAwal.toString().trim() : "",
              wsTujuan: wsTujuan ? wsTujuan.toString().trim() : "",
              keterangan: ket ? ket.toString().trim() : ""
            });
          }

          if (!headerInfo.tanggal) {
            var rawPostDate = rowArray[MONITOR_COL_POST_DATE - 1];
            if (rawPostDate instanceof Date) {
              headerInfo.tanggal = Utilities.formatDate(rawPostDate, Session.getScriptTimeZone(), "dd/MM/yyyy");
            } else if (rawPostDate) {
              var s = rawPostDate.toString().trim();
              if (s.indexOf(" ") !== -1 && s.indexOf("/") !== -1) {
                headerInfo.tanggal = s.split(" ")[0]; // Extract "20/08/2026"
              } else {
                headerInfo.tanggal = s;
              }
            }
            headerInfo.serial = rowArray[MONITOR_COL_SN - 1] || "";
            headerInfo.proyek = rowArray[MONITOR_COL_PROYEK - 1] || "";
          }
        }
      }
    }
  }

  if (materialList.length === 0) {
    ui.alert('Tidak ada material yang ditemukan untuk No. LF: "' + targetNoLfStr + '"');
    return;
  }

  // Generate matching No Lampiran KPM using master settings
  var settings = typeof getMasterSettings === 'function' ? getMasterSettings() : {};
  var numMatch = headerInfo.noRefKpp.match(/(\d+)/);
  var seqNum = numMatch ? numMatch[1] : "001";
  var date = new Date();
  var year = date.getFullYear();
  var romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  var monthRoman = romanMonths[date.getMonth()];

  var lampiranTpl = settings.lampiranTemplate || "{no}/KPM/{month}/{year}";
  headerInfo.noLampiranKpm = lampiranTpl
    .replace(/\{no\}/g, seqNum)
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, monthRoman);

  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var displayTanggal = headerInfo.tanggal || today;
  var totalPage = Math.max(1, Math.ceil(materialList.length / PAGE_SIZE));

  var data = {
    logo: getLogoSafe(),
    tanggalCetak: today,
    totalPage: totalPage,
    pageSize: PAGE_SIZE,
    header: {
      noRefKpp: headerInfo.noRefKpp,
      noLampiranKpm: headerInfo.noLampiranKpm,
      tanggal: displayTanggal,
      serial: headerInfo.serial,
      proyek: headerInfo.proyek
    },
    groups: [
      {
        reservasi: "",
        tanggal: displayTanggal,
        serial: headerInfo.serial,
        proyek: headerInfo.proyek,
        noLampiranKpm: headerInfo.noLampiranKpm,
        isSplit: false,
        batches: [
          {
            totalBatch: 1,
            batchNo: 1,
            material: materialList
          }
        ]
      }
    ]
  };

  openPrintView(data);
}

// Function alias for capitalization flexibility
function PrintKPM_M() {
  printKpmM();
}
