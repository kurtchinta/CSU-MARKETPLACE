# CSU Marketplace - AI Agent Guidelines

## Project Architecture

This is a **Hardhat 3 Beta TypeScript project** for CSU Marketplace smart contract development using modern blockchain tooling.

**GitHub Repository**: https://github.com/kurtchinta/CSU-MARKETPLACE

### Key Components
- **Smart Contract**: `contracts/Counter.sol` - Example contract (to be replaced with CSUMarketplace.sol)
- **Testing**: Foundry-compatible Solidity tests + TypeScript integration tests using Hardhat + ethers.js
- **Build System**: Hardhat 3 Beta with TypeScript configuration (`hardhat.config.ts`)
- **Deployment**: Hardhat Ignition modules in `ignition/modules/`

## Critical Development Workflows

### Smart Contract Development
```bash
# Compile contracts
npx hardhat compile

# Run all tests (Solidity + TypeScript with ethers.js)
npx hardhat test

# Run only Solidity tests
npx hardhat test solidity

# Deploy to Sepolia testnet via Ignition
npx hardhat ignition deploy ignition/modules/Counter.ts --network sepolia

# Interactive console for debugging
npx hardhat console --network sepolia
```

### Project Structure
```
CSU-MARKETPLACE/
├── contracts/          # Solidity smart contracts
├── test/              # TypeScript tests using ethers.js
├── ignition/modules/  # Hardhat Ignition deployment modules
├── scripts/           # Deployment and utility scripts
├── hardhat.config.ts  # Hardhat 3 Beta configuration
├── tsconfig.json      # TypeScript configuration
└── .gitignore         # Git ignore patterns
```

### Environment Setup
- Create `.env` file in project root with:
  - `SEPOLIA_RPC_URL`: Alchemy Sepolia endpoint `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
  - `SEPOLIA_PRIVATE_KEY`: Private key for deployment account
- Hardhat 3 uses `configVariable()` for environment variables (no dotenv package needed)
- Network configuration in `hardhat.config.ts` supports Sepolia testnet and local simulation

### Prerequisites for New Developers
```bash
# Required versions
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher

# Clone and setup
git clone https://github.com/kurtchinta/CSU-MARKETPLACE.git
cd CSU-MARKETPLACE
npm install

# Alchemy Setup:
# 1. Create account at https://www.alchemy.com/
# 2. Create new app for Ethereum Sepolia testnet
# 3. Copy API key and construct RPC URL: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# 4. Add to .env as SEPOLIA_RPC_URL

# MetaMask setup:
# - Install MetaMask browser extension
# - Add Sepolia testnet (Chain ID: 11155111, RPC: same Alchemy URL)
# - Get Sepolia ETH from faucets: https://sepoliafaucet.com/
```

## Architecture Patterns

### Smart Contract Focus
- **Current**: Simple Counter contract demonstrating basic functionality
- **Future**: CSUMarketplace contract with role-based access control and transaction logging
- **Testing**: TypeScript tests using Hardhat + ethers.js for contract interactions
- **Deployment**: Hardhat Ignition for reproducible deployments across networks

### Development Principles
- **Type Safety**: Full TypeScript integration across contracts, tests, and scripts
- **Modern Tooling**: Hardhat 3 Beta with enhanced TypeScript support
- **Network Support**: Local simulation (hardhatMainnet, hardhatOp) and Sepolia testnet
- **Event-Driven**: Contract events for transaction verification and state tracking

## Project-Specific Conventions

### File Organization
- **Hardhat config**: `hardhat.config.ts` using TypeScript with type-safe configuration
- **Contract artifacts**: Not committed - generated in `artifacts/` during compilation (see `.gitignore`)
- **TypeScript**: Full TypeScript setup with `tsconfig.json` for Node.js 22+ compatibility
- **Deployment modules**: Ignition modules in `ignition/modules/` (e.g., `Counter.ts`)
- **Tests**: TypeScript tests in `test/` using Hardhat + ethers.js patterns

### Testing Strategy
```bash
# TypeScript Contract Testing
npx hardhat test                      # Run all tests (Solidity + TypeScript)
npx hardhat test solidity           # Run only Solidity tests (Foundry-style)

# Test patterns in test/ directory:
# - Use ethers.deployContract("ContractName") for deployments
# - Event assertions: expect(tx).to.emit(contract, "Event").withArgs(...)
# - Event querying: contract.queryFilter(contract.filters.EventName(), fromBlock, toBlock)
# - BigInt comparisons for numerical values (e.g., 1n, total)

# Coverage and gas reporting
npx hardhat coverage                  # Generate test coverage report
```

### Contract Development Patterns
- **Event-Driven Design**: Emit events for state changes and important operations
- **Type Safety**: Use TypeScript throughout for contract interactions
- **Testing**: Focus on event emissions, state changes, and edge cases
- **Deployment**: Use Ignition modules for reproducible deployments

### Build and Deployment Workflow
```bash
# Standard development cycle
npx hardhat compile                   # Compile contracts
npx hardhat test                     # Run tests
npx hardhat ignition deploy ignition/modules/Counter.ts --network sepolia

# For new contracts:
# 1. Add contract to contracts/ directory
# 2. Create corresponding test in test/
# 3. Create Ignition module in ignition/modules/
# 4. Update this documentation with contract-specific patterns
```
- Dual authentication system: wallet + email/password

## Integration Points

### Contract Deployment & Testing
- **Local Development**: Use `npx hardhat node` for local blockchain simulation
- **Testnet Deployment**: Sepolia testnet via Alchemy RPC for realistic testing
- **Ignition Modules**: Reproducible deployments with parameter management
- **Event Verification**: Test contract events using ethers.js event filtering

### Critical Dependencies
- **ethers.js**: v6.x for blockchain interactions and contract deployment
- **Hardhat 3 Beta**: Modern TypeScript tooling with enhanced network support
- **TypeScript**: v5.8+ with Node.js 22 compatibility for type safety

## Common Gotchas

1. **Environment Variables**: Use `configVariable()` in Hardhat config, not dotenv
2. **Network Configuration**: Hardhat 3 uses typed network configs in `hardhat.config.ts`
3. **TypeScript Compilation**: Ensure Node.js 22+ compatibility in `tsconfig.json`
4. **Contract Deployment**: Use Ignition modules for reproducible deployments
5. **Test Patterns**: Use BigInt literals (e.g., `1n`) for numerical assertions
6. **Gas Costs**: Sepolia testnet requires ETH for gas - use faucets for testing
7. **Alchemy Rate Limits**: Free tier has 300 requests/second limit - monitor usage
8. **Artifacts**: Build artifacts in `artifacts/` are gitignored - regenerate with `npx hardhat compile`

### Automation Opportunities
```bash
# Consider adding these scripts to package.json:
# "test:coverage": "npx hardhat coverage"
# "deploy:sepolia": "npx hardhat ignition deploy ignition/modules/Counter.ts --network sepolia"
# "compile:check": "npx hardhat compile --force"
```

## Testing & Debugging

### Smart Contract Debugging
```bash
npx hardhat console --network sepolia    # Interactive contract debugging
npx hardhat node                        # Local blockchain for testing
npx hardhat ignition deploy ignition/modules/Counter.ts --network localhost

# Alchemy Dashboard Monitoring:
# - View transaction history and status at https://dashboard.alchemy.com/
# - Monitor API usage and rate limits
# - Debug failed transactions with detailed logs
```

### TypeScript Testing Patterns
- **Event Testing**: Use `expect(tx).to.emit(contract, "EventName").withArgs(...)`
- **State Verification**: Direct contract calls with BigInt comparisons
- **Event Filtering**: Query historical events with `contract.queryFilter()`
- **Error Handling**: Test revert conditions with `expect(tx).to.be.revertedWith("message")`

### Common Error Patterns
- `Cannot read properties of undefined`: Check contract deployment and network connection
- `Transaction reverted`: Verify contract logic and function parameters
- `Network connection issues`: Check Alchemy API key and rate limits
- `TypeScript compilation errors`: Ensure proper typing for contract interactions
- `Gas estimation failed`: Check contract state and function requirements