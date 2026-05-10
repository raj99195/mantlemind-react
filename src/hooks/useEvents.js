import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { AgentRegistryABI } from '../contracts/AgentRegistryABI';
import { VaultABI } from '../contracts/VaultABI';
import { ADDRESSES } from '../contracts/addresses';

const RPC_URL = 'https://rpc.sepolia.mantle.xyz';

// ===== GET REAL ON-CHAIN EVENTS =====
export function useOnChainEvents(maxEvents = 50) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const registry = new ethers.Contract(ADDRESSES.AgentRegistry, AgentRegistryABI, provider);
        const vault = new ethers.Contract(ADDRESSES.MantleMindVault, VaultABI, provider);

        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000);

        // Fetch all events in parallel
        const [deployed, hired, paid, fired, decisions] = await Promise.all([
          registry.queryFilter(registry.filters.AgentDeployed(), fromBlock),
          registry.queryFilter(registry.filters.AgentHired(), fromBlock),
          registry.queryFilter(registry.filters.AgentPaid(), fromBlock),
          registry.queryFilter(registry.filters.AgentFired(), fromBlock),
          registry.queryFilter(registry.filters.DecisionRecorded(), fromBlock),
        ]);

        // Format all events
        const allEvents = [
          ...deployed.map(e => ({
            type: 'DEPLOY',
            desc: `Agent deployed — ${e.args.name} (${e.args.role})`,
            hash: e.transactionHash,
            amount: '0 MNT',
            status: 'Confirmed',
            blockNumber: e.blockNumber,
            timestamp: null,
          })),
          ...hired.map(e => ({
            type: 'HIRE',
            desc: `Agent #${e.args.subAgentId} hired by Agent #${e.args.masterId}`,
            hash: e.transactionHash,
            amount: `${ethers.formatEther(e.args.payment || 0)} MNT`,
            status: 'Confirmed',
            blockNumber: e.blockNumber,
            timestamp: null,
          })),
          ...paid.map(e => ({
            type: 'PAY',
            desc: `Agent #${e.args.agentId} paid`,
            hash: e.transactionHash,
            amount: `${ethers.formatEther(e.args.amount || 0)} MNT`,
            status: 'Confirmed',
            blockNumber: e.blockNumber,
            timestamp: null,
          })),
          ...fired.map(e => ({
            type: 'FIRE',
            desc: `Agent #${e.args.agentId} fired`,
            hash: e.transactionHash,
            amount: '0 MNT',
            status: 'Confirmed',
            blockNumber: e.blockNumber,
            timestamp: null,
          })),
          ...decisions.map(e => ({
            type: 'DECISION',
            desc: `Agent #${e.args.agentId}: ${e.args.action?.slice(0, 50)}`,
            hash: e.transactionHash,
            amount: '0 MNT',
            status: e.args.success ? 'Confirmed' : 'Failed',
            blockNumber: e.blockNumber,
            timestamp: null,
          })),
        ];

        // Sort by block number descending
        allEvents.sort((a, b) => b.blockNumber - a.blockNumber);

        // Get timestamps for latest 20 events
        const latest = allEvents.slice(0, 20);
        await Promise.all(latest.map(async (ev) => {
          try {
            const block = await provider.getBlock(ev.blockNumber);
            ev.timestamp = block?.timestamp ? new Date(block.timestamp * 1000) : null;
          } catch {}
        }));

        if (!cancelled) {
          setEvents(allEvents.slice(0, maxEvents).map(ev => ({
            ...ev,
            time: ev.timestamp ? timeAgo(ev.timestamp) : `Block ${ev.blockNumber}`,
            shortHash: ev.hash ? ev.hash.slice(0, 6) + '...' + ev.hash.slice(-4) : '',
          })));
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Event fetch error:', err);
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, [maxEvents]);

  return { events, isLoading };
}

// ===== REAL-TIME EVENT LISTENER =====
export function useEventListener(onNewEvent) {
  useEffect(() => {
    let registry;
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      registry = new ethers.Contract(ADDRESSES.AgentRegistry, AgentRegistryABI, provider);

      registry.on('AgentDeployed', (agentId, name, role, owner, event) => {
        onNewEvent({ type: 'DEPLOY', desc: `${name} deployed (${role})`, hash: event.log.transactionHash, time: 'just now' });
      });
      registry.on('AgentHired', (masterId, subAgentId, payment, event) => {
        onNewEvent({ type: 'HIRE', desc: `Agent #${subAgentId} hired by #${masterId}`, hash: event.log.transactionHash, time: 'just now' });
      });
      registry.on('AgentPaid', (agentId, owner, amount, event) => {
        onNewEvent({ type: 'PAY', desc: `Agent #${agentId} paid ${ethers.formatEther(amount)} MNT`, hash: event.log.transactionHash, time: 'just now' });
      });
      registry.on('DecisionRecorded', (agentId, decisionId, action, success, event) => {
        onNewEvent({ type: 'DECISION', desc: `Agent #${agentId}: ${action?.slice(0, 40)}`, hash: event.log.transactionHash, time: 'just now' });
      });
    } catch {}

    return () => {
      try { registry?.removeAllListeners(); } catch {}
    };
  }, [onNewEvent]);
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}