<template>
  <div class="page">
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">Vouchers</h1>
        <p class="page-sub">{{ vouchers.length }} voucher{{ vouchers.length!==1?'s':'' }}</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">+ Create Voucher</button>
    </div>

    <!-- Controls -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div style="display:flex;gap:4px;background:#fff;border:1px solid var(--border);border-radius:9px;padding:4px">
        <button v-for="f in filters" :key="f.v" :class="['ftab', {active: activeFilter===f.v}]"
          @click="activeFilter=f.v; load()">{{ f.l }}</button>
      </div>
      <div style="display:flex;gap:6px">
        <select v-model="sortBy" class="input" style="width:auto;min-width:150px" @change="load()">
          <option value="created_at">Newest first</option>
          <option value="used_count">Most used</option>
          <option value="expires_at">Expiry soonest</option>
          <option value="code">Code A–Z</option>
        </select>
        <button class="btn btn-ghost" style="padding:8px 14px;font-weight:700" @click="toggleDir">{{ sortDir==='desc'?'↓':'↑' }}</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="padding:0;overflow:hidden">
      <div v-if="loading" class="empty">Loading…</div>
      <div v-else-if="!vouchers.length" class="empty">No vouchers found.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>Code</th><th>Type</th><th>Value</th><th>Min Spend</th><th>Uses</th><th>Status</th><th>Expires</th><th></th></tr>
          </thead>
          <tbody>
            <template v-for="v in vouchers" :key="v.id">
              <tr :class="{ 'row-dim': !v.is_active || isExpired(v) }">
                <td>
                  <div class="v-code">{{ v.code }}</div>
                  <div v-if="v.description" class="v-desc">{{ v.description }}</div>
                </td>
                <td><span :class="['tpill', `tp-${v.type}`]">{{ typeLabel(v.type) }}</span></td>
                <td style="font-weight:600">{{ valueLabel(v) }}</td>
                <td style="color:var(--muted)">{{ v.min_spend>0 ? `RM${parseFloat(v.min_spend).toFixed(2)}` : '—' }}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
                    <span style="font-weight:700">{{ v.used_count }}</span>
                    <span style="color:var(--muted)">/</span>
                    <span style="color:var(--muted)">{{ v.total_uses??'∞' }}</span>
                  </div>
                  <div v-if="v.total_uses" style="height:3px;background:var(--border);border-radius:2px;margin-top:4px;width:60px;overflow:hidden">
                    <div style="height:100%;background:var(--blue);border-radius:2px" :style="{width:Math.min(100,(v.used_count/v.total_uses)*100)+'%'}"></div>
                  </div>
                </td>
                <td><span :class="['spill', spClass(v)]">{{ spLabel(v) }}</span></td>
                <td style="font-size:12px;color:var(--muted)">{{ v.expires_at ? fmtDate(v.expires_at) : '—' }}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px" @click="openEdit(v)">Edit</button>
                    <button :class="['btn', v.is_active ? 'btn-ghost' : 'btn-primary']" style="font-size:12px;padding:5px 10px" @click="toggle(v)">
                      {{ v.is_active ? 'Disable' : 'Enable' }}
                    </button>
                    <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px" @click="toggleHistory(v.id)">
                      History{{ v.used_count>0 ? ` (${v.used_count})` : '' }}
                    </button>
                  </div>
                </td>
              </tr>
              <!-- Redemption sub-row -->
              <tr v-if="expandedId===v.id">
                <td colspan="8" style="padding:0;background:#fafbff">
                  <div style="padding:16px 20px">
                    <div v-if="loadingR" style="color:var(--muted);font-size:13px">Loading…</div>
                    <div v-else-if="!redemptions.length" style="color:var(--muted);font-size:13px">No redemptions yet.</div>
                    <table v-else style="width:100%;border-collapse:collapse;font-size:13px">
                      <thead><tr>
                        <th style="text-align:left;padding:0 12px 8px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Member</th>
                        <th style="text-align:left;padding:0 12px 8px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Order</th>
                        <th style="text-align:left;padding:0 12px 8px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Discount</th>
                        <th style="text-align:left;padding:0 12px 8px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Date</th>
                      </tr></thead>
                      <tbody>
                        <tr v-for="r in redemptions" :key="r.id" style="border-top:1px solid var(--border)">
                          <td style="padding:8px 12px">{{ r.member_name }} <span style="color:var(--muted)">{{ r.member_phone }}</span></td>
                          <td style="padding:8px 12px;color:var(--muted)">{{ r.order_no||'—' }}</td>
                          <td style="padding:8px 12px;font-weight:600">RM{{ parseFloat(r.discount_applied).toFixed(2) }}</td>
                          <td style="padding:8px 12px;color:var(--muted);font-size:12px">{{ fmtDatetime(r.redeemed_at) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modal.open" class="backdrop" @click.self="modal.open=false">
      <div class="modal">
        <div class="mhdr">
          <h3>{{ modal.editing ? 'Edit Voucher' : 'Create Voucher' }}</h3>
          <button class="mcls" @click="modal.open=false">✕</button>
        </div>
        <div class="mbody">
          <div class="fg">
            <div class="mfield" style="grid-column:1/-1">
              <label class="fl">Code <span class="req">*</span></label>
              <input v-model="form.code" type="text" class="input" placeholder="e.g. GRAND10"
                style="text-transform:uppercase;font-weight:700;letter-spacing:1px" :disabled="modal.editing" />
              <p class="hint">Members type this at checkout. Uppercase only.</p>
            </div>
            <div class="mfield" style="grid-column:1/-1">
              <label class="fl">Description (internal)</label>
              <input v-model="form.description" type="text" class="input" placeholder="e.g. Ramadan 2026 campaign" />
            </div>
            <div class="mfield">
              <label class="fl">Type <span class="req">*</span></label>
              <select v-model="form.type" class="input">
                <option value="fixed">Fixed (RM off)</option>
                <option value="percent">Percentage (% off)</option>
                <option value="free_item">Free Item</option>
                <option value="points_multiplier">Points Multiplier</option>
              </select>
            </div>
            <div class="mfield">
              <label class="fl">{{ vfLabel }} <span class="req">*</span></label>
              <input v-model.number="form.value" type="number" step="0.01" min="0" class="input" :placeholder="vfHint" />
            </div>
            <div v-if="form.type==='free_item'" class="mfield" style="grid-column:1/-1">
              <label class="fl">Free Item <span class="req">*</span></label>
              <select v-model.number="form.free_item_id" class="input">
                <option value="">— Select menu item —</option>
                <optgroup v-for="cat in menuCats" :key="cat.id" :label="cat.name">
                  <option v-for="item in cat.items" :key="item.id" :value="item.id">{{ item.name }} — RM{{ item.base_price }}</option>
                </optgroup>
              </select>
            </div>
            <div v-if="form.type==='percent'" class="mfield" style="grid-column:1/-1">
              <label class="fl">Max Discount Cap (RM)</label>
              <input v-model.number="form.max_discount" type="number" step="0.01" min="0" class="input" placeholder="Leave blank for no cap" />
            </div>
            <div class="mfield">
              <label class="fl">Min Spend (RM)</label>
              <input v-model.number="form.min_spend" type="number" step="0.01" min="0" class="input" placeholder="0" />
            </div>
            <div class="mfield">
              <label class="fl">Per Member Limit</label>
              <input v-model.number="form.per_user_limit" type="number" min="1" class="input" placeholder="1" />
            </div>
            <div class="mfield">
              <label class="fl">Total Uses</label>
              <input v-model="form.total_uses" type="number" min="1" class="input" placeholder="Blank = unlimited" />
            </div>
            <div class="mfield">
              <label class="fl">Status</label>
              <div class="toggle-row" @click="form.is_active=!form.is_active">
                <span>{{ form.is_active ? 'Active' : 'Inactive' }}</span>
                <div class="toggle" :class="{on:form.is_active}"><div class="knob"></div></div>
              </div>
            </div>
            <div class="mfield">
              <label class="fl">Starts At</label>
              <input v-model="form.starts_at" type="datetime-local" class="input" />
              <p class="hint">Blank = active immediately.</p>
            </div>
            <div class="mfield">
              <label class="fl">Expires At</label>
              <input v-model="form.expires_at" type="datetime-local" class="input" />
              <p class="hint">Blank = no expiry.</p>
            </div>
          </div>
          <div v-if="modal.error" class="err" style="margin-top:14px">{{ modal.error }}</div>
        </div>
        <div class="mftr">
          <button class="btn btn-ghost" @click="modal.open=false">Cancel</button>
          <button class="btn btn-primary" style="flex:1;padding:12px" :disabled="modal.saving" @click="save">
            {{ modal.saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Create Voucher' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'

const vouchers    = ref([])
const loading     = ref(true)
const activeFilter = ref('all')
const sortBy      = ref('created_at')
const sortDir     = ref('desc')
const expandedId  = ref(null)
const redemptions = ref([])
const loadingR    = ref(false)
const menuCats    = ref([])

const filters = [
  {v:'all',l:'All'},{v:'active',l:'Active'},{v:'expired',l:'Expired'},{v:'inactive',l:'Inactive'}
]

const modal = reactive({ open:false, editing:false, saving:false, error:'' })
const blank = () => ({ id:null, code:'', description:'', type:'fixed', value:'', free_item_id:'', min_spend:0, max_discount:'', total_uses:'', per_user_limit:1, is_active:true, starts_at:'', expires_at:'' })
const form = reactive(blank())

const vfLabel = computed(() => ({ fixed:'Discount (RM)', percent:'Discount (%)', free_item:'Item Value (auto)', points_multiplier:'Multiplier' }[form.type]||'Value'))
const vfHint  = computed(() => ({ fixed:'e.g. 2.00', percent:'e.g. 10', points_multiplier:'e.g. 2' }[form.type]||''))

function typeLabel(t) { return {fixed:'Fixed',percent:'%',free_item:'Free Item',points_multiplier:'×Points'}[t]||t }
function valueLabel(v) {
  if (v.type==='fixed')             return `RM${parseFloat(v.value).toFixed(2)}`
  if (v.type==='percent')           return `${v.value}%${v.max_discount?` (max RM${parseFloat(v.max_discount).toFixed(2)})`:''}` 
  if (v.type==='free_item')         return v.free_item_name||`Item #${v.free_item_id}`
  if (v.type==='points_multiplier') return `${v.value}×`
  return v.value
}
function isExpired(v) { return v.expires_at && new Date(v.expires_at) < new Date() }
function spLabel(v) {
  if (!v.is_active) return 'Disabled'
  if (isExpired(v)) return 'Expired'
  if (v.starts_at && new Date(v.starts_at) > new Date()) return 'Scheduled'
  return 'Active'
}
function spClass(v) { return {'Active':'sp-on','Disabled':'sp-off','Expired':'sp-exp','Scheduled':'sp-sch'}[spLabel(v)]||'' }
function fmtDate(dt) { return new Date(dt).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'}) }
function fmtDatetime(dt) { return new Date(dt).toLocaleString('en-MY',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kuala_Lumpur'}) }

async function load() {
  loading.value = true
  try { vouchers.value = await api.get('/admin/vouchers', { sort:sortBy.value, order:sortDir.value, filter:activeFilter.value }) }
  catch (e) { console.error(e) }
  finally { loading.value = false }
}
function toggleDir() { sortDir.value = sortDir.value==='desc'?'asc':'desc'; load() }

async function toggleHistory(id) {
  if (expandedId.value===id) { expandedId.value=null; return }
  expandedId.value=id; redemptions.value=[]; loadingR.value=true
  try { redemptions.value = await api.get(`/admin/vouchers/${id}/redemptions`) }
  catch (e) { console.error(e) }
  finally { loadingR.value=false }
}

async function toggle(v) {
  try {
    const u = await api.patch(`/admin/vouchers/${v.id}/toggle`)
    const i = vouchers.value.findIndex(x=>x.id===v.id)
    if (i!==-1) vouchers.value[i] = {...vouchers.value[i],...u}
  } catch (e) { console.error(e) }
}

function openCreate() { Object.assign(form, blank()); modal.editing=false; modal.error=''; modal.open=true }
function openEdit(v) {
  Object.assign(form, {
    id:v.id, code:v.code, description:v.description||'', type:v.type, value:v.value,
    free_item_id:v.free_item_id||'', min_spend:v.min_spend, max_discount:v.max_discount||'',
    total_uses:v.total_uses??'', per_user_limit:v.per_user_limit, is_active:!!v.is_active,
    starts_at:v.starts_at?v.starts_at.slice(0,16):'', expires_at:v.expires_at?v.expires_at.slice(0,16):'',
  })
  modal.editing=true; modal.error=''; modal.open=true
}

async function save() {
  modal.error=''
  if (!form.code||!form.type||form.value==='') { modal.error='Code, type and value are required'; return }
  if (form.type==='free_item'&&!form.free_item_id) { modal.error='Select a free item'; return }
  const payload = {
    code:form.code.toUpperCase().trim(), description:form.description||null, type:form.type,
    value:parseFloat(form.value), free_item_id:form.free_item_id||null,
    min_spend:parseFloat(form.min_spend)||0, max_discount:form.max_discount!==''?parseFloat(form.max_discount):null,
    total_uses:form.total_uses!==''?parseInt(form.total_uses):null,
    per_user_limit:parseInt(form.per_user_limit)||1, is_active:form.is_active,
    starts_at:form.starts_at||null, expires_at:form.expires_at||null,
  }
  modal.saving=true
  try {
    if (modal.editing) {
      const u = await api.patch(`/admin/vouchers/${form.id}`, payload)
      const i = vouchers.value.findIndex(x=>x.id===form.id)
      if (i!==-1) vouchers.value[i]=u
    } else {
      const c = await api.post('/admin/vouchers', payload)
      vouchers.value.unshift(c)
    }
    modal.open=false
  } catch (e) { modal.error=e.response?.data?.error||'Failed to save' }
  finally { modal.saving=false }
}

onMounted(async () => {
  await Promise.all([load(), api.get('/admin/menu').then(m=>{menuCats.value=m}).catch(()=>{})])
})
</script>

<style scoped>
.empty    { padding:48px; text-align:center; color:var(--muted); }
.row-dim td { opacity:.5; }
.v-code   { font-family:monospace; font-size:14px; font-weight:800; letter-spacing:1px; }
.v-desc   { font-size:11px; color:var(--muted); margin-top:2px; }
.ftab     { padding:6px 14px; border-radius:7px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:600; color:var(--muted); }
.ftab.active { background:var(--blue); color:#fff; }
.tpill    { padding:3px 9px; border-radius:10px; font-size:11px; font-weight:700; }
.tp-fixed          { background:#dbeafe; color:#1e40af; }
.tp-percent        { background:#fef9c3; color:#713f12; }
.tp-free_item      { background:#d1fae5; color:#065f46; }
.tp-points_multiplier { background:#ede9fe; color:#5b21b6; }
.spill    { padding:3px 9px; border-radius:10px; font-size:11px; font-weight:700; }
.sp-on    { background:#d1fae5; color:#065f46; }
.sp-off   { background:#f3f4f6; color:#6b7280; }
.sp-exp   { background:#fee2e2; color:#991b1b; }
.sp-sch   { background:#fef3c7; color:#92400e; }
.err      { background:#fee2e2; color:#991b1b; padding:10px 14px; border-radius:7px; font-size:13px; }
.backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:500; display:flex; align-items:center; justify-content:center; padding:16px; }
.modal    { background:#fff; border-radius:16px; width:100%; max-width:560px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.2); }
.mhdr     { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid var(--border); }
.mhdr h3  { font-size:18px; font-weight:800; }
.mcls     { background:none; border:none; font-size:18px; color:var(--muted); cursor:pointer; padding:4px 8px; border-radius:6px; }
.mcls:hover { background:var(--bg); }
.mbody    { padding:20px 24px; overflow-y:auto; flex:1; }
.mftr     { padding:16px 24px; border-top:1px solid var(--border); display:flex; gap:10px; }
.fg       { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media(max-width:500px){ .fg{ grid-template-columns:1fr; } }
.mfield   { display:flex; flex-direction:column; }
.fl       { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:7px; }
.req      { color:#e53e3e; }
.hint     { font-size:11px; color:var(--muted); margin-top:4px; }
.toggle-row { display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:9px 12px; border:1.5px solid var(--border); border-radius:7px; }
.toggle   { width:44px; height:24px; border-radius:12px; background:#d1d5db; position:relative; transition:background .2s; flex-shrink:0; }
.toggle.on { background:var(--blue); }
.knob     { width:18px; height:18px; border-radius:50%; background:#fff; position:absolute; top:3px; left:3px; transition:transform .2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
.toggle.on .knob { transform:translateX(20px); }
</style>