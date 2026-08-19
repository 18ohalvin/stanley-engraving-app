// Basic profanity filter for English & Indonesian retail environments
const BLOCKLIST = [
  // English common profanities
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'cock', 'pussy', 'bastard', 'slut', 'whore',
  'fag', 'nigger', 'nigga', 'faggot', 'retard', 'porn', 'sex', 'nude', 'penis', 'vagina', 'boobs', 'tit',
  // Indonesian common profanities
  'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 'itil', 'pantek', 'puki', 'pepek',
  'bajingan', 'kampang', 'taek', 'tae', 'asu', 'bodoh', 'tolol', 'goblok', 'idiot', 'lonte', 'perek'
];

/**
 * Checks if a string contains any blocked profanity word
 * @param {string} text 
 * @returns {boolean}
 */
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Normalize string: lowercase, remove non-alphanumeric except spaces
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalized.split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (BLOCKLIST.includes(word)) {
      return true;
    }
  }

  // Also check direct substring for compact profanity
  for (const bad of BLOCKLIST) {
    if (bad.length >= 4 && normalized.includes(bad)) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitize text to max length and trim
 * @param {string} text 
 * @param {number} maxLength 
 * @param {boolean} forceUpperCase
 * @returns {string}
 */
export function sanitizeEngravingText(text, maxLength = 7, forceUpperCase = false) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim().slice(0, maxLength);
  return forceUpperCase ? trimmed.toUpperCase() : trimmed;
}
