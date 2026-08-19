// ============================================
// KPM MONITOR 2026 AUTOMATION (KPMn.gs)
// ============================================

// KPM Monitor Sheet Config
var MONITOR_SHEET_NAME = "KPM Monitor 2026";
var MONITOR_HEADER_ROW = 8; // header labels are on row 8
var MONITOR_START_ROW = 10; // data starts at row 10
var MONITOR_COL_NO = 1;        // Column A: NO (Oto)
var MONITOR_COL_POST_DATE = 2; // Column B: Post Date (Otomatis)
var MONITOR_COL_KODE = 5;      // Column E: Kode Material
var MONITOR_COL_SPEK = 6;      // Column F: Spesifikasi (Semi-Otomatis)
var MONITOR_COL_UOM = 12;      // Column L: UoM/stn (Optional Auto-fill)

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
  var kodeCell = sheet.getRange(row, MONITOR_COL_KODE);
  var spekCell = sheet.getRange(row, MONITOR_COL_SPEK);
  var uomCell = sheet.getRange(row, MONITOR_COL_UOM);

  var autoNoValue = row - MONITOR_START_ROW + 1; // Row 10 = 1, Row 11 = 2, etc.

  // Case 1: Editing "Kode Material" (Column 5 / Col E)
  if (col === MONITOR_COL_KODE) {
    var val = e.value;

    // If Kode Material is cleared/deleted, clear Spesifikasi and UoM
    if (!val || val.toString().trim() === "") {
      spekCell.clearContent();
      uomCell.clearContent();
      // If Spesifikasi is also empty, clear NO and Post Date
      if (!spekCell.getValue() || spekCell.getValue().toString().trim() === "") {
        noCell.clearContent();
        postDateCell.clearContent();
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

    // Auto-fill NO (1, 2, 3...)
    if (!noCell.getValue() || noCell.getValue().toString().trim() === "") {
      noCell.setValue(autoNoValue);
    }

    // Auto-fill Post Date (HH:mm - dd/MM/yyyy)
    if (!postDateCell.getValue() || postDateCell.getValue().toString().trim() === "") {
      var timeStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm - dd/MM/yyyy");
      postDateCell.setValue(timeStamp);
    }
  }

  // Case 2: Editing "Spesifikasi" (Column 6 / Col F) directly
  if (col === MONITOR_COL_SPEK) {
    var spekVal = e.value;
    var kodeVal = kodeCell.getValue();

    if (spekVal && spekVal.toString().trim() !== "") {
      // Auto-fill NO (1, 2, 3...)
      if (!noCell.getValue() || noCell.getValue().toString().trim() === "") {
        noCell.setValue(autoNoValue);
      }

      // Auto-fill Post Date (HH:mm - dd/MM/yyyy)
      if (!postDateCell.getValue() || postDateCell.getValue().toString().trim() === "") {
        var timeStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm - dd/MM/yyyy");
        postDateCell.setValue(timeStamp);
      }
    } else {
      // If Spesifikasi is cleared and Kode Material is also empty, clear NO and Post Date
      if (!kodeVal || kodeVal.toString().trim() === "") {
        noCell.clearContent();
        postDateCell.clearContent();
      }
    }
  }
}
