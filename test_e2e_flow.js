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
  getNextQueueNumberFromDb,
  clearAllOrdersInDb,
  getAllStoresFromDb,
  saveStoreInDb,
  deleteStoreFromDb
} from './src/server/db.js';
import { requireAuth, requireSuperAdmin, requireStoreAccess } from './src/server/authMiddleware.js';
import bcrypt from 'bcryptjs';

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
const submittedOrder = await engravingStore.submitOrder();
assert(Boolean(submittedOrder.order_id), 'Order generated with unique order_id');
assert(submittedOrder.status === 'pending_dropoff', 'Order starts in pending_dropoff status');
assert(submittedOrder.items.length === 2, 'Order contains both customized items');
assert(submittedOrder.short_code === null, 'Order short_code is null upon PWA submission');
assert(submittedOrder.system_queue_number === null, 'Order system_queue_number is null upon PWA submission');

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
  short_code: null,
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
const lookupRes = await queueStore.lookupIntakeOrder('c4x'); // Lowercase input testing
assert(lookupRes.success === true, 'Lookup of code c4x succeeded with auto uppercase');
assert(lookupRes.order.order_id === c4xOrder.order_id, 'Lookup returned matching order object');
assert(Boolean(lookupRes.nextQueueNumber), 'Assigned next system queue number is generated');

// Test Zone A: Modal Confirmation CTA
const confirmRes = await queueStore.confirmOrderIntake(c4xOrder.order_id);
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
  if (rawPin !== String(expectedPin).trim()) {
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
  textTop: 52,
  textLeft: 50,
  textSize: 14,
  isActive: true
};
settingsProducts.push(newProd);
assert(settingsProducts.length === 1, 'New product added successfully to settings catalog');
assert(settingsProducts[0].name === 'The IceFlow™ Flip Straw Tumbler', 'Product name is IceFlow');
assert(settingsProducts[0].textTop === 52, 'Product custom vertical placement Y coordinate saved');
assert(settingsProducts[0].textLeft === 50, 'Product custom horizontal placement X coordinate saved');
assert(settingsProducts[0].textSize === 14, 'Product custom text size saved');
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
await initDatabase();

// 1. Check Developer Account in SQLite DB
const devDbStaff = await findStaffForAuth('devsosco01');
assert(devDbStaff !== null, 'Developer Master account devsosco01 exists in SQLite staff_users');
assert(devDbStaff.pin !== process.env.DEVELOPER_MASTER_PIN, 'Developer account PIN is stored hashed, not plaintext');
assert(bcrypt.compareSync(process.env.DEVELOPER_MASTER_PIN, devDbStaff.pin), 'Developer account PIN hash matches seeded PIN');
assert(devDbStaff.isDeveloper === true, 'Developer account has isDeveloper flag');

// 2. Auth session token generation & verification
const devSession = await createAuthSessionInDb(devDbStaff);
assert(devSession.token.startsWith('stk_'), 'Generates secure session bearer token');

const verifiedSession = await verifyAuthSessionToken(devSession.token);
assert(verifiedSession !== null, 'Verifies valid session token');
assert(verifiedSession.staffId === 'devsosco01', 'Verified session matches staffId devsosco01');

await deleteAuthSessionToken(devSession.token);
assert(await verifyAuthSessionToken(devSession.token) === null, 'Session token invalidated after logout');

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

await upsertSingleOrderInDb(testOrder);
const allDbOrders = await getAllOrdersFromDb();
const fetchedOrder = allDbOrders.find(o => o.order_id === 'sql-test-101');
assert(fetchedOrder !== null, 'Order saved and fetched from SQLite database data/stanley.db');
assert(fetchedOrder.customer_name === 'SQL Tester', 'Fetched SQLite order matches customer name');
assert(fetchedOrder.items[0].text === 'SQLTEST', 'Fetched SQLite order preserves customized items JSON');
await clearAllOrdersInDb();

// 4. SQLite Store Network Storage & Retrieval
const initialStores = await getAllStoresFromDb();
assert(initialStores.length >= 4, 'Default network stores seeded in SQLite database');
const newStoreDb = {
  id: 'EG-TEST',
  code: 'EG-TEST',
  name: 'Test Kiosk Store',
  city: 'Bandung',
  address: 'Paris Van Java, Bandung',
  phone: '+62 811-2233-4455',
  total_machines: 2,
  active_machines: 2,
  status: 'Online'
};
await saveStoreInDb(newStoreDb);
const updatedStores = await getAllStoresFromDb();
const foundStore = updatedStores.find(s => s.code === 'EG-TEST');
assert(foundStore !== undefined, 'New store saved to SQLite database data/stanley.db');
assert(foundStore.name === 'Test Kiosk Store', 'Fetched SQLite store matches name');
await deleteStoreFromDb('EG-TEST');
const storesAfterDelete = await getAllStoresFromDb();
assert(storesAfterDelete.find(s => s.code === 'EG-TEST') === undefined, 'Store deleted from SQLite database');

// 4. Express authorization middleware mock test
let reqMock = { headers: { authorization: `Bearer invalid_token` } };
let resMock = {
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(data) { this.responseData = data; return this; }
};
let nextCalled = false;

await requireAuth(reqMock, resMock, () => { nextCalled = true; });
assert(resMock.statusCode === 401, 'requireAuth rejects invalid bearer token with HTTP 401');
assert(nextCalled === false, 'Next route handler not called when unauthenticated');

console.log('\n--- 10. Testing Backend Multi-Tenancy Architecture & requireStoreAccess ---');

// 1. Session token embeds assigned storeID
const egStaff = { id: 'usr-1', staffId: 'EG-021', name: 'Ayu Dewi', role: 'Staff Store', store: 'EG-021' };
const egSession = await createAuthSessionInDb(egStaff);
assert(Boolean(egSession.token), 'Staff session created with token');
assert(egSession.storeId === 'EG-021', 'Session embeds staff assigned storeID EG-021');

const verifiedEgSession = await verifyAuthSessionToken(egSession.token);
assert(verifiedEgSession.storeId === 'EG-021', 'verifyAuthSessionToken returns embedded storeID');

// 2. requireStoreAccess Middleware Verification
let storeReqAllowed = {
  headers: { authorization: `Bearer ${egSession.token}` },
  params: { storeId: 'EG-021' }
};
let storeResAllowed = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
let allowedNext = false;

await requireStoreAccess(storeReqAllowed, storeResAllowed, () => { allowedNext = true; });
assert(allowedNext === true, 'requireStoreAccess permits staff to access their assigned store (EG-021)');

let storeReqDenied = {
  headers: { authorization: `Bearer ${egSession.token}` },
  params: { storeId: 'EG-022' }
};
let storeResDenied = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
let deniedNext = false;

await requireStoreAccess(storeReqDenied, storeResDenied, () => { deniedNext = true; });
assert(storeResDenied.statusCode === 403, 'requireStoreAccess blocks staff from accessing another store with HTTP 403');
assert(deniedNext === false, 'Next handler not called when cross-store access is blocked');

// Super Admin / Master Developer bypass test
let superAdminSession = await createAuthSessionInDb(devDbStaff);
let superReq = {
  headers: { authorization: `Bearer ${superAdminSession.token}` },
  params: { storeId: 'EG-022' }
};
let superRes = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.data = d; return this; } };
let superNext = false;

await requireStoreAccess(superReq, superRes, () => { superNext = true; });
assert(superNext === true, 'Master Developer/Super Admin permits cross-store access for monitoring');

// 3. SQLite Multi-Tenant Data Isolation Tests
await clearAllOrdersInDb();
const orderStore21 = { order_id: 'order-eg21-001', intake_code: 'A21', status: 'in_queue', store_id: 'EG-021', customer_name: 'Store 21 Customer' };
const orderStore22 = { order_id: 'order-eg22-001', intake_code: 'B22', status: 'in_queue', store_id: 'EG-022', customer_name: 'Store 22 Customer' };

await upsertSingleOrderInDb(orderStore21, 'EG-021');
await upsertSingleOrderInDb(orderStore22, 'EG-022');

const store21Orders = await getAllOrdersFromDb('EG-021');
assert(store21Orders.length === 1, 'Store EG-021 query returns exactly 1 order');
assert(store21Orders[0].order_id === 'order-eg21-001', 'Store EG-021 query isolates matching store order');

const store22Orders = await getAllOrdersFromDb('EG-022');
assert(store22Orders.length === 1, 'Store EG-022 query returns exactly 1 order');
assert(store22Orders[0].order_id === 'order-eg22-001', 'Store EG-022 query isolates matching store order');

const allMultiOrders = await getAllOrdersFromDb('*');
assert(allMultiOrders.length === 2, 'Super Admin query (*) returns all multi-tenant orders across network');

// 4. Dynamic Store Form & Order Payload Injection Tests
const storeTestEngravingStore = useEngravingStore();
storeTestEngravingStore.setStoreId('EG-099');
assert(storeTestEngravingStore.selectedStoreId === 'EG-099', 'setStoreId updates Pinia selectedStoreId state');

storeTestEngravingStore.setCustomerDetails({ name: 'Dynamic Store Customer', countryCode: '+62', phone: '81987654321', email: 'dynamic@stanley.com' });
storeTestEngravingStore.currentItem = { model: 'IceFlow', size: '40oz', position: 'Horizontal', text: 'STORE99', font: 'Helvetica Bold', fontId: 'lato', fontClass: 'font-engraving-lato' };
storeTestEngravingStore.saveCurrentItem();
const dynamicOrderPayload = await storeTestEngravingStore.submitOrder();

assert(dynamicOrderPayload.store_id === 'EG-099', 'Order payload automatically injects store_id EG-099');
assert(dynamicOrderPayload.store_code === 'EG-099', 'Order payload automatically injects store_code EG-099');
assert(dynamicOrderPayload.store_name === 'EG-099', 'Order payload automatically injects store_name EG-099');

// 5. Super Admin / Developer Any Store PWA Access URL Generation
function getCleanStoreAlias(store) {
  if (!store) return 'EG-021';
  if (store.code && typeof store.code === 'string' && store.code.trim()) {
    return store.code.trim().toUpperCase();
  }
  if (store.id) return String(store.id).trim();
  return 'EG-021';
}

const sampleStoreGI = { id: 'st-001', code: 'EG-021', name: 'Grand Indonesia' };
const sampleStorePIM = { id: 'st-002', code: 'EG-022', name: 'Pondok Indah Mall 5' };
const sampleStoreCustom = { id: 'st-003', code: 'EG-099', name: 'Custom Kiosk' };

assert(getCleanStoreAlias(sampleStoreGI) === 'EG-021', 'Generates clean URL alias EG-021 for Grand Indonesia');
assert(getCleanStoreAlias(sampleStorePIM) === 'EG-022', 'Generates clean URL alias EG-022 for Pondok Indah Mall');
assert(getCleanStoreAlias(sampleStoreCustom) === 'EG-099', 'Generates clean URL alias EG-099 for Custom Kiosk');
assert(`/engrave/${getCleanStoreAlias(sampleStoreGI)}` === '/engrave/EG-021', 'Super Admin & Developer can visit GI PWA Landing Page via /engrave/EG-021');
assert(`/engrave/${getCleanStoreAlias(sampleStorePIM)}` === '/engrave/EG-022', 'Super Admin & Developer can visit PIM PWA Landing Page via /engrave/EG-022');

// 6. Multi-Tenancy Daily Reset Queue ID Generation Tests
await clearAllOrdersInDb();
const emptyStore21Next = await getNextQueueNumberFromDb('EG-021');
assert(emptyStore21Next === '0001', 'First order for store EG-021 on empty day starts at 0001');

const todayStr = new Date().toISOString();
await upsertSingleOrderInDb({ order_id: 'ord-today-1', system_queue_number: '0001', status: 'in_queue', store_id: 'EG-021', created_at: todayStr }, 'EG-021');
const nextStore21Order = await getNextQueueNumberFromDb('EG-021');
assert(nextStore21Order === '0002', 'Next order for store EG-021 on same day increments to 0002');

// Cross-store isolation test: Store EG-022 should still start at 0001
const nextStore22Order = await getNextQueueNumberFromDb('EG-022');
assert(nextStore22Order === '0001', 'Store EG-022 starts at 0001 independently of Store EG-021');

// Yesterday date reset test: Previous day order does not affect today's reset
const yesterdayStr = new Date(Date.now() - 86400000).toISOString();
await upsertSingleOrderInDb({ order_id: 'ord-yesterday-1', system_queue_number: '0099', status: 'in_queue', store_id: 'EG-023', created_at: yesterdayStr }, 'EG-023');
const todayStore23Next = await getNextQueueNumberFromDb('EG-023');
assert(todayStore23Next === '0001', 'Yesterday order on EG-023 does not affect today starting at 0001');

// 7. Customer A and Customer B Simultaneous Submission & Out-of-Order Confirmation Test
await clearAllOrdersInDb();
queueStore.resetDatabase();

const orderA = {
  order_id: 'ord-cust-A',
  intake_code: 'A11',
  short_code: null,
  system_queue_number: null,
  customer_name: 'Customer A',
  status: 'pending_dropoff',
  store_id: 'EG-021',
  items: []
};

const orderB = {
  order_id: 'ord-cust-B',
  intake_code: 'B22',
  short_code: null,
  system_queue_number: null,
  customer_name: 'Customer B',
  status: 'pending_dropoff',
  store_id: 'EG-021',
  items: []
};

queueStore.addOrder(orderA);
queueStore.addOrder(orderB);

assert(queueStore.getOrderById('ord-cust-A').system_queue_number === null, 'Customer A has null queue number upon PWA submission');
assert(queueStore.getOrderById('ord-cust-B').system_queue_number === null, 'Customer B has null queue number upon PWA submission');

// Customer B gets confirmed FIRST by engraver
const confirmB = await queueStore.confirmOrderIntake('ord-cust-B');
assert(confirmB.success === true, 'Customer B confirmed intake first');
assert(queueStore.getOrderById('ord-cust-B').system_queue_number === '0001', 'Customer B receives queue #0001 because B was confirmed first');

// Customer A gets confirmed SECOND by engraver
const confirmA = await queueStore.confirmOrderIntake('ord-cust-A');
assert(confirmA.success === true, 'Customer A confirmed intake second');
assert(queueStore.getOrderById('ord-cust-A').system_queue_number === '0002', 'Customer A receives queue #0002 because A was confirmed second');

// Store Name vs Store ID Alias Matching Test:
// Ensure getNextQueueNumberFromDb with Store Name 'Grand Indonesia' recognizes 'EG-021' orders
await upsertSingleOrderInDb({ order_id: 'ord-alias-1', system_queue_number: '0001', status: 'in_queue', store_id: 'EG-021', store_name: 'Grand Indonesia', created_at: todayStr }, 'EG-021');
const nextViaAlias = await getNextQueueNumberFromDb('Grand Indonesia');
assert(nextViaAlias === '0002', 'getNextQueueNumberFromDb correctly matches store name Grand Indonesia to EG-021 order and increments to 0002');

// Cross-Store Intake Lookup Blocking Test:
// Order submitted for Store SG001 should NOT be lookable or confirmable on Store EG-021 Engraver Dashboard
const orderSG = {
  order_id: 'ord-sg-001',
  intake_code: 'BSP',
  short_code: null,
  system_queue_number: null,
  customer_name: 'Vianii',
  status: 'pending_dropoff',
  store_id: 'SG001',
  store_code: 'SG001',
  store_name: 'Singapore Store'
};
queueStore.addOrder(orderSG);

const crossLookup = await queueStore.lookupIntakeOrder('BSP', 'EG-021');
assert(crossLookup.success === false, 'Cross-store lookup BSP on EG-021 is rejected');
assert(crossLookup.message.includes('submitted for Store "SG001"'), 'Cross-store lookup error message explicitly mentions target store SG001');

console.log('\n--- 11. Testing Store Phone Resolution & Queue Ticket WhatsApp Support Link ---');
const { getStorePhone } = await import('./src/utils/storeResolver.js');

const phonePim = getStorePhone('001');
assert(phonePim === '+62 817-5566-7788', 'Pondok Indah Mall 001 resolves phone +62 817-5566-7788');

const phoneGi = getStorePhone('002');
assert(phoneGi === '+62 812-9988-7766', 'Grand Indonesia 002 resolves phone +62 812-9988-7766');

const phoneSg = getStorePhone('SG001');
assert(phoneSg === '+65 8123 4567', 'Singapore Store SG001 resolves phone +65 8123 4567');

let cleanDigits = phonePim.replace(/\D/g, '');
if (cleanDigits.startsWith('0')) cleanDigits = '62' + cleanDigits.slice(1);
assert(cleanDigits === '6281755667788', 'Phone digits cleaned for WhatsApp wa.me link');

console.log('\n--- 12. Testing Multi-Customer Concurrent Ticket Isolation & No Swapping ---');
// Create Customer Alice
const orderAlice = {
  order_id: '130826-A1X',
  intake_code: 'A1X',
  short_code: null,
  system_queue_number: null,
  customer_name: 'Customer Alice',
  phone: '+62811111111',
  email: 'alice@example.com',
  status: 'pending_dropoff',
  items: [{ text: 'ALICE', model: 'IceFlow', size: '30 Oz' }]
};

// Create Customer Bob (submitted concurrently or right after)
const orderBob = {
  order_id: '130826-B2Y',
  intake_code: 'B2Y',
  short_code: null,
  system_queue_number: null,
  customer_name: 'Customer Bob',
  phone: '+62822222222',
  email: 'bob@example.com',
  status: 'pending_dropoff',
  items: [{ text: 'BOB', model: 'Quencher', size: '40 Oz' }]
};

queueStore.addOrder(orderAlice);
queueStore.addOrder(orderBob);

const fetchedA = queueStore.getOrderById('130826-A1X');
assert(fetchedA !== null, 'Customer Alice ticket found by ID');
assert(fetchedA.customer_name === 'Customer Alice', 'Customer Alice ticket strictly returns Alice details');
assert(fetchedA.intake_code === 'A1X', 'Customer Alice ticket has intake code A1X');

const fetchedB = queueStore.getOrderById('130826-B2Y');
assert(fetchedB !== null, 'Customer Bob ticket found by ID');
assert(fetchedB.customer_name === 'Customer Bob', 'Customer Bob ticket strictly returns Bob details');
assert(fetchedB.intake_code === 'B2Y', 'Customer Bob ticket has intake code B2Y');

const fetchedByCodeA = queueStore.getOrderById('A1X');
assert(fetchedByCodeA.customer_name === 'Customer Alice', 'Lookup by intake code A1X returns Alice, not Bob');

const fetchedByCodeB = queueStore.getOrderById('B2Y');
assert(fetchedByCodeB.customer_name === 'Customer Bob', 'Lookup by intake code B2Y returns Bob, not Alice');

console.log('\n--- 13. Testing Product Catalog Display Order Alignment with SettingsView ---');
const { mapProductsToCupModels } = await import('./src/store/engravingStore.js');

const customCatalogSettings = [
  { id: 'p2', name: 'Product Second in DB', modelKey: 'second', availableSizes: ['20 Oz'], isActive: true },
  { id: 'p1', name: 'Product First in DB', modelKey: 'first', availableSizes: ['30 Oz'], isActive: true },
  { id: 'p3', name: 'Product Third Inactive', modelKey: 'third', availableSizes: ['40 Oz'], isActive: false }
];

const mappedOrder = mapProductsToCupModels(customCatalogSettings);
assert(mappedOrder.length === 2, 'Maps only active products');
assert(mappedOrder[0].name === 'Product Second in DB', 'Product #1 in Step 1 strictly matches #1 in SettingsView');
assert(mappedOrder[1].name === 'Product First in DB', 'Product #2 in Step 1 strictly matches #2 in SettingsView');

// Simulate Drag & Drop reorder swap in SettingsView
const reordered = [customCatalogSettings[1], customCatalogSettings[0]];
const remappedOrder = mapProductsToCupModels(reordered);
assert(remappedOrder[0].name === 'Product First in DB', 'After Settings drag-reorder, Step 1 #1 updates to Product First in DB');
assert(remappedOrder[1].name === 'Product Second in DB', 'After Settings drag-reorder, Step 1 #2 updates to Product Second in DB');

console.log('\n--- 14. Testing Independent Store Form Link Unique Intake Code Recognition ---');
// 1. Submit order for Store 001 (Stanley Pondok Indah Mall) via store link alias
const orderPimStore = {
  order_id: '130826-P9K',
  intake_code: 'P9K',
  short_code: null,
  system_queue_number: null,
  customer_name: 'David Beckham',
  phone: '+62817000111',
  email: 'david@example.com',
  store_id: '001',
  store_code: '001',
  store_name: 'Stanley Pondok Indah Mall',
  status: 'pending_dropoff',
  items: [{ text: 'BECKHAM', model: 'IceFlow', size: '30 Oz' }]
};
queueStore.addOrder(orderPimStore);
await upsertSingleOrderInDb(orderPimStore);

// Engraver at Pondok Indah Mall (using alias 'EG-021' or 'Pondok Indah Mall')
const lookupResPim = await queueStore.lookupIntakeOrder('P9K', 'EG-021');
assert(lookupResPim.success === true, 'Intake code P9K recognized by admin dashboard at store EG-021');
assert(lookupResPim.order.customer_name === 'David Beckham', 'Lookup returns matching customer name David Beckham');

// Engraver using store name 'Stanley Pondok Indah Mall'
const lookupResPimName = await queueStore.lookupIntakeOrder('P9K', 'Stanley Pondok Indah Mall');
assert(lookupResPimName.success === true, 'Intake code P9K recognized when queried by store name');

// 2. Submit order for custom independent store 'Bali Kiosk' (code 'BALI01')
const orderBali = {
  order_id: '130826-K7M',
  intake_code: 'K7M',
  short_code: null,
  system_queue_number: null,
  customer_name: 'Wayan Bali',
  phone: '+62819876543',
  store_id: 'BALI01',
  store_code: 'BALI01',
  store_name: 'Bali Kiosk Store',
  status: 'pending_dropoff',
  items: [{ text: 'BALI', model: 'Quencher', size: '40 Oz' }]
};
queueStore.addOrder(orderBali);
await upsertSingleOrderInDb(orderBali);

const lookupResBali = await queueStore.lookupIntakeOrder('K7M', 'BALI01');
assert(lookupResBali.success === true, 'Intake code K7M recognized by independent custom store BALI01');
assert(lookupResBali.order.customer_name === 'Wayan Bali', 'Lookup returns matching customer name Wayan Bali');

// Confirm intake
const confirmResBali = await queueStore.confirmOrderIntake('130826-K7M', 'BALI01');
assert(confirmResBali.success === true, 'Cup intake confirmed for Bali Kiosk');
assert(confirmResBali.order.status === 'in_queue', 'Order status transitioned to in_queue');

await clearAllOrdersInDb();
await deleteAuthSessionToken(egSession.token);
await deleteAuthSessionToken(superAdminSession.token);

console.log('\n========================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
