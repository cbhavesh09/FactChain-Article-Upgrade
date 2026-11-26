const fs = require("node:fs/promises");
const path = require("node:path");
const { ethers, network } = require("hardhat");

async function main() {
  if (network.name !== "localhost") throw new Error("Use --network localhost to load the local sample catalog.");
  const address = process.env.FACTCHAIN_CONTRACT_ADDRESS;
  if (!ethers.isAddress(address || "") || await ethers.provider.getCode(address) === "0x") {
    throw new Error("Set FACTCHAIN_CONTRACT_ADDRESS to the deployed local registry.");
  }
  const staked = process.env.FACTCHAIN_STAKED_REGISTRY === "true";
  const registry = await ethers.getContractAt(staked ? "StakedArticleLeaderboard" : "ArticleLeaderboard", address);
  const overrides = staked ? { value: await registry.STAKE() } : {};
  const present = new Set((await registry.getLeaderboard()).map(entry => entry.title));
  const catalog = path.resolve(__dirname, "../../demo/corpus");
  const records = JSON.parse(await fs.readFile(path.join(catalog, "index.json"), "utf8"));
  const api = (process.env.FACTCHAIN_IPFS_API_URL || "http://127.0.0.1:5001/api/v0").replace(/\/$/, "");
  for (const { title, cid } of records) {
    if (present.has(title)) continue;
    const data = new FormData();
    data.append("file", new Blob([await fs.readFile(path.join(catalog, cid + ".txt"))]), title + ".txt");
    const response = await fetch(api + "/add?pin=true", { method: "POST", body: data, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`IPFS upload failed for ${title}: HTTP ${response.status}`);
    const { Hash: uploadedCid } = await response.json();
    if (!uploadedCid) throw new Error(`IPFS did not return a CID for ${title}`);
    const tx = await registry.submitArticle(title, uploadedCid, overrides);
    await tx.wait();
    console.log(`${title} -> ${uploadedCid}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

