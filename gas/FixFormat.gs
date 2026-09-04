// ============================================
// FORMAT STANDARDIZATION & REPAIR UTILITY (FixFormat.gs)
// ============================================
// Manual execution tool to repair:
// 1. Over-padded No LF (e.g. 0001 -> 001, 0011 -> 011)
// 2. Horizontal & Vertical Text Alignment across all columns
// 3. Font, wrapping, and borders
// ============================================

/**
 * Main manual entrypoint: Normalizes and formats the entire KPM Monitor 2026 sheet.
 * Can be run from Google Apps Script Editor or from the Google Sheets custom menu.
 */
function fixFormat() {
  var ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ui = null;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
  if (!sheet) {
    var msg = "Sheet '" + MONITOR_SHEET_NAME + "' tidak ditemukan.";
    if (ui) ui.alert("Error", msg, ui.ButtonSet.OK);
    Logger.log(msg);
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < MONITOR_START_ROW) {
    var emptyMsg = "Tidak ada baris data untuk diperbaiki (data kosong).";
    if (ui) ss.toast(emptyMsg, "Fix Format", 3);
    Logger.log(emptyMsg);
    return;
  }

  var numRows = lastRow - MONITOR_START_ROW + 1;
  var totalCols = MONITOR_TOTAL_COLS; // 26 columns (A to Z)

  if (ui) {
    var response = ui.alert(
      "Konfirmasi Perbaikan Format",
      "Apakah Anda ingin menstandardisasi format " + numRows + " baris data di sheet '" + MONITOR_SHEET_NAME + "'?\n\n" +
      "Tindakan ini akan:\n" +
      "1. Memperbaiki nomor KPM yang kelebihan digit (misal: 0001 -> 001, 0011 -> 011)\n" +
      "2. Meratakan teks (Center, Left, Middle)\n" +
      "3. Merapikan garis border dan font",
      ui.ButtonSet.YES_NO
    );
    if (response !== ui.Button.YES) return;
  }

  if (ui) ss.toast("Sedang menstandardisasi format data...", "Fix Format", 5);

  var fullRange = sheet.getRange(MONITOR_START_ROW, 1, numRows, totalCols);
  var values = fullRange.getValues();
  var formulas = fullRange.getFormulas();

  var fixedNoLfCount = 0;
  var rowNo = 1;
  var activeGroupNoLf = "";

  // Batch process data values in RAM (Zero loop cell writes)
  for (var r = 0; r < values.length; r++) {
    var currentRow = values[r];

    // 1. Standardize No Auto (Column A)
    currentRow[MONITOR_COL_NO - 1] = rowNo++;

    // 2. Fix No LF formatting (Column C) -> Ensure strict 3-digit zero padding and group consistency
    var rawNoLf = String(currentRow[MONITOR_COL_NOLF - 1] || "").trim();
    var itemRaw = currentRow[MONITOR_COL_ITEM - 1];
    var numMatch = itemRaw ? String(itemRaw).match(/\d+/) : null;
    var itemVal = numMatch ? parseInt(numMatch[0], 10) : 0;
    var hasData = (currentRow[MONITOR_COL_KODE - 1] && String(currentRow[MONITOR_COL_KODE - 1]).trim() !== "") ||
                  (currentRow[MONITOR_COL_SPEK - 1] && String(currentRow[MONITOR_COL_SPEK - 1]).trim() !== "") ||
                  itemVal > 0;

    if (rawNoLf) {
      var fixedNoLf = normalizeNoLfTo3Digits(rawNoLf);
      if (fixedNoLf !== rawNoLf) {
        currentRow[MONITOR_COL_NOLF - 1] = fixedNoLf;
        fixedNoLfCount++;
      }
      rawNoLf = fixedNoLf;
    }

    if (itemVal === 1 && rawNoLf) {
      activeGroupNoLf = rawNoLf;
    } else if (itemVal > 1 && activeGroupNoLf && hasData) {
      // If Item does not start from 1, it will NOT continue to the next No LF iteration!
      // Must stay on the active group's No LF.
      if (currentRow[MONITOR_COL_NOLF - 1] !== activeGroupNoLf) {
        currentRow[MONITOR_COL_NOLF - 1] = activeGroupNoLf;
        fixedNoLfCount++;
      }
    } else if (!hasData) {
      activeGroupNoLf = "";
    }

    // Preserve any existing formulas in the row
    for (var c = 0; c < totalCols; c++) {
      if (formulas[r][c]) {
        currentRow[c] = formulas[r][c];
      }
    }
  }

  // 1-Shot Batch Write Data Values
  fullRange.setValues(values);

  // 1-Shot Batch Apply Alignments, Fonts, and Borders across entire data range
  // Default: Vertical Middle
  fullRange.setVerticalAlignment("middle");
  fullRange.setFontFamily("Roboto");
  fullRange.setFontSize(10);

  // Apply Horizontal Alignments by Column:
  // Center Columns: A(1), B(2), C(3), D(4), E(5), I(9), J(10), K(11), L(12), M(13), N(14), O(15), Q(17), R(18), S(19), T(20), U(21), V(22), W(23), X(24), Y(25), Z(26)
  var centerCols = [
    MONITOR_COL_NO,
    MONITOR_COL_POST_DATE,
    MONITOR_COL_NOLF,
    MONITOR_COL_ITEM,
    MONITOR_COL_KODE,
    MONITOR_COL_TYPECAR,
    MONITOR_COL_BATCH,
    MONITOR_COL_QTY,
    MONITOR_COL_QTYDISERAHKAN,
    MONITOR_COL_UOM,
    MONITOR_COL_SN,
    MONITOR_COL_PIC,
    MONITOR_COL_WSAWAL,
    MONITOR_COL_WSTUJUAN,
    MONITOR_COL_DRIVER,
    MONITOR_COL_WKT_BERANGKAT,
    MONITOR_COL_WKT_TIBA,
    MONITOR_COL_DURASI,
    MONITOR_COL_STATUS,
    MONITOR_COL_FOTO_BER,
    MONITOR_COL_FOTO_TIB,
    MONITOR_COL_GPS_TRACK
  ];

  for (var i = 0; i < centerCols.length; i++) {
    sheet.getRange(MONITOR_START_ROW, centerCols[i], numRows, 1).setHorizontalAlignment("center");
  }

  // Left-Aligned Columns: Spesifikasi (F / Col 6), WBS (G / Col 7), Proyek (H / Col 8), Keterangan (P / Col 16)
  var leftCols = [
    MONITOR_COL_SPEK,
    MONITOR_COL_WBS,
    MONITOR_COL_PROYEK,
    MONITOR_COL_KET
  ];

  for (var j = 0; j < leftCols.length; j++) {
    var leftRange = sheet.getRange(MONITOR_START_ROW, leftCols[j], numRows, 1);
    leftRange.setHorizontalAlignment("left");
    if (leftCols[j] === MONITOR_COL_SPEK) {
      leftRange.setWrap(true);
    }
  }

  // Apply clean standard grid borders across data block
  fullRange.setBorder(true, true, true, true, true, true, "#D1D5DB", SpreadsheetApp.BorderStyle.SOLID);

  SpreadsheetApp.flush();

  // Invalidate memory cache so web app reads corrected format
  if (typeof invalidateMonitoringCache === "function") {
    invalidateMonitoringCache();
  }

  var summaryMsg = "✓ Selesai! Berhasil merapikan format " + numRows + " baris data.\n" +
    "- No LF diperbaiki ke format 3-digit: " + fixedNoLfCount + " nomor.\n" +
    "- Alignment Center/Left & Vertical Middle telah distandardisasi.";

  Logger.log(summaryMsg);
  if (ui) {
    ui.alert("Format Berhasil Diperbaiki", summaryMsg, ui.ButtonSet.OK);
  }
}

/**
 * Normalizes over-padded numbers in No LF to strict 3 digits.
 * Examples:
 *   "0001/PPO/LF/IX/2026" -> "001/PPO/LF/IX/2026"
 *   "0011/PPO/LF/IX/2026" -> "011/PPO/LF/IX/2026"
 *   "0010/PPO/LF/IX/2026" -> "010/PPO/LF/IX/2026"
 *   "1/PPO/LF/IX/2026"    -> "001/PPO/LF/IX/2026"
 */
function normalizeNoLfTo3Digits(noLfStr) {
  if (!noLfStr) return "";
  var str = String(noLfStr).trim();

  // Matches leading numeric sequence before first slash
  var match = str.match(/^(\d+)(\/.*)$/);
  if (match) {
    var rawNum = parseInt(match[1], 10);
    if (!isNaN(rawNum)) {
      if (rawNum === 0) rawNum = 1;
      var padded3 = String(rawNum).padStart(3, '0');
      return padded3 + match[2];
    }
  }

  return str;
}
