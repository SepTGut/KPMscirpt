// ============================================
// STORAGE & DRIVE SERVICE (Storage.gs)
// ============================================

var _cachedDriveFolder = null;

/**
 * Returns or creates the target Google Drive folder for proof photos with caching.
 */
function getTargetDriveFolder() {
  if (_cachedDriveFolder) return _cachedDriveFolder;
  var cache = CacheService.getScriptCache();
  var folderId = cache.get("TARGET_DRIVE_FOLDER_ID");
  if (folderId) {
    try {
      _cachedDriveFolder = DriveApp.getFolderById(folderId);
      return _cachedDriveFolder;
    } catch (e) { }
  }
  var folders = DriveApp.getFoldersByName(WEB_CONFIG.DRIVE_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(WEB_CONFIG.DRIVE_FOLDER_NAME);
  _cachedDriveFolder = folder;
  try {
    cache.put("TARGET_DRIVE_FOLDER_ID", folder.getId(), 21600); // 6 hours
  } catch (e) { }
  return folder;
}

/**
 * Handles Base64 image upload to Google Drive with strict MIME & size validation.
 */
function uploadProofPhoto(fotoData, nomorKPM, statusKPM) {
  if (!fotoData || typeof fotoData !== "string") {
    throw { code: "INVALID_IMAGE", message: "Data foto tidak valid atau kosong." };
  }
  if (fotoData.indexOf(",") === -1 || fotoData.indexOf("data:") !== 0) {
    throw { code: "INVALID_IMAGE", message: "Format Base64 data foto tidak valid." };
  }
  if (fotoData.length > WEB_CONFIG.MAX_PHOTO_BASE64_BYTES) {
    throw { code: "INVALID_IMAGE", message: "Ukuran file foto melebihi batas maksimum (~5MB)." };
  }

  var parts = fotoData.split(',');
  var header = parts[0];
  var base64 = parts[1];

  var mimeMatch = header.match(/data:([^;]+);base64/);
  var mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : "";

  if (WEB_CONFIG.ALLOWED_IMAGE_MIMES.indexOf(mimeType) === -1) {
    throw { code: "INVALID_IMAGE", message: "Tipe file '" + mimeType + "' tidak didukung. Harap gunakan format JPEG, PNG, atau WebP." };
  }

  try {
    var folder = getTargetDriveFolder();
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (folderShareErr) { }

    var safeNomor = (nomorKPM || "KPM").replace(/[\/\\:?*"<>|]/g, "_");
    var timestamp = Utilities.formatDate(new Date(), getCachedScriptTimeZone(), "ddMMyy_HHmmss");
    var extension = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
    var namaFile = safeNomor + "_" + (statusKPM || "Foto") + "_" + timestamp + extension;

    var cleanBase64 = base64.replace(/\s/g, '+');
    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decodedBytes, mimeType, namaFile);

    // Remove older duplicate photo files in Drive for this exact KPM & Status
    try {
      var existingFiles = folder.getFiles();
      var targetPrefix = safeNomor + "_" + (statusKPM || "Foto");
      while (existingFiles.hasNext()) {
        var existingFile = existingFiles.next();
        if (existingFile.getName().indexOf(targetPrefix) === 0) {
          existingFile.setTrashed(true);
        }
      }
    } catch (dedupErr) {
      Logger.log("dedup prior photo notice: " + dedupErr.message);
    }

    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (fileShareErr) { }

    return file.getUrl();
  } catch (err) {
    Logger.log("uploadProofPhoto error: " + err.message);
    throw { code: "PHOTO_UPLOAD_FAILED", message: "Gagal menyimpan foto ke Google Drive: " + err.message };
  }
}
