export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner center" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
