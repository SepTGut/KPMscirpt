import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './style.css'
import App from './App.vue'
import Icon from './components/Icon.vue'
import router from './router/index.js'

injectSpeedInsights()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.component('Icon', Icon)
app.mount('#app')
