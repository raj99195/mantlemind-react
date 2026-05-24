import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { FEED_ITEMS, ALLOCATIONS } from '../data/mockData';
import { 
  useWalletBalance, useTotalAgents, useVaultBalance, useAgent,
  useHireAgent, usePayAgent, useRecordDecision, useDeposit, useDeployAgent
} from '../hooks/useContracts';
import { runMasterMind, findAgentsByRole } from '../agents/masterMind';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');

// ── useLoopControl hook ──────────────────────────────────────
function useLoopControl() {
  const [loopState, setLoopState] = useState(null);
  const [loopActivity, setLoopActivity] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'loop_state') setLoopState(msg.data);
            if (msg.type === 'activity') setLoopActivity(prev => [msg.data, ...prev].slice(0, 20));
            if (msg.type === 'loop_tick') setLoopActivity(prev => [{
              agentName: 'MasterMind', action: `Cycle #${msg.data.cycle} started`,
              status: 'running', time: msg.data.time,
            }, ...prev].slice(0, 20));
          } catch {}
        };
        ws.onclose = () => { reconnectTimer = setTimeout(connect, 3000); };
      } catch {}
    };
    connect();
    fetch(`${API_BASE}/api/loop/status`).then(r => r.json()).then(d => { if (d.success) setLoopState(d.state); }).catch(() => {});
    fetch(`${API_BASE}/api/loop/activity`).then(r => r.json()).then(d => { if (d.success) setLoopActivity(d.data); }).catch(() => {});
    return () => { clearTimeout(reconnectTimer); if (ws) ws.close(); };
  }, []);

  const startLoop = async (goal) => {
    const d = await fetch(`${API_BASE}/api/loop/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, intervalMinutes: 10 }) }).then(r => r.json());
    if (d.success) setLoopState(d.state);
  };
  const stopLoop = async () => {
    await fetch(`${API_BASE}/api/loop/stop`, { method: 'POST' });
    setLoopState(prev => ({ ...prev, running: false }));
  };
  const pauseLoop = async () => {
    const d = await fetch(`${API_BASE}/api/loop/pause`, { method: 'POST' }).then(r => r.json());
    if (d.success) setLoopState(prev => ({ ...prev, paused: d.paused }));
  };
  const emergencyStop = async () => {
    if (!window.confirm('Emergency stop — sab agents pause honge. Continue?')) return;
    await fetch(`${API_BASE}/api/loop/emergency-stop`, { method: 'POST' });
    setLoopState(prev => ({ ...prev, running: false, emergencyStop: true }));
  };
  const manualTick = async () => { await fetch(`${API_BASE}/api/loop/tick`, { method: 'POST' }); };

  return { loopState, loopActivity, startLoop, stopLoop, pauseLoop, emergencyStop, manualTick };
}

// ── LoopControlPanel component ───────────────────────────────
function LoopControlPanel({ goal, loopState, loopActivity, onStart, onStop, onPause, onEmergency, onTick }) {
  const isRunning = loopState?.running && !loopState?.paused;
  const isPaused  = loopState?.running && loopState?.paused;
  const statusColor = loopState?.emergencyStop ? '#ff4444' : isRunning ? '#4ade80' : isPaused ? '#facc15' : '#555';
  const statusText  = loopState?.emergencyStop ? 'EMERGENCY STOP' : isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : 'STOPPED';
  const nextRunIn   = loopState?.nextRun ? Math.max(0, Math.round((new Date(loopState.nextRun) - Date.now()) / 60000)) : null;

  return (
    <div className="card" style={{ marginBottom: '14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div className="card-label" style={{ margin:0 }}>Autonomous Loop</div>
          <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: statusColor, animation: isRunning ? 'pulseDot 1.5s infinite' : 'none' }} />
            <span style={{ fontSize:'10px', color: statusColor, fontFamily:'JetBrains Mono', letterSpacing:'0.06em' }}>{statusText}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px' }}>
          {(!loopState?.running || loopState?.emergencyStop) && (
            <button className="btn btn-white" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={() => onStart(goal)}>▶ Start</button>
          )}
          {isPaused && (
            <button className="btn btn-white" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={onPause}>▶ Resume</button>
          )}
          {isRunning && (
            <>
              <button className="btn btn-ghost" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={onPause}>⏸ Pause</button>
              <button className="btn btn-ghost" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={onTick} title="Run cycle now">⚡ Now</button>
            </>
          )}
          {(isRunning || isPaused) && (
            <button className="btn btn-ghost" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={onStop}>■ Stop</button>
          )}
          <button className="btn btn-ghost" style={{ fontSize:'11px', padding:'5px 12px', color:'#ff6666', borderColor:'rgba(255,100,100,0.3)' }} onClick={onEmergency}>🚨</button>
        </div>
      </div>

      {loopState && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
          {[
            { label:'Cycles', val: loopState.cycleCount || 0 },
            { label:'Decisions', val: loopState.totalDecisions || 0 },
            { label:'Fired', val: loopState.agentsFired || 0 },
            { label:'Next run', val: nextRunIn !== null && isRunning ? `${nextRunIn}m` : '—' },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign:'center', padding:'8px', background:'rgba(255,255,255,0.02)', borderRadius:'6px' }}>
              <div style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'2px' }}>{label}</div>
              <div style={{ fontSize:'16px', fontWeight:600, color:'#fff' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {loopActivity.length > 0 && (
        <div>
          <div style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Live Activity</div>
          <div style={{ maxHeight:'130px', overflowY:'auto' }}>
            {loopActivity.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'3px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', flexShrink:0,
                  background: a.status==='done' ? '#4ade80' : a.status==='error' ? '#ff4444' : '#facc15',
                  animation: a.status==='running' ? 'pulseDot 1s infinite' : 'none'
                }} />
                <span style={{ fontSize:'10px', color:'#555', width:'80px', flexShrink:0 }}>{a.agentName}</span>
                <span style={{ fontSize:'11px', color: a.status==='error' ? '#ff6666' : '#888', flex:1 }}>{a.action}</span>
                <span style={{ fontSize:'10px', color:'#333', flexShrink:0 }}>
                  {new Date(a.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loopState && <div style={{ textAlign:'center', padding:'10px', color:'#444', fontSize:'12px' }}>Connecting to backend...</div>}
    </div>
  );
}


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
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [totalDecisions, setTotalDecisions] = useState(0);
  const [telegramChatId, setTelegramChatId] = useState('');
  const { loopState, loopActivity, startLoop, stopLoop, pauseLoop, emergencyStop, manualTick } = useLoopControl();

  // Day 7-11: Intelligence + Economy state
  const [goalProgress, setGoalProgress] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [pnlData, setPnlData] = useState([]);

  // Fetch intelligence + economy data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gpRes, narRes, mktRes, pnlRes] = await Promise.all([
          fetch(`${API_BASE}/api/loop/goal-progress`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/narrative`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/market`).then(r => r.json()),
          fetch(`${API_BASE}/api/economy/pnl`).then(r => r.json()),
        ]);
        if (gpRes.success) setGoalProgress(gpRes.current ?? gpRes.data?.progress_pct ?? 0);
        if (narRes.success && narRes.data) setNarrative(narRes.data);
        if (mktRes.success) {
          setMarketData(mktRes.data);
          // Extract anomalies from pools
          const pools = mktRes.data?.pools || [];
          const found = [];
          if (pools[0] && parseFloat(pools[0].apr) > 500)
            found.push({ type: 'EXTREME_APR', msg: `${pools[0].pair} @ ${pools[0].apr}% APR — possible rug risk` });
          if (mktRes.data?.market?.mntChange24h < -5)
            found.push({ type: 'MARKET_CRASH', msg: `MNT down ${Math.abs(mktRes.data.market.mntChange24h).toFixed(1)}% today` });
          setAnomalies(found);
        }
        if (pnlRes.success) setPnlData(pnlRes.data || []);
      } catch {}
    };
    fetchData();
    const t = setInterval(fetchData, 60000); // refresh every 60s
    return () => clearInterval(t);
  }, []);

  // Listen to WebSocket for real-time updates
  useEffect(() => {
    if (!loopState) return;
    if (loopState.goalProgress !== undefined) setGoalProgress(loopState.goalProgress);
    if (loopState.lastNarrative) setNarrative(loopState.lastNarrative);
  }, [loopState]);

  const agentIds = Array.from({ length: Math.min(Number(totalAgents || 0), 5) }, (_, i) => i + 1);
  const allAgents = useAllAgents(agentIds);

  // Load telegram chat ID from backend
  useEffect(() => {
    if (!address) return;
    fetch(`${API_BASE}/api/users/` + address)
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

  const mntPrice = marketData?.market?.mntPrice || 0;
  const mntChange = marketData?.market?.mntChange24h || 0;
  const METRICS = [
    {
      label: 'Total Portfolio Value',
      value: isConnected ? `${parseFloat(balance || 0).toFixed(3)} ${symbol}` : '—',
      sub: isConnected ? `MNT $${mntPrice.toFixed(4)} (${mntChange >= 0 ? '+' : ''}${mntChange.toFixed(2)}%)` : 'Connect wallet',
      icon: '💼'
    },
    { label: 'Active Agents', value: String(totalAgents || 0), sub: `${loopState?.cycleCount || 0} cycles run`, icon: '🤖' },
    {
      label: 'Vault Balance',
      value: isConnected ? `${vaultBalance} MNT` : '—',
      sub: isConnected ? 'In MantleMind Vault' : 'Connect wallet',
      icon: '◈'
    },
    {
      label: 'Goal Progress',
      value: goalProgress !== null ? `${goalProgress}%` : '—',
      sub: loopState?.running ? '● Loop running' : 'Start loop to track',
      icon: '🎯'
    },
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
                        <a href={`${import.meta.env.VITE_EXPLORER_URL || 'https://explorer.sepolia.mantle.xyz'}/tx/${step.tx}`} target="_blank" rel="noreferrer"
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

          {/* Autonomous Loop Control */}
          <LoopControlPanel
            goal={goal}
            loopState={loopState}
            loopActivity={loopActivity}
            onStart={startLoop}
            onStop={stopLoop}
            onPause={pauseLoop}
            onEmergency={emergencyStop}
            onTick={manualTick}
          />

          {/* Intelligence Panel — Goal Progress + Narrative + Anomalies */}
          {(goalProgress !== null || narrative || anomalies.length > 0 || marketData) && (
            <div className="card">
              <div className="section-header" style={{ marginBottom:'12px' }}>
                <div className="card-label" style={{ margin:0 }}>Intelligence Feed</div>
                <span style={{ fontSize:'10px', color:'#555' }}>AI-powered insights</span>
              </div>

              {/* Goal Progress Bar */}
              {goalProgress !== null && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ fontSize:'10px', color:'#555', textTransform:'uppercase', letterSpacing:'0.06em' }}>Goal Progress</span>
                    <span style={{ fontSize:'11px', color: goalProgress >= 80 ? '#4ade80' : goalProgress >= 40 ? '#facc15' : '#888', fontWeight:600 }}>{goalProgress}%</span>
                  </div>
                  <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'2px' }}>
                    <div style={{ height:'3px', width:`${goalProgress}%`, background: goalProgress >= 80 ? '#4ade80' : goalProgress >= 40 ? '#facc15' : '#fff', borderRadius:'2px', transition:'width 0.5s ease' }} />
                  </div>
                </div>
              )}

              {/* Market snapshot */}
              {marketData?.pools?.[0] && (
                <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
                  <div style={{ padding:'6px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', fontSize:'11px' }}>
                    <span style={{ color:'#444' }}>Best Pool: </span>
                    <span style={{ color:'#fff' }}>{marketData.pools[0].pair}</span>
                    <span style={{ color:'#4ade80', marginLeft:'6px' }}>{marketData.pools[0].apr}% APR</span>
                  </div>
                  <div style={{ padding:'6px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', fontSize:'11px' }}>
                    <span style={{ color:'#444' }}>Risk: </span>
                    <span style={{ color: marketData.risk?.level === 'HIGH' ? '#ff4444' : marketData.risk?.level === 'MEDIUM' ? '#facc15' : '#4ade80' }}>
                      {marketData.risk?.level} ({marketData.risk?.score}/10)
                    </span>
                  </div>
                  <div style={{ padding:'6px 10px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', fontSize:'11px' }}>
                    <span style={{ color:'#444' }}>Mantle TVL: </span>
                    <span style={{ color:'#fff' }}>${((marketData.defi?.mantleTvl || 0) / 1e6).toFixed(1)}M</span>
                  </div>
                </div>
              )}

              {/* Anomaly alerts */}
              {anomalies.map((a, i) => (
                <div key={i} style={{ padding:'8px 10px', background:'rgba(255,100,100,0.05)', borderRadius:'6px', border:'0.5px solid rgba(255,100,100,0.2)', marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'12px' }}>⚠️</span>
                  <span style={{ fontSize:'11px', color:'#ff9999' }}>{a.msg}</span>
                  <span className="badge" style={{ marginLeft:'auto', fontSize:'9px', color:'#ff6666', border:'0.5px solid rgba(255,100,100,0.3)', padding:'2px 6px', borderRadius:'4px' }}>{a.type}</span>
                </div>
              ))}

              {/* AI Narrative */}
              {narrative && (
                <div style={{ padding:'10px 12px', background:'rgba(255,255,255,0.02)', borderRadius:'8px', borderLeft:'2px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize:'9px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>AI Narrative — Cycle #{loopState?.cycleCount}</div>
                  <div style={{ fontSize:'12px', color:'#888', lineHeight:1.6 }}>{narrative}</div>
                </div>
              )}
            </div>
          )}

          {/* Economy Panel — P&L */}
          {pnlData.length > 0 && (
            <div className="card">
              <div className="section-header" style={{ marginBottom:'12px' }}>
                <div className="card-label" style={{ margin:0 }}>Agent Economy</div>
                <span style={{ fontSize:'10px', color:'#555' }}>P&L · Earnings</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Agent', 'Earned', 'Spent', 'Net P&L', 'Last Action'].map(h => (
                      <th key={h} style={{ fontSize:'10px', color:'#444', textTransform:'uppercase', letterSpacing:'0.06em', padding:'4px 8px', textAlign:'left', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {pnlData.slice(0, 5).map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontSize:'11px', color:'#fff', padding:'6px 8px', fontFamily:'JetBrains Mono' }}>#{p.agent_id}</td>
                        <td style={{ fontSize:'11px', color:'#4ade80', padding:'6px 8px', fontFamily:'JetBrains Mono' }}>{(p.total_earned || 0).toFixed(4)}</td>
                        <td style={{ fontSize:'11px', color:'#ff9999', padding:'6px 8px', fontFamily:'JetBrains Mono' }}>{(p.total_spent || 0).toFixed(4)}</td>
                        <td style={{ fontSize:'11px', padding:'6px 8px', fontFamily:'JetBrains Mono', color: (p.net_pnl || 0) >= 0 ? '#4ade80' : '#ff4444' }}>
                          {(p.net_pnl || 0) >= 0 ? '+' : ''}{(p.net_pnl || 0).toFixed(4)}
                        </td>
                        <td style={{ fontSize:'10px', color:'#555', padding:'6px 8px' }}>{p.last_action || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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