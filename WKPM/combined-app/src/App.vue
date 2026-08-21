<script setup>
import { computed, onMounted, ref } from 'vue'

const scriptUrl = import.meta.env.VITE_API_URL || '/.netlify/functions/api'
const requestTimeout = 30000

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
const mode = ref(currentPath.endsWith('/kpm/personel') ? 'user' : 'admin')
const adminView = ref('create')
const busy = ref(false)
const message = ref('')
const error = ref('')
const master = ref({ workshops: [], pics: [], uoms: [] })
const monitoring = ref([])
const deliveries = ref([])
const selectedDelivery = ref(null)
const filter = ref('Semua')
const photoFile = ref(null)

const createForm = ref({
  lokasiBerangkat: '', lokasiTiba: '', namaPIC: '', namaProyek: '',
  items: [{ nama: '', qty: 1, uom: 'PCS' }],
})
const updateForm = ref({ statusKPM: '', fotoData: '' })

const filteredMonitoring = computed(() => filter.value === 'Semua'
  ? monitoring.value
  : monitoring.value.filter(item => item.status === filter.value))

function clearNotice() { message.value = ''; error.value = '' }

async function api(action, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeout)
  try {
    const params = new URLSearchParams(options.body || {})
    params.set('action', action)
    params.set('role', mode.value)
    const isGet = options.method === 'GET'
    const response = await fetch(isGet ? `${scriptUrl}?${params}` : scriptUrl, {
      method: options.method || 'POST',
      body: isGet ? undefined : params,
      cache: 'no-store',
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error?.message || `Server returned ${response.status}`)
    }
    if (!result?.success) {
      const detail = result?.error?.message || result?.error?.code
      throw new Error(detail || `API menolak permintaan: ${JSON.stringify(result)}`)
    }
    return result.data
  } finally {
    clearTimeout(timeout)
  }
}

async function loadMaster() {
  if (mode.value !== 'admin') return
  try {
    const data = await api('getMasterData', { method: 'GET' })
    master.value = data || master.value
  } catch (e) { error.value = e.message }
}

async function loadMonitoring() {
  clearNotice(); busy.value = true
  try { monitoring.value = (await api('getMonitoring', { method: 'GET' })) || [] }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}

async function loadDeliveries() {
  clearNotice(); busy.value = true; selectedDelivery.value = null
  try { deliveries.value = (await api('getDeliveries', { method: 'GET' })) || [] }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}

function addItem() { createForm.value.items.push({ nama: '', qty: 1, uom: master.value.uoms[0] || 'PCS' }) }
function removeItem(index) {
  if (createForm.value.items.length > 1) createForm.value.items.splice(index, 1)
}

async function createKpm() {
  clearNotice()
  if (!createForm.value.lokasiBerangkat || !createForm.value.lokasiTiba || !createForm.value.namaPIC || !createForm.value.namaProyek) {
    error.value = 'Lengkapi semua data utama terlebih dahulu.'; return
  }
  if (createForm.value.items.some(item => !item.nama.trim() || Number(item.qty) <= 0)) {
    error.value = 'Pastikan semua material memiliki nama dan kuantitas positif.'; return
  }
  busy.value = true
  try {
    const data = await api('createKpm', {
      body: {
        namaPIC: createForm.value.namaPIC,
        namaProyek: createForm.value.namaProyek,
        lokasiBerangkat: createForm.value.lokasiBerangkat,
        lokasiTiba: createForm.value.lokasiTiba,
        daftarBarang: JSON.stringify(createForm.value.items),
      },
    })
    message.value = `KPM ${data?.nomor || data?.kpmId || ''} berhasil dibuat.`
    createForm.value = { lokasiBerangkat: '', lokasiTiba: '', namaPIC: '', namaProyek: '', items: [{ nama: '', qty: 1, uom: 'PCS' }] }
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}

async function archive(item) {
  if (!confirm(`Sembunyikan KPM ${item.nomor} dari pantauan?`)) return
  clearNotice(); busy.value = true
  try { await api('archiveKpm', { body: { nomorKPM: item.nomor, statusKPM: 'Selesai' } }); message.value = 'KPM berhasil diarsipkan.'; await loadMonitoring() }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}

function chooseDelivery(item) {
  selectedDelivery.value = item
  updateForm.value.statusKPM = item.nextAction || ''
  updateForm.value.fotoData = ''
  photoFile.value = null
}

function onPhoto(event) { photoFile.value = event.target.files?.[0] || null }

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
    reader.onload = event => {
      const image = new Image()
      image.onerror = () => reject(new Error('File bukan gambar yang valid.'))
      image.onload = () => {
        const scale = Math.min(1, 1000 / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('Browser tidak mendukung pemrosesan foto.'))
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      image.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function updateStatus() {
  clearNotice()
  if (!selectedDelivery.value || !updateForm.value.statusKPM) { error.value = 'Pilih KPM dan status terlebih dahulu.'; return }
  if (!photoFile.value) { error.value = 'Foto bukti wajib dilampirkan.'; return }
  busy.value = true
  try {
    updateForm.value.fotoData = await compressImage(photoFile.value)
    await api('updateStatus', {
      body: {
        nomorKPM: selectedDelivery.value.nomor || selectedDelivery.value.kpmId,
        statusKPM: updateForm.value.statusKPM,
        namaPIC: selectedDelivery.value.pic,
        lokasiWorkshop: updateForm.value.statusKPM === 'Tiba'
          ? (selectedDelivery.value.lokasiTiba || selectedDelivery.value.lokasi)
          : (selectedDelivery.value.lokasiBerangkat || selectedDelivery.value.lokasi),
        fotoData: updateForm.value.fotoData,
      },
    })
    message.value = 'Status KPM berhasil diperbarui.'
    await loadDeliveries()
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}

function statusClass(status) {
  return { 'Baru Dibuat': 'bg-purple-100 text-purple-700', 'Belum Berangkat': 'bg-slate-100 text-slate-700', Jalan: 'bg-amber-100 text-amber-700', Tiba: 'bg-emerald-100 text-emerald-700', Selesai: 'bg-blue-100 text-blue-700' }[status] || 'bg-slate-100 text-slate-700'
}

onMounted(() => {
  if (mode.value === 'admin') loadMaster()
  else loadDeliveries()
})
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="border-b border-slate-800 bg-slate-950 text-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div><p class="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">KPM Line Feeding</p><h1 class="mt-1 text-2xl font-bold">Unified Operations</h1></div>
        <div class="flex rounded-xl bg-white/10 p-1" role="tablist" aria-label="Pilih peran">
          <span class="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white">
            {{ mode === 'admin' ? 'Admin' : 'Personel' }}
          </span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div v-if="error" class="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ error }}</div>
      <div v-if="message" class="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ message }}</div>

      <section v-if="mode === 'admin'">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-xl font-bold">Admin dashboard</h2><p class="text-sm text-slate-500">Buat dan pantau perjalanan KPM.</p></div><div class="flex gap-2"><button class="btn" :class="adminView === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'" @click="adminView = 'create'">Buat KPM</button><button class="btn" :class="adminView === 'monitor' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'" @click="adminView = 'monitor'; loadMonitoring()">Pantau KPM</button></div></div>

        <form v-if="adminView === 'create'" class="panel space-y-5" @submit.prevent="createKpm">
          <div class="grid gap-4 md:grid-cols-2"><label><span class="label">Lokasi berangkat</span><select v-model="createForm.lokasiBerangkat" class="field"><option value="">Pilih lokasi</option><option v-for="item in master.workshops" :key="item" :value="item">{{ item }}</option></select></label><label><span class="label">Lokasi tiba</span><select v-model="createForm.lokasiTiba" class="field"><option value="">Pilih lokasi</option><option v-for="item in master.workshops" :key="item" :value="item">{{ item }}</option></select></label><label><span class="label">PIC</span><select v-model="createForm.namaPIC" class="field"><option value="">Pilih PIC</option><option v-for="item in master.pics" :key="item" :value="item">{{ item }}</option></select></label><label><span class="label">Nama proyek</span><input v-model="createForm.namaProyek" class="field" required placeholder="Nama proyek" /></label></div>
          <div><div class="mb-2 flex items-center justify-between"><h3 class="font-bold">Material</h3><button type="button" class="btn-secondary" @click="addItem">+ Tambah</button></div><div v-for="(item, index) in createForm.items" :key="index" class="mb-3 grid gap-2 sm:grid-cols-[1fr_120px_140px_auto]"><input v-model="item.nama" class="field mt-0" required placeholder="Nama barang" /><input v-model.number="item.qty" class="field mt-0" min="1" type="number" required /><select v-model="item.uom" class="field mt-0"><option v-for="uom in master.uoms" :key="uom" :value="uom">{{ uom }}</option></select><button type="button" class="btn-danger" :disabled="createForm.items.length === 1" @click="removeItem(index)">Hapus</button></div></div>
          <button class="btn-primary w-full" :disabled="busy">{{ busy ? 'Menyimpan...' : 'Simpan & Generate KPM' }}</button>
        </form>

        <div v-else class="space-y-4"><div class="flex flex-wrap justify-between gap-3"><div class="flex flex-wrap gap-2"><button v-for="option in ['Semua', 'Baru Dibuat', 'Belum Berangkat', 'Jalan', 'Tiba']" :key="option" class="btn" :class="filter === option ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'" @click="filter = option">{{ option }}</button></div><button class="btn-secondary" :disabled="busy" @click="loadMonitoring">↻ Segarkan</button></div><div v-if="!filteredMonitoring.length" class="panel text-center text-slate-500">Tidak ada KPM pada filter ini.</div><article v-for="item in filteredMonitoring" :key="item.nomor" class="panel"><div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-lg font-bold text-blue-700">{{ item.nomor }}</h3><p class="text-sm text-slate-500">{{ item.proyek }} · {{ item.lokasi }}</p></div><span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusClass(item.status)">{{ item.status }}</span></div><div class="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p><span class="font-semibold">PIC:</span> {{ item.pic }}</p><p><span class="font-semibold">Dibuat:</span> {{ item.createdAtFormatted }}</p><p><span class="font-semibold">Durasi:</span> {{ item.duration || '-' }}</p></div><div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${item.fillPercent || 0}%` }"></div></div><details class="mt-4 rounded-xl bg-slate-50 p-3"><summary class="cursor-pointer text-sm font-semibold">{{ item.daftarBarang?.length || 0 }} material</summary><div v-for="material in item.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between border-b border-slate-200 py-2 text-sm last:border-0"><span>{{ material.nama }}</span><strong>{{ material.qty }} {{ material.uom }}</strong></div></details><button v-if="item.isArrived" class="btn-danger mt-4" :disabled="busy" @click="archive(item)">Arsipkan selesai</button></article></div>
      </section>

      <section v-else>
        <div class="mb-5"><h2 class="text-xl font-bold">Update personel</h2><p class="text-sm text-slate-500">Pilih KPM, ambil foto bukti, lalu simpan status berikutnya.</p></div>
        <div class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div class="panel"><div class="flex items-center justify-between"><h3 class="font-bold">KPM tersedia</h3><button class="btn-secondary" :disabled="busy" @click="loadDeliveries">↻</button></div><div v-if="!deliveries.length" class="py-10 text-center text-sm text-slate-500">Tidak ada KPM yang perlu diperbarui.</div><button v-for="item in deliveries" :key="item.nomor" class="mt-3 w-full rounded-xl border p-4 text-left transition hover:border-blue-400 hover:bg-blue-50" :class="selectedDelivery?.nomor === item.nomor ? 'border-blue-500 bg-blue-50' : 'border-slate-200'" @click="chooseDelivery(item)"><div class="flex justify-between gap-3"><strong>{{ item.nomor }}</strong><span class="text-xs font-semibold text-blue-600">{{ item.nextAction }}</span></div><p class="mt-1 text-sm text-slate-500">{{ item.proyek }}</p></button></div>
          <form class="panel space-y-4" @submit.prevent="updateStatus"><div v-if="!selectedDelivery" class="py-10 text-center text-sm text-slate-500">Pilih KPM untuk melihat detail.</div><template v-else><div><h3 class="text-lg font-bold">{{ selectedDelivery.nomor }}</h3><p class="text-sm text-slate-500">{{ selectedDelivery.proyek }} · {{ selectedDelivery.lokasi }}</p></div><div class="rounded-xl bg-amber-50 p-4 text-sm"><p class="font-semibold">Material bawaan</p><div v-for="material in selectedDelivery.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between py-1"><span>{{ material.nama }}</span><strong>{{ material.qty }} {{ material.uom }}</strong></div></div><label><span class="label">Status berikutnya</span><select v-model="updateForm.statusKPM" class="field"><option :value="selectedDelivery.nextAction">{{ selectedDelivery.nextAction }}</option></select></label><label><span class="label">Foto bukti</span><input class="field" type="file" accept="image/*" capture="environment" required @change="onPhoto" /></label><button class="btn-success w-full" :disabled="busy">{{ busy ? 'Mengunggah...' : 'Simpan status' }}</button></template></form></div>
      </section>
    </main>
  </div>
</template>
