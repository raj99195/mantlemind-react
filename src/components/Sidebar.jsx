import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', icon: '⊞', label: 'Dashboard' },
  { to: '/agents', icon: '◈', label: 'Agents' },
  { to: '/portfolio', icon: '▦', label: 'Portfolio' },
  { to: '/transactions', icon: '⧗', label: 'History' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">
        <div className="sidebar-logo-icon">M</div>
        <span className="sidebar-logo-text">MantleMind</span>
      </NavLink>
      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-link-icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-ai-card">
        <div className="sidebar-ai-title">MantleMind AI</div>
        <div className="sidebar-ai-sub">Autonomous.<br />Intelligent.<br />Unstoppable.</div>
        <div className="sidebar-ai-visual">🧠</div>
      </div>
      <div className="sidebar-price-card">
        <div className="sidebar-price-label">MNT Price</div>
        <div className="sidebar-price-val">$0.6724</div>
        <div className="sidebar-price-change">▲ +6.21% today</div>
        <div style={{ marginTop: '8px', height: '32px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          {[3,5,4,6,5,7,6,8,7,9,8,10].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h * 3}px`, background: i > 8 ? '#fff' : 'rgba(255,255,255,0.2)', borderRadius: '1px' }} />
          ))}
        </div>
      </div>
    </aside>
  );
}
