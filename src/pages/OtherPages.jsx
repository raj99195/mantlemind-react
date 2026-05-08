import { useState } from 'react';
import { TRANSACTIONS } from '../data/mockData';

const filters = ['All','Agent Payments','Trades','Hires','Rebalances'];

export function Transactions() {
  const [active, setActive] = useState('All');
  return (
    <div className="page-wrap">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.02em' }}>Transaction History</h2>
          <p style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>Every decision. On-chain. Forever.</p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:'12px' }}>↓ Export CSV</button>
      </div>
      <div className="filter-bar">
        {filters.map(f => <button key={f} onClick={() => setActive(f)} className={`filter-pill${active===f?' active':''}`}>{f}</button>)}
      </div>
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>{['Type','Description','Tx Hash','Amount','Status','Time',''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((tx,i) => (
                <tr key={i}>
                  <td><span className="badge badge-outline">{tx.type}</span></td>
                  <td style={{ color:'#ccc', maxWidth:'200px' }}>{tx.desc}</td>
                  <td><span style={{ fontFamily:'JetBrains Mono', fontSize:'10px', color:'#555' }}>{tx.hash}</span></td>
                  <td style={{ fontFamily:'JetBrains Mono' }}>{tx.amount}</td>
                  <td><span className="badge badge-white">{tx.status}</span></td>
                  <td style={{ color:'#444' }}>{tx.time}</td>
                  <td><a href="#" style={{ color:'#555', fontSize:'11px' }}>↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign:'center', marginTop:'16px', paddingTop:'16px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
          <button className="btn btn-outline" style={{ fontSize:'12px' }}>View all on Mantle Explorer ↗</button>
        </div>
      </div>
    </div>
  );
}

export function Onboarding() {
  const [goal, setGoal] = useState('');
  const [risk, setRisk] = useState('Low');
  const [horizon, setHorizon] = useState('3 Months');
  const suggestions = ['Maximize yield on my USDY with low risk','Auto-rebalance my portfolio every week','Hedge my mETH against market volatility','Generate passive income from my MNT'];
  return (
    <div className="page-wrap" style={{ maxWidth:'600px', margin:'0 auto' }}>
      <div style={{ margin:'32px 0 36px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {['Connect Wallet','Set Goal','Deploy'].map((s,i) => (
            <div key={i} style={{ display:'contents' }}>
              <div style={{ width:'26px', height:'26px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:600, flexShrink:0, background: i===0?'rgba(255,255,255,0.1)':i===1?'#fff':'rgba(255,255,255,0.05)', color: i===1?'#000':'#fff', border: i===0?'0.5px solid rgba(255,255,255,0.2)':i===2?'0.5px solid rgba(255,255,255,0.1)':'none' }}>
                {i===0?'✓':i+1}
              </div>
              {i<2 && <div style={{ flex:1, height:'1px', background: i===0?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.06)' }}/>}
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding:'32px' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎯</div>
          <h2 style={{ fontSize:'24px', fontWeight:700, letterSpacing:'-0.02em', marginBottom:'8px' }}>Apna goal batao</h2>
          <p style={{ fontSize:'13px', color:'#555' }}>Plain language mein — Hindi ya English</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:'10px', padding:'14px', marginBottom:'12px' }}>
          <textarea value={goal} onChange={e=>setGoal(e.target.value)} style={{ width:'100%', background:'transparent', border:'none', color:'#fff', fontFamily:'Satoshi, sans-serif', fontSize:'14px', resize:'none', outline:'none', lineHeight:'1.6', minHeight:'64px' }} placeholder="e.g. Mere paas 500 USDY hai. Maximum yield chahiye..."/>
        </div>
        <div style={{ marginBottom:'24px' }}>
          {suggestions.map(s => <button key={s} onClick={()=>setGoal(s)} className="suggestion-pill">{s}</button>)}
        </div>
        <p style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>Risk Tolerance</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'24px' }}>
          {[['🛡️','Low','Stable'],['⚖️','Medium','Balanced'],['🚀','High','Max yield']].map(([ic,l,s]) => (
            <div key={l} onClick={()=>setRisk(l)} style={{ textAlign:'center', padding:'12px', borderRadius:'10px', border:`0.5px solid ${risk===l?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.08)'}`, background: risk===l?'rgba(255,255,255,0.06)':'transparent', cursor:'pointer' }}>
              <div style={{ fontSize:'20px', marginBottom:'4px' }}>{ic}</div>
              <p style={{ fontSize:'12px', fontWeight:500, color: risk===l?'#fff':'#aaa' }}>{l}</p>
              <p style={{ fontSize:'10px', color:'#444' }}>{s}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>Time Horizon</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'28px' }}>
          {['1 Month','3 Months','6 Months','1 Year+'].map(h => (
            <button key={h} onClick={()=>setHorizon(h)} className={`filter-pill${horizon===h?' active':''}`}>{h}</button>
          ))}
        </div>
        <button className="btn btn-white btn-full" style={{ padding:'14px', fontSize:'14px' }}>Deploy MantleMind Agents →</button>
        <p style={{ textAlign:'center', fontSize:'11px', color:'#444', marginTop:'10px' }}>Each agent receives an ERC-8004 identity NFT</p>
      </div>
    </div>
  );
}

export function Settings() {
  const [t, setT] = useState({ rebalance:true, trading:true, risk:true, telegram:true, alerts:true, report:false });
  const tog = k => setT(p => ({...p, [k]:!p[k]}));
  return (
    <div className="page-wrap" style={{ maxWidth:'800px' }}>
      <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.02em', marginBottom:'24px' }}>Settings</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

        <div className="card">
          <div className="card-label">Wallet & Network</div>
          {[{l:'Connected Wallet',s:'0x7A3d8f92c11b4e2a...8F92',r:<span className="badge badge-white">CONNECTED</span>},{l:'Network',s:'Mantle Mainnet · Chain ID 5000',r:<span className="badge badge-outline">MANTLE</span>}].map((r,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'8px' }}>
              <div><p style={{ fontSize:'13px' }}>{r.l}</p><p style={{ fontSize:'10px', color:'#444', fontFamily:'JetBrains Mono', marginTop:'2px' }}>{r.s}</p></div>
              {r.r}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-label">Agent Configuration</div>
          {[{k:'rebalance',l:'Auto-rebalance',s:'Allow agents to rebalance automatically'},{k:'trading',l:'Live trading',s:'Allow TradeAgent to execute real trades'},{k:'risk',l:'Risk monitoring',s:'RiskAgent monitors exposure continuously'}].map((item,i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0' }}>
                <div><p style={{ fontSize:'13px' }}>{item.l}</p><p style={{ fontSize:'11px', color:'#444', marginTop:'2px' }}>{item.s}</p></div>
                <div onClick={()=>tog(item.k)} className={`toggle ${t[item.k]?'toggle-on':'toggle-off'}`}>
                  <div className="toggle-thumb"/>
                </div>
              </div>
              {i<2 && <div style={{ height:'0.5px', background:'rgba(255,255,255,0.05)' }}/>}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-label">Byreal Integration</div>
          {[['RealClaw','OpenClaw-based agent','⚡'],['Byreal Agent Skills','CLMM, LP & Swap','◈'],['Byreal Perps CLI','Perpetual futures','↗']].map((b,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.06)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>{b[2]}</div>
                <div><p style={{ fontSize:'13px' }}>{b[0]}</p><p style={{ fontSize:'11px', color:'#444' }}>{b[1]}</p></div>
              </div>
              <span className="badge badge-white">CONNECTED</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-label">Notifications</div>
          {[{k:'telegram',l:'Agent decisions via Telegram'},{k:'alerts',l:'Large transaction alerts'},{k:'report',l:'Weekly portfolio report'}].map((item,i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0' }}>
                <p style={{ fontSize:'13px' }}>{item.l}</p>
                <div onClick={()=>tog(item.k)} className={`toggle ${t[item.k]?'toggle-on':'toggle-off'}`}>
                  <div className="toggle-thumb"/>
                </div>
              </div>
              {i<2 && <div style={{ height:'0.5px', background:'rgba(255,255,255,0.05)' }}/>}
            </div>
          ))}
        </div>

        <div className="card" style={{ border:'0.5px solid rgba(255,255,255,0.15)' }}>
          <div className="card-label" style={{ color:'#888' }}>Danger Zone</div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="btn btn-outline" style={{ fontSize:'12px' }}>Pause All Agents</button>
            <button className="btn btn-outline" style={{ fontSize:'12px' }}>Withdraw All Funds</button>
          </div>
        </div>

      </div>
    </div>
  );
}
