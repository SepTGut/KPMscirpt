<template>
  <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[60vh] sm:h-[700px] relative">
    <!-- Top Map Control Bar -->
    <div class="px-4 sm:px-5 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-600 to-teal-500 flex items-center justify-center text-white text-lg shadow-sm">
          <Icon name="map" class-name="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Live Fleet Radar</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{{ activeVehicles.length }} Armada Live</span>
            </span>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400">Pelacakan Real-Time &amp; Telemetri Armada Line Feeding</span>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center flex-wrap gap-2">
        <!-- Basemap toggle: Road vs Satellite -->
        <button
          @click="toggleMapLayer"
          class="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm"
          :title="isSatellite ? 'Ubah ke Tampilan Peta' : 'Ubah ke Tampilan Satelit'"
        >
          <Icon :name="isSatellite ? 'map' : 'layers'" class-name="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>{{ isSatellite ? 'Peta Jalan' : 'Satelit' }}</span>
        </button>

        <!-- Toggle Workshops Visibility -->
        <button
          @click="toggleWorkshops"
          class="px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 border shadow-sm"
          :class="showWorkshops ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'"
          title="Tampilkan / Sembunyikan Pos Workshop"
        >
          <Icon name="briefcase" class-name="w-3.5 h-3.5" />
          <span>Pos Workshop</span>
        </button>

        <!-- Fit all markers -->
        <button
          @click="fitAllMarkers"
          class="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm"
          title="Fokuskan Semua Titik"
        >
          <Icon name="target" class-name="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>Fokus</span>
        </button>

        <!-- Refresh button -->
        <button
          @click="refreshTrackingData"
          :disabled="isRefreshing"
          class="px-3.5 py-1.5 rounded-full bg-google-blue-50 dark:bg-blue-950/60 hover:bg-google-blue-100 dark:hover:bg-blue-900/50 text-google-blue-700 dark:text-blue-300 text-xs font-bold transition flex items-center gap-1.5 border border-google-blue-200 dark:border-blue-800/60 shadow-sm disabled:opacity-50"
        >
          <Icon name="refresh" class-name="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshing }" />
          <span>{{ isRefreshing ? 'Menyinkronkan...' : 'Sinkron' }}</span>
        </button>
      </div>
    </div>

    <!-- Map Canvas & Overlays -->
    <div class="flex-1 relative w-full h-full min-h-[400px]">
      <!-- Leaflet Canvas -->
      <div ref="mapContainer" class="w-full h-full z-0 bg-slate-100 dark:bg-slate-950"></div>

      <!-- Workshop Legend Overlay (Top Left inside map) -->
      <div
        v-if="showWorkshops"
        class="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-md z-[400] text-[11px] hidden sm:block pointer-events-auto"
      >
        <div class="font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>Titik Workshop Tetap</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1">
          <div v-for="ws in WORKSHOPS" :key="ws.name" class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: ws.color }"></span>
            <span class="font-semibold">{{ ws.name }}</span>
          </div>
        </div>
      </div>

      <!-- Floating Vehicle List (Bottom Left) -->
      <div
        v-if="activeVehicles.length > 0"
        class="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 shadow-xl z-[400] max-h-48 overflow-y-auto space-y-2"
      >
        <div class="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Armada Aktif di Jalan
          </span>
          <span class="font-mono text-google-blue-600 dark:text-blue-400 font-bold">{{ activeVehicles.length }} Truk</span>
        </div>
        <div
          v-for="v in activeVehicles"
          :key="v.kpmId"
          @click="focusVehicle(v)"
          class="p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-google-blue-50/70 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 text-xs hover:border-google-blue-300 dark:hover:border-blue-600"
        >
          <div class="min-w-0 flex-1">
            <div class="font-bold text-slate-900 dark:text-white truncate">{{ v.nomor || v.kpmId }}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ v.driverName || v.driver || 'Driver' }} ({{ v.origin || v.lokasiBerangkat }} ➔ {{ v.destination || v.lokasiTiba }})</div>
          </div>
          <span class="shrink-0 font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[10px]">
            {{ v.speedKmh || 0 }} km/h
          </span>
        </div>
      </div>

      <!-- Empty Notice if No Active Trips -->
      <div
        v-else-if="!isRefreshing"
        class="absolute bottom-4 left-4 right-4 sm:right-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-lg z-[400] text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2"
      >
        <Icon name="info" class-name="w-4 h-4 text-google-blue-600 dark:text-blue-400 shrink-0" />
        <span>Belum ada armada berstatus <b>"Jalan"</b> saat ini. Peta menampilkan pos workshop operasional.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from './Icon.vue'
import { useTheme } from '../composables/useTheme'

const props = defineProps({
  monitoringData: { type: Array, default: () => [] },
  firebaseDbUrl: { type: String, default: '' }
})

const { isDark } = useTheme()

const DEFAULT_FIREBASE_URL = 'https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app'

const mapContainer = ref(null)
let map = null
let tileLayer = null
let workshopGroup = null
let trailsGroup = null

const isSatellite = ref(false)
const showWorkshops = ref(true)

// Persistent references for smooth transitions
const vehicleMarkersMap = new Map() // key -> { marker, polyline, history: [] }

const activeVehicles = ref([])
const isRefreshing = ref(false)
let pollingTimer = null

const WORKSHOPS = [
  { name: 'Candi Sewu', lat: -7.6162207, lng: 111.5215291, color: '#2563eb', address: 'Jl. Candi Sewu No.30, Madiun Lor' },
  { name: 'Tiron', lat: -7.5822966, lng: 111.5420679, color: '#4f46e5', address: 'Workshop Tiron (Dekat Pengadilan Agama)' },
  { name: 'Sukosari', lat: -7.6114512, lng: 111.5348394, color: '#059669', address: 'Workshop PT Rekaindo Global Jasa (Sukosari)' },
  { name: 'Remul', lat: -7.6101753, lng: 111.5490581, color: '#d97706', address: 'Gudang PT Rekaindo Global Jasa (Rejomulyo)' }
]

function getTileUrl() {
  if (isSatellite.value) {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  }
  if (isDark.value) {
    return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  }
  return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
}

function updateTileLayer() {
  if (!map) return
  const url = getTileUrl()
  const maxZoom = isSatellite.value ? 18 : 19
  const subdomains = isSatellite.value ? 'abc' : 'abcd'

  if (tileLayer) {
    map.removeLayer(tileLayer)
  }

  tileLayer = L.tileLayer(url, {
    maxZoom,
    subdomains,
    attribution: isSatellite.value ? '&copy; Esri' : '&copy; CARTO'
  }).addTo(map)
}

function toggleMapLayer() {
  isSatellite.value = !isSatellite.value
  updateTileLayer()
}

function toggleWorkshops() {
  showWorkshops.value = !showWorkshops.value
  if (!map || !workshopGroup) return
  if (showWorkshops.value) {
    map.addLayer(workshopGroup)
  } else {
    map.removeLayer(workshopGroup)
  }
}

function createTruckIcon(vehicle) {
  const speed = vehicle.speedKmh || 0
  const isMoving = speed > 2
  const heading = vehicle.heading ? Number(vehicle.heading) : 0

  return L.divIcon({
    className: 'custom-fleet-marker',
    html: `
      <div class="fleet-marker-container">
        ${isMoving ? '<div class="fleet-radar-ring"></div>' : ''}
        <div class="fleet-truck-body" style="transform: rotate(${heading}deg);">
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <div class="fleet-speed-badge">
          ${speed} km/h
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -24]
  })
}

function createWorkshopIcon(ws) {
  return L.divIcon({
    className: 'custom-workshop-marker',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-700 dark:border-slate-300 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-md">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
          </svg>
        </div>
        <div class="bg-slate-800 dark:bg-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow border border-slate-600 dark:border-slate-800">
          ${ws.name}
        </div>
      </div>
    `,
    iconSize: [32, 45],
    iconAnchor: [16, 22],
    popupAnchor: [0, -22]
  })
}

function initMap() {
  if (!mapContainer.value || map) return

  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false
  }).setView([-7.618, 111.530], 13)

  L.control.zoom({ position: 'topright' }).addTo(map)

  // Initialize Tile Layer according to current theme/satellite state
  updateTileLayer()

  trailsGroup = L.layerGroup().addTo(map)
  workshopGroup = L.layerGroup().addTo(map)

  // Add permanent workshop markers
  WORKSHOPS.forEach(ws => {
    const marker = L.marker([ws.lat, ws.lng], { icon: createWorkshopIcon(ws) })
    marker.bindPopup(`
      <div class="p-2 space-y-1 text-xs">
        <div class="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" style="background-color: ${ws.color}"></span>
          Workshop ${ws.name}
        </div>
        <div class="text-slate-500 dark:text-slate-400 font-mono">Koordinat: ${ws.lat}, ${ws.lng}</div>
        <div class="text-slate-600 dark:text-slate-300 text-[11px]">${ws.address}</div>
      </div>
    `)
    workshopGroup.addLayer(marker)
  })

  fitAllMarkers()
}

async function fetchFirebaseTracking() {
  const url = props.firebaseDbUrl || localStorage.getItem('kpm_firebase_url') || DEFAULT_FIREBASE_URL
  if (!url || !url.startsWith('http')) return {}

  try {
    const endpoint = `${url.replace(/\/+$/, '')}/active_tracking.json`
    const res = await fetch(endpoint, { cache: 'no-store' })
    if (!res.ok) return {}
    const json = await res.json()
    return (json && typeof json === 'object') ? json : {}
  } catch (e) {
    console.warn('[LiveMap Firebase Error]', e)
    return {}
  }
}

async function refreshTrackingData() {
  isRefreshing.value = true
  try {
    const fbData = await fetchFirebaseTracking()
    const activeFromFirebase = Object.values(fbData).filter(v => v && v.latitude && v.longitude)

    const list = []
    const processedKpm = new Set()

    activeFromFirebase.forEach(item => {
      list.push(item)
      processedKpm.add(String(item.kpmId || '').toUpperCase())
    })

    // Add any monitoring items that are in 'Jalan' but might not have live Firebase stream yet
    if (Array.isArray(props.monitoringData)) {
      props.monitoringData.forEach(m => {
        const kpmKey = String(m.kpmId || m.nomor || '').toUpperCase()
        if ((m.status === 'Jalan' || m.statusCode === 'BERANGKAT') && !processedKpm.has(kpmKey)) {
          const wsAwal = WORKSHOPS.find(w => w.name.toLowerCase() === (m.lokasiBerangkat || '').toLowerCase())
          if (wsAwal) {
            list.push({
              kpmId: m.nomor || m.kpmId,
              driverName: m.driver || m.pic || 'Driver',
              status: 'Jalan',
              origin: m.lokasiBerangkat || '-',
              destination: m.lokasiTiba || '-',
              proyek: m.proyek || 'Line Feeding',
              latitude: wsAwal.lat,
              longitude: wsAwal.lng,
              speedKmh: 0,
              lastUpdated: Date.now()
            })
          }
        }
      })
    }

    activeVehicles.value = list
    updateSmoothVehicleMarkers()
  } finally {
    isRefreshing.value = false
  }
}

function buildPopupContent(v) {
  const gmapsRouterUrl = `https://www.google.com/maps/dir/?api=1&origin=${v.latitude},${v.longitude}&destination=${encodeURIComponent((v.destination || '') + ' Workshop')}&travelmode=driving`
  return `
    <div class="p-3 text-xs space-y-2 min-w-[220px]">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
        <span class="font-extrabold font-mono text-google-blue-700 dark:text-blue-400 text-sm">${v.kpmId || '-'}</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Sedang Jalan</span>
      </div>
      <div class="space-y-1 text-slate-600 dark:text-slate-300">
        <div>Driver: <b class="text-slate-900 dark:text-slate-100">${v.driverName || 'Driver'}</b></div>
        <div>Rute: <b>${v.origin || '-'} ➔ ${v.destination || '-'}</b></div>
        <div>Kecepatan: <b class="text-emerald-700 dark:text-emerald-400 font-mono">${v.speedKmh || 0} km/jam</b></div>
      </div>
      <a
        href="${gmapsRouterUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-1.5 w-full text-center py-2 bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-sm hover:from-google-blue-500 hover:to-indigo-500 mt-2 transition text-xs"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
        <span>Buka Rute Google Maps</span>
      </a>
    </div>
  `
}

/**
 * Updates marker positions smoothly without wiping layers (smooth CSS interpolation)
 */
function updateSmoothVehicleMarkers() {
  if (!map) return

  const currentKeys = new Set()

  activeVehicles.value.forEach(v => {
    if (!v.latitude || !v.longitude) return
    const key = String(v.kpmId || '').trim()
    if (!key) return
    currentKeys.add(key)

    const targetPos = [Number(v.latitude), Number(v.longitude)]

    if (vehicleMarkersMap.has(key)) {
      const existing = vehicleMarkersMap.get(key)
      // Smoothly update existing marker position
      existing.marker.setLatLng(targetPos)
      existing.marker.setIcon(createTruckIcon(v))
      existing.marker.setPopupContent(buildPopupContent(v))

      // Update breadcrumb trail line
      existing.history.push(targetPos)
      if (existing.history.length > 25) existing.history.shift()
      existing.polyline.setLatLngs(existing.history)
    } else {
      // New vehicle marker
      const marker = L.marker(targetPos, { icon: createTruckIcon(v) })
      marker.bindPopup(buildPopupContent(v))
      marker.addTo(map)

      // Breadcrumb polyline trail with smooth dash
      const polyline = L.polyline([targetPos], {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 6',
        lineCap: 'round'
      }).addTo(trailsGroup)

      vehicleMarkersMap.set(key, {
        marker,
        polyline,
        history: [targetPos]
      })
    }
  })

  // Cleanup removed/completed vehicles
  vehicleMarkersMap.forEach((val, key) => {
    if (!currentKeys.has(key)) {
      map.removeLayer(val.marker)
      trailsGroup.removeLayer(val.polyline)
      vehicleMarkersMap.delete(key)
    }
  })
}

function focusVehicle(v) {
  if (!map || !v.latitude || !v.longitude) return
  map.flyTo([v.latitude, v.longitude], 14, { duration: 1.2 })
}

function fitAllMarkers() {
  if (!map) return
  const points = []
  if (showWorkshops.value) {
    WORKSHOPS.forEach(w => points.push([w.lat, w.lng]))
  }
  activeVehicles.value.forEach(v => {
    if (v.latitude && v.longitude) {
      points.push([v.latitude, v.longitude])
    }
  })
  if (points.length > 0) {
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [40, 40] })
  }
}

// Watch theme changes to switch between CartoDB dark/light tile layers
watch(isDark, () => {
  if (!isSatellite.value) {
    updateTileLayer()
  }
})

watch(() => props.monitoringData, () => {
  refreshTrackingData()
}, { deep: true })

onMounted(() => {
  initMap()
  refreshTrackingData()
  pollingTimer = setInterval(refreshTrackingData, 3000)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  vehicleMarkersMap.forEach(val => {
    if (map) {
      map.removeLayer(val.marker)
      trailsGroup.removeLayer(val.polyline)
    }
  })
  vehicleMarkersMap.clear()
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style>
/* Custom Smooth Animated Fleet Marker */
.custom-fleet-marker {
  background: transparent;
  border: none;
  transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
}

.fleet-marker-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
}

.fleet-truck-body {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #0d9488);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
  border: 2px solid #ffffff;
  transition: transform 0.8s ease;
  z-index: 2;
}

.fleet-radar-ring {
  position: absolute;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.25);
  animation: radar-pulse 1.8s infinite ease-out;
  z-index: 1;
}

.fleet-speed-badge {
  position: absolute;
  bottom: -6px;
  background: rgba(15, 23, 42, 0.92);
  color: #ffffff;
  font-size: 8.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 9999px;
  white-space: nowrap;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  font-family: ui-monospace, monospace;
  z-index: 3;
}

@keyframes radar-pulse {
  0% {
    transform: scale(0.7);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.custom-workshop-marker {
  background: transparent;
  border: none;
}

.leaflet-popup-content-wrapper {
  border-radius: 1rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.dark .leaflet-popup-content-wrapper {
  background-color: #0f172a;
  color: #f1f5f9;
  border-color: #334155;
}

.dark .leaflet-popup-tip {
  background-color: #0f172a;
}

.leaflet-popup-content {
  margin: 0;
  line-height: 1.4;
}
</style>
