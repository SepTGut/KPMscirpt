<template>
  <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[700px] relative">
    <!-- Top Map Control Bar -->
    <div class="px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 z-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-600 to-teal-500 flex items-center justify-center text-white text-lg shadow-sm">
          🗺️
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-extrabold text-slate-900 leading-tight">Live Fleet Radar</h2>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{{ activeVehicles.length }} Armada Bergerak</span>
            </span>
          </div>
          <span class="text-xs text-slate-500">Pelacakan Posisi GPS Realtime & Rute Pengiriman</span>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          @click="fitAllMarkers"
          class="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 shadow-sm"
          title="Fokuskan Semua Titik"
        >
          <span>🎯</span>
          <span>Semua Titik</span>
        </button>
        <button
          @click="refreshTrackingData"
          :disabled="isRefreshing"
          class="px-3.5 py-1.5 rounded-full bg-google-blue-50 hover:bg-google-blue-100 text-google-blue-700 text-xs font-bold transition flex items-center gap-1.5 border border-google-blue-200 shadow-sm disabled:opacity-50"
        >
          <span :class="{ 'animate-spin inline-block': isRefreshing }">↻</span>
          <span>{{ isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan' }}</span>
        </button>
      </div>
    </div>

    <!-- Map Container & Floating Vehicle Panel -->
    <div class="flex-1 relative w-full h-full">
      <!-- Leaflet Canvas -->
      <div ref="mapContainer" class="w-full h-full z-0 bg-slate-100"></div>

      <!-- Floating Sidebar Vehicle List (Collapsible on Mobile) -->
      <div
        v-if="activeVehicles.length > 0"
        class="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-xl z-[400] max-h-48 overflow-y-auto space-y-2"
      >
        <div class="text-xs font-extrabold text-slate-700 flex items-center justify-between pb-1 border-b border-slate-200">
          <span>Armada Aktif di Jalan</span>
          <span class="font-mono text-google-blue-600">{{ activeVehicles.length }} Truk</span>
        </div>
        <div
          v-for="v in activeVehicles"
          :key="v.kpmId"
          @click="focusVehicle(v)"
          class="p-2 bg-slate-50 hover:bg-google-blue-50/70 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 text-xs"
        >
          <div class="min-w-0 flex-1">
            <div class="font-bold text-slate-900 truncate">{{ v.nomor || v.kpmId }}</div>
            <div class="text-[11px] text-slate-500 truncate">{{ v.driverName || v.driver || 'Driver' }} ({{ v.origin || v.lokasiBerangkat }} ➔ {{ v.destination || v.lokasiTiba }})</div>
          </div>
          <span class="shrink-0 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
            {{ v.speedKmh || 0 }} km/h
          </span>
        </div>
      </div>

      <!-- Empty Overlay if No Active Trips -->
      <div
        v-else-if="!isRefreshing"
        class="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-2.5 shadow-lg z-[400] text-xs text-slate-600 flex items-center gap-2"
      >
        <span>ℹ️</span>
        <span>Saat ini belum ada armada yang berstatus <b>"Jalan"</b>. Peta menampilkan titik workshop tetap.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  monitoringData: { type: Array, default: () => [] },
  firebaseDbUrl: { type: String, default: '' }
})

const mapContainer = ref(null)
let map = null
let markersGroup = null
let workshopGroup = null

const activeVehicles = ref([])
const isRefreshing = ref(false)
let pollingTimer = null

const WORKSHOPS = [
  { name: 'Candi Sewu', lat: -7.7495, lng: 110.4932, color: '#2563eb' },
  { name: 'Tiron', lat: -7.8012, lng: 110.3645, color: '#4f46e5' },
  { name: 'Sukosari', lat: -7.5621, lng: 110.8245, color: '#059669' },
  { name: 'Remul', lat: -7.5412, lng: 110.7812, color: '#d97706' }
]

function createTruckIcon(vehicle) {
  const speed = vehicle.speedKmh || 0
  const isMoving = speed > 3

  return L.divIcon({
    className: 'custom-fleet-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${isMoving ? '<span class="absolute w-10 h-10 rounded-full bg-google-blue-500/30 animate-ping"></span>' : ''}
        <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-google-blue-600 to-teal-600 text-white flex items-center justify-center text-lg shadow-lg border-2 border-white">
          🚚
        </div>
        <div class="absolute -bottom-4 bg-slate-900/90 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full whitespace-nowrap shadow font-mono">
          ${speed} km/h
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  })
}

function createWorkshopIcon(ws) {
  return L.divIcon({
    className: 'custom-workshop-marker',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-xl bg-white border-2 border-slate-700 flex items-center justify-center text-sm shadow-md">
          🏢
        </div>
        <div class="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 whitespace-nowrap shadow">
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
  }).setView([-7.65, 110.65], 11)

  L.control.zoom({ position: 'topright' }).addTo(map)

  // Clean, high-performance CartoDB Voyager Tile Layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map)

  workshopGroup = L.layerGroup().addTo(map)
  markersGroup = L.layerGroup().addTo(map)

  // Add permanent workshop markers
  WORKSHOPS.forEach(ws => {
    const marker = L.marker([ws.lat, ws.lng], { icon: createWorkshopIcon(ws) })
    marker.bindPopup(`
      <div class="p-2 space-y-1 text-xs">
        <div class="font-bold text-slate-900 text-sm">🏢 Workshop ${ws.name}</div>
        <div class="text-slate-500 font-mono">Koordinat: ${ws.lat}, ${ws.lng}</div>
      </div>
    `)
    workshopGroup.addLayer(marker)
  })

  fitAllMarkers()
}

const DEFAULT_FIREBASE_URL = 'https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app'

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

    // Merge with monitoring data if any KPM is in 'Jalan' status
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
          // Check if starting workshop has coordinates
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
    renderVehicleMarkers()
  } finally {
    isRefreshing.value = false
  }
}

function renderVehicleMarkers() {
  if (!markersGroup) return
  markersGroup.clearLayers()

  activeVehicles.value.forEach(v => {
    if (!v.latitude || !v.longitude) return

    const marker = L.marker([v.latitude, v.longitude], { icon: createTruckIcon(v) })
    const gmapsRouterUrl = `https://www.google.com/maps/dir/?api=1&origin=${v.latitude},${v.longitude}&destination=${encodeURIComponent((v.destination || '') + ' Workshop')}&travelmode=driving`

    const popupHtml = `
      <div class="p-3 text-xs space-y-2 min-w-[200px]">
        <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <span class="font-extrabold font-mono text-google-blue-700 text-sm">${v.kpmId || '-'}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Sedang Jalan</span>
        </div>
        <div class="space-y-1 text-slate-600">
          <div>Driver: <b class="text-slate-900">${v.driverName || 'Driver'}</b></div>
          <div>Rute: <b>${v.origin || '-'} ➔ ${v.destination || '-'}</b></div>
          <div>Kecepatan: <b class="text-emerald-700 font-mono">${v.speedKmh || 0} km/jam</b></div>
        </div>
        <a
          href="${gmapsRouterUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="block w-full text-center py-2 bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-sm hover:from-google-blue-500 hover:to-indigo-500 mt-2"
        >
          🗺️ Buka Rute Google Maps
        </a>
      </div>
    `
    marker.bindPopup(popupHtml)
    markersGroup.addLayer(marker)
  })
}

function focusVehicle(v) {
  if (!map || !v.latitude || !v.longitude) return
  map.flyTo([v.latitude, v.longitude], 14, { duration: 1 })
}

function fitAllMarkers() {
  if (!map) return
  const points = WORKSHOPS.map(w => [w.lat, w.lng])
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

watch(() => props.monitoringData, () => {
  refreshTrackingData()
}, { deep: true })

onMounted(() => {
  initMap()
  refreshTrackingData()
  // 10-second polling for active fleet coordinates
  pollingTimer = setInterval(refreshTrackingData, 10000)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style>
.custom-fleet-marker, .custom-workshop-marker {
  background: transparent;
  border: none;
}
.leaflet-popup-content-wrapper {
  border-radius: 1rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.9);
}
.leaflet-popup-content {
  margin: 0;
  line-height: 1.4;
}
</style>
