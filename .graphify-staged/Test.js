// ============================================
// TEST / CALIBRATION SCRIPT
// ============================================
// This file is deliberately independent of the popup form. It creates the
// same data contract consumed by PrintKPM.html, which makes page-layout tests
// repeatable and avoids creating real material requests.
// Run testPrintKPMCalibration() directly from the Apps Script editor (select
// it from the function dropdown, then click Run) to preview dummy data.
// Adjust ITEM_COUNT to test the page-break boundary.

// Number of synthetic material rows used by the non-blank calibration test.
var TEST_ITEM_COUNT = 20;

// Entry point for a filled-page layout test. The resulting object follows the
// shape normally returned by submitKpmForm() and is sent straight to the
// existing print-view function.
function testPrintKPMCalibration() {
  var data = generateTestData(TEST_ITEM_COUNT);
  openPrintView(data);
}

// Builds a full dummy "data" object matching what submitKpmForm() normally
// produces, but with generated values. Random quantities/units/workstations
// make it easier to spot clipping, wrapping, and alignment problems.
function generateTestData(itemCount) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  var satuanOptions = ["pcs", "m", "sht", "btg", "unit"];
  var wsOptions = ["WS-01", "WS-02", "WS-03", "WS-04"];

  // Generate one row per requested test item. The field names intentionally
  // match the names read by PrintKPM.html, not the form's temporary names.
  var material = [];
  for (var i = 1; i <= itemCount; i++) {
    material.push({
      kode: "TEST-" + String(i).padStart(3, "0"),
      deskripsiSpesifikasi: "Material Uji Coba " + i,
      qty: Math.floor(Math.random() * 100) + 1,
      satuan: satuanOptions[Math.floor(Math.random() * satuanOptions.length)],
      wsAwal: wsOptions[Math.floor(Math.random() * wsOptions.length)],
      wsTujuan: wsOptions[Math.floor(Math.random() * wsOptions.length)],
      keterangan: ""
    });
  }

  // PAGE_SIZE is shared with the production backend/print layout. Keeping the
  // calculation here exposes an incorrect page count during calibration.
  var totalPage = Math.max(1, Math.ceil(material.length / PAGE_SIZE));

  var data = {
    logo: getLogoSafe(),
    tanggalCetak: today,
    totalPage: totalPage,
    pageSize: PAGE_SIZE,
    header: {
      noRefKpp: "TEST-KPM-000",
      noLampiranKpm: "TEST-LAMP-000",
      tanggal: today,
      serial: "SN-TEST",
      proyek: "Proyek Kalibrasi",
      pic: "Tester",
      lot: "LOT-TEST"
    },
    groups: [
      {
        reservasi: "RES-TEST",
        tanggal: today,
        serial: "SN-TEST",
        proyek: "Proyek Kalibrasi",
        pic: "Tester",
        wbs: "WBS-TEST",
        lot: "LOT-TEST",
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

// Blank version - same structure but every field empty. This isolates page
// geometry, borders, row height, and signature placement from text wrapping.
function testPrintKPMBlank() {
  // Preserve the same number of rows as the filled test, but remove content
  // so the table can be inspected as an empty paper form.
  var material = [];
  for (var i = 1; i <= TEST_ITEM_COUNT; i++) {
    material.push({
      kode: "",
      deskripsiSpesifikasi: "",
      qty: "",
      satuan: "",
      wsAwal: "",
      wsTujuan: "",
      keterangan: ""
    });
  }

  var totalPage = Math.max(1, Math.ceil(material.length / PAGE_SIZE));

  var data = {
    logo: getLogoSafe(),
    tanggalCetak: "",
    totalPage: totalPage,
    pageSize: PAGE_SIZE,
    header: {
      noRefKpp: "",
      noLampiranKpm: "",
      tanggal: "",
      serial: "",
      proyek: "",
      pic: "",
      lot: ""
    },
    groups: [
      {
        reservasi: "",
        tanggal: "",
        serial: "",
        proyek: "",
        pic: "",
        wbs: "",
        lot: "",
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

  openPrintView(data);
}