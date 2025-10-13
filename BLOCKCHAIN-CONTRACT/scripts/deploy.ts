import hre, { ethers } from "hardhat";

async function main() {
  // Get the current timestamp and add 1 year for unlock time
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const unlockTime = currentTimestampInSeconds + 365 * 24 * 60 * 60; // +1 year

  const lockedAmount = ethers.parseEther("0.001");

  console.log("Deploying Lock contract...");
  console.log("Unlock time:", new Date(unlockTime * 1000));
  console.log("Locked amount:", ethers.formatEther(lockedAmount), "ETH");

  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  await lock.waitForDeployment();

  const contractAddress = await lock.getAddress();
  console.log("Lock contract deployed to:", contractAddress);
  console.log("Network:", hre.network.name);
  
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    const deployTx = lock.deploymentTransaction();
    if (deployTx) {
      console.log("Contract deployment transaction:", deployTx.hash);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});