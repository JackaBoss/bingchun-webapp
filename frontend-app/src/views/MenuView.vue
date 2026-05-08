<template>
  <div class="menu-page">
    <!-- Header -->
    <div class="menu-header">
      <div class="header-top">
        <div>
          <p class="greeting">Good {{ timeOfDay }}, {{ auth.user?.name?.split(' ')[0] }} 👋</p>
          <h2 class="shop-name">{{ outletTitle }}</h2>
        </div>
        <div class="points-chip" @click="router.push('/profile')">
          ⭐ {{ auth.points }} pts
        </div>
      </div>
      <select v-model="selectedOutlet" class="outlet-select">
        <option value="1">Amerin Mall, Seri Kembangan</option>
        <option value="2">Mantin</option>
      </select>
      <!-- Search bar -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" type="text" placeholder="Search drinks..." class="search-input" @input="onSearch" />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
      </div>
    </div>

    <!-- Category tabs (hidden during search) -->
    <div v-if="!searchQuery" class="category-tabs">
      <button
        v-for="cat in menu"
        :key="cat.id"
        :class="['cat-tab', { active: activeCat === cat.id }]"
        @click="scrollToCategory(cat.id)"
      >{{ cat.name }}</button>
    </div>

    <!-- Skeleton loading -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton" v-for="n in 4" :key="n"></div>
    </div>

    <!-- Search results -->
    <div v-else-if="searchQuery" class="menu-sections">
      <div v-if="searchResults.length === 0" class="empty-search">
        <p class="empty-icon">🔍</p>
        <p class="empty-title">No results for "{{ searchQuery }}"</p>
        <p class="empty-sub">Try a different name or spelling</p>
      </div>
      <div v-else>
        <p class="search-count">{{ searchResults.length }} item{{ searchResults.length !== 1 ? 's' : '' }} found</p>
        <div class="items-grid">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="item-card"
            @click="openModal(item)"
          >
            <div class="item-img-wrap">
              <img
                :src="item.image_url || 'https://via.placeholder.com/120x120/e3f2fd/1e88e5?text=🧋'"
                :alt="item.name"
                class="item-img"
              />
            </div>
            <div class="item-info">
              <p class="item-name">{{ item.name }}</p>
              <p class="item-name-zh">{{ item.name_zh }}</p>
              <div class="item-footer">
                <span class="item-price">RM {{ parseFloat(item.base_price).toFixed(2) }}</span>
                <button class="add-btn" @click.stop="openModal(item)">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Normal menu sections -->
    <div v-else class="menu-sections">
      <div
        v-for="cat in menu"
        :key="cat.id"
        :ref="el => sectionRefs[cat.id] = el"
        class="menu-section"
      >
        <h3 class="section-title">{{ cat.name }}</h3>
        <div class="items-grid">
          <div
            v-for="item in cat.items"
            :key="item.id"
            class="item-card"
            @click="openModal(item)"
          >
            <div class="item-img-wrap">
              <img
                :src="item.image_url || 'https://via.placeholder.com/120x120/e3f2fd/1e88e5?text=🧋'"
                :alt="item.name"
                class="item-img"
              />
            </div>
            <div class="item-info">
              <p class="item-name">{{ item.name }}</p>
              <p class="item-name-zh">{{ item.name_zh }}</p>
              <div class="item-footer">
                <span class="item-price">RM {{ parseFloat(item.base_price).toFixed(2) }}</span>
                <button class="add-btn" @click.stop="openModal(item)">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom nav -->
    <BottomNav />

    <!-- Cart FAB -->
    <div v-if="cart.count > 0" class="cart-fab" @click="router.push('/cart')">
      <span class="fab-badge">{{ cart.count }}</span>
      <span>View Cart</span>
      <span class="fab-total">RM {{ cart.subtotal.toFixed(2) }}</span>
    </div>

    <!-- Customise modal -->
    <Teleport to="body">
      <div v-if="modalItem" class="modal-overlay" @click.self="closeModal">
        <div class="modal-sheet">
          <button class="modal-close" @click="closeModal">✕</button>
          <div class="modal-img-wrap">
            <img :src="modalItem.image_url || '/products/placeholder.webp'" :alt="modalItem.name" />
          </div>
          <div class="modal-body">
            <h3 class="modal-title">{{ modalItem.name }}</h3>
            <p class="modal-name-zh">{{ modalItem.name_zh }}</p>
            <p class="modal-base-price">from RM {{ parseFloat(modalItem.base_price).toFixed(2) }}</p>

            <div v-for="group in modalItem.option_groups" :key="group.id" class="option-group">
              <div class="option-group-header">
                <span class="option-group-name">{{ group.name }}</span>
                <span :class="group.is_required ? 'required-tag' : 'optional-tag'">
                  {{ group.is_required ? 'Required' : 'Optional' }}
                </span>
              </div>
              <div v-if="!group.multi_select" class="option-list">
                <label v-for="opt in group.options" :key="opt.id" class="option-row">
                  <input type="radio" :name="`g-${group.id}`" :value="opt.id" v-model="selections[group.id]" />
                  <span class="option-label">{{ opt.label }}</span>
                  <span class="option-price" v-if="opt.extra_price > 0">+RM {{ parseFloat(opt.extra_price).toFixed(2) }}</span>
                </label>
              </div>
              <div v-else class="option-list">
                <label v-for="opt in group.options" :key="opt.id" class="option-row">
                  <input type="checkbox" :value="opt.id" v-model="multiSelections[group.id]" />
                  <span class="option-label">{{ opt.label }}</span>
                  <span class="option-price" v-if="opt.extra_price > 0">+RM {{ parseFloat(opt.extra_price).toFixed(2) }}</span>
                </label>
              </div>
            </div>

            <div class="option-group">
              <div class="option-group-header">
                <span class="option-group-name">Special request</span>
                <span class="optional-tag">Optional</span>
              </div>
              <textarea
                v-model="itemNotes"
                placeholder="e.g. less sweet, no ice…"
                class="notes-input"
                rows="2"
              ></textarea>
            </div>

            <div class="modal-actions">
              <div class="qty-control">
                <button @click="qty = Math.max(1, qty - 1)">−</button>
                <span>{{ qty }}</span>
                <button @click="qty++">+</button>
              </div>
              <button class="btn btn-primary modal-add-btn" @click="addToCart">
                Add · RM {{ modalTotal.toFixed(2) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import api from '@/services/api'
import BottomNav from '@/components/BottomNav.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const toast = useToast()

// "Bing Chun Amerin Mall" / "Bing Chun Mantin" / "Bing Chun Malaysia"
const OUTLET_LABELS = {
  1: 'Amerin Mall',
  2: 'Mantin',
}

const outletTitle = computed(() => {
  const label = OUTLET_LABELS[selectedOutlet.value]
  return label ? `Bing Chun ${label}` : 'Bing Chun Malaysia'
})

const menu = ref([])
const loading = ref(true)
const activeCat = ref(null)
const selectedOutlet = ref(1)
const sectionRefs = reactive({})
const modalItem = ref(null)
const selections = reactive({})
const multiSelections = reactive({})
const qty = ref(1)
const itemNotes = ref('')
const searchQuery = ref('')

const timeOfDay = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
})

const allItems = computed(() => menu.value.flatMap(cat => cat.items || []))

const searchResults = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return []
  return allItems.value.filter(item =>
    item.name?.toLowerCase().includes(q) ||
    item.name_zh?.toLowerCase().includes(q)
  )
})

const modalTotal = computed(() => {
  if (!modalItem.value) return 0
  let price = parseFloat(modalItem.value.base_price)
  for (const group of modalItem.value.option_groups || []) {
    if (!group.multi_select) {
      const opt = group.options.find(o => o.id === selections[group.id])
      if (opt) price += parseFloat(opt.extra_price)
    } else {
      for (const optId of (multiSelections[group.id] || [])) {
        const opt = group.options.find(o => o.id === optId)
        if (opt) price += parseFloat(opt.extra_price)
      }
    }
  }
  return price * qty.value
})

onMounted(async () => {
  try {
    menu.value = await api.get('/menu')
    if (menu.value.length) activeCat.value = menu.value[0].id
  } catch (e) {
    console.error('Failed to load menu', e)
  } finally {
    loading.value = false
  }
})

function onSearch() { /* reactivity handles it */ }

function scrollToCategory(catId) {
  activeCat.value = catId
  sectionRefs[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openModal(item) {
  modalItem.value = item
  qty.value = 1
  itemNotes.value = ''
  for (const group of item.option_groups || []) {
    if (!group.multi_select) {
      selections[group.id] = group.is_required && group.options.length ? group.options[0].id : null
    } else {
      multiSelections[group.id] = []
    }
  }
}

function closeModal() { modalItem.value = null }

function addToCart() {
  const item = modalItem.value
  for (const group of item.option_groups || []) {
    if (group.is_required && !group.multi_select && !selections[group.id]) {
      alert(`Please select a ${group.name}`)
      return
    }
  }

  const optionIds = []
  const optionLabels = []
  for (const group of item.option_groups || []) {
    if (!group.multi_select && selections[group.id]) {
      const opt = group.options.find(o => o.id === selections[group.id])
      if (opt) { optionIds.push(opt.id); optionLabels.push(opt.label) }
    } else {
      for (const optId of (multiSelections[group.id] || [])) {
        const opt = group.options.find(o => o.id === optId)
        if (opt) { optionIds.push(opt.id); optionLabels.push(opt.label) }
      }
    }
  }

  const unitPrice = modalTotal.value / qty.value
  cart.setOutlet(selectedOutlet.value)
  for (let i = 0; i < qty.value; i++) {
    cart.addItem({
      menu_item_id: item.id,
      name: item.name,
      unit_price: unitPrice,
      option_ids: optionIds,
      options_label: optionLabels.join(', '),
      notes: itemNotes.value || null,
      quantity: 1,
    })
  }

  toast.show({ message: `${item.name} added to cart` })
  closeModal()
}
</script>

<style scoped>
.menu-page { background: var(--bg); min-height: 100vh; padding-bottom: 120px; }

.menu-header {
  background: var(--white);
  padding: 20px 16px 14px;
  position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid var(--border);
}
.header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.greeting { font-size: 13px; color: var(--text-muted); }
.shop-name { font-size: 20px; font-weight: 700; color: var(--blue); }
.points-chip {
  background: var(--blue-light); color: var(--blue);
  padding: 6px 12px; border-radius: 20px;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.outlet-select {
  width: 100%; padding: 8px 12px;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  font-size: 14px; background: var(--bg); color: var(--text); margin-bottom: 10px;
}

.search-wrap {
  display: flex; align-items: center;
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: 12px; padding: 0 12px; gap: 8px; transition: border-color 0.2s;
}
.search-wrap:focus-within { border-color: var(--blue); }
.search-icon { font-size: 15px; flex-shrink: 0; }
.search-input {
  flex: 1; border: none; background: transparent;
  padding: 11px 0; font-size: 15px; color: var(--text); outline: none;
}
.search-input::placeholder { color: var(--text-muted); }
.search-clear { background: none; border: none; color: var(--text-muted); font-size: 13px; cursor: pointer; padding: 4px; flex-shrink: 0; }
.search-count { font-size: 13px; color: var(--text-muted); font-weight: 600; margin-bottom: 14px; padding: 0 2px; }

.empty-search { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-title { font-size: 17px; font-weight: 700; color: var(--text); }
.empty-sub { font-size: 14px; color: var(--text-muted); margin-top: 6px; }

.category-tabs {
  display: flex; gap: 8px; padding: 12px 16px;
  overflow-x: auto; background: var(--white);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 145px; z-index: 9;
}
.category-tabs::-webkit-scrollbar { display: none; }
.cat-tab {
  white-space: nowrap; padding: 7px 16px;
  border: 1.5px solid var(--border); border-radius: 20px;
  background: transparent; font-size: 13px; font-weight: 600;
  color: var(--text-muted); cursor: pointer; transition: all .15s;
}
.cat-tab.active { background: var(--blue); border-color: var(--blue); color: #fff; }

.loading-state { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.skeleton {
  height: 80px; border-radius: var(--radius);
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

.menu-sections { padding: 16px; display: flex; flex-direction: column; gap: 24px; }
.section-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: var(--text); }
.items-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.item-card {
  background: var(--white); border-radius: var(--radius);
  box-shadow: var(--shadow); overflow: hidden;
  cursor: pointer; transition: transform .15s;
}
.item-card:active { transform: scale(0.98); }
.item-img-wrap { aspect-ratio: 1; overflow: hidden; background: var(--blue-light); }
.item-img { width: 100%; height: 100%; object-fit: cover; }
.item-info { padding: 10px; }
.item-name { font-size: 13px; font-weight: 600; line-height: 1.3; }
.item-name-zh { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.item-price { font-size: 14px; font-weight: 700; color: var(--blue); }
.add-btn {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--blue); color: #fff; border: none;
  font-size: 18px; font-weight: 300; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.cart-fab {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 448px;
  background: var(--blue); color: #fff; border-radius: var(--radius);
  padding: 14px 20px; display: flex; align-items: center; gap: 10px;
  font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(30,136,229,0.35); z-index: 50;
}
.fab-badge {
  background: #fff; color: var(--blue); width: 22px; height: 22px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.fab-total { margin-left: auto; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  z-index: 200; display: flex; align-items: flex-end;
}
.modal-sheet {
  background: var(--white); border-radius: 20px 20px 0 0;
  width: 100%; max-width: 480px; margin: 0 auto;
  max-height: 90vh; overflow-y: auto; position: relative;
}
.modal-close {
  position: absolute; top: 12px; right: 16px;
  background: rgba(0,0,0,0.1); border: none;
  width: 32px; height: 32px; border-radius: 50%;
  font-size: 14px; cursor: pointer; z-index: 1;
  display: flex; align-items: center; justify-content: center;
}
.modal-img-wrap { width: 100%; aspect-ratio: 1; overflow: hidden; background: var(--blue-light); }
.modal-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
.modal-body { padding: 20px 16px; }
.modal-title { font-size: 20px; font-weight: 700; }
.modal-name-zh { font-size: 14px; color: var(--text-muted); margin-top: 2px; }
.modal-base-price { font-size: 16px; font-weight: 600; color: var(--blue); margin-top: 6px; }

.option-group { margin-top: 20px; }
.option-group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.option-group-name { font-size: 14px; font-weight: 700; }
.required-tag { font-size: 11px; background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.optional-tag { font-size: 11px; background: var(--bg); color: var(--text-muted); padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.option-list { display: flex; flex-direction: column; gap: 2px; }
.option-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: background .1s;
}
.option-row:hover { background: var(--bg); }
.option-row input { accent-color: var(--blue); width: 16px; height: 16px; }
.option-label { flex: 1; font-size: 14px; }
.option-price { font-size: 13px; color: var(--blue); font-weight: 600; }
.notes-input {
  width: 100%; padding: 10px 12px;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  font-size: 14px; resize: none; font-family: inherit; box-sizing: border-box;
}
.notes-input:focus { outline: none; border-color: var(--blue); }
.modal-actions { display: flex; gap: 12px; align-items: center; margin-top: 24px; padding-bottom: 8px; }
.qty-control {
  display: flex; align-items: center; gap: 14px;
  background: var(--bg); border-radius: var(--radius-sm); padding: 8px 16px;
}
.qty-control button {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: var(--blue); font-weight: 700; width: 24px;
  display: flex; align-items: center; justify-content: center;
}
.qty-control span { font-size: 16px; font-weight: 700; min-width: 20px; text-align: center; }
.modal-add-btn { flex: 1; padding: 14px; }
</style>