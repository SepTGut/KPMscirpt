<script setup>
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
    <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-rose-100 to-amber-100 border border-rose-200 flex items-center justify-center text-3xl shadow-inner">
      🔍
    </div>

    <div>
      <h1 class="text-2xl font-extrabold text-google-surface-900 tracking-tight">404 - Halaman Tidak Ditemukan</h1>
      <p class="text-xs text-google-surface-500 mt-2 leading-relaxed">
        Halaman <code v-if="path" class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700 text-[11px]">{{ path }}</code> tidak ditemukan atau telah dipindahkan.
      </p>
    </div>

    <div class="pt-3 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        class="btn-primary !py-2.5 !px-5 !text-xs !font-bold"
        @click="$emit('navigate-home')"
      >
        🏠 Kembali ke Dashboard
      </button>
      <button
        type="button"
        class="btn-secondary !py-2.5 !px-5 !text-xs !font-bold"
        @click="$emit('navigate-driver')"
      >
        🚚 Buka Portal Driver
      </button>
    </div>
  </div>
</template>
