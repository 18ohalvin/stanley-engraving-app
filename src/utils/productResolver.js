import { CUP_MODELS, getCatalogCupModels } from '../store/engravingStore.js';

export const DEFAULT_STATION_READY_IMAGE = '/src/assets/images/station-ready-cup.png';

/**
 * Resolves the accurate product tumbler image across all pages, dashboards, modals, and tickets.
 */
export function getProductImage(itemOrName, fallback = DEFAULT_STATION_READY_IMAGE) {
  if (!itemOrName) return fallback;

  // If passed an item object with direct image/placementImage properties
  if (typeof itemOrName === 'object') {
    if (itemOrName.image && itemOrName.image !== fallback && !itemOrName.image.includes('product-step2.png')) return itemOrName.image;
    if (itemOrName.placementImage && itemOrName.placementImage !== fallback && !itemOrName.placementImage.includes('product-step2.png')) return itemOrName.placementImage;
    if (itemOrName.image && itemOrName.image !== fallback) return itemOrName.image;
    if (itemOrName.placementImage && itemOrName.placementImage !== fallback) return itemOrName.placementImage;
  }

  const nameStr = typeof itemOrName === 'object'
    ? (itemOrName.model || itemOrName.shortName || itemOrName.name || '')
    : String(itemOrName);

  if (!nameStr || !nameStr.trim()) return fallback;
  const clean = nameStr.trim().toLowerCase();

  // 1. Check current dynamic catalog in Settings / LocalStorage / Server
  try {
    const catalog = getCatalogCupModels();
    const matchedCatalog = catalog.find(m => 
      (m.name && m.name.toLowerCase() === clean) ||
      (m.shortName && m.shortName.toLowerCase() === clean) ||
      (m.id && m.id.toLowerCase() === clean) ||
      (m.name && m.name.toLowerCase().includes(clean)) ||
      (clean.includes(m.name ? m.name.toLowerCase() : '')) ||
      (m.shortName && clean.includes(m.shortName.toLowerCase()))
    );

    if (matchedCatalog) {
      return matchedCatalog.image || matchedCatalog.placementImage || fallback;
    }
  } catch (e) {}

  // 2. Check default built-in CUP_MODELS
  const matchedBuiltIn = CUP_MODELS.find(m => 
    m.name.toLowerCase() === clean ||
    m.shortName.toLowerCase() === clean ||
    m.id.toLowerCase() === clean ||
    m.name.toLowerCase().includes(clean) ||
    clean.includes(m.name.toLowerCase()) ||
    clean.includes(m.shortName.toLowerCase())
  );

  if (matchedBuiltIn) {
    return matchedBuiltIn.image || matchedBuiltIn.placementImage || fallback;
  }

  return fallback;
}
