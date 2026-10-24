import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import useAuth from '../hooks/useAuth.js';

const navLinkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');
const adminLinkClass = ({ isActive }) =>
  isActive ? 'nav-link admin-pill active' : 'nav-link admin-pill';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointer = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [menuOpen]);

  const closeAll = () => {
    setMobileOpen(false);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    closeAll();
    logout();
    navigate('/login');
  };

  const authedLinks = (
    <>
      <NavLink to="/dashboard" className={navLinkClass} onClick={closeAll}>
        Dashboard
      </NavLink>
      <NavLink to="/projects" className={navLinkClass} onClick={closeAll}>
        Projects
      </NavLink>
      <NavLink to="/students" className={navLinkClass} onClick={closeAll}>
        Find Teammates
      </NavLink>
      <NavLink to="/teams" className={navLinkClass} onClick={closeAll}>
        My Teams
      </NavLink>
      {user?.role === 'admin' ? (
        <NavLink to="/admin" className={adminLinkClass} onClick={closeAll}>
          Admin
        </NavLink>
      ) : null}
    </>
  );

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link
          className="brand"
          to={user ? '/dashboard' : '/'}
          onClick={closeAll}
          aria-label="SkillBridge home"
        >
          ⚡ SkillBridge
        </Link>

        <div className="nav-side">
          {user ? (
            <nav className="nav-links" aria-label="Primary">
              {authedLinks}
              <div className="nav-user" ref={userMenuRef}>
                <button
                  type="button"
                  className="user-button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                >
                  <Avatar name={user?.name} size="sm" />
                  <span className={`chevron${menuOpen ? ' open' : ''}`} aria-hidden="true">
                    ▾
                  </span>
                </button>
                {menuOpen ? (
                  <div className="avatar-menu" role="menu">
                    {user?.email ? <p>{user.email}</p> : null}
                    <Link className="menu-item" role="menuitem" to="/profile" onClick={closeAll}>
                      My profile
                    </Link>
                    <button type="button" className="menu-item danger" role="menuitem" onClick={handleLogout}>
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>
            </nav>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </div>
          )}

          {user ? (
            <button
              type="button"
              className={mobileOpen ? 'nav-toggle open' : 'nav-toggle'}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="hamburger" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {user && mobileOpen ? (
        <nav className="nav-panel open" aria-label="Primary">
          {authedLinks}
          <Link className="menu-item" to="/profile" onClick={closeAll}>
            My profile
          </Link>
          <button type="button" className="menu-item danger" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      ) : null}
    </header>
  );
}
