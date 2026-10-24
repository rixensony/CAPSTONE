export default function Pagination({ page, pages, onChange }) {
  const total = Number(pages) || 0;
  const current = Number(page) || 1;

  if (total <= 1) return null;

  const windowStart = Math.max(1, Math.min(current - 2, total - 4));
  const numbers = [];
  for (let n = windowStart; n <= Math.min(total, windowStart + 4); n += 1) {
    numbers.push(n);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="page-btn"
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
      >
        Previous
      </button>
      {numbers.map((n) => (
        <button
          type="button"
          key={n}
          className={`page-btn${n === current ? ' active' : ''}`}
          aria-current={n === current ? 'page' : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <span className="page-info">
        page {current} of {total}
      </span>
      <button
        type="button"
        className="page-btn"
        onClick={() => onChange(current + 1)}
        disabled={current >= total}
      >
        Next
      </button>
    </nav>
  );
}
