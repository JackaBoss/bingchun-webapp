import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items    = ref([])          // { id, menu_item_id, name, unit_price, quantity, option_ids, options_label, notes }
  const outletId = ref(null)

  const count    = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))
  const subtotal = computed(() => items.value.reduce((s, i) => s + i.unit_price * i.quantity, 0))

  function setOutlet(id) { outletId.value = id }

  function addItem(item) {
    // Match by item + same options combination
    const key = `${item.menu_item_id}-${(item.option_ids || []).sort().join(',')}`
    const existing = items.value.find(i => i._key === key)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({ ...item, _key: key, quantity: 1 })
    }
  }

  function removeItem(index) {
    items.value.splice(index, 1)
  }

  function updateQty(index, qty) {
    if (qty <= 0) removeItem(index)
    else items.value[index].quantity = qty
  }

  function clear() {
    items.value = []
    outletId.value = null
  }

  // Build payload for POST /api/orders
  function toOrderPayload(redeemPoints = 0, notes = '') {
    return {
      outlet_id: outletId.value,
      redeem_points: redeemPoints,
      notes,
      items: items.value.map(i => ({
        menu_item_id: i.menu_item_id,
        quantity:     i.quantity,
        option_ids:   i.option_ids || [],
        notes:        i.notes || null,
      })),
    }
  }

  return { items, outletId, count, subtotal,
           setOutlet, addItem, removeItem, updateQty, clear, toOrderPayload }
})
