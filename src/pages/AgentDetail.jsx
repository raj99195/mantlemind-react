import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAgent } from '../hooks/useContracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || 'https://explorer.sepolia.mantle.xyz';

export default function AgentDetail() {
  const { id } = useParams();
  const agentId = Number(id) || 1;
  const { agent, isLoading } = useAgent(agentId);

  const [memory, setMemory] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [narrative, setNarrative] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [memRes, pnlRes, narRes] = await Promise.all([
          fetch(`${API_BASE}/api/loop/agents/${agentId}/memory`).then(r => r.json()),
          fetch(`${API_BASE}/api/economy/pnl`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/narrative`).then(r => r.json()),
        ]);
        if (memRes.success) setMemory(memRes.data || []);
        if (pnlRes.success) {
          const agentPnl = pnlRes.data?.find(p => p.agent_id === agentId);
          setPnl(agentPnl || null);
        }
        if (narRes.success && narRes.data) setNarrative(narRes.data);
      } catch {}
    };
    load();
  }, [agentId]);

  if (isLoading) return (
    <div className="page-wrap">
      <div style={{ textAlign: 'center', padding: '60px', color: '#444', fontSize: '13px' }}>
        Loading agent #{agentId}...
      </div>
    </div>
  );

  const rep = Number(agent?.reputation || 0);
  const decisions = Number(agent?.totalDecisions || 0);
  const correctDecisions = Number(agent?.correctDecisions || 0);
  const accuracy = decisions > 0 ? Math.round((correctDecisions / decisions) * 100) : 0;
  const earned = Number(agent?.totalEarned || 0) / 1e18;
  const repTier = rep >= 80 ? 'ELITE' : rep >= 60 ? 'TRUSTED' : rep >= 40 ? 'RISING' : 'NEW';

  const deployedAt = agent?.deployedAt
    ? new Date(Number(agent.deployedAt) * 1000).toLocaleDateString()
    : '—';

  return (
    <div className="page-wrap">
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px', fontSize:'13px' }}>
        <Link to="/agents" style={{ color:'#555', textDecoration:'none' }}>← Back to Agents</Link>
        <span style={{ color:'#333' }}>/</span>
        <span style={{ color:'#fff' }}>{agent?.name || `Agent #${agentId}`}</span>
      </div>

      {/* Header card */}
      <div className="card" style={{ marginBottom:'16px', background:'rgba(255,255,255,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'64px', height:'64px', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', flexShrink:0, filter:'grayscale(1)' }}>🤖</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap' }}>
              <h1 style={{ fontSize:'26px', fontWeight:700, letterSpacing:'-0.02em' }}>{agent?.name || `Agent #${agentId}`}</h1>
              <span className="badge badge-outline">{agent?.role || '—'}</span>
              <span className={`badge ${agent?.isActive ? 'badge-white' : 'badge-dim'}`}>
                {agent?.isActive ? '● ACTIVE' : '○ INACTIVE'}
              </span>
              <span className="badge badge-outline" style={{ marginLeft:'auto' }}>{repTier}</span>
            </div>
            <p style={{ fontSize:'12px', color:'#555', marginBottom:'8px' }}>
              Autonomous on-chain agent with ERC-8004 identity — managed by MantleMind loop
            </p>
            <div style={{ display:'flex', gap:'16px', fontSize:'11px', color:'#444', flexWrap:'wrap' }}>
              <span>Identity: <span style={{ fontFamily:'JetBrains Mono', color:'#666' }}>ERC-8004 #{String(agentId).padStart(4,'0')}</span></span>
              <span>Deployed: <span style={{ color:'#888' }}>{deployedAt}</span></span>
              <span>Owner: <span style={{ fontFamily:'JetBrains Mono', color:'#666' }}>{agent?.owner?.slice(0,6)}...{agent?.owner?.slice(-4)}</span></span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
            <a
              href={`${EXPLORER_URL}/address/${agent?.owner}`}
              target="_blank" rel="noreferrer"
              className="btn btn-ghost"
              style={{ fontSize:'12px', padding:'6px 12px' }}
            >
              ⊞ Explorer
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px', marginBottom:'16px' }}>
        {[
          ['Total Decisions', decisions],
          ['Accuracy Rate', accuracy + '%'],
          ['MNT Earned', earned.toFixed(4)],
          ['Net P&L', pnl ? `${(pnl.net_pnl||0) >= 0 ? '+' : ''}${(pnl.net_pnl||0).toFixed(4)}` : '—'],
          ['Rep Score', rep + '/100'],
        ].map(([l, v]) => (
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <div className="card-label">{l}</div>
            <div style={{ fontSize:'22px', fontWeight:700, color: l === 'Net P&L' && pnl ? ((pnl.net_pnl||0) >= 0 ? '#4ade80' : '#ff4444') : '#fff' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

        {/* Decision Log from Supabase */}
        <div className="card">
          <div className="card-label">On-Chain Decision Log</div>
          <p style={{ fontSize:'11px', color:'#444', marginBottom:'14px' }}>
            {memory.length > 0 ? `${memory.length} decisions recorded` : 'No decisions yet — loop will populate this'}
          </p>
          {memory.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px', color:'#333', fontSize:'12px' }}>
              Waiting for autonomous loop decisions...
            </div>
          ) : (
            memory.slice(0, 6).map((m, i) => (
              <div key={i} style={{ display:'flex', gap:'12px', paddingBottom:'12px' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: i === 0 ? '#4ade80' : i === memory.length-1 ? '#333' : '#fff', marginTop:'2px', flexShrink:0 }}/>
                  {i < memory.slice(0,6).length-1 && <div style={{ width:'1px', flex:1, background:'rgba(255,255,255,0.06)', marginTop:'4px' }}/>}
                </div>
                <div style={{ flex:1, paddingBottom:'4px' }}>
                  <p style={{ fontSize:'13px', color:'#fff', marginBottom:'2px', textTransform:'capitalize' }}>{m.decision}: {m.outcome}</p>
                  <p style={{ fontSize:'11px', color:'#555' }}>
                    {new Date(m.created_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                  {m.context && (() => {
                    try {
                      const ctx = JSON.parse(m.context);
                      return <span style={{ fontFamily:'JetBrains Mono', fontSize:'10px', color:'#444' }}>Risk: {ctx.risk} · Pool: {ctx.bestPool || '—'}</span>;
                    } catch { return null; }
                  })()}
                </div>
              </div>
            ))
          )}

          {/* AI Narrative */}
          {narrative && (
            <div style={{ marginTop:'12px', padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', borderLeft:'2px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize:'9px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>Latest AI Narrative</div>
              <div style={{ fontSize:'11px', color:'#777', lineHeight:1.6 }}>{narrative}</div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* ERC-8004 Reputation */}
          <div className="card">
            <div className="card-label">ERC-8004 Reputation</div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span className="badge badge-white">{repTier}</span>
              <span style={{ fontSize:'13px', color:'#fff', fontWeight:500 }}>{rep} / 100</span>
            </div>
            <div style={{ height:'3px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', marginBottom:'14px' }}>
              <div style={{ height:'3px', width:`${rep}%`, background: rep >= 80 ? '#4ade80' : rep >= 60 ? '#facc15' : '#fff', borderRadius:'2px', transition:'width 0.5s' }}/>
            </div>
            {[
              ['Decision accuracy', accuracy + '%'],
              ['Total decisions', decisions],
              ['MNT earned', earned.toFixed(4)],
              ['Status', agent?.isActive ? 'Active' : 'Inactive'],
            ].map(([l, v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', marginBottom:'8px' }}>
                <span style={{ color:'#555' }}>{l}</span>
                <span style={{ color:'#ccc' }}>{v}</span>
              </div>
            ))}

            {/* P&L Summary */}
            {pnl && (
              <div style={{ marginTop:'8px', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'6px' }}>
                <div style={{ fontSize:'9px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Economy P&L</div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}>
                  <span style={{ color:'#4ade80' }}>+{(pnl.total_earned||0).toFixed(4)} earned</span>
                  <span style={{ color:'#ff9999' }}>-{(pnl.total_spent||0).toFixed(4)} spent</span>
                  <span style={{ color:(pnl.net_pnl||0) >= 0 ? '#4ade80' : '#ff4444', fontWeight:600 }}>
                    Net: {(pnl.net_pnl||0) >= 0 ? '+' : ''}{(pnl.net_pnl||0).toFixed(4)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Byreal Integration */}
          <div className="card">
            <div className="card-label">Byreal Integration</div>
            {[['RealClaw','OpenClaw-based agent','⚡'],['Byreal Agent Skills','CLMM, LP & Swap','◈'],['Byreal Perps CLI','Perpetual futures','↗']].map((b,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'6px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'28px', height:'28px', background:'rgba(255,255,255,0.06)', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>{b[2]}</div>
                  <div>
                    <p style={{ fontSize:'12px', color:'#fff' }}>{b[0]}</p>
                    <p style={{ fontSize:'10px', color:'#444' }}>{b[1]}</p>
                  </div>
                </div>
                <span className="badge badge-white">ACTIVE</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}