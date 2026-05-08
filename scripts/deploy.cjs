const hre = require("hardhat");

async function main() {
  console.log("Deploying MantleMind contracts...");

  // Deploy AgentRegistry
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry deployed to:", await agentRegistry.getAddress());

  // Deploy ERC8004Identity
  const ERC8004Identity = await hre.ethers.getContractFactory("ERC8004Identity");
  const erc8004 = await ERC8004Identity.deploy();
  await erc8004.waitForDeployment();
  console.log("ERC8004Identity deployed to:", await erc8004.getAddress());

  // Deploy MantleMindVault
  const MantleMindVault = await hre.ethers.getContractFactory("MantleMindVault");
  const vault = await MantleMindVault.deploy();
  await vault.waitForDeployment();
  console.log("MantleMindVault deployed to:", await vault.getAddress());

  console.log("\n=== ALL CONTRACTS DEPLOYED ===");
  console.log("AgentRegistry:", await agentRegistry.getAddress());
  console.log("ERC8004Identity:", await erc8004.getAddress());
  console.log("MantleMindVault:", await vault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});