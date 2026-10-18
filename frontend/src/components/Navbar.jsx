import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/garage', label: 'My Garage' },
  { to: '/book-service', label: 'Book Service' },
  { to: '/services', label: 'Service Records' },
  { to: '/indian-evs', label: 'Indian EV DB' },
  { to: '/account', label: 'Account' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem('ev_token'));

  function handleSignOut() {
    localStorage.removeItem('ev_token');
    setMobileOpen(false);
    navigate('/');
  }

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        {/* Brand */}
        <Link to={isLoggedIn ? '/home' : '/'} className="navbar__brand">
          <Zap size={22} className="navbar__brand-icon" />
          EV Service
        </Link>

        {/* Desktop nav */}
        {isLoggedIn && (
          <div className="navbar__links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar__link${isActive(link.to) ? ' navbar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <button className="navbar__signout" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        )}

        {/* Desktop auth links when not logged in */}
        {!isLoggedIn && (
          <div className="navbar__links">
            <Link
              to="/indian-evs"
              className={`navbar__link${isActive('/indian-evs') ? ' navbar__link--active' : ''}`}
            >
              Indian EV DB
            </Link>
            <Link
              to="/login"
              className={`navbar__link${isActive('/login') ? ' navbar__link--active' : ''}`}
            >
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm" style={{ marginLeft: '0.5rem' }}>
              Get Started
            </Link>
          </div>
        )}

        {/* Mobile hamburger (only when logged in) */}
        {isLoggedIn && (
          <button
            className="navbar__hamburger"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {/* Mobile dropdown */}
      {isLoggedIn && mobileOpen && (
        <div className="navbar__mobile-menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar__link${isActive(link.to) ? ' navbar__link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button className="navbar__signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
