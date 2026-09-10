<script setup>
import { useToast } from '../composables/useToast'
import Icon from './Icon.vue'

const { toasts, removeToast } = useToast()

const iconMap = {
  success: 'check',
  error: 'close',
  warning: 'alert',
  info: 'doc'
}

const colorMap = {
  success: {
    bg: 'bg-white dark:bg-slate-900 border-emerald-500/80 text-slate-800 dark:text-slate-100',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  },
  error: {
    bg: 'bg-white dark:bg-slate-900 border-rose-500/80 text-slate-800 dark:text-slate-100',
    iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
  },
  warning: {
    bg: 'bg-white dark:bg-slate-900 border-amber-500/80 text-slate-800 dark:text-slate-100',
    iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  },
  info: {
    bg: 'bg-white dark:bg-slate-900 border-google-blue-500/80 text-slate-800 dark:text-slate-100',
    iconBg: 'bg-blue-100 dark:bg-blue-950/80 text-google-blue-600 dark:text-google-blue-400',
    badge: 'bg-blue-50 text-google-blue-700 dark:bg-blue-900/40 dark:text-google-blue-300'
  }
}
</script>

<template>
  <div class="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all duration-200"
        :class="colorMap[t.type]?.bg || colorMap.info.bg"
      >
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          :class="colorMap[t.type]?.iconBg || colorMap.info.iconBg"
        >
          <Icon :name="iconMap[t.type] || 'doc'" className="w-5 h-5" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-bold truncate leading-tight">
              {{ t.title }}
            </h4>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-0.5 rounded-lg focus-visible:outline-none"
              @click="removeToast(t.id)"
              title="Tutup Notifikasi"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words">
            {{ t.message }}
          </p>
          <div v-if="t.actionText && t.onAction" class="mt-2.5">
            <button
              type="button"
              class="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition shadow-2xs"
              @click="t.onAction(); removeToast(t.id)"
            >
              {{ t.actionText }}
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
