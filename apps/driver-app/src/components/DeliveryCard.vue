<template>
  <div class="bg-google-surface-800/90 border border-google-surface-700/80 rounded-2xl p-4 shadow-m3-2 hover:shadow-m3-3 transition-all relative overflow-hidden active:scale-[0.99]">
    <!-- Top Status & Nomor -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <div>
        <span class="text-[11px] font-bold font-mono tracking-wider text-google-blue-400 uppercase">
          {{ delivery.nomor || delivery.kpmId }}
        </span>
        <h3 class="text-sm font-bold text-white mt-0.5 leading-snug">
          {{ delivery.proyek || 'Proyek Line Feeding' }}
        </h3>
      </div>
      <span
        class="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 shrink-0"
        :class="statusBadgeClass"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass"></span>
        {{ delivery.status }}
      </span>
    </div>

    <!-- Route Stepper Section (Google Blue origin -> Google Green dest) -->
    <div class="bg-google-surface-900/70 rounded-xl p-3 flex items-center justify-between mb-3 border border-google-surface-700/50">
      <div class="text-left flex-1 min-w-0 pr-2">
        <div class="text-[10px] font-bold text-google-blue-300 uppercase tracking-wider flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-google-blue-400"></span> DARI
        </div>
        <div class="text-xs font-bold text-slate-200 truncate mt-0.5">{{ delivery.wsAwal || '-' }}</div>
      </div>
      <div class="w-8 h-8 rounded-full bg-google-surface-800 flex items-center justify-center text-google-blue-400 shrink-0 border border-google-surface-700/80 shadow-sm">
        <ArrowRight class="w-4 h-4" />
      </div>
      <div class="text-right flex-1 min-w-0 pl-2">
        <div class="text-[10px] font-bold text-google-green-300 uppercase tracking-wider flex items-center justify-end gap-1">
          TUJUAN <span class="w-1.5 h-1.5 rounded-full bg-google-green-400"></span>
        </div>
        <div class="text-xs font-bold text-google-green-400 truncate mt-0.5">{{ delivery.wsTujuan || '-' }}</div>
      </div>
    </div>

    <!-- Info Details: PIC, Timestamps, Items count -->
    <div class="space-y-2 text-xs text-slate-300 mb-4">
      <div class="flex items-center justify-between">
        <span class="text-google-surface-300 flex items-center gap-1.5">
          <User class="w-3.5 h-3.5 text-google-blue-400" />
          <span>PIC KPM:</span>
        </span>
        <span class="font-semibold text-slate-100">{{ delivery.pic || '-' }}</span>
      </div>

      <div v-if="delivery.waktuBerangkat" class="flex items-center justify-between">
        <span class="text-google-surface-300 flex items-center gap-1.5">
          <Clock class="w-3.5 h-3.5 text-google-yellow-400" />
          <span>Berangkat:</span>
        </span>
        <span class="font-semibold text-google-blue-300">{{ delivery.waktuBerangkat }}</span>
      </div>

      <!-- Expandable Materials List -->
      <div class="pt-2 border-t border-google-surface-700/60">
        <button
          @click="isExpanded = !isExpanded"
          class="w-full flex items-center justify-between text-left text-slate-300 hover:text-white py-1 transition"
        >
          <span class="flex items-center gap-1.5 font-medium">
            <Package class="w-3.5 h-3.5 text-google-yellow-400" />
            <span>{{ delivery.items?.length || 1 }} Macam Material</span>
          </span>
          <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isExpanded }" />
        </button>

        <div v-if="isExpanded" class="mt-2 space-y-1.5 pl-2 border-l-2 border-google-surface-600">
          <div
            v-for="(item, idx) in (delivery.items || [delivery])"
            :key="idx"
            class="text-[11px] bg-google-surface-900/60 p-2.5 rounded-xl border border-google-surface-700/60"
          >
            <div class="font-semibold text-slate-100">{{ item.spek || item.deskripsi || 'Material' }}</div>
            <div class="flex justify-between text-google-surface-300 mt-1">
              <span>Kode: {{ item.kode || '-' }}</span>
              <span class="font-mono text-google-green-300 font-bold">{{ item.qty || 1 }} {{ item.uom || 'PCS' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Button (M3 Pill with Google Depth Gradient) -->
    <button
      @click="$emit('action', delivery)"
      class="w-full py-3 px-4 rounded-full font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-m3-2 transition active:scale-[0.98] ring-1 ring-white/10"
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

