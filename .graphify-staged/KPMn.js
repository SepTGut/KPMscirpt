// ============================================
// KPM MONITOR 2026 AUTOMATION (KPMn.gs)
// ============================================

// KPM Monitor Sheet Config
var MONITOR_SHEET_NAME = "KPM Monitor 2026";
var MONITOR_HEADER_ROW = 8;    // header labels are on row 8
var MONITOR_START_ROW = 10;    // data starts at row 10

// Column mapping (1-indexed, A to Q):
var MONITOR_COL_NO = 1;        // Column A: NO (Oto)
var MONITOR_COL_POST_DATE = 2; // Column B: Post Date (Otomatis)
var MONITOR_COL_NOLF = 3;      // Column C: No LF (Counting Manual/Auto)
var MONITOR_COL_ITEM = 4;      // Column D: Item (1, 2, 3...)
var MONITOR_COL_KODE = 5;      // Column E: Kode Material
var MONITOR_COL_SPEK = 6;      // Column F: Spesifikasi (Semi-Otomatis)
var MONITOR_COL_WBS = 7;       // Column G: WBS
var MONITOR_COL_PROYEK = 8;    // Column H: Proyek
var MONITOR_COL_TYPECAR = 9;   // Column I: Type Car
var MONITOR_COL_BATCH = 10;    // Column J: TS/Batch/Set
var MONITOR_COL_QTY = 11;      // Column K: Qty
var MONITOR_COL_UOM = 12;      // Column L: UoM/stn (Optional Auto-fill)
var MONITOR_COL_SN = 13;       // Column M: SN
var MONITOR_COL_PIC = 14;      // Column N: PIC KPM
var MONITOR_COL_WSAWAL = 15;   // Column O: Dari/ws awal
var MONITOR_COL_WSTUJUAN = 16; // Column P: Tujuan/ws tujuan
var MONITOR_COL_KET = 17;      // Column Q: Keterangan

// ============================================
// HELPER FUNCTIONS FOR NO LF, ITEM & GROUP DATA
// ============================================

/**
 * Searches upwards from currentRow - 1 to find the most recent active row.
 */
function getPreviousActiveRow(sheet, currentRow) {
  for (var r = currentRow - 1; r >= MONITOR_START_ROW; r--) {
    var itemVal = sheet.getRange(r, MONITOR_COL_ITEM).getValue();
    var nolfVal = sheet.getRange(r, MONITOR_COL_NOLF).getValue();
    var kodeVal = sheet.getRange(r, MONITOR_COL_KODE).getValue();
    var spekVal = sheet.getRange(r, MONITOR_COL_SPEK).getValue();

    if (itemVal || nolfVal || kodeVal || spekVal) {
      return {
        row: r,
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
 * Example: "102/ppo/lf/VIII/2026" -> "103/ppo/lf/VIII/2026"
 */
function incrementNoLf(noLfStr) {
  if (!noLfStr) return getDefaultNoLf(100);

  var match = noLfStr.match(/^(.*?)(\d+)(.*)$/);
  if (match) {
    var prefix = match[1];
    var numStr = match[2];
    var suffix = match[3];
    var nextNum = parseInt(numStr, 10) + 1;
    var paddedNum = String(nextNum).padStart(numStr.length, '0');
    return prefix + paddedNum + suffix;
  }
  return noLfStr;
}

/**
 * Formats a default No LF string based on Master Settings or default template.
 */
function getDefaultNoLf(startSeq) {
  var settings = typeof getMasterSettings === 'function' ? getMasterSettings() : {};
  var date = new Date();
  var year = date.getFullYear();
  var monthIndex = date.getMonth();
  var romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  var monthRoman = romanMonths[monthIndex];
  var monthNum = String(monthIndex + 1).padStart(2, '0');

  var seq = startSeq || 100;
  var formattedNo = String(seq);

  var tpl = settings.template || settings.lampiranTemplate || "{no}/PPO/LF/{month}/{year}";
  return tpl
    .replace(/\{no\}/g, formattedNo)
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, monthRoman)
    .replace(/\{monthNum\}/g, monthNum);
}

/**
 * Auto-copies group header fields (WS Awal, WS Tujuan, Proyek, WBS, PIC)
 * from previous row in the same No LF group into a continuation row.
 */
function ensureGroupMetadata(sheet, row) {
  var itemVal = parseInt(sheet.getRange(row, MONITOR_COL_ITEM).getValue(), 10);
  var currentNoLf = sheet.getRange(row, MONITOR_COL_NOLF).getValue();

  if (itemVal > 1 && currentNoLf) {
    var prev = getPreviousActiveRow(sheet, row);
    if (prev && prev.noLf === currentNoLf.toString().trim()) {
      var prevRow = prev.row;
      var groupCols = [
        MONITOR_COL_WSAWAL,   // Col O: 15
        MONITOR_COL_WSTUJUAN, // Col P: 16
        MONITOR_COL_PROYEK,   // Col H: 8
        MONITOR_COL_WBS,      // Col G: 7
        MONITOR_COL_PIC,      // Col N: 14
        MONITOR_COL_TYPECAR   // Col I: 9
      ];

      for (var i = 0; i < groupCols.length; i++) {
        var c = groupCols[i];
        var currentCell = sheet.getRange(row, c);
        var prevVal = sheet.getRange(prevRow, c).getValue();
        if (prevVal && (!currentCell.getValue() || currentCell.getValue().toString().trim() === "")) {
          currentCell.setValue(prevVal);
        }
      }
    }
  }
}

/**
 * Syncs updated group header fields (WS Awal, WS Tujuan, etc.)
 * downstream to all rows sharing the same No LF group.
 */
function syncDownstreamGroupMetadata(sheet, row, col, newValue) {
  var currentNoLf = sheet.getRange(row, MONITOR_COL_NOLF).getValue();
  if (!currentNoLf) return;

  var noLfStr = currentNoLf.toString().trim();
  var maxRow = sheet.getLastRow();

  for (var r = row + 1; r <= maxRow; r++) {
    var rNoLf = sheet.getRange(r, MONITOR_COL_NOLF).getValue();
    if (rNoLf && rNoLf.toString().trim() === noLfStr) {
      sheet.getRange(r, col).setValue(newValue);
    } else if (rNoLf) {
      break;
    }
  }
}

// ============================================
// ON EDIT TRIGGER (KPM Monitor 2026 Sheet)
// ============================================
function onEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  // Check if edit is on KPM Monitor 2026 sheet (case-insensitive and trimmed)
  if (sheet.getName().trim().toLowerCase() !== MONITOR_SHEET_NAME.trim().toLowerCase()) return;

  var row = e.range.getRow();
  var col = e.range.getColumn();

  // Ensure edit is within data rows (row >= MONITOR_START_ROW)
  if (row < MONITOR_START_ROW) return;

  var noCell = sheet.getRange(row, MONITOR_COL_NO);
  var postDateCell = sheet.getRange(row, MONITOR_COL_POST_DATE);
  var nolfCell = sheet.getRange(row, MONITOR_COL_NOLF);
  var itemCell = sheet.getRange(row, MONITOR_COL_ITEM);
  var kodeCell = sheet.getRange(row, MONITOR_COL_KODE);
  var spekCell = sheet.getRange(row, MONITOR_COL_SPEK);
  var uomCell = sheet.getRange(row, MONITOR_COL_UOM);
  var wsAwalCell = sheet.getRange(row, MONITOR_COL_WSAWAL);
  var wsTujuanCell = sheet.getRange(row, MONITOR_COL_WSTUJUAN);
  var picCell = sheet.getRange(row, MONITOR_COL_PIC);
  var proyekCell = sheet.getRange(row, MONITOR_COL_PROYEK);
  var wbsCell = sheet.getRange(row, MONITOR_COL_WBS);
  var typeCarCell = sheet.getRange(row, MONITOR_COL_TYPECAR);

  var autoNoValue = row - MONITOR_START_ROW + 1; // Row 10 = 1, Row 11 = 2, etc.

  // -------------------------------------------------------------
  // Case A: Editing "Item" (Column 4 / Col D)
  // -------------------------------------------------------------
  if (col === MONITOR_COL_ITEM) {
    var itemVal = parseInt(e.value, 10);
    if (!isNaN(itemVal)) {
      if (itemVal === 1) {
        // New group! Increment No LF from previous active row
        var prev = getPreviousActiveRow(sheet, row);
        if (prev && prev.noLf) {
          nolfCell.setValue(incrementNoLf(prev.noLf));
        } else if (!nolfCell.getValue()) {
          nolfCell.setValue(getDefaultNoLf(100));
        }
      } else if (itemVal > 1) {
        // Continuation item! Copy No LF from previous active row
        var prev = getPreviousActiveRow(sheet, row);
        if (prev && prev.noLf) {
          nolfCell.setValue(prev.noLf);
        }
      }
      ensureGroupMetadata(sheet, row);
    }
  }

  // -------------------------------------------------------------
  // Case B: Editing "No LF" (Column 3 / Col C) directly
  // -------------------------------------------------------------
  if (col === MONITOR_COL_NOLF) {
    var customNoLf = e.value;
    if (customNoLf && customNoLf.toString().trim() !== "") {
      if (!itemCell.getValue()) {
        itemCell.setValue(1);
      }
    }
  }

  // -------------------------------------------------------------
  // Case C: Editing Group Metadata fields (WS Awal, WS Tujuan, Proyek, WBS, PIC)
  // -------------------------------------------------------------
  if (col === MONITOR_COL_WSAWAL || col === MONITOR_COL_WSTUJUAN ||
      col === MONITOR_COL_PROYEK || col === MONITOR_COL_WBS ||
      col === MONITOR_COL_PIC || col === MONITOR_COL_TYPECAR) {
    syncDownstreamGroupMetadata(sheet, row, col, e.value || "");
  }

  // -------------------------------------------------------------
  // Case D: Editing "Kode Material" (Column 5 / Col E)
  // -------------------------------------------------------------
  if (col === MONITOR_COL_KODE) {
    var val = e.value;

    // If Kode Material is cleared/deleted
    if (!val || val.toString().trim() === "") {
      spekCell.clearContent();
      uomCell.clearContent();
      // If Spesifikasi is also empty, clear all row metadata
      if (!spekCell.getValue() || spekCell.getValue().toString().trim() === "") {
        noCell.clearContent();
        postDateCell.clearContent();
        itemCell.clearContent();
        nolfCell.clearContent();
        wsAwalCell.clearContent();
        wsTujuanCell.clearContent();
        picCell.clearContent();
        proyekCell.clearContent();
        wbsCell.clearContent();
        typeCarCell.clearContent();
      }
      return;
    }

    var mat = getMaterialByKode(val);
    if (mat) {
      spekCell.setValue(mat.nama);
      if (mat.satuan) {
        uomCell.setValue(mat.satuan);
      }
    }

    // Process Item & No LF assignment & Group Metadata inheritance
    ensureItemAndNoLf(sheet, row, itemCell, nolfCell);
    ensureGroupMetadata(sheet, row);

    // Auto-fill NO (1, 2, 3...)
    if (!noCell.getValue()) {
      noCell.setValue(autoNoValue)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");
    }

    // Auto-fill Post Date (HH:mm - dd/MM/yyyy)
    if (!postDateCell.getValue()) {
      var timeStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm - dd/MM/yyyy");
      postDateCell.setValue(timeStamp);
    }
  }

  // -------------------------------------------------------------
  // Case E: Editing "Spesifikasi" (Column 6 / Col F) directly
  // -------------------------------------------------------------
  if (col === MONITOR_COL_SPEK) {
    var spekVal = e.value;
    var kodeVal = kodeCell.getValue();

    if (spekVal && spekVal.toString().trim() !== "") {
      // Process Item & No LF assignment & Group Metadata inheritance
      ensureItemAndNoLf(sheet, row, itemCell, nolfCell);
      ensureGroupMetadata(sheet, row);

      // Auto-fill NO (1, 2, 3...)
      if (!noCell.getValue()) {
        noCell.setValue(autoNoValue)
              .setHorizontalAlignment("center")
              .setVerticalAlignment("middle");
      }

      // Auto-fill Post Date (HH:mm - dd/MM/yyyy)
      if (!postDateCell.getValue()) {
        var timeStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm - dd/MM/yyyy");
        postDateCell.setValue(timeStamp);
      }
    } else {
      // If Spesifikasi is cleared and Kode Material is also empty, clear row metadata
      if (!kodeVal || kodeVal.toString().trim() === "") {
        noCell.clearContent();
        postDateCell.clearContent();
        itemCell.clearContent();
        nolfCell.clearContent();
        uomCell.clearContent();
        wsAwalCell.clearContent();
        wsTujuanCell.clearContent();
        picCell.clearContent();
        proyekCell.clearContent();
        wbsCell.clearContent();
        typeCarCell.clearContent();
      }
    }
  }
}

/**
 * Ensures Item and No LF are populated when a user enters material or spec.
 */
function ensureItemAndNoLf(sheet, row, itemCell, nolfCell) {
  var currentItem = parseInt(itemCell.getValue(), 10);
  var currentNoLf = nolfCell.getValue();

  if (!currentItem) {
    var prev = getPreviousActiveRow(sheet, row);
    if (prev) {
      itemCell.setValue(prev.item + 1);
      if (!currentNoLf) {
        nolfCell.setValue(prev.noLf);
      }
    } else {
      itemCell.setValue(1);
      if (!currentNoLf) {
        nolfCell.setValue(getDefaultNoLf(100));
      }
    }
  } else if (currentItem === 1 && !currentNoLf) {
    var prev = getPreviousActiveRow(sheet, row);
    if (prev && prev.noLf) {
      nolfCell.setValue(incrementNoLf(prev.noLf));
    } else {
      nolfCell.setValue(getDefaultNoLf(100));
    }
  }
}

// ============================================
// PRINT KPM FROM MONITOR SHEET (printKpmM)
// ============================================
/**
 * Reads the selected No. LF document group from "KPM Monitor 2026"
 * and opens the printable KPM document dialog (PrintKPM.html).
 */
function printKpmM() {
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

  // Collect all material rows matching targetNoLfStr (exact or sequence match)
  for (var r = MONITOR_START_ROW; r <= lastRow; r++) {
    var rNoLf = sheet.getRange(r, MONITOR_COL_NOLF).getValue();
    if (rNoLf) {
      var rNoLfStr = rNoLf.toString().trim();
      var isMatch = (rNoLfStr.toLowerCase() === targetNoLfStr.toLowerCase()) ||
                    (targetNoLfStr.length < 10 && rNoLfStr.toLowerCase().indexOf(targetNoLfStr.toLowerCase()) === 0);

      if (isMatch) {
        if (!headerInfo.noRefKpp || headerInfo.noRefKpp === inputNoLf) {
          headerInfo.noRefKpp = rNoLfStr;
        }

        var kode = sheet.getRange(r, MONITOR_COL_KODE).getValue();
        var spek = sheet.getRange(r, MONITOR_COL_SPEK).getValue();
        var qty = sheet.getRange(r, MONITOR_COL_QTY).getValue();
        var satuan = sheet.getRange(r, MONITOR_COL_UOM).getValue();
        var wsAwal = sheet.getRange(r, MONITOR_COL_WSAWAL).getValue();
        var wsTujuan = sheet.getRange(r, MONITOR_COL_WSTUJUAN).getValue();
        var ket = sheet.getRange(r, MONITOR_COL_KET).getValue();

        if (kode || spek) {
          materialList.push({
            kode: kode ? kode.toString().trim() : "",
            deskripsiSpesifikasi: spek ? spek.toString().trim() : "",
            qty: qty || 1,
            satuan: satuan ? satuan.toString().trim() : "",
            wsAwal: wsAwal ? wsAwal.toString().trim() : "",
            wsTujuan: wsTujuan ? wsTujuan.toString().trim() : "",
            keterangan: ket ? ket.toString().trim() : ""
          });
        }

        // Capture header fields from the first matching row
        if (!headerInfo.tanggal) {
          headerInfo.tanggal = sheet.getRange(r, MONITOR_COL_POST_DATE).getValue() || "";
          headerInfo.serial = sheet.getRange(r, MONITOR_COL_SN).getValue() || "";
          headerInfo.proyek = sheet.getRange(r, MONITOR_COL_PROYEK).getValue() || "";
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
  var totalPage = Math.max(1, Math.ceil(materialList.length / PAGE_SIZE));

  var data = {
    logo: getLogoSafe(),
    tanggalCetak: today,
    totalPage: totalPage,
    pageSize: PAGE_SIZE,
    header: {
      noRefKpp: headerInfo.noRefKpp,
      noLampiranKpm: headerInfo.noLampiranKpm,
      tanggal: headerInfo.tanggal || today,
      serial: headerInfo.serial,
      proyek: headerInfo.proyek
    },
    groups: [
      {
        reservasi: "",
        tanggal: headerInfo.tanggal || today,
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
