<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  className: {
    type: String,
    default: 'w-4 h-4'
  }
})

// Accessible, crisp SVG vector paths
</script>

<template>
  <svg
    :class="className"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Home -->
    <path v-if="name === 'home'" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline v-if="name === 'home'" points="9 22 9 12 15 12 15 22" />

    <!-- Truck (Driver) -->
    <rect v-if="name === 'truck'" x="1" y="3" width="15" height="13" />
    <polygon v-if="name === 'truck'" points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle v-if="name === 'truck'" cx="5.5" cy="18.5" r="2.5" />
    <circle v-if="name === 'truck'" cx="18.5" cy="18.5" r="2.5" />

    <!-- Shield (Admin) -->
    <path v-if="name === 'shield'" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />

    <!-- Crown (Super Admin / IT) -->
    <path v-if="name === 'crown'" d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />

    <!-- User -->
    <path v-if="name === 'user'" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle v-if="name === 'user'" cx="12" cy="7" r="4" />

    <!-- Users -->
    <path v-if="name === 'users'" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle v-if="name === 'users'" cx="9" cy="7" r="4" />
    <path v-if="name === 'users'" d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path v-if="name === 'users'" d="M16 3.13a4 4 0 0 1 0 7.75" />

    <!-- Plus -->
    <line v-if="name === 'plus'" x1="12" y1="5" x2="12" y2="19" />
    <line v-if="name === 'plus'" x1="5" y1="12" x2="19" y2="12" />

    <!-- Trash -->
    <polyline v-if="name === 'trash'" points="3 6 5 6 21 6" />
    <path v-if="name === 'trash'" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />

    <!-- Refresh -->
    <path v-if="name === 'refresh'" d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <polyline v-if="name === 'refresh'" points="21 3 21 8 16 8" />

    <!-- Check -->
    <polyline v-if="name === 'check'" points="20 6 9 17 4 12" />

    <!-- Alert -->
    <circle v-if="name === 'alert'" cx="12" cy="12" r="10" />
    <line v-if="name === 'alert'" x1="12" y1="8" x2="12" y2="12" />
    <line v-if="name === 'alert'" x1="12" y1="16" x2="12.01" y2="16" />

    <!-- QR Code -->
    <rect v-if="name === 'qr'" x="3" y="3" width="7" height="7" />
    <rect v-if="name === 'qr'" x="14" y="3" width="7" height="7" />
    <rect v-if="name === 'qr'" x="14" y="14" width="7" height="7" />
    <rect v-if="name === 'qr'" x="3" y="14" width="7" height="7" />

    <!-- Document / Edit (KPM) -->
    <path v-if="name === 'doc'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline v-if="name === 'doc'" points="14 2 14 8 20 8" />
    <line v-if="name === 'doc'" x1="16" y1="13" x2="8" y2="13" />
    <line v-if="name === 'doc'" x1="16" y1="17" x2="8" y2="17" />
    <polyline v-if="name === 'doc'" points="10 9 9 9 8 9" />

    <!-- Map / Live Radar -->
    <polygon v-if="name === 'map'" points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line v-if="name === 'map'" x1="9" y1="3" x2="9" y2="18" />
    <line v-if="name === 'map'" x1="15" y1="6" x2="15" y2="21" />

    <!-- Eye (Show Password) -->
    <path v-if="name === 'eye'" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle v-if="name === 'eye'" cx="12" cy="12" r="3" />

    <!-- Eye Off (Hide Password) -->
    <path v-if="name === 'eye-off'" d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path v-if="name === 'eye-off'" d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path v-if="name === 'eye-off'" d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line v-if="name === 'eye-off'" x1="2" y1="2" x2="22" y2="22" />

    <!-- Chevron Right -->
    <polyline v-if="name === 'chevron-right'" points="9 18 15 12 9 6" />

    <!-- Close / X -->
    <line v-if="name === 'close'" x1="18" y1="6" x2="6" y2="18" />
    <line v-if="name === 'close'" x1="6" y1="6" x2="18" y2="18" />

    <!-- Lock -->
    <rect v-if="name === 'lock'" x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path v-if="name === 'lock'" d="M7 11V7a5 5 0 0 1 10 0v4" />

    <!-- External Link -->
    <path v-if="name === 'external'" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline v-if="name === 'external'" points="15 3 21 3 21 9" />
    <line v-if="name === 'external'" x1="10" y1="14" x2="21" y2="3" />

    <!-- Tutorial / Book -->
    <path v-if="name === 'tutorial'" d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path v-if="name === 'tutorial'" d="M6 6h10" />
    <path v-if="name === 'tutorial'" d="M6 10h10" />

    <!-- Switch / Arrows Cycle -->
    <path v-if="name === 'switch'" d="m16 3 4 4-4 4" />
    <path v-if="name === 'switch'" d="M20 7H4" />
    <path v-if="name === 'switch'" d="m8 21-4-4 4-4" />
    <path v-if="name === 'switch'" d="M4 17h16" />

    <!-- Logout -->
    <path v-if="name === 'logout'" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline v-if="name === 'logout'" points="16 17 21 12 16 7" />
    <line v-if="name === 'logout'" x1="21" y1="12" x2="9" y2="12" />

    <!-- Location / Pin -->
    <path v-if="name === 'location'" d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
    <circle v-if="name === 'location'" cx="12" cy="10" r="3" />

    <!-- Clock -->
    <circle v-if="name === 'clock'" cx="12" cy="12" r="10" />
    <polyline v-if="name === 'clock'" points="12 6 12 12 16 14" />

    <!-- Lightning / Flash -->
    <polygon v-if="name === 'lightning'" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />

    <!-- Box / Package -->
    <path v-if="name === 'box'" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline v-if="name === 'box'" points="3.27 6.96 12 12.01 20.73 6.96" />
    <line v-if="name === 'box'" x1="12" y1="22.08" x2="12" y2="12" />

    <!-- Search -->
    <circle v-if="name === 'search'" cx="11" cy="11" r="8" />
    <line v-if="name === 'search'" x1="21" y1="21" x2="16.65" y2="16.65" />

    <!-- Target / Crosshair -->
    <circle v-if="name === 'target'" cx="12" cy="12" r="10" />
    <circle v-if="name === 'target'" cx="12" cy="12" r="6" />
    <circle v-if="name === 'target'" cx="12" cy="12" r="2" />

    <!-- Building / Factory / Workshop -->
    <rect v-if="name === 'building'" x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path v-if="name === 'building'" d="M9 22v-4h6v4" />
    <path v-if="name === 'building'" d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />

    <!-- Printer -->
    <polyline v-if="name === 'printer'" points="6 9 6 2 18 2 18 9" />
    <path v-if="name === 'printer'" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect v-if="name === 'printer'" x="6" y="14" width="12" height="8" />

    <!-- Info -->
    <circle v-if="name === 'info'" cx="12" cy="12" r="10" />
    <line v-if="name === 'info'" x1="12" y1="16" x2="12" y2="12" />
    <line v-if="name === 'info'" x1="12" y1="8" x2="12.01" y2="8" />

    <!-- Arrow Right -->
    <line v-if="name === 'arrow-right'" x1="5" y1="12" x2="19" y2="12" />
    <polyline v-if="name === 'arrow-right'" points="12 5 19 12 12 19" />
  </svg>
</template>
