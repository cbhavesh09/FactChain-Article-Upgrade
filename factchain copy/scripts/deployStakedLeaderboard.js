const { ethers } = require("hardhat");

async function main() {
  const registry = await (await ethers.getContractFactory("StakedArticleLeaderboard")).deploy();
  await registry.waitForDeployment();
  console.log("StakedArticleLeaderboard deployed to:", await registry.getAddress());
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

