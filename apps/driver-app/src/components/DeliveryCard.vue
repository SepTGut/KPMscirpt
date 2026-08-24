<template>
  <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg shadow-black/20 relative overflow-hidden transition active:scale-[0.99]">
    <!-- Top Status & Nomor -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <div>
        <span class="text-[11px] font-bold font-mono tracking-wide text-sky-400 uppercase">
          {{ delivery.nomor || delivery.kpmId }}
        </span>
        <h3 class="text-sm font-bold text-white mt-0.5 leading-snug">
          {{ delivery.proyek || 'Proyek Line Feeding' }}
        </h3>
      </div>
      <span
        class="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1 shrink-0"
        :class="statusBadgeClass"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass"></span>
        {{ delivery.status }}
      </span>
    </div>

    <!-- Route Badge Section -->
    <div class="bg-slate-900/60 rounded-xl p-2.5 flex items-center justify-between mb-3 border border-slate-700/40">
      <div class="text-left flex-1 min-w-0 pr-2">
        <div class="text-[10px] font-semibold text-slate-400 uppercase">Dari</div>
        <div class="text-xs font-bold text-slate-200 truncate">{{ delivery.wsAwal || '-' }}</div>
      </div>
      <div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 shrink-0">
        <ArrowRight class="w-3.5 h-3.5" />
      </div>
      <div class="text-right flex-1 min-w-0 pl-2">
        <div class="text-[10px] font-semibold text-slate-400 uppercase">Tujuan</div>
        <div class="text-xs font-bold text-emerald-400 truncate">{{ delivery.wsTujuan || '-' }}</div>
      </div>
    </div>

    <!-- Info Details: PIC, Items count, Timestamps -->
    <div class="space-y-1.5 text-xs text-slate-300 mb-4">
      <div class="flex items-center justify-between">
        <span class="text-slate-400 flex items-center gap-1.5">
          <User class="w-3.5 h-3.5 text-slate-400" />
          <span>PIC KPM:</span>
        </span>
        <span class="font-semibold text-slate-200">{{ delivery.pic || '-' }}</span>
      </div>

      <div v-if="delivery.waktuBerangkat" class="flex items-center justify-between">
        <span class="text-slate-400 flex items-center gap-1.5">
          <Clock class="w-3.5 h-3.5 text-slate-400" />
          <span>Berangkat:</span>
        </span>
        <span class="font-semibold text-sky-300">{{ delivery.waktuBerangkat }}</span>
      </div>

      <!-- Expandable Materials List -->
      <div class="pt-2 border-t border-slate-700/50">
        <button
          @click="isExpanded = !isExpanded"
          class="w-full flex items-center justify-between text-left text-slate-300 hover:text-white py-1 transition"
        >
          <span class="flex items-center gap-1.5 font-medium">
            <Package class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ delivery.items?.length || 1 }} Macam Material</span>
          </span>
          <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isExpanded }" />
        </button>

        <div v-if="isExpanded" class="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-700">
          <div
            v-for="(item, idx) in (delivery.items || [delivery])"
            :key="idx"
            class="text-[11px] bg-slate-900/40 p-2 rounded-lg border border-slate-800"
          >
            <div class="font-semibold text-slate-200">{{ item.spek || item.deskripsi || 'Material' }}</div>
            <div class="flex justify-between text-slate-400 mt-0.5">
              <span>Kode: {{ item.kode || '-' }}</span>
              <span class="font-mono text-emerald-300 font-bold">{{ item.qty || 1 }} {{ item.uom || 'PCS' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <button
      @click="$emit('action', delivery)"
      class="w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
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
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  }
  return 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
})

const statusDotClass = computed(() => {
  return isJalan.value ? 'bg-amber-400 animate-pulse' : 'bg-sky-400'
})

const actionButtonText = computed(() => {
  return isJalan.value ? 'Konfirmasi Tiba (Foto Bukti)' : 'Mulai Jalan (Foto Muat)'
})

const actionButtonClass = computed(() => {
  if (isJalan.value) {
    return 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/25'
  }
  return 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-500/25'
})
</script>
