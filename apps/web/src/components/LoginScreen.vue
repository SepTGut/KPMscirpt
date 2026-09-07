<script setup>
import { onMounted, ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  busy: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['login-credentials', 'login-google'])

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function submitPasswordLogin() {
  if (!username.value.trim() || !password.value.trim()) return
  emit('login-credentials', {
    username: username.value.trim(),
    password: password.value.trim(),
    rememberMe: rememberMe.value
  })
}

// Google Identity Services (GIS) Callback
function handleGoogleCredentialResponse(response) {
  if (response?.credential) {
    try {
      // Decode JWT payload
      const base64Url = response.credential.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const payload = JSON.parse(jsonPayload)
      emit('login-google', {
        googleEmail: payload.email,
        name: payload.name,
        picture: payload.picture,
        rememberMe: rememberMe.value
      })
    } catch (e) {
      console.error('Google token decode error:', e)
    }
  }
}

onMounted(() => {
  // If Google Client ID is available, initialize Google One Tap / Button
  if (googleClientId && typeof window !== 'undefined') {
    if (window.google?.accounts?.id) {
      initGis()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGis
      document.head.appendChild(script)
    }
  }
})

function initGis() {
  if (!window.google?.accounts?.id || !googleClientId) return
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredentialResponse,
  })
  const googleBtnEl = document.getElementById('googleSignInBtn')
  if (googleBtnEl) {
    window.google.accounts.id.renderButton(googleBtnEl, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 280
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-google-surface-50 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
    <!-- Google 4-Color Accent Top Bar -->
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>

    <!-- Ambient Subtle Glows -->
    <div class="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-google-blue-500/10 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-google-green-500/10 blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-google-surface-200/90 overflow-hidden animate-fadeIn relative z-10">
      <!-- Header -->
      <div class="p-6 sm:p-8 text-center border-b border-google-surface-100 bg-gradient-to-b from-google-surface-50/80 to-white">
        <div class="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-google-blue-500/25 ring-4 ring-white">
          LF
        </div>
        <h1 class="text-xl font-extrabold text-google-surface-900 tracking-tight">Masuk ke KPM Line Feeding</h1>
        <p class="text-xs text-google-surface-500 mt-1 font-medium">Pintu Masuk Otentikasi Terpadu (Admin & Driver)</p>
      </div>

      <!-- QR Auto Login Banner Hint -->
      <div class="mx-6 mt-4 p-3 bg-google-blue-50/80 border border-google-blue-200/90 rounded-2xl flex items-center gap-3 text-xs text-google-blue-900">
        <div class="w-8 h-8 rounded-xl bg-google-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon name="qr" className="w-4 h-4" />
        </div>
        <span class="font-medium leading-relaxed">
          Punya <strong>Kartu QR Login</strong>? Arahkan kamera HP ke kartu untuk masuk otomatis.
        </span>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mx-6 mt-4 p-3 bg-google-red-50 border border-google-red-200 text-google-red-700 text-xs font-bold rounded-2xl flex items-center gap-2.5">
        <Icon name="alert" className="w-4 h-4 text-google-red-600 flex-shrink-0" />
        <span class="flex-1">{{ errorMessage }}</span>
      </div>

      <!-- Form Body -->
      <form class="p-6 sm:p-8 space-y-4" @submit.prevent="submitPasswordLogin">
        <div>
          <label class="block mb-1 text-xs font-bold text-google-surface-700 uppercase tracking-wide">
            Username / Email Akun
          </label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Contoh: admin, eko, driver1..."
            class="field bg-google-surface-50/70 focus:bg-white text-sm"
          />
        </div>

        <div>
          <label class="block mb-1 text-xs font-bold text-google-surface-700 uppercase tracking-wide">
            PIN / Password
          </label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Masukkan PIN atau Password"
              class="field bg-google-surface-50/70 focus:bg-white text-sm pr-11"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-google-surface-500 hover:text-google-surface-800 hover:bg-google-surface-100 transition focus-visible:outline-none"
              @click="showPassword = !showPassword"
              tabindex="-1"
              :title="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            >
              <Icon :name="showPassword ? 'eye-off' : 'eye'" className="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Remember Me -->
        <div class="flex items-center justify-between text-xs pt-1">
          <label class="flex items-center gap-2 cursor-pointer select-none text-google-surface-600 font-medium">
            <input v-model="rememberMe" type="checkbox" class="w-4 h-4 rounded text-google-blue-600 focus:ring-google-blue-500 border-google-surface-300" />
            <span>Ingat saya di perangkat ini</span>
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="btn-primary w-full !py-3.5 !text-sm !font-bold tracking-wide shadow-md hover:shadow-lg mt-2"
          :disabled="busy"
        >
          <Icon v-if="busy" name="refresh" className="w-4 h-4 animate-spin mr-1" />
          <Icon v-else name="check" className="w-4 h-4 mr-1" />
          <span>{{ busy ? 'Memverifikasi...' : 'Masuk ke Sistem' }}</span>
        </button>

        <!-- Divider -->
        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
          <div class="relative flex justify-center text-[10.5px] uppercase font-bold tracking-wider text-slate-400 bg-white px-2">
            atau
          </div>
        </div>

        <!-- Google Sign-in Section -->
        <div class="flex flex-col items-center justify-center pt-1">
          <div id="googleSignInBtn" v-if="googleClientId"></div>
          <div v-else class="text-center p-3 rounded-2xl bg-google-surface-50 border border-google-surface-200/90 w-full text-xs text-google-surface-600">
            <div class="flex items-center justify-center gap-1.5 font-bold text-google-surface-800">
              <Icon name="shield" className="w-4 h-4 text-google-blue-600" />
              <span>Otentikasi Google Terintegrasi</span>
            </div>
            <p class="text-[10.5px] text-google-surface-500 mt-0.5">Akun Google dapat langsung dihubungkan ke spreadsheet sewaktu-waktu.</p>
          </div>
        </div>
      </form>
    </div>

    <footer class="mt-6 text-center text-xs text-google-surface-500 font-medium space-y-1">
      <div>&copy; 2026 KPM Line Feeding &bull; Unified Operations Platform &bull; <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">v1P (Production Ready)</span></div>
      <div class="text-[11px] text-google-surface-400">SMK Negeri 1 Madiun &bull; Setyo Guntur Samudro</div>
    </footer>
  </div>
</template>
