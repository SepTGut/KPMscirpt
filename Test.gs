// ============================================
// TEST / CALIBRATION SCRIPT (Test.gs)
// ============================================

var TEST_ITEM_COUNT = 20;

// Valid, real 1x1 pixel JPEG Base64 fixture
var REAL_1X1_JPEG_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

function getTestAdminToken() { return getApiTokens().adminToken; }
function getTestDriverToken() { return getApiTokens().driverToken; }

function testPrintKPMCalibration() {
  var data = generateTestData(TEST_ITEM_COUNT);
  openPrintView(data);
}

function generateTestData(itemCount) {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var satuanOptions = ["pcs", "m", "sht", "btg", "unit"];
  var wsOptions = ["WS-01", "WS-02", "WS-03", "WS-04"];

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

function testPrintKPMBlank() {
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
// CLEANUP HELPERS (TEST ISOLATION)
// ============================================

/**
 * Removes synthetic test rows created during test runs to keep production sheet clean.
 */
function cleanUpTestKpm(nomorKpm) {
  if (!nomorKpm) return;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MONITOR_SHEET_NAME);
    if (!sheet) return;

    var lastRow = sheet.getLastRow();
    if (lastRow < MONITOR_START_ROW) return;

    var numRows = lastRow - MONITOR_START_ROW + 1;
    var values = sheet.getRange(MONITOR_START_ROW, MONITOR_COL_NOLF, numRows, 1).getValues();

    for (var i = values.length - 1; i >= 0; i--) {
      if (String(values[i][0]).trim() === nomorKpm) {
        sheet.deleteRow(MONITOR_START_ROW + i);
      }
    }
  } catch(e) {
    Logger.log("Sheet cleanup notice: " + e.message);
  }
}

/**
 * Trashes synthetic test photo files created in Google Drive.
 */
function cleanUpTestDriveFile(photoUrl) {
  if (!photoUrl || typeof photoUrl !== "string") return;
  try {
    var fileIdMatch = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || photoUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      var file = DriveApp.getFileById(fileIdMatch[1]);
      file.setTrashed(true);
      Logger.log("Trashed test photo file: " + fileIdMatch[1]);
    }
  } catch(e) {
    Logger.log("Drive cleanup notice: " + e.message);
  }
}

// ============================================
// WEB.GS UNIT & INTEGRATION TESTS
// ============================================

/**
 * Tests the hitungDurasi duration calculator.
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
 * Tests API Authentication & Role-Based Authorization.
 */
function testWebAuthentication() {
  Logger.log("--- Testing API Authentication & Roles ---");

  // 1. Missing token -> UNAUTHORIZED
  var noTokenReq = { parameter: { action: "getMonitoring" } };
  var resNoToken = JSON.parse(doGet(noTokenReq).getContent());
  var isNoTokenPass = (!resNoToken.success && resNoToken.error?.code === "UNAUTHORIZED");
  Logger.log("1. Missing Token Rejection: " + (isNoTokenPass ? "PASS" : "FAIL"));

  // 2. Invalid token -> UNAUTHORIZED
  var badTokenReq = { parameter: { action: "getMonitoring", apiToken: "wrong_token" } };
  var resBadToken = JSON.parse(doGet(badTokenReq).getContent());
  var isBadTokenPass = (!resBadToken.success && resBadToken.error?.code === "UNAUTHORIZED");
  Logger.log("2. Invalid Token Rejection: " + (isBadTokenPass ? "PASS" : "FAIL"));

  // 2b. Driver must not receive monitoring data through an unknown GET action.
  var unknownActionReq = { parameter: { action: "unknownAction", apiToken: getTestDriverToken() } };
  var resUnknownAction = JSON.parse(doGet(unknownActionReq).getContent());
  var isUnknownActionRejected = (!resUnknownAction.success && resUnknownAction.error?.code === "INVALID_REQUEST");
  Logger.log("2b. Unknown GET Action Rejection: " + (isUnknownActionRejected ? "PASS" : "FAIL"));

  // 3. Driver token attempting Admin action (createKpm) -> FORBIDDEN
  var driverForbiddenReq = {
    parameter: {
      action: "createKpm",
      apiToken: getTestDriverToken(),
      daftarBarang: JSON.stringify([{ nama: "Baut", qty: "10", uom: "PCS" }]),
      namaPIC: "Aang",
      namaProyek: "Proyek LRT",
      lokasiWorkshop: "Candi Sewu ➔ Tiron"
    }
  };
  var resForbidden = JSON.parse(doPost(driverForbiddenReq).getContent());
  var isForbiddenPass = (!resForbidden.success && resForbidden.error?.code === "FORBIDDEN");
  Logger.log("3. Driver Forbidden from Admin Action: " + (isForbiddenPass ? "PASS" : "FAIL"));

  // 4. Valid Admin token -> PASS
  var adminReq = { parameter: { action: "getMasterData", apiToken: getTestAdminToken() } };
  var resAdmin = JSON.parse(doGet(adminReq).getContent());
  Logger.log("4. Valid Admin Auth: " + (resAdmin.success ? "PASS" : "FAIL"));
}

/**
 * Tests Creation Status Lockdown (forcing 'Baru Dibuat').
 */
function testWebCreationStatusLockdown() {
  Logger.log("--- Testing Creation Status Lockdown ---");

  var createReq = {
    parameter: {
      action: "createKpm",
      apiToken: getTestAdminToken(),
      daftarBarang: JSON.stringify([{ nama: "Baut M10", qty: "10", uom: "PCS" }]),
      namaPIC: "Aang",
      namaProyek: "Proyek LRT Uji Status",
      lokasiWorkshop: "Candi Sewu ➔ Tiron",
      statusKPM: "Tiba" // Malicious client attempting to bypass to Tiba
    }
  };

  var res = JSON.parse(doPost(createReq).getContent());
  var isPass = (res.success && res.data?.status === "Baru Dibuat" && res.data?.statusCode === "BARU_DIBUAT");
  Logger.log("Creation Status Forced to 'Baru Dibuat': " + (isPass ? "PASS (Status: " + res.data?.status + ")" : "FAIL"));

  if (res.data?.nomor) {
    cleanUpTestKpm(res.data.nomor);
  }
}

/**
 * Tests rejection of malformed JSON strings without legacy fallthrough.
 */
function testWebMalformedJsonRejection() {
  Logger.log("--- Testing Malformed JSON Rejection ---");

  var malformedParam = {
    parameter: {
      action: "createKpm",
      apiToken: getTestAdminToken(),
      daftarBarang: '[{ nama: "Baut M10", qty: ', // broken JSON
      namaPIC: "Aang",
      namaProyek: "Proyek Broken JSON",
      lokasiWorkshop: "Candi Sewu ➔ Tiron"
    }
  };

  var res = JSON.parse(doPost(malformedParam).getContent());
  var isPass = (!res.success && res.error?.code === "INVALID_MATERIAL");
  Logger.log("Malformed JSON Rejection: " + (isPass ? "PASS (Properly Rejected: " + res.error.message + ")" : "FAIL"));
}

/**
 * Tests rejection of unregistered / invalid workshop locations.
 */
function testWebInvalidRouteRejection() {
  Logger.log("--- Testing Invalid Workshop Route Rejection ---");

  var invalidRouteParam = {
    parameter: {
      action: "createKpm",
      apiToken: getTestAdminToken(),
      daftarBarang: JSON.stringify([{ nama: "Baut M10", qty: "5", uom: "PCS" }]),
      namaPIC: "Aang",
      namaProyek: "Proyek Invalid Route",
      lokasiWorkshop: "Gudang Khayalan ➔ Tiron" // Unregistered workshop
    }
  };

  var res = JSON.parse(doPost(invalidRouteParam).getContent());
  var isPass = (!res.success && res.error?.code === "INVALID_LOCATION");
  Logger.log("Invalid Route Rejection: " + (isPass ? "PASS (Properly Rejected: " + res.error.message + ")" : "FAIL"));
}

/**
 * Tests State Machine transitions and validations with full resource cleanup.
 */
function testWebStateMachineValidations() {
  Logger.log("--- Testing State Machine Transitions & Full Resource Isolation ---");

  var testNoLf = "";
  var uploadedPhotoUrls = [];

  try {
    // 1. Create KPM (initial status: Baru Dibuat)
    var createParam = {
      parameter: {
        action: "createKpm",
        apiToken: getTestAdminToken(),
        daftarBarang: JSON.stringify([
          { nama: 'Baut M10', qty: "50", uom: "PCS" },
          { nama: 'Plat Besi 5mm', qty: "2", uom: "SHT" }
        ]),
        namaPIC: "Aang",
        namaProyek: "Proyek LRT State Machine",
        lokasiWorkshop: "Candi Sewu ➔ Tiron"
      }
    };

    var resCreate = JSON.parse(doPost(createParam).getContent());
    testNoLf = resCreate.data?.nomor;
    Logger.log("Step 1 (Create KPM): success=" + resCreate.success + (resCreate.success ? "" : " error=" + JSON.stringify(resCreate.error)) + ", KPM=" + testNoLf + ", status=" + resCreate.data?.status);

    if (!testNoLf) {
      Logger.log("Creation failed, aborting test.");
      return;
    }

    // 2. Invalid Jump: 'Baru Dibuat' -> 'Tiba' (Must be rejected)
    var invalidJumpParam = {
      parameter: {
        action: "updateStatus",
        apiToken: getTestDriverToken(),
        nomorKPM: testNoLf,
        statusKPM: "Tiba",
        fotoData: REAL_1X1_JPEG_BASE64
      }
    };
    var resInvalid = JSON.parse(doPost(invalidJumpParam).getContent());
    var isInvalidRejected = (!resInvalid.success && resInvalid.error?.code === "INVALID_TRANSITION");
    Logger.log("Step 2 (Invalid Jump Rejection): " + (isInvalidRejected ? "PASS" : "FAIL (got: " + JSON.stringify(resInvalid) + ")"));

    // 3. Transition 'Baru Dibuat' -> 'Belum Berangkat'
    var toBelumBerangkatParam = {
      parameter: {
        action: "updateStatus",
        apiToken: getTestAdminToken(),
        nomorKPM: testNoLf,
        statusKPM: "Belum Berangkat",
        bypassPhoto: "true"
      }
    };
    var resBelum = JSON.parse(doPost(toBelumBerangkatParam).getContent());
    Logger.log("Step 3 (Baru Dibuat -> Belum Berangkat): success=" + resBelum.success + (resBelum.success ? "" : " error=" + JSON.stringify(resBelum.error)) + ", status=" + resBelum.data?.currentStatus);

    // 4. Missing Photo on Jalan / Berangkat (Must be rejected)
    var missingPhotoParam = {
      parameter: {
        action: "updateStatus",
        apiToken: getTestDriverToken(),
        nomorKPM: testNoLf,
        statusKPM: "Jalan"
      }
    };
    var resMissing = JSON.parse(doPost(missingPhotoParam).getContent());
    var isMissingRejected = (!resMissing.success && resMissing.error?.code === "PHOTO_REQUIRED");
    Logger.log("Step 4 (Missing Photo Rejection): " + (isMissingRejected ? "PASS" : "FAIL (got: " + JSON.stringify(resMissing) + ")"));

    // 5. Valid Transition: 'Belum Berangkat' -> 'Jalan' (With real 1x1 JPEG)
    var validJalanParam = {
      parameter: {
        action: "updateStatus",
        apiToken: getTestDriverToken(),
        nomorKPM: testNoLf,
        statusKPM: "Jalan",
        fotoData: REAL_1X1_JPEG_BASE64,
        namaPIC: "Aang",
        lokasiWorkshop: "Candi Sewu ➔ Tiron"
      }
    };
    var resJalan = JSON.parse(doPost(validJalanParam).getContent());
    if (resJalan.data?.photoUrl) uploadedPhotoUrls.push(resJalan.data.photoUrl);
    Logger.log("Step 5 (Valid Jalan): success=" + resJalan.success + (resJalan.success ? "" : " error=" + JSON.stringify(resJalan.error)) + ", currentStatus=" + resJalan.data?.currentStatus);

    // 6. Valid Transition: 'Jalan' -> 'Tiba' (With real 1x1 JPEG)
    var validTibaParam = {
      parameter: {
        action: "updateStatus",
        apiToken: getTestDriverToken(),
        nomorKPM: testNoLf,
        statusKPM: "Tiba",
        fotoData: REAL_1X1_JPEG_BASE64,
        namaPIC: "Aang",
        lokasiWorkshop: "Candi Sewu ➔ Tiron"
      }
    };
    var resTiba = JSON.parse(doPost(validTibaParam).getContent());
    if (resTiba.data?.photoUrl) uploadedPhotoUrls.push(resTiba.data.photoUrl);
    Logger.log("Step 6 (Valid Tiba): success=" + resTiba.success + (resTiba.success ? "" : " error=" + JSON.stringify(resTiba.error)) + ", currentStatus=" + resTiba.data?.currentStatus);

    // 7. Valid Transition: 'Tiba' -> 'Selesai' (Archive)
    var archiveParam = {
      parameter: {
        action: "archiveKpm",
        apiToken: getTestAdminToken(),
        nomorKPM: testNoLf
      }
    };
    var resArchive = JSON.parse(doPost(archiveParam).getContent());
    Logger.log("Step 7 (Archive Selesai): success=" + resArchive.success + (resArchive.success ? "" : " error=" + JSON.stringify(resArchive.error)) + ", currentStatus=" + resArchive.data?.currentStatus);

  } finally {
    // Clean up test KPM row from Sheet
    if (testNoLf) {
      cleanUpTestKpm(testNoLf);
      Logger.log("Cleaned up synthetic test KPM row: " + testNoLf);
    }
    // Clean up test photo files from Google Drive
    for (var p = 0; p < uploadedPhotoUrls.length; p++) {
      cleanUpTestDriveFile(uploadedPhotoUrls[p]);
    }
  }
}
