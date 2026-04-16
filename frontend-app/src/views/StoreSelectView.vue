<template>
  <div class="store-select-page">
    <div class="store-select-card">
      <img src="/logo.png" alt="Bing Chun" class="logo" onerror="this.style.display='none'" />
      <h1>冰纯 Bing Chun</h1>
      <p class="subtitle">Select your nearest outlet to start ordering</p>

      <button class="btn-gps" :disabled="detecting" @click="detectGPS">
        <span class="gps-icon">📍</span>
        {{ detecting ? 'Detecting location…' : 'Use My Location' }}
      </button>

      <p v-if="gpsError" class="gps-error">{{ gpsError }}</p>

      <div class="divider"><span>or choose manually</span></div>

      <div v-if="loading" class="loading">Loading outlets…</div>
      <div v-else class="outlet-list">
        <button
          v-for="o in outletStore.outlets"
          :key="o.id"
          class="outlet-card"
          :class="{ selected: outletStore.selectedId === o.id, nearest: nearestId === o.id }"
          @click="choose(o.id)"
        >
          <div class="outlet-name">{{ o.name }}</div>
          <div class="outlet-address">{{ o.address }}</div>
          <div v-if="nearestId === o.id" class="nearest-badge">📍 Nearest</div>
        </button>
      </div>

      <button class="btn-confirm" :disabled="!outletStore.selectedId" @click="confirm">
        Continue →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOutletStore } from '@/stores/outlet'
import { useCartStore } from '@/stores/cart'

const router      = useRouter()
const outletStore = useOutletStore()
const cart        = useCartStore()

const loading   = ref(true)
const detecting = ref(false)
const gpsError  = ref('')
const nearestId = ref(null)

onMounted(async () => {
  await outletStore.fetchOutlets()
  loading.value = false
  tryGPSSilent()
})

function tryGPSSilent() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    pos => findNearest(pos.coords.latitude, pos.coords.longitude),
    () => {}
  )
}

function detectGPS() {
  if (!navigator.geolocation) {
    gpsError.value = 'Geolocation not supported on this device.'
    return
  }
  detecting.value = true
  gpsError.value  = ''
  navigator.geolocation.getCurrentPosition(
    pos => { detecting.value = false; findNearest(pos.coords.latitude, pos.coords.longitude) },
    err => {
      detecting.value = false
      gpsError.value  = err.code === 1
        ? 'Location permission denied. Please choose manually.'
        : 'Could not get location. Please choose manually.'
    },
    { timeout: 8000 }
  )
}

function findNearest(lat, lng) {
  const outlets = outletStore.outlets.filter(o => o.lat && o.lng)
  if (!outlets.length) return
  let best = null, bestDist = Infinity
  for (const o of outlets) {
    const d = Math.hypot(o.lat - lat, o.lng - lng)
    if (d < bestDist) { bestDist = d; best = o }
  }
  if (best) { nearestId.value = best.id; outletStore.select(best.id) }
}

function choose(id) { outletStore.select(id) }

function confirm() {
  cart.setOutlet(outletStore.selectedId)
  router.push('/')
}
</script>

<style scoped>
.store-select-page {
  min-height: 100dvh; display: flex; align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 100%);
  padding: 1.5rem;
}
.store-select-card {
  background: #1e1e2e; border-radius: 1.5rem; padding: 2rem 1.5rem;
  width: 100%; max-width: 420px; text-align: center; color: #fff;
}
.logo { width: 72px; height: 72px; object-fit: contain; margin-bottom: .75rem; }
h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 .25rem; }
.subtitle { color: #aaa; font-size: .9rem; margin-bottom: 1.5rem; }
.btn-gps {
  width: 100%; padding: .75rem; border-radius: .75rem;
  border: 2px solid #6ee7b7; background: transparent; color: #6ee7b7;
  font-size: 1rem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: .5rem;
}
.btn-gps:not(:disabled):hover { background: rgba(110,231,183,.1); }
.btn-gps:disabled { opacity: .5; cursor: default; }
.gps-error { color: #f87171; font-size: .82rem; margin-top: .5rem; }
.divider {
  display: flex; align-items: center; gap: .75rem;
  margin: 1.25rem 0; color: #555; font-size: .82rem;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #333; }
.outlet-list { display: flex; flex-direction: column; gap: .75rem; }
.outlet-card {
  width: 100%; padding: .9rem 1rem; border-radius: .75rem;
  border: 2px solid #333; background: #252535; color: #fff;
  text-align: left; cursor: pointer; position: relative;
}
.outlet-card.selected { border-color: #6ee7b7; background: rgba(110,231,183,.08); }
.outlet-card.nearest  { border-color: #fbbf24; }
.outlet-card.selected.nearest { border-color: #6ee7b7; }
.outlet-name { font-weight: 600; font-size: .95rem; }
.outlet-address { color: #888; font-size: .8rem; margin-top: .2rem; }
.nearest-badge { font-size: .72rem; color: #fbbf24; margin-top: .3rem; font-weight: 600; }
.btn-confirm {
  margin-top: 1.5rem; width: 100%; padding: .85rem; border-radius: .75rem;
  border: none; background: #6ee7b7; color: #0a0a0a;
  font-size: 1rem; font-weight: 700; cursor: pointer;
}
.btn-confirm:disabled { opacity: .35; cursor: default; }
</style>
