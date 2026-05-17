<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Menu</h1>
      <p class="page-sub">{{ auth.isManager ? 'Toggle items, update prices and visibility' : 'Toggle item availability' }}</p>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <div v-for="cat in menu" :key="cat.id" class="card cat-block">
        <h2 class="cat-title">{{ cat.name }}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th v-if="auth.isManager">Base Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in cat.items" :key="item.id" :class="{ disabled: !item.is_available }">
                <td>
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-zh">{{ item.name_zh }}</div>
                </td>

                <!-- Price — manager only -->
                <td v-if="auth.isManager">
                  <div v-if="editing === item.id" class="price-edit">
                    <input v-model="editPrice" type="number" step="0.50" class="input price-input" @keyup.enter="savePrice(item)" />
                    <button class="btn btn-primary btn-sm" @click="savePrice(item)">Save</button>
                    <button class="btn btn-ghost btn-sm" @click="editing = null">✕</button>
                  </div>
                  <span v-else class="price-display" @click="startEdit(item)">
                    RM {{ parseFloat(item.base_price).toFixed(2) }} <span class="edit-hint">✏️</span>
                  </span>
                </td>

                <!-- Status badge -->
                <td>
                  <span :class="item.is_available ? 'badge-active' : 'badge-off'">
                    {{ item.is_available ? 'Available' : 'Unavailable' }}
                  </span>
                </td>

                <!-- Actions -->
                <td>
                  <!-- Staff: toggle available/unavailable only -->
                  <button
                    v-if="!auth.isManager"
                    :class="['btn btn-sm', item.is_available ? 'btn-danger' : 'btn-primary']"
                    @click="toggleItem(item)"
                  >{{ item.is_available ? 'Set Unavailable' : 'Set Available' }}</button>

                  <!-- Manager: toggle + hide/show separately -->
                  <div v-else class="action-group">
                    <button
                      :class="['btn btn-sm', item.is_available ? 'btn-danger' : 'btn-primary']"
                      @click="toggleItem(item)"
                    >{{ item.is_available ? 'Hide' : 'Show' }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth    = useAuthStore()
const menu    = ref([])
const loading = ref(true)
const editing = ref(null)
const editPrice = ref('')

function startEdit(item) {
  editing.value = item.id
  editPrice.value = parseFloat(item.base_price).toFixed(2)
}

async function savePrice(item) {
  try {
    await api.patch(`/admin/menu/${item.id}`, { base_price: parseFloat(editPrice.value) })
    item.base_price = editPrice.value
    editing.value = null
  } catch (e) { console.error(e) }
}

async function toggleItem(item) {
  try {
    await api.patch(`/admin/menu/${item.id}/toggle`)
    item.is_available = !item.is_available
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  try { menu.value = await api.get('/admin/menu') }
  catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.loading { padding: 40px; text-align: center; color: var(--muted); }
.cat-block { margin-bottom: 20px; }
.cat-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; color: var(--text); }
.item-name { font-weight: 600; font-size: 13px; }
.item-zh { font-size: 12px; color: var(--muted); margin-top: 1px; }
tr.disabled td { opacity: 0.45; }
.price-display { cursor: pointer; font-weight: 600; font-size: 13px; }
.price-display:hover .edit-hint { opacity: 1; }
.edit-hint { opacity: 0; font-size: 11px; transition: opacity 0.15s; }
.price-edit { display: flex; gap: 6px; align-items: center; }
.price-input { width: 90px; padding: 6px 10px; font-size: 13px; }
.badge-active { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; background:#d1fae5; color:#065f46; }
.badge-off    { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; background:#f3f4f6; color:#6b7280; }
.action-group { display: flex; gap: 6px; align-items: center; }
</style>