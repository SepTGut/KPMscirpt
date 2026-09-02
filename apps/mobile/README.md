# Driver KPM Line Feeding Mobile App 🚚📱

Aplikasi mobile mandiri yang dioptimalkan khusus untuk **Personel Pengemudi (Driver)** dalam sistem tracking KPM Line Feeding.

---

## 🌟 Fitur Utama

1. 🔍 **Scan QR / Barcode Fisik**: Scan QR code pada lembar KPM dengan kamera untuk membuka KPM secara instan.
2. 📷 **Kamera Cepat & Kompresi Otomatis**: Pengambilan foto bukti muat & tiba dengan kompresi off-thread (`OffscreenCanvas`) sehingga hemat kuota dan tidak membuat HP lag.
3. 📶 **Offline Queue Sync (IndexedDB)**: Jika koneksi hilang di lapangan, status dan foto disimpan di memori HP dan otomatis di-upload saat sinyal internet kembali.
4. 📳 **Haptic Vibration & Audio Feedback**: Konfirmasi getar & suara saat scan berhasil atau status terkirim.
5. 📱 **Mobile PWA Ready**: Dapat di-"Add to Home Screen" langsung dari browser Chrome / Safari di HP Driver.

---

## 🚀 Cara Menjalankan

### Development Lokal:
```bash
cd apps/driver-app
npm install
npm run dev
```
Buka browser di `http://localhost:5174`.

### Build Produksi:
```bash
npm run build
```
Hasil build tersimpan di folder `dist/`.
