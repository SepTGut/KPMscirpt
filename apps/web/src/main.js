import { createApp } from 'vue'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './style.css'
import App from './App.vue'
import Icon from './components/Icon.vue'

injectSpeedInsights()

const app = createApp(App)
app.component('Icon', Icon)
app.mount('#app')
