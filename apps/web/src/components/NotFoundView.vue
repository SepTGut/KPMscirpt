<script setup>
import Icon from './Icon.vue'

defineProps({
  path: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['navigate-home', 'navigate-driver'])
</script>

<template>
  <div class="panel text-center py-16 px-6 max-w-xl mx-auto my-8 space-y-5 animate-fadeIn shadow-lg">
    <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
      <Icon name="search" class-name="w-8 h-8 stroke-[2.2]" />
    </div>

    <div>
      <h1 class="text-2xl font-extrabold text-google-surface-900 dark:text-slate-100 tracking-tight">404 - Halaman Tidak Ditemukan</h1>
      <p class="text-xs text-google-surface-500 dark:text-slate-400 mt-2 leading-relaxed">
        Halaman <code v-if="path" class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">{{ path }}</code> tidak ditemukan atau telah dipindahkan.
      </p>
    </div>

    <div class="pt-3 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        class="btn-primary !py-2.5 !px-5 !text-xs !font-bold inline-flex items-center gap-2"
        @click="$emit('navigate-home')"
      >
        <Icon name="home" class-name="w-4 h-4" />
        <span>Kembali ke Dashboard</span>
      </button>
      <button
        type="button"
        class="btn-secondary !py-2.5 !px-5 !text-xs !font-bold inline-flex items-center gap-2"
        @click="$emit('navigate-driver')"
      >
        <Icon name="truck" class-name="w-4 h-4" />
        <span>Buka Portal Driver</span>
      </button>
    </div>
  </div>
</template>
