import { watch } from 'vue'
import { useRoute } from 'vue-router'

/**
 * SEO composable: updates document title, meta description, and canonical URL
 * based on the current route meta and any dynamic overrides.
 */

const SEO_BASE_TITLE = 'KPM Line Feeding'
const SEO_BASE_URL = 'https://lnfd.vercel.app'

const ROUTE_SEO_MAP = {
  login: {
    title: 'Masuk ke Sistem',
    description: 'Pintu masuk otentikasi terpadu KPM Line Feeding untuk administrator dan pengemudi armada.'
  },
  adminCreate: {
    title: 'Buat KPM Baru',
    description: 'Formulir penerbitan surat Kartu Pemindahan Material (KPM) baru antar workshop dan proyek.'
  },
  adminMonitor: {
    title: 'Pantau Status KPM',
    description: 'Pantau pergerakan, status perjalanan, dan progres pengiriman KPM Line Feeding secara real-time.'
  },
  adminMap: {
    title: 'Live Radar Pelacakan Armada',
    description: 'Peta radar interaktif pemantauan GPS posisi armada pengiriman KPM secara langsung.'
  },
  checkerGate: {
    title: 'Verifikasi Checker Gerbang Asal',
    description: 'Pemeriksaan fisik muatan dan izin keberangkatan armada KPM Line Feeding di gerbang asal.'
  },
  recipientConfirm: {
    title: 'Konfirmasi Penerimaan KPM',
    description: 'Halaman konfirmasi serah terima material pengiriman KPM Line Feeding.'
  },
  adminUsers: {
    title: 'Kelola Pengguna Sistem',
    description: 'Manajemen pengguna, peranan, dan pencetakan ID Card QR Login KPM Line Feeding.'
  },
  tutorial: {
    title: 'Panduan & Tutorial Aplikasi',
    description: 'Panduan lengkap penggunaan aplikasi KPM Line Feeding untuk Administrator, Driver, dan Super Admin.'
  },
  driverPortal: {
    title: 'Portal Penugasan Driver',
    description: 'Portal pembaruan status keberangkatan, tiba, dan unggah foto bukti pengiriman bagi personel driver.'
  },
  notFound: {
    title: '404: Halaman Tidak Ditemukan',
    description: 'Halaman yang Anda cari tidak ditemukan pada sistem KPM Line Feeding.'
  }
}

export function useSeo() {
  const route = useRoute()

  function updateSeo(overrides = {}) {
    if (typeof document === 'undefined') return

    const routeName = route.name
    const seoData = ROUTE_SEO_MAP[routeName] || {}

    const title = overrides.title || seoData.title || route.meta.title || SEO_BASE_TITLE
    const description = overrides.description || seoData.description || 'Sistem operasi dan pemantauan distribusi material KPM Line Feeding secara real-time.'
    const canonicalPath = overrides.canonicalPath || route.path

    document.title = `${title} - ${SEO_BASE_TITLE}`

    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', description)

    const canonicalLink = document.querySelector('link[rel="canonical"]')
    if (canonicalLink) {
      const baseOrigin = window.location.origin || SEO_BASE_URL
      canonicalLink.setAttribute('href', `${baseOrigin}${canonicalPath}`)
    }

    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', `${title} - ${SEO_BASE_TITLE}`)
    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) ogDesc.setAttribute('content', description)
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', `${SEO_BASE_URL}${canonicalPath}`)
  }

  // Auto-update on route change
  watch(() => route.name, () => {
    updateSeo()
  }, { immediate: true })

  return { updateSeo }
}
