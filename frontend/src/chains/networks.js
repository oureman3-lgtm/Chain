/**
 * networks.js – Multi-chain configuration for Axiom Wilds
 *
 * Each network entry contains:
 *   chainId        – EIP-155 chain ID (decimal)
 *   name           – human-readable name
 *   shortName      – compact label for UI badges
 *   rpcUrl         – public RPC endpoint
 *   explorerUrl    – block explorer base URL
 *   nativeCurrency – { name, symbol, decimals }
 *   color          – UI accent colour for this chain
 *   isTestnet      – true for testnets
 *   gasStrategy    – "low" | "medium" | "high" (default gas tier)
 *   deploymentFile – filename under /deployments/
 */

export const NETWORKS = {
  // ── Mainnets ────────────────────────────────────────────────────────────
  1: {
    chainId:    1,
    name:       "Ethereum",
    shortName:  "ETH",
    rpcUrl:     "https://eth.llamarpc.com",
    explorerUrl:"https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    color:      "#627EEA",
    isTestnet:  false,
    gasStrategy:"high",
    deploymentFile: "ethereum.json"
  },
  137: {
    chainId:    137,
    name:       "Polygon",
    shortName:  "MATIC",
    rpcUrl:     "https://polygon-rpc.com",
    explorerUrl:"https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    color:      "#8247E5",
    isTestnet:  false,
    gasStrategy:"low",
    deploymentFile: "polygon.json",
    recommended: true   // primary recommended chain (low gas)
  },
  42161: {
    chainId:    42161,
    name:       "Arbitrum One",
    shortName:  "ARB",
    rpcUrl:     "https://arb1.arbitrum.io/rpc",
    explorerUrl:"https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    color:      "#28A0F0",
    isTestnet:  false,
    gasStrategy:"low",
    deploymentFile: "arbitrum.json"
  },
  8453: {
    chainId:    8453,
    name:       "Base",
    shortName:  "BASE",
    rpcUrl:     "https://mainnet.base.org",
    explorerUrl:"https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    color:      "#0052FF",
    isTestnet:  false,
    gasStrategy:"low",
    deploymentFile: "base.json"
  },
  56: {
    chainId:    56,
    name:       "BNB Chain",
    shortName:  "BNB",
    rpcUrl:     "https://bsc-dataseed1.binance.org",
    explorerUrl:"https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    color:      "#F3BA2F",
    isTestnet:  false,
    gasStrategy:"low",
    deploymentFile: "bsc.json"
  },
  43114: {
    chainId:    43114,
    name:       "Avalanche",
    shortName:  "AVAX",
    rpcUrl:     "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl:"https://snowtrace.io",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    color:      "#E84142",
    isTestnet:  false,
    gasStrategy:"medium",
    deploymentFile: "avalanche.json"
  },

  // ── Testnets ────────────────────────────────────────────────────────────
  80001: {
    chainId:    80001,
    name:       "Polygon Mumbai",
    shortName:  "MUMBAI",
    rpcUrl:     "https://rpc-mumbai.maticvigil.com",
    explorerUrl:"https://mumbai.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    color:      "#8247E5",
    isTestnet:  true,
    gasStrategy:"low",
    deploymentFile: "polygon_mumbai.json"
  },
  421613: {
    chainId:    421613,
    name:       "Arbitrum Goerli",
    shortName:  "ARB-G",
    rpcUrl:     "https://goerli-rollup.arbitrum.io/rpc",
    explorerUrl:"https://goerli.arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    color:      "#28A0F0",
    isTestnet:  true,
    gasStrategy:"low",
    deploymentFile: "arbitrum_goerli.json"
  },
  31337: {
    chainId:    31337,
    name:       "Localhost",
    shortName:  "LOCAL",
    rpcUrl:     "http://127.0.0.1:8545",
    explorerUrl:"",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    color:      "#4CAF50",
    isTestnet:  true,
    gasStrategy:"low",
    deploymentFile: "localhost.json"
  }
};

export const MAINNET_CHAIN_IDS  = [1, 137, 42161, 8453, 56, 43114];
export const TESTNET_CHAIN_IDS  = [80001, 421613, 31337];
export const DEFAULT_CHAIN_ID   = 137; // Polygon – lowest gas for most players

export function getNetwork(chainId) {
  return NETWORKS[chainId] || null;
}

export function isSupported(chainId) {
  return !!NETWORKS[chainId];
}

/**
 * Build the MetaMask wallet_addEthereumChain parameter object for a given chainId.
 */
export function toWalletAddChainParams(chainId) {
  const n = NETWORKS[chainId];
  if (!n) throw new Error(`Unsupported chainId: ${chainId}`);
  return {
    chainId:            `0x${chainId.toString(16)}`,
    chainName:          n.name,
    rpcUrls:            [n.rpcUrl],
    nativeCurrency:     n.nativeCurrency,
    blockExplorerUrls:  n.explorerUrl ? [n.explorerUrl] : []
  };
}

/**
 * Switch MetaMask to a given chain, adding it if not yet configured.
 */
export async function switchToChain(chainId) {
  if (!window.ethereum) throw new Error("No wallet detected");
  const hexId = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (err) {
    if (err.code === 4902) {
      // Chain not added to wallet – add it first
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [toWalletAddChainParams(chainId)]
      });
    } else {
      throw err;
    }
  }
}
