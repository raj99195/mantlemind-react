import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useVaultBalance } from '../hooks/useContracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const periods = ['7D', '30D', '90D', 'All'];

export default function Portfolio() {
  const [period, setPeriod] = useState('7D');
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { balance: mntBalance } = useBalance({ address });
  const { vaultBalance } = useVaultBalance();

  const [mntPrice, setMntPrice] = useState(0);
  const [mntChange, setMntChange] = useState(0);
  const [pools, setPools] = useState([]);
  const [risk, setRisk] = useState(null);
  const [agentNarrative, setAgentNarrative] = useState(null);
  const [goalProgress, setGoalProgress] = useState(null);
  const [pnlData, setPnlData] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [mktRes, narRes, gpRes, pnlRes] = await Promise.all([
          fetch(`${API_BASE}/api/loop/market`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/narrative`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/goal-progress`).then(r => r.json()),
          fetch(`${API_BASE}/api/economy/pnl`).then(r => r.json()),
        ]);
        if (mktRes.success) {
          setMntPrice(mktRes.data?.market?.mntPrice || 0);
          setMntChange(mktRes.data?.market?.mntChange24h || 0);
          setPools(mktRes.data?.pools || []);
          setRisk(mktRes.data?.risk || null);
        }
        if (narRes.success && narRes.data) setAgentNarrative(narRes.data);
        if (gpRes.success) setGoalProgress(gpRes.current ?? 0);
        if (pnlRes.success) setPnlData(pnlRes.data || []);
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const mnt = parseFloat(mntBalance?.formatted || 0);
  const vault = parseFloat(vaultBalance || 0);
  const total = mnt + vault;
  const price = mntPrice || 0;
  const totalUSD = (total * price).toFixed(2);
  const totalEarned = pnlData.reduce((s, a) => s + (a.total_earned || 0), 0);

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

      {/* Metrics — all live */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          {
            label:'Total Value',
            val: isConnected ? `${total.toFixed(4)} MNT` : '—',
            sub: isConnected ? `≈ $${totalUSD}` : 'Connect wallet'
          },
          {
            label:'Wallet Balance',
            val: isConnected ? `${mnt.toFixed(4)} MNT` : '—',
            sub: 'Available balance'
          },
          {
            label:'Vault Balance',
            val: isConnected ? `${vault} MNT` : '—',
            sub: 'In MantleMind Vault'
          },
          {
            label:'MNT Price',
            val: price > 0 ? `$${price.toFixed(4)}` : '—',
            sub: price > 0 ? `${mntChange >= 0 ? '▲' : '▼'} ${mntChange >= 0 ? '+' : ''}${mntChange.toFixed(2)}% today` : 'Loading...'
          },
        ].map((m, i) => (
          <div key={i} className="metric-card">
            <div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-val">{m.val}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {!isConnected ? (
        <div className="card" style={{ textAlign:'center', padding:'60px' }}>
          <div style={{ fontSize:'40px', marginBottom:'16px' }}>💼</div>
          <div style={{ fontSize:'16px', color:'#888', marginBottom:'8px' }}>Connect wallet to see your portfolio</div>
          <button onClick={() => open()} className="btn btn-white" style={{ marginTop:'16px' }}>Connect Wallet</button>
        </div>
      ) : (
        <>
          {/* Goal Progress + AI Narrative */}
          {(goalProgress !== null || agentNarrative) && (
            <div className="card" style={{ marginBottom:'14px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <div className="card-label" style={{ margin:0 }}>AI Portfolio Intelligence</div>
                {risk && (
                  <span style={{ fontSize:'11px', color: risk.level === 'HIGH' ? '#ff4444' : risk.level === 'MEDIUM' ? '#facc15' : '#4ade80' }}>
                    Risk: {risk.level} ({risk.score}/10)
                  </span>
                )}
              </div>
              {goalProgress !== null && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ fontSize:'10px', color:'#555', textTransform:'uppercase', letterSpacing:'0.06em' }}>Goal Progress</span>
                    <span style={{ fontSize:'11px', color: goalProgress >= 80 ? '#4ade80' : goalProgress >= 40 ? '#facc15' : '#888', fontWeight:600 }}>{goalProgress}%</span>
                  </div>
                  <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'2px' }}>
                    <div style={{ height:'3px', width:`${goalProgress}%`, background: goalProgress >= 80 ? '#4ade80' : goalProgress >= 40 ? '#facc15' : '#fff', borderRadius:'2px', transition:'width 0.5s' }}/>
                  </div>
                </div>
              )}
              {agentNarrative && (
                <div style={{ padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', borderLeft:'2px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize:'9px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>MasterMind — Latest Decision</div>
                  <div style={{ fontSize:'12px', color:'#777', lineHeight:1.6 }}>{agentNarrative}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
            {/* Portfolio Chart */}
            <div className="card">
              <div className="section-header">
                <div className="card-label" style={{ margin:0 }}>Portfolio Growth</div>
                <span style={{ fontSize:'11px', color:'#888' }}>Live on Mantle</span>
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
                <text x="178" y="118" fill="#444" fontSize="9" fontFamily="JetBrains Mono">May 15</text>
                <text x="340" y="118" fill="#444" fontSize="9" fontFamily="JetBrains Mono">Today</text>
              </svg>
            </div>

            {/* Asset Allocation */}
            <div className="card">
              <div className="card-label">Asset Allocation</div>
              {total > 0 ? (
                <>
                  <div className="bar-row">
                    <span className="bar-label">MNT Wallet</span>
                    <div className="bar-track">
                      <div className="bar-fill bar-animate" style={{ width: total > 0 ? `${(mnt/total*100).toFixed(0)}%` : '0%' }} />
                    </div>
                    <span className="bar-pct">{total > 0 ? (mnt/total*100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="bar-row">
                    <span className="bar-label">MNT Vault</span>
                    <div className="bar-track">
                      <div className="bar-fill bar-animate" style={{ width: total > 0 ? `${(vault/total*100).toFixed(0)}%` : '0%' }} />
                    </div>
                    <span className="bar-pct">{total > 0 ? (vault/total*100).toFixed(0) : 0}%</span>
                  </div>
                  <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:'10px', color:'#444', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>AI Recommendation</div>
                    <div style={{ fontSize:'12px', color:'#888', background:'rgba(255,255,255,0.03)', padding:'10px', borderRadius:'8px', borderLeft:'2px solid rgba(255,255,255,0.15)' }}>
                      {agentNarrative ? agentNarrative.slice(0, 120) + '...' : 'MasterMind suggests depositing more MNT into vault for agent-managed yield optimization'}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:'20px', color:'#444', fontSize:'12px' }}>
                  No assets found — run MasterMind to start
                </div>
              )}
            </div>
          </div>

          {/* Live Byreal Pools */}
          {pools.length > 0 && (
            <div className="card" style={{ marginBottom:'14px' }}>
              <div className="section-header" style={{ marginBottom:'12px' }}>
                <div className="card-label" style={{ margin:0 }}>Live Yield Opportunities</div>
                <span style={{ fontSize:'10px', color:'#555' }}>Byreal pools · Live</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>{['Pool', 'APR', 'TVL', 'Volume 24h', 'Risk'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pools.map((p, i) => (
                      <tr key={i}>
                        <td style={{ color:'#fff', fontWeight:600 }}>{p.pair}</td>
                        <td style={{ fontFamily:'JetBrains Mono', color: parseFloat(p.apr) > 200 ? '#facc15' : '#4ade80' }}>{p.apr}%</td>
                        <td style={{ fontFamily:'JetBrains Mono' }}>${Number(p.tvl).toLocaleString()}</td>
                        <td style={{ fontFamily:'JetBrains Mono' }}>${Number(p.volume24h).toLocaleString()}</td>
                        <td>
                          <span style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'4px', border:'0.5px solid', borderColor: parseFloat(p.apr) > 500 ? 'rgba(255,100,100,0.4)' : parseFloat(p.apr) > 100 ? 'rgba(250,204,21,0.4)' : 'rgba(74,222,128,0.4)', color: parseFloat(p.apr) > 500 ? '#ff9999' : parseFloat(p.apr) > 100 ? '#facc15' : '#4ade80' }}>
                            {parseFloat(p.apr) > 500 ? 'HIGH' : parseFloat(p.apr) > 100 ? 'MEDIUM' : 'LOW'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Holdings */}
          <div className="card">
            <div className="section-header">
              <div className="card-label" style={{ margin:0 }}>Holdings</div>
              <span style={{ fontSize:'11px', color:'#444' }}>Managed by MantleMind agents</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>{['Asset','Balance','Value (USD)','Allocation','Manager'].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color:'#fff', fontWeight:600 }}>MNT (Wallet)</td>
                    <td style={{ fontFamily:'JetBrains Mono' }}>{mnt.toFixed(4)}</td>
                    <td style={{ fontFamily:'JetBrains Mono' }}>${(mnt * price).toFixed(2)}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <div style={{ width:'36px', height:'2px', background:'rgba(255,255,255,0.08)', borderRadius:'1px' }}>
                          <div style={{ width: total > 0 ? `${(mnt/total*100).toFixed(0)}%` : '0%', height:'2px', background:'#fff', borderRadius:'1px' }}/>
                        </div>
                        <span>{total > 0 ? (mnt/total*100).toFixed(0) : 0}%</span>
                      </div>
                    </td>
                    <td><span className="badge badge-outline">Self</span></td>
                  </tr>
                  <tr>
                    <td style={{ color:'#fff', fontWeight:600 }}>MNT (Vault)</td>
                    <td style={{ fontFamily:'JetBrains Mono' }}>{vault}</td>
                    <td style={{ fontFamily:'JetBrains Mono' }}>${(vault * price).toFixed(2)}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <div style={{ width:'36px', height:'2px', background:'rgba(255,255,255,0.08)', borderRadius:'1px' }}>
                          <div style={{ width: total > 0 ? `${(vault/total*100).toFixed(0)}%` : '0%', height:'2px', background:'#fff', borderRadius:'1px' }}/>
                        </div>
                        <span>{total > 0 ? (vault/total*100).toFixed(0) : 0}%</span>
                      </div>
                    </td>
                    <td><span className="badge badge-outline">MasterMind</span></td>
                  </tr>
                  {totalEarned > 0 && (
                    <tr>
                      <td style={{ color:'#4ade80', fontWeight:600 }}>Agent Earnings</td>
                      <td style={{ fontFamily:'JetBrains Mono', color:'#4ade80' }}>{totalEarned.toFixed(4)}</td>
                      <td style={{ fontFamily:'JetBrains Mono', color:'#4ade80' }}>${(totalEarned * price).toFixed(2)}</td>
                      <td><span style={{ fontSize:'10px', color:'#4ade80' }}>Economy</span></td>
                      <td><span className="badge badge-outline">Economy Loop</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}