<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title">Outlets</div>
      <div class="page-sub">Toggle outlet status and manage operating hours</div>
    </div>

    <div v-if="loading" class="loading-state">Loading outlets…</div>

    <div v-else class="outlets-list">
      <div v-for="outlet in outlets" :key="outlet.id" class="outlet-card">

        <!-- ── Header ── -->
        <div class="outlet-header">
          <div class="outlet-info">
            <div class="outlet-name">{{ outlet.name }}</div>
            <div class="outlet-meta">{{ outlet.store_code }} · {{ outlet.address }}</div>
            <div v-if="!outlet.is_open && outlet.close_reason" class="reason-badge">
              ⚠️ {{ outlet.close_reason }}
              <button class="reason-edit-btn" @click="openEditReason(outlet)" title="Edit reason">✏️</button>
            </div>
          </div>

          <button
            class="status-toggle"
            :class="outlet.is_open ? 'status-open' : 'status-closed'"
            @click="onToggleClick(outlet)"
            :disabled="toggling === outlet.id"
          >
            <span class="status-dot"></span>
            {{ outlet.is_open ? 'OPEN' : 'CLOSED' }}
          </button>
        </div>

        <!-- ── Hours expand trigger ── -->
        <button class="hours-trigger" @click="toggleExpand(outlet.id)">
          <span>🕐</span>
          {{ expandedId === outlet.id ? 'Hide hours ▲' : 'Manage hours ▼' }}
        </button>

        <!-- ── Hours editor ── -->
        <div v-if="expandedId === outlet.id" class="hours-panel">
          <div v-if="hoursLoading[outlet.id]" class="loading-small">Loading hours…</div>
          <template v-else-if="hours[outlet.id]">

            <!-- Batch bar -->
            <div class="batch-bar">
              <label class="select-all-label">
                <input
                  type="checkbox"
                  :checked="allSelected[outlet.id]"
                  @change="toggleSelectAll(outlet.id, $event.target.checked)"
                />
                <span>All</span>
              </label>
              <div class="batch-apply">
                <span class="batch-label">Apply to selected:</span>
                <input type="time" v-model="batchOpen[outlet.id]" class="time-inp" />
                <span class="time-dash">–</span>
                <input type="time" v-model="batchClose[outlet.id]" class="time-inp" />
                <button class="btn btn-ghost btn-sm" @click="applyBatch(outlet.id)">Apply</button>
              </div>
            </div>

            <!-- Day rows -->
            <div class="days-table">
              <div class="days-header">
                <span></span>
                <span>Day</span>
                <span>Status</span>
                <span>Open</span>
                <span class="time-dash-col">–</span>
                <span>Close</span>
              </div>
              <div
                v-for="(row, idx) in hours[outlet.id]"
                :key="row.day_of_week"
                class="day-row"
                :class="{ 'day-selected': daySelected[outlet.id]?.[idx], 'day-closed': row.is_closed }"
              >
                <input
                  type="checkbox"
                  :checked="daySelected[outlet.id]?.[idx]"
                  @change="onDaySelect(outlet.id, idx, $event.target.checked)"
                />
                <span class="day-name">{{ DAY_NAMES[row.day_of_week] }}</span>
                <label class="closed-pill" :class="row.is_closed ? 'pill-closed' : 'pill-open'">
                  <input
                    type="checkbox"
                    :checked="!!row.is_closed"
                    @change="row.is_closed = $event.target.checked ? 1 : 0"
                  />
                  {{ row.is_closed ? 'Closed' : 'Open' }}
                </label>
                <template v-if="!row.is_closed">
                  <input type="time" v-model="row.open_time" class="time-inp" />
                  <span class="time-dash-col">–</span>
                  <input type="time" v-model="row.close_time" class="time-inp" />
                </template>
                <template v-else>
                  <span class="closed-dash">—</span>
                  <span></span>
                  <span></span>
                </template>
              </div>
            </div>

            <!-- Footer -->
            <div class="hours-footer">
              <transition name="fade">
                <span v-if="saveSuccess[outlet.id]" class="save-ok">✓ Hours saved</span>
              </transition>
              <button
                class="btn btn-primary"
                @click="saveHours(outlet.id)"
                :disabled="saving[outlet.id]"
              >
                {{ saving[outlet.id] ? 'Saving…' : 'Save Hours' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ── Close reason modal ── -->
    <teleport to="body">
      <div v-if="modal.show" class="modal-backdrop" @click.self="modal.show = false">
        <div class="modal-box">
          <div class="modal-title">
            {{ modal.editOnly ? 'Edit close reason' : `Close ${modal.outlet?.name}?` }}
          </div>
          <p v-if="!modal.editOnly" class="modal-sub">
            Customers will see this outlet as currently unavailable.
          </p>
          <label class="field-label">Reason <span class="optional">(optional)</span></label>
          <input
            v-model="modal.reason"
            type="text"
            class="input"
            placeholder="e.g. Public holiday, Staff shortage, Renovation"
            maxlength="100"
            autofocus
            @keyup.enter="modal.editOnly ? confirmEditReason() : confirmClose()"
          />
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="modal.show = false">Cancel</button>
            <button
              v-if="modal.editOnly"
              class="btn btn-primary"
              @click="confirmEditReason()"
              :disabled="toggling === modal.outlet?.id"
            >
              Save Reason
            </button>
            <button
              v-else
              class="btn btn-danger"
              @click="confirmClose()"
              :disabled="toggling === modal.outlet?.id"
            >
              Confirm Close
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/services/api'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── State ──────────────────────────────────────────────────────────────────
const loading   = ref(true)
const outlets   = ref([])
const toggling  = ref(null)
const expandedId = ref(null)

const hours       = reactive({})
const hoursLoading = reactive({})
const daySelected  = reactive({})
const allSelected  = reactive({})
const batchOpen    = reactive({})
const batchClose   = reactive({})
const saving      = reactive({})
const saveSuccess  = reactive({})

const modal = reactive({ show: false, outlet: null, reason: '', editOnly: false })

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(fetchOutlets)

async function fetchOutlets() {
  loading.value = true
  try {
    outlets.value = await api.get('/admin/outlets')
  } finally {
    loading.value = false
  }
}

// ── Toggle open / close ────────────────────────────────────────────────────
function onToggleClick(outlet) {
  if (outlet.is_open) {
    // Going → closed: ask for optional reason
    modal.outlet   = outlet
    modal.reason   = ''
    modal.editOnly = false
    modal.show     = true
  } else {
    // Going → open: no reason needed, clear any existing reason
    doToggle(outlet, true, null)
  }
}

async function confirmClose() {
  const outlet = modal.outlet
  modal.show = false
  await doToggle(outlet, false, modal.reason.trim() || null)
}

function openEditReason(outlet) {
  modal.outlet   = outlet
  modal.reason   = outlet.close_reason || ''
  modal.editOnly = true
  modal.show     = true
}

async function confirmEditReason() {
  const outlet = modal.outlet
  modal.show = false
  // Patch just the reason without changing is_open
  toggling.value = outlet.id
  try {
    const updated = await api.patch(`/admin/outlets/${outlet.id}/toggle`, {
      is_open: 0,
      close_reason: modal.reason.trim() || null,
    })
    mergeOutlet(updated)
  } catch {
    alert('Failed to update reason')
  } finally {
    toggling.value = null
  }
}

async function doToggle(outlet, newOpen, reason) {
  toggling.value = outlet.id
  try {
    const updated = await api.patch(`/admin/outlets/${outlet.id}/toggle`, {
      is_open: newOpen ? 1 : 0,
      close_reason: newOpen ? null : reason,
    })
    mergeOutlet(updated)
  } catch {
    alert('Failed to update outlet status')
  } finally {
    toggling.value = null
  }
}

function mergeOutlet(updated) {
  const idx = outlets.value.findIndex(o => o.id === updated.id)
  if (idx !== -1) outlets.value[idx] = { ...outlets.value[idx], ...updated }
}

// ── Hours expand / load ────────────────────────────────────────────────────
async function toggleExpand(outletId) {
  if (expandedId.value === outletId) {
    expandedId.value = null
    return
  }
  expandedId.value = outletId
  if (hours[outletId]) return // already loaded
  hoursLoading[outletId] = true
  try {
    const data = await api.get(`/admin/outlets/${outletId}/hours`)
    // Normalize time strings: "HH:MM:SS" → "HH:MM"
    hours[outletId] = data.map(row => ({
      ...row,
      open_time:  row.open_time  ? row.open_time.slice(0, 5)  : '10:30',
      close_time: row.close_time ? row.close_time.slice(0, 5) : '22:00',
    }))
    daySelected[outletId] = new Array(7).fill(false)
    allSelected[outletId] = false
    batchOpen[outletId]   = '10:30'
    batchClose[outletId]  = '22:00'
  } catch {
    alert('Failed to load hours')
  } finally {
    hoursLoading[outletId] = false
  }
}

// ── Batch select ───────────────────────────────────────────────────────────
function toggleSelectAll(outletId, checked) {
  allSelected[outletId] = checked
  daySelected[outletId] = daySelected[outletId].map(() => checked)
}

function onDaySelect(outletId, idx, checked) {
  daySelected[outletId][idx] = checked
  allSelected[outletId] = daySelected[outletId].every(Boolean)
}

function applyBatch(outletId) {
  const open  = batchOpen[outletId]
  const close = batchClose[outletId]
  if (!open || !close) return
  hours[outletId].forEach((row, idx) => {
    if (daySelected[outletId][idx]) {
      row.open_time  = open
      row.close_time = close
      row.is_closed  = 0
    }
  })
}

// ── Save hours ─────────────────────────────────────────────────────────────
async function saveHours(outletId) {
  saving[outletId]     = true
  saveSuccess[outletId] = false
  try {
    const payload = hours[outletId].map(row => ({
      day_of_week: row.day_of_week,
      open_time:   row.is_closed ? null : (row.open_time  || null),
      close_time:  row.is_closed ? null : (row.close_time || null),
      is_closed:   row.is_closed ? 1 : 0,
    }))
    const saved = await api.put(`/admin/outlets/${outletId}/hours`, { hours: payload })
    // Re-normalize saved rows
    hours[outletId] = saved.map(row => ({
      ...row,
      open_time:  row.open_time  ? row.open_time.slice(0, 5)  : '10:30',
      close_time: row.close_time ? row.close_time.slice(0, 5) : '22:00',
    }))
    saveSuccess[outletId] = true
    setTimeout(() => { saveSuccess[outletId] = false }, 2500)
  } catch {
    alert('Failed to save hours')
  } finally {
    saving[outletId] = false
  }
}
</script>

<style scoped>
/* ── Layout ── */
.loading-state { padding: 48px; text-align: center; color: var(--muted); font-size: 14px; }
.outlets-list  { display: flex; flex-direction: column; gap: 20px; max-width: 760px; }

/* ── Outlet card ── */
.outlet-card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.outlet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
}

.outlet-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.outlet-meta {
  font-size: 13px;
  color: var(--muted);
  margin-top: 3px;
}

.reason-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  background: #fef3c7;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.reason-edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
}
.reason-edit-btn:hover { opacity: 1; }

/* ── Status toggle pill ── */
.status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 100px;
  border: none;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all .2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.status-open {
  background: #dcfce7;
  color: #16a34a;
}
.status-open:hover:not(:disabled) { background: #bbf7d0; }
.status-closed {
  background: #fee2e2;
  color: #dc2626;
}
.status-closed:hover:not(:disabled) { background: #fecaca; }

/* ── Hours trigger ── */
.hours-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  margin-top: 14px;
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  color: var(--blue);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background .15s;
}
.hours-trigger:hover { background: #f0f7ff; }

/* ── Hours panel ── */
.hours-panel {
  border-top: 1px solid var(--border);
  padding: 16px 20px 20px;
}
.loading-small { color: var(--muted); font-size: 13px; padding: 8px 0; }

/* ── Batch bar ── */
.batch-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 12px;
}
.select-all-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
}
.batch-apply {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.batch-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
  white-space: nowrap;
}

/* ── Time input ── */
.time-inp {
  padding: 6px 10px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background: #fff;
  color: var(--text);
  width: 104px;
  transition: border-color .15s;
}
.time-inp:focus { border-color: var(--blue); }
.time-dash { color: var(--muted); font-size: 13px; }

/* ── Days table ── */
.days-table { display: flex; flex-direction: column; gap: 4px; }

.days-header {
  display: grid;
  grid-template-columns: 28px 56px 80px 104px 20px 104px;
  gap: 8px;
  align-items: center;
  padding: 0 8px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.day-row {
  display: grid;
  grid-template-columns: 28px 56px 80px 104px 20px 104px;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  transition: background .1s;
}
.day-row:hover { background: var(--bg); }
.day-selected { background: #eff6ff !important; }
.day-closed { opacity: 0.6; }

.day-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

/* ── Closed pill checkbox ── */
.closed-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
  width: fit-content;
}
.closed-pill input { width: 12px; height: 12px; cursor: pointer; }
.pill-open   { background: #dcfce7; color: #16a34a; }
.pill-closed { background: #fee2e2; color: #dc2626; }

.time-dash-col { text-align: center; color: var(--muted); font-size: 13px; }
.closed-dash   { color: var(--muted); font-size: 18px; grid-column: span 3; }

/* ── Footer ── */
.hours-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.save-ok {
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
}

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-box {
  background: var(--white);
  border-radius: 12px;
  padding: 28px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}
.modal-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 8px;
}
.modal-sub {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 20px;
  line-height: 1.5;
}
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 8px;
}
.optional { font-weight: 400; text-transform: none; font-size: 11px; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 600px) {
  .outlet-header { flex-direction: column; }
  .status-toggle { align-self: flex-start; }
  .days-header,
  .day-row {
    grid-template-columns: 24px 48px 72px 90px 16px 90px;
    gap: 6px;
    font-size: 12px;
  }
  .time-inp { width: 90px; font-size: 12px; }
  .batch-bar { flex-direction: column; align-items: flex-start; }
}
</style>