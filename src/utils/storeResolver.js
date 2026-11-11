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

// ----------------------------------------------------
// Live store directory (from the database)
// The store CODE is the stable tenant key; names can be renamed by admins.
// Every device loads the directory on startup so code <-> name resolution
// never depends on the hardcoded fallback list above.
// ----------------------------------------------------
let storeDirectory = null;
let storeDirectoryPromise = null;

function readCachedDirectory() {
  if (storeDirectory) return storeDirectory;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('stanley_custom_stores');
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) storeDirectory = parsed;
    }
  } catch (e) {}
  return storeDirectory || [];
}

export function setStoreDirectory(list) {
  if (!Array.isArray(list)) return;
  storeDirectory = list;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('stanley_custom_stores', JSON.stringify(list));
    }
  } catch (e) {}
}

/** Fetch the store directory from the server (deduplicated; `force` re-fetches). */
export function loadStoreDirectory(force = false) {
  if (storeDirectoryPromise && !force) return storeDirectoryPromise;
  if (typeof fetch === 'undefined' || typeof window === 'undefined') return Promise.resolve(readCachedDirectory());
  storeDirectoryPromise = fetch('/api/network/stores')
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.stores) ? data.stores : null);
      if (list) setStoreDirectory(list);
      return readCachedDirectory();
    })
    .catch(() => readCachedDirectory());
  return storeDirectoryPromise;
}

export function getCanonicalStore(inputStr) {
  if (!inputStr) return null;
  const raw = String(inputStr).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');

  // 1. Check the live store directory (database), cached in memory
  for (const store of readCachedDirectory()) {
    if (!store) continue;
    const sId = String(store.id || '').toLowerCase();
    const sCode = String(store.code || '').toLowerCase();
    const sName = String(store.name || '').toLowerCase();
    const sIdClean = sId.replace(/[^a-z0-9]/g, '');
    const sCodeClean = sCode.replace(/[^a-z0-9]/g, '');
    const sNameClean = sName.replace(/[^a-z0-9]/g, '');

    if (
      sId === lower || sCode === lower || sName === lower ||
      (clean && (sIdClean === clean || sCodeClean === clean || sNameClean === clean))
    ) {
      return {
        id: store.id,
        code: store.code || store.id,
        name: store.name,
        phone: store.phone || '',
        aliases: [sId, sCode, sName, sIdClean, sCodeClean, sNameClean]
      };
    }
  }

  // 2. Check against known store database
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
    phone: '',
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
  if (!storeInput) return '';
  
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
    }
  } catch (e) {}

  // Live store directory first (via getCanonicalStore), then the hardcoded fallback
  const canonical = getCanonicalStore(storeInput);
  if (canonical && canonical.phone) return canonical.phone;
  return '';
}
