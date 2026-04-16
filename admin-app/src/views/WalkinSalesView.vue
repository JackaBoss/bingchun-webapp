<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Walk-in Sales</h1>
      <p class="page-sub">Review sales and fill in items purchased</p>
    </div>

    <!-- Filters -->
    <div class="card filter-bar">
      <input v-model="search" type="text" placeholder="Search member name or order no…" class="input search-input" />
      <select v-model="filterOutlet" class="input" style="width:auto">
        <option value="">All Outlets</option>
        <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
    </div>

    <!-- List -->
    <div v-if="loading" class="empty-state">Loading…</div>
    <div v-else-if="!filtered.length" class="empty-state">No walk-in sales found.</div>

    <div v-else class="sales-list">
      <div v-for="sale in filtered" :key="sale.id" class="card sale-card">

        <!-- Header row -->
        <div class="sale-header" @click="toggle(sale.id)">
          <div class="sale-meta">
            <span class="sale-orderno">{{ sale.walkin_order_no || '—' }}</span>
            <span class="sale-date">{{ formatDate(sale.created_at) }}</span>
            <span class="sale-outlet">{{ sale.outlet_name }}</span>
          </div>
          <div class="sale-right">
            <div class="sale-member">{{ sale.member_name }}</div>
            <div class="sale-amount">RM {{ parseFloat(sale.bill_amount).toFixed(2) }}</div>
            <div class="sale-pts">+{{ sale.points_earned }} pts</div>
            <div class="items-badge" :class="{ filled: sale.item_count > 0 }">
              {{ sale.item_count > 0 ? `${sale.item_count} items` : 'No items' }}
            </div>
            <span class="chevron" :class="{ open: expanded === sale.id }">›</span>
          </div>
        </div>

        <!-- Expanded item editor -->
        <div v-if="expanded === sale.id" class="sale-body">
          <div v-if="sale.items && sale.items.length" class="items-list">
            <div v-for="(it, idx) in sale.items" :key="idx" class="item-row">
              <span class="item-qty">×{{ it.quantity }}</span>
              <span class="item-name">{{ it.item_name }}</span>
              <span class="item-price">RM{{ (it.unit_price * it.quantity).toFixed(2) }}</span>
              <button class="item-del" @click="removeItem(sale, idx)">✕</button>
            </div>
          </div>
          <p v-else class="no-items">No items recorded yet.</p>

          <!-- Add item row -->
          <div class="add-item-row">
            <select v-model="pickedItemId" class="input" style="flex:1;min-width:0">
              <option value="">— Add item —</option>
              <optgroup v-for="cat in menuCategories" :key="cat.id" :label="cat.name">
                <option v-for="item in cat.items" :key="item.id" :value="item.id">
                  {{ item.name }} — RM{{ item.base_price }}
                </option>
              </optgroup>
            </select>
            <input v-model.number="pickedQty" type="number" min="1" max="99" class="input qty-input" />
            <button class="btn btn-primary" @click="addItem(sale)" :disabled="!pickedItemId"
              style="padding:10px 16px">+</button>
          </div>

          <div v-if="saveError" class="error-msg">{{ saveError }}</div>

          <div class="save-row">
            <button class="btn btn-primary" @click="saveItems(sale)"
              :disabled="saving || !(sale.items && sale.items.length)"
              style="padding:10px 24px">
              {{ saving ? 'Saving…' : 'Save Items' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const sales         = ref([])
const outlets       = ref([])
const menuCategories = ref([])
const loading       = ref(true)
const search        = ref('')
const filterOutlet  = ref('')
const expanded      = ref(null)
const pickedItemId  = ref('')
const pickedQty     = ref(1)
const saving        = ref(false)
const saveError     = ref('')

onMounted(async () => {
  const [s, o, m] = await Promise.all([
    api.get('/admin/walkin-sales'),
    api.get('/outlets'),
    api.get('/admin/menu'),
  ])
  sales.value         = s.map(sale => ({ ...sale, items: sale.items || [] }))
  outlets.value       = o
  menuCategories.value = m
  loading.value       = false
})

const filtered = computed(() => {
  let list = sales.value
  if (filterOutlet.value) list = list.filter(s => s.outlet_id === filterOutlet.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(s =>
      s.member_name?.toLowerCase().includes(q) ||
      s.walkin_order_no?.toLowerCase().includes(q)
    )
  }
  return list
})

function toggle(id) {
  expanded.value  = expanded.value === id ? null : id
  pickedItemId.value = ''
  pickedQty.value    = 1
  saveError.value    = ''
}

function formatDate(dt) {
  return new Date(dt).toLocaleString('en-MY', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

function addItem(sale) {
  if (!pickedItemId.value) return
  const cat  = menuCategories.value.find(c => c.items.some(i => i.id === pickedItemId.value))
  const item = cat?.items.find(i => i.id === pickedItemId.value)
  if (!item) return
  if (!sale.items) sale.items = []
  const existing = sale.items.find(i => i.menu_item_id === item.id)
  if (existing) {
    existing.quantity += pickedQty.value
  } else {
    sale.items.push({
      menu_item_id: item.id,
      item_name:    item.name,
      quantity:     pickedQty.value,
      unit_price:   parseFloat(item.base_price),
    })
  }
  pickedItemId.value = ''
  pickedQty.value    = 1
}

function removeItem(sale, idx) {
  sale.items.splice(idx, 1)
}

async function saveItems(sale) {
  if (!sale.items?.length) return
  saving.value   = true
  saveError.value = ''
  try {
    await api.post(`/admin/walkin-sales/${sale.id}/items`, { items: sale.items })
    sale.item_count = sale.items.length
    expanded.value  = null
  } catch (e) {
    saveError.value = e.response?.data?.error || 'Failed to save items'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.filter-bar   { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 180px; }
.empty-state  { text-align: center; padding: 48px; color: var(--muted); }
.sales-list   { display: flex; flex-direction: column; gap: 10px; }
.sale-card    { padding: 0; overflow: hidden; }
.sale-header  { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; gap: 12px; flex-wrap: wrap; }
.sale-header:hover { background: #f7f9ff; }
.sale-meta    { display: flex; flex-direction: column; gap: 3px; }
.sale-orderno { font-size: 13px; font-weight: 700; font-family: monospace; }
.sale-date    { font-size: 12px; color: var(--muted); }
.sale-outlet  { font-size: 11px; color: var(--blue); font-weight: 600; }
.sale-right   { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.sale-member  { font-size: 14px; font-weight: 600; }
.sale-amount  { font-size: 14px; font-weight: 700; }
.sale-pts     { font-size: 12px; color: var(--green); font-weight: 700; }
.items-badge  { font-size: 11px; padding: 3px 8px; border-radius: 20px; background: #f0f0f0; color: #888; font-weight: 600; }
.items-badge.filled { background: #d1fae5; color: #065f46; }
.chevron      { font-size: 18px; color: var(--muted); transition: transform .2s; display: inline-block; }
.chevron.open { transform: rotate(90deg); }
.sale-body    { border-top: 1px solid var(--border); padding: 16px; background: #fafbff; }
.items-list   { border: 1.5px solid #e0e8ff; border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
.item-row     { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #f0f4ff; background: #fff; }
.item-row:last-child { border-bottom: none; }
.item-qty     { font-size: 13px; font-weight: 700; color: var(--blue); min-width: 28px; }
.item-name    { flex: 1; font-size: 14px; }
.item-price   { font-size: 13px; font-weight: 600; color: var(--muted); }
.item-del     { background: none; border: none; color: #aaa; cursor: pointer; font-size: 14px; padding: 2px 4px; }
.item-del:hover { color: #e53e3e; }
.no-items     { font-size: 13px; color: var(--muted); text-align: center; padding: 12px 0; }
.add-item-row { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
.qty-input    { width: 64px; text-align: center; }
.save-row     { display: flex; justify-content: flex-end; margin-top: 12px; }
.error-msg    { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; margin-top: 10px; }
</style>