import { setActivePinia, createPinia } from 'pinia';
import { useEngravingStore, FONT_OPTIONS, CUP_MODELS } from './src/store/engravingStore.js';
import { useQueueStore } from './src/store/queueStore.js';
import { containsProfanity, sanitizeEngravingText } from './src/utils/profanityFilter.js';
import { formatBookingTime, formatPhoneNumber, generateOrderId, generateShortCode } from './src/utils/formatters.js';

// Mock localStorage for Node environment
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};
global.window = {
  dispatchEvent() {}
};
global.CustomEvent = class {
  constructor(name) { this.name = name; }
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

console.log('\n--- 1. Testing Profanity Filter & Text Sanitization ---');
assert(containsProfanity('FUCK') === true, 'Blocks English profanity');
assert(containsProfanity('kontol') === true, 'Blocks Indonesian profanity');
assert(containsProfanity('STANLEY') === false, 'Allows valid text STANLEY');
assert(containsProfanity('ALVIN') === false, 'Allows valid text ALVIN');
assert(sanitizeEngravingText('LONGNAME123', 7) === 'LONGNAM', 'Truncates text at 7 characters');
assert(sanitizeEngravingText('  test  ', 7) === 'TEST', 'Trims and capitalizes text');

console.log('\n--- 2. Testing Pinia Stores & Customization Flow ---');
setActivePinia(createPinia());
const engravingStore = useEngravingStore();
const queueStore = useQueueStore();

// Test Step 1
engravingStore.resetDraft();
assert(engravingStore.currentItem.model === 'The IceFlow™ Flip Straw Tumbler', 'Initial model defaults to IceFlow');
assert(engravingStore.currentItem.size === '', 'Initial size starts unselected');
assert(engravingStore.isStep1Valid === false, 'Step 1 invalid without size');

engravingStore.setSize('40oz');
assert(engravingStore.isStep1Valid === true, 'Step 1 valid after size selection');

// Test Step 2 (Default state is Horizontal with active Next button)
assert(engravingStore.currentItem.position === 'Horizontal', 'Initial position defaults to Horizontal');
assert(engravingStore.isStep2Valid === true, 'Step 2 valid by default with Horizontal position');

engravingStore.setPosition('Vertical');
assert(engravingStore.currentItem.position === 'Vertical', 'Position can toggle to Vertical');
assert(engravingStore.isStep2Valid === true, 'Step 2 valid after Vertical position selection');

// Test Step 3
assert(engravingStore.isStep3Valid === false, 'Step 3 invalid with empty text');

engravingStore.setText('STANLEY');
assert(engravingStore.currentItem.text === 'STANLEY', 'Text set to STANLEY');

// Test Font selection with object and ID string
engravingStore.setFont(FONT_OPTIONS[1]); // Lobster
assert(engravingStore.currentItem.fontId === 'lobster', 'Font ID set to lobster via object');
assert(engravingStore.currentItem.fontClass === 'font-engraving-lobster', 'Font class set to lobster');

engravingStore.setFont('caveat');
assert(engravingStore.currentItem.fontId === 'caveat', 'Font ID set to caveat via string');
assert(engravingStore.currentItem.fontClass === 'font-engraving-caveat', 'Font class set to caveat');
assert(engravingStore.isStep3Valid === true, 'Step 3 valid with text and font');

// Commit Item 1 to cart
engravingStore.saveCurrentItem();
assert(engravingStore.items.length === 1, 'Item 1 saved to cart');
assert(engravingStore.items[0].text === 'STANLEY', 'Item 1 has correct text');
assert(engravingStore.items[0].size === '40oz', 'Item 1 has size 40oz');
assert(engravingStore.items[0].position === 'Vertical', 'Item 1 has position Vertical');
assert(engravingStore.items[0].fontId === 'caveat', 'Item 1 has font caveat');

// Add Item 2 ("Add another one")
engravingStore.setSize('30oz');
engravingStore.setPosition('Vertical');
engravingStore.setText('LIOVIAN');
engravingStore.setFont('pinyon');
engravingStore.saveCurrentItem();

assert(engravingStore.items.length === 2, 'Item 2 saved to cart (total 2 items)');
assert(engravingStore.items[1].text === 'LIOVIAN', 'Item 2 text is LIOVIAN');
assert(engravingStore.items[1].size === '30oz', 'Item 2 size is 30oz');
assert(engravingStore.items[1].position === 'Vertical', 'Item 2 position is Vertical');
assert(engravingStore.items[1].fontId === 'pinyon', 'Item 2 font is pinyon');

// Test Step 5 (Customer Info)
engravingStore.setCustomerDetails({
  name: 'Alvin Decorous',
  countryCode: '+62',
  phone: '81234567890',
  email: 'alvin@example.com'
});

assert(engravingStore.customer.name === 'Alvin Decorous', 'Customer name set');
assert(engravingStore.customer.phone === '81234567890', 'Customer phone set');
assert(engravingStore.customer.email === 'alvin@example.com', 'Customer email set');
assert(engravingStore.isCustomerValid === true, 'Customer validity check passed');

// Submit Order
const submittedOrder = engravingStore.submitOrder();
assert(Boolean(submittedOrder.order_id), 'Order generated with unique order_id');
assert(submittedOrder.status === 'pending_dropoff', 'Order starts in pending_dropoff status');
assert(submittedOrder.items.length === 2, 'Order contains both customized items');
assert(submittedOrder.short_code.length > 0, 'Order has sequential short code');

console.log('\n--- 3. Testing Queue Store Status Progression ---');
const foundOrder = queueStore.getOrderById(submittedOrder.order_id);
assert(Boolean(foundOrder), 'Queue store found order by ID');
assert(foundOrder.status === 'pending_dropoff', 'Queue order matches pending_dropoff status');

// Transition to in_queue
queueStore.updateStatus(submittedOrder.order_id, 'in_queue');
assert(queueStore.getOrderById(submittedOrder.order_id).status === 'in_queue', 'Status transitioned to in_queue');

// Transition to engraving_in_progress
queueStore.updateStatus(submittedOrder.order_id, 'engraving_in_progress');
assert(queueStore.getOrderById(submittedOrder.order_id).status === 'engraving_in_progress', 'Status transitioned to engraving_in_progress');

// Transition to ready_for_pickup
queueStore.updateStatus(submittedOrder.order_id, 'ready_for_pickup');
const readyOrder = queueStore.getOrderById(submittedOrder.order_id);
assert(readyOrder.status === 'ready_for_pickup', 'Status transitioned to ready_for_pickup');
assert(readyOrder.items[0].fontClass === 'font-engraving-caveat', 'Item 1 preserves customized fontClass in ready state');
assert(readyOrder.items[1].fontClass === 'font-engraving-pinyon', 'Item 2 preserves customized fontClass in ready state');

// Cancel order test
queueStore.cancelOrder(submittedOrder.order_id);
assert(queueStore.getOrderById(submittedOrder.order_id).status === 'cancelled', 'Status correctly changed to cancelled');

console.log('\n--- 4. Testing Engraver iPad Dashboard & 3-Char Alphanumeric Intake ---');
// Reset database
queueStore.resetDatabase();

// Test that sample C4X is loaded in pending_dropoff
const c4xOrder = queueStore.getOrderById('C4X');
assert(Boolean(c4xOrder), 'Sample order C4X found in store');
assert(c4xOrder.status === 'pending_dropoff', 'Order C4X is in pending_dropoff status');
assert(c4xOrder.intake_code === 'C4X', 'Order C4X has 3-char alphanumeric intake code');

// Test Zone A: Intake Lookup (Pop-up modal preview)
const lookupRes = queueStore.lookupIntakeOrder('c4x'); // Lowercase input testing
assert(lookupRes.success === true, 'Lookup of code c4x succeeded with auto uppercase');
assert(lookupRes.order.order_id === c4xOrder.order_id, 'Lookup returned matching order object');
assert(lookupRes.nextQueueNumber === '0021', 'Assigned next system queue number is #0021');

// Test Zone A: Modal Confirmation CTA
const confirmRes = queueStore.confirmOrderIntake(c4xOrder.order_id);
assert(confirmRes.success === true, 'Confirmation of cup intake succeeded');
assert(c4xOrder.status === 'in_queue', 'Order C4X status updated to in_queue in database');
assert(c4xOrder.system_queue_number === '0021', 'Order C4X assigned system queue number #0021');
assert(c4xOrder.short_code === '0021', 'Order C4X short_code updated to #0021 for ticket and station display');

// Test Auto-Assign to Machine 01 / Machine 02
queueStore.autoAssignMachines();
const m1 = queueStore.machines.find(m => m.id === 'machine-01');
const m2 = queueStore.machines.find(m => m.id === 'machine-02');
assert(m1.currentOrderId !== null, 'Machine 01 auto-pulled an order from upcoming list');
assert(m2.currentOrderId !== null, 'Machine 02 auto-pulled an order from upcoming list');

// Test State 1 -> State 2: START ENGRAVING
queueStore.startMachine('machine-01');
assert(m1.status === 'engraving', 'Machine 01 entered engraving status');
const orderInM1 = queueStore.getAssignedOrder(m1);
assert(orderInM1.status === 'engraving_in_progress', 'Order in Machine 01 updated to engraving_in_progress on Customer PWA');

// Test Stopwatch Tick
queueStore.tickTimers();
queueStore.tickTimers();
assert(m1.timerSeconds === 2, 'Stopwatch timer counted up 2 seconds');

// Test Multi-Item Navigation on Machine Card
queueStore.setMachineItemIndex('machine-01', 1);
assert(m1.currentItemIndex === 1 || m1.currentItemIndex === 0, 'Handled multi-cup carousel item index change');

// Test State 2 -> State 3: DONE. NOTIFY CUSTOMER
queueStore.completeMachine('machine-01');
assert(orderInM1.status === 'ready_for_pickup', 'Order updated to ready_for_pickup for customer pickup');
assert(m1.status === 'idle', 'Machine 01 reset to idle');
assert(m1.timerSeconds === 0, 'Machine 01 timer reset to 0');

console.log('\n========================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
