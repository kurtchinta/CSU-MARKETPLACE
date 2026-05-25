# CSU Marketplace - AI Agent Guidelines

## Project Overview

**CSU Marketplace** is a hybrid blockchain-integrated campus trading platform for Cagayan State University students and faculty, combining traditional web technologies (React + Supabase) with Ethereum smart contracts for immutable transaction records.

**GitHub Repository**: https://github.com/kurtchinta/CSU-MARKETPLACE

### Dual-Workspace Architecture

```
CSU-MARKETPLACE/
├── BLOCKCHAIN-CONTRACT/        # Hardhat 2 smart contract workspace
│   ├── contracts/             # Solidity contracts (CSUMarketplace.sol)
│   ├── test/                  # TypeScript contract tests
│   ├── ignition/modules/      # Hardhat Ignition deployment
│   └── hardhat.config.ts      # Loads .env from frontend workspace
└── CSU-MARKETPLACE/csu-marketplace/  # React + Vite frontend
    ├── src/                   # Frontend application code
    │   ├── context/          # React Context (Auth, Wallet, Cart)
    │   ├── services/         # API services (blockchain, auth, products)
    │   ├── pages/            # Route components
    │   ├── database/         # PostgreSQL schema files
    │   └── contractJSON/     # Compiled contract ABI
    └── .env                   # Shared environment variables
```

**Critical:** The blockchain workspace loads `.env` from the frontend workspace (see `hardhat.config.ts` path resolution)

## Critical Development Workflows

### Frontend Development (React + Vite)
```bash
cd CSU-MARKETPLACE/csu-marketplace
npm run dev              # Start dev server (port 5173)
npm run build            # Production build (TypeScript + Vite)
npm run lint             # ESLint validation
```

**Key Services Pattern:** All API logic is centralized in `src/services/`:
- `authService.ts` - Supabase Auth (login, register, profile management)
- `blockchainService.ts` - Smart contract interactions (ethers.js v6)
- `productService.ts` - Product CRUD operations
- `orderService.ts` - Order management and transaction flow

**Context Architecture:** React Context API for global state:
- `AuthContext` - User authentication (auto-refreshes tokens every 14 min)
- `WalletContext` - MetaMask wallet connection (wraps `useWallet` hook)
- `CartContext` - Shopping cart state management
- `DirectCheckoutContext` - Single-item checkout flow

### Smart Contract Development (Hardhat 2)
```bash
cd BLOCKCHAIN-CONTRACT
npm run compile                          # Compile contracts (generates artifacts + typechain)
npm run test                            # Run TypeScript tests with Chai matchers
npm run deploy:ignition:sepolia         # Deploy to Sepolia via Ignition
npx hardhat verify --network sepolia <ADDRESS>  # Verify on Etherscan
```

**Current Deployment:** CSUMarketplace V6.6 at `0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564` (Sepolia)
- Etherscan: https://sepolia.etherscan.io/address/0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564
- See `BLOCKCHAIN-CONTRACT/DEPLOYMENT-V6.5.md` for deployment details

### Environment Setup
- Create `.env` file in `CSU-MARKETPLACE/csu-marketplace/` with:
  - `VITE_SUPABASE_URL`: Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
  - `VITE_CONTRACT_ADDRESS`: Deployed contract address (V6.6: `0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564`)
  - `SEPOLIA_RPC_URL`: Alchemy Sepolia endpoint `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
  - `SEPOLIA_PRIVATE_KEY`: Private key for deployment account (DO NOT COMMIT)
  - `ETHERSCAN_API_KEY`: For contract verification
- Hardhat 2 uses `dotenv` with path resolution to load `.env` from frontend workspace
- Network configuration in `hardhat.config.ts` supports Sepolia testnet and localhost

### Prerequisites for New Developers
```bash
# Required versions
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher

# Clone and setup
git clone https://github.com/kurtchinta/CSU-MARKETPLACE.git
cd CSU-MARKETPLACE/CSU-MARKETPLACE/csu-marketplace
npm install

# Setup blockchain workspace
cd ../../BLOCKCHAIN-CONTRACT
npm install

# Alchemy Setup:
# 1. Create account at https://www.alchemy.com/
# 2. Create new app for Ethereum Sepolia testnet
# 3. Copy API key and construct RPC URL: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# 4. Add to .env as SEPOLIA_RPC_URL

# MetaMask setup:
# - Install MetaMask browser extension
# - Add Sepolia testnet (Chain ID: 11155111, RPC: same Alchemy URL)
# - Get Sepolia ETH from faucets: https://sepoliafaucet.com/ or https://www.alchemy.com/faucets/ethereum-sepolia
```

## Architecture Patterns

### Transaction Flow: The Multi-Transaction Model

**Critical Concept:** Each status change creates a NEW immutable blockchain transaction. This is the core architectural pattern:

1. **Buyer Places Order** → `createTransaction()` → Blockchain ID #1 (Status: PENDING)
2. **Seller Accepts** → `acceptTransaction()` → Blockchain ID #2 (Status: ACCEPTED)
3. **Seller Rejects** → `rejectTransaction()` → Blockchain ID #3 (Status: REJECTED)
4. **Buyer Cancels** → `cancelTransaction()` → Blockchain ID #4 (Status: CANCELLED)
5. **Order Completed** → `completeTransaction()` → Blockchain ID #5 (Status: COMPLETED)

**Implementation:**
- Supabase `order_details` table: One row per order (mutable state)
- Supabase `transactions` table: One row per status change (linked to blockchain)
- Blockchain: Permanent audit trail with `_orderTransactionHistory` mapping

**Example:** See `CheckoutPage.tsx` (createTransaction) and `MyOrdersPage.tsx` (accept/reject/complete)

### Dual Authentication System

Users authenticate with **both** credentials AND wallet:
1. **Primary Auth:** Supabase Auth (email/password) with JWT tokens
   - Session persists in localStorage (see `supabase.ts` config)
   - Auto-refresh every 14 minutes (see `AuthContext.tsx` token refresh timer)
2. **Blockchain Auth:** MetaMask wallet connection (optional but required for transactions)
   - Wallet address stored in `users.wallet_address` column
   - Sepolia testnet (Chain ID: 11155111)

**Key Files:**
- `src/context/AuthContext.tsx` - Session management with proactive token refresh
- `src/hooks/useWallet.ts` - MetaMask integration with network detection
- `src/services/authService.ts` - Supabase Auth API wrapper

### Database-Blockchain Synchronization

**Pattern:** Write to Supabase FIRST, then blockchain IMMEDIATELY after:

```typescript
// 1. Insert into Supabase (fast, queryable)
const { data: order } = await supabase.from('order_details').insert({...});

// 2. Record on blockchain (immutable, audit trail)
const result = await blockchainService.createTransaction({
  supabaseId: order.order_id,
  orderId: order.order_id,
  ...orderData
});

// 3. Update Supabase with blockchain data
await supabase.from('transactions').insert({
  order_id: order.order_id,
  blockchain_id: result.blockchainId,
  tx_hash: result.txHash,
  transaction_status: 'pending'
});
```

**Why this order?**
- Supabase provides fast UI updates and queries
- Blockchain provides immutable proof (can't be altered/deleted)
- If blockchain fails, rollback Supabase transaction

## Project-Specific Conventions

### Service Layer Pattern

**DO:** Call services directly from components (no unnecessary hooks)
```typescript
// ✅ GOOD: Direct service import
import blockchainService from '../services/blockchainService';
const result = await blockchainService.createTransaction(data);
```

**DON'T:** Create wrapper hooks unless adding component-specific state
```typescript
// ❌ BAD: Unnecessary wrapper (useBlockchain is deprecated)
import { useBlockchain } from '../hooks/useBlockchain';
```

### TypeScript Patterns

**Context Providers:** Always export both context AND custom hook
```typescript
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
};
```

**Blockchain Types:** Use `ethers.js v6` patterns (NOT v5)
```typescript
// ✅ V6: BigInt native support
const price = 100n;  // BigInt literal
const txHash = await contract.createTransaction(...);

// ❌ V5: Don't use BigNumber
// const price = ethers.BigNumber.from(100);
```

### Database Conventions

**Enum Naming:** Database uses lowercase with underscores, TypeScript uses camelCase:
```typescript
// Database: transaction_status ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled')
// TypeScript: TransactionStatus = 'pending' | 'accepted' | ...
```

**RLS Policies:** All tables have Row Level Security enabled (see `FINALIZED-OPTIMIZED-SCHEMA.sql`)
- Users can only update their own records
- Admins bypass RLS for management operations

### React Component Structure

**Page Components:** Located in `src/pages/`, handle routing and data fetching
**Shared Components:** Located in `src/components/`, reusable UI elements

**Example Pattern:**
```typescript
// CheckoutPage.tsx - orchestrates checkout flow
// - Fetches cart data from CartContext
// - Calls blockchainService.createTransaction()
// - Updates UI based on result
// - NO business logic in component (use services)
```

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
npx hardhat ignition deploy ignition/modules/CSUMarketplace.ts --network sepolia

# For new contracts:
# 1. Add contract to contracts/ directory
# 2. Create corresponding test in test/
# 3. Create Ignition module in ignition/modules/
# 4. Copy compiled ABI to frontend: artifacts/contracts/CSUMarketplace.sol/CSUMarketplace.json
# 5. Update CONTRACT_ADDRESS in frontend .env
# 6. Update this documentation with contract-specific patterns
```

## Common Gotchas

1. **Hardhat Version**: This project uses Hardhat 2, not Hardhat 3 Beta
2. **Environment Variables**: Loaded via `dotenv` from `../CSU-MARKETPLACE/csu-marketplace/.env`
3. **Dual Workspaces**: Frontend and blockchain are separate npm projects
4. **Contract Deployment**: Always update frontend ABI after redeploying contracts
5. **Test Patterns**: Use BigInt literals (e.g., `1n`) for numerical assertions
6. **Gas Costs**: Sepolia testnet requires ETH for gas - use faucets for testing
7. **Alchemy Rate Limits**: Free tier has 300 requests/second limit - monitor usage
8. **Auth Context Loading**: UI renders before profile loads - check `user` not `profile` for auth state
9. **Service vs Hooks**: Use `blockchainService` directly, not deprecated `useBlockchain` hook
10. **Transaction Model**: Remember that each status change creates a NEW blockchain transaction

### Automation Opportunities
```bash
# Frontend development server runs on port 5173
# Blockchain tests use Hardhat Network (in-memory blockchain)
# Deploy pipeline: compile → test → deploy:ignition:sepolia → copy ABI → update .env
```

## Testing & Debugging

### Smart Contract Debugging
```bash
npx hardhat console --network sepolia    # Interactive contract debugging
npx hardhat node                        # Local blockchain for testing
npx hardhat ignition deploy ignition/modules/CSUMarketplace.ts --network localhost

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