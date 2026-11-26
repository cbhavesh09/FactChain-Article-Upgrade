import { createContext, useEffect, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, isAddress } from "ethers";
import standardArtifact from "../contract/ArticleLeaderboard.json";
import stakedArtifact from "../contract/StakedArticleLeaderboard.json";
import { ensureWalletNetwork } from "./walletNetwork.mjs";

export const Web3Context = createContext(null);

const staking = import.meta.env.VITE_STAKED_REGISTRY === "true";
const artifact = staking ? stakedArtifact : standardArtifact;
const contractAddress = import.meta.env.VITE_LEADERBOARD_ADDRESS || "";
const readRpc = import.meta.env.VITE_READ_RPC_URL;
const reader = readRpc && isAddress(contractAddress)
  ? new Contract(contractAddress, artifact.abi, new JsonRpcProvider(readRpc))
  : null;

const legacyAddress = import.meta.env.VITE_LEGACY_LEADERBOARD_ADDRESS;
const legacyReader = readRpc && isAddress(legacyAddress || "")
  ? new Contract(legacyAddress, standardArtifact.abi, new JsonRpcProvider(readRpc))
  : null;

const olderAddress = import.meta.env.VITE_OLDER_LEADERBOARD_ADDRESS;
const olderReader = readRpc && isAddress(olderAddress || "")
  ? new Contract(olderAddress, standardArtifact.abi, new JsonRpcProvider(readRpc))
  : null;

export function Web3Provider({ children }) {
  const [session, setSession] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet?.on) return;
    const reset = () => setSession(null);
    wallet.on("accountsChanged", reset);
    wallet.on("chainChanged", reset);
    return () => {
      wallet.removeListener("accountsChanged", reset);
      wallet.removeListener("chainChanged", reset);
    };
  }, []);

  async function connectWallet() {
    setWalletError("");
    setConnecting(true);
    try {
      if (!window.ethereum) throw new Error("Install a browser wallet to connect.");
      const address = contractAddress;
      if (!isAddress(address || "")) throw new Error("Configure the FactChain contract address first.");
      const chainId = BigInt(import.meta.env.VITE_CHAIN_ID || "31337");
      await ensureWalletNetwork(window.ethereum, chainId, readRpc);
      const provider = new BrowserProvider(window.ethereum);
      if ((await provider.getCode(address)) === "0x") {
        throw new Error("FactChain is not deployed at the configured address on this network.");
      }
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const balance = await provider.getBalance(userAddress).catch(() => null);
      setSession({
        userAddress,
        walletBalance: balance === null ? null : formatEther(balance),
        leaderboard: new Contract(address, artifact.abi, signer),
      });
    } catch (error) {
      setWalletError(error.shortMessage || error.message);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Web3Context.Provider value={{ ...session, staking, legacyReader, olderReader, reader: reader ?? session?.leaderboard, walletError, connecting, connectWallet }}>
      {children}
    </Web3Context.Provider>
  );
}







