<script setup>
import Icon from './Icon.vue'

defineProps({
  items: {
    type: Array,
    required: true,
    // Format: [{ label: 'Beranda', iconName: 'home', action: () => {}, current: false }]
  }
})

const emit = defineEmits(['navigate'])
</script>

<template>
  <nav aria-label="Breadcrumb" class="mb-4">
    <ol class="inline-flex flex-wrap items-center gap-1.5 text-xs text-google-surface-500 dark:text-slate-400 font-medium" itemscope itemtype="https://schema.org/BreadcrumbList">
      <li
        v-for="(item, index) in items"
        :key="item.label"
        class="inline-flex items-center"
        itemprop="itemListElement"
        itemscope
        itemtype="https://schema.org/ListItem"
      >
        <div class="flex items-center gap-1.5">
          <!-- Separator chevron if not first -->
          <Icon v-if="index > 0" name="chevron-right" className="w-3 h-3 text-google-surface-400 dark:text-slate-500 select-none" />

          <!-- Interactive link or active crumb -->
          <button
            v-if="!item.current && item.action"
            type="button"
            @click="$emit('navigate', item.action)"
            class="inline-flex items-center gap-1.5 text-google-surface-600 dark:text-slate-400 hover:text-google-blue-700 dark:hover:text-blue-400 transition font-medium"
            itemprop="item"
          >
            <Icon v-if="item.iconName" :name="item.iconName" className="w-3.5 h-3.5 text-google-surface-500 dark:text-slate-400" />
            <span v-else-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span itemprop="name">{{ item.label }}</span>
          </button>
          <span
            v-else-if="item.current"
            class="inline-flex items-center gap-1.5 text-google-surface-900 dark:text-slate-100 font-bold"
            aria-current="page"
            itemprop="item"
          >
            <Icon v-if="item.iconName" :name="item.iconName" className="w-3.5 h-3.5 text-google-blue-600 dark:text-blue-400" />
            <span v-else-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span itemprop="name">{{ item.label }}</span>
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 text-google-surface-600 dark:text-slate-400"
            itemprop="item"
          >
            <Icon v-if="item.iconName" :name="item.iconName" className="w-3.5 h-3.5 text-google-surface-400 dark:text-slate-500" />
            <span v-else-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span itemprop="name">{{ item.label }}</span>
          </span>
        </div>
        <meta itemprop="position" :content="String(index + 1)" />
      </li>
    </ol>
  </nav>
</template>
