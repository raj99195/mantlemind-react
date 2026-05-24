import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── LEADERBOARD PAGE ─────────────────────────────────────────
export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loopStats, setLoopStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [lbRes, decRes, statusRes] = await Promise.all([
          fetch(`${API_BASE}/api/economy/leaderboard`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/decisions`).then(r => r.json()),
          fetch(`${API_BASE}/api/loop/status`).then(r => r.json()),
        ]);
        if (lbRes.success) setLeaderboard(lbRes.data || []);
        if (decRes.success) setDecisions(decRes.data || []);
        if (statusRes.success) setLoopStats(statusRes.state);
      } catch {}
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Agent Leaderboard</h2>
        <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Top performing agents by P&L, win rate, and decisions</p>
      </div>

      {/* Loop stats */}
      {loopStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Cycles', val: loopStats.cycleCount || 0 },
            { label: 'Total Decisions', val: loopStats.totalDecisions || 0 },
            { label: 'Agents Fired', val: loopStats.agentsFired || 0 },
            { label: 'Goal Progress', val: `${loopStats.goalProgress || 0}%` },
          ].map(({ label, val }) => (
            <div key={label} className="card" style={{ textAlign: 'center' }}>
              <div className="card-label">{label}</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard cards */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#444' }}>Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>No data yet</div>
          <div style={{ fontSize: '12px', color: '#444' }}>Start the autonomous loop to generate agent P&L data</div>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
            {leaderboard.slice(0, 3).map((a, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', border: i === 0 ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{medals[i] || '🤖'}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Agent #{a.agent_id}</div>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>#{i + 1} Ranked</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#444', marginBottom: '2px' }}>NET P&L</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: (a.net_pnl || 0) >= 0 ? '#4ade80' : '#ff4444' }}>
                      {(a.net_pnl || 0) >= 0 ? '+' : ''}{(a.net_pnl || 0).toFixed(4)}
                    </div>
                  </div>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#444', marginBottom: '2px' }}>WIN RATE</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{a.winRate || 0}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full table */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-label">Full Rankings</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>{['Rank', 'Agent', 'Net P&L', 'Earned', 'Spent', 'Win Rate', 'Last Action'].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {leaderboard.map((a, i) => (
                    <tr key={i}>
                      <td style={{ color: '#555', fontFamily: 'JetBrains Mono' }}>#{i + 1} {medals[i] || ''}</td>
                      <td style={{ color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>Agent #{a.agent_id}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: (a.net_pnl || 0) >= 0 ? '#4ade80' : '#ff4444', fontWeight: 600 }}>
                        {(a.net_pnl || 0) >= 0 ? '+' : ''}{(a.net_pnl || 0).toFixed(4)} MNT
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: '#4ade80' }}>+{(a.total_earned || 0).toFixed(4)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: '#ff9999' }}>-{(a.total_spent || 0).toFixed(4)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{a.winRate || 0}%</td>
                      <td style={{ fontSize: '11px', color: '#555', textTransform: 'capitalize' }}>{a.last_action || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Recent decisions */}
      {decisions.length > 0 && (
        <div className="card">
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <div className="card-label" style={{ margin: 0 }}>Recent Loop Decisions</div>
            <span style={{ fontSize: '10px', color: '#555' }}>Last 50 autonomous decisions</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>{['Agent', 'Action', 'Reason', 'Time'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {decisions.slice(0, 15).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#888' }}>#{d.agent_id}</td>
                    <td>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                        background: d.action === 'fire' ? 'rgba(255,100,100,0.1)' : d.action === 'pay' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: d.action === 'fire' ? '#ff6666' : d.action === 'pay' ? '#4ade80' : '#888'
                      }}>{d.action?.toUpperCase()}</span>
                    </td>
                    <td style={{ fontSize: '11px', color: '#666', maxWidth: '300px' }}>{d.reason}</td>
                    <td style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono' }}>
                      {new Date(d.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MARKETPLACE PAGE ──────────────────────────────────────────
export function Marketplace() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const [agents, setAgents] = useState([]);
  const [myStakes, setMyStakes] = useState([]);
  const [stakeInputs, setStakeInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [txMsg, setTxMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [mktRes, lbRes] = await Promise.all([
          fetch(`${API_BASE}/api/economy/marketplace`).then(r => r.json()),
          fetch(`${API_BASE}/api/economy/leaderboard`).then(r => r.json()),
        ]);
        // Merge marketplace + leaderboard data
        const lb = lbRes.success ? lbRes.data || [] : [];
        const mkt = mktRes.success ? mktRes.data || [] : [];
        // Combine — leaderboard has richer data
        const merged = lb.length > 0 ? lb : mkt;
        setAgents(merged);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!address) return;
    fetch(`${API_BASE}/api/economy/stakes/${address}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMyStakes(d.data || []); })
      .catch(() => {});
  }, [address]);

  const handleStake = async (agentId) => {
    if (!isConnected) { open(); return; }
    const amount = parseFloat(stakeInputs[agentId] || 0.01);
    if (!amount || amount <= 0) return;
    setTxMsg('Staking...');
    try {
      const res = await fetch(`${API_BASE}/api/economy/stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, agentId, amountMnt: amount }),
      }).then(r => r.json());
      if (res.success) {
        setTxMsg(`✅ Staked ${amount} MNT on Agent #${agentId}`);
        setMyStakes(prev => [...prev.filter(s => s.agent_id !== agentId), { agent_id: agentId, amount_mnt: amount, rewards_earned: 0 }]);
      } else {
        setTxMsg('❌ Stake failed: ' + res.error);
      }
    } catch { setTxMsg('❌ Network error'); }
    setTimeout(() => setTxMsg(''), 4000);
  };

  const handleUnstake = async (agentId) => {
    if (!isConnected) return;
    setTxMsg('Unstaking...');
    try {
      const res = await fetch(`${API_BASE}/api/economy/unstake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, agentId }),
      }).then(r => r.json());
      if (res.success) {
        setTxMsg(`✅ Unstaked! Rewards: ${(res.data.rewards || 0).toFixed(4)} MNT`);
        setMyStakes(prev => prev.filter(s => s.agent_id !== agentId));
      }
    } catch { setTxMsg('❌ Network error'); }
    setTimeout(() => setTxMsg(''), 4000);
  };

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Agent Marketplace</h2>
        <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Stake MNT on top agents — earn 20% of their rewards</p>
      </div>

      {/* Tx message */}
      {txMsg && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: txMsg.startsWith('✅') ? 'rgba(74,222,128,0.08)' : 'rgba(255,100,100,0.08)', borderRadius: '8px', border: `0.5px solid ${txMsg.startsWith('✅') ? 'rgba(74,222,128,0.3)' : 'rgba(255,100,100,0.3)'}`, fontSize: '13px', color: txMsg.startsWith('✅') ? '#4ade80' : '#ff9999' }}>
          {txMsg}
        </div>
      )}

      {/* My Stakes */}
      {myStakes.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-label">My Stakes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
            {myStakes.map((s, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Agent #{s.agent_id}</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{s.amount_mnt} MNT</div>
                <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '10px' }}>+{(s.rewards_earned || 0).toFixed(4)} rewards</div>
                <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px', width: '100%' }}
                  onClick={() => handleUnstake(s.agent_id)}>
                  Unstake + Claim
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent marketplace */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#444' }}>Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏪</div>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Marketplace empty</div>
          <div style={{ fontSize: '12px', color: '#444' }}>Deploy agents and run the loop to populate the marketplace</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {agents.map((a, i) => {
            const myStake = myStakes.find(s => s.agent_id === a.agent_id);
            return (
              <div key={i} className="card fade-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🤖'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>Agent #{a.agent_id}</span>
                      <span className="badge badge-outline">Rank #{i + 1}</span>
                      {myStake && <span className="badge badge-white">● STAKED</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#555' }}>
                      <span>Net P&L: <span style={{ color: (a.net_pnl || 0) >= 0 ? '#4ade80' : '#ff4444' }}>{(a.net_pnl || 0) >= 0 ? '+' : ''}{(a.net_pnl || 0).toFixed(4)} MNT</span></span>
                      <span>Win Rate: <span style={{ color: '#fff' }}>{a.winRate || 0}%</span></span>
                      <span>Earned: <span style={{ color: '#4ade80' }}>{(a.total_earned || 0).toFixed(4)} MNT</span></span>
                    </div>
                  </div>

                  {/* Stake / Unstake */}
                  {myStake ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontSize: '11px', color: '#4ade80' }}>Staked: {myStake.amount_mnt} MNT</div>
                      <div style={{ fontSize: '10px', color: '#666' }}>Rewards: +{(myStake.rewards_earned || 0).toFixed(4)}</div>
                      <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px', marginTop: '4px' }}
                        onClick={() => handleUnstake(a.agent_id)}>
                        Unstake
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        value={stakeInputs[a.agent_id] || ''}
                        onChange={e => setStakeInputs(prev => ({ ...prev, [a.agent_id]: e.target.value }))}
                        placeholder="0.01"
                        style={{ width: '70px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '6px 8px', color: '#fff', fontSize: '12px', outline: 'none' }}
                      />
                      <span style={{ fontSize: '11px', color: '#444' }}>MNT</span>
                      <button className="btn btn-white" style={{ fontSize: '11px', padding: '6px 14px' }}
                        onClick={() => handleStake(a.agent_id)}>
                        Stake
                      </button>
                    </div>
                  )}
                </div>

                {/* Staking info */}
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', display: 'flex', gap: '16px', fontSize: '11px', color: '#444' }}>
                  <span>💰 20% of agent earnings go to stakers</span>
                  <span>·</span>
                  <span>📊 Rewards distributed every loop cycle</span>
                  <span>·</span>
                  <span>🔓 Unstake anytime + claim rewards</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
