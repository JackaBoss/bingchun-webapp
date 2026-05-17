<template>
  <router-view />
</template>

<script setup>
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --blue: #1e88e5;
  --blue-dk: #1565c0;
  --bg: #f0f4f8;
  --white: #ffffff;
  --border: #e5e7eb;
  --text: #1a1a2e;
  --text-muted: #6b7280;
  --radius: 12px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
  --green: #16a34a;
  --red: #dc2626;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
a { text-decoration: none; color: inherit; }
button { font-family: inherit; }
.card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
}
</style>