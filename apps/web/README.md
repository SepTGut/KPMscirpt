# KPM Unified Web Portal

Aplikasi Web Terpadu Logistik Line Feeding KPM (Kartu Pengantar Material) berbasis **Vue 3 + Vite**, terintegrasi dengan Google Apps Script backend dan Firebase Realtime Database.

---

## 🌟 Modul & Menu Navigasi

Aplikasi ini menyatukan portal operasional logistik kantor dan portal pengemudi lapangan dalam satu arsitektur Single Page Application (SPA) yang responsif:

### 1. 📝 Buat KPM Baru (`adminView: 'create'`)
- Form pembuatan KPM multi-item dinamis (tambah/hapus baris material).
- Validasi integritas nomor urut material kontinu (wajib berurutan mulai dari nomor 1 tanpa jeda/gap).
- Penomoran otomatis format 3-digit standar pabrik (contoh: `001/PPO/LF/IX/2026`).
- Cetak fisik dokumen KPM format standar ukuran cetak.

### 2. 📊 Pantau KPM (`adminView: 'monitor'`)
- Agregasi data real-time status pengiriman: `Belum Berangkat`, `Berangkat` *(Jalan)*, `Tiba`, `Selesai` *(Arsip)*.
- Filter cerdas berdasarkan workshop tujuan (*Candi Sewu, Tiron, Sukosari, Remul*) dan status.
- Pencarian cepat nomor KPM, nama pengemudi, atau nopol kendaraan.
- **Integritas Status Terkunci (`🔒`)**: Kolom status tidak dapat diubah manual oleh Admin untuk mencegah manipulasi data. Status wajib digerakkan oleh Driver lapangan dengan bukti foto kamera dan titik GPS.
- Modal edit material untuk memperbaiki deskripsi/jumlah sebelum armada diberangkatkan.
- 1-klik tombol pengarsipan data KPM berstatus *Tiba* menjadi *Selesai*.

### 3. 🗺️ Live Fleet Radar (`adminView: 'radar'`)
- Peta interaktif berbasis **Leaflet.js** dengan tile layer OpenStreetMap berkecepatan tinggi.
- Sinkronisasi posisi koordinat GPS armada truk secara langsung via **Firebase Realtime Database**.
- Orientasi rotasi ikon truk mengikuti sudut hadap aktual (*heading degrees*).
- Jejak lintasan dinamis (*breadcrumb polyline*) merekam rute perjalanan pengemudi.
- Penanda 4 Workshop Utama dan mode simulasi armada untuk demonstrasi/testing.

### 4. 👥 Kelola Pengguna (`adminView: 'users'`)
*(Khusus untuk peran IT dan Super Admin)*
- Manajemen akun staf logistik dan pengemudi (tambah akun baru, reset PIN, aktifkan/nonaktifkan akun).
- Pengaturan penempatan workshop dan nomor kontak WhatsApp.
- **Pencetakan Kartu ID QR**: Generate token QR instan dan format cetak kartu identitas fisik pengemudi berstandar A4.

### 5. 📖 Tutorial Interaktif (`adminView: 'tutorial'`)
- Pusat panduan step-by-step terpadu yang dapat diakses langsung dari tab navigasi Admin maupun tombol header portal Driver.
- Terbagi dalam 6 modul pembelajaran interaktif:
  1. `🌟 Ringkasan & Peran`: Pengenalan alur KPM dan matriks kewenangan 4 role.
  2. `📋 Panduan Admin`: Alur kerja 5-langkah dari pembuatan dokumen, pemantauan, aturan kunci status, hingga pengarsipan.
  3. `🚚 Panduan Driver`: Alur 4-langkah penerimaan tugas, navigasi Google Maps 1-klik, konfirmasi berangkat, dan konfirmasi tiba.
  4. `🗺️ Live Fleet Radar`: Penjelasan fitur rotasi heading, jejak lintasan rute, dan landmark workshop.
  5. `👑 Super Admin & IT`: Panduan penggunaan Dual Mode Switcher, User Management, dan Emergency Override.
  6. `❓ FAQ & Pemecahan Kendala`: Solusi GPS akurasi rendah, lupa PIN, alasan status terkunci, dan modul perbaikan format.

### 6. 🚚 Portal Driver Lapangan (`/kpm/personel`)
- Tampilan ramah perangkat seluler (*mobile-first*) yang dioptimalkan untuk pengemudi truk di lapangan.
- Daftar surat jalan aktif yang ditugaskan ke driver yang sedang login.
- Tombol 1-klik navigasi turn-by-turn langsung membuka aplikasi Google Maps ke workshop tujuan.
- Pengambilan foto bukti muat & bongkar dengan kompresi otomatis (<150KB) untuk efisiensi kuota.
- Background Geolocation Tracker yang mengalirkan koordinat GPS ke Firebase saat status *"Berangkat"*.
- **Alur Serah Terima QR Code Tiba**: Saat status beralih ke "Tiba", driver mengambil foto bukti dan layar HP menampilkan QR Code untuk discan oleh penerima barang. Layar driver secara otomatis mendeteksi konfirmasi (*auto-poll*) dan memperbarui daftar tanpa reload manual.

### 7. 📦 Halaman Konfirmasi Penerima (`/kpm/confirm`)
- Halaman publik ringan dan responsif tanpa perlu login, dibuka langsung saat penerima men-scan QR Code di HP driver.
- Menampilkan ringkasan nomor KPM yang sedang diserahterimakan.
- Menyediakan dropdown pemilihan nama penerima yang terhubung langsung ke database sheet `Penerima`.
- Tombol 1-klik *"Konfirmasi Penerimaan Barang ✓"* yang secara instan memutakhirkan status KPM menjadi *Tiba*, mencatat nama di **Kolom AA** (*Penerima*), dan mengarsipkan catatan ke sheet `T.Log`.

---

## 👥 Arsitektur Hak Akses (4-Tier RBAC)

| Peran | Deskripsi | Akses Menu | Kemampuan Khusus |
| :--- | :--- | :--- | :--- |
| **IT ("The Makers")** | Pengembang & Administrator Sistem | Semua Menu (Termasuk Kelola Pengguna & Audit) | Akses tak terbatas, bypass token darurat, manajemen konfigurasi |
| **Super Admin** | Manajer Operasional & Supervisor | Semua Menu Admin + Portal Driver | **Dual Mode Switcher** (Bisa beralih peran jadi Admin atau Driver) |
| **Admin Logistik** | Staf Administrasi Pengiriman | Buat KPM, Pantau KPM, Radar, Tutorial | Kelola dokumen & muatan; status terkunci (`🔒`) demi integritas |
| **Driver** | Personel Pengemudi Lapangan | Portal Tugas Driver, Navigasi Maps, Tutorial | Eksekusi status jalan & tiba, upload foto bukti dan koordinat GPS |

---

## 🚀 Panduan Deployment ke Vercel

Aplikasi ini sudah dilengkapi dengan **Vercel Serverless Function Proxy** (`api/index.js`) dan konfigurasi routing (`vercel.json`) agar token autentikasi (`ADMIN_TOKEN` & `DRIVER_TOKEN`) aman di sisi server.

### Opsi A: Deploy via Vercel CLI (Paling Cepat)

1. Buka terminal PowerShell di folder ini (`apps/web`).
2. Jalankan perintah deploy:
   ```powershell
   npx vercel
   ```
   *(Atau jalankan skrip pembantu `./deploy-vercel.ps1`)*
3. Untuk deployment langsung ke Production:
   ```powershell
   npx vercel --prod
   ```

### Opsi B: Deploy via GitHub / Vercel Dashboard

1. Push repository ke GitHub / GitLab.
2. Di Dashboard Vercel, klik **Add New Project** lalu pilih repository ini.
3. Pada **Project Settings**:
   - **Root Directory**: `apps/web` *(Klik "Edit" dan pilih folder ini)*
   - **Framework Preset**: `Vite` (Otomatis terdeteksi)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 🔑 Environment Variables Wajib di Vercel

Tambahkan variabel berikut di **Project Settings > Environment Variables** di Vercel:

| Nama Variabel | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `GOOGLE_SCRIPT_URL` | URL Web App Google Apps Script (`/exec`) | `https://script.google.com/macros/s/AKfy.../exec` |
| `ADMIN_TOKEN` | Token otentikasi Admin | `rahasia_admin_kpm_2026` |
| `DRIVER_TOKEN` | Token otentikasi Personel Driver | `rahasia_driver_kpm_2026` |

---

## 🌐 Rute URL Setelah Deployment

- **Admin Web Portal**: `https://your-domain.vercel.app/kpm`
- **Personel Driver Portal**: `https://your-domain.vercel.app/kpm/personel`
- **Sitemap & SEO Index**: `https://your-domain.vercel.app/sitemap.xml`
- **Robots Policy**: `https://your-domain.vercel.app/robots.txt`
- **LLMs Documentation Guide**: `https://your-domain.vercel.app/llms.txt`

---

## 🛠️ Pengembangan Lokal (Local Development)

1. Jalankan `npm install` di folder `apps/web`.
2. Salin `.env.example` ke `.env.local` jika ingin mengarahkan API URL langsung.
3. Jalankan `npm run dev` untuk server pengujian lokal.
4. Akses `http://localhost:5173/kpm` di peramban web.

