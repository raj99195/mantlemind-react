import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/agents', label: 'Agents' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/transactions', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-wallet">
        <div className="wallet-pill">
          <span className="wallet-dot" />
          Live Wallet: 0x7A3d...8F92
          <span style={{ color: '#333', cursor: 'pointer' }}>⧉</span>
        </div>
      </div>
      <div className="topbar-links">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <div className="topbar-avatar">MM</div>
    </header>
  );
}
