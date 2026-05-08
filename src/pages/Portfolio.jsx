import { useState } from 'react';
import { ALLOCATIONS, HOLDINGS } from '../data/mockData';

const periods = ['7D','30D','90D','All'];

export default function Portfolio() {
  const [period, setPeriod] = useState('7D');
  return (
    <div className="page-wrap">
      <div style={{ display:'flex', alignItems:'start', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.02em' }}>Portfolio Analytics</h2>
          <p style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>AI-managed performance on Mantle Network</p>
        </div>
        <div className="filter-bar" style={{ margin:0 }}>
          {periods.map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`filter-pill${period===p?' active':''}`}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total Value', val:'$4,821', sub:'▲ +$368 this week' },
          { label:'Weekly Return', val:'+8.3%', sub:'▲ vs 2.1% market avg' },
          { label:'Best APY Found', val:'7.2%', sub:'Agni Finance LP' },
          { label:'Risk Level', val:'LOW', sub:'Within parameters' },
        ].map((m,i) => (
          <div key={i} className="metric-card">
            <div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-val">{m.val}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
        <div className="card">
          <div className="section-header">
            <div className="card-label" style={{ margin:0 }}>Portfolio Growth</div>
            <span style={{ fontSize:'11px', color:'#888' }}>+8.3% ↑</span>
          </div>
          <svg width="100%" height="120" viewBox="0 0 400 120">
            <line x1="0" y1="25" x2="400" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
            <line x1="0" y1="55" x2="400" y2="55" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
            <line x1="0" y1="85" x2="400" y2="85" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15"/>
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M20 100 C60 90 100 80 140 74 C180 68 220 58 260 48 C300 38 340 26 380 18 L380 115 L20 115 Z" fill="url(#wg)"/>
            <path d="M20 100 C60 90 100 80 140 74 C180 68 220 58 260 48 C300 38 340 26 380 18" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="380" cy="18" r="3" fill="#fff"/>
            <text x="18" y="118" fill="#444" fontSize="9" fontFamily="JetBrains Mono">May 1</text>
            <text x="178" y="118" fill="#444" fontSize="9" fontFamily="JetBrains Mono">May 4</text>
            <text x="340" y="118" fill="#444" fontSize="9" fontFamily="JetBrains Mono">Today</text>
          </svg>
        </div>

        <div className="card">
          <div className="card-label">Asset Allocation</div>
          {ALLOCATIONS.map(a => (
            <div key={a.label} className="bar-row">
              <span className="bar-label">{a.label}</span>
              <div className="bar-track"><div className="bar-fill bar-animate" style={{ width:`${a.pct}%` }}/></div>
              <span className="bar-pct">{a.pct}%</span>
            </div>
          ))}
          <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize:'10px', color:'#444', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>AI Recommendation</div>
            <div style={{ fontSize:'12px', color:'#888', background:'rgba(255,255,255,0.03)', padding:'10px', borderRadius:'8px', borderLeft:'2px solid rgba(255,255,255,0.15)' }}>
              MasterMind suggests increasing mETH by 5% — projected +0.8% yield
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="card-label" style={{ margin:0 }}>Holdings</div>
          <span style={{ fontSize:'11px', color:'#444' }}>Managed by MantleMind agents</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>{['Asset','Balance','Value','Allocation','24h','APY','Manager'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h,i) => (
                <tr key={i}>
                  <td style={{ color:'#fff', fontWeight:600 }}>{h.asset}</td>
                  <td style={{ fontFamily:'JetBrains Mono' }}>{h.balance}</td>
                  <td style={{ fontFamily:'JetBrains Mono' }}>{h.value}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <div style={{ width:'36px', height:'2px', background:'rgba(255,255,255,0.08)', borderRadius:'1px' }}>
                        <div style={{ width:`${h.pct}%`, height:'2px', background:'#fff', borderRadius:'1px' }}/>
                      </div>
                      <span>{h.pct}%</span>
                    </div>
                  </td>
                  <td style={{ color: parseFloat(h.change) > 0 ? '#ccc' : '#666' }}>{h.change}</td>
                  <td>{h.apy}</td>
                  <td><span className="badge badge-outline">{h.agent}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
