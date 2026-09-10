<script setup>
import { onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { useTheme } from '../composables/useTheme'

const props = defineProps({
  busy: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['login-credentials', 'login-google'])

const { isDark, toggleDark } = useTheme()

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
      theme: isDark.value ? 'filled_black' : 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 280
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden transition-colors duration-200">
    <!-- Google 4-Color Accent Top Bar -->
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>

    <!-- Theme Switcher Floating Top Right -->
    <div class="fixed top-4 right-4 z-40">
      <button
        type="button"
        class="w-9 h-9 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition shadow-sm focus-visible:outline-none"
        @click="toggleDark"
        :title="isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'"
      >
        <span class="text-base leading-none">{{ isDark ? '☀️' : '🌙' }}</span>
      </button>
    </div>

    <!-- Ambient Subtle Glows -->
    <div class="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-google-blue-500/10 dark:bg-google-blue-500/5 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-google-green-500/10 dark:bg-google-green-500/5 blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-google-surface-200/90 dark:border-dark-border overflow-hidden animate-fadeIn relative z-10 transition-colors">
      <!-- Header -->
      <div class="p-6 sm:p-8 text-center border-b border-google-surface-100 dark:border-slate-800 bg-gradient-to-b from-google-surface-50/80 to-white dark:from-slate-800/60 dark:to-dark-card">
        <div class="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-google-blue-500/25 ring-4 ring-white dark:ring-slate-800">
          LF
        </div>
        <h1 class="text-xl font-extrabold text-google-surface-900 dark:text-white tracking-tight">Masuk ke KPM Line Feeding</h1>
        <p class="text-xs text-google-surface-500 dark:text-slate-400 mt-1 font-medium">Pintu Masuk Otentikasi Terpadu (Admin &amp; Driver)</p>
      </div>

      <!-- QR Auto Login Banner Hint -->
      <div class="mx-6 mt-4 p-3 bg-google-blue-50/80 dark:bg-google-blue-950/40 border border-google-blue-200/90 dark:border-google-blue-800/60 rounded-2xl flex items-center gap-3 text-xs text-google-blue-900 dark:text-google-blue-200">
        <div class="w-8 h-8 rounded-xl bg-google-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon name="qr" className="w-4 h-4" />
        </div>
        <span class="font-medium leading-relaxed">
          Punya <strong>Kartu QR Login</strong>? Arahkan kamera HP ke kartu untuk masuk otomatis.
        </span>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mx-6 mt-4 p-3 bg-google-red-50 dark:bg-rose-950/40 border border-google-red-200 dark:border-rose-800/60 text-google-red-700 dark:text-rose-300 text-xs font-bold rounded-2xl flex items-center gap-2.5">
        <Icon name="alert" className="w-4 h-4 text-google-red-600 dark:text-rose-400 flex-shrink-0" />
        <span class="flex-1">{{ errorMessage }}</span>
      </div>

      <!-- Form Body -->
      <form class="p-6 sm:p-8 space-y-4" @submit.prevent="submitPasswordLogin">
        <div>
          <label class="block mb-1 text-xs font-bold text-google-surface-700 dark:text-slate-300 uppercase tracking-wide">
            Username / Email Akun
          </label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Contoh: admin, eko, driver1..."
            class="field text-sm"
          />
        </div>

        <div>
          <label class="block mb-1 text-xs font-bold text-google-surface-700 dark:text-slate-300 uppercase tracking-wide">
            PIN / Password
          </label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Masukkan PIN atau Password"
              class="field text-sm pr-11"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-google-surface-500 dark:text-slate-400 hover:text-google-surface-800 dark:hover:text-white hover:bg-google-surface-100 dark:hover:bg-slate-800 transition focus-visible:outline-none"
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
          <label class="flex items-center gap-2 cursor-pointer select-none text-google-surface-600 dark:text-slate-300 font-medium">
            <input v-model="rememberMe" type="checkbox" class="w-4 h-4 rounded text-google-blue-600 focus:ring-google-blue-500 border-google-surface-300 dark:border-slate-700" />
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
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
          <div class="relative flex justify-center text-[10.5px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 bg-white dark:bg-dark-card px-2">
            atau
          </div>
        </div>

        <!-- Google Sign-in Section -->
        <div class="flex flex-col items-center justify-center pt-1">
          <div id="googleSignInBtn" v-if="googleClientId"></div>
          <div v-else class="text-center p-3 rounded-2xl bg-google-surface-50 dark:bg-slate-800/60 border border-google-surface-200/90 dark:border-slate-700/80 w-full text-xs text-google-surface-600 dark:text-slate-300">
            <div class="flex items-center justify-center gap-1.5 font-bold text-google-surface-800 dark:text-white">
              <Icon name="shield" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
              <span>Otentikasi Google Terintegrasi</span>
            </div>
            <p class="text-[10.5px] text-google-surface-500 dark:text-slate-400 mt-0.5">Akun Google dapat langsung dihubungkan ke spreadsheet sewaktu-waktu.</p>
          </div>
        </div>
      </form>
    </div>

    <footer class="mt-6 text-center text-xs text-google-surface-500 dark:text-slate-400 font-medium space-y-1">
      <div>&copy; 2026 KPM Line Feeding &bull; Unified Operations Platform &bull; <span class="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">v1P (Production Ready)</span></div>
      <div class="text-[11px] text-google-surface-400 dark:text-slate-500">SMK Negeri 1 Madiun &bull; Setyo Guntur Samudro</div>
    </footer>
  </div>
</template>
