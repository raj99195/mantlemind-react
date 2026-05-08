import { Link } from 'react-router-dom';

const decisions = [
  { title:'Hired DataAgent for yield pool scanning', meta:'0.008 MNT paid · 2 min ago', hash:'0x7f3a91bc...' },
  { title:'Strategy: allocate 45% to USDY LP on Agni Finance', meta:'Portfolio rebalance · 5 min ago', hash:'0x2c9d44ef...' },
  { title:'Risk assessment passed — proceeding with execution', meta:'Safety check · 8 min ago', hash:'0x8a1fc33d...' },
  { title:'Goal interpreted — yield maximization, low risk, 3 months', meta:'Initial setup · 15 min ago', hash:'0x4e72b88a...' },
  { title:'ERC-8004 identity NFT minted — agent deployed', meta:'Genesis · May 1, 2026', hash:'0x1d3c7f21...' },
];

export default function AgentDetail() {
  return (
    <div className="page-wrap">
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px', fontSize:'13px' }}>
        <Link to="/agents" style={{ color:'#555', textDecoration:'none' }}>← Back to Agents</Link>
        <span style={{ color:'#333' }}>/</span>
        <span style={{ color:'#fff' }}>MasterMind</span>
      </div>

      <div className="card" style={{ marginBottom:'16px', background:'rgba(255,255,255,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'64px', height:'64px', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', flexShrink:0, filter:'grayscale(1)' }}>🧠</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap' }}>
              <h1 style={{ fontSize:'26px', fontWeight:700, letterSpacing:'-0.02em' }}>MasterMind</h1>
              <span className="badge badge-outline">Coordinator</span>
              <span className="badge badge-white">● ACTIVE</span>
              <span className="badge badge-outline" style={{ marginLeft:'auto' }}>ELITE</span>
            </div>
            <p style={{ fontSize:'12px', color:'#555', marginBottom:'8px' }}>Strategic oversight, goal interpretation, and autonomous sub-agent orchestration via Byreal RealClaw</p>
            <div style={{ display:'flex', gap:'16px', fontSize:'11px', color:'#444', flexWrap:'wrap' }}>
              <span>Identity: <span style={{ fontFamily:'JetBrains Mono', color:'#666' }}>ERC-8004 #0047</span></span>
              <span>Deployed: <span style={{ color:'#888' }}>May 1, 2026</span></span>
              <span>Contract: <span style={{ fontFamily:'JetBrains Mono', color:'#666' }}>0x4f2a...c91b</span></span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
            <button className="btn btn-outline" style={{ fontSize:'12px', padding:'6px 12px' }}>Pause</button>
            <button className="btn btn-ghost" style={{ fontSize:'12px', padding:'6px 12px' }}>⊞ Explorer</button>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px', marginBottom:'16px' }}>
        {[['Total Decisions','142'],['Accuracy Rate','94%'],['MNT Earned','0.021'],['Agents Hired','3'],['Rep Score','94']].map(([l,v]) => (
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <div className="card-label">{l}</div>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#fff' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
        <div className="card">
          <div className="card-label">On-Chain Decision Log</div>
          <p style={{ fontSize:'11px', color:'#444', marginBottom:'14px' }}>Every decision permanently recorded on Mantle</p>
          {decisions.map((d, i) => (
            <div key={i} style={{ display:'flex', gap:'12px', paddingBottom:'12px' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: i===decisions.length-1 ? '#333' : '#fff', marginTop:'2px', flexShrink:0 }}/>
                {i < decisions.length-1 && <div style={{ width:'1px', flex:1, background:'rgba(255,255,255,0.06)', marginTop:'4px' }}/>}
              </div>
              <div style={{ flex:1, paddingBottom:'4px' }}>
                <p style={{ fontSize:'13px', color:'#fff', marginBottom:'2px' }}>{d.title}</p>
                <p style={{ fontSize:'11px', color:'#555' }}>{d.meta}</p>
                <span style={{ fontFamily:'JetBrains Mono', fontSize:'10px', color:'#444' }}>{d.hash} ↗</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div className="card">
            <div className="card-label">ERC-8004 Reputation</div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span className="badge badge-white">ELITE</span>
              <span style={{ fontSize:'13px', color:'#fff', fontWeight:500 }}>94 / 100</span>
            </div>
            <div style={{ height:'3px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', marginBottom:'14px' }}>
              <div style={{ height:'3px', width:'94%', background:'#fff', borderRadius:'2px' }}/>
            </div>
            {[['Decision accuracy','94%'],['Strategy success','91%'],['On-chain uptime','99.8%'],['Days active','6 days']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', paddingBottom:'8px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', marginBottom:'8px' }}>
                <span style={{ color:'#555' }}>{l}</span>
                <span style={{ color:'#ccc' }}>{v}</span>
              </div>
            ))}
          </div>

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
