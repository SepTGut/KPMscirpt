<script setup>
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
    <!-- Truck (Driver) -->
    <rect v-if="name === 'truck'" x="1" y="3" width="15" height="13" />
    <polygon v-if="name === 'truck'" points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle v-if="name === 'truck'" cx="5.5" cy="18.5" r="2.5" />
    <circle v-if="name === 'truck'" cx="18.5" cy="18.5" r="2.5" />

    <!-- Settings / Config -->
    <circle v-if="name === 'settings'" cx="12" cy="12" r="3" />
    <path
      v-if="name === 'settings'"
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
    />

    <!-- Refresh -->
    <path v-if="name === 'refresh'" d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path v-if="name === 'refresh'" d="M3 3v5h5" />
    <path v-if="name === 'refresh'" d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path v-if="name === 'refresh'" d="M16 21h5v-5" />

    <!-- Map (Navigation) -->
    <polygon v-if="name === 'map'" points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line v-if="name === 'map'" x1="8" y1="2" x2="8" y2="18" />
    <line v-if="name === 'map'" x1="16" y1="6" x2="16" y2="22" />

    <!-- Camera -->
    <path v-if="name === 'camera'" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle v-if="name === 'camera'" cx="12" cy="13" r="4" />

    <!-- Check (Success) -->
    <polyline v-if="name === 'check'" points="20 6 9 17 4 12" />

    <!-- Alert / Warning -->
    <circle v-if="name === 'alert'" cx="12" cy="12" r="10" />
    <line v-if="name === 'alert'" x1="12" y1="8" x2="12" y2="12" />
    <line v-if="name === 'alert'" x1="12" y1="16" x2="12.01" y2="16" />

    <!-- Package (Box) -->
    <line v-if="name === 'package'" x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path v-if="name === 'package'" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline v-if="name === 'package'" points="3.27 6.96 12 12.01 20.73 6.96" />
    <line v-if="name === 'package'" x1="12" y1="22.08" x2="12" y2="12" />

    <!-- Chevron Right / Down -->
    <polyline v-if="name === 'chevron-right'" points="9 18 15 12 9 6" />
    <polyline v-if="name === 'chevron-down'" points="6 9 12 15 18 9" />

    <!-- Clock -->
    <circle v-if="name === 'clock'" cx="12" cy="12" r="10" />
    <polyline v-if="name === 'clock'" points="12 6 12 12 16 14" />

    <!-- User -->
    <path v-if="name === 'user'" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle v-if="name === 'user'" cx="12" cy="7" r="4" />

    <!-- Location (Pin) -->
    <path v-if="name === 'location'" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle v-if="name === 'location'" cx="12" cy="10" r="3" />

    <!-- Moon (Dark Mode) -->
    <path v-if="name === 'moon'" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />

    <!-- Sun (Light Mode) -->
    <circle v-if="name === 'sun'" cx="12" cy="12" r="5" />
    <line v-if="name === 'sun'" x1="12" y1="1" x2="12" y2="3" />
    <line v-if="name === 'sun'" x1="12" y1="21" x2="12" y2="23" />
    <line v-if="name === 'sun'" x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line v-if="name === 'sun'" x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line v-if="name === 'sun'" x1="1" y1="12" x2="3" y2="12" />
    <line v-if="name === 'sun'" x1="21" y1="12" x2="23" y2="12" />
    <line v-if="name === 'sun'" x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line v-if="name === 'sun'" x1="18.36" y1="5.64" x2="19.78" y2="4.22" />

    <!-- Close (X) -->
    <line v-if="name === 'close'" x1="18" y1="6" x2="6" y2="18" />
    <line v-if="name === 'close'" x1="6" y1="6" x2="18" y2="18" />

    <!-- Arrow Right -->
    <line v-if="name === 'arrow-right'" x1="5" y1="12" x2="19" y2="12" />
    <polyline v-if="name === 'arrow-right'" points="12 5 19 12 12 19" />

    <!-- Arrow Left / Back -->
    <line v-if="name === 'arrow-left'" x1="19" y1="12" x2="5" y2="12" />
    <polyline v-if="name === 'arrow-left'" points="12 19 5 12 12 5" />

    <!-- Eye / Eye Off -->
    <path v-if="name === 'eye'" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle v-if="name === 'eye'" cx="12" cy="12" r="3" />
    <path v-if="name === 'eye-off'" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line v-if="name === 'eye-off'" x1="1" y1="1" x2="23" y2="23" />

    <!-- Lock -->
    <rect v-if="name === 'lock'" x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path v-if="name === 'lock'" d="M7 11V7a5 5 0 0 1 10 0v4" />

    <!-- External Link -->
    <path v-if="name === 'external'" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline v-if="name === 'external'" points="15 3 21 3 21 9" />
    <line v-if="name === 'external'" x1="10" y1="14" x2="21" y2="3" />
  </svg>
</template>
