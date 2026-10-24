const UNKNOWN = '?';

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function initialsOf(name) {
  const parts = String(name || UNKNOWN).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return UNKNOWN;
  const first = parts[0][0] ?? UNKNOWN;
  const second = parts.length > 1 ? parts[1][0] ?? '' : '';
  return `${first}${second}`.toUpperCase();
}

export default function Avatar({ name = '', size = 'md' }) {
  const holder = String(name || '').trim() || UNKNOWN;
  const hue = hashString(holder) % 360;

  return (
    <span
      className={`avatar ${size}`}
      style={{ backgroundColor: `hsl(${hue}, 65%, 45%)` }}
      title={holder}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
