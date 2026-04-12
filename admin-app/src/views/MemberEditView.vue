<template>
  <div class="page">
    <div class="page-header" style="display:flex;align-items:center;gap:16px">
      <button class="btn btn-ghost" @click="$router.back()">← Back</button>
      <h1 class="page-title" style="margin:0">{{ isNew ? 'Create Member' : 'Edit Member' }}</h1>
    </div>

    <div class="card edit-card">
      <div v-if="loadError" class="error-msg">{{ loadError }}</div>

      <div class="field-grid">
        <div class="field">
          <label class="field-label">Full Name <span class="req">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="e.g. Ahmad bin Ali" />
        </div>
        <div class="field">
          <label class="field-label">Phone <span class="req">*</span></label>
          <input v-model="form.phone" type="tel" class="input" placeholder="e.g. 0123456789" />
        </div>
        <div class="field">
          <label class="field-label">Email</label>
          <input v-model="form.email" type="email" class="input" placeholder="optional" />
        </div>
        <div class="field">
          <label class="field-label">{{ isNew ? 'Password' : 'New Password' }} {{ isNew ? '*' : '(leave blank to keep)' }}</label>
          <input v-model="form.password" type="password" class="input" :placeholder="isNew ? 'Min 6 characters' : 'Leave blank to keep current'" />
        </div>
        <div class="field">
          <label class="field-label">Tier</label>
          <select v-model="form.tier" class="input">
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Points Balance</label>
          <input v-model.number="form.points" type="number" min="0" class="input" placeholder="0" />
        </div>
      </div>

      <div v-if="!isNew" class="field" style="margin-top:8px">
        <label class="toggle-row">
          <span class="field-label" style="margin:0">Account Active</span>
          <div class="toggle" :class="{ on: form.is_active }" @click="form.is_active = !form.is_active">
            <div class="toggle-knob"></div>
          </div>
        </label>
        <p class="field-hint">Inactive accounts cannot log in.</p>
      </div>

      <div v-if="saveError" class="error-msg" style="margin-top:16px">{{ saveError }}</div>
      <div v-if="saved" class="success-msg">✓ {{ isNew ? 'Account created' : 'Changes saved' }}</div>

      <div class="btn-row" style="margin-top:24px">
        <button class="btn btn-ghost" @click="$router.back()">Cancel</button>
        <button class="btn btn-primary" style="flex:1;padding:13px" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : isNew ? 'Create Account' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route  = useRoute()
const router = useRouter()
const isNew  = computed(() => route.params.id === 'new')

const form = ref({ name: '', phone: '', email: '', password: '', tier: 'bronze', points: 0, is_active: true })
const saving   = ref(false)
const saved    = ref(false)
const saveError  = ref('')
const loadError  = ref('')

onMounted(async () => {
  if (isNew.value) return
  try {
    const m = await api.get(`/admin/members/${route.params.id}`)
    form.value = { name: m.name, phone: m.phone, email: m.email || '', password: '', tier: m.tier, points: m.points, is_active: !!m.is_active }
  } catch (e) {
    loadError.value = e.response?.data?.error || 'Failed to load member'
  }
})

async function save() {
  saveError.value = ''
  saved.value     = false
  if (!form.value.name || !form.value.phone) { saveError.value = 'Name and phone are required'; return }
  if (isNew.value && !form.value.password)   { saveError.value = 'Password is required for new accounts'; return }
  if (form.value.password && form.value.password.length < 6) { saveError.value = 'Password must be at least 6 characters'; return }

  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.password) delete payload.password
    if (!payload.email)    payload.email = null

    if (isNew.value) {
      await api.post('/admin/members', payload)
      router.push('/members')
    } else {
      await api.patch(`/admin/members/${route.params.id}`, payload)
      saved.value = true
      setTimeout(() => { saved.value = false }, 3000)
    }
  } catch (e) {
    saveError.value = e.response?.data?.error || 'Failed to save'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-card   { max-width: 640px; }
.field-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media(max-width: 560px) { .field-grid { grid-template-columns: 1fr; } }
.field       { display: flex; flex-direction: column; }
.field-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 7px; }
.field-hint  { font-size: 12px; color: var(--muted); margin-top: 5px; }
.req         { color: #e53e3e; }
.btn-row     { display: flex; gap: 10px; }
.error-msg   { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; }
.success-msg { background: #d1fae5; color: #065f46; padding: 10px 14px; border-radius: 7px; font-size: 13px; }

/* Toggle */
.toggle-row  { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.toggle      { width: 44px; height: 24px; border-radius: 12px; background: #d1d5db; position: relative; transition: background .2s; cursor: pointer; }
.toggle.on   { background: var(--blue); }
.toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.toggle.on .toggle-knob { transform: translateX(20px); }
</style>