# MantleMind — Autonomous AI Agent Economy on Mantle

> **First autonomous AI agent economy on blockchain.** Type your financial goal → AI agents powered by RealClaw autonomously hire, pay & fire each other on-chain, executing live Byreal DeFi strategies with every decision permanently recorded via ERC-8004 NFTs on Mantle.

[![Mantle Sepolia](https://img.shields.io/badge/Network-Mantle%20Sepolia-00D4AA?style=flat-square)](https://explorer.sepolia.mantle.xyz)
[![RealClaw](https://img.shields.io/badge/Powered%20by-RealClaw-blue?style=flat-square)](https://byreal.io)
[![Byreal](https://img.shields.io/badge/DeFi-Byreal-purple?style=flat-square)](https://byreal.io)
[![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-orange?style=flat-square)](#)
[![Live Demo](https://img.shields.io/badge/Live-mantlemind--react.vercel.app-green?style=flat-square)](https://mantlemind-react.vercel.app)

---

## What is MantleMind?

MantleMind solves the core problem of passive DeFi participation — most users have funds sitting idle because managing yield strategies requires constant monitoring, deep technical knowledge, and 24/7 availability.

**MantleMind makes DeFi fully autonomous:**

1. **User types a goal** in plain English — *"Maximize yield on my 500 USDT over 3 months, low risk"*
2. **Groq AI interprets** the goal and builds a strategy
3. **AI agents deploy on-chain** — each with a unique ERC-8004 identity NFT on Mantle
4. **Agents hire, pay, and fire each other** — MasterMind orchestrates DataAgent, RiskAgent, TradeAgent
5. **Byreal + RealClaw execute** — live CLMM/LP/Swap strategies on Mantle DeFi
6. **Everything is on-chain** — every decision permanently recorded on Mantle Sepolia
7. **Telegram notifications** — users get real-time updates without opening the app

The system runs **24/7 autonomously** — no human intervention required after setting the goal.

---

## Live Demo

- **Frontend:** https://mantlemind-react.vercel.app
- **Backend:** https://mantlemind-react.onrender.com
- **Explorer:** https://explorer.sepolia.mantle.xyz/address/0x066aefBf67D73F8439440fD6ae6adaFCEa88b2D5

---

## Smart Contracts — Mantle Sepolia Testnet

| Contract | Address | Purpose |
|---|---|---|
| **AgentRegistry** | `0x066aefBf67D73F8439440fD6ae6adaFCEa88b2D5` | Deploy, hire, fire, pay agents + record decisions |
| **MantleMindVault** | `0xaC8Ec6678ABA2893729fD5b310c6b173D97eef82` | Deposit/withdraw MNT for agent operations |
| **ERC8004Identity** | `0x42F4aC6290cB3C4cC5da7128D79476dfAA4e6eB9` | ERC-721 based agent identity NFTs |

**Network:** Mantle Sepolia (Chain ID: 5003)
**RPC:** `https://rpc.sepolia.mantle.xyz`

### AgentRegistry Functions
```solidity
deployAgent(name, role)         // Mint ERC-8004 NFT, register agent on-chain
hireAgent(masterId, subId)      // payable — MasterMind hires sub-agent
fireAgent(agentId)              // Deactivate underperforming agent
payAgent(agentId)               // payable — reward agent for performance
recordDecision(agentId, action, dataHash, success)  // Log every AI decision on-chain
getAgent(agentId)               // Returns full agent struct
getAccuracy(agentId)            // Returns accuracy % based on decisions
```

### Agent Struct
```solidity
struct Agent {
    uint256 id;
    string name;
    string role;           // COORDINATOR | ANALYZER | EXECUTOR | MONITOR
    address owner;
    bool isActive;
    uint256 reputation;    // 0-100, increases with correct decisions
    uint256 totalDecisions;
    uint256 correctDecisions;
    uint256 totalEarned;   // MNT earned by this agent
    uint256 deployedAt;
}
```

---

## Architecture

```
User Goal Input (React Frontend)
         │
         ▼
   Groq AI (llama-3.1-8b-instant)
   interpretGoal() → strategy JSON
         │
         ▼
   MasterMind Orchestrator
   ├── Hire DataAgent (on-chain tx)
   ├── Hire TradeAgent (on-chain tx)
   └── Hire RiskAgent (logic)
         │
    ┌────┼────┐
    ▼    ▼    ▼
DataAgent  RiskAgent  TradeAgent
  │          │           │
Byreal     Risk       Byreal
Pools      Score    Swap/LP/CLMM
  │          │           │
  └────┬─────┘           │
       ▼                 ▼
  Decision Engine    Execution
  (Groq V2)         (RealClaw)
       │
       ▼
  AgentRegistry.recordDecision()  ← permanent on-chain record
       │
       ▼
  Telegram Notification + WebSocket → Frontend
```

---

## Autonomous Loop — How It Works

The backend runs a **persistent autonomous loop** every 10 minutes (configurable):

```
Every cycle:
1. Fetch all agents from AgentRegistry (on-chain RPC call)
2. Fetch live market data:
   - MNT price + 24h change (CoinGecko)
   - Mantle TVL + 1d change (DeFiLlama)
   - Top pools by APR (Byreal CLI)
3. Load agent memory from Supabase (last 10 decisions each)
4. Risk assessment: volatility + APR risk + TVL change → score 1-10
5. Circuit breaker: if risk score ≥ 9, skip cycle
6. Groq V2 decides: hire / pay / fire / keep for each agent
7. Economy cycle: pay all active agents base MNT
8. Anomaly detection: extreme APR, market crash, price spike
9. Goal progress update: % complete based on milestones
10. AI narrative: Groq explains cycle in plain English
11. Telegram notification to all connected users
12. Supabase persist: loop state, decisions, agent memory, P&L
```

### Loop State Persistence
Loop state is saved to Supabase — if the server restarts, the loop automatically resumes from where it left off.

---

## Features

### 🤖 Agent Workforce
- Deploy agents with custom names and roles (COORDINATOR, ANALYZER, EXECUTOR, MONITOR)
- Each agent gets a unique **ERC-8004 identity NFT** on Mantle
- Manual hire/fire/pay via UI, or fully autonomous via loop
- Real-time reputation scoring based on decision accuracy

### 📊 Live Market Intelligence
- **Byreal pools** — real-time APR, TVL, volume data
- **CoinGecko** — live MNT price and 24h change
- **DeFiLlama** — Mantle chain TVL tracking
- **Risk engine** — multi-factor score (volatility + APR risk + TVL trend)
- **Anomaly detection** — flags extreme APR (>500%), market crashes, price spikes

### 🧠 Agent Intelligence Layer
- **Agent memory** — every decision stored in Supabase with market context
- **Memory-informed decisions** — Groq receives last 10 decisions as context
- **Goal progress tracking** — 0–100% completion based on milestones
- **Natural language narratives** — Groq explains each cycle in plain English
- **Reputation-based hiring** — best performing agents preferred

### 💰 Agent Economy
- **Dynamic payment** — high accuracy agents earn more MNT per cycle
- **Agent P&L tracking** — total earned, spent, net P&L per agent
- **Agent staking** — users stake MNT on agents, earn 20% of their rewards
- **Agent retirement** — reputation < 20 with 10+ decisions → auto-blacklist
- **Leaderboard** — top agents ranked by P&L and win rate
- **Marketplace** — stake/unstake on any public agent

### 🔔 Telegram Integration
- Connect via `@mantlemind_bot` → send `/start` for Chat ID
- Notifications for: loop start, agent decisions, anomaly alerts, goal completion, emergency stop
- Real-time Telegram updates without opening the app

### 🚨 Safety Controls
- **Emergency stop** — one click pauses all agents, funds safe
- **Circuit breaker** — auto-pauses if market risk score ≥ 9/10
- **Pause/resume** — granular loop control

### 📡 Real-time WebSocket Feed
- Live agent activity stream in frontend
- Auto-reconnect every 3 seconds if disconnected
- Cycle updates, decisions, anomalies, narratives all streamed live

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React + Vite | UI framework |
| wagmi + viem | Wallet connection + on-chain reads |
| Reown AppKit | WalletConnect integration |
| React Router | Navigation |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | API server |
| WebSocket (ws) | Real-time frontend stream |
| Groq SDK | llama-3.1-8b-instant AI decisions |
| Byreal CLI | Live pool data + DeFi execution |
| Byreal Perps CLI | Perpetual futures scanning |
| RealClaw | OpenClaw-based agent execution |

### Data & Infra
| Technology | Purpose |
|---|---|
| Supabase | Agent memory, loop state, P&L, users |
| Telegram Bot API | User notifications |
| CoinGecko API | Live MNT price |
| DeFiLlama API | Mantle TVL data |
| Render | Backend hosting |
| Vercel | Frontend hosting |

### Blockchain
| Technology | Purpose |
|---|---|
| Solidity | Smart contracts |
| Hardhat | Contract deployment |
| Mantle Sepolia | Testnet (Chain ID: 5003) |
| ERC-8004 | Agent identity NFT standard |

---

## Project Structure

```
mantlemind-react/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx          # Goal input, loop control, live feed
│   │   ├── Agents.jsx             # Deploy/hire/fire/pay agents
│   │   ├── AgentDetail.jsx        # Individual agent stats + memory
│   │   ├── Portfolio.jsx          # Holdings + live Byreal pools
│   │   ├── LeaderboardMarketplace.jsx  # Rankings + staking
│   │   └── OtherPages.jsx         # History, Settings, Onboarding
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Navbar.jsx
│   │   └── AnimatedGrid.jsx
│   ├── hooks/
│   │   └── useContracts.js        # wagmi contract hooks
│   └── agents/
│       └── masterMind.js          # Groq orchestration + Byreal calls
├── contracts/
│   ├── AgentRegistry.sol
│   ├── MantleMindVault.sol
│   └── ERC8004Identity.sol
├── server.cjs                     # Express backend + autonomous loop
├── hardhat.config.cjs
└── .env.example
```

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- Byreal CLI installed (`byreal-cli` in PATH)
- Byreal Perps CLI installed (`byreal-perps-cli` in PATH)
- Supabase project
- Groq API key
- Telegram Bot token

### 1. Clone & Install

```bash
git clone https://github.com/raj99195/mantlemind-react
cd mantlemind-react
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
# Wallet
PRIVATE_KEY=your_wallet_private_key

# RPC
MANTLE_RPC=https://rpc.sepolia.mantle.xyz
VITE_EXPLORER_URL=https://explorer.sepolia.mantle.xyz

# Contract Addresses
AGENT_REGISTRY=0x066aefBf67D73F8439440fD6ae6adaFCEa88b2D5

# Groq AI
VITE_GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# WalletConnect
VITE_WALLETCONNECT_ID=your_walletconnect_project_id

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# API
VITE_API_URL=http://localhost:3001
PORT=3001
```

### 3. Supabase Tables

Run in Supabase SQL Editor:

```sql
-- Users (wallet → telegram mapping)
create table if not exists users (
  wallet_address text primary key,
  telegram_chat_id text,
  telegram_username text,
  created_at timestamptz default now()
);

-- Loop state persistence
create table if not exists loop_state (
  id text primary key,
  running bool default false,
  paused bool default false,
  last_run text,
  next_run text,
  interval_ms int default 600000,
  current_goal text,
  cycle_count int default 0,
  total_decisions int default 0,
  agents_fired int default 0,
  agents_hired int default 0,
  updated_at text
);

-- Agent decisions log
create table if not exists agent_decisions (
  id uuid default gen_random_uuid() primary key,
  agent_id int,
  action text,
  reason text,
  tx_hash text,
  created_at text
);

-- Loop heartbeat
create table if not exists loop_heartbeat (
  id text primary key,
  last_beat text,
  cycle int default 0
);

-- Agent memory (past decisions for context)
create table if not exists agent_memory (
  id uuid default gen_random_uuid() primary key,
  agent_id int,
  decision text,
  outcome text,
  context jsonb,
  created_at text
);

-- Goal progress tracking
create table if not exists goal_progress (
  id uuid default gen_random_uuid() primary key,
  goal_text text,
  progress_pct int default 0,
  active_agents int default 0,
  total_decisions int default 0,
  avg_reputation int default 0,
  best_pool text,
  best_apr text,
  cycle_count int default 0,
  created_at text,
  updated_at text
);

-- Agent P&L (economy layer)
create table if not exists agent_pnl (
  id uuid default gen_random_uuid() primary key,
  agent_id int unique,
  total_earned float default 0,
  total_spent float default 0,
  net_pnl float default 0,
  last_action text,
  last_action_reason text,
  created_at text,
  updated_at text
);

-- Agent staking
create table if not exists agent_staking (
  id uuid default gen_random_uuid() primary key,
  wallet_address text,
  agent_id int,
  amount_mnt float default 0,
  rewards_earned float default 0,
  staked_at text,
  updated_at text,
  unique(wallet_address, agent_id)
);

-- Retired agents
create table if not exists retired_agents (
  id uuid default gen_random_uuid() primary key,
  agent_id int,
  agent_name text,
  final_reputation int,
  total_decisions int,
  retired_at text
);
```

### 4. Run Backend

```bash
node server.cjs
```

### 5. Run Frontend

```bash
npm run dev
```

### 6. Start Autonomous Loop

```bash
curl -X POST http://localhost:3001/api/loop/start \
  -H "Content-Type: application/json" \
  -d '{"goal": "maximize yield on Mantle", "intervalMinutes": 10}'
```

---

## API Reference

### Autonomous Loop
```
POST /api/loop/start          Start loop with goal
POST /api/loop/stop           Stop loop
POST /api/loop/pause          Pause/resume toggle
POST /api/loop/emergency-stop Emergency stop + Telegram alert
POST /api/loop/tick           Run one cycle immediately
GET  /api/loop/status         Current loop state
GET  /api/loop/activity       Last 20 activities
GET  /api/loop/decisions      Last 50 agent decisions
GET  /api/loop/agents/health  Agent health scores
```

### Market Data (Day 4-6)
```
GET  /api/loop/market         Live MNT price + Byreal pools + risk
GET  /api/loop/risk           Current risk assessment
GET  /api/loop/agents/:id/memory  Agent decision history
```

### Intelligence (Day 7-9)
```
GET  /api/loop/goal-progress  Goal completion %
GET  /api/loop/narrative      Latest AI narrative
GET  /api/loop/agents/leaderboard  Win rate rankings
```

### Economy (Day 10-11)
```
GET  /api/economy/pnl         Agent P&L data
GET  /api/economy/leaderboard Full leaderboard with win rates
POST /api/economy/stake       Stake MNT on agent
POST /api/economy/unstake     Unstake + claim rewards
GET  /api/economy/stakes/:wallet  User's active stakes
GET  /api/economy/retired     Retired agents list
GET  /api/economy/marketplace Public agents for hire
```

### Byreal Integration
```
GET  /api/byreal/overview     Protocol overview
GET  /api/byreal/pools        Live pool data (APR, TVL, volume)
POST /api/byreal/swap/preview Swap preview
POST /api/byreal/lp/preview   LP position preview
GET  /api/byreal/perps/scan   Perpetuals scan
```

---

## Telegram Setup

1. Open Telegram → search `@mantlemind_bot`
2. Send `/start`
3. Copy your Chat ID
4. Go to MantleMind Settings → paste Chat ID → Connect
5. Done — you'll receive notifications for every agent action

---

## Hackathon Track

**Mantle Turing Test Hackathon 2026 — Phase 2: AI Awakening**

Track: **Agentic Wallets & Economy** — built using Byreal Skills CLI

Key alignment with hackathon criteria:
- ✅ On-chain benchmarking — every agent decision recorded on Mantle
- ✅ ERC-8004 agent identity standard — implemented natively
- ✅ RealClaw integration — OpenClaw-based agent execution
- ✅ Byreal Agent Skills CLI — CLMM, LP, Swap integration
- ✅ Radical transparency — live WebSocket feed + Telegram

---

## Roadmap

- [ ] Mainnet deployment (Mantle Chain ID: 5000)
- [ ] Cross-user agent marketplace (hire agents across wallets)
- [ ] Agent governance — on-chain voting for strategies
- [ ] Multi-goal support — run parallel strategies
- [ ] Cross-chain architecture — LayerZero integration
- [ ] AI vs AI challenge mode — challenger agent vs MasterMind

---

## License

MIT
