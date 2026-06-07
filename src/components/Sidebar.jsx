import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BrainCircuit,
  PieChart,
  ClockArrowUp,
  Trophy,
  Store,
  Settings2,
} from 'lucide-react';

const links = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/agents',      icon: BrainCircuit,    label: 'Agents'      },
  { to: '/portfolio',   icon: PieChart,        label: 'Portfolio'   },
  { to: '/transactions',icon: ClockArrowUp,    label: 'History'     },
  { to: '/leaderboard', icon: Trophy,          label: 'Leaderboard' },
  { to: '/marketplace', icon: Store,           label: 'Marketplace' },
  { to: '/settings',    icon: Settings2,       label: 'Settings'    },
];

// Shared icon props — single source of truth for size & stroke
const ICON_PROPS = { size: 17, strokeWidth: 1.6 };

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">
        <div
          className="sidebar-logo-icon"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: 'transparent',
            overflow: 'hidden',
          }}
        >
          <img
            src="/logo.png"
            alt="MantleMind"
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'cover',
              transform: 'scale(2.0)',
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.55))',
            }}
          />
        </div>
        <span className="sidebar-logo-text">MantleMind</span>
      </NavLink>

      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            {/* Fixed-width icon wrapper keeps every label at the same x offset */}
            <span className="sidebar-link-icon">
              <Icon {...ICON_PROPS} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-ai-card">
        <div className="sidebar-ai-title">MantleMind AI</div>
        <div className="sidebar-ai-sub">
          Autonomous.<br />
          Intelligent.<br />
          Unstoppable.
        </div>

        <div
          className="sidebar-ai-visual"
          style={{
            marginTop: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                '0 0 30px rgba(255,255,255,0.08), inset 0 0 20px rgba(255,255,255,0.03)',
            }}
          >
            <img
              src="/logo.png"
              alt="MantleMind"
              style={{
                width: '92px',
                height: '42px',
                objectFit: 'contain',
                transform: 'scale(1.8)',
                filter:
                  'drop-shadow(0 0 18px rgba(255,255,255,0.5)) brightness(1.15)',
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}