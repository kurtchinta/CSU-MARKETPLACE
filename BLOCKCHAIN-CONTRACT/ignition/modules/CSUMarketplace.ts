// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CSUMarketplaceModule = buildModule("CSUMarketplaceModule", (m) => {
  // Deploy CSUMarketplace contract (no constructor parameters needed)
  const csuMarketplace = m.contract("CSUMarketplace", []);

  // Return the deployed contract instance
  return { csuMarketplace };
});

export default CSUMarketplaceModule;