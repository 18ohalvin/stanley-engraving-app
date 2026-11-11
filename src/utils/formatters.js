/**
 * Formatters and Code Generation Utilities
 */

const ALPHANUMERIC_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes confusing 0, 1, I, O

/**
 * Generates a 3-character mixed uppercase alphanumeric intake code (e.g. C4X, 7K9)
 */
export function generateIntakeCode() {
  let result = '';
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHANUMERIC_CHARS.length);
    result += ALPHANUMERIC_CHARS[randomIndex];
  }
  return result.toUpperCase();
}

/**
 * Generates an Order ID with format DDMMYY-XXX (e.g. 130826-C4X)
 */
export function generateOrderId(intakeCode) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const code = intakeCode || generateIntakeCode();
  return `${day}${month}${year}-${code}`;
}

/**
 * Format sequential queue number as 4 digits (e.g. #0021)
 */
export function formatSystemQueueNumber(sequenceNumber) {
  const num = parseInt(sequenceNumber, 10);
  const safeNum = isNaN(num) ? 1 : num;
  return String(safeNum).padStart(4, '0');
}

/**
 * Backwards compatibility alias for short code
 */
export function generateShortCode() {
  return generateIntakeCode();
}

/**
 * Business timezone for every store and device. The app runs on a Singapore
 * domain, so all clocks, "today" filters and daily queue resets use SGT,
 * regardless of the timezone of the phone/tablet viewing it.
 * Override at build time with VITE_APP_TIMEZONE.
 */
export const APP_TIMEZONE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_TIMEZONE) || 'Asia/Singapore';

let zonedFormatter = null;
function getZonedParts(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;
  if (!zonedFormatter) {
    zonedFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  }
  const parts = {};
  for (const p of zonedFormatter.formatToParts(d)) parts[p.type] = p.value;
  return parts;
}

/**
 * Business-day key (YYYY-MM-DD, in APP_TIMEZONE) of a timestamp / Date.
 * Never use `toISOString().split('T')[0]` for this: that is the UTC date.
 * A bare 'YYYY-MM-DD' string is already a date key and is returned as-is.
 */
export function toLocalDateKey(input = new Date()) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const p = getZonedParts(input);
  return p ? `${p.year}-${p.month}-${p.day}` : '';
}

/** HH:MM (in APP_TIMEZONE) of a timestamp / Date. '' when invalid. */
export function formatClockTime(input) {
  if (!input) return '';
  const p = getZonedParts(input);
  return p ? `${p.hour}:${p.minute}` : '';
}

/** Hour 0-23 (in APP_TIMEZONE) of a timestamp / Date, or NaN when invalid. */
export function getZonedHour(input = new Date()) {
  const p = getZonedParts(input);
  return p ? parseInt(p.hour, 10) : NaN;
}

/**
 * Key of a *calendar* Date object (one built as new Date(y, m, d) for a date
 * picker), read from its own components rather than converted between zones.
 */
export function calendarKey(dateObj) {
  if (!dateObj) return '';
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Calendar Date (local midnight) whose Y/M/D is "today" in APP_TIMEZONE. */
export function todayCalendarDate() {
  const [y, m, d] = toLocalDateKey(new Date()).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns formatted 24h time string (e.g. 10:21) in APP_TIMEZONE
 */
export function formatBookingTime(date = new Date()) {
  return formatClockTime(date);
}

/**
 * Standardizes phone number with country code
 */
export function formatPhoneNumber(countryCode, phone) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${prefix}${cleanPhone}`;
}
