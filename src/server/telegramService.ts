import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = '8140482135:AAF6HKTngDP-TFujMkGf3XJ9IPtQN6aXPno';
const TELEGRAM_CHAT_ID = '7537699303';

let lastAlertTimestamp = 0;
const ALERT_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes cooldown between duplicate alerts

export async function sendTelegramAlert(errorMessage: string, contextInfo?: string): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastAlertTimestamp < ALERT_COOLDOWN_MS) {
      // Cooldown active, skip spamming Telegram
      return;
    }
    lastAlertTimestamp = now;

    const text = 
      `🚨 *DATAFORGE SYSTEM ALERT*\n\n` +
      `⚠️ *Gangguan Koneksi Database Online*\n` +
      `🕒 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n` +
      `❌ Error Detail:\n\`\`\`\n${errorMessage}\n\`\`\`\n` +
      (contextInfo ? `ℹ️ Konteks: ${contextInfo}\n` : '') +
      `\n🔄 _Sistem otomatis mencoba menghubungkan ulang ke database online..._`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[TelegramService] Gagal mengirim alert ke Telegram:', errText);
    }
  } catch (err) {
    console.error('[TelegramService] Error memanggil Telegram Bot API:', err);
  }
}
