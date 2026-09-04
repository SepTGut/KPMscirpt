<script setup>
import { ref } from 'vue'

const activeCategory = ref('overview')

const categories = [
  { id: 'overview', label: '🌟 Ringkasan & Peran', icon: '🌟' },
  { id: 'admin', label: '📋 Panduan Admin', icon: '📋' },
  { id: 'driver', label: '🚚 Panduan Driver', icon: '🚚' },
  { id: 'radar', label: '🗺️ Live Fleet Radar', icon: '🗺️' },
  { id: 'super_admin', label: '👑 Super Admin & IT', icon: '👑' },
  { id: 'faq', label: '❓ FAQ & Kendala', icon: '❓' }
]
</script>

<template>
  <section class="space-y-6 animate-fadeIn">
    <!-- Header Card -->
    <div class="bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
      <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
          <span>📖</span>
          <span>Buku Panduan Operasional & Dokumentasi</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Panduan Penggunaan Sistem KPM Line Feeding
        </h1>
        <p class="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
          Pelajari alur kerja terpadu penerbitan KPM, pembaruan status pengemudi di lapangan, pelacakan radar armada GPS real-time, dan manajemen pengguna 4-tier.
        </p>
      </div>

      <!-- Background decorative circles -->
      <div class="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
    </div>

    <!-- Category Tabs Navigation -->
    <div class="flex bg-white p-2 rounded-2xl border border-google-surface-300/70 shadow-sm overflow-x-auto gap-1.5 scrollbar-none">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        :class="activeCategory === cat.id ? 'bg-google-blue-600 text-white shadow-sm' : 'text-google-surface-600 hover:bg-google-surface-100 hover:text-google-surface-900'"
        @click="activeCategory = cat.id"
      >
        <span>{{ cat.icon }}</span>
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <!-- TAB 1: OVERVIEW & 4-TIER ROLES -->
    <div v-if="activeCategory === 'overview'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-4">
        <h2 class="text-lg font-bold text-google-surface-900 flex items-center gap-2">
          <span>🌟</span>
          <span>Pengenalan Sistem & 4 Peran Pengguna (RBAC)</span>
        </h2>
        <p class="text-xs text-google-surface-600 leading-relaxed">
          Sistem KPM Line Feeding menggunakan arsitektur keamanan berbasis 4 tingkat hak akses. Setiap peran memiliki tanggung jawab dan wewenang yang terpisah untuk menjaga integritas data logistik:
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- IT -->
          <div class="p-4 rounded-2xl border border-purple-200 bg-purple-50/60 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                1. IT ("The Makers")
              </span>
              <span class="text-lg">⚡</span>
            </div>
            <h3 class="text-sm font-bold text-purple-950">Akses Penuh Sistem & Pengembang</h3>
            <p class="text-xs text-purple-900/80 leading-relaxed">
              Memiliki kontrol tertinggi tanpa batasan. Mengelola seluruh akun pengguna, diagnostik sistem, perbaikan format otomatis, dan dapat beralih ke Mode Admin maupun Driver kapan saja.
            </p>
          </div>

          <!-- Super Admin -->
          <div class="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                2. Super Admin
              </span>
              <span class="text-lg">👑</span>
            </div>
            <h3 class="text-sm font-bold text-amber-950">Pimpinan Operasional Dual-Mode</h3>
            <p class="text-xs text-amber-900/80 leading-relaxed">
              Dapat beroperasi sebagai <strong>Admin</strong> maupun <strong>Driver</strong> secara bergantian melalui tombol Role Switcher di header. Memiliki wewenang mengelola staf dan melakukan override status darurat.
            </p>
          </div>

          <!-- Admin -->
          <div class="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                3. Admin Logistik
              </span>
              <span class="text-lg">🛡️</span>
            </div>
            <h3 class="text-sm font-bold text-blue-950">Staf Pembuat & Pemantau KPM</h3>
            <p class="text-xs text-blue-900/80 leading-relaxed">
              Bertugas menerbitkan surat KPM baru, memantau radar armada, mengedit material sebelum jalan, dan mengarsipkan KPM selesai. <strong>Admin biasa tidak mengubah status pengiriman secara manual</strong> (status dikunci 🔒 dan digerakkan oleh Driver).
            </p>
          </div>

          <!-- Driver -->
          <div class="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                4. Driver (Pengemudi)
              </span>
              <span class="text-lg">🚚</span>
            </div>
            <h3 class="text-sm font-bold text-emerald-950">Operator Lapangan Ekspedisi</h3>
            <p class="text-xs text-emerald-900/80 leading-relaxed">
              Khusus mengakses Portal Driver untuk melihat penugasan, navigasi Google Maps 1-klik, dan mengunggah foto bukti keberangkatan/ketibaan dengan validasi GPS otomatis.
            </p>
          </div>
        </div>
      </div>

      <!-- Login Methods Guide -->
      <div class="panel space-y-4">
        <h2 class="text-base font-bold text-google-surface-900 flex items-center gap-2">
          <span>🔑</span>
          <span>Tiga Cara Mudah Masuk ke Aplikasi (Login)</span>
        </h2>
        <div class="grid gap-3 sm:grid-cols-3 text-xs">
          <div class="p-3.5 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-1.5">
            <span class="font-bold text-google-blue-700 flex items-center gap-1">
              <span>⌨️</span> 1. Username & PIN
            </span>
            <p class="text-google-surface-600 leading-relaxed">
              Ketik username (atau email) beserta nomor PIN yang telah didaftarkan oleh Super Admin / IT.
            </p>
          </div>
          <div class="p-3.5 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-1.5">
            <span class="font-bold text-google-blue-700 flex items-center gap-1">
              <span>🌐</span> 2. Masuk dengan Google
            </span>
            <p class="text-google-surface-600 leading-relaxed">
              Klik tombol Google untuk autentikasi 1-klik menggunakan email Gmail yang terdaftar di spreadsheet.
            </p>
          </div>
          <div class="p-3.5 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-1.5">
            <span class="font-bold text-google-blue-700 flex items-center gap-1">
              <span>📱</span> 3. Scan Kartu QR ID
            </span>
            <p class="text-google-surface-600 leading-relaxed">
              Pindai kode QR unik pada kartu tanda pengenal fisik untuk langsung masuk tanpa mengetik PIN.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: PANDUAN ADMIN -->
    <div v-else-if="activeCategory === 'admin'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 flex items-center gap-2">
          <span>📋</span>
          <span>Panduan Lengkap Administrator Logistik</span>
        </h2>

        <div class="space-y-4">
          <!-- Step 1 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 text-sm">Menerbitkan Surat KPM Baru</h3>
              <p class="text-google-surface-600 leading-relaxed">
                Buka tab <strong>"📝 Buat KPM Baru"</strong>. Pilih Penanggung Jawab (PIC), Nama Proyek, Lokasi Workshop Keberangkatan, dan Lokasi Workshop Tujuan.
              </p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 text-sm">Mengisi Daftar Barang & Material</h3>
              <p class="text-google-surface-600 leading-relaxed">
                Klik tombol <strong>"➕ Tambah Baris Barang"</strong>. Anda dapat memilih barang dari Master Data atau mengetik spesifikasi kustom secara manual. Tentukan Jumlah Diminta, Jumlah Diserahkan, Satuan (UOM), dan Serial Number (S/N).
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 text-sm">Memantau Pengiriman (Status Terkunci 🔒)</h3>
              <p class="text-google-surface-600 leading-relaxed">
                Pada tab <strong>"📊 Pantau KPM"</strong>, pantau progress perjalanan armada secara real-time. Status pengiriman ditampilkan dalam badge terkunci <code>🔒</code> karena status otomatis diubah oleh Driver ketika menekan tombol Berangkat/Tiba.
              </p>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              4
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 text-sm">Mengedit Material Sebelum Truk Jalan</h3>
              <p class="text-google-surface-600 leading-relaxed">
                Jika ada revisi barang sebelum driver berangkat, klik tombol <strong>"✏️ Edit Barang"</strong> pada KPM terakhir untuk menambah, mengubah kuantitas, atau menghapus item barang.
              </p>
            </div>
          </div>

          <!-- Step 5 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              5
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 text-sm">Mengarsipkan Dokumen Selesai</h3>
              <p class="text-google-surface-600 leading-relaxed">
                Setelah barang tiba dan diverifikasi, klik tombol <strong>"📁 Selesai & Arsipkan"</strong> untuk memindahkan data ke arsip dingin agar tabel pantauan tetap rapi dan cepat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: PANDUAN DRIVER -->
    <div v-else-if="activeCategory === 'driver'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 flex items-center gap-2">
          <span>🚚</span>
          <span>Panduan Operasional Pengemudi Armada (Driver)</span>
        </h2>

        <div class="space-y-4">
          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 text-sm">Melihat Penugasan Aktif</h3>
              <p class="text-emerald-900/80 leading-relaxed">
                Saat masuk ke <strong>Portal Driver</strong>, daftar KPM yang siap dikirim akan tampil. Pilih kartu KPM yang akan Anda antarkan untuk membuka detail muatan dan rute.
              </p>
            </div>
          </div>

          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 text-sm">Navigasi Rute 1-Klik Google Maps</h3>
              <p class="text-emerald-900/80 leading-relaxed">
                Klik tombol <strong>"🗺️ Buka Rute di Google Maps"</strong>. Aplikasi langsung membuka Google Maps GPS turn-by-turn mengarahkan kendaraan Anda dari workshop asal ke workshop tujuan.
              </p>
            </div>
          </div>

          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 text-sm">Konfirmasi Keberangkatan (Status: Berangkat)</h3>
              <p class="text-emerald-900/80 leading-relaxed">
                Setelah barang selesai dimuat ke truk, ambil foto barang di atas bak menggunakan kamera, pastikan GPS aktif, lalu tekan tombol <strong>"🚀 Konfirmasi Keberangkatan"</strong>. Live Tracking radar otomatis mulai menyiarkan posisi truk Anda.
              </p>
            </div>
          </div>

          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              4
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 text-sm">Konfirmasi Ketibaan & Scan QR Penerima (Status: Tiba)</h3>
              <p class="text-emerald-900/80 leading-relaxed">
                Setibanya di workshop tujuan, ambil foto barang saat diserahkan/dibongkar, lalu tekan tombol <strong>"📷 Ambil Foto & Tampilkan QR Penerima"</strong>. Layar HP Anda akan menampilkan QR Code untuk discan oleh pihak Penerima barang di workshop tujuan. Begitu Penerima memilih namanya dan mengonfirmasi di ponselnya, sistem Anda otomatis mendeteksi dan mencatat status <em>Tiba</em> lengkap dengan nama penerima di Kolom AA spreadsheet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: LIVE FLEET RADAR -->
    <div v-else-if="activeCategory === 'radar'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-4">
        <h2 class="text-lg font-bold text-google-surface-900 flex items-center gap-2">
          <span>🗺️</span>
          <span>Panduan Fitur Live Fleet GPS Radar</span>
        </h2>
        <p class="text-xs text-google-surface-600 leading-relaxed">
          Peta radar armada memvisualisasikan posisi truk pengiriman secara langsung dengan pembaruan setiap 3-10 detik melalui Firebase Realtime Database:
        </p>

        <div class="grid gap-3 sm:grid-cols-2 text-xs">
          <div class="p-4 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-2">
            <h3 class="font-bold text-google-surface-900 flex items-center gap-1.5">
              <span>🚚</span> Ikon Truk & Arah Hadap (Heading)
            </h3>
            <p class="text-google-surface-600 leading-relaxed">
              Setiap truk ditampilkan dengan ikon kendaraan yang berputar otomatis mengikuti arah pergerakan kompas kendaraan di jalan raya.
            </p>
          </div>

          <div class="p-4 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-2">
            <h3 class="font-bold text-google-surface-900 flex items-center gap-1.5">
              <span>🔵</span> Jejak Rekam Lintasan (Breadcrumb Polyline)
            </h3>
            <p class="text-google-surface-600 leading-relaxed">
              Garis biru merekam rute aktual yang telah dilewati truk sejak berangkat dari workshop asal hingga menuju tujuan.
            </p>
          </div>

          <div class="p-4 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-2">
            <h3 class="font-bold text-google-surface-900 flex items-center gap-1.5">
              <span>🏭</span> 4 Landmark Workshop
            </h3>
            <p class="text-google-surface-600 leading-relaxed">
              Peta dilengkapi koordinat tetap 4 workshop utama: <strong>Candi Sewu, Tiron, Sukosari, dan Remul</strong> sebagai titik acuan jarak.
            </p>
          </div>

          <div class="p-4 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-2">
            <h3 class="font-bold text-google-surface-900 flex items-center gap-1.5">
              <span>📶</span> Mode Simulasi GPS
            </h3>
            <p class="text-google-surface-600 leading-relaxed">
              Untuk pengujian tanpa kendaraan fisik, jalankan <code>npm run test:gps:simulate</code> dari terminal untuk menjalankan simulasi 26 titik gerak halus.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: SUPER ADMIN & IT -->
    <div v-else-if="activeCategory === 'super_admin'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 flex items-center gap-2">
          <span>👑</span>
          <span>Panduan Super Admin & IT ("The Makers")</span>
        </h2>

        <div class="space-y-4 text-xs">
          <!-- Role Switcher -->
          <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <h3 class="font-bold text-amber-950 text-sm flex items-center gap-2">
              <span>🔄</span> Tombol Switcher Mode (Admin ⇄ Driver)
            </h3>
            <p class="text-amber-900/80 leading-relaxed">
              Super Admin dan IT dapat beralih peran seketika dengan menekan tombol <strong>"🔄 Mode Driver"</strong> atau <strong>"🔄 Mode Admin"</strong> di bar navigasi atas. Fitur ini memungkinkan pimpinan menguji tampilan driver atau mengambil pengiriman darurat tanpa perlu keluar (logout).
            </p>
          </div>

          <!-- Status Override -->
          <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <h3 class="font-bold text-amber-950 text-sm flex items-center gap-2">
              <span>⚙️</span> Override Status Darurat
            </h3>
            <p class="text-amber-900/80 leading-relaxed">
              Berbeda dengan Admin biasa yang statusnya terkunci, Super Admin dan IT memiliki menu dropdown aktif pada tabel pantauan untuk mengoreksi status KPM jika terjadi kendala teknis pada perangkat driver.
            </p>
          </div>

          <!-- User Management -->
          <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <h3 class="font-bold text-amber-950 text-sm flex items-center gap-2">
              <span>👥</span> Menu Kelola Pengguna & Cetak QR ID Card
            </h3>
            <p class="text-amber-900/80 leading-relaxed">
              Buka tab <strong>"👥 Kelola Pengguna"</strong> untuk menambah akun staf baru, mengubah peran (IT, Super Admin, Admin, Driver), mengubah status Aktif/Nonaktif, dan melihat atau mencetak <strong>ID Card QR Login</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: FAQ & TROUBLESHOOTING -->
    <div v-else-if="activeCategory === 'faq'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-4">
        <h2 class="text-lg font-bold text-google-surface-900 flex items-center gap-2">
          <span>❓</span>
          <span>Pertanyaan Umum & Solusi Kendala (FAQ)</span>
        </h2>

        <div class="space-y-3 text-xs">
          <details class="p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 list-none flex items-center justify-between">
              <span>Mengapa status pada tabel pantauan Admin terkunci (ikon 🔒)?</span>
              <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p class="text-google-surface-600 mt-2 leading-relaxed">
              Hal ini adalah aturan sistem yang disengaja. Status pengiriman harus digerakkan secara otentik oleh Driver di lapangan dengan bukti foto dan koordinat GPS. Hanya Super Admin dan IT yang dapat mengubah status secara manual jika ada keadaan darurat.
            </p>
          </details>

          <details class="p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 list-none flex items-center justify-between">
              <span>Bagaimana jika sinyal GPS driver lemah atau tidak terdeteksi?</span>
              <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p class="text-google-surface-600 mt-2 leading-relaxed">
              Pastikan pengaturan 'Lokasi Presisi Tinggi' (High Accuracy) diaktifkan pada smartphone driver. Aplikasi web dan mobile akan mencoba mendeteksi ulang koordinat secara otomatis sebelum foto diunggah.
            </p>
          </details>

          <details class="p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 list-none flex items-center justify-between">
              <span>Bagaimana cara login jika driver lupa nomor PIN?</span>
              <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p class="text-google-surface-600 mt-2 leading-relaxed">
              Driver dapat memindai kartu fisik QR ID card miliknya menggunakan kamera smartphone. Alternatif lain, Super Admin atau IT dapat melihat atau memperbarui PIN driver melalui tab <strong>"Kelola Pengguna"</strong>.
            </p>
          </details>

          <details class="p-4 rounded-2xl bg-google-surface-50 border border-google-surface-200 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 list-none flex items-center justify-between">
              <span>Bagaimana cara memperbaiki format penomoran spreadsheet yang berantakan?</span>
              <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p class="text-google-surface-600 mt-2 leading-relaxed">
              Buka Google Spreadsheet KPM Monitor ➔ klik menu atas <strong>"⚡ Sistem KPM"</strong> ➔ pilih <strong>"🛠️ Perbaiki Format & Grid Kolom"</strong>. Modul FixFormat otomatis merapikan semua nomor ke format 3-digit dan meratakan posisi teks.
            </p>
          </details>
        </div>
      </div>
    </div>
  </section>
</template>
