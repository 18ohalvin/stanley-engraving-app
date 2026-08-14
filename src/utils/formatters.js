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
 * Returns formatted 24h or 12h time string (e.g. 10:21)
 */
export function formatBookingTime(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Standardizes phone number with country code
 */
export function formatPhoneNumber(countryCode, phone) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${prefix}${cleanPhone}`;
}
