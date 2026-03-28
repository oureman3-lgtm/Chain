import { BrowserProvider } from "ethers";

export let provider = null;
export let signer   = null;

const LOCAL_CHAIN_ID = "0x7a69"; // 31337

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install it.");
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });
  provider = new BrowserProvider(window.ethereum);

  // Switch to local Hardhat network if needed
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: LOCAL_CHAIN_ID }]
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: LOCAL_CHAIN_ID,
            chainName: "Hardhat Local",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
          }]
        });
      } else throw e;
    }
    provider = new BrowserProvider(window.ethereum);
  }

  signer = await provider.getSigner();
  return await signer.getAddress();
}

export function getAddress() {
  if (!signer) throw new Error("Wallet not connected");
  return signer.getAddress();
}

window.ethereum?.on("accountsChanged", () => window.location.reload());
window.ethereum?.on("chainChanged",    () => window.location.reload());
