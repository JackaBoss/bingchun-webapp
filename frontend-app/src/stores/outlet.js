import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useOutletStore = defineStore('outlet', () => {
  const outlets    = ref([])
  const selectedId = ref(Number(localStorage.getItem('outlet_id')) || null)

  const selected    = computed(() => outlets.value.find(o => o.id === selectedId.value) || null)
  const hasSelected = computed(() => !!selectedId.value)

  async function fetchOutlets() {
    if (outlets.value.length) return
    const data = await api.get('/outlets')
    outlets.value = data
  }

  function select(id) {
    selectedId.value = id
    localStorage.setItem('outlet_id', id)
  }

  function clear() {
    selectedId.value = null
    localStorage.removeItem('outlet_id')
  }

  return { outlets, selectedId, selected, hasSelected, fetchOutlets, select, clear }
})