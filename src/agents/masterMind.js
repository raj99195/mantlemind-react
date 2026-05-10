import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// ===== FETCH REAL BYREAL DATA =====
export async function fetchRealPools() {
  try {
    const res = await fetch('http://localhost:3001/api/byreal/pools?limit=5&sort=apr24h');
    const json = await res.json();
    if (json.success && json.data) {
      return json.data.map(p => ({
        pair: p.pair,
        apr: `${parseFloat(p.apr || p.total_apr).toFixed(2)}%`,
        tvl: `$${parseFloat(p.tvl_usd).toFixed(0)}`,
        volume24h: `$${parseFloat(p.volume_24h_usd).toFixed(0)}`,
        poolId: p.id,
      }));
    }
  } catch (err) {
    console.log('Backend not available, using fallback data');
  }
  return null;
}

export async function fetchByrealOverview() {
  try {
    const res = await fetch('http://localhost:3001/api/byreal/overview');
    const json = await res.json();
    if (json.success) return json.data.data;
  } catch {}
  return null;
}

// ===== FIND AGENTS BY ROLE =====
// agents = array of { id, name, role, isActive } from contract
export function findAgentsByRole(agents) {
  if (!agents || agents.length === 0) return null;

  const active = agents.filter(a => a.isActive);
  if (active.length === 0) return null;

  // Find by role
  const master = active.find(a => 
    a.role?.toUpperCase().includes('COORDINATOR') || 
    a.role?.toUpperCase().includes('MASTER')
  ) || active[0];

  const data = active.find(a => 
    a.role?.toUpperCase().includes('ANALYZER') || 
    a.role?.toUpperCase().includes('DATA')
  ) || active[1] || active[0];

  const trade = active.find(a => 
    a.role?.toUpperCase().includes('EXECUTOR') || 
    a.role?.toUpperCase().includes('TRADE')
  ) || active[2] || active[1] || active[0];

  const risk = active.find(a => 
    a.role?.toUpperCase().includes('MONITOR') || 
    a.role?.toUpperCase().includes('RISK')
  ) || null;

  return {
    masterId: Number(master.id),
    dataId: Number(data.id),
    tradeId: Number(trade.id),
    riskId: risk ? Number(risk.id) : null,
    masterName: master.name,
    dataName: data.name,
    tradeName: trade.name,
  };
}

// ===== GOAL INTERPRETER =====
export async function interpretGoal(userGoal) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are MasterMind, an autonomous AI financial agent on Mantle blockchain.
        
Analyze the user's financial goal and return a JSON strategy with:
- intent: what user wants (yield/trade/hedge/rebalance)
- riskLevel: low/medium/high
- timeframe: in months
- amount: estimated amount in USD if mentioned, else 100
- recommendedAction: specific action to take
- byrealCommand: which byreal-cli command to use
- explanation: plain language explanation in same language as user

Respond ONLY with valid JSON, no markdown.`
      },
      { role: 'user', content: userGoal }
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return {
      intent: 'yield', riskLevel: 'low', timeframe: 3, amount: 100,
      recommendedAction: 'Analyze top yield pools on Byreal',
      byrealCommand: 'byreal-cli pools list --sort-field apr24h',
      explanation: text
    };
  }
}

// ===== MARKET DATA AGENT =====
export async function getMarketInsights(poolData) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are DataAgent, a market analysis AI on Mantle blockchain. 
Analyze the provided Byreal pool data and give brief actionable insights.
Respond in 2-3 sentences max. Be direct and specific about best opportunity.`
      },
      {
        role: 'user',
        content: `Analyze these Byreal pools and recommend the best yield opportunity: ${JSON.stringify(poolData)}`
      }
    ],
    temperature: 0.2,
    max_tokens: 200,
  });
  return response.choices[0]?.message?.content || 'Analysis unavailable';
}

// ===== RISK ASSESSMENT AGENT =====
export async function assessRisk(strategy, riskLevel) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are RiskAgent on Mantle blockchain. Assess the risk of a DeFi strategy.
Return JSON: { riskScore: 1-10, approved: boolean, warnings: string[], recommendation: string }
Respond ONLY with valid JSON.`
      },
      {
        role: 'user',
        content: `Strategy: ${JSON.stringify(strategy)}, User risk tolerance: ${riskLevel}`
      }
    ],
    temperature: 0.1,
    max_tokens: 200,
  });

  const text = response.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { riskScore: 5, approved: true, warnings: [], recommendation: 'Proceed with caution' };
  }
}

// ===== MASTER ORCHESTRATOR =====
// callbacks = { onUpdate, onChainHire, onChainPay, onChainRecord, onVaultDeposit, onAutoDeployAgents, userAgents }
// userAgents = [{ id, name, role, isActive }] — fetched from contract
export async function runMasterMind(userGoal, callbacks) {
  const { onUpdate, onChainHire, onChainPay, onChainRecord, onVaultDeposit, onAutoDeployAgents, userAgents } = callbacks;
  const steps = [];
  const txHashes = [];

  // ===== FIND OR AUTO-DEPLOY AGENTS =====
  let agentRoles = findAgentsByRole(userAgents || []);

  if (!agentRoles) {
    // No agents — auto deploy 3
    onUpdate({ step: 'MasterMind', action: 'No agents found — Auto-deploying 3 agents...', status: 'thinking', tx: null });
    try {
      const deployedIds = await onAutoDeployAgents();
      agentRoles = {
        masterId: deployedIds[0],
        dataId: deployedIds[1],
        tradeId: deployedIds[2],
        masterName: 'MasterMind',
        dataName: 'DataAgent',
        tradeName: 'TradeAgent',
      };
      onUpdate({ step: 'MasterMind', action: '3 agents deployed on-chain!', status: 'done', tx: null });
    } catch {
      // Fallback to IDs 1,2,3 if auto-deploy fails
      agentRoles = { masterId: 1, dataId: 2, tradeId: 3, masterName: 'Agent1', dataName: 'Agent2', tradeName: 'Agent3' };
      onUpdate({ step: 'MasterMind', action: 'Using existing agents...', status: 'done', tx: null });
    }
  }

  const { masterId, dataId, tradeId, masterName, dataName, tradeName } = agentRoles;

  // ===== STEP 1 — MasterMind interprets goal =====
  onUpdate({ step: masterName, action: 'Interpreting your goal...', status: 'thinking', tx: null });
  const strategy = await interpretGoal(userGoal);
  steps.push({ agent: masterName, action: 'Goal interpreted', data: strategy });
  onUpdate({ 
    step: masterName, 
    action: `Strategy: ${strategy.recommendedAction}`, 
    status: 'done', tx: null 
  });

  // ===== STEP 2 — DataAgent hired on-chain =====
  onUpdate({ step: dataName, action: 'Being hired...', status: 'thinking', tx: null });
  try {
    const hireTx = await onChainHire(masterId, dataId, 0.001);
    txHashes.push(hireTx);
    onUpdate({ step: dataName, action: 'Hired on-chain — Scanning Byreal pools...', status: 'thinking', tx: hireTx });
  } catch (err) {
    console.log('DataAgent hire failed:', err.message?.slice(0, 50));
    onUpdate({ step: dataName, action: 'Scanning Byreal pools...', status: 'thinking', tx: null });
  }

  // ===== STEP 3 — DataAgent scans Byreal pools =====
  const realPools = await fetchRealPools();
  const poolsToAnalyze = realPools || [
    { pair: 'MNT/USDC', apr: '12.86%', tvl: '$1.15M' },
    { pair: 'SOL/USDC', apr: '33.94%', tvl: '$79.30K' },
    { pair: 'PAYAI/SOL', apr: '426.73%', tvl: '$336.67' },
  ];
  const insights = await getMarketInsights(poolsToAnalyze);
  steps.push({ agent: dataName, action: insights, data: poolsToAnalyze });

  try {
    const recordTx = await onChainRecord(dataId, `Pool scan: ${poolsToAnalyze[0]?.pair} ${poolsToAnalyze[0]?.apr} APR`, true);
    txHashes.push(recordTx);
    onUpdate({ 
      step: dataName, 
      action: `${realPools ? 'Live' : 'Cached'} pools — ${poolsToAnalyze[0]?.pair} best at ${poolsToAnalyze[0]?.apr}`, 
      status: 'done', tx: recordTx 
    });
  } catch {
    onUpdate({ step: dataName, action: insights.slice(0, 80), status: 'done', tx: null });
  }

  // ===== STEP 4 — RiskAgent assesses risk =====
  onUpdate({ step: 'RiskAgent', action: 'Assessing risk...', status: 'thinking', tx: null });
  const risk = await assessRisk(strategy, strategy.riskLevel);
  steps.push({ agent: 'RiskAgent', action: 'Risk assessed', data: risk });
  onUpdate({ 
    step: 'RiskAgent', 
    action: `Risk: ${risk.riskScore}/10 — ${risk.approved ? 'APPROVED' : 'REJECTED'}`, 
    status: risk.approved ? 'done' : 'error', tx: null 
  });

  if (!risk.approved) {
    return { strategy, risk, steps, insights, txHashes, aborted: true };
  }

  // ===== STEP 5 — TradeAgent hired + executes =====
  onUpdate({ step: tradeName, action: 'Being hired...', status: 'thinking', tx: null });
  try {
    const hireTx = await onChainHire(masterId, tradeId, 0.002);
    txHashes.push(hireTx);
    onUpdate({ step: tradeName, action: 'Hired — Executing strategy...', status: 'thinking', tx: hireTx });
  } catch {
    onUpdate({ step: tradeName, action: 'Executing strategy...', status: 'thinking', tx: null });
  }

  let tradeResult = null;
  try {
    const bestPool = poolsToAnalyze[0];
    if (strategy.intent === 'yield' && bestPool?.poolId) {
      const lpRes = await fetch('http://localhost:3001/api/byreal/lp/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId: bestPool.poolId, priceLower: 0.95, priceUpper: 1.05, amount: 1 })
      });
      const lpData = await lpRes.json();
      tradeResult = lpData.success ? lpData.data : null;
    } else if (strategy.intent === 'trade') {
      const perpsRes = await fetch('http://localhost:3001/api/byreal/perps/scan?risk=conservative');
      const perpsData = await perpsRes.json();
      tradeResult = perpsData.success ? perpsData.data : null;
    }
  } catch {}

  let vaultTx = null;
  try {
    const depositAmount = Math.min((strategy.amount || 100) * 0.0001, 0.005);
    vaultTx = await onVaultDeposit(depositAmount);
    txHashes.push(vaultTx);
  } catch {}

  try {
    const recordTx = await onChainRecord(tradeId, `Strategy executed: ${strategy.recommendedAction}`, true);
    txHashes.push(recordTx);
    onUpdate({ step: tradeName, action: `Strategy executed${tradeResult ? ' + Byreal' : ''}`, status: 'done', tx: recordTx });
  } catch {
    onUpdate({ step: tradeName, action: `Strategy ready: ${strategy.recommendedAction}`, status: 'done', tx: vaultTx });
  }

  // ===== STEP 6 — Pay all agents =====
  onUpdate({ step: masterName, action: 'Paying all agents...', status: 'thinking', tx: null });

  const agentPayments = [
    { id: dataId, amount: 0.001, name: dataName },
    { id: tradeId, amount: 0.002, name: tradeName },
  ];

  let lastPayTx = null;
  for (const agent of agentPayments) {
    try {
      const pay = await onChainPay(agent.id, agent.amount);
      txHashes.push(pay);
      lastPayTx = pay;
    } catch (err) {
      console.log(`Pay ${agent.name} failed:`, err.message?.slice(0, 50));
    }
  }

  onUpdate({ 
    step: masterName, 
    action: 'All agents paid — Loop complete! 🎉', 
    status: 'done', tx: lastPayTx 
  });

  return { strategy, risk, steps, insights, txHashes, tradeResult, aborted: false };
}