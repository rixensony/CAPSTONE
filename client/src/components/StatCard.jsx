export default function StatCard({ label, value, accent = 'indigo' }) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-value">{value ?? 0}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
