/**
 * Central Store Resolution Utility
 * Standardizes Store IDs, Codes, Names, and Phone Numbers across Customer PWA, Engraver Dashboard, and Admin Dashboard.
 */

export const KNOWN_STORES = [
  {
    id: '001',
    code: '001',
    name: 'Stanley Pondok Indah Mall',
    phone: '+62 817-5566-7788',
    aliases: ['001', 'eg-021', 'eg021', 'stanley pondok indah mall', 'stanley pondok indah mall 5', 'pondok indah mall', 'pondok indah mall 5', 'pim', 'pim 5']
  },
  {
    id: '002',
    code: '002',
    name: 'Stanley Grand Indonesia',
    phone: '+62 812-9988-7766',
    aliases: ['002', 'eg-022', 'eg022', 'stanley grand indonesia', 'grand indonesia', 'gi']
  },
  {
    id: '003',
    code: '003',
    name: 'Stanley Senayan City',
    phone: '+62 813-4455-6677',
    aliases: ['003', 'eg-023', 'eg023', 'stanley senayan city', 'senayan city', 'sencity']
  },
  {
    id: 'SG001',
    code: 'SG001',
    name: 'Stanley Singapore Store',
    phone: '+65 8123 4567',
    aliases: ['sg001', 'sg-001', 'singapore', 'singapore store']
  }
];

export function getCanonicalStore(inputStr) {
  if (!inputStr) return null;
  const raw = String(inputStr).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');

  // Check against known store database
  for (const store of KNOWN_STORES) {
    if (
      store.id.toLowerCase() === lower ||
      store.code.toLowerCase() === lower ||
      store.name.toLowerCase() === lower ||
      store.id.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
      store.code.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
      store.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
      store.aliases.includes(lower) ||
      store.aliases.includes(clean)
    ) {
      return store;
    }
  }

  // Fallback for custom user created stores
  return {
    id: raw,
    code: raw,
    name: raw,
    phone: '+62 817-5566-7788',
    aliases: [lower, clean]
  };
}

export function isSameStore(storeA, storeB) {
  if (!storeA || !storeB) return false;
  if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;

  const sA = getCanonicalStore(storeA);
  const sB = getCanonicalStore(storeB);

  if (sA && sB) {
    if (sA.code === sB.code || sA.id === sB.id) return true;
  }

  const a = String(storeA).trim().toLowerCase();
  const b = String(storeB).trim().toLowerCase();
  if (a === b) return true;

  const cleanA = a.replace(/[^a-z0-9]/g, '');
  const cleanB = b.replace(/[^a-z0-9]/g, '');
  if (!cleanA || !cleanB) return false;
  return cleanA === cleanB;
}

export function getStorePhone(storeInput) {
  if (!storeInput) return '+62 817-5566-7788';
  
  try {
    if (typeof localStorage !== 'undefined') {
      const rawOverrides = localStorage.getItem('stanley_store_overrides');
      if (rawOverrides) {
        const overrides = JSON.parse(rawOverrides);
        for (const k in overrides) {
          if (isSameStore(k, storeInput) && overrides[k].phone) {
            return overrides[k].phone;
          }
        }
      }
      const rawCustom = localStorage.getItem('stanley_custom_stores');
      if (rawCustom) {
        const customStores = JSON.parse(rawCustom);
        for (const s of customStores) {
          if (isSameStore(s.id, storeInput) || isSameStore(s.code, storeInput) || isSameStore(s.name, storeInput)) {
            if (s.phone) return s.phone;
          }
        }
      }
    }
  } catch (e) {}

  const canonical = getCanonicalStore(storeInput);
  if (canonical && canonical.phone) return canonical.phone;
  return '+62 817-5566-7788';
}
