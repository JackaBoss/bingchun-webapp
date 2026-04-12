<template>
  <div class="page">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 class="page-title">Members</h1>
        <p class="page-sub">{{ members.length }} registered members</p>
      </div>
      <input v-model="search" type="text" placeholder="Search name or phone..." class="input" style="width:260px" />
    </div>

    <div class="card">
      <div v-if="loading" class="empty">Loading...</div>
      <div v-else-if="filtered.length === 0" class="empty">No members found.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Tier</th>
              <th>Points</th>
              <th>Value</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.id">
              <td>
                <div class="member-row">
                  <div class="avatar">{{ m.name.charAt(0).toUpperCase() }}</div>
                  <span class="fw600">{{ m.name }}</span>
                </div>
              </td>
              <td class="text-muted">{{ m.phone }}</td>
              <td><span :class="['badge', `badge-${m.tier}`]">{{ m.tier }}</span></td>
              <td><strong>{{ m.points }}</strong> pts</td>
              <td class="text-muted">≈ RM {{ (m.points * 0.01).toFixed(2) }}</td>
              <td class="text-muted">{{ formatDate(m.created_at) }}</td>
              <td>
                <router-link :to="`/members/${m.id}`" class="btn btn-ghost" style="font-size:12px;padding:5px 10px">
                  History
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const members = ref([])
const loading = ref(true)
const search  = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return members.value
  return members.value.filter(m =>
    m.name?.toLowerCase().includes(q) || m.phone?.includes(q)
  )
})

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  try {
    members.value = await api.get('/admin/members')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.empty      { padding: 40px; text-align: center; color: var(--muted); }
.member-row { display: flex; align-items: center; gap: 10px; }
.avatar     { width: 30px; height: 30px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fw600      { font-weight: 600; font-size: 13px; }
.text-muted { color: var(--muted); font-size: 13px; }
</style>