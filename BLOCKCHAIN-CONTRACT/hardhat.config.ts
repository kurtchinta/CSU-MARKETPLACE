import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";


// Load .env from the main project folder (CSU-MARKETPLACE/csu-marketplace/.env)
dotenv.config({ path: path.resolve(__dirname, "../CSU-MARKETPLACE/csu-marketplace/.env") });

// Verify environment variables are loaded
console.log("🔧 Environment Check:");
console.log("- SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "✅ Loaded" : "❌ Missing");
console.log("- SEPOLIA_PRIVATE_KEY:", process.env.SEPOLIA_PRIVATE_KEY ? "✅ Loaded" : "❌ Missing");
console.log("- ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY ? "✅ Loaded" : "❌ Missing");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true  // ✅ Enable IR optimizer to fix "Stack too deep" errors
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  }
  // ✅ Deployed Contract V6.6 (Wallet-Agnostic): 0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564
  // Etherscan: https://sepolia.etherscan.io/address/0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564
};

export default config;