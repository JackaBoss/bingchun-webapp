<template>
  <Teleport to="body">
    <div class="toast-wrap">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', 'toast-' + toast.type]"
        @click="remove(toast.id)"
      >
        <span class="toast-icon">{{ icons[toast.type] }}</span>
        <span class="toast-msg">{{ toast.message }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  width: calc(100% - 32px);
  max-width: 400px;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  pointer-events: all;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  animation: slideDown 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-16px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.toast-success { background: #1a1a2e; color: #fff; }
.toast-error   { background: #C0392B; color: #fff; }
.toast-info    { background: #1e88e5; color: #fff; }
.toast-warning { background: #F39C12; color: #fff; }
.toast-icon { font-size: 16px; flex-shrink: 0; }
.toast-msg  { flex: 1; }
</style>