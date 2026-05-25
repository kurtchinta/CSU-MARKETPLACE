// Contract configuration for CSU Marketplace
// ABI aligned with CSUMarketplace.json (v5.0.0 deployed to Sepolia Nov 12, 2025)
// ✅ String-based types: "FOR_SALE", "FOR_RENT", "SERVICE", "PENDING", "ACCEPTED", etc.
export const CONTRACT_CONFIG = {
  // Deployed contract address on Sepolia (Updated: Nov 26, 2025 - v6.6 Refactored - PII Removed)
  CSU_MARKETPLACE_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS || "0x7597d6fe0329aF3DD4b47E7874f1745ADa9C9AaE",
  
  // Network configuration
  SEPOLIA_CHAIN_ID: 11155111,
  SEPOLIA_RPC_URL: import.meta.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/f-O6qxnDJjfK4jD1MVhvF",
  
  // Main transaction functions aligned with CSUMarketplace.sol
  TRANSACTION_ABI: [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "supabaseId",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "buyerName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "sellerName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "sellerPhone",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "itemName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "itemDescription",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "listingType",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "pickupLocation",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "meetupLocation",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        }
      ],
      "name": "createTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "supabaseId",
          "type": "string"
        }
      ],
      "name": "acceptTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "supabaseId",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "rejectionReason",
          "type": "string"
        }
      ],
      "name": "rejectTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "supabaseId",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "cancellationReason",
          "type": "string"
        }
      ],
      "name": "cancelTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "supabaseId",
          "type": "string"
        }
      ],
      "name": "completeTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
};

// Helper function to get contract address with validation
export const getContractAddress = (): string => {
  const address = CONTRACT_CONFIG.CSU_MARKETPLACE_ADDRESS;
  if (!address) {
    console.error('Contract: Address not configured - check VITE_CONTRACT_ADDRESS environment variable');
    throw new Error('Contract address not configured. Please set VITE_CONTRACT_ADDRESS environment variable.');
  }
  console.log('Contract: Using address:', address);
  return address;
};

// Helper function to check if we're on the correct network
export const isCorrectNetwork = async (): Promise<boolean> => {
  if (!window.ethereum) {
    console.log('Contract: No wallet detected for network check');
    return false;
  }
  
  try {
    console.log('Contract: Checking network configuration...');
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    const isCorrect = currentChainId === CONTRACT_CONFIG.SEPOLIA_CHAIN_ID;
    
    if (isCorrect) {
      console.log('Contract: Connected to correct network (Sepolia)');
    } else {
      console.log('Contract: Wrong network - Expected Sepolia (11155111), got:', currentChainId);
    }
    
    return isCorrect;
  } catch (error) {
    console.error('Contract: Error checking network:', error);
    return false;
  }
};

// Helper function to switch to Sepolia network
export const switchToSepoliaNetwork = async (): Promise<boolean> => {
  if (!window.ethereum) {
    console.log('Contract: No wallet available for network switch');
    return false;
  }
  
  try {
    console.log('Contract: Requesting network switch to Sepolia...');
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CONTRACT_CONFIG.SEPOLIA_CHAIN_ID.toString(16)}` }],
    });
    console.log('Contract: Successfully switched to Sepolia network');
    return true;
  } catch (error) {
    console.error('Contract: Failed to switch network:', error);
    return false;
  }
};