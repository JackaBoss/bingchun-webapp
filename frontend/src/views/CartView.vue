<template>
  <div class="cart-page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">←</button>
      <h2>My Cart</h2>
    </div>

    <!-- Empty state -->
    <div v-if="cart.items.length === 0" class="empty-state">
      <p class="empty-icon">🛒</p>
      <p class="empty-title">Your cart is empty</p>
      <p class="empty-sub">Add some drinks from the menu!</p>
      <button class="btn btn-primary" style="margin-top:24px" @click="router.push('/')">Browse Menu</button>
    </div>

    <template v-else>
      <!-- Items list -->
      <div class="cart-items">
        <div v-for="(item, idx) in cart.items" :key="idx" class="cart-item">
          <div class="cart-item-info">
            <p class="cart-item-name">{{ item.name }}</p>
            <p class="cart-item-opts" v-if="item.options_label">{{ item.options_label }}</p>
            <p class="cart-item-notes" v-if="item.notes">📝 {{ item.notes }}</p>
            <p class="cart-item-price">RM {{ (item.unit_price * item.quantity).toFixed(2) }}</p>
          </div>
          <div class="cart-item-qty">
            <button @click="cart.updateQty(idx, item.quantity - 1)">−</button>
            <span>{{ item.quantity }}</span>
            <button @click="cart.updateQty(idx, item.quantity + 1)">+</button>
          </div>
        </div>
      </div>

      <!-- Points redemption -->
      <div class="card section-card" v-if="auth.points > 0">
        <div class="points-header">
          <span class="section-label">⭐ Use points</span>
          <span class="points-balance">Balance: {{ auth.points }} pts</span>
        </div>
        <div class="points-slider-row">
          <input
            type="range" min="0"
            :max="maxRedeemable"
            step="10"
            v-model.number="redeemPoints"
            class="points-slider"
          />
          <span class="redeem-val">{{ redeemPoints }} pts</span>
        </div>
        <p class="redeem-saving" v-if="redeemPoints > 0">
          💰 Saving RM {{ (redeemPoints * REDEEM_RATE).toFixed(2) }}
        </p>
      </div>

      <!-- Order notes -->
      <div class="card section-card">
        <p class="section-label">📝 Order notes</p>
        <textarea v-model="orderNotes" placeholder="Any requests for the whole order?" rows="2" class="notes-input"></textarea>
      </div>

      <!-- Order summary -->
      <div class="card section-card summary-card">
        <p class="section-label">Order summary</p>
        <div class="summary-row"><span>Subtotal</span><span>RM {{ cart.subtotal.toFixed(2) }}</span></div>
        <div class="summary-row discount" v-if="redeemPoints > 0">
          <span>Points discount</span>
          <span>−RM {{ pointsDiscount.toFixed(2) }}</span>
        </div>
        <div class="summary-row total"><span>Total</span><span>RM {{ finalTotal.toFixed(2) }}</span></div>
        <div class="summary-row earn" v-if="pointsWillEarn > 0">
          <span>You'll earn</span><span>+{{ pointsWillEarn }} pts ⭐</span>
        </div>
      </div>

      <!-- Place order -->
      <div class="checkout-bar">
        <button class="btn btn-primary" :disabled="placing" @click="placeOrder">
          {{ placing ? 'Placing order…' : `Place Order · RM ${finalTotal.toFixed(2)}` }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const cart   = useCartStore()
const auth   = useAuthStore()

const REDEEM_RATE   = 0.01   // RM per point
const POINTS_PER_RM = 1      // points earned per RM spent

const redeemPoints = ref(0)
const orderNotes   = ref('')
const placing      = ref(false)
const errorMsg     = ref('')

const maxRedeemable = computed(() => {
  const maxByPoints = auth.points
  const maxByTotal  = Math.floor(cart.subtotal / REDEEM_RATE / 10) * 10
  return Math.min(maxByPoints, maxByTotal)
})

const pointsDiscount = computed(() => redeemPoints.value * REDEEM_RATE)
const finalTotal     = computed(() => Math.max(0, cart.subtotal - pointsDiscount.value))
const pointsWillEarn = computed(() => Math.floor(finalTotal.value * POINTS_PER_RM))

async function placeOrder() {
  placing.value  = true
  errorMsg.value = ''
  try {
    const payload = cart.toOrderPayload(redeemPoints.value, orderNotes.value)
    const order   = await api.post('/orders', payload)
    cart.clear()
    await auth.refreshMe()
    router.push(`/orders/${order.id}`)
  } catch (err) {
    errorMsg.value = err.error || 'Failed to place order. Please try again.'
  } finally {
    placing.value = false
  }
}
</script>

<style scoped>
.cart-page { padding: 0 0 120px; background: var(--bg); min-height: 100vh; }

.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; background: var(--white);
  border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;
}
.back-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text); }
.page-header h2 { font-size: 18px; font-weight: 700; }

.empty-state { text-align: center; padding: 60px 24px; }
.empty-icon  { font-size: 56px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 700; }
.empty-sub   { font-size: 14px; color: var(--text-muted); margin-top: 6px; }

.cart-items { background: var(--white); margin: 12px 0; }
.cart-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
}
.cart-item:last-child { border-bottom: none; }
.cart-item-info { flex: 1; }
.cart-item-name  { font-size: 15px; font-weight: 600; }
.cart-item-opts  { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.cart-item-notes { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.cart-item-price { font-size: 14px; font-weight: 700; color: var(--blue); margin-top: 6px; }
.cart-item-qty {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg); border-radius: var(--radius-sm); padding: 6px 12px;
}
.cart-item-qty button { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--blue); font-weight: 700; }
.cart-item-qty span   { font-size: 15px; font-weight: 700; min-width: 20px; text-align: center; }

.section-card { margin: 12px 16px; }
.section-label { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

.points-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.points-balance { font-size: 13px; color: var(--blue); font-weight: 600; }
.points-slider-row { display: flex; align-items: center; gap: 12px; }
.points-slider { flex: 1; accent-color: var(--blue); }
.redeem-val    { font-size: 14px; font-weight: 700; color: var(--blue); min-width: 60px; text-align: right; }
.redeem-saving { font-size: 13px; color: #2e7d32; font-weight: 600; margin-top: 8px; }

.notes-input {
  width: 100%; padding: 10px; border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); font-size: 14px; resize: none; font-family: inherit;
}
.notes-input:focus { outline: none; border-color: var(--blue); }

.summary-card { }
.summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.summary-row.discount span { color: #2e7d32; font-weight: 600; }
.summary-row.total { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 12px; font-size: 16px; font-weight: 700; }
.summary-row.earn span { color: var(--blue); font-size: 13px; font-weight: 600; }

.checkout-bar {
  position: fixed; bottom: 64px;
  left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px); max-width: 448px;
  padding: 12px 0; z-index: 50;
}
.error-msg {
  color: #e53e3e; font-size: 13px; text-align: center;
  margin-top: 8px; padding: 8px; background: #fff5f5;
  border-radius: var(--radius-sm);
}
</style>
