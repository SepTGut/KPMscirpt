<script setup>
import { onMounted, ref } from 'vue'

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
  <div class="min-h-screen bg-google-surface-50 flex flex-col justify-center items-center px-4 py-8 relative">
    <!-- Google 4-Color Accent Top Bar -->
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>

    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-google-surface-200/80 overflow-hidden animate-fadeIn">
      <!-- Header -->
      <div class="p-6 sm:p-8 text-center border-b border-google-surface-100 bg-gradient-to-b from-google-surface-50/80 to-white">
        <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center font-extrabold text-xl text-white shadow-md shadow-google-blue-500/20 ring-4 ring-white">
          LF
        </div>
        <h1 class="text-xl font-extrabold text-google-surface-900 leading-tight">Masuk ke KPM Line Feeding</h1>
        <p class="text-xs text-google-surface-500 mt-1 font-medium">Pintu Masuk Otentikasi Terpadu (Admin & Driver)</p>
      </div>

      <!-- QR Auto Login Banner Hint -->
      <div class="mx-6 mt-4 p-2.5 bg-google-blue-50/70 border border-google-blue-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-google-blue-800">
        <span class="text-base">⚡</span>
        <span class="font-medium leading-relaxed">
          Punya <strong>Kartu QR Login</strong>? Cukup scan dengan kamera HP untuk masuk otomatis.
        </span>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mx-6 mt-4 p-3 bg-google-red-50 border border-google-red-200 text-google-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
        <span>⚠️</span>
        <span class="flex-1">{{ errorMessage }}</span>
      </div>

      <!-- Form Body -->
      <form class="p-6 sm:p-8 space-y-4" @submit.prevent="submitPasswordLogin">
        <div>
          <label class="block mb-1 text-xs font-bold text-google-surface-700">
            Username / Email Akun
          </label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Contoh: admin, eko, driver1..."
            class="field bg-google-surface-50/60 focus:bg-white text-sm"
          />
        </div>

        <div>
          <label class="block mb-1 text-xs font-bold text-google-surface-700">
            PIN / Password
          </label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Masukkan PIN / Password"
              class="field bg-google-surface-50/60 focus:bg-white text-sm pr-10"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              {{ showPassword ? '🙈' : '👁️' }}
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
          <span v-if="busy" class="animate-spin inline-block mr-1">↻</span>
          <span>{{ busy ? 'Memverifikasi...' : 'Masuk ke Sistem ✓' }}</span>
        </button>

        <!-- Divider -->
        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
          <div class="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400 bg-white px-2">
            atau
          </div>
        </div>

        <!-- Google Sign-in Section -->
        <div class="flex flex-col items-center justify-center pt-1">
          <div id="googleSignInBtn" v-if="googleClientId"></div>
          <div v-else class="text-center p-3 rounded-2xl bg-slate-50 border border-slate-200/80 w-full text-xs text-slate-500">
            <div class="flex items-center justify-center gap-2 font-bold text-slate-700">
              <span>🇬</span>
              <span>Dukungan Google Sign-In Tersedia</span>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5">Akun Google dapat langsung dihubungkan ke spreadsheet sewaktu-waktu.</p>
          </div>
        </div>

      </form>
    </div>

    <footer class="mt-6 text-center text-xs text-slate-400">
      &copy; 2026 KPM Line Feeding &bull; Unified Operations Platform
    </footer>
  </div>
</template>
