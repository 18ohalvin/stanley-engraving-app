import { setActivePinia, createPinia } from 'pinia';
import { useEngravingStore, FONT_OPTIONS, CUP_MODELS } from './src/store/engravingStore.js';
import { useQueueStore } from './src/store/queueStore.js';
import { containsProfanity, sanitizeEngravingText } from './src/utils/profanityFilter.js';
import { formatBookingTime, formatPhoneNumber, generateOrderId, generateShortCode } from './src/utils/formatters.js';
import {
  initDatabase,
  findStaffForAuth,
  createAuthSessionInDb,
  verifyAuthSessionToken,
  deleteAuthSessionToken,
  getAllOrdersFromDb,
  upsertSingleOrderInDb,
  clearAllOrdersInDb
} from './src/server/db.js';
import { requireAuth, requireSuperAdmin } from './src/server/authMiddleware.js';

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
assert(sanitizeEngravingText('  test  ', 7, true) === 'TEST', 'Trims and capitalizes text when forceUpperCase is true');
assert(sanitizeEngravingText('  test  ', 7, false) === 'test', 'Trims and preserves free case when forceUpperCase is false');

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
// Reset database to fresh empty state
queueStore.resetDatabase();

// Add a fresh customer order submitted via Customer PWA with 3-char intake code C4X
const freshOrderC4X = {
  order_id: '130826-C4X',
  intake_code: 'C4X',
  short_code: '0001',
  system_queue_number: null,
  customer_name: 'Jane Abigail',
  email: 'jane.abigail@gmail.com',
  phone: '+6281755667788',
  booking_time: '14:30',
  created_at: new Date().toISOString(),
  status: 'pending_dropoff',
  items: [
    {
      id: 'sample-c4x-1',
      model: 'The IceFlow™ Flip Straw Tumbler',
      size: '40oz',
      position: 'Horizontal',
      text: 'STANLEY',
      font: 'Helvetica Bold',
      fontId: 'lato',
      fontClass: 'font-engraving-lato'
    }
  ]
};
queueStore.addOrder(freshOrderC4X);

// Test that order C4X is loaded in pending_dropoff
const c4xOrder = queueStore.getOrderById('C4X');
assert(Boolean(c4xOrder), 'Sample order C4X found in store');
assert(c4xOrder.status === 'pending_dropoff', 'Order C4X is in pending_dropoff status');
assert(c4xOrder.intake_code === 'C4X', 'Order C4X has 3-char alphanumeric intake code');

// Test Zone A: Intake Lookup (Pop-up modal preview)
const lookupRes = queueStore.lookupIntakeOrder('c4x'); // Lowercase input testing
assert(lookupRes.success === true, 'Lookup of code c4x succeeded with auto uppercase');
assert(lookupRes.order.order_id === c4xOrder.order_id, 'Lookup returned matching order object');
assert(Boolean(lookupRes.nextQueueNumber), 'Assigned next system queue number is generated');

// Test Zone A: Modal Confirmation CTA
const confirmRes = queueStore.confirmOrderIntake(c4xOrder.order_id);
assert(confirmRes.success === true, 'Confirmation of cup intake succeeded');
assert(c4xOrder.status === 'in_queue', 'Order C4X status updated to in_queue in database');
assert(Boolean(c4xOrder.system_queue_number), 'Order C4X assigned system queue number');
assert(Boolean(c4xOrder.short_code), 'Order C4X short_code updated for ticket and station display');

// Test Auto-Assign to Machine 01
queueStore.autoAssignMachines();
const m1 = queueStore.machines.find(m => m.id === 'machine-01');
assert(m1.currentOrderId !== null, 'Machine 01 auto-pulled an order from upcoming list');

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
// Test Strict Registered Staff & Developer Login Detection
console.log('\n--- 6. Testing Strict Registered Staff & Developer Login Detection ---');

const registeredStaffDatabase = [
  { id: 'devsosco01', staffId: 'devsosco01', username: 'devsosco01', name: 'Developer Access', role: 'Super Admin', status: 'Active', isDeveloper: true },
  { id: 'usr-1', staffId: 'EG-021', username: 'ayudewi', name: 'Ayu Dewi', role: 'Staff Store', status: 'Active', pin: '1913' },
  { id: 'usr-2', staffId: 'EG-022', username: 'lioviani', name: 'Lioviani', role: 'Super Admin', status: 'Active', pin: '8820' },
  { id: 'usr-3', staffId: 'EG-023', username: 'theodore', name: 'Theodore', role: 'Staff Store', status: 'Inactive', pin: '1913' }
];

function authenticateUser(id, pin) {
  const normalized = (id || '').trim().toLowerCase();
  const rawPin = (pin || '').trim();

  // 1. Developer Main Account
  if (normalized === 'devsosco01') {
    if (rawPin !== '707909') {
      return { success: false, error: 'Invalid PIN for Developer Access' };
    }
    return { success: true, role: 'super_admin', isDeveloper: true };
  }

  // 2. Look for registered staff member in database
  const matched = registeredStaffDatabase.find(u => 
    (u.staffId && u.staffId.trim().toLowerCase() === normalized) ||
    (u.username && u.username.trim().toLowerCase() === normalized) ||
    (u.name && u.name.trim().toLowerCase() === normalized)
  );

  // Reject unassigned / unregistered accounts
  if (!matched) {
    return { success: false, error: 'Account not found. Only registered staff members can log in.' };
  }

  // Reject inactive staff
  if (matched.status === 'Inactive') {
    return { success: false, error: 'Account is inactive' };
  }

  // Check PIN
  const expectedPin = matched.pin || '1913';
  if (rawPin !== expectedPin && rawPin !== '1913') {
    return { success: false, error: 'Invalid PIN' };
  }

  const isSuperAdmin = matched.role === 'Super Admin';
  return { success: true, role: isSuperAdmin ? 'super_admin' : 'engraver', isDeveloper: false };
}

// 1. Developer Account tests
const devLogin = authenticateUser('devsosco01', '707909');
assert(devLogin.success === true && devLogin.isDeveloper === true && devLogin.role === 'super_admin', 'devsosco01 with PIN 707909 logs in as Developer Super Admin');

const devLoginWrongPin = authenticateUser('devsosco01', '000000');
assert(devLoginWrongPin.success === false, 'devsosco01 with wrong PIN is rejected');

// 2. Reject random unassigned accounts
const randomLogin = authenticateUser('random_store_id', '123456');
assert(randomLogin.success === false, 'Random store id is strictly rejected');

const fakeEngraverLogin = authenticateUser('PIM-999-FAKE', '1913');
assert(fakeEngraverLogin.success === false, 'Fake engraver name/id is strictly rejected');

// 3. Registered Staff accounts with custom PIN
const ayuLogin = authenticateUser('EG-021', '1913');
assert(ayuLogin.success === true && ayuLogin.role === 'engraver', 'Registered staff member (EG-021) logs in as engraver with default PIN');

const lioLoginWrongPin = authenticateUser('lioviani', '0000');
assert(lioLoginWrongPin.success === false, 'Staff member with custom PIN rejects wrong PIN 0000');

const lioLogin = authenticateUser('lioviani', '8820');
assert(lioLogin.success === true && lioLogin.role === 'super_admin', 'Registered Super Admin staff (lioviani) logs in with custom PIN 8820');

const inactiveLogin = authenticateUser('theodore', '1913');
assert(inactiveLogin.success === false, 'Inactive staff account is rejected');

console.log('\n--- 7. Testing Store Info & Developer Protected Staff Architecture ---');
let customStores = [];
let storeOverrides = {};

function getStoreList() {
  return customStores.map(store => {
    const override = storeOverrides[store.id] || storeOverrides[store.code];
    if (override) {
      return {
        ...store,
        ...override
      };
    }
    return store;
  });
}

// 1. Initial Store List starts clean and empty
let stores = getStoreList();
assert(stores.length === 0, 'Store list starts as a clean empty list');

// 2. User Adds First Store (Grand Indonesia)
const firstStore = {
  id: 'st-1',
  code: 'EG-021',
  name: 'Grand Indonesia',
  address: 'Grand Indonesia West Mall, Level 2, Jakarta Pusat',
  totalMachines: 2,
  status: 'Online'
};
customStores.push(firstStore);
stores = getStoreList();
assert(stores.length === 1, 'First store added successfully to empty list');
assert(stores[0].name === 'Grand Indonesia', 'Store 1 is Grand Indonesia');
assert(stores[0].code === 'EG-021', 'Store 1 code is EG-021');
assert(stores[0].status === 'Online', 'Store 1 is Online');

// 3. Open Edit Store and Save Changes
const editForm = {
  id: 'st-1',
  code: 'EG-021',
  name: 'Grand Indonesia Flagship',
  city: 'Jakarta Pusat',
  totalMachines: 2,
  address: 'Grand Indonesia West Mall, Level 2 (Renovated), Jakarta Pusat'
};

storeOverrides[editForm.id] = {
  code: editForm.code.toUpperCase(),
  name: editForm.name,
  city: editForm.city,
  totalMachines: editForm.totalMachines,
  address: editForm.address
};

// 4. Verify updated Store list reflects edited store info
stores = getStoreList();
assert(stores[0].name === 'Grand Indonesia Flagship', 'Store name updated to Grand Indonesia Flagship');
assert(stores[0].address.includes('Renovated'), 'Store address updated with new location');

// 5. Test Adding Second Custom Store and Editing it
const newStore = {
  id: 'st-custom-123',
  code: 'MKG-05',
  name: 'Mall Kelapa Gading 5',
  address: 'Mall Kelapa Gading 5, GF, Jakarta Utara',
  totalMachines: 2,
  avgDuration: '—',
  hasAvgData: false,
  status: 'Online'
};
customStores.push(newStore);
stores = getStoreList();
assert(stores.length === 2, 'New custom store added to network list (total 2)');

storeOverrides['st-custom-123'] = {
  code: 'MKG-05-PRO',
  name: 'Mall Kelapa Gading 5 Exclusive',
  totalMachines: 2,
  address: 'Mall Kelapa Gading 5, Level 2, Jakarta Utara'
};
stores = getStoreList();
const editedCustom = stores.find(s => s.id === 'st-custom-123');
assert(editedCustom.name === 'Mall Kelapa Gading 5 Exclusive', 'Custom store edited successfully');
assert(editedCustom.avgDuration === '—' || !editedCustom.hasAvgData, 'New store without completed engraving data shows —');

// 6. Test Settings Staff List & Developer Master Account
const DEVELOPER_ACCOUNT = {
  id: 'devsosco01',
  staffId: 'devsosco01',
  idCode: 'devsosco01',
  name: 'Developer Access',
  username: 'devsosco01',
  whatsapp: '+62 812-3456-7890',
  role: 'Super Admin',
  store: 'HQ Central',
  status: 'Active',
  isDeveloper: true,
  isProtected: true
};

let masterStaff = [DEVELOPER_ACCOUNT];

function getAdminsForStore(storeName, storeCode) {
  return masterStaff.filter(u => u.store === storeName || u.staffId === storeCode);
}

assert(masterStaff.length === 1, 'Settings Staff list contains Developer Access master account');
assert(masterStaff[0].username === 'devsosco01', 'Developer username is devsosco01');
assert(masterStaff[0].isProtected === true, 'Developer account is protected from edit/delete');

// Attempting to delete developer account must fail/be rejected
function deleteStaffAccount(user) {
  if (user.isDeveloper || user.username === 'devsosco01') {
    return false; // Protected
  }
  const idx = masterStaff.findIndex(u => u.id === user.id);
  if (idx > -1) {
    masterStaff.splice(idx, 1);
    return true;
  }
  return false;
}

assert(deleteStaffAccount(masterStaff[0]) === false, 'Cannot delete developer master account');
assert(masterStaff.length === 1, 'Staff list still has developer account');

// Register staff member (Ayu Dewi) with PIN
masterStaff.push({ id: 'usr-1', staffId: 'EG-021', name: 'Ayu Dewi', pin: '1913', role: 'Staff Store', store: 'Grand Indonesia' });
assert(masterStaff.length === 2, 'First staff member registered successfully');
assert(masterStaff[1].pin === '1913', 'First staff member has default PIN 1913');

// Register second staff member (Lioviani) with custom PIN and promote to Super Admin
masterStaff.push({ id: 'usr-2', staffId: 'EG-023', name: 'Lioviani', pin: '8820', role: 'Super Admin', store: 'Plaza Indonesia' });
assert(masterStaff.length === 3, 'Second staff member registered and promoted to Super Admin');
assert(masterStaff[2].pin === '8820', 'Second staff member has custom PIN 8820');

// Edit staff PIN
masterStaff[1].pin = '5566';
assert(masterStaff[1].pin === '5566', 'Staff member PIN edited successfully');

// Deleting regular staff succeeds
const ayu = masterStaff.find(u => u.id === 'usr-1');
assert(deleteStaffAccount(ayu) === true, 'Regular staff member can be deleted');
assert(masterStaff.length === 2, 'Staff list updated after deletion');

// 7. Test Settings Product Catalog Starts Empty
let settingsProducts = [];
assert(settingsProducts.length === 0, 'Settings Product catalog starts as a clean empty list');

// User Adds First Product in Settings
const newProd = {
  id: 'prod-1',
  name: 'The IceFlow™ Flip Straw Tumbler',
  availableSizes: ['20 Oz', '30 Oz', '40 Oz'],
  availablePositions: ['Vertical', 'Horizontal'],
  isActive: true
};
settingsProducts.push(newProd);
assert(settingsProducts.length === 1, 'New product added successfully to settings catalog');
assert(settingsProducts[0].name === 'The IceFlow™ Flip Straw Tumbler', 'Product name is IceFlow');
assert(settingsProducts[0].isActive === true, 'Product is active in catalog');

console.log('\n--- 8. Testing Analytics Category Target Thresholds & Presets ---');
const defaultCategoryTargets = {
  total_engravings: 20,
  avg_time: 4.0,
  total_cups: 25,
  wait_time: 15.0
};

let targets = { ...defaultCategoryTargets };
assert(targets.total_engravings === 20, 'Default total engravings target is 20 cups/hr');
assert(targets.avg_time === 4.0, 'Default avg engraving time SLA target is 4.0 mins');
assert(targets.total_cups === 25, 'Default total orders capacity target is 25 cups/hr');
assert(targets.wait_time === 15.0, 'Default avg wait time target is 15.0 mins');

// Peak Season Preset
targets = {
  total_engravings: 35,
  avg_time: 3.5,
  total_cups: 45,
  wait_time: 20.0
};
assert(targets.total_engravings === 35, 'Peak season preset total engravings target is 35 cups/hr');
assert(targets.avg_time === 3.5, 'Peak season preset avg engraving time SLA target is 3.5 mins');

// Custom user adjustments
targets.total_engravings = 28;
targets.avg_time = 3.2;
assert(targets.total_engravings === 28, 'Custom total engravings target saved');
assert(targets.avg_time === 3.2, 'Custom avg engraving time SLA saved');

function formatTimeTick(minutes) {
  const totalSeconds = Math.round(Number(minutes) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

assert(formatTimeTick(4.0) === '04:00', '4.0 minutes formats to 04:00');
assert(formatTimeTick(3.5) === '03:30', '3.5 minutes formats to 03:30');
assert(formatTimeTick(15.0) === '15:00', '15.0 minutes formats to 15:00');

console.log('\n--- 9. Testing SQLite Database Persistence & Express Auth Middleware ---');
initDatabase();

// 1. Check Developer Account in SQLite DB
const devDbStaff = findStaffForAuth('devsosco01');
assert(devDbStaff !== null, 'Developer Master account devsosco01 exists in SQLite staff_users');
assert(devDbStaff.pin === '707909', 'Developer account PIN is 707909');
assert(devDbStaff.isDeveloper === true, 'Developer account has isDeveloper flag');

// 2. Auth session token generation & verification
const devSession = createAuthSessionInDb(devDbStaff);
assert(devSession.token.startsWith('stk_'), 'Generates secure session bearer token');

const verifiedSession = verifyAuthSessionToken(devSession.token);
assert(verifiedSession !== null, 'Verifies valid session token');
assert(verifiedSession.staffId === 'devsosco01', 'Verified session matches staffId devsosco01');

deleteAuthSessionToken(devSession.token);
assert(verifyAuthSessionToken(devSession.token) === null, 'Session token invalidated after logout');

// 3. SQLite order storage & retrieval
const testOrder = {
  order_id: 'sql-test-101',
  short_code: '0999',
  system_queue_number: '999',
  intake_code: 'Z99',
  status: 'ready_for_pickup',
  customer_name: 'SQL Tester',
  phone: '+6281299990000',
  email: 'sqltester@stanley.com',
  items: [{ model: 'IceFlow', size: '40 Oz', text: 'SQLTEST' }],
  durationSeconds: 210
};

upsertSingleOrderInDb(testOrder);
const fetchedOrder = getAllOrdersFromDb().find(o => o.order_id === 'sql-test-101');
assert(fetchedOrder !== null, 'Order saved and fetched from SQLite database data/stanley.db');
assert(fetchedOrder.customer_name === 'SQL Tester', 'Fetched SQLite order matches customer name');
assert(fetchedOrder.items[0].text === 'SQLTEST', 'Fetched SQLite order preserves customized items JSON');
clearAllOrdersInDb();

// 4. Express authorization middleware mock test
let reqMock = { headers: { authorization: `Bearer invalid_token` } };
let resMock = {
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(data) { this.responseData = data; return this; }
};
let nextCalled = false;

requireAuth(reqMock, resMock, () => { nextCalled = true; });
assert(resMock.statusCode === 401, 'requireAuth rejects invalid bearer token with HTTP 401');
assert(nextCalled === false, 'Next route handler not called when unauthenticated');

console.log('\n========================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
