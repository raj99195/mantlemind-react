// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentRegistry is ERC721, Ownable {
    
    // ===== STRUCTS =====
    struct Agent {
        uint256 id;
        string name;
        string role;
        address owner;
        bool isActive;
        uint256 reputation;
        uint256 totalDecisions;
        uint256 correctDecisions;
        uint256 totalEarned;
        uint256 deployedAt;
    }

    struct Decision {
        uint256 agentId;
        string action;
        bytes32 dataHash;
        uint256 timestamp;
        bool success;
    }

    // ===== STATE =====
    uint256 private _tokenIds;
    uint256 private _decisionIds;

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Decision) public decisions;
    mapping(address => uint256[]) public ownerAgents;
    mapping(uint256 => uint256[]) public agentDecisions;

    // ===== EVENTS =====
    event AgentDeployed(
        uint256 indexed agentId,
        string name,
        string role,
        address indexed owner
    );
    event AgentHired(
        uint256 indexed masterId,
        uint256 indexed subAgentId,
        uint256 payment
    );
    event AgentPaid(
        uint256 indexed agentId,
        address indexed owner,
        uint256 amount
    );
    event AgentFired(uint256 indexed agentId);
    event DecisionRecorded(
        uint256 indexed agentId,
        uint256 indexed decisionId,
        string action,
        bool success
    );
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 newReputation
    );

    // ===== CONSTRUCTOR =====
    constructor() ERC721("MantleMind Agent", "MMA") Ownable() {}
    // ===== DEPLOY AGENT =====
    function deployAgent(
        string memory name,
        string memory role
    ) external returns (uint256) {
        _tokenIds++;
        uint256 newAgentId = _tokenIds;

        _safeMint(msg.sender, newAgentId);

        agents[newAgentId] = Agent({
            id: newAgentId,
            name: name,
            role: role,
            owner: msg.sender,
            isActive: true,
            reputation: 50,
            totalDecisions: 0,
            correctDecisions: 0,
            totalEarned: 0,
            deployedAt: block.timestamp
        });

        ownerAgents[msg.sender].push(newAgentId);

        emit AgentDeployed(newAgentId, name, role, msg.sender);
        return newAgentId;
    }

    // ===== HIRE AGENT =====
    function hireAgent(
        uint256 masterId,
        uint256 subAgentId
    ) external payable {
        require(agents[masterId].isActive, "Master agent not active");
        require(agents[subAgentId].isActive, "Sub agent not active");
        require(
            agents[masterId].owner == msg.sender,
            "Not master agent owner"
        );

        address subAgentOwner = agents[subAgentId].owner;
        
        if (msg.value > 0) {
            agents[subAgentId].totalEarned += msg.value;
            payable(subAgentOwner).transfer(msg.value);
        }

        emit AgentHired(masterId, subAgentId, msg.value);
    }

    // ===== RECORD DECISION =====
    function recordDecision(
        uint256 agentId,
        string memory action,
        bytes32 dataHash,
        bool success
    ) external returns (uint256) {
        require(
            agents[agentId].owner == msg.sender,
            "Not agent owner"
        );
        require(agents[agentId].isActive, "Agent not active");

        _decisionIds++;
        uint256 decisionId = _decisionIds;

        decisions[decisionId] = Decision({
            agentId: agentId,
            action: action,
            dataHash: dataHash,
            timestamp: block.timestamp,
            success: success
        });

        agentDecisions[agentId].push(decisionId);
        agents[agentId].totalDecisions++;

        if (success) {
            agents[agentId].correctDecisions++;
        }

        _updateReputation(agentId);

        emit DecisionRecorded(agentId, decisionId, action, success);
        return decisionId;
    }

    // ===== PAY AGENT =====
    function payAgent(uint256 agentId) external payable {
        require(agents[agentId].isActive, "Agent not active");
        require(msg.value > 0, "Payment required");

        agents[agentId].totalEarned += msg.value;
        payable(agents[agentId].owner).transfer(msg.value);

        emit AgentPaid(agentId, agents[agentId].owner, msg.value);
    }

    // ===== FIRE AGENT =====
    function fireAgent(uint256 agentId) external {
        require(
            agents[agentId].owner == msg.sender || owner() == msg.sender,
            "Not authorized"
        );
        agents[agentId].isActive = false;
        emit AgentFired(agentId);
    }

    // ===== INTERNAL: UPDATE REPUTATION =====
    function _updateReputation(uint256 agentId) internal {
        Agent storage agent = agents[agentId];
        
        if (agent.totalDecisions == 0) return;

        uint256 accuracyScore = (agent.correctDecisions * 100) 
                                / agent.totalDecisions;
        
        uint256 experienceBonus = agent.totalDecisions > 100 ? 10 :
                                  agent.totalDecisions > 50 ? 5 :
                                  agent.totalDecisions > 20 ? 2 : 0;

        uint256 newReputation = accuracyScore + experienceBonus;
        
        if (newReputation > 100) newReputation = 100;
        
        agent.reputation = newReputation;

        emit ReputationUpdated(agentId, newReputation);
    }

    // ===== VIEW FUNCTIONS =====
    function getAgent(uint256 agentId) 
        external view returns (Agent memory) {
        return agents[agentId];
    }

    function getOwnerAgents(address ownerAddr)
        external view returns (uint256[] memory) {
        return ownerAgents[ownerAddr];
    }

    function getAgentDecisions(uint256 agentId)
        external view returns (uint256[] memory) {
        return agentDecisions[agentId];
    }

    function getAccuracy(uint256 agentId)
        external view returns (uint256) {
        Agent memory agent = agents[agentId];
        if (agent.totalDecisions == 0) return 0;
        return (agent.correctDecisions * 100) / agent.totalDecisions;
    }

    function getTotalAgents() external view returns (uint256) {
        return _tokenIds;
    }
}