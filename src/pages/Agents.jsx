import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useDeployAgent, useTotalAgents, useAgent, useHireAgent, useFireAgent, usePayAgent } from '../hooks/useContracts';

function AgentCard({ agentId, allAgentIds }) {
  const { agent, isLoading } = useAgent(agentId);
  const { hireAgent, isPending: isHiring } = useHireAgent();
  const { fireAgent, isPending: isFiring } = useFireAgent();
  const { payAgent, isPending: isPaying } = usePayAgent();

  const [txHash, setTxHash] = useState('');
  const [txLabel, setTxLabel] = useState('');
  const [err, setErr] = useState('');
  const [showHire, setShowHire] = useState(false);
  const [masterIdInput, setMasterIdInput] = useState('1');
  const [payAmount, setPayAmount] = useState('0.001');

  if (isLoading) return (
    <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ color: '#444', fontSize: '12px' }}>Loading agent #{agentId}...</div>
    </div>
  );

  if (!agent || !agent.name) return null;

  const repScore = Number(agent.reputation);
  const decisions = Number(agent.totalDecisions);
  const accuracy = decisions > 0
    ? Math.round((Number(agent.correctDecisions) / decisions) * 100)
    : 0;

  const handleHire = async () => {
    setErr(''); setTxHash('');
    try {
      const hash = await hireAgent(Number(masterIdInput), agentId, 0.001);
      setTxHash(hash); setTxLabel('Hired!');
      setShowHire(false);
    } catch (e) { setErr(e.message?.slice(0, 80) || 'Failed'); }
  };

  const handleFire = async () => {
    if (!window.confirm('Fire this agent?')) return;
    setErr(''); setTxHash('');
    try {
      const hash = await fireAgent(agentId);
      setTxHash(hash); setTxLabel('Fired!');
    } catch (e) { setErr(e.message?.slice(0, 80) || 'Failed'); }
  };

  const handlePay = async () => {
    setErr(''); setTxHash('');
    try {
      const hash = await payAgent(agentId, Number(payAmount));
      setTxHash(hash); setTxLabel('Paid!');
    } catch (e) { setErr(e.message?.slice(0, 80) || 'Failed'); }
  };

  return (
    <div className="card fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>{agent.name}</span>
            <span className="badge badge-outline">{agent.role}</span>
            <span className={`badge ${agent.isActive ? 'badge-white' : 'badge-dim'}`}>
              {agent.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>
              ERC-8004 #{String(agentId).padStart(4, '0')}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#444', fontFamily: 'JetBrains Mono' }}>
            Owner: {agent.owner?.slice(0, 6)}...{agent.owner?.slice(-4)}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Decisions', val: decisions },
          { label: 'Accuracy', val: accuracy + '%' },
          { label: 'MNT Earned', val: (Number(agent.totalEarned) / 1e18).toFixed(4) },
          { label: 'Reputation', val: repScore + '/100' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px' }}>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px' }}>
          <div style={{ height: '2px', width: repScore + '%', background: '#fff', borderRadius: '1px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: '#444' }}>Reputation score</span>
          <span style={{ fontSize: '10px', color: '#888' }}>{repScore} / 100</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: '11px', padding: '5px 12px' }}
          onClick={() => setShowHire(!showHire)}
        >
          Hire Agent
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: '11px', padding: '5px 12px', opacity: isFiring ? 0.6 : 1 }}
          onClick={handleFire}
          disabled={isFiring}
        >
          {isFiring ? 'Firing...' : 'Fire Agent'}
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            value={payAmount}
            onChange={e => setPayAmount(e.target.value)}
            style={{
              width: '70px', background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', padding: '4px 8px',
              color: '#fff', fontSize: '11px', outline: 'none'
            }}
          />
          <button
            className="btn btn-ghost"
            style={{ fontSize: '11px', padding: '5px 12px', opacity: isPaying ? 0.6 : 1 }}
            onClick={handlePay}
            disabled={isPaying}
          >
            {isPaying ? 'Paying...' : 'Pay MNT'}
          </button>
        </div>
      </div>

      {/* Hire Form */}
      {showHire && (
        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
            Hire agent #{agentId} under which master agent?
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={masterIdInput}
              onChange={e => setMasterIdInput(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '6px', padding: '6px 10px',
                color: '#fff', fontSize: '12px', outline: 'none'
              }}
            >
              {allAgentIds.filter(id => id !== agentId).map(id => (
                <option key={id} value={id} style={{ background: '#111' }}>
                  Agent #{id}
                </option>
              ))}
            </select>
            <button
              className="btn btn-white"
              style={{ fontSize: '11px', padding: '6px 14px', opacity: isHiring ? 0.6 : 1 }}
              onClick={handleHire}
              disabled={isHiring}
            >
              {isHiring ? 'Hiring...' : 'Confirm Hire'}
            </button>
          </div>
        </div>
      )}

      {/* Tx Result */}
      {txHash && (
        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: '2px solid #fff' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{txLabel}</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#555' }}>
            {txHash.slice(0, 20)}...
          </div>
          <a
            href={'https://explorer.sepolia.mantle.xyz/tx/' + txHash}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '10px', color: '#666' }}
          >
            View on Explorer
          </a>
        </div>
      )}

      {err && (
        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,0,0,0.05)', borderRadius: '6px', borderLeft: '2px solid #ff4444' }}>
          <div style={{ fontSize: '11px', color: '#ff6666' }}>{err}</div>
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const { deployAgent, isPending } = useDeployAgent();
  const { total } = useTotalAgents();

  const [showDeploy, setShowDeploy] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('ANALYZER');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const roles = ['COORDINATOR', 'ANALYZER', 'EXECUTOR', 'MONITOR'];

  const handleDeploy = async () => {
    if (!agentName.trim()) return;
    setError(''); setTxHash('');
    try {
      const hash = await deployAgent(agentName, agentRole);
      setTxHash(hash);
      setAgentName('');
      setShowDeploy(false);
    } catch (err) {
      setError(err.message?.slice(0, 100) || 'Deploy failed');
    }
  };

  const agentIds = Array.from({ length: Number(total || 0) }, (_, i) => i + 1);

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Agent Workforce</h2>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Autonomous agents with on-chain ERC-8004 identity</p>
        </div>
        {isConnected ? (
          <button className="btn btn-white" onClick={() => setShowDeploy(!showDeploy)}>
            {showDeploy ? 'X Cancel' : '+ Deploy New Agent'}
          </button>
        ) : (
          <button className="btn btn-white" onClick={() => open()}>Connect Wallet</button>
        )}
      </div>

      {/* Deploy Form */}
      {showDeploy && (
        <div className="card fade-up" style={{ marginBottom: '20px', border: '0.5px solid rgba(255,255,255,0.2)' }}>
          <div className="card-label">Deploy New Agent — On-Chain</div>
          <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>
            Deploys ERC-8004 identity NFT on Mantle Testnet
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="Agent name e.g. YieldHunter"
              style={{
                flex: 1, minWidth: '200px',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', padding: '10px 14px',
                color: '#fff', fontSize: '13px',
                fontFamily: 'Satoshi, sans-serif', outline: 'none'
              }}
            />
            <select
              value={agentRole}
              onChange={e => setAgentRole(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', padding: '10px 14px',
                color: '#fff', fontSize: '13px',
                fontFamily: 'Satoshi, sans-serif', outline: 'none', cursor: 'pointer'
              }}
            >
              {roles.map(r => (
                <option key={r} value={r} style={{ background: '#111' }}>{r}</option>
              ))}
            </select>
            <button
              className="btn btn-white"
              onClick={handleDeploy}
              disabled={isPending || !agentName.trim()}
              style={{ opacity: isPending ? 0.6 : 1, minWidth: '120px' }}
            >
              {isPending ? 'Deploying...' : 'Deploy'}
            </button>
          </div>

          {txHash && (
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '2px solid #fff' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Agent deployed on Mantle!</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#555', marginBottom: '4px' }}>
                Tx: {txHash}
              </div>
              <a
                href={'https://explorer.sepolia.mantle.xyz/tx/' + txHash}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: '#888' }}
              >
                View on Mantle Explorer
              </a>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px', background: 'rgba(255,0,0,0.05)', borderRadius: '8px', borderLeft: '2px solid #ff4444' }}>
              <div style={{ fontSize: '11px', color: '#ff6666' }}>{error}</div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Agents', val: String(total || 0), sub: 'on-chain' },
          { label: 'Total Decisions', val: '255', sub: 'across all agents' },
          { label: 'MNT Paid Out', val: '0.047', sub: 'total agent fees' },
          { label: 'Avg Accuracy', val: '96%', sub: 'excellent' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div className="card-label">{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>{s.val}</div>
            <div style={{ fontSize: '11px', color: '#555' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Real Agent List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {agentIds.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
            <div style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>No agents deployed yet</div>
            <button className="btn btn-white" onClick={() => setShowDeploy(true)}>
              Deploy Your First Agent
            </button>
          </div>
        ) : (
          agentIds.map(id => (
            <AgentCard key={id} agentId={id} allAgentIds={agentIds} />
          ))
        )}
      </div>
    </div>
  );
}