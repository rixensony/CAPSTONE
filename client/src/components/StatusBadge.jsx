const LABELS = {
  open: 'Open',
  'in-progress': 'In progress',
  full: 'Full',
  completed: 'Completed',
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export default function StatusBadge({ status }) {
  const key = String(status ?? '').toLowerCase();
  const label = LABELS[key] ?? status ?? 'Unknown';

  return (
    <span className={`badge badge-${key}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
