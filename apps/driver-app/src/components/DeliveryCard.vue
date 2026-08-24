<template>
  <div class="bg-google-surface-800/90 border border-google-surface-700/80 rounded-3xl p-5 shadow-m3-2 hover:shadow-m3-3 transition-all relative overflow-hidden active:scale-[0.99] space-y-4">
    <!-- Top Status & Nomor -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <span class="text-sm font-bold font-mono tracking-wider text-google-blue-400 uppercase">
          {{ delivery.nomor || delivery.kpmId }}
        </span>
        <h3 class="text-base font-bold text-white mt-1 leading-snug">
          {{ delivery.proyek || 'Proyek Line Feeding' }}
        </h3>
      </div>
      <span
        class="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shrink-0"
        :class="statusBadgeClass"
      >
        <span class="w-2 h-2 rounded-full" :class="statusDotClass"></span>
        {{ delivery.status }}
      </span>
    </div>

    <!-- Route Stepper Section (Google Blue origin -> Google Green dest) -->
    <div class="bg-google-surface-900/80 rounded-2xl p-4 flex items-center justify-between border border-google-surface-700/60">
      <div class="text-left flex-1 min-w-0 pr-2">
        <div class="text-xs font-bold text-google-blue-300 uppercase tracking-wider flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-google-blue-400"></span> DARI
        </div>
        <div class="text-sm sm:text-base font-extrabold text-white truncate mt-1">{{ delivery.wsAwal || '-' }}</div>
      </div>
      <div class="w-9 h-9 rounded-full bg-google-surface-800 flex items-center justify-center text-google-blue-400 shrink-0 border border-google-surface-700/80 shadow-sm">
        <ArrowRight class="w-4 h-4" />
      </div>
      <div class="text-right flex-1 min-w-0 pl-2">
        <div class="text-xs font-bold text-google-green-300 uppercase tracking-wider flex items-center justify-end gap-1.5">
          TUJUAN <span class="w-2 h-2 rounded-full bg-google-green-400"></span>
        </div>
        <div class="text-sm sm:text-base font-extrabold text-google-green-400 truncate mt-1">{{ delivery.wsTujuan || '-' }}</div>
      </div>
    </div>

    <!-- Info Details: PIC, Timestamps, Items count -->
    <div class="space-y-2.5 text-xs sm:text-sm text-slate-300">
      <div class="flex items-center justify-between">
        <span class="text-google-surface-300 flex items-center gap-2">
          <User class="w-4 h-4 text-google-blue-400" />
          <span>PIC KPM:</span>
        </span>
        <span class="font-bold text-white">{{ delivery.pic || '-' }}</span>
      </div>

      <div v-if="delivery.waktuBerangkat" class="flex items-center justify-between">
        <span class="text-google-surface-300 flex items-center gap-2">
          <Clock class="w-4 h-4 text-google-yellow-400" />
          <span>Berangkat:</span>
        </span>
        <span class="font-bold text-google-yellow-300 font-mono">{{ delivery.waktuBerangkat }}</span>
      </div>

      <!-- Expandable Materials List -->
      <div class="pt-2 border-t border-google-surface-700/60">
        <button
          @click="isExpanded = !isExpanded"
          class="w-full flex items-center justify-between text-left text-slate-200 hover:text-white py-1.5 transition font-semibold"
        >
          <span class="flex items-center gap-2">
            <Package class="w-4 h-4 text-google-yellow-400" />
            <span>{{ delivery.items?.length || 1 }} Macam Material</span>
          </span>
          <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isExpanded }" />
        </button>

        <div v-if="isExpanded" class="mt-2 space-y-2 pl-2 border-l-2 border-google-surface-600">
          <div
            v-for="(item, idx) in (delivery.items || [delivery])"
            :key="idx"
            class="text-xs sm:text-sm bg-google-surface-900/60 p-3 rounded-xl border border-google-surface-700/60"
          >
            <div class="font-semibold text-slate-100">{{ item.spek || item.deskripsi || 'Material' }}</div>
            <div class="flex justify-between items-center text-google-surface-300 mt-1.5">
              <span>Kode: {{ item.kode || '-' }}</span>
              <span class="font-mono text-google-green-300 font-bold px-2 py-0.5 bg-google-green-950/40 rounded-md border border-google-green-800/40">{{ item.qty || 1 }} {{ item.uom || 'PCS' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Button (Enlarged M3 Pill) -->
    <button
      @click="$emit('action', delivery)"
      class="w-full py-3.5 px-5 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-m3-2 transition active:scale-[0.98] ring-1 ring-white/10"
      :class="actionButtonClass"
    >
      <Camera class="w-4 h-4" />
      <span>{{ actionButtonText }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowRight, User, Clock, Package, ChevronDown, Camera } from 'lucide-vue-next'

const props = defineProps({
  delivery: { type: Object, required: true }
})

defineEmits(['action'])

const isExpanded = ref(false)

const isJalan = computed(() => props.delivery.status === 'Jalan')

const statusBadgeClass = computed(() => {
  if (isJalan.value) {
    return 'bg-google-yellow-500/20 text-google-yellow-300 border border-google-yellow-500/40'
  }
  return 'bg-google-blue-500/20 text-google-blue-300 border border-google-blue-500/40'
})

const statusDotClass = computed(() => {
  return isJalan.value ? 'bg-google-yellow-400 animate-pulse' : 'bg-google-blue-400'
})

const actionButtonText = computed(() => {
  return isJalan.value ? 'Konfirmasi Tiba (Foto Bukti)' : 'Mulai Jalan (Foto Muat)'
})

const actionButtonClass = computed(() => {
  if (isJalan.value) {
    return 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-500 hover:to-teal-500 text-white shadow-google-green-500/25'
  }
  return 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 text-white shadow-google-blue-500/25'
})
</script>

