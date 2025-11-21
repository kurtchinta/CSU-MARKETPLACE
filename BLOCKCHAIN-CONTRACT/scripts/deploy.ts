import hre, { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting CSUMarketplace Contract Deployment");
  console.log("===============================================");
  console.log("Network:", hre.network.name);
  console.log("Timestamp:", new Date().toISOString());

  // Environment verification
  console.log("\n🔧 Environment Verification:");
  console.log("- SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? "✅ Loaded" : "❌ Missing");
  console.log("- SEPOLIA_PRIVATE_KEY:", process.env.SEPOLIA_PRIVATE_KEY ? "✅ Loaded" : "❌ Missing");
  console.log("- ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY ? "✅ Loaded" : "❌ Missing");

  // Pre-deployment checks
  if (hre.network.name === "sepolia") {
    console.log("\n⚠️  PRODUCTION DEPLOYMENT TO SEPOLIA TESTNET");
    console.log("Please ensure you have:");
    console.log("1. Sufficient Sepolia ETH for gas fees");
    console.log("2. Correct SEPOLIA_RPC_URL in .env");
    console.log("3. Valid SEPOLIA_PRIVATE_KEY in .env");
    console.log("4. ETHERSCAN_API_KEY for contract verification");
    
    // Validate environment variables
    if (!process.env.SEPOLIA_RPC_URL) {
      throw new Error("❌ SEPOLIA_RPC_URL not found in environment variables");
    }
    if (!process.env.SEPOLIA_PRIVATE_KEY) {
      throw new Error("❌ SEPOLIA_PRIVATE_KEY not found in environment variables");
    }
  }

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("\n💼 Deployer Information:");
  console.log("Address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Minimum balance check for Sepolia
  if (hre.network.name === "sepolia" && balance < ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient ETH balance. Need at least 0.01 ETH for deployment and operations.");
  }

  // Get current gas price
  const gasPrice = await ethers.provider.getFeeData();
  console.log("⛽ Current Gas Price:", ethers.formatUnits(gasPrice.gasPrice || 0, "gwei"), "gwei");

  console.log("\n📦 Deploying CSUMarketplace contract...");

  // Deploy CSUMarketplace contract
  const CSUMarketplace = await ethers.getContractFactory("CSUMarketplace");
  const csuMarketplace = await CSUMarketplace.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await csuMarketplace.waitForDeployment();

  const contractAddress = await csuMarketplace.getAddress();
  console.log("\n✅ CSUMarketplace Successfully Deployed!");
  console.log("📍 Contract Address:", contractAddress);
  
  // Contract verification for Sepolia
  if (hre.network.name === "sepolia") {
    console.log("\n🔍 Initiating Contract Verification...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️  Verification failed (this is okay):", error);
    }
  }

  // Output deployment summary
  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("=====================");
  console.log("✓ Network:", hre.network.name);
  console.log("✓ Contract:", "CSUMarketplace");
  console.log("✓ Address:", contractAddress);
  console.log("✓ Deployer:", deployer.address);
  console.log("✓ Timestamp:", new Date().toISOString());
  
  if (hre.network.name === "sepolia") {
    console.log("\n🌐 Next Steps:");
    console.log("1. Update frontend with contract address:", contractAddress);
    console.log("2. Test contract functions through etherscan");
    console.log("3. Update database with contract address");
    console.log("4. Begin integration testing");
    console.log("\n🎉 PRODUCTION DEPLOYMENT COMPLETE!");
    console.log("Your CSUMarketplace contract is now live on Sepolia testnet!");
    console.log("Save this contract address for your frontend integration:");
    console.log(`📋 ${contractAddress}`);
  }

  console.log("\n✅ Deployment script completed successfully!");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });