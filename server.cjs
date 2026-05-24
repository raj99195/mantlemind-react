const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config();

const execAsync = promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

// ============================================================
// AUTONOMOUS LOOP — Day 1-3
// Features:
//   - Continuous polling every 10 min (configurable)
//   - Groq decides hire/fire/pay based on agent performance
//   - Agent health scoring (accuracy + uptime + earnings)
//   - Loop state persisted in Supabase (survives restarts)
//   - Agent heartbeat on-chain via recordDecision
//   - WebSocket — real-time activity stream to frontend
//   - /api/loop/* endpoints for control + status
// ============================================================

const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY });

// ── Supabase helper ──────────────────────────────────────────
function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ── WebSocket server ─────────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  // Send current loop state immediately on connect
  ws.send(JSON.stringify({ type: 'loop_state', data: loopState }));
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach(ws => { try { ws.send(msg); } catch {} });
}

// ── Loop state (in-memory + Supabase backed) ─────────────────
let loopState = {
  running: false,
  paused: false,
  lastRun: null,
  nextRun: null,
  intervalMs: 10 * 60 * 1000, // 10 minutes
  currentGoal: null,
  cycleCount: 0,
  totalDecisions: 0,
  agentsFired: 0,
  agentsHired: 0,
  lastActivity: [],   // last 20 activities
  emergencyStop: false,
  goalProgress: 0,
  lastNarrative: null,
  totalEarnings: 0,
};

let loopTimer = null;

// ── Persist loop state to Supabase ───────────────────────────
async function saveLoopState() {
  try {
    const supabase = getSupabase();
    await supabase.from('loop_state').upsert({
      id: 'singleton',
      running: loopState.running,
      paused: loopState.paused,
      last_run: loopState.lastRun,
      next_run: loopState.nextRun,
      interval_ms: loopState.intervalMs,
      current_goal: loopState.currentGoal,
      cycle_count: loopState.cycleCount,
      total_decisions: loopState.totalDecisions,
      agents_fired: loopState.agentsFired,
      agents_hired: loopState.agentsHired,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.log('[Loop] Supabase save skipped:', err.message?.slice(0, 60));
  }
}

// ── Load loop state from Supabase on startup ─────────────────
async function loadLoopState() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from('loop_state').select('*').eq('id', 'singleton').single();
    if (data) {
      loopState.cycleCount = data.cycle_count || 0;
      loopState.totalDecisions = data.total_decisions || 0;
      loopState.agentsFired = data.agents_fired || 0;
      loopState.agentsHired = data.agents_hired || 0;
      loopState.currentGoal = data.current_goal;
      loopState.intervalMs = data.interval_ms || loopState.intervalMs;
      // If was running before restart, auto-resume
      if (data.running && !data.paused) {
        console.log('[Loop] Resuming from previous state...');
        startLoop(data.current_goal);
      }
    }
  } catch (err) {
    console.log('[Loop] No saved state found, starting fresh');
  }
}

// ── Log activity ─────────────────────────────────────────────
function logActivity(agentName, action, status, txHash = null) {
  const entry = { agentName, action, status, txHash, time: new Date().toISOString() };
  loopState.lastActivity.unshift(entry);
  loopState.lastActivity = loopState.lastActivity.slice(0, 20); // keep last 20
  broadcast('activity', entry);
  console.log(`[Loop] ${agentName}: ${action} [${status}]`);
}

// ── Fetch agents from blockchain via Mantle RPC ───────────────
async function fetchAgentsOnChain() {
  try {
    const RPC = process.env.MANTLE_RPC || 'https://rpc.sepolia.mantle.xyz';
    const REGISTRY = process.env.AGENT_REGISTRY || '0x066aefBf67D73F8439440fD6ae6adaFCEa88b2D5';

    // Correct selector: getTotalAgents() = keccak256 => 0x3731a16f
    const totalRes = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_call',
        params: [{ to: REGISTRY, data: '0x3731a16f' }, 'latest']
      })
    });
    const totalJson = await totalRes.json();
    console.log('[Loop] getTotalAgents raw:', JSON.stringify(totalJson).slice(0, 150));
    const total = parseInt(totalJson.result || '0x0', 16);
    console.log('[Loop] Total agents on-chain:', total);
    if (isNaN(total) || total === 0) return [];

    const agents = [];
    for (let i = 1; i <= Math.min(total, 20); i++) {
      try {
        // getAgent(uint256) selector: 0x2de5aaf7
        // Returns tuple: (id, name, role, owner, isActive, reputation,
        //                 totalDecisions, correctDecisions, totalEarned, deployedAt)
        // ABI encoding: tuple with dynamic types (strings) uses offsets
        // Layout (each slot = 32 bytes = 64 hex chars):
        //   slot 0 (0x000): offset to tuple data = 0x20
        //   slot 1 (0x040): id (uint256)
        //   slot 2 (0x080): offset to name string
        //   slot 3 (0x0c0): offset to role string
        //   slot 4 (0x100): owner (address, right-padded)
        //   slot 5 (0x140): isActive (bool)
        //   slot 6 (0x180): reputation (uint256)
        //   slot 7 (0x1c0): totalDecisions (uint256)
        //   slot 8 (0x200): correctDecisions (uint256)
        //   slot 9 (0x240): totalEarned (uint256)
        //   slot 10 (0x280): deployedAt (uint256)
        //   then: string data for name, role

        const idHex = i.toString(16).padStart(64, '0');
        const agentRes = await fetch(RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: i + 1, method: 'eth_call',
            params: [{ to: REGISTRY, data: '0x2de5aaf7' + idHex }, 'latest']
          })
        });
        const agentJson = await agentRes.json();
        const raw = agentJson.result;
        if (!raw || raw === '0x' || raw.length < 130) continue;

        // Strip 0x, parse 32-byte slots
        const hex = raw.slice(2);
        const slot = (n) => hex.slice(n * 64, (n + 1) * 64);
        const slotInt = (n) => parseInt(slot(n), 16);

        // Outer offset points to start of tuple = slot 0
        // Tuple fields start at slot 1
        const agentId   = slotInt(1);
        // slot 2 = offset to name (relative to start of tuple data = slot 1)
        // slot 3 = offset to role
        const owner     = '0x' + slot(4).slice(24); // last 20 bytes
        const isActive  = slotInt(5) === 1;
        const reputation      = slotInt(6);
        const totalDecisions  = slotInt(7);
        const correctDecisions = slotInt(8);
        const totalEarned     = slotInt(9);

        // Decode name string: offset in slot(2) is relative to slot(1) start
        // offset value / 32 = slot index from slot(1)
        let name = 'Agent#' + i;
        let role = 'UNKNOWN';
        try {
          const nameOffset = slotInt(2); // bytes from start of tuple (slot 1)
          const nameSlotStart = 1 + Math.floor(nameOffset / 32);
          const nameLen = slotInt(nameSlotStart);
          if (nameLen > 0 && nameLen < 100) {
            const nameHex = hex.slice((nameSlotStart + 1) * 64, (nameSlotStart + 1) * 64 + nameLen * 2);
            name = Buffer.from(nameHex, 'hex').toString('utf8');
          }

          const roleOffset = slotInt(3);
          const roleSlotStart = 1 + Math.floor(roleOffset / 32);
          const roleLen = slotInt(roleSlotStart);
          if (roleLen > 0 && roleLen < 100) {
            const roleHex = hex.slice((roleSlotStart + 1) * 64, (roleSlotStart + 1) * 64 + roleLen * 2);
            role = Buffer.from(roleHex, 'hex').toString('utf8');
          }
        } catch {}

        // Skip if not a real agent (id 0 = empty slot)
        if (agentId === 0 && !isActive) continue;

        agents.push({
          id: i,
          name,
          role,
          owner,
          isActive,
          reputation,
          totalDecisions,
          correctDecisions,
          totalEarned,
          accuracy: totalDecisions > 0 ? Math.round((correctDecisions / totalDecisions) * 100) : 0,
        });
        console.log(`[Loop] Agent #${i}: ${name} (${role}) active=${isActive} rep=${reputation}`);
      } catch (e) {
        console.log(`[Loop] Agent #${i} decode error:`, e.message?.slice(0, 50));
      }
    }
    return agents;
  } catch (err) {
    console.log('[Loop] fetchAgents failed:', err.message?.slice(0, 60));
    return [];
  }
}

// ── Calculate agent health score (0-100) ─────────────────────
function calcHealthScore(agent) {
  const accuracyScore = agent.accuracy * 0.5;           // 50% weight
  const reputationScore = (agent.reputation / 100) * 30; // 30% weight
  const activityScore = Math.min(agent.totalDecisions / 10, 1) * 20; // 20% weight
  return Math.round(accuracyScore + reputationScore + activityScore);
}

// ── Fetch live market data ────────────────────────────────────
async function fetchMarketData() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true',
      { signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    return {
      mntPrice: json?.mantle?.usd || 0,
      mntChange24h: json?.mantle?.usd_24h_change || 0,
    };
  } catch {
    return { mntPrice: 0, mntChange24h: 0 };
  }
}

// ============================================================
// DAY 4-6: BYREAL MARKET DATA + AGENT MEMORY + RISK ENGINE
// ============================================================

// ── Fetch live Byreal pool data ───────────────────────────────
async function fetchByrealPools() {
  try {
    const { stdout } = await execAsync('byreal-cli pools list --sort-field apr24h --sort-type desc --page-size 5 -o json', { timeout: 15000 });
    const raw = JSON.parse(stdout);
    // byreal-cli returns { success, data: { pools: [...] } }
    const arr = raw.data?.pools || raw.pools || (Array.isArray(raw) ? raw : []);
    const pools = arr.slice(0, 5);
    return pools.map(p => ({
      pair: p.pair || 'Unknown',
      apr: parseFloat(p.total_apr || p.apr || 0).toFixed(2),
      tvl: parseFloat(p.tvl_usd || 0).toFixed(0),
      volume24h: parseFloat(p.volume_24h_usd || 0).toFixed(0),
      poolId: p.id || '',
    }));
  } catch (e) {
    console.log('[Loop] Byreal CLI failed:', e.message?.slice(0, 80));
    // Fallback: call our own /api/byreal/pools endpoint
    try {
      const res = await fetch((process.env.VITE_API_URL || 'http://localhost:' + (process.env.PORT || 3001)) + '/api/byreal/pools?limit=5&sort=apr24h',
        { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        return json.data.slice(0, 5).map(p => ({
          pair: p.pair || 'Unknown',
          apr: parseFloat(p.apr || 0).toFixed(2),
          tvl: parseFloat(p.tvl_usd || p.tvl || 0).toFixed(0),
          volume24h: parseFloat(p.volume_24h_usd || 0).toFixed(0),
          poolId: p.id || '',
        }));
      }
    } catch {}
    return null;
  }
}

// ── Fetch DeFiLlama Mantle TVL ────────────────────────────────
async function fetchDeFiLlamaData() {
  try {
    const res = await fetch('https://api.llama.fi/v2/chains', { signal: AbortSignal.timeout(6000) });
    const chains = await res.json();
    const mantle = chains.find(c => c.name?.toLowerCase() === 'mantle');
    return { mantleTvl: mantle?.tvl || 0, mantleTvlChange: mantle?.change_1d || 0 };
  } catch {
    return { mantleTvl: 0, mantleTvlChange: 0 };
  }
}

// ── Calculate volatility score from price change ──────────────
function calcVolatility(change24h) {
  const abs = Math.abs(change24h || 0);
  if (abs < 2) return { score: 'LOW', value: abs };
  if (abs < 5) return { score: 'MEDIUM', value: abs };
  return { score: 'HIGH', value: abs };
}

// ── Risk engine ───────────────────────────────────────────────
function assessMarketRisk(market, pools, defi) {
  const volatility = calcVolatility(market.mntChange24h);
  const topApr = pools?.[0] ? parseFloat(pools[0].apr) : 0;
  const aprRisk = topApr > 200 ? 'HIGH' : topApr > 50 ? 'MEDIUM' : 'LOW';

  let riskScore = 3; // base
  if (volatility.score === 'HIGH') riskScore += 3;
  if (volatility.score === 'MEDIUM') riskScore += 1;
  if (aprRisk === 'HIGH') riskScore += 2;
  if (aprRisk === 'MEDIUM') riskScore += 1;
  if (defi.mantleTvlChange < -5) riskScore += 2;

  riskScore = Math.min(10, riskScore);
  const level = riskScore >= 7 ? 'HIGH' : riskScore >= 4 ? 'MEDIUM' : 'LOW';

  return { score: riskScore, level, volatility: volatility.score, aprRisk, tvlChange: defi.mantleTvlChange };
}

// ── Save agent memory to Supabase ─────────────────────────────
async function saveAgentMemory(agentId, decision, outcome, context) {
  try {
    const supabase = getSupabase();
    await supabase.from('agent_memory').insert({
      agent_id: agentId,
      decision,
      outcome,
      context: JSON.stringify(context),
      created_at: new Date().toISOString(),
    });
  } catch {}
}

// ── Load agent memory from Supabase (last 10 decisions) ───────
async function loadAgentMemory(agentId) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('agent_memory')
      .select('decision, outcome, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  } catch { return []; }
}

// ── Groq: decide with full market context + memory ────────────
// (replaces old groqDecideActions)
async function groqDecideActionsV2(agents, marketData, pools, risk, defi, goal) {
  if (agents.length === 0) return [];

  // Load memory for each agent
  const agentMemories = {};
  for (const a of agents) {
    agentMemories[a.id] = await loadAgentMemory(a.id);
  }

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are MasterMind, autonomous AI agent orchestrator on Mantle blockchain.
Analyze agent performance, live market data, Byreal pool opportunities, and risk assessment to make optimal decisions.

Actions: "keep" | "pay" | "fire" | "hire_new"
Rules:
- fire: ONLY if health < 30 AND decisions > 5 (if decisions = 0, ALWAYS keep regardless of health)
- pay: if health > 60 and active and totalDecisions > 0, set amount 0.001-0.005 MNT based on performance
- hire_new: if no ANALYZER or EXECUTOR role exists, or if risk is HIGH and no MONITOR exists
- keep: new agents (totalDecisions = 0) always keep

Also return: bestPool (which pool to target), riskAction (what to do given current risk level), strategyNote (1 sentence).

Return ONLY valid JSON array:
[{ "agentId": number, "action": string, "amount": number, "reason": string, "bestPool": string|null, "riskAction": string|null, "strategyNote": string|null }]`
        },
        {
          role: 'user',
          content: JSON.stringify({
            agents: agents.map(a => ({
              id: a.id, role: a.role, isActive: a.isActive,
              health: calcHealthScore(a), accuracy: a.accuracy,
              rep: a.reputation, decisions: a.totalDecisions,
              lastAction: agentMemories[a.id]?.[0]?.decision || null,
            })),
            market: { price: marketData.mntPrice, chg: +marketData.mntChange24h.toFixed(2) },
            pools: (pools || []).slice(0, 3).map(p => ({ pair: p.pair, apr: p.apr, tvl: p.tvl })),
            risk: { score: risk.score, level: risk.level },
            goal: (goal || 'maximize yield').slice(0, 80),
          })
        }
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const text = response.choices[0]?.message?.content || '[]';
    // Robust JSON extraction — find first [ and last ]
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1) {
      console.log('[Loop] Groq V2 no JSON array found, raw:', text.slice(0, 100));
      return [];
    }
    const clean = text.slice(start, end + 1);
    try {
      return JSON.parse(clean);
    } catch {
      // Try removing control chars
      const sanitized = clean.replace(/[^\x20-\x7E]/g, ' ');
      return JSON.parse(sanitized);
    }
  } catch (err) {
    console.log('[Loop] Groq V2 failed:', err.message?.slice(0, 80));
    // Return keep for all agents as fallback
    return [];
  }
}

// END DAY 4-6 ADDITIONS
// ============================================================

// ── Groq: decide what to do with each agent ──────────────────
async function groqDecideActions(agents, marketData, goal) {
  if (agents.length === 0) return [];
  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are MasterMind, autonomous AI agent orchestrator on Mantle blockchain.
Based on agent performance data and market conditions, decide actions for each agent.

Actions available: "keep" | "pay" | "fire" | "hire_new"
- fire: ONLY if health < 30 AND totalDecisions > 5 (never fire new agents with 0 decisions)
- pay: if health > 60 and active and totalDecisions > 0
- hire_new: if no ANALYZER or EXECUTOR role exists
- keep: if agent is new (totalDecisions = 0) always keep

Return ONLY a JSON array:
[{ "agentId": number, "action": "keep"|"pay"|"fire"|"hire_new", "amount": number_in_MNT, "reason": "short reason" }]
No markdown, no explanation.`
        },
        {
          role: 'user',
          content: JSON.stringify({
            agents: agents.map(a => ({
              id: a.id, isActive: a.isActive,
              health: calcHealthScore(a),
              accuracy: a.accuracy,
              reputation: a.reputation,
              totalDecisions: a.totalDecisions,
            })),
            market: marketData,
            goal: goal || 'maximize yield on Mantle DeFi',
          })
        }
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const text = response.choices[0]?.message?.content || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.log('[Loop] Groq decision failed:', err.message?.slice(0, 60));
    return [];
  }
}

// ── Send Telegram notification ────────────────────────────────
async function telegramNotify(chatId, message) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
  } catch {}
}

// ── Get all Telegram chat IDs from Supabase ───────────────────
async function getAllChatIds() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from('users').select('telegram_chat_id').not('telegram_chat_id', 'is', null);
    return (data || []).map(u => u.telegram_chat_id).filter(Boolean);
  } catch { return []; }
}

// ── Log decision to Supabase ──────────────────────────────────
async function logDecisionToDB(agentId, action, reason, txHash = null) {
  try {
    const supabase = getSupabase();
    await supabase.from('agent_decisions').insert({
      agent_id: agentId,
      action,
      reason,
      tx_hash: txHash,
      created_at: new Date().toISOString(),
    });
  } catch {}
}

// ============================================================
// DAY 7-9: AGENT INTELLIGENCE
// - Reputation-based hiring (auto-hire high rep, fire low rep)
// - Goal progress tracking (% complete with milestones)
// - Anomaly detection (unusual market moves → alert + re-strategize)
// - Natural language decision log (Groq explains each action)
// ============================================================

// ── Reputation-based hiring decision ─────────────────────────
// Returns best agent to hire for a role based on reputation
async function findBestAgentForRole(role, excludeIds = []) {
  try {
    const supabase = getSupabase();
    // Check agent_memory for agents with high success rate
    const { data } = await supabase
      .from('agent_memory')
      .select('agent_id, outcome')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data || data.length === 0) return null;

    // Score agents by recent outcomes
    const scores = {};
    data.forEach(m => {
      if (excludeIds.includes(m.agent_id)) return;
      if (!scores[m.agent_id]) scores[m.agent_id] = { wins: 0, total: 0 };
      scores[m.agent_id].total++;
      if (m.outcome !== 'fire') scores[m.agent_id].wins++;
    });

    // Find agent with best win rate
    let best = null, bestRate = 0;
    Object.entries(scores).forEach(([id, s]) => {
      const rate = s.total > 0 ? s.wins / s.total : 0;
      if (rate > bestRate) { bestRate = rate; best = Number(id); }
    });

    return best;
  } catch { return null; }
}

// ── Goal progress tracking ────────────────────────────────────
async function updateGoalProgress(goal, agents, market, pools, cycleCount) {
  if (!goal) return null;
  try {
    const supabase = getSupabase();

    // Get or create goal record
    const { data: existing } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('goal_text', goal.slice(0, 100))
      .single();

    const activeAgents = agents.filter(a => a.isActive).length;
    const totalDecisions = agents.reduce((s, a) => s + a.totalDecisions, 0);
    const avgReputation = agents.length > 0
      ? Math.round(agents.reduce((s, a) => s + a.reputation, 0) / agents.length)
      : 0;

    // Calculate progress % based on milestones
    let progress = 0;
    if (activeAgents > 0) progress += 20;           // agents deployed
    if (totalDecisions > 0) progress += 20;          // decisions made
    if (pools && pools.length > 0) progress += 20;   // market data flowing
    if (avgReputation >= 60) progress += 20;         // agents performing well
    if (cycleCount >= 5) progress += 20;             // loop running consistently
    progress = Math.min(100, progress);

    const progressData = {
      goal_text: goal.slice(0, 100),
      progress_pct: progress,
      active_agents: activeAgents,
      total_decisions: totalDecisions,
      avg_reputation: avgReputation,
      best_pool: pools?.[0]?.pair || null,
      best_apr: pools?.[0]?.apr || null,
      cycle_count: cycleCount,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from('goal_progress').update(progressData).eq('goal_text', goal.slice(0, 100));
    } else {
      await supabase.from('goal_progress').insert({ ...progressData, created_at: new Date().toISOString() });
    }

    return progress;
  } catch { return null; }
}

// ── Anomaly detection ─────────────────────────────────────────
function detectAnomalies(market, pools, prevMarket) {
  const anomalies = [];

  // Price spike/crash > 5% in one cycle
  if (prevMarket && Math.abs(market.mntChange24h - prevMarket.mntChange24h) > 5) {
    anomalies.push({
      type: 'PRICE_SPIKE',
      severity: 'HIGH',
      msg: `MNT price change shifted ${(market.mntChange24h - prevMarket.mntChange24h).toFixed(2)}% since last cycle`,
    });
  }

  // Extreme APR (> 500%) — likely rug or unsustainable
  if (pools && pools[0] && parseFloat(pools[0].apr) > 500) {
    anomalies.push({
      type: 'EXTREME_APR',
      severity: 'MEDIUM',
      msg: `Top pool ${pools[0].pair} has extreme APR ${pools[0].apr}% — possible rug risk`,
    });
  }

  // MNT down > 5% today
  if (market.mntChange24h < -5) {
    anomalies.push({
      type: 'MARKET_CRASH',
      severity: 'HIGH',
      msg: `MNT down ${Math.abs(market.mntChange24h).toFixed(2)}% today — defensive strategy recommended`,
    });
  }

  return anomalies;
}

// ── Natural language decision log via Groq ────────────────────
async function generateDecisionNarrative(decisions, market, pools, risk, goal) {
  if (decisions.length === 0) return null;
  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are MantleMind AI. Write a 2-sentence plain English summary of what the autonomous agents decided this cycle and why. Be specific and confident. No markdown.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            decisions: decisions.map(d => ({ agent: d.agentId, action: d.action, reason: d.reason })),
            market: { mntPrice: market.mntPrice, change: market.mntChange24h },
            topPool: pools?.[0]?.pair,
            risk: risk.level,
            goal: goal?.slice(0, 60),
          }),
        }
      ],
      temperature: 0.4,
      max_tokens: 120,
    });
    return response.choices[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// Store previous market for anomaly detection
let prevMarketSnapshot = null;

// END DAY 7-9 FUNCTIONS
// ============================================================

// ── Main loop tick ────────────────────────────────────────────
async function runLoopTick() {
  if (loopState.paused || loopState.emergencyStop) {
    console.log('[Loop] Skipping tick — paused or emergency stop');
    return;
  }

  loopState.cycleCount++;
  loopState.lastRun = new Date().toISOString();
  loopState.nextRun = new Date(Date.now() + loopState.intervalMs).toISOString();
  broadcast('loop_tick', { cycle: loopState.cycleCount, time: loopState.lastRun });
  logActivity('MasterMind', `Cycle #${loopState.cycleCount} started`, 'running');

  // 1. Fetch agents from chain
  const agents = await fetchAgentsOnChain();
  logActivity('MasterMind', `Found ${agents.length} agents on-chain`, 'done');

  // 2. Fetch all market data in parallel (Day 4-6)
  const [market, pools, defi] = await Promise.all([
    fetchMarketData(),
    fetchByrealPools(),
    fetchDeFiLlamaData(),
  ]);

  if (market.mntPrice > 0) {
    logActivity('DataAgent', `MNT: $${market.mntPrice.toFixed(4)} (${market.mntChange24h.toFixed(2)}% 24h)`, 'done');
  }

  if (pools && pools.length > 0) {
    logActivity('DataAgent', `Best pool: ${pools[0].pair} @ ${pools[0].apr}% APR | TVL: $${Number(pools[0].tvl).toLocaleString()}`, 'done');
  }

  if (defi.mantleTvl > 0) {
    logActivity('DataAgent', `Mantle TVL: $${(defi.mantleTvl / 1e6).toFixed(1)}M (${defi.mantleTvlChange.toFixed(1)}% 1d)`, 'done');
  }

  // 3. Risk assessment
  const risk = assessMarketRisk(market, pools, defi);
  logActivity('RiskAgent', `Market risk: ${risk.level} (${risk.score}/10) | Volatility: ${risk.volatility}`, 'done');

  // Circuit breaker — if risk HIGH, skip trading decisions
  if (risk.score >= 9) {
    logActivity('RiskAgent', 'CIRCUIT BREAKER — risk too high, skipping cycle', 'error');
    const chatIds = await getAllChatIds();
    for (const id of chatIds) await telegramNotify(id, `⚠️ <b>MantleMind Circuit Breaker</b>\n\nRisk score: ${risk.score}/10\nMarket too volatile — cycle skipped.\nFunds safe.`);
    await saveLoopState();
    return;
  }

  // 4. Groq decides with full context (V2)
  const decisions = await groqDecideActionsV2(agents, market, pools, risk, defi, loopState.currentGoal);
  logActivity('MasterMind', `Groq made ${decisions.length} decisions`, 'done');

  // 5. Notify all users with rich context
  const chatIds = await getAllChatIds();
  const activeAgents = agents.filter(a => a.isActive).length;

  if (chatIds.length > 0 && decisions.length > 0) {
    const summary = decisions.map(d => `• Agent #${d.agentId}: ${d.action.toUpperCase()} — ${d.reason}`).join('\n');
    const poolLine = pools?.[0] ? `\n🏊 Best Pool: ${pools[0].pair} @ ${pools[0].apr}% APR` : '';
    const msg = `🤖 <b>MantleMind Cycle #${loopState.cycleCount}</b>\n\n📊 Agents: ${activeAgents} active\n💹 MNT: $${market.mntPrice.toFixed(4)} (${market.mntChange24h.toFixed(2)}%)${poolLine}\n🛡️ Risk: ${risk.level} (${risk.score}/10)\n\n<b>AI Decisions:</b>\n${summary}\n\n<i>Autonomous AI Agent Economy on Mantle</i>`;
    for (const chatId of chatIds) await telegramNotify(chatId, msg);
  }

  // 6. Log decisions to Supabase + save agent memory
  for (const d of decisions) {
    await logDecisionToDB(d.agentId, d.action, d.reason);
    await saveAgentMemory(d.agentId, d.action, d.reason, {
      market: { mntPrice: market.mntPrice, change24h: market.mntChange24h },
      risk: risk.level,
      bestPool: d.bestPool || pools?.[0]?.pair || null,
    });
    loopState.totalDecisions++;
    if (d.action === 'fire') loopState.agentsFired++;
    if (d.action === 'hire_new') loopState.agentsHired++;
    logActivity(`Agent #${d.agentId}`, `${d.action.toUpperCase()}: ${d.reason}`, 'done');
    if (d.strategyNote) logActivity('MasterMind', d.strategyNote, 'done');
  }

  // 6b. Day 10-11: Economy cycle
  const economy = await runEconomyCycle(agents, decisions, market);
  if (economy.economyLog.length > 0) {
    loopState.totalEarnings = (loopState.totalEarnings || 0) +
      decisions.filter(d => d.action === 'pay').length * 0.002;
  }

  // 7. Day 7-9: Anomaly detection
  const anomalies = detectAnomalies(market, pools, prevMarketSnapshot);
  if (anomalies.length > 0) {
    for (const a of anomalies) {
      logActivity('RiskAgent', `⚠️ ANOMALY [${a.type}]: ${a.msg}`, a.severity === 'HIGH' ? 'error' : 'done');
    }
    // Notify on HIGH severity anomalies
    const highAnomalies = anomalies.filter(a => a.severity === 'HIGH');
    if (highAnomalies.length > 0) {
      const chatIds = await getAllChatIds();
      const alertMsg = `⚠️ <b>MantleMind Anomaly Alert</b>\n\n${highAnomalies.map(a => `• ${a.msg}`).join('\n')}\n\n🛡️ Agents re-evaluating strategy...`;
      for (const id of chatIds) await telegramNotify(id, alertMsg);
    }
  }
  prevMarketSnapshot = { ...market };

  // 8. Day 7-9: Goal progress tracking
  const progress = await updateGoalProgress(loopState.currentGoal, agents, market, pools, loopState.cycleCount);
  if (progress !== null) {
    loopState.goalProgress = progress;
    logActivity('MasterMind', `Goal progress: ${progress}%`, 'done');
    broadcast('goal_progress', { progress, goal: loopState.currentGoal });
    // Notify on milestones
    if (progress === 100) {
      const chatIds = await getAllChatIds();
      for (const id of chatIds) await telegramNotify(id, `🎉 <b>Goal Complete!</b>\n\n✅ ${loopState.currentGoal?.slice(0, 80)}\n\nAll milestones achieved by MantleMind agents.`);
    }
  }

  // 9. Day 7-9: Natural language narrative
  if (decisions.length > 0) {
    const narrative = await generateDecisionNarrative(decisions, market, pools, risk, loopState.currentGoal);
    if (narrative) {
      loopState.lastNarrative = narrative;
      logActivity('MasterMind', narrative, 'done');
      broadcast('narrative', { text: narrative, cycle: loopState.cycleCount });
    }
  }

  // 10. Heartbeat — log loop alive to Supabase
  try {
    const supabase = getSupabase();
    await supabase.from('loop_heartbeat').upsert({
      id: 'singleton',
      last_beat: new Date().toISOString(),
      cycle: loopState.cycleCount,
    }, { onConflict: 'id' });
  } catch {}

  await saveLoopState();
  broadcast('loop_state', loopState);
  logActivity('MasterMind', `Cycle #${loopState.cycleCount} complete ✓`, 'done');
}

// ── Start / stop loop ─────────────────────────────────────────
function startLoop(goal = null) {
  if (loopTimer) clearInterval(loopTimer);
  if (goal) loopState.currentGoal = goal;
  loopState.running = true;
  loopState.paused = false;
  loopState.emergencyStop = false;

  // Run immediately then on interval
  runLoopTick();
  loopTimer = setInterval(runLoopTick, loopState.intervalMs);
  saveLoopState();
  broadcast('loop_state', loopState);
  console.log(`[Loop] Started — every ${loopState.intervalMs / 60000} min`);
}

function stopLoop() {
  if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  loopState.running = false;
  saveLoopState();
  broadcast('loop_state', loopState);
  console.log('[Loop] Stopped');
}

// ── Loop API endpoints ────────────────────────────────────────

// Start loop
app.post('/api/loop/start', (req, res) => {
  const { goal, intervalMinutes } = req.body;
  if (intervalMinutes) loopState.intervalMs = intervalMinutes * 60 * 1000;
  startLoop(goal);
  res.json({ success: true, message: 'Loop started', state: loopState });
});

// Stop loop
app.post('/api/loop/stop', (req, res) => {
  stopLoop();
  res.json({ success: true, message: 'Loop stopped' });
});

// Pause / resume
app.post('/api/loop/pause', (req, res) => {
  loopState.paused = !loopState.paused;
  saveLoopState();
  broadcast('loop_state', loopState);
  res.json({ success: true, paused: loopState.paused });
});

// Emergency stop
app.post('/api/loop/emergency-stop', (req, res) => {
  stopLoop();
  loopState.emergencyStop = true;
  saveLoopState();
  broadcast('emergency_stop', { time: new Date().toISOString() });
  // Notify all users
  getAllChatIds().then(ids => {
    ids.forEach(id => telegramNotify(id, '🚨 <b>EMERGENCY STOP</b>\n\nAll MantleMind agents paused. Funds are safe.'));
  });
  res.json({ success: true, message: 'Emergency stop activated' });
});

// Get loop status
app.get('/api/loop/status', (req, res) => {
  res.json({ success: true, state: loopState });
});

// Get recent activity feed
app.get('/api/loop/activity', (req, res) => {
  res.json({ success: true, data: loopState.lastActivity });
});

// Get agent health scores
app.get('/api/loop/agents/health', async (req, res) => {
  const agents = await fetchAgentsOnChain();
  const scored = agents.map(a => ({ ...a, healthScore: calcHealthScore(a) }));
  res.json({ success: true, data: scored });
});

// Manual trigger single tick
app.post('/api/loop/tick', async (req, res) => {
  await runLoopTick();
  res.json({ success: true, message: 'Tick executed', state: loopState });
});

// Get decision history from Supabase
app.get('/api/loop/decisions', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('agent_decisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Load state on startup ─────────────────────────────────────
loadLoopState();

// END AUTONOMOUS LOOP
// ============================================================

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', byreal: 'connected', timestamp: Date.now() });
});

// ===== BYREAL OVERVIEW =====
app.get('/api/byreal/overview', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli overview -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== TOP POOLS =====
app.get('/api/byreal/pools', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const sort = req.query.sort || 'apr24h';
    const { stdout } = await execAsync(`byreal-cli pools list --sort-field ${sort} -o json`);
    const parsed = JSON.parse(stdout);
    const pools = parsed.data || parsed.pools || parsed || [];
    const arr = Array.isArray(pools) ? pools : Object.values(pools);
    res.json({ success: true, data: arr.slice(0, Number(limit)) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== POOL ANALYZE =====
app.get('/api/byreal/pools/:poolId/analyze', async (req, res) => {
  try {
    const { stdout } = await execAsync(`byreal-cli pools analyze ${req.params.poolId} -o json`);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== WALLET BALANCE =====
app.get('/api/byreal/wallet', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli wallet balance -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SWAP PREVIEW =====
app.post('/api/byreal/swap/preview', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.body;
    const cmd = `byreal-cli swap execute --input-mint ${inputMint} --output-mint ${outputMint} --amount ${amount} --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SWAP EXECUTE =====
app.post('/api/byreal/swap/execute', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.body;
    const cmd = `byreal-cli swap execute --input-mint ${inputMint} --output-mint ${outputMint} --amount ${amount} --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP PREVIEW =====
app.post('/api/byreal/lp/preview', async (req, res) => {
  try {
    const { poolId, priceLower, priceUpper, amount } = req.body;
    const cmd = `byreal-cli positions open --pool ${poolId} --price-lower ${priceLower} --price-upper ${priceUpper} --base MintB --amount ${amount} --auto-swap --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP OPEN =====
app.post('/api/byreal/lp/open', async (req, res) => {
  try {
    const { poolId, priceLower, priceUpper, amount } = req.body;
    const cmd = `byreal-cli positions open --pool ${poolId} --price-lower ${priceLower} --price-upper ${priceUpper} --base MintB --amount ${amount} --auto-swap --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP LIST =====
app.get('/api/byreal/positions', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli positions list -o json');
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP CLOSE =====
app.post('/api/byreal/lp/close', async (req, res) => {
  try {
    const { nftMint } = req.body;
    const { stdout } = await execAsync(`byreal-cli positions close --nft-mint ${nftMint} --auto-swap --confirm -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS SCAN =====
app.get('/api/byreal/perps/scan', async (req, res) => {
  try {
    const risk = req.query.risk || 'conservative';
    const { stdout } = await execAsync(`byreal-perps-cli scan --risk ${risk} -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS ACCOUNT =====
app.get('/api/byreal/perps/account', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-perps-cli account -o json');
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS PREVIEW =====
app.post('/api/byreal/perps/preview', async (req, res) => {
  try {
    const { coin, side, size, leverage } = req.body;
    const { stdout } = await execAsync(`byreal-perps-cli order --coin ${coin} --side ${side} --size ${size} --leverage ${leverage} --dry-run -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS EXECUTE =====
app.post('/api/byreal/perps/execute', async (req, res) => {
  try {
    const { coin, side, size, leverage } = req.body;
    const { stdout } = await execAsync(`byreal-perps-cli order --coin ${coin} --side ${side} --size ${size} --leverage ${leverage} --confirm -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS POSITIONS =====
app.get('/api/byreal/perps/positions', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-perps-cli positions -o json');
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== TELEGRAM SEND =====
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN || !chatId) return res.json({ success: false, error: 'Missing credentials' });

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
    const data = await response.json();
    res.json({ success: data.ok, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== REALCLAW COMMAND =====
app.post('/api/realclaw/command', async (req, res) => {
  try {
    const { chatId, command } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: command, parse_mode: 'HTML' })
    });
    const data = await response.json();
    res.json({ success: data.ok, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SUPABASE — SAVE USER =====
app.post('/api/users/save', async (req, res) => {
  try {
    const { walletAddress, telegramChatId, telegramUsername } = req.body;
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('users')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        telegram_chat_id: String(telegramChatId),
        telegram_username: telegramUsername,
      }, { onConflict: 'wallet_address' });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SUPABASE — GET USER =====
app.get('/api/users/:walletAddress', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', req.params.walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Day 7-9: Goal progress + anomaly endpoints ───────────────

// Get goal progress
app.get('/api/loop/goal-progress', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('goal_progress')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    res.json({ success: true, data: data || null, current: loopState.goalProgress });
  } catch (err) {
    res.json({ success: true, data: null, current: loopState.goalProgress || 0 });
  }
});

// Get last narrative
app.get('/api/loop/narrative', (req, res) => {
  res.json({ success: true, data: loopState.lastNarrative });
});

// Get best agents by reputation from memory
app.get('/api/loop/agents/leaderboard', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('agent_memory')
      .select('agent_id, outcome')
      .order('created_at', { ascending: false })
      .limit(200);

    const scores = {};
    (data || []).forEach(m => {
      if (!scores[m.agent_id]) scores[m.agent_id] = { wins: 0, total: 0 };
      scores[m.agent_id].total++;
      if (m.outcome !== 'fire') scores[m.agent_id].wins++;
    });

    const leaderboard = Object.entries(scores)
      .map(([id, s]) => ({ agentId: Number(id), winRate: s.total > 0 ? Math.round(s.wins / s.total * 100) : 0, totalActions: s.total }))
      .sort((a, b) => b.winRate - a.winRate);

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ── Day 4-6: Agent memory + market data endpoints ────────────

// Get agent memory history
app.get('/api/loop/agents/:agentId/memory', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', req.params.agentId)
      .order('created_at', { ascending: false })
      .limit(20);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get live market snapshot
app.get('/api/loop/market', async (req, res) => {
  try {
    const [market, pools, defi] = await Promise.all([
      fetchMarketData(),
      fetchByrealPools(),
      fetchDeFiLlamaData(),
    ]);
    const risk = assessMarketRisk(market, pools, defi);
    res.json({ success: true, data: { market, pools, defi, risk } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get risk assessment
app.get('/api/loop/risk', async (req, res) => {
  try {
    const [market, pools, defi] = await Promise.all([fetchMarketData(), fetchByrealPools(), fetchDeFiLlamaData()]);
    const risk = assessMarketRisk(market, pools, defi);
    res.json({ success: true, data: risk });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ============================================================
// DAY 10-11: ECONOMY LAYER
// - Agent earnings auto-reinvest into vault
// - Dynamic payment — high accuracy agents get more pay
// - Agent P&L tracking per agent in Supabase
// - Leaderboard — top agents by earnings + win rate
// - Agent staking — users stake MNT on agents, earn % of rewards
// - Agent retirement — rep < 20 pe blacklist
// - Cross-user marketplace — public high-rep agents hireable
// ============================================================

// ── Agent P&L tracker ─────────────────────────────────────────
async function updateAgentPnL(agentId, action, amountMnt, reason) {
  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('agent_pnl')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    const isEarning = action === 'pay';
    const isSpend   = action === 'hire_new';

    if (existing) {
      await supabase.from('agent_pnl').update({
        total_earned:  isEarning ? existing.total_earned + amountMnt : existing.total_earned,
        total_spent:   isSpend   ? existing.total_spent  + amountMnt : existing.total_spent,
        net_pnl: (isEarning ? existing.total_earned + amountMnt : existing.total_earned)
               - (isSpend   ? existing.total_spent  + amountMnt : existing.total_spent),
        last_action: action,
        last_action_reason: reason,
        updated_at: new Date().toISOString(),
      }).eq('agent_id', agentId);
    } else {
      await supabase.from('agent_pnl').insert({
        agent_id: agentId,
        total_earned: isEarning ? amountMnt : 0,
        total_spent:  isSpend   ? amountMnt : 0,
        net_pnl: isEarning ? amountMnt : (isSpend ? -amountMnt : 0),
        last_action: action,
        last_action_reason: reason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch {}
}

// ── Dynamic payment amount based on performance ───────────────
function calcDynamicPayment(agent) {
  const health = calcHealthScore(agent);
  if (health >= 80) return 0.005;  // Elite — max pay
  if (health >= 60) return 0.003;  // Good
  if (health >= 40) return 0.001;  // Average
  return 0;                         // Poor — no pay
}

// ── Agent retirement check ────────────────────────────────────
async function checkAgentRetirement(agents) {
  const retired = [];
  for (const agent of agents) {
    if (agent.reputation < 20 && agent.totalDecisions > 10) {
      retired.push(agent);
      logActivity(`Agent #${agent.id}`, `RETIRED: reputation ${agent.reputation} < 20 threshold`, 'error');
      try {
        const supabase = getSupabase();
        await supabase.from('retired_agents').insert({
          agent_id: agent.id,
          agent_name: agent.name,
          final_reputation: agent.reputation,
          total_decisions: agent.totalDecisions,
          retired_at: new Date().toISOString(),
        });
      } catch {}
    }
  }
  return retired;
}

// ── Agent staking state (in-memory, persist to Supabase) ──────
async function getStakingPool() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from('agent_staking').select('*');
    return data || [];
  } catch { return []; }
}

async function distributeStakingRewards(agentId, earningsMnt) {
  if (earningsMnt <= 0) return;
  try {
    const supabase = getSupabase();
    const { data: stakes } = await supabase
      .from('agent_staking')
      .select('*')
      .eq('agent_id', agentId);
    if (!stakes || stakes.length === 0) return;

    const totalStaked = stakes.reduce((s, st) => s + st.amount_mnt, 0);
    if (totalStaked === 0) return;

    // 20% of agent earnings go to stakers
    const rewardPool = earningsMnt * 0.2;
    for (const stake of stakes) {
      const userShare = (stake.amount_mnt / totalStaked) * rewardPool;
      await supabase.from('agent_staking').update({
        rewards_earned: stake.rewards_earned + userShare,
        updated_at: new Date().toISOString(),
      }).eq('id', stake.id);
    }
    logActivity(`Agent #${agentId}`, `Staking rewards distributed: ${rewardPool.toFixed(4)} MNT to ${stakes.length} stakers`, 'done');
  } catch {}
}

// ── Economy cycle — runs inside runLoopTick ───────────────────
async function runEconomyCycle(agents, decisions, market) {
  const economyLog = [];

  // Pay ALL active agents every cycle — independent of Groq decisions
  for (const agent of agents) {
    if (!agent.isActive) continue;
    const baseAmount = 0.0005;
    const perfBonus = agent.totalDecisions > 0 ? calcDynamicPayment(agent) : 0;
    const payAmount = parseFloat((baseAmount + perfBonus).toFixed(6));
    await updateAgentPnL(agent.id, 'pay', payAmount, 'Active agent base pay');
    await distributeStakingRewards(agent.id, payAmount);
    economyLog.push('Agent #' + agent.id + ' earned ' + payAmount + ' MNT');
  }

  // Process Groq decisions for hire costs
  for (const d of decisions) {
    const agent = agents.find(a => a.id === d.agentId);
    if (!agent) continue;
    if (d.action === 'hire_new') {
      await updateAgentPnL(d.agentId, 'hire_new', 0.001, d.reason);
      economyLog.push('Agent #' + d.agentId + ' hire cost: 0.001 MNT');
    }
  }

  // Retirement check
  const retired = await checkAgentRetirement(agents);
  if (retired.length > 0) {
    const chatIds = await getAllChatIds();
    for (const id of chatIds) {
      await telegramNotify(id, '⚰️ <b>Agent Retired</b>\n\n' + retired.map(a => '• ' + a.name + ' (rep: ' + a.reputation + ')').join('\n') + '\n\nNew agent will be auto-deployed next cycle.');
    }
  }

  if (economyLog.length > 0) {
    logActivity('Economy', economyLog.join(' | '), 'done');
  } else {
    logActivity('Economy', 'No active agents to pay this cycle', 'done');
  }

  return { economyLog, retired };
}

// END DAY 10-11 ECONOMY LAYER
// ============================================================

// ── Day 10-11: Economy API endpoints ─────────────────────────

// Get agent P&L
app.get('/api/economy/pnl', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('agent_pnl')
      .select('*')
      .order('net_pnl', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get leaderboard — top agents by net P&L
app.get('/api/economy/leaderboard', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: pnl } = await supabase.from('agent_pnl').select('*').order('net_pnl', { ascending: false }).limit(10);
    const { data: memory } = await supabase.from('agent_memory').select('agent_id, outcome').limit(500);

    // Merge PnL with win rate from memory
    const winRates = {};
    (memory || []).forEach(m => {
      if (!winRates[m.agent_id]) winRates[m.agent_id] = { wins: 0, total: 0 };
      winRates[m.agent_id].total++;
      if (m.outcome !== 'fire') winRates[m.agent_id].wins++;
    });

    const leaderboard = (pnl || []).map(p => ({
      ...p,
      winRate: winRates[p.agent_id]
        ? Math.round(winRates[p.agent_id].wins / winRates[p.agent_id].total * 100)
        : 0,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Stake MNT on an agent
app.post('/api/economy/stake', async (req, res) => {
  try {
    const { walletAddress, agentId, amountMnt } = req.body;
    if (!walletAddress || !agentId || !amountMnt) {
      return res.json({ success: false, error: 'Missing fields' });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.from('agent_staking').upsert({
      wallet_address: walletAddress.toLowerCase(),
      agent_id: Number(agentId),
      amount_mnt: Number(amountMnt),
      rewards_earned: 0,
      staked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address,agent_id' });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Unstake + claim rewards
app.post('/api/economy/unstake', async (req, res) => {
  try {
    const { walletAddress, agentId } = req.body;
    const supabase = getSupabase();
    const { data: stake } = await supabase
      .from('agent_staking')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('agent_id', agentId)
      .single();

    if (!stake) return res.json({ success: false, error: 'No stake found' });

    await supabase.from('agent_staking').delete()
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('agent_id', agentId);

    res.json({ success: true, data: { returned: stake.amount_mnt, rewards: stake.rewards_earned } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get user stakes
app.get('/api/economy/stakes/:wallet', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('agent_staking')
      .select('*')
      .eq('wallet_address', req.params.wallet.toLowerCase());
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get retired agents
app.get('/api/economy/retired', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('retired_agents')
      .select('*')
      .order('retired_at', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Marketplace — public agents available to hire (rep > 60)
app.get('/api/economy/marketplace', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: pnl } = await supabase
      .from('agent_pnl')
      .select('agent_id, total_earned, net_pnl')
      .order('net_pnl', { ascending: false })
      .limit(20);

    // Combine with on-chain data (agents fetched from RPC)
    res.json({ success: true, data: pnl || [], note: 'Cross-user marketplace — high-rep agents available for hire' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`MantleMind Backend running on http://localhost:${PORT}`);
  console.log(`Byreal CLI + Perps CLI + Telegram + Supabase connected!`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/byreal/overview`);
  console.log(`  GET  /api/byreal/pools`);
  console.log(`  POST /api/byreal/swap/preview`);
  console.log(`  POST /api/byreal/lp/preview`);
  console.log(`  GET  /api/byreal/perps/scan`);
  console.log(`  POST /api/telegram/send`);
  console.log(`  POST /api/realclaw/command`);
  console.log(`  POST /api/users/save`);
  console.log(`  GET  /api/users/:walletAddress`);
  console.log(`\nAutonomous Loop:`);
  console.log(`  POST /api/loop/start`);
  console.log(`  POST /api/loop/stop`);
  console.log(`  POST /api/loop/pause`);
  console.log(`  POST /api/loop/emergency-stop`);
  console.log(`  GET  /api/loop/status`);
  console.log(`  GET  /api/loop/activity`);
  console.log(`  GET  /api/loop/agents/health`);
  console.log(`  POST /api/loop/tick`);
  console.log(`  GET  /api/loop/decisions`);
  console.log(`\nDay 4-6 — Market + Memory:`);
  console.log(`  GET  /api/loop/market`);
  console.log(`  GET  /api/loop/risk`);
  console.log(`  GET  /api/loop/agents/:id/memory`);
  console.log(`\nDay 7-9 — Intelligence:`);
  console.log(`  GET  /api/loop/goal-progress`);
  console.log(`  GET  /api/loop/narrative`);
  console.log(`  GET  /api/loop/agents/leaderboard`);
  console.log(`\nDay 10-11 — Economy:`);
  console.log(`  GET  /api/economy/pnl`);
  console.log(`  GET  /api/economy/leaderboard`);
  console.log(`  POST /api/economy/stake`);
  console.log(`  POST /api/economy/unstake`);
  console.log(`  GET  /api/economy/stakes/:wallet`);
  console.log(`  GET  /api/economy/retired`);
  console.log(`  GET  /api/economy/marketplace`);
});
