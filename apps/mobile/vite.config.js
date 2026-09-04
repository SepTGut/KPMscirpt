import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://combined-app-eight.vercel.app',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  }
})
