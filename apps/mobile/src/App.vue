<template>
  <div class="min-h-screen bg-[#f8f9fa] dark:bg-dark-bg text-slate-800 dark:text-slate-100 pb-20 font-sans text-sm transition-colors duration-200">
    <!-- Google 4-Color Top Accent Bar -->
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>

    <!-- Header (Google M3 Top AppBar) -->
    <header class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-20 shadow-xs transition-colors">
      <div class="max-w-xl mx-auto flex items-center justify-between">
        <!-- Brand & Title -->
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-bold text-white shadow-md shadow-google-blue-500/25 ring-2 ring-white/60 dark:ring-slate-800 transition-transform active:scale-95">
            <Icon name="truck" className="w-5 h-5 text-white" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Driver KPM</h1>
              <span class="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-google-blue-50 dark:bg-blue-950/60 text-google-blue-700 dark:text-blue-300 border border-google-blue-200 dark:border-blue-800 font-mono">v1P</span>
            </div>
            <span class="text-xs text-slate-500 dark:text-slate-400 block font-medium">Line Feeding System</span>
          </div>
        </div>

        <!-- Controls: GPS Beacon, Theme Toggle, Settings, Refresh -->
        <div class="flex items-center gap-1.5">
          <!-- GPS Status Beacon -->
          <div
            class="px-2.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 border shadow-2xs transition-colors"
            :class="trackingState.isTracking ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'"
            :title="trackingState.isTracking ? `GPS Aktif: ${trackingState.speedKmh} km/jam (±${trackingState.accuracy}m)` : 'GPS Standby'"
          >
            <span class="w-2 h-2 rounded-full" :class="trackingState.isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'"></span>
            <span class="hidden sm:inline">{{ trackingState.isTracking ? `GPS Live (${trackingState.speedKmh} km/h)` : 'GPS Standby' }}</span>
            <span class="sm:hidden">{{ trackingState.isTracking ? 'Live' : 'GPS' }}</span>
          </div>

          <!-- Theme Switcher -->
          <button
            type="button"
            @click="toggleTheme"
            class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xs focus-visible:outline-none"
            :title="isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'"
          >
            <Icon :name="isDark ? 'sun' : 'moon'" className="w-4 h-4" />
          </button>

          <!-- Settings Button -->
          <button
            type="button"
            @click="showSettingsModal = true"
            class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xs focus-visible:outline-none"
            title="Pengaturan Server"
          >
            <Icon name="settings" className="w-4 h-4" />
          </button>

          <!-- Refresh Button -->
          <button
            type="button"
            @click="loadData"
            :disabled="isLoading"
            class="px-3 py-1.5 rounded-xl bg-google-blue-50 dark:bg-blue-950/60 hover:bg-google-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold text-google-blue-700 dark:text-blue-300 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 border border-google-blue-200 dark:border-blue-800 shadow-2xs focus-visible:outline-none"
            title="Segarkan data tugas"
          >
            <Icon name="refresh" className="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
            <span class="hidden sm:inline">{{ isLoading ? 'Memuat...' : 'Segarkan' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-xl mx-auto p-4 sm:p-5 space-y-4 sm:space-y-5 animate-fadeIn">
      <!-- Driver Name Identity Card -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 dark:border-slate-800 flex items-center gap-3 shadow-xs transition-colors">
        <div class="w-9 h-9 rounded-xl bg-google-blue-50 dark:bg-blue-950/60 text-google-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Icon name="user" className="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Nama Pengemudi (Driver):
          </label>
          <input
            v-model="driverName"
            @change="saveDriverName"
            type="text"
            placeholder="Ketik nama Anda (tersimpan ke Kolom S)..."
            class="w-full mt-0.5 bg-transparent border-0 p-0 text-sm font-extrabold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 uppercase tracking-wide"
          />
        </div>
        <span class="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
          Auto-Save
        </span>
      </div>

      <!-- Segmented Pill Tabs -->
      <div class="grid grid-cols-2 gap-1.5 bg-slate-200/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/80 dark:border-slate-700/80 text-xs font-bold text-center shadow-inner">
        <button
          type="button"
          @click="activeTab = 'siap'"
          class="py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none"
          :class="activeTab === 'siap' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'"
        >
          <span>Siap Berangkat</span>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold transition-colors"
            :class="activeTab === 'siap' ? 'bg-white/25 text-white' : 'bg-slate-300/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
          >
            {{ siapList.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'jalan'"
          class="py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none"
          :class="activeTab === 'jalan' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/25' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'"
        >
          <span>Sedang Jalan</span>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold transition-colors"
            :class="activeTab === 'jalan' ? 'bg-white/25 text-white' : 'bg-slate-300/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
          >
            {{ jalanList.length }}
          </span>
        </button>
      </div>

      <!-- Notice Message Alert -->
      <Transition name="page-fade">
        <div
          v-if="noticeMsg"
          class="p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm transition animate-slideUpFade"
          :class="noticeType === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <Icon :name="noticeType === 'success' ? 'check' : 'alert'" className="w-4 h-4 shrink-0" />
            <span class="truncate">{{ noticeMsg }}</span>
          </div>
          <button
            type="button"
            @click="noticeMsg = ''"
            class="w-6 h-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs shrink-0 transition"
          >
            <Icon name="close" className="w-3.5 h-3.5" />
          </button>
        </div>
      </Transition>

      <!-- Loading State -->
      <div v-if="isLoading && !deliveries.length" class="text-center py-16 text-slate-500 dark:text-slate-400 text-sm animate-fadeIn">
        <div class="w-12 h-12 rounded-2xl bg-google-blue-50 dark:bg-blue-950/60 text-google-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3 animate-pulse">
          <Icon name="refresh" className="w-6 h-6 animate-spin" />
        </div>
        <p class="font-bold text-slate-800 dark:text-white">Memuat data tugas pengiriman...</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Mengambil data KPM terbaru dari sistem</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!currentList.length" class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 text-slate-500 dark:text-slate-400 shadow-xs transition-colors">
        <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
          <Icon name="package" className="w-7 h-7" />
        </div>
        <p class="text-base font-bold text-slate-900 dark:text-white">Tidak ada KPM pada tab ini</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {{ activeTab === 'siap' ? 'Belum ada surat KPM yang siap berangkat.' : 'Tidak ada armada KPM yang sedang dalam perjalanan.' }}
        </p>
      </div>

      <!-- Delivery Cards List -->
      <TransitionGroup name="list" tag="div" v-else class="space-y-4">
        <div
          v-for="item in currentList"
          :key="item.nomor || item.kpmId"
          class="card-interactive space-y-4 relative overflow-hidden"
        >
          <!-- Top Status Bar & Nomor -->
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="text-xs sm:text-sm font-mono font-extrabold text-google-blue-600 dark:text-blue-400 tracking-wider">
                {{ item.nomor || item.kpmId }}
              </span>
              <div class="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                {{ item.proyek || 'Line Feeding' }}
              </div>
            </div>

            <!-- Status Pill Badge -->
            <span
              class="px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shrink-0 border"
              :class="item.status === 'Jalan' || item.status === 'Berangkat' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'"
            >
              <span class="w-2 h-2 rounded-full" :class="item.status === 'Jalan' || item.status === 'Berangkat' ? 'bg-amber-500 animate-pulse' : 'bg-google-blue-500'"></span>
              <span>{{ item.status }}</span>
            </span>
          </div>

          <!-- Route Stepper Box -->
          <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs sm:text-sm">
            <div class="text-slate-800 dark:text-slate-200 truncate max-w-[45%]">
              <div class="text-[10px] text-google-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-google-blue-500"></span> ASAL
              </div>
              <div class="truncate mt-0.5 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                {{ item.wsAwal || '-' }}
              </div>
            </div>

            <div class="w-7 h-7 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 shrink-0 shadow-2xs border border-slate-200 dark:border-slate-600">
              <Icon name="arrow-right" className="w-3.5 h-3.5" />
            </div>

            <div class="text-right text-slate-800 dark:text-slate-200 truncate max-w-[45%]">
              <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                TUJUAN <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <div class="truncate mt-0.5 font-extrabold text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">
                {{ item.wsTujuan || '-' }}
              </div>
            </div>
          </div>

          <!-- Items List Section -->
          <div class="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div class="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 text-xs">
              <span class="flex items-center gap-1.5">
                <Icon name="package" className="w-3.5 h-3.5 text-google-blue-600 dark:text-blue-400" />
                <span>Daftar Material:</span>
              </span>
              <span class="text-google-blue-600 dark:text-blue-400 font-mono text-xs">
                {{ item.daftarBarang?.length || 1 }} Macam
              </span>
            </div>
            <div
              v-for="(barang, bIdx) in (item.daftarBarang || [{ nama: item.spek || 'Material', qty: item.qty || 1, uom: item.uom || 'PCS' }])"
              :key="bIdx"
              class="flex justify-between items-center text-xs py-1 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0"
            >
              <span class="truncate pr-3 text-slate-700 dark:text-slate-300 font-medium">
                {{ barang.nama || barang.spek }}
              </span>
              <span class="font-bold text-emerald-800 dark:text-emerald-300 font-mono shrink-0 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-md border border-emerald-200 dark:border-emerald-800">
                {{ barang.qty }} {{ barang.uom || 'PCS' }}
              </span>
            </div>
          </div>

          <!-- PIC, Driver & Timestamp Info -->
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1 font-medium">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <Icon name="user" className="w-3 h-3 text-slate-400" />
                <span>PIC: <b class="text-slate-800 dark:text-slate-200">{{ item.pic || '-' }}</b></span>
              </span>
              <span v-if="item.driver">
                Driver: <b class="text-google-blue-700 dark:text-blue-400">{{ item.driver }}</b>
              </span>
            </div>
            <span v-if="item.departureAt || item.waktuBerangkat" class="text-amber-700 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
              <Icon name="clock" className="w-3 h-3" />
              <span>{{ item.departureAt || item.waktuBerangkat }}</span>
            </span>
          </div>

          <!-- Actions: 1-Click GMaps Navigation + Primary Photo Button -->
          <div class="space-y-2 pt-1">
            <!-- 1-Click Google Maps Navigation -->
            <a
              :href="getNavUrl(item.wsTujuan)"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary w-full !py-2.5 !text-xs sm:!text-sm !font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Icon name="map" className="w-4 h-4 text-google-blue-600 dark:text-blue-400" />
              <span>Buka Navigasi GMaps ({{ item.wsTujuan || 'Tujuan' }})</span>
            </a>

            <!-- Action Button: Mulai Jalan / Konfirmasi Tiba -->
            <button
              type="button"
              @click="openModalFor(item)"
              class="w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              :class="item.status === 'Jalan' || item.status === 'Berangkat' ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-700 hover:to-teal-700 text-white shadow-emerald-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-700 hover:from-google-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25'"
            >
              <Icon name="camera" className="w-4 h-4" />
              <span>{{ item.status === 'Jalan' || item.status === 'Berangkat' ? 'Konfirmasi Tiba (Foto Bukti)' : 'Mulai Jalan (Foto Muat)' }}</span>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </main>

    <!-- Hidden Native Camera File Input -->
    <input
      ref="nativeCameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onPhotoSelected"
    />

    <!-- Camera / Action Bottom Sheet Modal -->
    <Transition name="modal-fade">
      <div
        v-if="selectedItem"
        class="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="!isSubmitting && closeModal()"
      >
        <div
          class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto relative animate-scaleIn transition-colors"
        >
          <!-- Loading Overlay during submission -->
          <div
            v-if="isSubmitting"
            class="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-t-3xl sm:rounded-3xl p-6 space-y-3"
          >
            <div class="w-12 h-12 border-4 border-google-blue-200 dark:border-blue-900 border-t-google-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
            <p class="text-base font-bold text-slate-900 dark:text-white">Mengunggah Bukti & Memperbarui Status...</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Harap tunggu, foto sedang disimpan ke Google Drive.</p>
          </div>

          <!-- Grab Handle Bar for Bottom Sheet -->
          <div class="w-14 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1"></div>

          <!-- Modal Header -->
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {{ selectedItem.status === 'Jalan' || selectedItem.status === 'Berangkat' ? 'Konfirmasi Kedatangan' : 'Konfirmasi Keberangkatan' }}
              </h3>
              <p class="text-xs sm:text-sm text-google-blue-600 dark:text-blue-400 font-mono font-bold mt-0.5">
                {{ selectedItem.nomor || selectedItem.kpmId }}
              </p>
            </div>
            <button
              type="button"
              @click="closeModal()"
              :disabled="isSubmitting"
              class="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-40"
              title="Tutup dialog"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          <!-- Route Visual Box -->
          <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs sm:text-sm space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400">Rute:</span>
              <span class="font-extrabold text-emerald-700 dark:text-emerald-400">{{ selectedItem.wsAwal }} ➔ {{ selectedItem.wsTujuan }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 dark:text-slate-400">Status Berikutnya:</span>
              <span class="font-bold text-amber-700 dark:text-amber-400">
                {{ selectedItem.status === 'Jalan' || selectedItem.status === 'Berangkat' ? 'Tiba di Workshop Tujuan' : 'Dalam Perjalanan (Jalan)' }}
              </span>
            </div>
          </div>

          <!-- Camera / Photo Zone -->
          <div class="space-y-2.5">
            <label class="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block">
              {{ selectedItem.status === 'Jalan' || selectedItem.status === 'Berangkat' ? 'Foto Bukti Kedatangan (Opsional)' : 'Foto Muatan Berangkat (Opsional)' }}
            </label>

            <div
              v-if="!photoPreview"
              @click="!isSubmitting && triggerCamera()"
              class="border-2 border-dashed border-google-blue-300 dark:border-blue-700/60 hover:border-google-blue-500 dark:hover:border-blue-500 bg-google-blue-50/50 dark:bg-blue-950/20 hover:bg-google-blue-50 dark:hover:bg-blue-950/40 rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 active:scale-[0.99] shadow-inner"
            >
              <div class="w-14 h-14 rounded-2xl bg-google-blue-100 dark:bg-blue-900/50 text-google-blue-600 dark:text-blue-300 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                <Icon name="camera" className="w-6 h-6" />
              </div>
              <p class="text-sm font-bold text-slate-900 dark:text-white">Ketuk untuk Buka Kamera</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Gunakan kamera HP untuk mengambil foto bukti</p>
            </div>

            <div v-else class="space-y-3">
              <div class="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 max-h-64 flex items-center justify-center">
                <img :src="photoPreview" alt="Preview Foto" class="w-full h-auto max-h-64 object-contain" />
                <div class="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Icon name="check" className="w-3.5 h-3.5" />
                  <span>Siap Dikirim</span>
                </div>
              </div>
              <button
                type="button"
                @click="triggerCamera"
                :disabled="isSubmitting"
                class="btn-secondary w-full !py-2.5 !text-xs font-bold"
              >
                <Icon name="refresh" className="w-3.5 h-3.5 mr-1" />
                <span>Ambil Ulang Foto</span>
              </button>
            </div>
          </div>

          <!-- Confirm Buttons -->
          <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="closeModal()"
              :disabled="isSubmitting"
              class="btn-secondary flex-1 !py-3 !text-xs sm:!text-sm !font-bold"
            >
              Batal
            </button>
            <button
              type="button"
              @click="submitUpdate"
              :disabled="isSubmitting"
              class="flex-[2] py-3 px-5 rounded-full text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              :class="selectedItem.status === 'Jalan' || selectedItem.status === 'Berangkat' ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-700 hover:to-teal-700 shadow-emerald-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-700 hover:from-google-blue-700 hover:to-indigo-700 shadow-blue-500/25'"
            >
              <Icon v-if="isSubmitting" name="refresh" className="w-4 h-4 animate-spin" />
              <Icon v-else name="check" className="w-4 h-4" />
              <span>{{ isSubmitting ? 'Mengirim Data...' : 'Kirim Sekarang' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Server Settings Modal -->
    <Transition name="modal-fade">
      <div
        v-if="showSettingsModal"
        class="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
        @click.self="showSettingsModal = false"
      >
        <div class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl animate-scaleIn transition-colors">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Icon name="settings" className="w-4 h-4" />
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Pengaturan Google Apps Script</h3>
            </div>
            <button
              type="button"
              @click="showSettingsModal = false"
              class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-base font-bold transition"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 text-xs sm:text-sm">
            <div>
              <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Google Apps Script Web App URL:</label>
              <input
                v-model="gasUrlInput"
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-google-blue-500 focus:ring-2 focus:ring-google-blue-500/20 font-mono transition-colors"
              />
            </div>

            <div>
              <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Driver API Token:</label>
              <input
                v-model="driverTokenInput"
                type="password"
                placeholder="Token rahasia Driver"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-google-blue-500 focus:ring-2 focus:ring-google-blue-500/20 font-mono transition-colors"
              />
            </div>

            <div>
              <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Firebase Realtime DB URL (Opsional):</label>
              <input
                v-model="firebaseUrlInput"
                type="url"
                placeholder="https://...-default-rtdb.firebaseio.com"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-google-blue-500 focus:ring-2 focus:ring-google-blue-500/20 font-mono transition-colors"
              />
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Digunakan untuk aliran koordinat GPS realtime per 10 detik ke peta admin.
              </p>
            </div>
          </div>

          <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="resetDefaultConfig"
              class="btn-secondary flex-1 !py-3 !text-xs sm:!text-sm !font-bold"
            >
              Reset Default
            </button>
            <button
              type="button"
              @click="saveConfig"
              class="btn-primary flex-1 !py-3 !text-xs sm:!text-sm !font-bold"
            >
              Simpan &amp; Muat
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Icon from './components/Icon.vue'
import { getDriverDeliveries, sendStatusUpdate, getActiveGasUrl, getActiveDriverToken, setCustomConfig } from './services/api'
import { compressImage } from './services/imageCompressor'
import { trackingState, startTracking, stopTracking, getCurrentCoordinates, getNavigationUrl, getFirebaseDbUrl, setFirebaseDbUrl, clearFirebaseTracking } from './services/trackingService'

// Theme State (Dark / Light)
const isDark = ref(false)

function initTheme() {
  const saved = localStorage.getItem('kpm_driver_theme')
  if (saved) {
    isDark.value = saved === 'dark'
  } else if (typeof window !== 'undefined' && window.matchMedia) {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme()
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('kpm_driver_theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

function applyTheme() {
  if (typeof document !== 'undefined') {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

function safeGetGasUrl() {
  try {
    return getActiveGasUrl()
  } catch {
    return localStorage.getItem('kpm_gas_url') || 'https://script.google.com/macros/s/AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA/exec'
  }
}

function safeGetDriverToken() {
  try {
    return getActiveDriverToken()
  } catch {
    return localStorage.getItem('kpm_driver_token') || ''
  }
}

const deliveries = ref([])
const activeTab = ref('siap')
const isLoading = ref(false)
const isSubmitting = ref(false)
const driverName = ref(localStorage.getItem('kpm_driver_name') || '')

const showSettingsModal = ref(false)
const gasUrlInput = ref(safeGetGasUrl())
const driverTokenInput = ref(safeGetDriverToken())
const firebaseUrlInput = ref(getFirebaseDbUrl())

function getNavUrl(dest) {
  return getNavigationUrl(dest)
}

const selectedItem = ref(null)
const photoPreview = ref('')
const nativeCameraInput = ref(null)

const noticeMsg = ref('')
const noticeType = ref('success')

function showNotice(msg, type = 'success') {
  noticeMsg.value = msg
  noticeType.value = type
  setTimeout(() => {
    if (noticeMsg.value === msg) noticeMsg.value = ''
  }, 4000)
}

const siapList = computed(() =>
  deliveries.value.filter(d =>
    d.status === 'Belum Berangkat' ||
    d.currentStatus === 'Belum Berangkat' ||
    d.statusCode === 'BELUM_BERANGKAT'
  )
)

const jalanList = computed(() =>
  deliveries.value.filter(d =>
    d.status === 'Jalan' ||
    d.currentStatus === 'Jalan' ||
    d.status === 'Berangkat' ||
    d.statusCode === 'BERANGKAT'
  )
)

const currentList = computed(() => activeTab.value === 'siap' ? siapList.value : jalanList.value)

function saveDriverName() {
  if (driverName.value && driverName.value.trim()) {
    driverName.value = driverName.value.trim().toUpperCase()
    localStorage.setItem('kpm_driver_name', driverName.value)
  } else {
    localStorage.removeItem('kpm_driver_name')
  }
}

function saveConfig() {
  setCustomConfig(gasUrlInput.value, driverTokenInput.value)
  setFirebaseDbUrl(firebaseUrlInput.value)
  showSettingsModal.value = false
  showNotice('Konfigurasi server & tracking disimpan.', 'success')
  loadData()
}

function resetDefaultConfig() {
  setCustomConfig('', '')
  setFirebaseDbUrl('')
  gasUrlInput.value = safeGetGasUrl()
  driverTokenInput.value = safeGetDriverToken()
  firebaseUrlInput.value = getFirebaseDbUrl()
  showSettingsModal.value = false
  showNotice('Konfigurasi dikembalikan ke default.', 'success')
  loadData()
}

async function loadData() {
  isLoading.value = true
  try {
    const data = await getDriverDeliveries()
    deliveries.value = data
    // Auto start/stop tracking based on active Jalan deliveries
    if (jalanList.value.length > 0) {
      startTracking(deliveries.value, driverName.value)
    } else {
      stopTracking()
    }
  } catch (err) {
    showNotice(err.message || 'Gagal memuat data.', 'error')
    if (err.message && err.message.includes('belum dikonfigurasi')) {
      showSettingsModal.value = true
    }
  } finally {
    isLoading.value = false
  }
}

function openModalFor(item) {
  if (isSubmitting.value) return
  selectedItem.value = item
  photoPreview.value = ''
}

function closeModal(force = false) {
  if (isSubmitting.value && !force) return
  selectedItem.value = null
  photoPreview.value = ''
}

function triggerCamera() {
  if (isSubmitting.value) return
  if (nativeCameraInput.value) {
    nativeCameraInput.value.click()
  }
}

async function onPhotoSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    isLoading.value = true
    photoPreview.value = await compressImage(file, 960, 0.7)
  } catch (err) {
    showNotice(err.message || 'Gagal memproses foto.', 'error')
  } finally {
    isLoading.value = false
  }
}

async function submitUpdate() {
  if (isSubmitting.value) return
  if (!selectedItem.value) return

  const isJalan = (selectedItem.value.status === 'Jalan' || selectedItem.value.statusCode === 'BERANGKAT')
  const targetStatus = isJalan ? 'Tiba' : 'Jalan'

  saveDriverName()
  isSubmitting.value = true
  const kpmNo = selectedItem.value.nomor || selectedItem.value.kpmId

  let coords = null
  try {
    coords = await getCurrentCoordinates()
  } catch (e) {
    console.warn('Current coords warning:', e)
  }

  try {
    await sendStatusUpdate({
      nomorKPM: kpmNo,
      statusKPM: targetStatus,
      fotoData: photoPreview.value,
      namaDriver: driverName.value || '',
      lokasiWorkshop: `${selectedItem.value.wsAwal || ''} ➔ ${selectedItem.value.wsTujuan || ''}`,
      latitude: coords?.latitude || '',
      longitude: coords?.longitude || ''
    })

    if (targetStatus === 'Tiba') {
      clearFirebaseTracking(kpmNo)
    }

    // Instantly close modal and clean state
    closeModal(true)
    isSubmitting.value = false

    showNotice(`✓ KPM ${kpmNo} berhasil diubah ke '${targetStatus}'!`, 'success')

    // Automatically switch tabs: if item moved to 'Jalan' -> open 'Sedang Jalan' tab
    if (targetStatus === 'Jalan') {
      activeTab.value = 'jalan'
    }

    await loadData()
  } catch (err) {
    showNotice(err.message || 'Gagal mengirim update status.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  initTheme()
  loadData()
})

onUnmounted(() => {
  stopTracking()
})
</script>
