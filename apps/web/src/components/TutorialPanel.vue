<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

const activeCategory = ref('overview')

const categories = [
  { id: 'overview', label: 'Ringkasan & Peran', iconName: 'doc' },
  { id: 'spreadsheet', label: 'Panduan Spreadsheet', iconName: 'doc' },
  { id: 'admin', label: 'Panduan Admin', iconName: 'shield' },
  { id: 'driver', label: 'Panduan Driver', iconName: 'truck' },
  { id: 'radar', label: 'Live Fleet Radar', iconName: 'map' },
  { id: 'super_admin', label: 'Super Admin', iconName: 'crown' },
  { id: 'faq', label: 'FAQ & Kendala', iconName: 'alert' }
]
</script>

<template>
  <section class="space-y-6 animate-fadeIn">
    <!-- Header Card -->
    <div class="bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
      <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
          <Icon name="tutorial" className="w-3.5 h-3.5 text-white" />
          <span>Buku Panduan Operasional & Dokumentasi</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Panduan Penggunaan Sistem KPM Line Feeding
        </h1>
        <p class="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
          Pelajari alur kerja terpadu penerbitan KPM, pembaruan status pengemudi di lapangan, pelacakan radar armada GPS real-time, dan manajemen pengguna.
        </p>
      </div>

      <!-- Background decorative circles -->
      <div class="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
    </div>

    <!-- Category Tabs Navigation -->
    <div class="flex bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-x-auto gap-1 scrollbar-none">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 focus-visible:outline-none"
        :class="activeCategory === cat.id ? 'bg-google-blue-600 text-white shadow-sm shadow-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
        @click="activeCategory = cat.id"
      >
        <Icon :name="cat.iconName" className="w-4 h-4" />
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <!-- Active Tab Content Area with Smooth Transition -->
    <Transition name="page-fade" mode="out-in">
      <div :key="activeCategory" class="space-y-6">
        <!-- TAB 1: OVERVIEW & 3-TIER ROLES -->
        <div v-if="activeCategory === 'overview'" class="space-y-6">
          <div class="panel space-y-4">
            <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
              <Icon name="doc" className="w-5 h-5 text-google-blue-600 dark:text-google-blue-400" />
              <span>Pengenalan Sistem &amp; 3 Peran Pengguna (RBAC)</span>
            </h2>
            <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Sistem KPM Line Feeding menggunakan arsitektur keamanan berbasis 3 tingkat hak akses. Setiap peran memiliki tanggung jawab dan wewenang yang terpisah untuk menjaga integritas data logistik:
            </p>

        <div class="grid gap-4 sm:grid-cols-3">
          <!-- Super Admin -->
          <div class="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                1. Super Admin
              </span>
              <Icon name="crown" className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <h3 class="text-sm font-bold text-amber-950 dark:text-amber-200">Pimpinan Operasional Dual-Mode</h3>
            <p class="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              Dapat beroperasi sebagai <strong>Admin</strong> maupun <strong>Driver</strong> secara bergantian melalui tombol Role Switcher di header. Memiliki wewenang mengelola staf dan melakukan override status darurat.
            </p>
          </div>

          <!-- Admin -->
          <div class="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                2. Admin Logistik
              </span>
              <Icon name="shield" className="w-5 h-5 text-google-blue-700 dark:text-google-blue-400" />
            </div>
            <h3 class="text-sm font-bold text-blue-950 dark:text-blue-200">Staf Pembuat &amp; Pemantau KPM</h3>
            <p class="text-xs text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
              Bertugas menerbitkan surat KPM baru, memantau radar armada, mengedit material sebelum jalan, dan mengarsipkan KPM selesai. <strong>Admin biasa tidak mengubah status pengiriman secara manual</strong> (status dikunci dan digerakkan oleh Driver di lapangan).
            </p>
          </div>

          <!-- Driver -->
          <div class="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                3. Driver (Pengemudi)
              </span>
              <Icon name="truck" className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h3 class="text-sm font-bold text-emerald-950 dark:text-emerald-200">Operator Lapangan Ekspedisi</h3>
            <p class="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
              Khusus mengakses Portal Driver untuk melihat penugasan, navigasi Google Maps 1-klik, dan mengunggah foto bukti keberangkatan/ketibaan dengan validasi GPS otomatis.
            </p>
          </div>
        </div>
      </div>

      <!-- Login Methods Guide -->
      <div class="panel space-y-4">
        <h2 class="text-base font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="shield" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
          <span>Tiga Cara Mudah Masuk ke Aplikasi (Login)</span>
        </h2>
        <div class="grid gap-3 sm:grid-cols-3 text-xs">
          <div class="p-3.5 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-1.5">
            <span class="font-bold text-google-blue-700 dark:text-google-blue-400 flex items-center gap-1.5">
              <Icon name="user" className="w-3.5 h-3.5" />
              <span>1. Username &amp; PIN</span>
            </span>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Ketik username (atau email) beserta nomor PIN yang telah didaftarkan oleh Super Admin.
            </p>
          </div>
          <div class="p-3.5 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-1.5">
            <span class="font-bold text-google-blue-700 dark:text-google-blue-400 flex items-center gap-1.5">
              <Icon name="external" className="w-3.5 h-3.5" />
              <span>2. Masuk dengan Google</span>
            </span>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Klik tombol Google untuk autentikasi 1-klik menggunakan email Gmail yang terdaftar di spreadsheet.
            </p>
          </div>
          <div class="p-3.5 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-1.5">
            <span class="font-bold text-google-blue-700 dark:text-google-blue-400 flex items-center gap-1.5">
              <Icon name="qr" className="w-3.5 h-3.5" />
              <span>3. Scan Kartu QR ID</span>
            </span>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Pindai kode QR unik pada kartu tanda pengenal fisik untuk langsung masuk tanpa mengetik PIN.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB SPREADSHEET: PANDUAN PENGGUNAAN SPREADSHEET -->
    <div v-else-if="activeCategory === 'spreadsheet'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="doc" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Buku Panduan &amp; Struktur Google Sheets KPM</span>
        </h2>
        <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
          Google Sheets berfungsi sebagai database master dan arsip riwayat KPM. Seluruh baris data terhubung langsung ke Web Portal dan aplikasi ponsel Driver secara real-time.
        </p>

        <!-- 4 Sheets Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">Sheet 1</span>
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">KPM Monitor</h3>
            </div>
            <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Arsip transaksi dokumen KPM. Memuat kolom <strong>No. KPM</strong>, <strong>Tanggal</strong>, <strong>Asal ➔ Tujuan</strong>, <strong>Driver</strong>, <strong>Status</strong>, <strong>URL Foto Muat &amp; Tiba</strong>, serta <strong>Koordinat GPS</strong>.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">Sheet 2</span>
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">DataBase (Master Material)</h3>
            </div>
            <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Katalog suku cadang. Header terletak di <strong>Baris 4</strong> dan data dimulai dari <strong>Baris 5</strong> (Kolom B = Kode Material, Kolom C = Nama Material, Kolom E = Satuan BUn).
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">Sheet 3</span>
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">Users (Akun Pengguna)</h3>
            </div>
            <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Master akun staf &amp; driver. Menyimpan Username, PIN (4-6 digit), Peran (Super Admin/Admin/Driver), WhatsApp, status aktif, dan QR token auto-login.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">Sheet 4</span>
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">Recipients (Daftar Penerima)</h3>
            </div>
            <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Daftar personil PIC penerima barang resmi per workshop (Candi Sewu, Tiron, Sukosari, Remul) untuk validasi serah terima di lokasi tujuan.
            </p>
          </div>
        </div>

        <!-- How to Use Sheet Menu -->
        <div class="pt-4 border-t border-google-surface-200 dark:border-slate-800 space-y-3">
          <h3 class="font-bold text-google-surface-900 dark:text-white text-sm flex items-center gap-2">
            <Icon name="lightning" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
            <span>Panduan Operasi Menu "⚡ Menu KPM" di Google Sheets</span>
          </h3>

          <div class="space-y-2 text-xs">
            <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-google-blue-700 dark:text-blue-200 font-bold flex items-center justify-center text-[10px]">1</span>
                <span>Mencetak Dokumen KPM Cetak Fisik</span>
              </div>
              <p class="text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                Pilih sel pada baris KPM yang ingin dicetak di sheet <code>KPM Monitor</code> ➔ Klik menu <strong>⚡ Menu KPM ➔ Cetak Dokumen KPM</strong>. Jendela print preview Letter Landscape akan muncul dengan QR Code KPP resmi.
              </p>
            </div>

            <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-google-blue-700 dark:text-blue-200 font-bold flex items-center justify-center text-[10px]">2</span>
                <span>Mencetak Lembar KPM Kosong (Blank Sheet)</span>
              </div>
              <p class="text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                Buka menu <strong>⚡ Menu KPM ➔ Cetak Lembar KPM Kosong (Blank Sheet)</strong>. Menghasilkan lembar Letter Landscape 8 baris siap tulis dengan area tanda tangan manual tanpa QR code.
              </p>
            </div>

            <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-google-blue-700 dark:text-blue-200 font-bold flex items-center justify-center text-[10px]">3</span>
                <span>Mencetak Kartu ID &amp; QR Auto-Login Driver</span>
              </div>
              <p class="text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                Buka menu <strong>⚡ Menu KPM ➔ Cetak Kartu QR Pengguna (ID Card)</strong>. Pilih akun driver yang ingin dicetak kartu fisiknya untuk mempermudah login di lapangan tanpa ketik PIN.
              </p>
            </div>

            <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-google-blue-700 dark:text-blue-200 font-bold flex items-center justify-center text-[10px]">4</span>
                <span>Merapikan Format Sheet (Fix Format)</span>
              </div>
              <p class="text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                Jika nomor KPM kehilangan leading zero atau font terlihat berantakan ➔ Klik menu <strong>⚡ Menu KPM ➔ Pemeliharaan &amp; Format ➔ Perbaiki Format Sheet</strong>. Sistem otomatis menata ulang grid dan format nomor 3 digit (001, 002).
              </p>
            </div>

            <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-google-blue-700 dark:text-blue-200 font-bold flex items-center justify-center text-[10px]">5</span>
                <span>Membersihkan Baris Kosong (Clean Orphaned Rows)</span>
              </div>
              <p class="text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">
                Buka menu <strong>⚡ Menu KPM ➔ Pemeliharaan &amp; Format ➔ Bersihkan Baris Kosong</strong> untuk memangkas baris sisa yang tidak sengaja terbuat agar file Google Sheets selalu cepat dan responsif.
              </p>
            </div>
          </div>
        </div>

        <!-- Do's and Don'ts -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div class="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2">
            <div class="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <Icon name="check" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>YANG HARUS DILAKUKAN (DO)</span>
            </div>
            <ul class="list-disc list-inside space-y-1 text-emerald-900/80 dark:text-emerald-300/90 leading-relaxed">
              <li>Gunakan format tanggal standar (YYYY-MM-DD atau DD/MM/YYYY).</li>
              <li>Input Kode Material sesuai yang tercantum di sheet <code>DataBase</code>.</li>
              <li>Jalankan fitur <strong>Fix Format</strong> secara berkala untuk menjaga kerapian sheet.</li>
            </ul>
          </div>

          <div class="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs space-y-2">
            <div class="font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
              <Icon name="alert" className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>YANG DILARANG KERAS (DON'T)</span>
            </div>
            <ul class="list-disc list-inside space-y-1 text-rose-900/80 dark:text-rose-300/90 leading-relaxed">
              <li><strong>JANGAN</strong> mengubah nama tab sheet (<code>KPM Monitor</code>, <code>DataBase</code>, <code>Users</code>, <code>Recipients</code>).</li>
              <li><strong>JANGAN</strong> memindahkan atau menghapus kolom header utama A s/d L.</li>
              <li><strong>JANGAN</strong> mengubah status manual saat armada di jalan; biarkan driver yang menyelesaikan via GPS.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: PANDUAN ADMIN -->
    <div v-else-if="activeCategory === 'admin'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="shield" className="w-5 h-5 text-google-blue-600 dark:text-google-blue-400" />
          <span>Panduan Lengkap Administrator Logistik</span>
        </h2>

        <div class="space-y-4">
          <!-- Step 1 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">Menerbitkan Surat KPM Baru</h3>
              <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
                Buka tab <strong>"Buat KPM Baru"</strong>. Pilih Penanggung Jawab (PIC), Nama Proyek, Lokasi Workshop Keberangkatan, dan Lokasi Workshop Tujuan.
              </p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">Mengisi Daftar Barang &amp; Material</h3>
              <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
                Klik tombol <strong>"Tambah Baris"</strong>. Masukkan deskripsi nama material, kuantitas, dan satuan (PCS, SET, BATANG, dsb).
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm flex items-center gap-1.5">
                <span>Memantau Pengiriman (Status Terkunci)</span>
                <Icon name="lock" className="w-3.5 h-3.5 text-slate-400" />
              </h3>
              <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
                Pada tab <strong>"Pantau KPM"</strong>, pantau progres perjalanan armada secara real-time. Status pengiriman terkunci karena status otomatis diperbarui oleh Driver saat Berangkat dan Tiba.
              </p>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              4
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">Mengedit Material Sebelum Truk Jalan</h3>
              <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
                Jika ada revisi barang sebelum driver berangkat, klik tombol <strong>"Kelola Material"</strong> pada KPM untuk menambah, mengubah kuantitas, atau menghapus item barang.
              </p>
            </div>
          </div>

          <!-- Step 5 -->
          <div class="flex gap-4 p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80">
            <div class="w-8 h-8 rounded-full bg-google-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              5
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-google-surface-900 dark:text-white text-sm">Mengarsipkan Dokumen Selesai</h3>
              <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
                Setelah barang tiba dan diverifikasi oleh penerima, klik tombol <strong>"Arsipkan KPM Selesai"</strong> untuk memindahkan data ke arsip T.Log agar tabel pantauan tetap bersih dan cepat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: PANDUAN DRIVER -->
    <div v-else-if="activeCategory === 'driver'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="truck" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Panduan Operasional Pengemudi Armada (Driver)</span>
        </h2>

        <div class="space-y-4">
          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 dark:text-emerald-200 text-sm">Melihat Penugasan Aktif</h3>
              <p class="text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                Saat masuk ke <strong>Portal Driver</strong>, daftar KPM yang siap dikirim akan tampil. Pilih kartu KPM yang akan Anda antarkan untuk membuka detail muatan dan rute.
              </p>
            </div>
          </div>

          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 dark:text-emerald-200 text-sm">Navigasi Rute 1-Klik Google Maps</h3>
              <p class="text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                Klik tombol <strong>"Buka Navigasi Rute di Google Maps"</strong>. Aplikasi langsung membuka Google Maps GPS turn-by-turn mengarahkan kendaraan Anda dari workshop asal ke workshop tujuan.
              </p>
            </div>
          </div>

          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 dark:text-emerald-200 text-sm">Konfirmasi Keberangkatan (Status: Berangkat)</h3>
              <p class="text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                Setelah barang selesai dimuat ke truk, ambil foto barang muatan menggunakan kamera, pastikan GPS aktif, lalu tekan tombol konfirmasi. Live Tracking radar otomatis mulai menyiarkan posisi truk Anda.
              </p>
            </div>
          </div>

          <div class="flex gap-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              4
            </div>
            <div class="space-y-1 text-xs">
              <h3 class="font-bold text-emerald-950 dark:text-emerald-200 text-sm">Konfirmasi Ketibaan &amp; Scan QR Penerima (Status: Tiba)</h3>
              <p class="text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                Setibanya di workshop tujuan, ambil foto barang saat dibongkar, lalu tekan tombol <strong>"Ambil Foto &amp; Tampilkan QR Penerima"</strong>. Layar HP Anda menampilkan QR Code besar untuk discan oleh Penerima barang di workshop tujuan. Begitu Penerima memilih namanya dan mengonfirmasi di ponselnya, ponsel Anda otomatis mendeteksi dan mencatat status <em>Tiba</em> lengkap dengan nama penerima di Kolom AA spreadsheet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: LIVE FLEET RADAR -->
    <div v-else-if="activeCategory === 'radar'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-4">
        <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="map" className="w-5 h-5 text-google-blue-600 dark:text-google-blue-400" />
          <span>Panduan Fitur Live Fleet GPS Radar</span>
        </h2>
        <p class="text-xs text-google-surface-600 dark:text-slate-300 leading-relaxed">
          Peta radar armada memvisualisasikan posisi truk pengiriman secara langsung dengan pembaruan setiap 3-10 detik melalui Firebase Realtime Database:
        </p>

        <div class="grid gap-3 sm:grid-cols-2 text-xs">
          <div class="p-4 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <h3 class="font-bold text-google-surface-900 dark:text-white flex items-center gap-1.5">
              <Icon name="truck" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
              <span>Ikon Truk &amp; Arah Hadap (Heading)</span>
            </h3>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Setiap truk ditampilkan dengan ikon kendaraan yang berputar otomatis mengikuti arah pergerakan kompas kendaraan di jalan raya.
            </p>
          </div>

          <div class="p-4 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <h3 class="font-bold text-google-surface-900 dark:text-white flex items-center gap-1.5">
              <Icon name="location" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
              <span>Jejak Rekam Lintasan (Polyline)</span>
            </h3>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Garis rekam jejak menandai rute aktual yang telah dilewati truk sejak berangkat dari workshop asal menuju lokasi tujuan.
            </p>
          </div>

          <div class="p-4 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <h3 class="font-bold text-google-surface-900 dark:text-white flex items-center gap-1.5">
              <Icon name="home" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
              <span>4 Landmark Workshop Tetap</span>
            </h3>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Peta dilengkapi koordinat tetap 4 workshop utama: <strong>Candi Sewu, Tiron, Sukosari, dan Remul</strong> sebagai titik acuan jarak.
            </p>
          </div>

          <div class="p-4 bg-google-surface-50 dark:bg-slate-800/60 rounded-2xl border border-google-surface-200 dark:border-slate-700/80 space-y-2">
            <h3 class="font-bold text-google-surface-900 dark:text-white flex items-center gap-1.5">
              <Icon name="lightning" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
              <span>Mode Simulasi GPS</span>
            </h3>
            <p class="text-google-surface-600 dark:text-slate-300 leading-relaxed">
              Untuk pengujian tanpa kendaraan fisik, jalankan <code>npm run test:gps:simulate</code> dari terminal untuk menjalankan simulasi pergerakan armada halus.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: SUPER ADMIN -->
    <div v-else-if="activeCategory === 'super_admin'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-5">
        <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="crown" className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          <span>Panduan Super Admin</span>
        </h2>

        <div class="space-y-4 text-xs">
          <!-- Role Switcher -->
          <div class="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
            <h3 class="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
              <Icon name="switch" className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Tombol Switcher Mode (Admin ⇄ Driver)</span>
            </h3>
            <p class="text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              Super Admin dapat beralih peran seketika dengan menekan tombol Mode di bar navigasi atas. Fitur ini memungkinkan pimpinan menguji tampilan driver atau mengambil pengiriman darurat tanpa perlu logout.
            </p>
          </div>

          <!-- Status Override -->
          <div class="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
            <h3 class="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
              <Icon name="lock" className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Override Status Darurat</span>
            </h3>
            <p class="text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              Berbeda dengan Admin biasa yang statusnya terkunci, Super Admin memiliki menu dropdown aktif pada tabel pantauan untuk mengoreksi status KPM jika terjadi kendala teknis pada perangkat driver.
            </p>
          </div>

          <!-- User Management -->
          <div class="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
            <h3 class="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
              <Icon name="users" className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>Menu Kelola Pengguna &amp; Cetak QR ID Card</span>
            </h3>
            <p class="text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              Buka tab <strong>"Kelola Pengguna"</strong> untuk menambah akun staf baru, mengubah peran (Super Admin, Admin, Driver), mengubah status Aktif/Nonaktif, dan mencetak ID Card QR Login.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: FAQ & TROUBLESHOOTING -->
    <div v-else-if="activeCategory === 'faq'" class="space-y-6 animate-fadeIn">
      <div class="panel space-y-4">
        <h2 class="text-lg font-bold text-google-surface-900 dark:text-white flex items-center gap-2">
          <Icon name="alert" className="w-5 h-5 text-google-blue-600 dark:text-google-blue-400" />
          <span>Pertanyaan Umum &amp; Solusi Kendala (FAQ)</span>
        </h2>

        <div class="space-y-3 text-xs">
          <details class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 dark:text-white list-none flex items-center justify-between">
              <span class="flex items-center gap-2">
                <Icon name="lock" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
                <span>Mengapa status pada tabel pantauan Admin terkunci?</span>
              </span>
              <Icon name="chevron-right" className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p class="text-google-surface-600 dark:text-slate-300 mt-2 leading-relaxed">
              Hal ini adalah aturan integritas data sistem. Status pengiriman harus digerakkan secara otentik oleh Driver di lapangan dengan bukti foto dan koordinat GPS. Hanya Super Admin yang dapat mengubah status secara manual jika ada keadaan darurat.
            </p>
          </details>

          <details class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 dark:text-white list-none flex items-center justify-between">
              <span class="flex items-center gap-2">
                <Icon name="location" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
                <span>Bagaimana jika sinyal GPS driver lemah atau tidak terdeteksi?</span>
              </span>
              <Icon name="chevron-right" className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p class="text-google-surface-600 dark:text-slate-300 mt-2 leading-relaxed">
              Pastikan pengaturan 'Lokasi Presisi Tinggi' (High Accuracy) diaktifkan pada smartphone driver. Aplikasi web dan mobile akan mencoba mendeteksi ulang koordinat secara otomatis sebelum foto diunggah.
            </p>
          </details>

          <details class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 dark:text-white list-none flex items-center justify-between">
              <span class="flex items-center gap-2">
                <Icon name="user" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
                <span>Bagaimana cara login jika driver lupa nomor PIN?</span>
              </span>
              <Icon name="chevron-right" className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p class="text-google-surface-600 dark:text-slate-300 mt-2 leading-relaxed">
              Driver dapat memindai kartu fisik QR ID card miliknya menggunakan kamera smartphone. Alternatif lain, Super Admin dapat melihat atau memperbarui PIN driver melalui tab <strong>"Kelola Pengguna"</strong>.
            </p>
          </details>

          <details class="p-4 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200 dark:border-slate-700/80 group cursor-pointer">
            <summary class="font-bold text-google-surface-900 dark:text-white list-none flex items-center justify-between">
              <span class="flex items-center gap-2">
                <Icon name="doc" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
                <span>Bagaimana cara merapikan format nomor atau tampilan spreadsheet?</span>
              </span>
              <Icon name="chevron-right" className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p class="text-google-surface-600 dark:text-slate-300 mt-2 leading-relaxed">
              Buka Google Spreadsheet KPM Monitor ➔ klik menu atas <strong>"Menu KPM"</strong> ➔ pilih submenu <strong>"Pemeliharaan &amp; Format"</strong> ➔ <strong>"Perbaiki Format Sheet"</strong>. Modul FixFormat otomatis merapikan semua nomor ke format 3-digit dan meratakan posisi teks.
            </p>
          </details>
        </div>
      </div>
    </div>
      </div>
    </Transition>
  </section>
</template>
