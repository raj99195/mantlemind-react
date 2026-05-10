export const AgentRegistryABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "agentId", "type": "uint256" },
      { "indexed": false, "name": "name", "type": "string" },
      { "indexed": false, "name": "role", "type": "string" },
      { "indexed": true, "name": "owner", "type": "address" }
    ],
    "name": "AgentDeployed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "masterId", "type": "uint256" },
      { "indexed": true, "name": "subAgentId", "type": "uint256" },
      { "indexed": false, "name": "payment", "type": "uint256" }
    ],
    "name": "AgentHired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "agentId", "type": "uint256" },
      { "indexed": true, "name": "owner", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" }
    ],
    "name": "AgentPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "agentId", "type": "uint256" }
    ],
    "name": "AgentFired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "agentId", "type": "uint256" },
      { "indexed": true, "name": "decisionId", "type": "uint256" },
      { "indexed": false, "name": "action", "type": "string" },
      { "indexed": false, "name": "success", "type": "bool" }
    ],
    "name": "DecisionRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "agentId", "type": "uint256" },
      { "indexed": false, "name": "newReputation", "type": "uint256" }
    ],
    "name": "ReputationUpdated",
    "type": "event"
  },
  {
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "role", "type": "string" }
    ],
    "name": "deployAgent",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "masterId", "type": "uint256" },
      { "name": "subAgentId", "type": "uint256" }
    ],
    "name": "hireAgent",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "agentId", "type": "uint256" },
      { "name": "action", "type": "string" },
      { "name": "dataHash", "type": "bytes32" },
      { "name": "success", "type": "bool" }
    ],
    "name": "recordDecision",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "agentId", "type": "uint256" }],
    "name": "payAgent",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "agentId", "type": "uint256" }],
    "name": "fireAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "agentId", "type": "uint256" }],
    "name": "getAgent",
    "outputs": [
      {
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "name", "type": "string" },
          { "name": "role", "type": "string" },
          { "name": "owner", "type": "address" },
          { "name": "isActive", "type": "bool" },
          { "name": "reputation", "type": "uint256" },
          { "name": "totalDecisions", "type": "uint256" },
          { "name": "correctDecisions", "type": "uint256" },
          { "name": "totalEarned", "type": "uint256" },
          { "name": "deployedAt", "type": "uint256" }
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "ownerAddr", "type": "address" }],
    "name": "getOwnerAgents",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "agentId", "type": "uint256" }],
    "name": "getAccuracy",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalAgents",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];