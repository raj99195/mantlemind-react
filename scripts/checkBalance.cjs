const hre = require("hardhat");

async function main() {
  const balance = await hre.ethers.provider.getBalance(
    "0xeecD96e5684f1B49C2775fAdbE5De6Ecb012F2cB"
  );
  console.log("Balance:", hre.ethers.formatEther(balance), "MNT");
}

main().catch(console.error);