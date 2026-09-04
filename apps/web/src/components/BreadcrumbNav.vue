<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
    // Format: [{ label: 'Beranda', icon: '🏠', href: '#', current: false }]
  }
})

const emit = defineEmits(['navigate'])
</script>

<template>
  <nav aria-label="Breadcrumb" class="mb-4">
    <ol class="inline-flex flex-wrap items-center gap-1.5 text-xs text-google-surface-500 font-medium" itemscope itemtype="https://schema.org/BreadcrumbList">
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
          <span v-if="index > 0" class="text-slate-400 select-none text-[10px]" aria-hidden="true">›</span>

          <!-- Interactive link or active crumb -->
          <button
            v-if="!item.current && item.action"
            type="button"
            @click="$emit('navigate', item.action)"
            class="inline-flex items-center gap-1 text-google-surface-600 hover:text-google-blue-700 transition"
            itemprop="item"
          >
            <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span itemprop="name">{{ item.label }}</span>
          </button>
          <span
            v-else-if="item.current"
            class="inline-flex items-center gap-1 text-google-surface-900 font-bold"
            aria-current="page"
            itemprop="item"
          >
            <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span itemprop="name">{{ item.label }}</span>
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 text-google-surface-600"
            itemprop="item"
          >
            <span v-if="item.icon" aria-hidden="true">{{ item.icon }}</span>
            <span itemprop="name">{{ item.label }}</span>
          </span>
        </div>
        <meta itemprop="position" :content="String(index + 1)" />
      </li>
    </ol>
  </nav>
</template>
