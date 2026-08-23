# KPM Unified Web

Aplikasi Web Terpadu untuk Admin KPM dan Personel Driver (Vue 3 + Tailwind CSS + Vite).

---

## 🚀 Panduan Deployment ke Vercel

Aplikasi ini sudah dilengkapi dengan **Vercel Serverless Function Proxy** (`api/index.js`) dan konfigurasi routing (`vercel.json`) agar token autentikasi (`ADMIN_TOKEN` & `DRIVER_TOKEN`) aman di sisi server.

### Opsi A: Deploy via Vercel CLI (Paling Cepat)

1. Buka terminal PowerShell di folder ini (`WKPM/combined-app`).
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
   - **Root Directory**: `WKPM/combined-app` *(Klik "Edit" dan pilih folder ini)*
   - **Framework Preset**: `Vite` (Otomatis terdeteksi)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 🔑 Environment Variables Wajib di Vercel

Tambahkan 3 variabel berikut di **Project Settings > Environment Variables** di Vercel:

| Nama Variabel | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `GOOGLE_SCRIPT_URL` | URL Web App Google Apps Script (`/exec`) | `https://script.google.com/macros/s/AKfy.../exec` |
| `ADMIN_TOKEN` | Token otentikasi Admin | `rahasia_admin_kpm_2026` |
| `DRIVER_TOKEN` | Token otentikasi Personel Driver | `rahasia_driver_kpm_2026` |

---

## 🌐 Rute URL Setelah Deployment

- **Admin Web Portal**: `https://your-domain.vercel.app/kpm`
- **Personel Driver Portal**: `https://your-domain.vercel.app/kpm/personel`

---

## 🛠️ Pengembangan Lokal (Local Development)

1. Jalankan `npm install` di folder `WKPM/combined-app`.
2. Salin `.env.example` ke `.env.local` jika ingin mengarahkan API URL langsung.
3. Jalankan `npm run dev` untuk server pengujian lokal.

---

## 📦 Membuat File ZIP untuk Arsip / Manual Upload

Jika ingin membuat paket arsip siap deploy yang bersih:
```powershell
powershell -ExecutionPolicy Bypass -File .\make-vercel-upload.ps1
```
Hasil file ZIP `kpm-vercel-upload.zip` akan dibuat tanpa menyertakan `node_modules` dan `.env`.
