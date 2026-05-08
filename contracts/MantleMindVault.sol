// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MantleMindVault is Ownable, ReentrancyGuard {

    struct UserVault {
        uint256 balance;
        uint256 depositedAt;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        bool isActive;
    }

    struct Strategy {
        uint256 id;
        string name;
        address agentAddress;
        uint256 allocatedAmount;
        uint256 createdAt;
        bool isActive;
    }

    mapping(address => UserVault) public vaults;
    mapping(uint256 => Strategy) public strategies;
    uint256 private _strategyIds;
    uint256 public totalVaultBalance;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event StrategyCreated(
        uint256 indexed strategyId,
        string name,
        address agentAddress
    );
    event StrategyExecuted(
        uint256 indexed strategyId,
        uint256 amount
    );

    constructor() Ownable() {}

    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Deposit amount must be greater than 0");

        vaults[msg.sender].balance += msg.value;
        vaults[msg.sender].totalDeposited += msg.value;
        vaults[msg.sender].depositedAt = block.timestamp;
        vaults[msg.sender].isActive = true;
        totalVaultBalance += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(vaults[msg.sender].balance >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");

        vaults[msg.sender].balance -= amount;
        vaults[msg.sender].totalWithdrawn += amount;
        totalVaultBalance -= amount;

        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    function createStrategy(
        string memory name,
        address agentAddress
    ) external returns (uint256) {
        require(agentAddress != address(0), "Invalid agent address");

        _strategyIds++;
        uint256 strategyId = _strategyIds;

        strategies[strategyId] = Strategy({
            id: strategyId,
            name: name,
            agentAddress: agentAddress,
            allocatedAmount: 0,
            createdAt: block.timestamp,
            isActive: true
        });

        emit StrategyCreated(strategyId, name, agentAddress);
        return strategyId;
    }

    function executeStrategy(
        uint256 strategyId,
        uint256 amount
    ) external nonReentrant {
        require(strategies[strategyId].isActive, "Strategy not active");
        require(
            vaults[msg.sender].balance >= amount,
            "Insufficient vault balance"
        );
        require(amount > 0, "Amount must be greater than 0");

        vaults[msg.sender].balance -= amount;
        strategies[strategyId].allocatedAmount += amount;

        emit StrategyExecuted(strategyId, amount);
    }

    function getVault(address user)
        external view returns (UserVault memory) {
        return vaults[user];
    }

    function getStrategy(uint256 strategyId)
        external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    function getBalance(address user)
        external view returns (uint256) {
        return vaults[user].balance;
    }

    function getTotalStrategies()
        external view returns (uint256) {
        return _strategyIds;
    }
}