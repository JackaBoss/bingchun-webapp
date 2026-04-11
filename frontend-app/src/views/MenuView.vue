<template>
  <div id="app">
    <router-view />
    <ToastContainer />
  </div>
</template>

<script setup>
import ToastContainer from '@/components/ToastContainer.vue'
</script>

<style>
/* Reset + mobile-first base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue:       #1e88e5;
  --blue-light: #e3f2fd;
  --blue-dark:  #1565c0;
  --text:       #1a1a2e;
  --text-muted: #6b7280;
  --bg:         #f8fafc;
  --white:      #ffffff;
  --border:     #e5e7eb;
  --radius:     12px;
  --radius-sm:  8px;
  --shadow:     0 1px 3px rgba(0,0,0,0.08);
  --nav-height: 64px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
}

#app { padding-bottom: var(--nav-height); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
}
.btn:active { transform: scale(0.97); }
.btn-primary  { background: var(--blue); color: #fff; width: 100%; }
.btn-primary:hover { background: var(--blue-dark); }
.btn-outline  { background: transparent; border: 1.5px solid var(--blue); color: var(--blue); }

.card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
}

.page { padding: 20px 16px; }
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 16px; }

input, textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  outline: none;
  transition: border-color .15s;
}
input:focus { border-color: var(--blue); }

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
</style>