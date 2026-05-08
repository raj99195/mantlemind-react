import { Link } from 'react-router-dom';
import { AGENTS } from '../data/mockData';

export default function Agents() {
  return (
    <div className="page-wrap">
      <div style={{ display:'flex', alignItems:'start', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.02em' }}>Agent Workforce</h2>
          <p style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>Autonomous agents with on-chain ERC-8004 identity</p>
        </div>
        <button className="btn btn-white">+ Deploy New Agent</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total Agents', val:'4', sub:'3 active · 1 standby' },
          { label:'Total Decisions', val:'255', sub:'across all agents' },
          { label:'MNT Paid Out', val:'0.047', sub:'total agent fees' },
          { label:'Avg Accuracy', val:'96%', sub:'excellent' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ textAlign:'center' }}>
            <div className="card-label">{s.label}</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'#fff', margin:'6px 0' }}>{s.val}</div>
            <div style={{ fontSize:'11px', color:'#555' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {AGENTS.map(agent => (
          <div key={agent.id} className="card fade-up">
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ width:'48px', height:'48px', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0, filter:'grayscale(1)' }}>
                {agent.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'15px', fontWeight:600 }}>{agent.name}</span>
                  <span className="badge badge-outline">{agent.role}</span>
                  <span className={`badge ${agent.status === 'active' ? 'badge-white' : 'badge-dim'}`}>
                    {agent.status === 'active' ? '● ACTIVE' : 'STANDBY'}
                  </span>
                  <span style={{ fontSize:'10px', color:'#444', fontFamily:'JetBrains Mono', marginLeft:'auto' }}>ERC-8004 {agent.erc}</span>
                </div>
                <p style={{ fontSize:'12px', color:'#555' }}>{agent.desc}</p>
              </div>
              <Link to={agent.id === 1 ? '/agent-detail' : '#'}>
                <button className={`btn ${agent.id === 1 ? 'btn-outline' : 'btn-ghost'}`} style={{ fontSize:'12px', padding:'6px 14px' }}>
                  View Details →
                </button>
              </Link>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginTop:'14px', paddingTop:'14px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
              {[
                { label:'Decisions', val: agent.decisions },
                { label:'Accuracy', val: agent.accuracy },
                { label:'MNT Earned', val: agent.mntEarned },
                { label:'Reputation', val: agent.reputation },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>{s.label}</div>
                  <div style={{ fontSize:'16px', fontWeight:600, color:'#fff' }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop:'12px' }}>
              <div style={{ height:'2px', background:'rgba(255,255,255,0.06)', borderRadius:'1px' }}>
                <div style={{ height:'2px', width:`${agent.repScore}%`, background:'#fff', borderRadius:'1px' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                <span style={{ fontSize:'10px', color:'#444' }}>Reputation score</span>
                <span style={{ fontSize:'10px', color:'#888' }}>{agent.repScore} / 100</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
