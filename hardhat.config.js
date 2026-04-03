require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // hardhat default
const ETHERSCAN_KEY   = process.env.ETHERSCAN_API_KEY   || "";
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_API_KEY || "";
const ARBISCAN_KEY    = process.env.ARBISCAN_API_KEY    || "";
const BASESCAN_KEY    = process.env.BASESCAN_API_KEY    || "";
const BSCSCAN_KEY     = process.env.BSCSCAN_API_KEY     || "";
const SNOWTRACE_KEY   = process.env.SNOWTRACE_API_KEY   || "";

const ALCHEMY_POLYGON  = process.env.ALCHEMY_POLYGON_URL  || "";
const ALCHEMY_ARBITRUM = process.env.ALCHEMY_ARBITRUM_URL || "";
const ALCHEMY_BASE     = process.env.ALCHEMY_BASE_URL     || "";
const ALCHEMY_ETH      = process.env.ALCHEMY_ETH_URL      || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: true
    }
  },

  networks: {
    // ── Local ────────────────────────────────────────────────────────────────
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },

    // ── Testnets ─────────────────────────────────────────────────────────────
    // Polygon Amoy (replaces deprecated Mumbai)
    polygon_amoy: {
      url: process.env.POLYGON_AMOY_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [DEPLOYER_KEY],
      gasPrice: 10_000_000_000  // 10 gwei – keeps each tx under Hardhat's 1 MATIC fee cap
    },
    // Ethereum Sepolia
    sepolia: {
      url: process.env.SEPOLIA_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    // Arbitrum Sepolia (replaces deprecated Goerli)
    arbitrum_sepolia: {
      url: process.env.ARBITRUM_SEPOLIA_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    // Base Sepolia (replaces deprecated Base Goerli)
    base_sepolia: {
      url: process.env.BASE_SEPOLIA_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    // BSC Testnet
    bsc_testnet: {
      url: process.env.BSC_TESTNET_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [DEPLOYER_KEY],
      gasPrice: 10_000_000_000
    },
    // Avalanche Fuji
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },

    // ── Mainnets ─────────────────────────────────────────────────────────────
    ethereum: {
      url: ALCHEMY_ETH || "https://eth.llamarpc.com",
      chainId: 1,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    polygon: {
      url: ALCHEMY_POLYGON || "https://polygon-rpc.com",
      chainId: 137,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    arbitrum: {
      url: ALCHEMY_ARBITRUM || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    base: {
      url: ALCHEMY_BASE || "https://mainnet.base.org",
      chainId: 8453,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: [DEPLOYER_KEY],
      gasPrice: 3_000_000_000
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [DEPLOYER_KEY],
      gasPrice: "auto"
    }
  },

  etherscan: {
    apiKey: {
      mainnet:        ETHERSCAN_KEY,
      polygon:        POLYGONSCAN_KEY,
      polygonAmoy:    POLYGONSCAN_KEY,
      sepolia:        ETHERSCAN_KEY,
      arbitrumSepolia: ARBISCAN_KEY,
      baseSepolia:    BASESCAN_KEY,
      arbitrumOne:    ARBISCAN_KEY,
      base:           BASESCAN_KEY,
      bsc:            BSCSCAN_KEY,
      avalanche:      SNOWTRACE_KEY
    }
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts"
  }
};
