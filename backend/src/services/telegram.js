// Telegram Bot notification service
// Env vars required: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Silently no-ops if vars not set — safe to deploy before bot is configured

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) return; // not configured yet, skip silently
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Telegram sendMessage failed:', err.description);
    }
  } catch (err) {
    console.error('Telegram notification error:', err.message);
  }
}

// ── Notification builders ────────────────────────────────────

async function notifyNewOrder({ order, items, customerName, customerPhone, outletName }) {
  const itemLines = items.map(i => {
    const opts = i.options?.length ? ` (${i.options.map(o => o.label).join(', ')})` : '';
    const note = i.notes ? ` — <i>${i.notes}</i>` : '';
    return `  ${i.quantity}× ${i.item_name}${opts}${note}`;
  }).join('\n');

  const notes = order.notes ? `\n📝 <b>Notes:</b> ${order.notes}` : '';

  const text =
    `🔔 <b>New Order!</b>\n` +
    `📍 ${outletName}\n` +
    `🧾 ${order.order_no}\n` +
    `👤 ${customerName} · ${customerPhone}\n` +
    `💰 RM${parseFloat(order.total).toFixed(2)}` +
    (order.discount > 0 ? ` <i>(discount: RM${parseFloat(order.discount).toFixed(2)})</i>` : '') +
    `\n\n${itemLines}${notes}`;

  await sendMessage(text);
}

async function notifyStatusChange({ order, status, outletName, customerName }) {
  const labels = {
    paid:    { icon: '✅', label: 'Payment Confirmed — start preparing' },
    ready:   { icon: '🎉', label: 'Ready for Pickup' },
    cancelled: { icon: '❌', label: 'Order Cancelled' },
  };
  const entry = labels[status];
  if (!entry) return; // don't notify on other status changes

  const text =
    `${entry.icon} <b>${entry.label}</b>\n` +
    `📍 ${outletName}\n` +
    `🧾 ${order.order_no}\n` +
    `👤 ${customerName}\n` +
    `💰 RM${parseFloat(order.total).toFixed(2)}`;

  await sendMessage(text);
}

module.exports = { notifyNewOrder, notifyStatusChange };