# Changelog & History of Changes 📜

Dokumentasi historis lengkap mengenai evolusi arsitektur, refaktorisasi kode, peningkatan keamanan, perbaikan bug, dan optimasi performa sistem **KPM Line Feeding**.

---

## 🧭 Ringkasan Milestone Evolusi Sistem

| Versi | Tanggal / Fase | Sorotan Utama |
|:---:|:---|:---|
| **v1.0.0** | Awal Project | Arsitektur legacy dengan file HTML terpisah (`admin.html`, `user.html`), penulisan spreadsheet langsung tanpa proteksi. |
| **v2.0.0** | Migrasi Core | Konsolidasi logika bisnis ke Google Apps Script (`Web.gs`) sebagai *Single Source of Truth* dan format amplop respons terpadu. |
| **v3.0.0** | Hardening & RBAC | Implementasi otentikasi token (`ADMIN_TOKEN`, `DRIVER_TOKEN`), proteksi konkurensi `LockService`, validasi MIME foto, dan *status lockdown*. |
| **v4.0.0** | Unified Frontend | Pembangunan frontend tunggal berbasis Vue 3 + Vite + Tailwind CSS (`WKPM/combined-app`) dengan serverless proxy di Netlify. |
| **v5.0.0** | 5-Step Lifecycle | Pembaruan state machine 5 langkah (`Baru Dibuat` ➔ `Belum Berangkat` ➔ `Jalan` ➔ `Tiba` ➔ `Selesai`) dan pemisahan kolom rute. |
| **v6.0.0** | Multi-Item & Performa | Perbaikan penomoran multi-item, grouping material tanpa duplikasi No LF, normalisasi PIC uppercase, batching query, dan eliminasi error 504. |
| **v7.0.0** | Produksi & QR Assets | Verifikasi endpoint produksi Version 11 dan pembuatan generator QR Code akses portal (`qr code/`). |
| **v8.0.0** | 2026-08-22 | **Deep High-Performance & Responsiveness Overhaul**: Multi-tier caching (`ScriptCache` + RAM), eliminasi `SpreadsheetApp.flush()`, pembacaan formula selektif 2-kolom, slice write-back bertarget, kompresi gambar off-thread via `createImageBitmap` + `OffscreenCanvas`, dan smart cache invalidation. |

---

## 📝 Catatan Perubahan Rinci Per Versi

---

### [v8.0.0] - 2026-08-22
#### ⚡ Optimasi Performa Mendalam & Peningkatan Responsivitas Sistem
- **Multi-Tier Caching untuk Seluruh Material Catalog (`Code.gs`)**:
  - *Masalah:* Setiap pengetikan kode material atau pembuatan KPM membaca sheet `DataBase` berulang-ulang melalui RPC spreadsheet yang lambat.
  - *Solusi:* Diimplementasikan fungsi `getMaterialDatabaseMap()` yang memuat seluruh katalog material ke dalam RAM dan `ScriptCache` (TTL 6 jam) dengan skema chunking aman (>100KB). Fungsi `getMaterialByKode(kode)` kini beroperasi secara instan ($O(1)$ di memori).
- **Pembacaan Formula Selektif 2 Kolom (`Web.gs`)**:
  - *Masalah:* `getKpmMonitoringData` sebelumnya memanggil `range.getFormulas()` dan `range.getValues()` untuk seluruh 24 kolom sheet, menghasilkan network payload yang sangat besar.
  - *Solusi:* `photoFormulas` kini hanya membaca 2 kolom foto (Kolom W & X), memangkas data transfer dari Google Sheets sebesar lebih dari 60%.
- **Penulisan Bounded Slice pada Pembaruan Status (`Web.gs`)**:
  - *Masalah:* `validateAndUpdateStatus` menulis kembali seluruh matriks spreadsheet ribuan baris (`fullRange.setValues(allData)`), memicu latency tinggi.
  - *Solusi:* Sistem kini menghitung batas indeks baris yang berubah (`minIdx` hingga `maxIdx`) dan hanya menulis irisan baris yang terpengaruh (`allData.slice(minIdx, maxIdx + 1)`).
- **Caching Target Google Drive Folder (`Web.gs`)**:
  - *Masalah:* `DriveApp.getFoldersByName()` memindai seluruh direktori Google Drive setiap kali personel mengunggah foto bukti.
  - *Solusi:* Fungsi `getTargetDriveFolder()` menyimpan ID folder di `ScriptCache` (TTL 6 jam) dan RAM, sehingga foto disimpan langsung via `DriveApp.getFolderById()`.
- **Chunked Caching & Instant Invalidation untuk Monitoring API (`Web.gs`)**:
  - *Solusi:* Data monitoring di-cache di `ScriptCache` (TTL 60 detik) dengan pembagian chunking. Cache langsung dibersihkan (*invalidated*) secara instan ketika KPM baru dibuat, status diperbarui, atau KPM diarsipkan.
- **Smart Refresh & Cache Bypass pada Frontend (`WKPM/combined-app`)**:
  - *Solusi:* Tombol "↻ Segarkan" / "↻" pada frontend secara eksplisit mengirim parameter `&refresh=true` untuk mem-bypass cache saat pengguna menginginkan data terbaru secara instan.
- **Kompresi Foto Off-Main-Thread (`App.vue`)**:
  - *Solusi:* Fungsi `compressImage()` memanfaatkan `createImageBitmap` dan `OffscreenCanvas` agar proses *decoding* dan *resizing* foto resolusi tinggi berjalan di *background thread* tanpa memblokir UI browser pada perangkat mobile.
- **Optimasi `onEdit` Spreadsheet Engine (`KPMn.gs`)**:
  - *Solusi:* Menambahkan `_cachedPrevActiveRow` untuk menghindari pembacaan ganda blok baris sebelumnya, prekomputasi `MONITOR_SHEET_NAME_LOWER`, pemangkasan penulisan downstream sync ke baris yang benar-benar terscan, dan eliminasi loop `getValue()` sel demi sel pada `printKpmM()`.

---

### [v7.0.0] - 2026-08-22
#### 🌟 Fitur Baru & Rilis Produksi
- **QR Code Portal Generator**:
  - Membuat script [`generate_qr.mjs`](file:///d:/MyCode/KPMscirpt/generate_qr.mjs) untuk menghasilkan QR Code beresolusi tinggi 1000×1000 PNG untuk Admin Portal (`/kpm`) dan Personel Driver Portal (`/kpm/personel`).
  - Menyediakan layout cetak siap pakai di [`qr code/print_qr_codes.html`](file:///d:/MyCode/KPMscirpt/qr%20code/print_qr_codes.html) untuk kebutuhan lamination / display di meja workshop.
- **Dokumentasi Komprehensif**:
  - Membuat [`README.md`](file:///d:/MyCode/KPMscirpt/README.md) di root workspace mencakup arsitektur, alur state machine, skema kolom A-X, spesifikasi API, dan panduan deployment.
  - Membuat [`History/change.md`](file:///d:/MyCode/KPMscirpt/History/change.md) sebagai catatan historis seluruh perubahan teknis.

---

### [v6.0.0] - 2026-08-21
#### 🐛 Perbaikan Bug Kritis & Optimasi Performa
- **Perbaikan Overwriting Baris Multi-Material (`barisKosong`)**:
  - *Masalah:* Fungsi `validateAndCreateKpm` sebelumnya mencari baris kosong hanya dengan memeriksa kolom C (`No LF`). Untuk KPM dengan banyak barang di mana baris 2 & 3 tidak memiliki No LF berulang, pembuatan KPM baru menimpa (*overwrite*) barang ke-2 dan ke-3 dari KPM sebelumnya.
  - *Solusi:* `barisKosong` diperbarui menggunakan `Math.max(MONITOR_START_ROW, sheet.getLastRow() + 1)` sehingga memeriksa seluruh kolom A–X dan selalu menambahkan baris setelah baris data terakhir.
- **Dukungan Grouping Multi-Material pada Monitoring Dashboard**:
  - *Masalah:* `getKpmMonitoringData` sebelumnya melewati baris yang memiliki nilai `No LF` kosong (`if (!kpm) continue;`), menyebabkan item barang ke-2 dan seterusnya hilang dari tampilan dashboard.
  - *Solusi:* Ditambahkan pelacak state `lastSeenKpm`, `lastSeenPic`, `lastSeenProyek`, dll. Baris anak (*child items*) otomatis mewarisi metadata induk sehingga semua barang tampil lengkap pada kartu KPM di web.
- **Normalisasi PIC Huruf Kapital (Data Validation Error O10 / O12)**:
  - *Masalah:* Validasi data Google Sheets pada kolom O menolak nama PIC berhuruf campuran (contoh: `"Aang"` ditolak dengan pesan `Masukkan salah satu nilai: EKO, RULI, EGI, NUGRAHA, TAUFIQ, AANG`).
  - *Solusi:* `WEB_CONFIG.PICS` disesuaikan ke format uppercase dan fungsi `validateAndCreateKpm` serta `validateAndUpdateStatus` otomatis mengonversi input nama PIC ke uppercase yang cocok sebelum disimpan ke spreadsheet.
- **Penyertaan Status "Selesai" pada Validasi Dropdown (Cell V13)**:
  - *Masalah:* Pengarsipan KPM ke status `"Selesai"` gagal karena dropdown validasi kolom V hanya mengizinkan 4 status awal.
  - *Solusi:* Menambahkan `KPM_STATUS.SELESAI` ke dalam aturan validasi di `setupTrackingHeaders()` dan `getMasterData()`.
- **Eliminasi Error 504 Gateway Timeout di Netlify**:
  - *Masalah:* Operasi Google Apps Script (Drive upload + Sheets sync) membutuhkan waktu ~11-12 detik pada beban awal, sedangkan default timeout Netlify Function adalah 10 detik.
  - *Solusi:* Mengonfigurasi `timeout = 26` pada `[functions."api"]` di [`netlify.toml`](file:///d:/MyCode/KPMscirpt/WKPM/combined-app/netlify.toml).
- **Batching Status Updates pada Pembacaan Data Monitoring**:
  - *Masalah:* Pengecekan KPM lama (> 5 menit) di `getKpmMonitoringData` memanggil `setValue()` sel demi sel secara berulang, menimbulkan latency tinggi (500ms per panggilan).
  - *Solusi:* Seluruh pembaruan status dikumpulkan dalam array `pendingStatusRowUpdates` dan ditulis dalam **1 kali pemanggilan batch** `setValues()`.
- **Penyempurnaan Proteksi Concurrency (`LockService`)**:
  - Mengganti `lock.waitLock(15000)` dengan `lock.tryLock(15000)` dan menambahkan pengecekan `if (lockAcquired)` pada blok `finally` untuk mencegah error pelepasan lock yang tidak terakuisisi.

---

### [v5.0.0] - 2026-08-21
#### 🔄 Refaktorisasi State Machine & Kolom Rute
- **Transisi ke Alur 5 Status**:
  - Memperkenalkan alur hidup KPM: `Baru Dibuat` ➔ `Belum Berangkat` ➔ `Jalan` ➔ `Tiba` ➔ `Selesai`.
  - Membuat fungsi pembantu `normalizeKpmStatus()` untuk menjaga kompatibilitas mundur dengan data spreadsheet lama yang menggunakan label `"Berangkat"`.
- **Pemisahan Kolom Rute Workshop**:
  - Kolom Q dialokasikan khusus untuk `Dari` (Workshop Keberangkatan) dan Kolom R dialokasikan khusus untuk `Tujuan` (Workshop Kedatangan).
  - Menambahkan normalisasi otomatis untuk baris legacy yang menyimpan string rute gabungan (`"Candi Sewu ➔ Tiron"`).
- **Pembaruan Filter Portal Driver**:
  - Portal Driver diperbarui agar hanya menampilkan KPM dengan status `Belum Berangkat` atau `Jalan` (menyembunyikan status `Baru Dibuat` dan `Tiba`).

---

### [v4.0.0] - 2026-08-20
#### 💻 Pembangunan Frontend Terpadu (Unified Web App)
- **Migrasi ke Single Page Application (SPA)**:
  - Membangun aplikasi terpadu berbasis Vue 3 (Composition API) + Vite + Tailwind CSS di folder `WKPM/combined-app`.
  - Mengintegrasikan rute `/kpm` untuk Admin Dashboard dan `/kpm/personel` untuk Personel Driver dalam satu bundle aplikasi.
- **Serverless Netlify Proxy (`api.mjs`)**:
  - Membuat fungsi serverless Netlify di `netlify/functions/api.mjs` untuk menginjeksi token otentikasi secara server-side (`process.env.ADMIN_TOKEN` dan `process.env.DRIVER_TOKEN`), sehingga token tidak terekspos di kode sumber browser.
- **Kompresi Foto di Sisi Klien**:
  - Menambahkan fungsi `compressImage()` di browser untuk mengompres foto beresolusi tinggi menjadi JPEG kualitas 72% dengan batas lebar 1000px sebelum dikonversi ke Base64, menghemat waktu upload dan kuota mobile.
- **Pembersihan File Legacy**:
  - Menghapus file HTML terpisah yang sudah tidak digunakan (`generate.html`, `index.html`, `index.hmtl`).

---

### [v3.0.0] - 2026-08-19
#### 🛡️ Penguatan Keamanan & Role-Based Access Control (RBAC)
- **Penghapusan Kredensial Hardcoded**:
  - Menghapus seluruh token default dari kode sumber [`Web.gs`](file:///d:/MyCode/KPMscirpt/Web.gs) dan frontend scripts.
  - Memindahkan penyimpanan rahasia ke Google Apps Script `ScriptProperties` (`ADMIN_TOKEN` dan `DRIVER_TOKEN`).
- **Otorisasi Berbasis Peran Ganda**:
  - Membatasi aksi administratif (`createKpm`, `archiveKpm`, `getMonitoring`) khusus untuk pemegang `ADMIN_TOKEN`.
  - Membatasi peran Driver hanya dapat mengakses `getDeliveries` dan `updateStatus`.
- **Status Lockdown pada Pembuatan KPM**:
  - Parameter status dari sisi klien diabaikan secara mutlak pada fungsi `validateAndCreateKpm`. Status awal KPM baru selalu dipaksa menjadi `Baru Dibuat`.
- **Validasi Ketat Format Material & Foto**:
  - Parser JSON material baru yang menolak JSON malformed (*no fallthrough*).
  - Validasi kuantitas positif angka (`/^\d+(?:\.\d+)?$/`) dan batas maksimal 100 item per KPM.
  - Validasi MIME type foto (`image/jpeg`, `image/jpg`, `image/png`, `image/webp`) dan batas ukuran maksimal ~5MB.

---

### [v2.0.0] - 2026-08-18
#### ⚙️ Standardisasi Backend API
- **Google Apps Script sebagai Single Source of Truth**:
  - Memindahkan seluruh logika validasi rute, status transisi, dan kalkulasi durasi perjalanan ke sisi server ([`Web.gs`](file:///d:/MyCode/KPMscirpt/Web.gs)).
- **Format Amplop Respons Terpadu**:
  - Semua output `doGet` dan `doPost` distandarisasi dalam amplop JSON `{ success: boolean, action: string, data: any, error: object|null }`.
- **Penanganan Hyperlink Google Drive**:
  - Membuat helper `extractHyperlinkUrl()` untuk mengekstrak URL Drive bersih dari formula `=HYPERLINK("...", "[Link]")` maupun nilai teks biasa.

---

### [v1.0.0] - 2026-08-15
#### 🧱 Implementasi Awal (Legacy Baseline)
- Sheet database `"KPM Monitor 2026"` di Google Sheets.
- File HTML mandiri (`admin.html` dan `user.html`) dengan panggilan `fetch(..., { mode: 'no-cors' })`.
- Skrip engine spreadsheet awal di [`KPMn.gs`](file:///d:/MyCode/KPMscirpt/KPMn.gs) dan antarmuka cetak di [`PrintKPM.html`](file:///d:/MyCode/KPMscirpt/PrintKPM.html).

---

## 🏆 Matriks Penyelesaian Isu & Technical Debt

| Isu / Kebutuhan | Solusi Teknis yang Diterapkan | Status |
|:---|:---|:---:|
| Penolakan request tanpa token | Middleware `authenticateRequest()` berbasis `ScriptProperties` | ✅ Selesai |
| Token terekspos di browser source | Netlify Function Proxy (`api.mjs`) menyuntikkan token dari env | ✅ Selesai |
| Status ilegal saat KPM dibuat | Enforced status lockdown `statusKPM = KPM_STATUS.BARU_DIBUAT` | ✅ Selesai |
| Duplikasi KPM saat klik bersamaan | `LockService.getScriptLock()` dengan timeout 15 detik | ✅ Selesai |
| Upload foto gagal tapi status maju | Throw `PHOTO_UPLOAD_FAILED` dan abort status update | ✅ Selesai |
| Multi-item KPM tertimpa | `barisKosong` mendeteksi `getLastRow() + 1` di seluruh kolom A-X | ✅ Selesai |
| Multi-item hilang di monitoring | Grouping data anak ke induk KPM via `lastSeenKpm` | ✅ Selesai |
| Cell validation error pada PIC | Auto-normalisasi nama PIC ke uppercase (`AANG`, `EKO`, dll.) | ✅ Selesai |
| Cell validation error pada Selesai | Menyertakan `Selesai` pada data validation dropdown kolom V | ✅ Selesai |
| 504 Gateway Timeout di Netlify | Konfigurasi timeout 26s & batch status update di `Web.gs` | ✅ Selesai |
| Akses mobile lapangan yang lambat | Kompresi JPEG 72% di browser & penyediaan kartu QR Code fisik | ✅ Selesai |
