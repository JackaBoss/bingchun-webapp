<template>
  <div class="coming-soon-page">
    <div class="content">
      <div class="icon">🧋</div>
      <h1>Online Ordering<br>Coming Soon</h1>
      <p>We're working on it! In the meantime,<br>visit us at the counter to order.</p>
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import BottomNav from '@/components/BottomNav.vue'
</script>

<style scoped>
.coming-soon-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 80px;
}
.content {
  text-align: center;
  padding: 40px 32px;
}
.icon {
  font-size: 64px;
  margin-bottom: 24px;
}
h1 {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.3;
  margin-bottom: 16px;
}
p {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.6;
}
</style>