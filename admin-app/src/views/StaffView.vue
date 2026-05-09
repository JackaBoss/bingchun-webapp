<template>
  <div class="page">
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <h1 class="page-title">Staff</h1>
          <p class="page-sub">Manage staff and store manager accounts</p>
        </div>
        <button class="btn btn-primary" @click="openCreate">+ Add Staff</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card" style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>

    <!-- Staff table -->
    <div v-else class="card">
      <div v-if="staff.length === 0" class="empty-state">
        <p style="font-size:32px;margin-bottom:8px">🧑‍💼</p>
        <p style="font-weight:700;font-size:16px">No staff yet</p>
        <p style="color:var(--muted);font-size:14px;margin-top:4px">Add your first staff member above</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Outlet</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in staff" :key="s.id">
              <td style="font-weight:600">{{ s.name }}</td>
              <td>{{ s.phone }}</td>
              <td>
                <span :class="['badge', `badge-${s.role}`]">
                  {{ s.role === 'store_manager' ? 'Store Manager' : 'Staff' }}
                </span>
              </td>
              <td>{{ s.outlet_name || '—' }}</td>
              <td>
                <span :class="['badge', s.is_active ? 'badge-paid' : 'badge-cancelled']">
                  {{ s.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td style="color:var(--muted);font-size:13px">{{ formatDate(s.created_at) }}</td>
              <td>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" @click="openEdit(s)">Edit</button>
                  <button
                    class="btn btn-danger"
                    style="padding:5px 12px;font-size:12px"
                    @click="toggleActive(s)"
                  >{{ s.is_active ? 'Deactivate' : 'Activate' }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <h3>{{ editTarget ? 'Edit Staff' : 'Add Staff' }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label class="field-label">Full Name <span class="req">*</span></label>
            <input v-model="form.name" class="input" placeholder="e.g. Ahmad bin Ali" />
          </div>
          <div class="field">
            <label class="field-label">Phone Number <span class="req">*</span></label>
            <input v-model="form.phone" class="input" type="tel" placeholder="01X-XXXXXXX" :disabled="!!editTarget" />
          </div>
          <div class="field">
            <label class="field-label">{{ editTarget ? 'New Password (leave blank to keep)' : 'Password' }} <span v-if="!editTarget" class="req">*</span></label>
            <input v-model="form.password" class="input" type="password" placeholder="Min 8 characters" />
          </div>
          <div class="field">
            <label class="field-label">Role <span class="req">*</span></label>
            <select v-model="form.role" class="input">
              <option value="staff">Staff</option>
              <option value="store_manager">Store Manager</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Outlet</label>
            <select v-model="form.outlet_id" class="input">
              <option :value="null">All outlets (no restriction)</option>
              <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
            </select>
          </div>

          <div v-if="formError" class="error-msg">{{ formError }}</div>

          <div class="modal-actions">
            <button class="btn btn-ghost" @click="closeModal">Cancel</button>
            <button class="btn btn-primary" @click="submit" :disabled="saving">
              {{ saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Account' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/services/api'

const staff = ref([])
const outlets = ref([])
const loading = ref(true)
const modal = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({ name: '', phone: '', password: '', role: 'staff', outlet_id: null })

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function load() {
  loading.value = true
  try {
    const [staffData, outletData] = await Promise.all([
      api.get('/admin/staff'),
      api.get('/admin/outlets'),
    ])
    staff.value = staffData
    outlets.value = outletData
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editTarget.value = null
  Object.assign(form, { name: '', phone: '', password: '', role: 'staff', outlet_id: null })
  formError.value = ''
  modal.value = true
}

function openEdit(s) {
  editTarget.value = s
  Object.assign(form, { name: s.name, phone: s.phone, password: '', role: s.role, outlet_id: s.outlet_id })
  formError.value = ''
  modal.value = true
}

function closeModal() { modal.value = false }

async function submit() {
  formError.value = ''
  if (!form.name.trim() || !form.phone.trim()) { formError.value = 'Name and phone are required'; return }
  if (!editTarget.value && !form.password) { formError.value = 'Password is required for new accounts'; return }
  if (form.password && form.password.length < 8) { formError.value = 'Password must be at least 8 characters'; return }

  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      role: form.role,
      outlet_id: form.outlet_id,
      ...(form.password ? { password: form.password } : {}),
    }
    if (!editTarget.value) {
      payload.phone = form.phone.trim()
      const created = await api.post('/admin/staff', payload)
      staff.value.unshift(created)
    } else {
      const updated = await api.patch(`/admin/staff/${editTarget.value.id}`, payload)
      const idx = staff.value.findIndex(s => s.id === updated.id)
      if (idx !== -1) staff.value[idx] = updated
    }
    closeModal()
  } catch (e) {
    formError.value = e.response?.data?.error || 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function toggleActive(s) {
  try {
    const updated = await api.patch(`/admin/staff/${s.id}`, { is_active: !s.is_active })
    const idx = staff.value.findIndex(x => x.id === updated.id)
    if (idx !== -1) staff.value[idx] = updated
  } catch (e) {
    console.error(e)
  }
}

onMounted(load)
</script>

<style scoped>
.empty-state { text-align: center; padding: 48px 20px; color: var(--muted); }
.req { color: #e53e3e; }
.field { margin-bottom: 14px; }
.field-label { display: block; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 18px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--muted); }
.modal-body { padding: 24px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.error-msg { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; margin-top: 4px; }
</style>