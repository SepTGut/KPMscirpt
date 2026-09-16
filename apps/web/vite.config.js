import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const adminToken = env.ADMIN_TOKEN || '7fK9xQ2mL8vR4nT6pZ1wC5yH3sD9aJ8uE2gN6bX4qW7rM'
  const targetUrl = env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA/exec'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: targetUrl,
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => {
            const cleanPath = path.replace(/^\/api\/?/, '')
            const sep = cleanPath.includes('?') ? '&' : '?'
            if (!cleanPath.includes('apiToken=') && !cleanPath.includes('token=')) {
              return `${cleanPath}${sep}apiToken=${adminToken}`
            }
            return cleanPath
          },
        },
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-core': ['vue', 'vue-router', 'pinia'],
          },
        },
      },
    },
  }
})

