import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Recover once from stale chunk URLs after a new deployment.
router.onError((err) => {
  const msg = String(err?.message || '')
  const isChunkLoadError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')

  if (!isChunkLoadError) return

  const reloaded = sessionStorage.getItem('chunk-reload')
  if (!reloaded) {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.reload()
  }
})

router.isReady().finally(() => {
  sessionStorage.removeItem('chunk-reload')
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
