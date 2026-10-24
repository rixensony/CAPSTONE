import { Link } from 'react-router-dom';

export default function EmptyState({ icon = '🗂️', title, hint, actionLabel, to, onAction, compact = false }) {
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {hint ? <p>{hint}</p> : null}
      {actionLabel ? (
        to ? (
          <Link className="btn btn-primary" to={to}>
            {actionLabel}
          </Link>
        ) : (
          <button type="button" className="btn btn-outline" onClick={onAction}>
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  );
}
