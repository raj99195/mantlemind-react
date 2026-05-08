import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/agents', label: 'Agents' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/transactions', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

export default function Navbar() {
  return (
    <header className="topnav">
      <div className="topnav-wallet">
        <span className="live-dot" />
        Live Wallet: 0x7A3d...8F92
        <span style={{ color: '#444', cursor: 'pointer', marginLeft: '4px' }}>⧉</span>
      </div>
      <div className="topnav-links">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}>
            {l.label}
          </NavLink>
        ))}
      </div>
      <div className="topnav-avatar">MM</div>
    </header>
  );
}
