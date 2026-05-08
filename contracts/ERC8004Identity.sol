// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC8004Identity is ERC721, Ownable {

    struct AgentIdentity {
        uint256 tokenId;
        string agentName;
        string role;
        address owner;
        uint256 reputation;
        uint256 totalTasks;
        uint256 successfulTasks;
        uint256 mintedAt;
        bool isActive;
    }

    uint256 private _tokenIds;
    mapping(uint256 => AgentIdentity) public identities;
    mapping(address => uint256[]) public ownerIdentities;

    event IdentityMinted(
        uint256 indexed tokenId,
        string agentName,
        string role,
        address indexed owner
    );
    event ReputationUpdated(
        uint256 indexed tokenId,
        uint256 newReputation
    );
    event TaskCompleted(
        uint256 indexed tokenId,
        bool success
    );

    constructor() ERC721("ERC8004 Agent Identity", "EAI") Ownable() {}

    function mintIdentity(
        string memory agentName,
        string memory role
    ) external returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);

        identities[newTokenId] = AgentIdentity({
            tokenId: newTokenId,
            agentName: agentName,
            role: role,
            owner: msg.sender,
            reputation: 50,
            totalTasks: 0,
            successfulTasks: 0,
            mintedAt: block.timestamp,
            isActive: true
        });

        ownerIdentities[msg.sender].push(newTokenId);

        emit IdentityMinted(newTokenId, agentName, role, msg.sender);
        return newTokenId;
    }

    function recordTask(
        uint256 tokenId,
        bool success
    ) external {
        require(
            identities[tokenId].owner == msg.sender,
            "Not identity owner"
        );
        require(identities[tokenId].isActive, "Identity not active");

        identities[tokenId].totalTasks++;

        if (success) {
            identities[tokenId].successfulTasks++;
        }

        _updateReputation(tokenId);

        emit TaskCompleted(tokenId, success);
    }

    function _updateReputation(uint256 tokenId) internal {
        AgentIdentity storage identity = identities[tokenId];

        if (identity.totalTasks == 0) return;

        uint256 accuracy = (identity.successfulTasks * 100)
                            / identity.totalTasks;

        uint256 bonus = identity.totalTasks > 100 ? 10 :
                        identity.totalTasks > 50  ? 5  :
                        identity.totalTasks > 20  ? 2  : 0;

        uint256 newReputation = accuracy + bonus;
        if (newReputation > 100) newReputation = 100;

        identity.reputation = newReputation;

        emit ReputationUpdated(tokenId, newReputation);
    }

    function getIdentity(uint256 tokenId)
        external view returns (AgentIdentity memory) {
        return identities[tokenId];
    }

    function getOwnerIdentities(address ownerAddr)
        external view returns (uint256[] memory) {
        return ownerIdentities[ownerAddr];
    }

    function deactivateIdentity(uint256 tokenId) external {
        require(
            identities[tokenId].owner == msg.sender,
            "Not identity owner"
        );
        identities[tokenId].isActive = false;
    }

    function totalIdentities() external view returns (uint256) {
        return _tokenIds;
    }
}