<template>
  <div class="menu-page">

    <!-- Coming soon banner -->
    <div class="coming-soon-banner">
      <span class="banner-icon">🚀</span>
      <div class="banner-text">
        <div class="banner-title">{{ t('banner_title') }}</div>
        <div class="banner-sub">{{ t('banner_sub') }}</div>
      </div>
    </div>

    <!-- Outlet selector -->
    <div class="outlet-bar">
      <button
        v-for="o in outlets"
        :key="o.id"
        :class="['outlet-chip', { active: selectedOutlet === o.id }]"
        @click="selectedOutlet = o.id"
      >{{ o.label }}</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <div class="spinner"></div>
      <p>{{ t('loading_menu') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-wrap">
      <div style="font-size:40px">😕</div>
      <p>{{ t('menu_error') }}</p>
    </div>

    <!-- Menu -->
    <div v-else class="menu-body">
      <div class="cat-tabs" ref="catTabsEl">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :class="['cat-tab', { active: activeCat === cat.id }]"
          @click="scrollToCategory(cat.id)"
        >{{ cat.name }}</button>
      </div>

      <div
        v-for="cat in categories"
        :key="cat.id"
        :id="`cat-${cat.id}`"
        class="cat-section"
      >
        <div class="cat-heading">{{ cat.name }}</div>
        <div class="items-grid">
          <div
            v-for="item in cat.items"
            :key="item.id"
            class="menu-item"
            :class="{ unavailable: !item.is_available }"
          >
            <div class="item-img-wrap">
              <img
                :src="item.image_url || `/products/${item.id}.jpg`"
                :alt="itemName(item)"
                class="item-img"
                @error="onImgError"
              />
              <div v-if="!item.is_available" class="unavail-overlay">{{ t('unavailable') }}</div>
            </div>
            <div class="item-info">
              <div class="item-name">{{ itemName(item) }}</div>
              <div v-if="shouldShowAltName(item)" class="item-name-alt">{{ itemAltName(item) }}</div>
              <div v-if="item.description" class="item-desc">{{ item.description }}</div>
              <div class="item-footer">
                <span class="item-price">RM {{ Number(item.base_price).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-spacer"></div>
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import api from '@/services/api'
import { useLang } from '@/composables/useLang'

const { lang, t } = useLang()

const OUTLETS = computed(() => [
  { id: 1, label: t.value('outlet_amerin') },
  { id: 2, label: t.value('outlet_mantin') },
])

const outlets        = OUTLETS
const selectedOutlet = ref(1)
const categories     = ref([])
const loading        = ref(true)
const error          = ref(false)
const activeCat      = ref(null)

onMounted(async () => {
  await loadMenu()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

async function loadMenu() {
  loading.value = true
  error.value = false
  try {
    const data = await api.get('/menu', { outlet_id: selectedOutlet.value })
    categories.value = data.filter(c => c.items?.length)
    activeCat.value = categories.value[0]?.id || null
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Show item name based on language
function itemName(item) {
  if (lang.value === 'zh' && item.name_zh) return item.name_zh
  return item.name
}

// Show the alternate name as subtext
function shouldShowAltName(item) {
  if (lang.value === 'zh') return !!item.name  // show EN name below ZH
  if (lang.value === 'bm') return !!item.name_zh // show ZH name below EN/BM
  return !!item.name_zh
}

function itemAltName(item) {
  if (lang.value === 'zh') return item.name
  return item.name_zh
}

function scrollToCategory(catId) {
  activeCat.value = catId
  const el = document.getElementById(`cat-${catId}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onScroll() {
  for (const cat of [...categories.value].reverse()) {
    const el = document.getElementById(`cat-${cat.id}`)
    if (el && el.getBoundingClientRect().top <= 140) {
      activeCat.value = cat.id
      break
    }
  }
}

function onImgError(e) { e.target.src = '/products/placeholder.jpg' }
</script>

<style scoped>
.menu-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }

.coming-soon-banner { display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%); color: #fff; padding: 14px 20px; }
.banner-icon  { font-size: 28px; flex-shrink: 0; }
.banner-title { font-size: 14px; font-weight: 800; line-height: 1.3; }
.banner-sub   { font-size: 12px; opacity: 0.85; margin-top: 2px; line-height: 1.4; }

.outlet-bar { display: flex; gap: 8px; padding: 12px 16px; background: var(--white); border-bottom: 1px solid var(--border); }
.outlet-chip { padding: 6px 16px; border-radius: 20px; border: 1.5px solid var(--border); background: var(--bg); font-size: 13px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all .15s; }
.outlet-chip.active { background: var(--blue); border-color: var(--blue); color: #fff; }

.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 32px; gap: 16px; color: var(--text-muted); font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--blue); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.cat-tabs { display: flex; gap: 6px; padding: 12px 16px; overflow-x: auto; background: var(--white); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; scrollbar-width: none; }
.cat-tabs::-webkit-scrollbar { display: none; }
.cat-tab { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--border); background: var(--bg); font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all .15s; white-space: nowrap; }
.cat-tab.active { background: var(--blue); border-color: var(--blue); color: #fff; }

.cat-section  { padding: 0 0 8px; }
.cat-heading  { font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: .8px; padding: 20px 16px 10px; }

.items-grid   { display: flex; flex-direction: column; gap: 1px; background: var(--border); }
.menu-item    { display: flex; gap: 14px; padding: 14px 16px; background: var(--white); align-items: flex-start; transition: background .1s; }
.menu-item:active { background: var(--bg); }
.menu-item.unavailable { opacity: 0.5; }

.item-img-wrap  { position: relative; flex-shrink: 0; width: 80px; height: 80px; border-radius: 10px; overflow: hidden; background: var(--bg); }
.item-img       { width: 100%; height: 100%; object-fit: cover; }
.unavail-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: .5px; }

.item-info     { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.item-name     { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; }
.item-name-alt { font-size: 12px; color: var(--text-muted); }
.item-desc     { font-size: 12px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-footer   { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.item-price    { font-size: 15px; font-weight: 800; color: var(--blue); }

.bottom-spacer { height: 16px; }
</style>