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

// ============================================
// WEB.GS & TRACKING TELEMETRY UNIT & INTEGRATION TESTS
// ============================================

/**
 * Tests the hitungDurasi duration calculator with normal and boundary values.
 */
function testHitungDurasi() {
  Logger.log("--- Testing hitungDurasi ---");

  var test1 = hitungDurasi("20/08/2026 08:00:00", "20/08/2026 09:15:30");
  Logger.log("Test 1 (08:00:00 -> 09:15:30): Expected '01:15:30', Got: '" + test1 + "' -> " + (test1 === "01:15:30" ? "PASS" : "FAIL"));

  var test2 = hitungDurasi("20/08/2026 23:00:00", "21/08/2026 01:30:00");
  Logger.log("Test 2 (Overnight 23:00 -> 01:30): Expected '02:30:00', Got: '" + test2 + "' -> " + (test2 === "02:30:00" ? "PASS" : "FAIL"));

  var test3 = hitungDurasi("invalid", "20/08/2026 09:00:00");
  Logger.log("Test 3 (Invalid format): Expected '', Got: '" + test3 + "' -> " + (test3 === "" ? "PASS" : "FAIL"));
}

/**
 * Tests extractHyperlinkUrl with formula and raw URL values.
 */
function testExtractHyperlinkUrl() {
  Logger.log("--- Testing extractHyperlinkUrl ---");

  var formula = '=HYPERLINK("https://drive.google.com/open?id=12345", "[Link]")';
  var extracted = extractHyperlinkUrl("[Link]", formula, formula);
  Logger.log("Formula extraction: " + (extracted === "https://drive.google.com/open?id=12345" ? "PASS" : "FAIL (" + extracted + ")"));

  var raw = "https://drive.google.com/open?id=67890";
  var extractedRaw = extractHyperlinkUrl(raw, "", raw);
  Logger.log("Raw extraction: " + (extractedRaw === "https://drive.google.com/open?id=67890" ? "PASS" : "FAIL (" + extractedRaw + ")"));
}

/**
 * Tests Master Data API endpoint from Web.gs.
 */
function testWebMasterData() {
  Logger.log("--- Testing getMasterData() ---");
  var master = getMasterData();
  Logger.log("Workshops: " + JSON.stringify(master.workshops));
  Logger.log("PICs: " + JSON.stringify(master.pics));
  Logger.log("UOMs: " + JSON.stringify(master.uoms));
  Logger.log("Statuses: " + JSON.stringify(master.statuses));
  var isPass = (master.workshops && master.workshops.length > 0 && master.pics && master.pics.length > 0);
  Logger.log("Master Data Status: " + (isPass ? "PASS" : "FAIL"));
}

/**
 * Tests the doGet() endpoint response format with unified envelopes.
 */
function testDoGetEndpoint() {
  Logger.log("--- Testing doGet() Envelope Format ---");

  // 1. Default monitoring
  var outputDefault = doGet({});
  var envDefault = JSON.parse(outputDefault.getContent());
  Logger.log("doGet default: success=" + envDefault.success + ", items=" + (envDefault.data ? envDefault.data.length : 0));

  // 2. Action: getMasterData
  var outputMaster = doGet({ parameter: { action: "getMasterData" } });
  var envMaster = JSON.parse(outputMaster.getContent());
  Logger.log("doGet getMasterData: success=" + envMaster.success + ", workshops=" + (envMaster.data?.workshops ? envMaster.data.workshops.length : 0));

  // 3. Action: getDeliveries
  var outputDeliveries = doGet({ parameter: { action: "getDeliveries" } });
  var envDeliveries = JSON.parse(outputDeliveries.getContent());
  Logger.log("doGet getDeliveries: success=" + envDeliveries.success + ", deliveries=" + (envDeliveries.data ? envDeliveries.data.length : 0));
}

/**
 * Tests State Machine transitions and validations (Happy path and Invalid Jumps).
 */
function testWebStateMachineValidations() {
  Logger.log("--- Testing State Machine Transitions & Validation Rules ---");

  // Mock a tiny photo data string for valid photo upload tests
  var mockPhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";

  // 1. Create a test KPM
  var createParam = {
    parameter: {
      action: "createKpm",
      daftarBarang: "Baut M10~50~pcs|Plat Besi 5mm~2~sht",
      namaPIC: "Driver Uji Coba",
      namaProyek: "Proyek LRT Jabodebek",
      lokasiWorkshop: "WS-01 ➔ WS-04"
    }
  };

  var resCreate = JSON.parse(doPost(createParam).getContent());
  Logger.log("Step 1 (Create KPM): success=" + resCreate.success + ", KPM=" + JSON.stringify(resCreate.data));
  var generatedNoLf = resCreate.data?.nomor;
  if (!generatedNoLf) {
    Logger.log("Create failed, stopping state machine test.");
    return;
  }

  // 2. Test Invalid Jump: 'Baru Dibuat' -> 'Tiba' (Must be rejected with INVALID_TRANSITION)
  var invalidJumpParam = {
    parameter: {
      action: "updateStatus",
      nomorKPM: generatedNoLf,
      statusKPM: "Tiba",
      fotoData: mockPhoto
    }
  };
  var resInvalidJump = JSON.parse(doPost(invalidJumpParam).getContent());
  var isInvalidRejected = (!resInvalidJump.success && resInvalidJump.error?.code === "INVALID_TRANSITION");
  Logger.log("Step 2 (Invalid Jump 'Baru Dibuat' -> 'Tiba'): " + (isInvalidRejected ? "PASS (Properly Rejected: " + resInvalidJump.error.message + ")" : "FAIL"));

  // 3. Test Missing Photo on Berangkat (Must be rejected with PHOTO_REQUIRED)
  var missingPhotoParam = {
    parameter: {
      action: "updateStatus",
      nomorKPM: generatedNoLf,
      statusKPM: "Berangkat"
    }
  };
  var resMissingPhoto = JSON.parse(doPost(missingPhotoParam).getContent());
  var isMissingPhotoRejected = (!resMissingPhoto.success && resMissingPhoto.error?.code === "PHOTO_REQUIRED");
  Logger.log("Step 3 (Missing Photo on Berangkat): " + (isMissingPhotoRejected ? "PASS (Properly Rejected: " + resMissingPhoto.error.message + ")" : "FAIL"));

  // 4. Test Valid Transition: 'Baru Dibuat' -> 'Berangkat' (With photo)
  var validBerangkatParam = {
    parameter: {
      action: "updateStatus",
      nomorKPM: generatedNoLf,
      statusKPM: "Berangkat",
      fotoData: mockPhoto,
      namaPIC: "Driver Uji Coba",
      lokasiWorkshop: "WS-01 ➔ WS-04"
    }
  };
  var resBerangkat = JSON.parse(doPost(validBerangkatParam).getContent());
  Logger.log("Step 4 (Valid Berangkat): success=" + resBerangkat.success + ", status=" + resBerangkat.data?.currentStatus);

  // 5. Test Valid Transition: 'Berangkat' -> 'Tiba' (With photo)
  var validTibaParam = {
    parameter: {
      action: "updateStatus",
      nomorKPM: generatedNoLf,
      statusKPM: "Tiba",
      fotoData: mockPhoto,
      namaPIC: "Driver Uji Coba",
      lokasiWorkshop: "WS-01 ➔ WS-04"
    }
  };
  var resTiba = JSON.parse(doPost(validTibaParam).getContent());
  Logger.log("Step 5 (Valid Tiba): success=" + resTiba.success + ", status=" + resTiba.data?.currentStatus);

  // 6. Test Valid Transition: 'Tiba' -> 'Selesai' (Archive)
  var archiveParam = {
    parameter: {
      action: "archiveKpm",
      nomorKPM: generatedNoLf
    }
  };
  var resArchive = JSON.parse(doPost(archiveParam).getContent());
  Logger.log("Step 6 (Archive Selesai): success=" + resArchive.success + ", status=" + resArchive.data?.currentStatus);

  // 7. Test Invalid Transition after Selesai (Must be rejected)
  var afterArchiveParam = {
    parameter: {
      action: "updateStatus",
      nomorKPM: generatedNoLf,
      statusKPM: "Berangkat",
      fotoData: mockPhoto
    }
  };
  var resAfterArchive = JSON.parse(doPost(afterArchiveParam).getContent());
  var isAfterArchiveRejected = (!resAfterArchive.success && resAfterArchive.error?.code === "INVALID_TRANSITION");
  Logger.log("Step 7 (Invalid Jump after Selesai): " + (isAfterArchiveRejected ? "PASS (Properly Rejected)" : "FAIL"));
}