/**
 * Normalize skill/interest chip arrays: trim, drop empties, de-duplicate
 * case-insensitively, keep the caller's casing of the first occurrence.
 */
const TYPICAL_MAX = 10;

function splitChips(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') return input.split(',').map((s) => s.trim());
  return [];
}

export function normalizeChips(raw) {
  let chips = [];
  if (raw !== undefined && raw !== null) {
    chips = splitChips(raw);
  }
  const seen = new Set();
  const normalized = [];
  for (const item of chips) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

export const CHIP_MAX_LENGTH = 16;
export const CHIP_LIST_MAX = TYPICAL_MAX;
