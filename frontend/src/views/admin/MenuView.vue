<template>
  <div class="admin-page">
    <div class="admin-header">
      <button class="back-btn" @click="router.push('/admin')">&larr;</button>
      <h2>Menu Management</h2>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="menu-list">
      <div v-for="cat in menu" :key="cat.id" class="cat-section">
        <h3 class="cat-title">{{ cat.name }} <span class="cat-zh">{{ cat.name_zh }}</span></h3>
        <div v-for="item in cat.items" :key="item.id" class="menu-row">
          <div class="menu-row-left">
            <p class="menu-item-name" :class="{ disabled: !item.is_available }">{{ item.name }}</p>
            <p class="menu-item-zh">{{ item.name_zh }}</p>
          </div>
          <div class="menu-row-right">
            <span class="menu-price" v-if="editingId !== item.id">RM {{ parseFloat(item.base_price).toFixed(2) }}</span>
            <input v-else type="number" step="0.50" v-model.number="editPrice" class="price-input" />
            <div class="menu-actions">
              <button v-if="editingId !== item.id" class="edit-btn" @click="startEdit(item)">Edit</button>
              <template v-else>
                <button class="save-btn" @click="saveEdit(item.id)">Save</button>
                <button class="cancel-btn" @click="editingId = null">X</button>
              </template>
              <button :class="['toggle-btn', item.is_available ? 'on' : 'off']" @click="toggleItem(item)">
                {{ item.is_available ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const menu = ref([])
const loading = ref(true)
const editingId = ref(null)
const editPrice = ref(0)

function startEdit(item) {
  editingId.value = item.id
  editPrice.value = parseFloat(item.base_price)
}

async function saveEdit(id) {
  try {
    const updated = await api.patch(`/admin/menu/${id}`, { base_price: editPrice.value })
    for (const cat of menu.value) {
      const item = cat.items.find(i => i.id === id)
      if (item) { item.base_price = updated.base_price; break }
    }
    editingId.value = null
  } catch (e) { alert('Failed to update') }
}

async function toggleItem(item) {
  try {
    const updated = await api.patch(`/admin/menu/${item.id}/toggle`)
    item.is_available = updated.is_available
  } catch (e) { alert('Failed to toggle') }
}

onMounted(async () => {
  try { menu.value = await api.get('/admin/menu') }
  catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-page { background: var(--bg); min-height: 100vh; }
.admin-header { display: flex; align-items: center; gap: 12px; padding: 16px; background: #1a1a2e; color: #fff; }
.back-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.admin-header h2 { font-size: 18px; }
.loading { text-align: center; padding: 40px; color: var(--text-muted); }

.menu-list { padding: 16px; }
.cat-section { margin-bottom: 24px; }
.cat-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
.cat-zh { font-size: 13px; font-weight: 400; color: var(--text-muted); }

.menu-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--white); border-radius: 10px; margin-bottom: 6px; box-shadow: var(--shadow); }
.menu-row-left { flex: 1; min-width: 0; }
.menu-item-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu-item-name.disabled { color: var(--text-muted); text-decoration: line-through; }
.menu-item-zh { font-size: 11px; color: var(--text-muted); }

.menu-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.menu-price { font-size: 14px; font-weight: 700; min-width: 65px; text-align: right; }
.price-input { width: 65px; padding: 4px 6px; border: 1.5px solid var(--blue); border-radius: 6px; font-size: 13px; text-align: right; }

.menu-actions { display: flex; gap: 4px; }
.edit-btn, .save-btn, .cancel-btn { padding: 4px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
.edit-btn { background: var(--bg); color: var(--text-muted); }
.save-btn { background: #2e7d32; color: #fff; }
.cancel-btn { background: #e53e3e; color: #fff; }
.toggle-btn { padding: 4px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
.toggle-btn.on { background: #e8f5e9; color: #2e7d32; }
.toggle-btn.off { background: #ffebee; color: #c62828; }
</style>
