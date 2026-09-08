# 📗 Buku Panduan Lengkap Penggunaan Spreadsheet KPM Line Feeding

Dokumen ini adalah panduan resmi operasional Google Sheets untuk **Sistem Pemantauan & Logistik KPM (Line Feeding)**. Panduan ini dirancang untuk Staf Administrasi, Operator Data Entry, Gudang, dan PPIC.

---

## 📑 1. Peta Lembar Kerja (Workbook Structure)

Buku kerja Google Sheets KPM terdiri dari 4 sheet utama:

### 1. `KPM Monitor` (Sheet Utama Pemantauan)
- **Fungsi**: Merekam transaksi pengiriman KPM secara kronologis dari status antri hingga selesai diterima di workshop tujuan.
- **Header Kolom**:
  - **No. KPM**: Nomor unik dokumen (contoh: `001/KPM-LF/IX/2026`).
  - **Tanggal & Jam**: Waktu keberangkatan atau penerbitan surat jalan.
  - **Lokasi Berangkat**: Workshop asal (`Candi Sewu`, `Tiron`, `Sukosari`, `Remul`).
  - **Lokasi Tiba**: Workshop tujuan pengiriman.
  - **Driver**: Nama pengemudi yang membawa armada (harus terdaftar di sheet `Users`).
  - **Status**: Alur status otomatis (`Antri` ➔ `Jalan` ➔ `Tiba` ➔ `Diterima`).
  - **URL Bukti Muat & Tiba**: Tautan foto Google Drive yang diunggah oleh driver melalui aplikasi ponsel (Kolom X & Y).
  - **GPS Tracking**: Koordinat latitude, longitude, rute Google Maps saat berangkat/tiba (Kolom Z).
  - **Penerima**: Nama personil yang menerima barang di lokasi (Kolom AA).
  - **Foto Diterima**: Tautan foto Google Drive bukti serah terima barang saat konfirmasi (Kolom AB).

### 2. `DataBase` (Master Data Suku Cadang & Material)
- **Fungsi**: Katalog suku cadang dan material untuk auto-fill saat pembuatan surat KPM.
- **Header Row**: Baris 4.
- **Data Start**: Baris 5.
- **Kolom Kunci**:
  - **Kolom B**: `Kode Material` (Harus unik, contoh: `MTR-00123`).
  - **Kolom C**: `Deskripsi Material` (Nama barang/spesifikasi lengkap).
  - **Kolom E**: `BUn` (Base Unit / Satuan: `PCS`, `SET`, `KG`, `MTR`).
  - **Kolom F**: `Plant` (Lokasi pabrik/gudang penyimpanan).

### 3. `Users` (Master Pengguna & Driver)
- **Fungsi**: Manajemen akun operator admin dan driver.
- **Kolom Kunci**:
  - **Username**: ID login unik pengguna.
  - **Password / PIN**: PIN numerik (4–6 digit) untuk login cepat.
  - **Nama Lengkap**: Nama resmi personil.
  - **Role**: `Super Admin`, `Admin`, atau `Driver`.
  - **WhatsApp**: Nomor telepon aktif untuk koordinasi.
  - **QR Token**: Token acak aman untuk fitur kartu tanda pengenal QR Login.

### 4. `Recipients` (Daftar Penerima)
- **Fungsi**: Daftar PIC resmi per workshop yang berwenang menandatangani dan memverifikasi serah terima barang.

---

## ⚡ 2. Panduan Operasional Menu `⚡ Menu KPM`

Menu kustom di bilah atas Google Sheets menyediakan fungsi cepat:

```
⚡ Menu KPM
├── 🖨️ Cetak Dokumen KPM
├── 📇 Cetak Kartu QR Pengguna (ID Card)
├── -----------------------------------
├── 📊 Master Data & Konfigurasi
│   ├── ⚙️ Pengaturan Format Nomor KPM
│   ├── 👥 Inisialisasi Sheet Pengguna (Users)
│   └── 📦 Inisialisasi Sheet Penerima (Recipients)
├── 🛠️ Pemeliharaan & Format
│   ├── 📐 Perbaiki Format Sheet (Fix Format)
│   ├── 🧹 Bersihkan Baris Kosong
│   └── 📡 Setup Kolom Tracking GPS
└── 📖 Bantuan & Informasi
    ├── 📗 Panduan Penggunaan Spreadsheet
    ├── 📖 Buku Panduan & Tutorial Interaktif (Web & App)
    └── ℹ️ Tentang Sistem & Developer
```

### 1. Mencetak Dokumen KPM Cetak Fisik
1. Pada sheet `KPM Monitor`, klik salah satu sel pada baris data KPM yang ingin dicetak.
2. Klik menu **`⚡ Menu KPM ➔ 🖨️ Cetak Dokumen KPM`**.
3. Jendela pop-up pratinjau cetak akan muncul dalam format **Letter Landscape** (15 baris per lembar, lengkap dengan barcode/QR Code KPP).
4. Klik tombol **`PRINT DOKUMEN`** untuk mencetak ke printer fisik atau simpan sebagai file PDF.

### 2. Mencetak Kartu ID & QR Auto-Login Pengguna
1. Klik menu **`⚡ Menu KPM ➔ 📇 Cetak Kartu QR Pengguna (ID Card)`**.
2. Gunakan filter di toolbar atas untuk memfilter: **Semua**, **Admin**, atau **Driver**.
3. Pilih pengguna yang ingin dicetak kartunya, lalu klik **`Cetak Kartu Terpilih`**.
4. Driver dapat langsung memindai kartu QR ini menggunakan kamera ponsel untuk masuk ke aplikasi tanpa perlu mengetik PIN.

### 3. Mengatur Format Penomoran KPM
1. Buka menu **`⚡ Menu KPM ➔ 📊 Master Data & Konfigurasi ➔ ⚙️ Pengaturan Format Nomor KPM`**.
2. Anda dapat mengubah pola penomoran dokumen menggunakan tag dinamis:
   - `{no}` = Nomor urut (otomatis 3 digit: 001, 002).
   - `{month}` = Bulan romawi saat ini (I, II, III, ..., XII).
   - `{year}` = Tahun 4 digit (2026).
3. Lihat kotak **Live Preview** untuk memastikan format telah sesuai sebelum menekan tombol simpan.

### 4. Merapikan Format Sheet (Fix Format)
1. Jika tampilan sheet terlihat tidak rapi, font berubah, atau angka nomor urut kehilangan leading zero (misal `1` bukannya `001`).
2. Klik menu **`⚡ Menu KPM ➔ 🛠️ Pemeliharaan & Format ➔ 📐 Perbaiki Format Sheet (Fix Format)`**.
3. Skrip otomatis menata ulang border tabel, perataan tengah teks, font, dan format nomor standar.

### 5. Membersihkan Baris Kosong (Clean Orphaned Rows)
1. Buka menu **`⚡ Menu KPM ➔ 🛠️ Pemeliharaan & Format ➔ 🧹 Bersihkan Baris Kosong`**.
2. Skrip akan memindai dan menghapus baris-baris kosong yang tidak memiliki No KPM, sehingga ukuran file spreadsheet tetap ringan dan cepat dimuat.

---

## 🛡️ 3. Aturan Mutlak & Tips Anti-Error

| Yang Harus Dilakukan (DO) | Yang Dilarang Keras (DON'T) |
|---|---|
| ✅ Gunakan format tanggal standar ISO (`YYYY-MM-DD`) atau `DD/MM/YYYY`. | ❌ **JANGAN** mengubah nama tab sheet (`KPM Monitor`, `DataBase`, `Users`, `Recipients`). |
| ✅ Input Kode Material sesuai yang ada di sheet `DataBase` agar validasi bekerja. | ❌ **JANGAN** memindahkan atau menghapus kolom header utama pada baris 1-4. |
| ✅ Jalankan `Perbaiki Format Sheet` secara berkala untuk menjaga kerapian grid. | ❌ **JANGAN** mengedit status pengiriman manual saat armada sedang berjalan di jalan. |
| ✅ Simpan cadangan data (backup) spreadsheet secara berkala. | ❌ **JANGAN** memasukkan formula dinamis array berat ke dalam sel transaksi logistik. |

---
*Buku Panduan KPM Line Feeding &copy; 2026. Diperbarui secara otomatis.*
