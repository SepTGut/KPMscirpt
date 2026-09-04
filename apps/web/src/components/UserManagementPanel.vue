<script setup>
import { ref, computed, onMounted } from 'vue'
import { requestApi } from '../composables/useApi'
import { useAuth } from '../composables/useAuth'

const { currentUser, isIT, isSuperAdmin } = useAuth()

const users = ref([])
const busy = ref(false)
const search = ref('')
const roleFilter = ref('Semua')
const message = ref('')
const error = ref('')

// Add / Edit Modal state
const showModal = ref(false)
const isEditing = ref(false)
const form = ref({
  username: '',
  fullName: '',
  email: '',
  pin: '',
  role: 'Driver',
  status: 'Aktif',
  keterangan: ''
})

// QR Card Preview Modal state
const showQrModal = ref(false)
const selectedUserForQr = ref(null)

const roleOptions = computed(() => {
  if (isIT.value) {
    return ['IT', 'Super Admin', 'Admin', 'Driver']
  }
  // Super Admin can manage staff: Admin and Driver
  return ['Admin', 'Driver']
})

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchSearch = !search.value ||
      (u.fullName || '').toLowerCase().includes(search.value.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.value.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.value.toLowerCase())

    const matchRole = roleFilter.value === 'Semua' ||
      u.role === roleFilter.value ||
      (roleFilter.value === 'IT' && u.role === 'it') ||
      (roleFilter.value === 'Super Admin' && u.role === 'super_admin') ||
      (roleFilter.value === 'Admin' && u.role === 'admin') ||
      (roleFilter.value === 'Driver' && u.role === 'driver')

    return matchSearch && matchRole
  })
})

function roleBadgeClass(role) {
  const r = String(role || '').toLowerCase()
  if (r === 'it') {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }
  if (r.includes('super')) {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }
  if (r.includes('admin')) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  return 'bg-emerald-100 text-emerald-800 border-emerald-200'
}

async function loadUsers() {
  busy.value = true
  error.value = ''
  try {
    const data = await requestApi('getUsersList', { method: 'GET' }, { currentUser: currentUser.value })
    users.value = data || []
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function openAddModal() {
  isEditing.value = false
  form.value = {
    username: '',
    fullName: '',
    email: '',
    pin: '',
    role: 'Driver',
    status: 'Aktif',
    keterangan: ''
  }
  showModal.value = true
}

function openEditModal(u) {
  isEditing.value = true
  const roleLabel = (u.role === 'it') ? 'IT' :
                    (u.role === 'super_admin') ? 'Super Admin' :
                    (u.role === 'admin') ? 'Admin' : 'Driver'
  form.value = {
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    pin: '', // Keep empty unless updating
    role: roleLabel,
    status: u.status || 'Aktif',
    keterangan: u.keterangan || ''
  }
  showModal.value = true
}

async function handleSaveUser() {
  if (!form.value.username || !form.value.fullName) {
    error.value = 'Username dan Nama Lengkap wajib diisi.'
    return
  }
  busy.value = true
  message.value = ''
  error.value = ''
  try {
    const res = await requestApi('saveUser', {
      body: {
        username: form.value.username,
        fullName: form.value.fullName,
        email: form.value.email,
        pin: form.value.pin,
        role: form.value.role,
        status: form.value.status,
        keterangan: form.value.keterangan
      }
    }, { currentUser: currentUser.value })

    message.value = res?.message || 'Pengguna berhasil disimpan.'
    showModal.value = false
    await loadUsers()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function handleToggleStatus(u) {
  busy.value = true
  error.value = ''
  try {
    const newStatus = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    await requestApi('toggleUserStatus', {
      body: { username: u.username, status: newStatus }
    }, { currentUser: currentUser.value })
    u.status = newStatus
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function openQrModal(u) {
  selectedUserForQr.value = u
  showQrModal.value = true
}

function printQrCard() {
  if (typeof window === 'undefined') return
  window.print()
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <section class="space-y-6 animate-fadeIn">
    <!-- Header Summary Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-google-surface-300/70 shadow-sm">
      <div>
        <h1 class="text-xl font-bold text-google-surface-900 tracking-tight flex items-center gap-2">
          <span>👥</span>
          <span>Kelola Pengguna & Peran</span>
        </h1>
        <p class="text-xs text-google-surface-500 mt-0.5 font-medium">
          Daftar akun, pembagian hak akses 4-tier (IT, Super Admin, Admin, Driver), dan ID Card QR login.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-secondary !py-2 !px-4 !text-xs !font-bold flex items-center gap-1.5"
          :disabled="busy"
          @click="loadUsers"
        >
          <span :class="{ 'animate-spin': busy }">↻</span>
          <span>Segarkan</span>
        </button>
        <button
          type="button"
          class="btn-primary !py-2 !px-4 !text-xs !font-bold flex items-center gap-1.5 shadow-sm"
          @click="openAddModal"
        >
          <span>➕</span>
          <span>Tambah Pengguna</span>
        </button>
      </div>
    </div>

    <!-- Alert Notices -->
    <div v-if="message" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
      <span>✓</span>
      <span>{{ message }}</span>
    </div>
    <div v-if="error" class="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
      <span>⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Search & Role Filter Chips -->
    <div class="bg-white p-4 rounded-2xl border border-google-surface-300/70 shadow-sm space-y-3">
      <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="relative w-full sm:w-80">
          <input
            v-model="search"
            type="text"
            placeholder="Cari nama, username, atau email..."
            class="input-field pl-9 !py-2 !text-xs"
          />
          <span class="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        <div class="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            v-for="roleOpt in ['Semua', 'IT', 'Super Admin', 'Admin', 'Driver']"
            :key="roleOpt"
            type="button"
            class="chip border text-xs"
            :class="roleFilter === roleOpt ? 'bg-google-blue-600 text-white border-google-blue-600 shadow-sm' : 'bg-google-surface-100 text-google-surface-700 border-google-surface-300/60 hover:bg-google-surface-200'"
            @click="roleFilter = roleOpt"
          >
            {{ roleOpt }}
          </button>
        </div>
      </div>
    </div>

    <!-- User Grid Cards -->
    <div v-if="!filteredUsers.length" class="panel text-center py-12 text-google-surface-400">
      <p class="text-3xl mb-2">👤</p>
      <p class="text-sm font-semibold text-google-surface-600">Tidak ada akun pengguna yang cocok.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="u in filteredUsers"
        :key="u.username"
        class="panel relative flex flex-col justify-between hover:shadow-m3-2 transition-all group border border-google-surface-200"
      >
        <div>
          <div class="flex items-start justify-between gap-2 pb-3 border-b border-google-surface-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {{ (u.fullName || u.username).substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <h2 class="text-sm font-bold text-google-surface-900 group-hover:text-google-blue-600 transition-colors">
                  {{ u.fullName }}
                </h2>
                <p class="text-xs text-google-surface-500 font-mono">@{{ u.username }}</p>
              </div>
            </div>

            <!-- Role Badge -->
            <span
              class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-2xs"
              :class="roleBadgeClass(u.role)"
            >
              {{ u.roleLabel || u.role }}
            </span>
          </div>

          <div class="py-3 space-y-1.5 text-xs text-google-surface-600">
            <p v-if="u.email" class="flex items-center gap-1.5 truncate">
              <span class="text-slate-400">✉️</span>
              <span>{{ u.email }}</span>
            </p>
            <p v-if="u.keterangan" class="flex items-center gap-1.5 text-google-surface-500 text-[11px] italic">
              <span class="text-slate-400">📝</span>
              <span>{{ u.keterangan }}</span>
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-3 border-t border-google-surface-100 flex items-center justify-between gap-2">
          <!-- Status Toggle Button -->
          <button
            type="button"
            class="text-[11px] font-bold px-2.5 py-1 rounded-full border transition"
            :class="u.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'"
            :disabled="busy || u.username === 'ST'"
            @click="handleToggleStatus(u)"
            :title="u.username === 'ST' ? 'Akun ST dilindungi' : 'Ubah Status Aktif/Nonaktif'"
          >
            <span class="mr-1">{{ u.status === 'Aktif' ? '●' : '○' }}</span>
            <span>{{ u.status }}</span>
          </button>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="p-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-600 font-bold"
              title="Lihat QR Code Login"
              @click="openQrModal(u)"
            >
              📱 QR
            </button>
            <button
              type="button"
              class="p-1.5 text-xs rounded-lg hover:bg-slate-100 text-google-blue-600 font-bold"
              title="Edit Akun"
              :disabled="u.username === 'ST'"
              @click="openEditModal(u)"
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Modal: Add / Edit User -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-google-surface-200 space-y-4">
        <div class="flex items-center justify-between border-b border-google-surface-100 pb-3">
          <h2 class="text-base font-bold text-google-surface-900">
            {{ isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}
          </h2>
          <button type="button" class="text-slate-400 hover:text-slate-600 font-bold text-lg" @click="showModal = false">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSaveUser" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-google-surface-700 mb-1">Username (ID Login):</label>
            <input
              v-model="form.username"
              type="text"
              required
              :disabled="isEditing"
              placeholder="contoh: budi_driver"
              class="input-field"
            />
          </div>

          <div>
            <label class="block font-bold text-google-surface-700 mb-1">Nama Lengkap:</label>
            <input
              v-model="form.fullName"
              type="text"
              required
              placeholder="contoh: Budi Santoso"
              class="input-field"
            />
          </div>

          <div>
            <label class="block font-bold text-google-surface-700 mb-1">Email (Google Login):</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="budi@kpm.com"
              class="input-field"
            />
          </div>

          <div>
            <label class="block font-bold text-google-surface-700 mb-1">PIN / Password:</label>
            <input
              v-model="form.pin"
              type="text"
              :placeholder="isEditing ? 'Biarkan kosong jika tidak diubah' : 'Minimal 4 digit'"
              class="input-field"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-google-surface-700 mb-1">Peran (Role):</label>
              <select v-model="form.role" class="input-field">
                <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-google-surface-700 mb-1">Status:</label>
              <select v-model="form.status" class="input-field">
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-google-surface-700 mb-1">Keterangan (Opsional):</label>
            <input
              v-model="form.keterangan"
              type="text"
              placeholder="contoh: Driver Truk Colt Diesel"
              class="input-field"
            />
          </div>

          <div class="pt-3 flex justify-end gap-2">
            <button type="button" class="btn-secondary !py-2 !px-4 !text-xs font-bold" @click="showModal = false">
              Batal
            </button>
            <button type="submit" class="btn-primary !py-2 !px-5 !text-xs font-bold" :disabled="busy">
              Simpan Pengguna
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: QR Code ID Card Preview -->
    <div v-if="showQrModal && selectedUserForQr" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-google-surface-200 text-center space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-google-surface-100">
          <span class="text-xs font-bold text-google-surface-500 uppercase tracking-wider">ID Card Digital</span>
          <button type="button" class="text-slate-400 hover:text-slate-600 font-bold text-base" @click="showQrModal = false">
            ✕
          </button>
        </div>

        <div class="p-4 bg-google-surface-50 rounded-2xl border border-google-surface-200 space-y-3">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-google-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
            {{ selectedUserForQr.fullName.substring(0, 2).toUpperCase() }}
          </div>
          <div>
            <h3 class="text-base font-extrabold text-google-surface-900">{{ selectedUserForQr.fullName }}</h3>
            <p class="text-xs font-mono text-google-surface-500">@{{ selectedUserForQr.username }}</p>
            <span
              class="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border"
              :class="roleBadgeClass(selectedUserForQr.role)"
            >
              {{ selectedUserForQr.roleLabel || selectedUserForQr.role }}
            </span>
          </div>

          <div class="p-2 bg-white rounded-xl inline-block shadow-inner border border-slate-200">
            <img
              :src="selectedUserForQr.qrImageUrl"
              :alt="`QR Login ${selectedUserForQr.fullName}`"
              class="w-48 h-48 mx-auto"
              loading="lazy"
            />
          </div>

          <p class="text-[11px] text-google-surface-500 leading-snug">
            Arahkan kamera smartphone ke kode QR di atas untuk login instan tanpa mengetik PIN.
          </p>
        </div>

        <div class="flex gap-2 justify-center">
          <button type="button" class="btn-primary !py-2 !px-4 !text-xs font-bold w-full" @click="printQrCard">
            🖨️ Cetak Kartu
          </button>
          <button type="button" class="btn-secondary !py-2 !px-4 !text-xs font-bold" @click="showQrModal = false">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
