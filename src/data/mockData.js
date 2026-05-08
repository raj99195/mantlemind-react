export const WALLET = '0x7A3d...8F92';

export const METRICS = [
  { label: 'Total Portfolio Value', value: '$4,821', sub: '↑ +8.3% this week', subColor: 'text-teal', icon: '💰' },
  { label: 'Active Agents', value: '3', sub: '2 working · 1 standby', subColor: 'text-gray-400', icon: '🤖', valueColor: 'text-teal' },
  { label: 'MNT Balance', value: '0.047', sub: '~$0.09 spent on agents', subColor: 'text-gray-400', icon: '⬡' },
  { label: 'Total Decisions', value: '142', sub: '94% accuracy rate', subColor: 'text-teal', icon: '⚡' },
];

export const AGENTS = [
  { id: 1, name: 'MasterMind', role: 'Coordinator', icon: '🧠', status: 'active', badge: 'teal', erc: '#0047', decisions: 142, accuracy: '94%', mntEarned: '0.021', reputation: 'Elite', repScore: 94, desc: 'Strategic oversight and decision making', color: 'teal' },
  { id: 2, name: 'DataAgent', role: 'Analyzer', icon: '📊', status: 'active', badge: 'blue', erc: '#0089', decisions: 87, accuracy: '98%', mntEarned: '0.016', reputation: 'Trusted', repScore: 88, desc: 'Market data analysis and insights', color: 'blue', mntFee: '0.008 MNT' },
  { id: 3, name: 'TradeAgent', role: 'Executor', icon: '📈', status: 'active', badge: 'amber', erc: '#0112', decisions: 23, accuracy: '91%', mntEarned: '0.008', reputation: 'Rising', repScore: 72, desc: 'Trade execution and portfolio management', color: 'amber', mntFee: '0.012 MNT' },
  { id: 4, name: 'RiskAgent', role: 'Monitor', icon: '🛡️', status: 'standby', badge: 'gray', erc: '#0134', decisions: 3, accuracy: '100%', mntEarned: '0.002', reputation: 'New', repScore: 30, desc: 'Risk assessment and monitoring', color: 'gray' },
];

export const FEED_ITEMS = [
  { id: 1, icon: '✓', cls: 'teal', title: 'MasterMind: Rebalanced portfolio allocation', hash: '0x7f3a...91bc', time: '2 min ago' },
  { id: 2, icon: '◈', cls: 'blue', title: 'DataAgent: High yield opportunity in mETH detected', hash: '0x2c9d...44ef', time: '5 min ago' },
  { id: 3, icon: '↗', cls: 'amber', title: 'TradeAgent: Swap executed — 50 USDC → 0.023 MNT', hash: '0x8a1f...c33d', time: '8 min ago' },
  { id: 4, icon: '◉', cls: 'purple', title: 'RiskAgent: Risk assessment completed — LOW', hash: '0x4e72...b88a', time: '12 min ago' },
  { id: 5, icon: '★', cls: 'teal', title: 'DataAgent hired — ERC-8004 NFT #0089 issued', hash: '0x1d3c...7f21', time: '15 min ago' },
];

export const ALLOCATIONS = [
  { label: 'MNT', pct: 45, color: '#00D4AA' },
  { label: 'mETH', pct: 25, color: '#7EB8FF' },
  { label: 'USDY', pct: 20, color: '#a78bfa' },
  { label: 'USDC', pct: 6, color: '#60a5fa' },
  { label: 'Others', pct: 4, color: '#444' },
];

export const TRANSACTIONS = [
  { type: 'Rebalance', desc: 'Portfolio rebalanced — MNT +5%', hash: '0x7f3a...91bc', amount: '0.008 MNT', status: 'Confirmed', time: '2 min ago' },
  { type: 'Hire', desc: 'DataAgent hired — ERC-8004 #0089 minted', hash: '0x2c9d...44ef', amount: '0.005 MNT', status: 'Confirmed', time: '5 min ago' },
  { type: 'Trade', desc: 'Swap: 50 USDC → 0.023 MNT via Byreal Skills', hash: '0x8a1f...c33d', amount: '50 USDC', status: 'Confirmed', time: '8 min ago' },
  { type: 'Risk Check', desc: 'Risk assessment completed — LOW risk score', hash: '0x4e72...b88a', amount: '0.002 MNT', status: 'Confirmed', time: '12 min ago' },
  { type: 'LP Open', desc: 'LP position opened — Agni Finance USDY pool', hash: '0x1d3c...7f21', amount: '482.1 USDY', status: 'Confirmed', time: '18 min ago' },
  { type: 'Hire', desc: 'TradeAgent hired — ERC-8004 #0112 minted', hash: '0x9b4e...2a31', amount: '0.005 MNT', status: 'Confirmed', time: '22 min ago' },
  { type: 'Trade', desc: 'mETH purchase via Byreal Perps CLI', hash: '0x3f7a...8c44', amount: '0.344 mETH', status: 'Confirmed', time: '35 min ago' },
  { type: 'Deploy', desc: 'MasterMind deployed — ERC-8004 #0047 minted', hash: '0x6c2b...91d3', amount: '0.01 MNT', status: 'Confirmed', time: 'May 1, 2026' },
];

export const HOLDINGS = [
  { asset: 'MNT', balance: '2,164.5', value: '$2,165', pct: 45, color: '#00D4AA', change: '+2.3%', apy: '7.2%', agent: 'TradeAgent', agentColor: 'teal' },
  { asset: 'mETH', balance: '0.344', value: '$1,206', pct: 25, color: '#7EB8FF', change: '+1.8%', apy: '5.4%', agent: 'DataAgent', agentColor: 'blue' },
  { asset: 'USDY', balance: '963.2', value: '$964', pct: 20, color: '#a78bfa', change: '+0.1%', apy: '4.8%', agent: 'MasterMind', agentColor: 'teal' },
  { asset: 'USDC', balance: '289.4', value: '$289', pct: 6, color: '#60a5fa', change: '0.0%', apy: '—', agent: 'Reserve', agentColor: 'gray' },
];
