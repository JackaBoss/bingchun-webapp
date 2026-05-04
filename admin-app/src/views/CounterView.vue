<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Walk-in Points</h1>
      <p class="page-sub">Credit points for in-store purchases</p>
    </div>

    <div class="counter-wrap">
      <div class="card counter-card">

        <!-- Step 1: Phone lookup -->
        <template v-if="step === 'lookup'">
          <p class="step-label">STEP 1 OF 2</p>
          <h2 class="step-title">Find Member</h2>
          <p class="step-sub">Enter phone number or scan customer's QR code.</p>

          <div class="field">
            <label class="field-label">Phone Number</label>
            <div class="input-row">
              <input
                v-model="phone"
                type="tel"
                placeholder="e.g. 0123456789"
                class="input"
                style="flex:1;font-size:16px;padding:12px"
                @keyup.enter="lookup"
                autofocus
              />
              <button class="btn btn-primary" @click="lookup" :disabled="loading || !phone.trim()" style="padding:12px 24px">
                {{ loading ? '...' : 'Search' }}
              </button>
            </div>
          </div>

          <!-- QR scan button -->
          <button class="qr-scan-btn" @click="startScan">
            <span class="qr-icon">📷</span>
            <span>Scan QR Code</span>
          </button>

          <div v-if="error" class="error-msg">{{ error }}</div>
        </template>

        <!-- Step 2: Order ID + bill amount -->
        <template v-else-if="step === 'credit'">
          <p class="step-label">STEP 2 OF 2</p>
          <h2 class="step-title">Credit Points</h2>

          <div class="member-pill">
            <div class="m-avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
            <div class="m-info">
              <div class="m-name">{{ member.name }}</div>
              <div class="m-phone">{{ member.phone }}</div>
            </div>
            <div class="m-pts">
              <div class="pts-num">{{ member.current_points }}</div>
              <div class="pts-lbl">pts</div>
            </div>
          </div>

          <div class="field" style="margin-top:20px">
            <label class="field-label">POS Order ID <span class="required">*</span></label>
            <input
              v-model="walkinOrderNo"
              type="text"
              placeholder="e.g. BC-20260408-0001"
              class="input"
              style="font-size:15px;padding:12px;text-transform:uppercase"
            />
            <p class="field-hint">Key in the order number shown on the POS receipt.</p>
          </div>

          <div class="field">
            <label class="field-label">Bill Amount (RM) <span class="required">*</span></label>
            <input
              v-model="billAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              class="input"
              style="font-size:24px;font-weight:700;padding:14px"
              @keyup.enter="credit"
            />
          </div>

          <div class="field">
            <label class="field-label">Staff Note (optional)</label>
            <input
              v-model="staffNote"
              type="text"
              placeholder="e.g. promo, group order…"
              class="input"
              style="padding:10px"
            />
          </div>

          <div v-if="billAmount > 0" class="earn-preview">
            ⭐ Customer will earn <strong>{{ Math.floor(billAmount) }} pts</strong>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>

          <div class="btn-row">
            <button class="btn btn-ghost" @click="reset">← Back</button>
            <button
              class="btn btn-primary"
              @click="credit"
              :disabled="loading || !billAmount || billAmount <= 0 || !walkinOrderNo.trim()"
              style="flex:1;padding:12px"
            >
              {{ loading ? 'Crediting...' : 'Credit Points' }}
            </button>
          </div>
        </template>

        <!-- Done -->
        <template v-else>
          <div class="success">
            <div class="success-ring">✓</div>
            <h2>Points Credited!</h2>
            <p class="success-name">{{ result.member.name }}</p>
            <div class="success-stats">
              <div class="ss">
                <div class="ss-num green">+{{ result.points_earned }}</div>
                <div class="ss-lbl">Earned</div>
              </div>
              <div class="ss-div"></div>
              <div class="ss">
                <div class="ss-num">{{ result.new_balance }}</div>
                <div class="ss-lbl">New Balance</div>
              </div>
            </div>
            <button class="btn btn-primary" @click="reset" style="width:100%;padding:14px;margin-top:8px">
              Next Customer →
            </button>
          </div>
        </template>

      </div>
    </div>

    <!-- QR Scanner Overlay -->
    <div v-if="scanning" class="scanner-overlay" @click.self="stopScan">
      <div class="scanner-modal">
        <div class="scanner-header">
          <h3>Scan Customer QR</h3>
          <button class="scanner-close" @click="stopScan">✕</button>
        </div>
        <div class="scanner-video-wrap">
          <video ref="videoEl" class="scanner-video" playsinline autoplay muted></video>
          <canvas ref="scanCanvas" style="display:none"></canvas>
          <div class="scan-frame">
            <span class="scan-corner tl"></span>
            <span class="scan-corner tr"></span>
            <span class="scan-corner bl"></span>
            <span class="scan-corner br"></span>
          </div>
          <div v-if="scanSuccess" class="scan-success-flash">✓</div>
        </div>
        <p class="scanner-hint">Point camera at customer's QR code on their phone</p>
        <div v-if="cameraError" class="error-msg" style="margin:12px">{{ cameraError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import jsQR from 'jsqr'
import api from '@/services/api'

const step = ref('lookup')
const phone = ref('')
const walkinOrderNo = ref('')
const billAmount = ref('')
const staffNote = ref('')
const member = ref(null)
const result = ref(null)
const loading = ref(false)
const error = ref('')

// QR Scanner state
const scanning = ref(false)
const scanSuccess = ref(false)
const cameraError = ref('')
const videoEl = ref(null)
const scanCanvas = ref(null)
let stream = null
let scanRAF = null

async function lookup() {
  if (!phone.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    member.value = await api.get('/admin/member-lookup', { phone: phone.value.trim() })
    step.value = 'credit'
  } catch (e) {
    error.value = e.response?.data?.error || 'Member not found'
  } finally {
    loading.value = false
  }
}

async function credit() {
  if (!billAmount.value || billAmount.value <= 0 || !walkinOrderNo.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    result.value = await api.post('/admin/credit-points', {
      phone: phone.value.trim(),
      bill_amount: parseFloat(billAmount.value),
      walkin_order_no: walkinOrderNo.value.trim().toUpperCase(),
      note: staffNote.value.trim() || undefined,
    })
    step.value = 'done'
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to credit points'
  } finally {
    loading.value = false
  }
}

function reset() {
  step.value = 'lookup'
  phone.value = ''
  walkinOrderNo.value = ''
  billAmount.value = ''
  staffNote.value = ''
  member.value = null
  result.value = null
  error.value = ''
}

// ── QR Scanner ──────────────────────────────────────────────
async function startScan() {
  cameraError.value = ''
  scanning.value = true
  await nextTick()

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    })
    videoEl.value.srcObject = stream
    videoEl.value.play()
    requestAnimationFrame(scanFrame)
  } catch (e) {
    cameraError.value = 'Camera access denied. Please allow camera permission and try again.'
    console.error('Camera error:', e)
  }
}

function scanFrame() {
  if (!scanning.value) return

  const video = videoEl.value
  const canvas = scanCanvas.value
  if (!video || !canvas) return

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code?.data) {
      // Extract digits only (phone number)
      const decoded = code.data.replace(/\D/g, '')
      if (decoded.length >= 9) {
        phone.value = decoded
        scanSuccess.value = true
        // Brief success flash then close + lookup
        setTimeout(() => {
          stopScan()
          lookup()
        }, 600)
        return
      }
    }
  }

  scanRAF = requestAnimationFrame(scanFrame)
}

function stopScan() {
  scanning.value = false
  scanSuccess.value = false
  if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
}
</script>

<style scoped>
.counter-wrap { display: flex; justify-content: center; }
.counter-card { width: 100%; max-width: 520px; }

.step-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--blue);
  margin-bottom: 6px;
}
.step-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
.step-sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; }

.required { color: #e53e3e; }

.field { margin-bottom: 14px; }
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 7px;
}
.field-hint { font-size: 12px; color: var(--muted); margin-top: 5px; }
.input-row { display: flex; gap: 10px; }

/* QR scan button */
.qr-scan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: #f0f7ff;
  border: 2px dashed #93c5fd;
  border-radius: 10px;
  color: var(--blue);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  margin-top: 4px;
}
.qr-scan-btn:hover { background: #dbeafe; border-color: var(--blue); }
.qr-icon { font-size: 22px; }

.member-pill {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f7f9ff;
  border: 1.5px solid #e0e8ff;
  border-radius: 12px;
  padding: 16px;
}
.m-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--blue);
  color: #fff;
  font-size: 18px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.m-info { flex: 1; }
.m-name { font-size: 16px; font-weight: 700; }
.m-phone { font-size: 13px; color: var(--muted); margin-top: 2px; }
.m-pts { text-align: center; }
.pts-num { font-size: 24px; font-weight: 800; color: var(--blue); line-height: 1; }
.pts-lbl { font-size: 11px; color: var(--muted); font-weight: 600; }

.earn-preview {
  background: #f0f7ff;
  border: 1.5px solid #c8deff;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
  color: #2d5db5;
  margin-top: 12px;
}
.btn-row { display: flex; gap: 10px; margin-top: 20px; }

.error-msg {
  background: #fee2e2;
  color: #991b1b;
  padding: 10px 14px;
  border-radius: 7px;
  font-size: 13px;
  margin-top: 12px;
}

/* Success */
.success { text-align: center; padding: 16px 0; }
.success-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: #d1fae5;
  color: #065f46;
  font-size: 36px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.success h2 { font-size: 24px; font-weight: 800; }
.success-name { font-size: 15px; color: var(--muted); margin: 4px 0 24px; }
.success-stats {
  display: flex;
  align-items: center;
  background: #f7f9ff;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 8px;
}
.ss { flex: 1; }
.ss-num { font-size: 32px; font-weight: 800; }
.ss-num.green { color: var(--green); }
.ss-lbl { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
.ss-div { width: 1px; background: #e0e8ff; align-self: stretch; margin: 0 16px; }

/* ── QR Scanner Overlay ── */
.scanner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.scanner-modal {
  background: #1a1a2e;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
}

.scanner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.scanner-header h3 { color: #fff; font-size: 18px; font-weight: 700; }
.scanner-close {
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.scanner-close:hover { background: rgba(255,255,255,0.2); }

.scanner-video-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  background: #000;
  overflow: hidden;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Corner targeting frame */
.scan-frame {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scan-frame::before {
  content: '';
  display: block;
  width: 200px;
  height: 200px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.4);
}

.scan-corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: #60a5fa;
  border-style: solid;
}
.tl { top: calc(50% - 100px); left: calc(50% - 100px); border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.tr { top: calc(50% - 100px); right: calc(50% - 100px); border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.bl { bottom: calc(50% - 100px); left: calc(50% - 100px); border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.br { bottom: calc(50% - 100px); right: calc(50% - 100px); border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

/* Scan line animation */
.scan-frame::after {
  content: '';
  position: absolute;
  left: calc(50% - 98px);
  width: 196px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #60a5fa, transparent);
  animation: scan-line 2s ease-in-out infinite;
}
@keyframes scan-line {
  0%   { top: calc(50% - 98px); opacity: 1; }
  50%  { top: calc(50% + 98px); opacity: 1; }
  100% { top: calc(50% - 98px); opacity: 1; }
}

/* Success flash */
.scan-success-flash {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34,197,94,0.85);
  font-size: 72px;
  color: #fff;
  animation: flash-in .2s ease;
}
@keyframes flash-in {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
}

.scanner-hint {
  text-align: center;
  padding: 14px 20px;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
}
</style>