const localChainId = 31337n;

export async function ensureWalletNetwork(wallet, chainId, rpcUrl) {
  const currentChain = () => wallet.request({ method: "eth_chainId" });
  if (BigInt(await currentChain()) === chainId) return;

  const hexChainId = "0x" + chainId.toString(16);
  const switchChain = () => wallet.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: hexChainId }],
  });

  try {
    await switchChain();
  } catch (error) {
    const code = Number(error.data?.originalError?.code ?? error.code);
    if (code !== 4902) throw error;
    if (chainId !== localChainId) {
      throw new Error(`Add chain ${chainId} to your wallet, then connect again.`);
    }
    await wallet.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: hexChainId,
        chainName: "FactChain Local",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [rpcUrl || "http://127.0.0.1:8545"],
      }],
    });
    if (BigInt(await currentChain()) !== chainId) await switchChain();
  }

  if (BigInt(await currentChain()) !== chainId) {
    throw new Error(`Your wallet is still on a different network. Select chain ${chainId} and try again.`);
  }
}
