import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useVaultBalance } from '../hooks/useContracts';

const periods = ['7D', '30D', '90D', 'All'];

export default function Portfolio() {
  const [period, setPeriod] = useState('7D');
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { balance: mntBalance } = useBalance({ address });
  const { vaultBalance } = useVaultBalance();

  const mnt = parseFloat(mntBalance?.formatted || 0);
  const vault = parseFloat(vaultBalance || 0);
  const total = mnt + vault;
  const totalUSD = (total * 0.6724).toFixed(2); // MNT price

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

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total Value', val: isConnected ? `${total.toFixed(4)} MNT` : '—', sub: isConnected ? `≈ $${totalUSD}` : 'Connect wallet' },
          { label:'Wallet Balance', val: isConnected ? `${mnt.toFixed(4)} MNT` : '—', sub: 'Available balance' },
          { label:'Vault Balance', val: isConnected ? `${vault} MNT` : '—', sub: 'In MantleMind Vault' },
          { label:'MNT Price', val: '$0.6724', sub: '▲ +6.21% today' },
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
          <button onClick={() => open()} className="btn btn-white" style={{ marginTop:'16px' }}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
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
                <text x="178" y="118" fill="#444" fontSize="9" fontFamily="JetBrains Mono">May 5</text>
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
                      MasterMind suggests depositing more MNT into vault for agent-managed yield optimization
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
                    <td style={{ fontFamily:'JetBrains Mono' }}>${(mnt * 0.6724).toFixed(2)}</td>
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
                    <td style={{ fontFamily:'JetBrains Mono' }}>${(vault * 0.6724).toFixed(2)}</td>
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
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}