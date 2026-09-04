<script setup>
import { ref, computed, onMounted } from 'vue'
import { requestApi } from '../composables/useApi'

const api = (action, opts) => requestApi(action, opts)

const props = defineProps({
  kpmNomor: { type: String, default: '' },
  initialRecipient: { type: String, default: '' }
})

const emit = defineEmits(['confirmed', 'back-to-home'])

const kpmId = ref(props.kpmNomor || '')
const selectedRecipient = ref(props.initialRecipient || '')
const customRecipient = ref('')
const isCustom = ref(false)
const recipientsList = ref([])
const loadingList = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const isConfirmed = ref(false)
const confirmedRecipient = ref('')
const confirmedAt = ref('')

const finalRecipientName = computed(() => {
  if (isCustom.value) return customRecipient.value.trim().toUpperCase()
  return (selectedRecipient.value || '').trim().toUpperCase()
})

const canSubmit = computed(() => {
  return kpmId.value.trim().length > 0 && finalRecipientName.value.length > 0 && !submitting.value
})

async function fetchRecipients() {
  loadingList.value = true
  try {
    const res = await api('getRecipients', { method: 'GET' })
    if (Array.isArray(res) && res.length > 0) {
      recipientsList.value = res
    } else {
      recipientsList.value = ['AANG', 'EKO', 'RULI', 'EGI', 'NUGRAHA', 'TAUFIQ']
    }
  } catch (err) {
    recipientsList.value = ['AANG', 'EKO', 'RULI', 'EGI', 'NUGRAHA', 'TAUFIQ']
  } finally {
    loadingList.value = false
  }
}

async function handleConfirm() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  submitting.value = true

  try {
    const res = await api('confirmArrivalReceipt', {
      body: {
        nomorKPM: kpmId.value.trim(),
        namaPenerima: finalRecipientName.value
      }
    })

    isConfirmed.value = true
    confirmedRecipient.value = finalRecipientName.value
    confirmedAt.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    emit('confirmed', {
      nomorKPM: kpmId.value.trim(),
      penerima: finalRecipientName.value
    })
  } catch (e) {
    errorMessage.value = e.message || 'Gagal mengonfirmasi penerimaan barang. Silakan coba lagi.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // Read kpm from URL if not passed as prop
  if (!kpmId.value && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    kpmId.value = urlParams.get('kpm') || urlParams.get('nomor') || ''
  }
  fetchRecipients()
})
</script>

<template>
  <div class="max-w-md mx-auto py-6 px-4">
    <!-- Card Container -->
    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
      <!-- Top Google Accent Bar -->
      <div class="h-2.5 bg-gradient-to-r from-google-blue-500 via-google-yellow-500 to-google-green-500"></div>

      <div class="p-6 sm:p-8">
        <!-- Success State -->
        <div v-if="isConfirmed" class="text-center py-6 animate-fadeIn">
          <div class="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center text-4xl shadow-inner mb-4">
            ✓
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
            Status: Telah Tiba & Diterima
          </span>
          <h2 class="text-2xl font-black text-slate-900 tracking-tight">Barang Berhasil Diterima!</h2>
          <p class="text-xs text-slate-500 mt-1">Konfirmasi serah terima telah tersimpan di sistem monitoring dan arsip T.Log.</p>

          <div class="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 text-xs">
            <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span class="text-slate-500">Nomor KPM:</span>
              <strong class="font-mono font-bold text-google-blue-700 uppercase">{{ kpmId }}</strong>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span class="text-slate-500">Penerima Barang:</span>
              <strong class="font-bold text-slate-900">{{ confirmedRecipient }}</strong>
            </div>
            <div class="flex justify-between items-center py-1">
              <span class="text-slate-500">Waktu Konfirmasi:</span>
              <span class="font-mono text-slate-700">{{ confirmedAt }} WIB</span>
            </div>
          </div>

          <div class="mt-6">
            <button
              type="button"
              class="btn-secondary w-full !py-3 !text-xs !font-bold"
              @click="emit('back-to-home')"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>

        <!-- Form Confirmation State -->
        <div v-else>
          <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-google-blue-50 border border-google-blue-200 flex items-center justify-center text-2xl shadow-sm mb-3">
              📦
            </div>
            <h1 class="text-xl font-black text-slate-900 tracking-tight">Konfirmasi Penerimaan KPM</h1>
            <p class="text-xs text-slate-500 mt-1">Silakan pilih nama Anda sebagai penerima barang lalu tekan tombol konfirmasi.</p>
          </div>

          <!-- KPM Info Badge -->
          <div class="mb-5 p-4 rounded-2xl bg-google-blue-50/60 border border-google-blue-100 flex items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-google-blue-600 uppercase tracking-wider block">Surat Penugasan KPM</span>
              <span class="text-sm font-mono font-black text-slate-900">{{ kpmId || 'Nomor Tidak Terdeteksi' }}</span>
            </div>
            <span class="chip !text-[11px] !font-bold bg-white text-google-blue-700 border border-google-blue-200 shadow-2xs">
              Serah Terima
            </span>
          </div>

          <!-- Error Alert -->
          <div v-if="errorMessage" class="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fadeIn">
            <span class="text-rose-500 text-sm">⚠️</span>
            <div class="flex-1">{{ errorMessage }}</div>
          </div>

          <form @submit.prevent="handleConfirm" class="space-y-4">
            <!-- If KPM not in URL, allow inputting -->
            <label v-if="!kpmId" class="block">
              <span class="label">Nomor KPM</span>
              <input
                v-model="kpmId"
                type="text"
                class="field bg-white uppercase font-mono"
                placeholder="Contoh: 001/PPO/LF/IX/2026"
                required
              />
            </label>

            <!-- Recipient Selection (2 Options: From Sheet or Custom) -->
            <label class="block">
              <span class="label">Pilih Nama Penerima</span>
              <div v-if="loadingList" class="field bg-slate-50 text-slate-400 flex items-center gap-2">
                <span class="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Memuat daftar penerima dari database...</span>
              </div>
              <select
                v-else
                v-model="selectedRecipient"
                class="field bg-white font-bold text-slate-900"
                @change="isCustom = (selectedRecipient === '__CUSTOM__')"
              >
                <option value="" disabled>-- Pilih Nama Anda --</option>
                <option v-for="rec in recipientsList" :key="rec" :value="rec">
                  {{ rec }}
                </option>
                <option value="__CUSTOM__">➕ Tulis Nama Lainnya (Manual)...</option>
              </select>
            </label>

            <!-- Manual Name Input if needed -->
            <label v-if="isCustom" class="block animate-fadeIn">
              <span class="label">Tulis Nama Lengkap Penerima</span>
              <input
                v-model="customRecipient"
                type="text"
                class="field bg-white uppercase font-bold"
                placeholder="Masukkan Nama Anda"
                required
              />
            </label>

            <!-- Submit Button -->
            <div class="pt-3">
              <button
                type="submit"
                class="btn-success w-full !py-3.5 !text-sm !font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98]"
                :disabled="!canSubmit"
              >
                <span v-if="submitting" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ submitting ? 'Mengonfirmasi Penerimaan...' : 'Konfirmasi Penerimaan Barang ✓' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
