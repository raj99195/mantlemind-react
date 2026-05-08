import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AGENTS, FEED_ITEMS, ALLOCATIONS } from '../data/mockData';

const METRICS = [
  { label: 'Total Portfolio Value', value: '$4,821', sub: '▲ 8.33% this week', icon: '💼' },
  { label: 'Active Agents', value: '3', sub: '2 working · 1 standby', icon: '🤖' },
  { label: 'MNT Balance', value: '0.047', sub: '= $0.09 spent on agents', icon: '◈' },
  { label: 'Total Decisions', value: '142', sub: '94% accuracy rate', icon: '⚡' },
];

let feedCounter = 6;
const newItems = [
  { icon: '✓', title: 'TradeAgent: LP position rebalanced' },
  { icon: '◈', title: 'DataAgent: New yield pool 7.8% APY found' },
  { icon: '⚡', title: 'MasterMind: Strategy updated — shifting 5% to mETH' },
  { icon: '◉', title: 'RiskAgent: Risk check passed — LOW' },
];

export default function Dashboard() {
  const [feed, setFeed] = useState(FEED_ITEMS);
  const [goal, setGoal] = useState('Mere paas 500 USDY hai. 3 mahine mein maximum yield chahiye, risk low rakhna.');

  useEffect(() => {
    let idx = 0;
    const t = setInterval(() => {
      const item = newItems[idx % newItems.length];
      const hash = '0x' + Math.random().toString(16).substr(2, 8) + '...';
      setFeed(prev => [{ id: feedCounter++, ...item, hash, time: 'just now' }, ...prev.slice(0, 7)]);
      idx++;
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const suggestions = ['Maximize yield on my USDY', 'Auto-rebalance weekly', 'Hedge mETH position'];

  return (
    <div className="page-wrap">

      {/* Hero — background image panel */}
      <div className="hero-section">

        <div className="hero-content">
          <div className="hero-sub">Your AI Co-Pilot for the</div>
          <div className="hero-title">Mantle Ecosystem</div>
          <div className="hero-desc">Autonomous agents. Intelligent decisions. On-chain execution.</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {METRICS.map((m, i) => (
          <div key={i} className="metric-card fade-up" style={{ animationDelay: `${i*0.05}s` }}>
            <div className="metric-icon">{m.icon}</div>
            <div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-val">{m.value}</div>
              <div className="metric-sub metric-up">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Goal */}
          <div className="card">
            <div className="card-label">Your Goal</div>
            <div className="goal-input-wrap">
              <span className="goal-quote">"</span>
              <textarea value={goal} onChange={e => setGoal(e.target.value)}
                className="goal-input" rows="2"
                placeholder="Tell MantleMind your financial goal..." />
              <button className="goal-send">➤</button>
            </div>
            <div>
              {suggestions.map(s => (
                <button key={s} onClick={() => setGoal(s)} className="suggestion-pill">{s}</button>
              ))}
            </div>
          </div>

          {/* Agent Workforce */}
          <div className="card">
            <div className="section-header">
              <div className="card-label" style={{ margin: 0 }}>Agent Workforce</div>
              <Link to="/agents" className="section-link">View all agents →</Link>
            </div>
            {AGENTS.map(agent => (
              <div key={agent.id} className="agent-row">
                <div className={`agent-dot ${agent.status === 'active' ? 'dot-active' : 'dot-idle'}`} />
                <div className="agent-icon">{agent.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="agent-name">{agent.name}</span>
                    <span className="badge badge-outline">{agent.role}</span>
                  </div>
                  <div className="agent-desc">{agent.desc}</div>
                </div>
                {agent.mntFee
                  ? <span className="mnt-pill">{agent.mntFee}</span>
                  : <span className={`badge ${agent.status === 'active' ? 'badge-white' : 'badge-dim'}`}>
                      {agent.status === 'active' ? 'ACTIVE' : 'STANDBY'}
                    </span>
                }
              </div>
            ))}
          </div>

          {/* Portfolio Allocation */}
          <div className="card">
            <div className="card-label">Portfolio Allocation</div>
            {ALLOCATIONS.map(a => (
              <div key={a.label} className="bar-row">
                <span className="bar-label">{a.label}</span>
                <div className="bar-track">
                  <div className="bar-fill bar-animate" style={{ width: `${a.pct}%` }} />
                </div>
                <span className="bar-pct">{a.pct}%</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Live Feed */}
          <div className="card" style={{ flex: 1 }}>
            <div className="section-header">
              <div className="card-label" style={{ margin: 0 }}>Live Agent Feed</div>
              <span style={{ fontSize: '10px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="live-dot" style={{ width: '5px', height: '5px' }} />Live
              </span>
            </div>
            {feed.map((item, i) => (
              <div key={item.id} className={`feed-item ${i === 0 ? 'fade-up' : ''}`}>
                <div className="feed-icon">{item.icon}</div>
                <div>
                  <div className="feed-title">{item.title}</div>
                  <div className="feed-hash">{item.hash}</div>
                  <div className="feed-time">{item.time}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <a href="#" style={{ fontSize: '11px', color: '#555' }}>View all activity →</a>
            </div>
          </div>

          {/* Reputation */}
          <div className="card">
            <div className="section-header">
              <div className="card-label" style={{ margin: 0 }}>Agent Reputation</div>
              <span style={{ fontSize: '10px', color: '#444' }}>ERC-8004</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {AGENTS.slice(0,3).map(a => (
                <div key={a.id} className="rep-card">
                  <div className="rep-avatar">{a.icon}</div>
                  <div className="rep-name">{a.name}</div>
                  <div className="rep-stat">{a.decisions} · {a.accuracy}</div>
                  <div className="rep-bar"><div className="rep-bar-fill" style={{ width: `${a.repScore}%` }} /></div>
                  <span className="badge badge-outline">{a.reputation}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}