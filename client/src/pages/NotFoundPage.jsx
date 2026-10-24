import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';

export default function NotFoundPage() {
  return (
    <>
      <PageMeta title="Page not found" />
      <div className="notfound">
        <span className="code">404</span>
        <h1>Page not found</h1>
        <p className="muted" style={{ maxWidth: 420, margin: '0 auto 20px' }}>
          The page you are looking for does not exist, moved, or you may not have access to it.
        </p>
        <div className="cta-row">
          <Link to="/" className="btn btn-outline btn-lg">
            Go home
          </Link>
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
