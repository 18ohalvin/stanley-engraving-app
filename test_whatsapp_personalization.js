import assert from 'assert';
import { interpolateWhatsAppMessage, sendWhatsAppNotification } from './src/utils/analyticsService.js';

console.log('\n--- Running WhatsApp Notification Personalization Tests ---');

// 1. Test template variable interpolation
const rawTemplate = 'Hi {customer_name}! Pesanan kamu #{short_code} telah diterima oleh tim kami di {store_name}. Nomor antrian kamu {queue_number}.';
const vars = {
  customer_name: 'Budi Santoso',
  short_code: 'EG-042',
  store_name: 'Stanley Puri Indah Mall',
  queue_number: 'A-012'
};
const interpolated = interpolateWhatsAppMessage(rawTemplate, vars);
console.log('Interpolated Message:', interpolated);

assert(interpolated.includes('Budi Santoso'), 'Contains customer_name');
assert(interpolated.includes('#EG-042'), 'Contains short_code');
assert(interpolated.includes('Stanley Puri Indah Mall'), 'Contains store_name');
assert(interpolated.includes('A-012'), 'Contains queue_number');
assert(!interpolated.includes('{customer_name}'), 'Placeholders replaced');
console.log('✓ Template variable interpolation works perfectly');

// 2. Test API endpoints
async function runApiTests() {
  const res = await fetch('http://localhost:3000/api/settings/whatsapp_notifications');
  assert(res.ok, 'GET /api/settings/whatsapp_notifications returns 200');
  const data = await res.json();
  const notifs = data.value;
  assert(notifs && typeof notifs === 'object', 'WhatsApp settings is an object');
  assert(notifs['004'], 'Stanley Puri Indah Mall (004) has notification settings');
  assert(notifs['004'].phone === '0812 3456 7890', 'Stanley Puri Indah Mall has phone 0812 3456 7890');
  assert(Array.isArray(notifs['004'].profiles), 'Profiles is an array');
  assert(notifs['004'].profiles.length === 3, 'Contains 3 standard profiles');
  console.log('✓ API endpoint /api/settings/whatsapp_notifications verified');

  // Test per-store personalization isolation
  notifs['001'] = {
    phone: '+62 817-5566-7788',
    profiles: [
      {
        id: 'p-pim-1',
        name: 'PIM Custom Notification',
        title: 'PIM Ready',
        message: 'Hello from Pondok Indah Mall, {customer_name}!',
        triggerType: 'order_completed',
        isActive: true
      }
    ]
  };

  const postRes = await fetch('http://localhost:3000/api/settings/whatsapp_notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: notifs })
  });
  assert(postRes.ok, 'POST /api/settings/whatsapp_notifications returns 200');

  // Re-fetch to verify persistence
  const checkRes = await fetch('http://localhost:3000/api/settings/whatsapp_notifications');
  const checkData = await checkRes.json();
  assert(checkData.value['001'].profiles[0].name === 'PIM Custom Notification', 'Store 001 preserves custom profile');
  assert(checkData.value['004'].phone === '0812 3456 7890', 'Store 004 preserves phone 0812 3456 7890');
  console.log('✓ Per-store notification customization isolated and persisted successfully');

  // 3. Test sendWhatsAppNotification with order
  const sampleOrder = {
    order_id: 'ord-test-01',
    short_code: 'EG-099',
    customer_name: 'Jessica Iskandar',
    phone: '+6281233445566',
    store_id: '004',
    store_name: 'Stanley Puri Indah Mall',
    system_queue_number: '0010'
  };
  const waPayload = sendWhatsAppNotification(sampleOrder, 'order_completed');
  assert(waPayload, 'Dispatched webhook payload created');
  assert(waPayload.recipientPhone === '+6281233445566', 'Recipient phone matches order');
  assert(waPayload.recipientName === 'Jessica Iskandar', 'Recipient name matches order');
  assert(waPayload.senderPhone === '0812 3456 7890', 'Sender phone matches store 004 phone');
  console.log('✓ Notification dispatch with store personalization verified');

  console.log('\n========================================');
  console.log('ALL WHATSAPP PERSONALIZATION TESTS PASSED');
  console.log('========================================\n');
}

runApiTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
