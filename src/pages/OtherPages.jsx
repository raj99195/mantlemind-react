import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useOnChainEvents } from '../hooks/useEvents';
import { ADDRESSES } from '../contracts/addresses';

const TX_FILTERS = ['All', 'DEPLOY', 'HIRE', 'PAY', 'FIRE', 'DECISION'];
const EXPLORER = 'https://explorer.sepolia.mantle.xyz/tx/';

export function Transactions() {
  const [active, setActive] = useState('All');
  const { events, isLoading } = useOnChainEvents(100);
  const filtered = active === 'All' ? events : events.filter(e => e.type === active);

  const exportCSV = () => {
    const rows = [['Type','Description','Tx Hash','Amount','Status','Time']];
    filtered.forEach(e => rows.push([e.type, e.desc, e.hash, e.amount, e.status, e.time]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mantlemind-history.csv'; a.click();
  };

  return (
    <div className="page-wrap">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.02em' }}>Transaction History</h2>
          <p style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>Every decision. On-chain. Forever.</p>
        </div>
        <button onClick={exportCSV} className="btn btn-ghost" style={{ fontSize:'12px' }}>↓ Export CSV</button>
      </div>
      <div className="filter-bar">
        {TX_FILTERS.map(f => (
          <button key={f} onClick={() => setActive(f)} className={`filter-pill${active===f?' active':''}`}>{f}</button>
        ))}
      </div>
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#444' }}>
            <div style={{ fontSize:'20px', marginBottom:'8px' }}>⟳</div>
            Loading on-chain events...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#444' }}>No transactions found</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>{['Type','Description','Tx Hash','Amount','Status','Time',''].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((tx, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-outline">{tx.type}</span></td>
                    <td style={{ color:'#ccc', maxWidth:'200px', fontSize:'12px' }}>{tx.desc}</td>
                    <td><span style={{ fontFamily:'JetBrains Mono', fontSize:'10px', color:'#555' }}>{tx.shortHash}</span></td>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:'12px' }}>{tx.amount}</td>
                    <td><span className={`badge ${tx.status === 'Confirmed' ? 'badge-white' : 'badge-dim'}`}>{tx.status}</span></td>
                    <td style={{ color:'#444', fontSize:'11px' }}>{tx.time}</td>
                    <td><a href={EXPLORER + tx.hash} target="_blank" rel="noreferrer" style={{ color:'#555', fontSize:'11px' }}>↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:'16px', paddingTop:'16px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
          <a href={'https://explorer.sepolia.mantle.xyz/address/' + ADDRESSES.AgentRegistry}
            target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize:'12px' }}>
            View all on Mantle Explorer ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [t, setT] = useState(() => {
    try {
      const saved = localStorage.getItem('mantlemind_settings');
      return saved ? JSON.parse(saved) : { rebalance: true, trading: true, risk: true, telegram: true, alerts: true, report: false };
    } catch { return { rebalance: true, trading: true, risk: true, telegram: true, alerts: true, report: false }; }
  });

  const { address, isConnected } = useAccount();

  useEffect(() => {
    localStorage.setItem('mantlemind_settings', JSON.stringify(t));
  }, [t]);

  const tog = k => setT(p => ({ ...p, [k]: !p[k] }));

  const [backendStatus, setBackendStatus] = useState('checking');
  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then(r => r.json())
      .then(d => setBackendStatus(d.status === 'ok' ? 'connected' : 'error'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  // ===== TELEGRAM CONNECT =====
  const [tgChatId, setTgChatId] = useState('');
  const [tgUsername, setTgUsername] = useState('');
  const [tgStatus, setTgStatus] = useState('idle'); // idle, loading, success, error
  const [tgMessage, setTgMessage] = useState('');

  // Load saved telegram info
  useEffect(() => {
    if (!address) return;
    fetch('http://localhost:3001/api/users/' + address)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setTgChatId(d.data.telegram_chat_id || '');
          setTgUsername(d.data.telegram_username || '');
          setTgStatus('success');
          setTgMessage('Telegram connected!');
        }
      })
      .catch(() => {});
  }, [address]);

  const connectTelegram = async () => {
    if (!tgChatId.trim() || !address) return;
    setTgStatus('loading');
    setTgMessage('');

    try {
      // Save to Supabase via backend
      const saveRes = await fetch('http://localhost:3001/api/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          telegramChatId: tgChatId.trim(),
          telegramUsername: tgUsername.trim(),
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);

      // Send test message
      const msgRes = await fetch('http://localhost:3001/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: tgChatId.trim(),
          message: `✅ <b>MantleMind Connected!</b>\n\nWallet: <code>${address.slice(0,6)}...${address.slice(-4)}</code>\n\nYour AI agents will now notify you here when they:\n• Hire other agents\n• Execute trades\n• Record decisions\n• Pay agent fees\n\n🤖 <i>MantleMind — Autonomous AI Agent Economy on Mantle</i>`
        })
      });
      const msgData = await msgRes.json();
      if (!msgData.success) throw new Error('Telegram message failed');

      setTgStatus('success');
      setTgMessage('Connected! Check your Telegram for confirmation message.');
    } catch (err) {
      setTgStatus('error');
      setTgMessage(err.message?.slice(0, 80) || 'Connection failed');
    }
  };

  const testTelegram = async () => {
    if (!tgChatId) return;
    try {
      await fetch('http://localhost:3001/api/realclaw/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: tgChatId,
          command: '/status'
        })
      });
      setTgMessage('RealClaw /status command sent!');
    } catch { setTgMessage('Test failed'); }
  };

  return (
    <div className="page-wrap" style={{ maxWidth:'800px' }}>
      <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.02em', marginBottom:'24px' }}>Settings</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

        {/* Wallet & Network */}
        <div className="card">
          <div className="card-label">Wallet & Network</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'8px' }}>
            <div>
              <p style={{ fontSize:'13px' }}>Connected Wallet</p>
              <p style={{ fontSize:'10px', color:'#444', fontFamily:'JetBrains Mono', marginTop:'2px' }}>
                {isConnected ? address : 'Not connected'}
              </p>
            </div>
            <span className={`badge ${isConnected ? 'badge-white' : 'badge-dim'}`}>
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px' }}>
            <div>
              <p style={{ fontSize:'13px' }}>Network</p>
              <p style={{ fontSize:'10px', color:'#444', fontFamily:'JetBrains Mono', marginTop:'2px' }}>
                Mantle Sepolia Testnet · Chain ID 5003
              </p>
            </div>
            <span className="badge badge-outline">TESTNET</span>
          </div>
        </div>

        {/* Telegram Connect */}
        <div className="card" style={{ border: tgStatus === 'success' ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.06)' }}>
          <div className="card-label">Telegram + RealClaw</div>
          <p style={{ fontSize:'12px', color:'#555', marginBottom:'14px' }}>
            Connect Telegram to receive agent notifications and control RealClaw
          </p>

          {/* How to get Chat ID */}
          <div style={{ padding:'10px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'12px' }}>
            <p style={{ fontSize:'11px', color:'#888', marginBottom:'6px' }}>How to get your Chat ID:</p>
            <p style={{ fontSize:'11px', color:'#555' }}>1. Open <a href="https://t.me/mantlemind_bot" target="_blank" rel="noreferrer" style={{ color:'#888' }}>@mantlemind_bot</a> on Telegram</p>
            <p style={{ fontSize:'11px', color:'#555' }}>2. Send <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 4px', borderRadius:'3px' }}>/whoami</code></p>
            <p style={{ fontSize:'11px', color:'#555' }}>3. Copy your User ID and paste below</p>
          </div>

          <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            <input
              value={tgChatId}
              onChange={e => setTgChatId(e.target.value)}
              placeholder="Your Telegram Chat ID (e.g. 5448705703)"
              style={{
                flex:1, minWidth:'180px',
                background:'rgba(255,255,255,0.04)',
                border:'0.5px solid rgba(255,255,255,0.15)',
                borderRadius:'8px', padding:'8px 12px',
                color:'#fff', fontSize:'12px',
                fontFamily:'JetBrains Mono', outline:'none'
              }}
            />
            <input
              value={tgUsername}
              onChange={e => setTgUsername(e.target.value)}
              placeholder="@username (optional)"
              style={{
                width:'160px',
                background:'rgba(255,255,255,0.04)',
                border:'0.5px solid rgba(255,255,255,0.15)',
                borderRadius:'8px', padding:'8px 12px',
                color:'#fff', fontSize:'12px',
                outline:'none'
              }}
            />
            <button
              className="btn btn-white"
              onClick={connectTelegram}
              disabled={tgStatus === 'loading' || !tgChatId.trim()}
              style={{ opacity: tgStatus === 'loading' ? 0.6 : 1, fontSize:'12px' }}
            >
              {tgStatus === 'loading' ? 'Connecting...' : tgStatus === 'success' ? 'Reconnect' : 'Connect'}
            </button>
            {tgStatus === 'success' && (
              <button className="btn btn-ghost" onClick={testTelegram} style={{ fontSize:'12px' }}>
                Test RealClaw
              </button>
            )}
          </div>

          {tgMessage && (
            <div style={{
              padding:'8px 10px', borderRadius:'6px', fontSize:'11px',
              background: tgStatus === 'success' ? 'rgba(255,255,255,0.04)' : 'rgba(255,0,0,0.05)',
              color: tgStatus === 'success' ? '#ccc' : '#ff6666',
              borderLeft: `2px solid ${tgStatus === 'success' ? '#fff' : '#ff4444'}`
            }}>
              {tgMessage}
            </div>
          )}

          {tgStatus === 'success' && tgUsername && (
            <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ fontSize:'11px', color:'#555' }}>Connected as</span>
              <span className="badge badge-outline">{tgUsername}</span>
              <span className="badge badge-white">ACTIVE</span>
            </div>
          )}
        </div>

        {/* Agent Configuration */}
        <div className="card">
          <div className="card-label">Agent Configuration</div>
          {[
            { k:'rebalance', l:'Auto-rebalance', s:'Allow agents to rebalance automatically' },
            { k:'trading', l:'Live trading', s:'Allow TradeAgent to execute real trades' },
            { k:'risk', l:'Risk monitoring', s:'RiskAgent monitors exposure continuously' },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0' }}>
                <div>
                  <p style={{ fontSize:'13px' }}>{item.l}</p>
                  <p style={{ fontSize:'11px', color:'#444', marginTop:'2px' }}>{item.s}</p>
                </div>
                <div onClick={() => tog(item.k)} className={`toggle ${t[item.k] ? 'toggle-on' : 'toggle-off'}`}>
                  <div className="toggle-thumb" />
                </div>
              </div>
              {i < 2 && <div style={{ height:'0.5px', background:'rgba(255,255,255,0.05)' }} />}
            </div>
          ))}
        </div>

        {/* Byreal Integration */}
        <div className="card">
          <div className="card-label">Byreal Integration</div>
          {[
            { name:'RealClaw', desc:'OpenClaw-based agent · @mantlemind_bot', icon:'⚡', status: tgStatus === 'success' ? 'CONNECTED' : 'SETUP REQUIRED' },
            { name:'Byreal Agent Skills', desc:'CLMM, LP & Swap', icon:'◈', status: backendStatus === 'connected' ? 'CONNECTED' : 'OFFLINE' },
            { name:'Byreal Perps CLI', desc:'Perpetual futures', icon:'↗', status: backendStatus === 'connected' ? 'CONNECTED' : 'OFFLINE' },
          ].map((b, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.06)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {b.icon}
                </div>
                <div>
                  <p style={{ fontSize:'13px' }}>{b.name}</p>
                  <p style={{ fontSize:'11px', color:'#444' }}>{b.desc}</p>
                </div>
              </div>
              <span className={`badge ${b.status === 'CONNECTED' ? 'badge-white' : 'badge-dim'}`}>
                {b.status}
              </span>
            </div>
          ))}
        </div>

        {/* Contract Addresses */}
        <div className="card">
          <div className="card-label">Contract Addresses</div>
          {[
            { name:'AgentRegistry', addr: ADDRESSES.AgentRegistry },
            { name:'MantleMindVault', addr: ADDRESSES.MantleMindVault },
            { name:'ERC8004Identity', addr: ADDRESSES.ERC8004Identity },
          ].map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', marginBottom:'8px' }}>
              <div>
                <p style={{ fontSize:'12px', color:'#888' }}>{c.name}</p>
                <p style={{ fontSize:'10px', color:'#444', fontFamily:'JetBrains Mono', marginTop:'2px' }}>{c.addr}</p>
              </div>
              <a href={'https://explorer.sepolia.mantle.xyz/address/' + c.addr} target="_blank" rel="noreferrer"
                style={{ fontSize:'11px', color:'#555' }}>↗</a>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-label">Notifications</div>
          {[
            { k:'telegram', l:'Agent decisions via Telegram' },
            { k:'alerts', l:'Large transaction alerts' },
            { k:'report', l:'Weekly portfolio report' },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0' }}>
                <p style={{ fontSize:'13px' }}>{item.l}</p>
                <div onClick={() => tog(item.k)} className={`toggle ${t[item.k] ? 'toggle-on' : 'toggle-off'}`}>
                  <div className="toggle-thumb" />
                </div>
              </div>
              {i < 2 && <div style={{ height:'0.5px', background:'rgba(255,255,255,0.05)' }} />}
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ border:'0.5px solid rgba(255,100,100,0.2)' }}>
          <div className="card-label" style={{ color:'#ff6666' }}>Danger Zone</div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="btn btn-outline" style={{ fontSize:'12px' }}>Pause All Agents</button>
            <button className="btn btn-outline" style={{ fontSize:'12px' }}>Withdraw All Funds</button>
          </div>
        </div>

      </div>
    </div>
  );
}

export function Onboarding() {
  const [goal, setGoal] = useState('');
  const [risk, setRisk] = useState('Low');
  const [horizon, setHorizon] = useState('3 Months');
  const suggestions = [
    'Mere paas 500 USDY hai. Maximum yield chahiye...',
    'Auto-rebalance my portfolio every week',
    'Hedge my mETH against market volatility',
    'Generate passive income from my MNT',
  ];
  return (
    <div className="page-wrap" style={{ maxWidth:'600px', margin:'0 auto' }}>
      <div style={{ margin:'32px 0 36px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {['Connect Wallet', 'Set Goal', 'Deploy'].map((s, i) => (
            <div key={i} style={{ display:'contents' }}>
              <div style={{ width:'26px', height:'26px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:600, flexShrink:0, background: i===1?'#fff':'rgba(255,255,255,0.05)', color: i===1?'#000':'#fff', border: i!==1?'0.5px solid rgba(255,255,255,0.1)':'none' }}>
                {i === 0 ? '✓' : i + 1}
              </div>
              {i < 2 && <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.1)' }} />}
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
          <textarea value={goal} onChange={e => setGoal(e.target.value)}
            style={{ width:'100%', background:'transparent', border:'none', color:'#fff', fontFamily:'Satoshi, sans-serif', fontSize:'14px', resize:'none', outline:'none', lineHeight:'1.6', minHeight:'64px' }}
            placeholder="e.g. Mere paas 500 USDY hai. Maximum yield chahiye..." />
        </div>
        <div style={{ marginBottom:'24px' }}>
          {suggestions.map(s => <button key={s} onClick={() => setGoal(s)} className="suggestion-pill">{s}</button>)}
        </div>
        <p style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>Risk Tolerance</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'24px' }}>
          {[['🛡️','Low','Stable'],['⚖️','Medium','Balanced'],['🚀','High','Max yield']].map(([ic,l,s]) => (
            <div key={l} onClick={() => setRisk(l)} style={{ textAlign:'center', padding:'12px', borderRadius:'10px', border:`0.5px solid ${risk===l?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.08)'}`, background: risk===l?'rgba(255,255,255,0.06)':'transparent', cursor:'pointer' }}>
              <div style={{ fontSize:'20px', marginBottom:'4px' }}>{ic}</div>
              <p style={{ fontSize:'12px', fontWeight:500, color: risk===l?'#fff':'#aaa' }}>{l}</p>
              <p style={{ fontSize:'10px', color:'#444' }}>{s}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>Time Horizon</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'28px' }}>
          {['1 Month','3 Months','6 Months','1 Year+'].map(h => (
            <button key={h} onClick={() => setHorizon(h)} className={`filter-pill${horizon===h?' active':''}`}>{h}</button>
          ))}
        </div>
        <button className="btn btn-white btn-full" style={{ padding:'14px', fontSize:'14px' }}>
          Deploy MantleMind Agents →
        </button>
        <p style={{ textAlign:'center', fontSize:'11px', color:'#444', marginTop:'10px' }}>
          Each agent receives an ERC-8004 identity NFT
        </p>
      </div>
    </div>
  );
}