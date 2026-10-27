'use strict';
window.WHEEL_API_BASE = 'https://script.google.com/macros/s/AKfycby4HdNu20AJz-3JdpJP1v1-xF1_fqVRkifSZwkly4PTzuq9A978T-UjMJNAZg06RIo3eA/exec';
window.LINK_CREATE_CODE = '../admin/admin.html#code';

// Default prize setup from the original wheel. `rate` is a relative weight.
var items = [
  { name: 'Netflix 7 Day', rate: 0, color: '#4CAF50' },
  { name: 'Netflix 1 Day', rate: 3, color: '#8BC34A' },
  { name: 'Netflix 3 Day', rate: 1, color: '#FFC107' },
  { name: 'ส่วนลด 10%', rate: 1, color: '#FF9800' },
  { name: 'ส่วนลด 5%', rate: 3, color: '#2196F3' },
  { name: 'ส่วนลด 20%', rate: 0, color: '#4CAF50' },
  { name: 'MISS', rate: 47, color: '#f44336' }
];
window.items = items;

// V15: Generic Discord notification. It works with every prize name, including
// prizes added later from Admin -> จัดการเว็บ, because no prize whitelist is used.
async function sendDiscordWebhook(prize, code, dateStr, timeStr, spinsLeft) {
  var webhook = String(window.JM_DISCORD_WEBHOOK || '').trim();
  if (!webhook) return false;

  var prizeName = String(prize || 'ไม่ทราบรางวัล').trim() || 'ไม่ทราบรางวัล';
  var codeText = String(code || '-').trim() || '-';
  var leftText = (spinsLeft === null || spinsLeft === undefined || spinsLeft === '') ? '-' : String(spinsLeft);

  var payload = {
    username: 'JokeMoo Wheel',
    embeds: [{
      title: '🎁 มีการหมุนวงล้อ',
      color: 0x0B6ED0,
      fields: [
        { name: 'รางวัล', value: prizeName, inline: false },
        { name: 'โค้ดที่ใช้', value: '`' + codeText.replace(/`/g, '') + '`', inline: true },
        { name: 'สิทธิ์คงเหลือ', value: leftText, inline: true },
        { name: 'วันที่', value: String(dateStr || '-'), inline: true },
        { name: 'เวลา', value: String(timeStr || '-'), inline: true }
      ],
      footer: { text: 'JokeMoo Store • Lucky Wheel' },
      timestamp: new Date().toISOString()
    }],
    allowed_mentions: { parse: [] }
  };

  try {
    var response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      keepalive: true
    });
    if (!response.ok && response.status !== 204) {
      throw new Error('Discord webhook HTTP ' + response.status);
    }
    return true;
  } catch (error) {
    console.warn('Discord notification failed:', error);
    return false;
  }
}
window.sendDiscordWebhook = sendDiscordWebhook;

