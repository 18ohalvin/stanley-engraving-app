/**
 * Server-side business time helpers.
 *
 * The server (Docker container) runs in UTC, so anything shown to people or
 * bucketed by "day" must be converted to the store's own timezone explicitly.
 * Timestamps themselves are always stored as ISO-8601 UTC strings.
 */
// The app runs on a Singapore domain: every store uses SGT unless APP_TIMEZONE overrides it.
export const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Singapore';

/**
 * Timezone of a store. Single business timezone for now; kept as one function so
 * a per-store timezone column can be wired in here later.
 */
export function getStoreTimeZone() {
  return DEFAULT_TIMEZONE;
}

const partsFormatterCache = new Map();
function getParts(date, timeZone) {
  let fmt = partsFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    });
    partsFormatterCache.set(timeZone, fmt);
  }
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

function toDate(input) {
  if (input === undefined || input === null || input === '') return new Date();
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** HH:MM of a timestamp in the given timezone ('' if invalid). */
export function formatClockTime(input, timeZone = DEFAULT_TIMEZONE) {
  if (!input) return '';
  const d = toDate(input);
  if (!d) return '';
  const p = getParts(d, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** YYYY-MM-DD local calendar date of a timestamp in the given timezone. */
export function localDateKey(input, timeZone = DEFAULT_TIMEZONE) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = toDate(input) || new Date();
  const p = getParts(d, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes the timezone is ahead of UTC at the given instant. */
function offsetMinutes(date, timeZone) {
  const p = getParts(date, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/**
 * [startIso, endIso) UTC range covering the local calendar day `dateKey` in `timeZone`.
 * Lets us query ISO-string timestamp columns by local business day.
 */
export function utcRangeForLocalDay(dateKey, timeZone = DEFAULT_TIMEZONE) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const naiveStart = Date.UTC(y, m - 1, d);
  const naiveEnd = Date.UTC(y, m - 1, d + 1);
  const start = new Date(naiveStart - offsetMinutes(new Date(naiveStart), timeZone) * 60000);
  const end = new Date(naiveEnd - offsetMinutes(new Date(naiveEnd), timeZone) * 60000);
  return [start.toISOString(), end.toISOString()];
}
