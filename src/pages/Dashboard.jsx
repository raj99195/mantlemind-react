import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { FEED_ITEMS, ALLOCATIONS } from '../data/mockData';
import { 
  useWalletBalance, useTotalAgents, useVaultBalance, useAgent,
  useHireAgent, usePayAgent, useRecordDecision, useDeposit, useDeployAgent
} from '../hooks/useContracts';
import { runMasterMind, findAgentsByRole } from '../agents/masterMind';

let feedCounter = 6;

function AgentRow({ agentId }) {
  const { agent } = useAgent(agentId);
  if (!agent?.name) return null;
  return (
    <div className="agent-row">
      <div className={`agent-dot ${agent.isActive ? 'dot-active' : 'dot-idle'}`} />
      <div className="agent-icon">🤖</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="agent-name">{agent.name}</span>
          <span className="badge badge-outline">{agent.role}</span>
        </div>
        <div className="agent-desc">
          Decisions: {Number(agent.totalDecisions)} · Rep: {Number(agent.reputation)}/100
        </div>
      </div>
      <span className={`badge ${agent.isActive ? 'badge-white' : 'badge-dim'}`}>
        {agent.isActive ? 'ACTIVE' : 'INACTIVE'}
      </span>
    </div>
  );
}

function useAllAgents(agentIds) {
  const a1 = useAgent(agentIds[0]);
  const a2 = useAgent(agentIds[1]);
  const a3 = useAgent(agentIds[2]);
  const a4 = useAgent(agentIds[3]);
  const a5 = useAgent(agentIds[4]);
  const results = [a1, a2, a3, a4, a5];
  return agentIds.map((id, i) => {
    const data = results[i]?.agent;
    if (!data) return null;
    return {
      id: Number(id),
      name: data.name,
      role: data.role,
      isActive: data.isActive,
      reputation: Number(data.reputation),
      totalDecisions: Number(data.totalDecisions),
      totalEarned: Number(data.totalEarned),
    };
  }).filter(Boolean);
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { balance, symbol } = useWalletBalance();
  const { total: totalAgents } = useTotalAgents();
  const { vaultBalance } = useVaultBalance();
  const { hireAgent } = useHireAgent();
  const { payAgent } = usePayAgent();
  const { recordDecision } = useRecordDecision();
  const { deposit } = useDeposit();
  const { deployAgent } = useDeployAgent();

  const [feed, setFeed] = useState(FEED_ITEMS);
  const [goal, setGoal] = useState('Mere paas 500 USDY hai. 3 mahine mein maximum yield chahiye, risk low rakhna.');
  const [isRunning, setIsRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [totalDecisions, setTotalDecisions] = useState(0);
  const [telegramChatId, setTelegramChatId] = useState('');

  const agentIds = Array.from({ length: Math.min(Number(totalAgents || 0), 5) }, (_, i) => i + 1);
  const allAgents = useAllAgents(agentIds);

  // Load telegram chat ID from backend
  useEffect(() => {
    if (!address) return;
    fetch('http://localhost:3001/api/users/' + address)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.telegram_chat_id) {
          setTelegramChatId(d.data.telegram_chat_id);
        }
      })
      .catch(() => {});
  }, [address]);

  const addToFeed = useCallback((title, tx = null) => {
    const hash = tx ? tx.slice(0, 10) + '...' : '0x' + Math.random().toString(16).substr(2, 8) + '...';
    setFeed(prev => [{ id: feedCounter++, icon: '✓', title, hash, time: 'just now' }, ...prev.slice(0, 9)]);
  }, []);

  const updateStep = useCallback((update) => {
    setAgentSteps(prev => {
      const existing = prev.findIndex(s => s.step === update.step);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...update };
        return updated;
      }
      return [...prev, { ...update }];
    });
    addToFeed(`${update.step}: ${update.action}`, update.tx);
  }, [addToFeed]);

  const handleRunAgent = async () => {
    if (!goal.trim() || isRunning) return;
    if (!isConnected) { open(); return; }

    setIsRunning(true);
    setAgentSteps([]);
    setStrategy(null);

    try {
      const result = await runMasterMind(goal, {
        onUpdate: updateStep,
        userAgents: allAgents,
        telegramChatId, // pass telegram chat ID

        onAutoDeployAgents: async () => {
          addToFeed('Auto-deploying MasterMind agent...');
          await deployAgent('MasterMind', 'COORDINATOR');
          addToFeed('Auto-deploying DataAgent...');
          await deployAgent('DataAgent', 'ANALYZER');
          addToFeed('Auto-deploying TradeAgent...');
          await deployAgent('TradeAgent', 'EXECUTOR');
          return [1, 2, 3];
        },

        onChainHire: async (masterId, subId, payment) => {
          const hash = await hireAgent(masterId, subId, payment);
          addToFeed(`Agent #${subId} hired by Agent #${masterId} — ${payment} MNT`, hash);
          setTotalDecisions(d => d + 1);
          return hash;
        },

        onChainPay: async (agentId, amount) => {
          const hash = await payAgent(agentId, amount);
          addToFeed(`Agent #${agentId} paid ${amount} MNT`, hash);
          return hash;
        },

        onChainRecord: async (agentId, action, success) => {
          const hash = await recordDecision(agentId, action, success);
          addToFeed(`Decision recorded: ${action.slice(0, 40)}`, hash);
          setTotalDecisions(d => d + 1);
          return hash;
        },

        onVaultDeposit: async (amount) => {
          const hash = await deposit(amount);
          addToFeed(`Vault deposit: ${amount} MNT`, hash);
          return hash;
        },
      });

      setStrategy(result.strategy);
    } catch (err) {
      console.error('MasterMind error:', err);
      updateStep({ step: 'MasterMind', action: `Error: ${err.message?.slice(0, 60)}`, status: 'error', tx: null });
    } finally {
      setIsRunning(false);
    }
  };

  const METRICS = [
    {
      label: 'Total Portfolio Value',
      value: isConnected ? `${parseFloat(balance || 0).toFixed(3)} ${symbol}` : '—',
      sub: isConnected ? '● Live on Mantle' : 'Connect wallet',
      icon: '💼'
    },
    { label: 'Active Agents', value: String(totalAgents || 0), sub: 'On-chain ERC-8004', icon: '🤖' },
    {
      label: 'Vault Balance',
      value: isConnected ? `${vaultBalance} MNT` : '—',
      sub: isConnected ? 'In MantleMind Vault' : 'Connect wallet',
      icon: '◈'
    },
    { label: 'Total Decisions', value: String(totalDecisions), sub: 'On-chain recorded', icon: '⚡' },
  ];

  const suggestions = ['Maximize yield on my USDY', 'Auto-rebalance weekly', 'Hedge mETH position'];
  const agentRoles = findAgentsByRole(allAgents);

  return (
    <div className="page-wrap">

      {/* Hero */}
      <div className="hero-section">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-sub">Your AI Co-Pilot for the</div>
          <div className="hero-title">Mantle Ecosystem</div>
          <div className="hero-desc">Autonomous agents. Intelligent decisions. On-chain execution.</div>
          {!isConnected && (
            <button onClick={() => open()} style={{ marginTop:'16px', background:'#fff', color:'#000', border:'none', borderRadius:'8px', padding:'10px 24px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              Connect Wallet to Start →
            </button>
          )}
        </div>
      </div>

      {/* Telegram connected indicator */}
      {telegramChatId && (
        <div style={{ marginBottom:'12px', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'14px' }}>📱</span>
          <span style={{ fontSize:'11px', color:'#888' }}>Telegram notifications active — agents will notify you on every action</span>
          <span className="badge badge-white" style={{ marginLeft:'auto' }}>CONNECTED</span>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {METRICS.map((m, i) => (
          <div key={i} className="metric-card fade-up" style={{ animationDelay:`${i*0.05}s` }}>
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
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'16px' }}>

        {/* Left */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Goal + AI */}
          <div className="card">
            <div className="card-label">Your Goal — MasterMind AI</div>

            {agentRoles && (
              <div style={{ marginBottom:'10px', padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'10px', color:'#555' }}>Using:</span>
                <span className="badge badge-outline">{agentRoles.masterName} → Master</span>
                <span className="badge badge-outline">{agentRoles.dataName} → Data</span>
                <span className="badge badge-outline">{agentRoles.tradeName} → Trade</span>
              </div>
            )}
            {!agentRoles && isConnected && (
              <div style={{ marginBottom:'10px', padding:'8px 10px', background:'rgba(255,100,100,0.05)', borderRadius:'6px', border:'0.5px solid rgba(255,100,100,0.2)' }}>
                <span style={{ fontSize:'11px', color:'#ff6666' }}>No agents found — will auto-deploy 3 agents on first run</span>
              </div>
            )}

            <div className="goal-input-wrap">
              <span className="goal-quote">"</span>
              <textarea value={goal} onChange={e => setGoal(e.target.value)}
                className="goal-input" rows="2"
                placeholder="Tell MantleMind your financial goal..."
                disabled={isRunning} />
              <button className="goal-send" onClick={handleRunAgent} disabled={isRunning}
                style={{ opacity: isRunning ? 0.5 : 1 }}>
                {isRunning ? '⟳' : '➤'}
              </button>
            </div>
            <div style={{ marginBottom:'8px' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => !isRunning && setGoal(s)} className="suggestion-pill" disabled={isRunning}>{s}</button>
              ))}
            </div>

            {/* Agent Steps */}
            {agentSteps.length > 0 && (
              <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:'10px', color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>
                  Agent Activity — On-Chain
                </div>
                {agentSteps.map((step, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'6px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', flexShrink:0, marginTop:'4px',
                      background: step.status === 'done' ? '#fff' : step.status === 'error' ? '#ff4444' : '#555',
                      animation: step.status === 'thinking' ? 'pulseDot 1s infinite' : 'none'
                    }} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'11px', color:'#888', width:'90px', flexShrink:0 }}>{step.step}</span>
                        <span style={{ fontSize:'11px', color: step.status === 'done' ? '#ccc' : step.status === 'error' ? '#ff4444' : '#555' }}>
                          {step.action}
                        </span>
                      </div>
                      {step.tx && (
                        <a href={'https://explorer.sepolia.mantle.xyz/tx/' + step.tx} target="_blank" rel="noreferrer"
                          style={{ fontSize:'10px', color:'#444', fontFamily:'JetBrains Mono', display:'block', marginTop:'2px' }}>
                          {step.tx.slice(0, 18)}... ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Strategy Result */}
            {strategy && (
              <div style={{ marginTop:'12px', padding:'12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'0.5px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize:'10px', color:'#555', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>
                  MasterMind Strategy — Executed
                </div>
                <div style={{ fontSize:'12px', color:'#ccc', marginBottom:'8px', lineHeight:1.5 }}>{strategy.explanation}</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  <span className="badge badge-outline">{strategy.intent}</span>
                  <span className="badge badge-outline">Risk: {strategy.riskLevel}</span>
                  <span className="badge badge-outline">{strategy.timeframe}mo</span>
                  <span className="badge badge-white">ON-CHAIN ✓</span>
                  {telegramChatId && <span className="badge badge-outline">📱 Notified</span>}
                </div>
              </div>
            )}
          </div>

          {/* Agent Workforce */}
          <div className="card">
            <div className="section-header">
              <div className="card-label" style={{ margin:0 }}>Agent Workforce</div>
              <Link to="/agents" className="section-link">View all agents →</Link>
            </div>
            {agentIds.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px', color:'#444', fontSize:'12px' }}>
                No agents deployed yet — <Link to="/agents" style={{ color:'#888' }}>Deploy one</Link>
              </div>
            ) : (
              agentIds.map(id => <AgentRow key={id} agentId={id} />)
            )}
          </div>

          {/* Portfolio Allocation */}
          <div className="card">
            <div className="card-label">Portfolio Allocation</div>
            {isConnected ? (
              <div>
                <div className="bar-row">
                  <span className="bar-label">MNT</span>
                  <div className="bar-track"><div className="bar-fill bar-animate" style={{ width:'100%' }} /></div>
                  <span className="bar-pct">{parseFloat(balance || 0).toFixed(3)}</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Vault</span>
                  <div className="bar-track"><div className="bar-fill bar-animate" style={{ width:'30%' }} /></div>
                  <span className="bar-pct">{vaultBalance}</span>
                </div>
                <div style={{ fontSize:'11px', color:'#444', marginTop:'8px' }}>
                  More assets will appear as agents execute strategies
                </div>
              </div>
            ) : (
              ALLOCATIONS.map(a => (
                <div key={a.label} className="bar-row">
                  <span className="bar-label">{a.label}</span>
                  <div className="bar-track"><div className="bar-fill bar-animate" style={{ width:`${a.pct}%` }} /></div>
                  <span className="bar-pct">{a.pct}%</span>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Right */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Live Feed */}
          <div className="card" style={{ flex:1 }}>
            <div className="section-header">
              <div className="card-label" style={{ margin:0 }}>Live Agent Feed</div>
              <span style={{ fontSize:'10px', color:'#555', display:'flex', alignItems:'center', gap:'4px' }}>
                <span className="live-dot" style={{ width:'5px', height:'5px' }} />Live
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
            <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
              <Link to="/transactions" style={{ fontSize:'11px', color:'#555' }}>View all activity →</Link>
            </div>
          </div>

          {/* Agent Reputation */}
          <div className="card">
            <div className="section-header">
              <div className="card-label" style={{ margin:0 }}>Agent Reputation</div>
              <span style={{ fontSize:'10px', color:'#444' }}>ERC-8004</span>
            </div>
            {agentIds.length === 0 ? (
              <div style={{ textAlign:'center', padding:'16px', color:'#444', fontSize:'12px' }}>No agents yet</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                {agentIds.slice(0, 3).map(id => <AgentRepCard key={id} agentId={id} />)}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function AgentRepCard({ agentId }) {
  const { agent } = useAgent(agentId);
  if (!agent?.name) return null;
  const rep = Number(agent.reputation);
  const decisions = Number(agent.totalDecisions);
  const accuracy = decisions > 0 ? Math.round((Number(agent.correctDecisions) / decisions) * 100) : 0;
  return (
    <div className="rep-card">
      <div className="rep-avatar">🤖</div>
      <div className="rep-name">{agent.name}</div>
      <div className="rep-stat">{decisions} · {accuracy}%</div>
      <div className="rep-bar"><div className="rep-bar-fill" style={{ width:`${rep}%` }} /></div>
      <span className="badge badge-outline">{rep >= 80 ? 'Elite' : rep >= 60 ? 'Trusted' : rep >= 40 ? 'Rising' : 'New'}</span>
    </div>
  );
}