import { ethers, BrowserProvider, Contract } from 'ethers';
import CSUMarketplaceABI from '../contractJSON/CSUMarketplace.json';

// ============================================================
// SMART CONTRACT V6.0.0 - STRUCT-BASED PARAMETERS
// ============================================================

/**
 * V6.0.0 uses STRUCT parameters instead of 24 individual params
 * - Fixes "Stack too deep" compilation errors
 * - All data still preserved and accessible
 * - listingType: "FOR_SALE", "FOR_RENT", "SERVICE"
 * - transactionStatus: "Pending", "Accepted", "Rejected", "Completed", "Cancelled"
 */

// Helper to convert database format to blockchain format
export const LISTING_TYPE_MAP: Record<string, string> = {
  'for_sale': 'FOR_SALE',
  'for_rent': 'FOR_RENT',
  'service': 'SERVICE',
};

export const STATUS_MAP: Record<string, string> = {
  'pending': 'Pending',
  'accepted': 'Accepted',
  'rejected': 'Rejected',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
};

// ============================================================
// NOTE: PaymentMethod enum REMOVED - v3.1.0 is CASH ONLY
// Payment is always CASH ON HAND at meetup location
// ============================================================

export interface DatabaseTransaction {
  transaction_id: string;
  order_id?: string;
  buyer_id?: string;
  seller_id?: string;
  
  // Product/Service details
  category?: string;
  item_name: string;
  item_description?: string;
  item_price: number;
  listing_type: string;
  quantity: number;
  
  // Location details
  meetup_location?: string;
  pickup_location?: string;
  final_pickup_location?: string;
  final_meetup_location?: string;
  
  // Common fields
  requirements?: string;
  contact_info?: string;
  message_to_seller?: string;
  
  // FOR_RENT specific
  return_condition?: string;
  rental_duration?: string;
  start_date?: string;
  end_date?: string;
  
  // SERVICE specific
  service_schedule?: string;
  service_duration?: string;
  
  // Status
  transaction_status: string;
  rejection_reason?: string;
  cancellation_reason?: string;
}

export interface DatabaseUser {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  wallet_address?: string;
  department?: string;
}

export interface BlockchainTransactionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: bigint | string;
  transactionReceipt?: any;
  blockchainTimestamp?: string;  // ISO string of blockchain timestamp
  message: string;
}

class BlockchainService {
  private provider: BrowserProvider | null = null;
  private signer: any = null;
  private contract: Contract | null = null;
  private contractAddress: string = '';

    constructor() {
    // Smart Contract Address on Sepolia Testnet (v6.6 - Deployed & Verified: Nov 18, 2025)
    // ✅ Wallet-agnostic: ANY wallet can perform ANY action (accept/reject/cancel/complete)
    // ✅ Multi-transaction model with newSupabaseId for each status change
    // ✅ Contract verified on Etherscan: https://sepolia.etherscan.io/address/0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564
    this.contractAddress = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS || 
                          import.meta.env.VITE_CONTRACT_ADDRESS || 
                          '0x3F1fa083D1103e6fea9e3Dd6c1E95b4505Ac6564';
    console.log('🔗 Smart Contract Address (v6.6):', this.contractAddress);
  }  async initializeProvider(): Promise<BrowserProvider | null> {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.BrowserProvider(window.ethereum);
      console.log('Provider initialized');
      
      return this.provider;
    } catch (error: any) {
      console.error('Failed to initialize provider:', error);
      throw new Error('Failed to connect to MetaMask: ' + error.message);
    }
  }

  async getSigner(): Promise<any> {
    try {
      if (!this.provider) {
        await this.initializeProvider();
      }

      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      this.signer = await this.provider.getSigner();
      console.log('Signer obtained');
      
      return this.signer;
    } catch (error: any) {
      console.error('Failed to get signer:', error);
      throw new Error('Failed to get signer: ' + error.message);
    }
  }

  async connectToContract(): Promise<Contract | null> {
    try {
      if (!this.signer) {
        await this.getSigner();
      }

      if (!this.signer) {
        throw new Error('Signer not available');
      }

      this.contract = new ethers.Contract(
        this.contractAddress,
        CSUMarketplaceABI.abi,
        this.signer
      );

      console.log('Connected to contract at:', this.contractAddress);
      return this.contract;
    } catch (error: any) {
      console.error('Failed to connect to contract:', error);
      throw new Error('Failed to connect to contract: ' + error.message);
    }
  }

  async switchToSepoliaNetwork(): Promise<boolean> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not available');
      }

      const SEPOLIA_CHAIN_ID = '0xaa36a7';

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
        console.log('Switched to Sepolia network');
        return true;
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/' + (import.meta.env.VITE_ALCHEMY_API_KEY || '')],
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          console.log('Added and switched to Sepolia network');
          return true;
        }
        throw switchError;
      }
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      throw new Error('Failed to switch to Sepolia network: ' + error.message);
    }
  }

  async recordTransaction(
    transactionData: DatabaseTransaction,
    userProfile: any,
    sellerProfile: any
  ): Promise<BlockchainTransactionResult> {
    try {
      console.log('');
      console.log('+------------------------------------------------------------------+');
      console.log('�         ?? BLOCKCHAIN DATA VERIFICATION & ENCODING PROCESS       �');
      console.log('+------------------------------------------------------------------+');
      console.log('');
      console.log('?? Recording transaction on CSUMarketplace contract...');
      console.log('?? Transaction data:', transactionData);
      console.log('');
      console.log('?? ABI ENCODING INFO:');
      console.log('   Contract uses ABI-encoded parameters for storage');
      console.log('   All string parameters will be encoded as hex with length prefixes');
      console.log('   Reference: https://docs.ethers.org/v6/api/abi/');
      console.log('');

      // ============================================================
      // STEP 0: NETWORK & WALLET CONNECTION
      // ============================================================
      console.log('📡 Step 0: Connecting to network and wallet...');
      
      await this.switchToSepoliaNetwork();

      const signer = await this.getSigner();
      if (!signer) {
        throw new Error('Failed to get signer - MetaMask not connected');
      }

      const signerAddress = await signer.getAddress();
      console.log('🔗 Connected wallet:', signerAddress);
      console.log('✅ Wallet connection established (any wallet can transact)');

      // Connect to contract
      await this.connectToContract();
      if (!this.contract) {
        throw new Error('Failed to connect to smart contract');
      }
      console.log('✅ Contract connection established');

      // ============================================================
      // STEP 0.5: CHECK FOR DUPLICATE TRANSACTION
      // ============================================================
      console.log('?? Step 0.5: Checking for existing transaction on blockchain...');
      console.log('   Transaction ID to check:', transactionData.transaction_id);
      
      try {
        const existingTxn = await this.contract.getTransaction(transactionData.transaction_id);
        
        if (existingTxn && existingTxn.buyer !== '0x0000000000000000000000000000000000000000') {
          console.log('??  Transaction already exists on blockchain');
          console.log('   Blockchain ID:', existingTxn.blockchainId?.toString());
          console.log('   Buyer:', existingTxn.buyer);
          console.log('   Status:', existingTxn.status);
          
          throw new Error(
            `Transaction already recorded on blockchain (ID: ${existingTxn.blockchainId?.toString()}). ` +
            `This order has already been processed. Please refresh the page.`
          );
        }
        console.log('? No duplicate transaction found - proceeding with creation');
      } catch (checkError: any) {
        // If error is "Transaction already exists", re-throw it
        if (checkError.message.includes('already recorded on blockchain')) {
          throw checkError;
        }
        // Otherwise, it might be that transaction doesn't exist (which is good)
        // or the contract doesn't have the getter function
        console.log('   Transaction not found on blockchain (this is expected for new orders)');
      }

      // ============================================================
      // STEP 1: PREPARE TRANSACTION PARAMETERS (V6.0.0)
      // ============================================================
      console.log('📝 Step 1: Preparing transaction parameters...');
      
      // Map listing type string to blockchain string format (V6.0.0)
      const listingTypeString = LISTING_TYPE_MAP[transactionData.listing_type] || 'FOR_SALE';

      // Get buyer and seller names
      const buyerName = userProfile 
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
        : 'Buyer';
      const sellerName = sellerProfile
        ? `${sellerProfile.first_name || ''} ${sellerProfile.last_name || ''}`.trim()
        : 'Seller';
      const sellerPhone = sellerProfile?.phone_number || '';
      
      // Use seller's wallet if available, otherwise use placeholder
      let sellerAddress = sellerProfile?.wallet_address;
      if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
        sellerAddress = '0x0000000000000000000000000000000000000001';
        console.log('⚠️  Seller wallet not set - using placeholder address');
      }
      
      // Convert price to uint256 (store actual PHP price, not wei)
      const priceAsUint256 = BigInt(Math.floor(transactionData.item_price));

      // ============================================================
      // V6.0.0: DECLARE ALL 24 PARAMETERS ONCE (will be passed as struct)
      // ============================================================
      const orderId = transactionData.order_id || transactionData.transaction_id;
      const category = transactionData.category || '';
      const quantity = BigInt(transactionData.quantity || 1);
      const requirements = transactionData.requirements || '';
      const contactInfo = transactionData.contact_info || '';
      const messageToSeller = transactionData.message_to_seller || '';
      const pickupLocation = transactionData.pickup_location || '';
      const meetupLocation = transactionData.meetup_location || '';
      const returnCondition = transactionData.return_condition || '';
      const rentalDuration = transactionData.rental_duration || '';
      const startDate = transactionData.start_date || '';
      const endDate = transactionData.end_date || '';
      const serviceSchedule = transactionData.service_schedule || '';
      const serviceDuration = transactionData.service_duration || '';

      console.log('📝 V6.0.0 Parameters prepared (will be sent as struct):');
      console.log('  - supabaseId:', transactionData.transaction_id);
      console.log('  - orderId:', orderId);
      console.log('  - buyer:', signerAddress);
      console.log('  - seller:', sellerAddress);
      console.log('  - category:', category);
      console.log('  - listingType:', listingTypeString);
      console.log('  - quantity:', quantity.toString());

      console.log('');
      console.log('--- PREPARING BLOCKCHAIN TRANSACTION DATA ---');
      console.log('');
      
      // Common fields for all listing types
      console.log('COMMON FIELDS:');
      console.log('  buyer_name:', buyerName.trim());
      console.log('  seller_name:', sellerName.trim());
      console.log('  seller_phone:', sellerPhone || '(empty)');
      console.log('  item_name:', transactionData.item_name);
      console.log('  item_price:', transactionData.item_price, 'PHP');
      console.log('  quantity:', transactionData.quantity);
      console.log('');
      
      // Type-specific fields
      if (listingTypeString === 'FOR_SALE') {
        console.log('FOR_SALE LISTING:');
        console.log('  category_name:', category);
        console.log('  pickup_location:', transactionData.pickup_location || '(empty)');
        console.log('  message_to_seller:', transactionData.message_to_seller || '(empty)');
      } else if (listingTypeString === 'FOR_RENT') {
        console.log('FOR_RENT LISTING:');
        console.log('  category_name:', category);
        console.log('  pickup_location:', transactionData.pickup_location || '(empty)');
        console.log('  rental_duration:', transactionData.rental_duration || '(empty)');
        console.log('  start_date:', transactionData.start_date || '(empty)');
        console.log('  end_date:', transactionData.end_date || '(empty)');
        console.log('  return_condition:', transactionData.return_condition || '(empty)');
        console.log('  message_to_seller:', transactionData.message_to_seller || '(empty)');
      } else if (listingTypeString === 'SERVICE') {
        console.log('SERVICE LISTING:');
        console.log('  category_name:', category);
        console.log('  meetup_location:', transactionData.meetup_location || '(empty)');
        console.log('  service_schedule:', transactionData.service_schedule || '(empty)');
        console.log('  service_duration:', transactionData.service_duration || '(empty)');
        console.log('  message_to_seller:', transactionData.message_to_seller || '(empty)');
      }
      console.log('');
      console.log('--- END BLOCKCHAIN DATA PREVIEW ---');

      // ============================================================
      // STEP 2: ESTIMATE GAS BEFORE TRANSACTION (V6.0.0 - STRUCT PARAMS)
      // ============================================================
      console.log('⛽ Step 2: Estimating gas for transaction...');
      
      // V6.0.0: Build params struct
      const params = {
        supabaseId: transactionData.transaction_id,
        orderId: orderId,
        buyerWallet: signerAddress,
        sellerWallet: sellerAddress,
        buyerName: buyerName.trim(),
        sellerName: sellerName.trim(),
        sellerPhone: sellerPhone,
        category: category,
        listingType: listingTypeString,
        itemName: transactionData.item_name,
        itemDescription: transactionData.item_description || '',
        itemPrice: priceAsUint256,
        quantity: quantity,
        pickupLocation: pickupLocation,
        meetupLocation: meetupLocation,
        requirements: requirements,
        contactInfo: contactInfo,
        returnCondition: returnCondition,
        rentalDuration: rentalDuration,
        startDate: startDate,
        endDate: endDate,
        serviceSchedule: serviceSchedule,
        serviceDuration: serviceDuration,
        messageToSeller: messageToSeller,
        transactionStatus: 'Pending'
      };
      
      let estimatedGas: bigint;
      try {
        // V6.0.0: Pass struct instead of 24 individual parameters
        estimatedGas = await this.contract.createTransaction.estimateGas(params);
        
        console.log('✅ Gas estimation successful');
        console.log('   Estimated gas:', estimatedGas.toString());
        console.log('   Gas limit (with 20% buffer):', (estimatedGas * 120n / 100n).toString());
        
        // Get current gas price with fallback for Sepolia
        let gasPrice = 0n;
        try {
          const feeData = await this.provider!.getFeeData();
          // Use gasPrice if available (legacy), otherwise try maxFeePerGas (EIP-1559)
          gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0n;
        } catch (feeError: any) {
          console.warn('⚠️ getFeeData failed, using fallback:', feeError.message);
          // Fallback: use a fixed gas price for Sepolia testnet
          gasPrice = BigInt(20 * 1e9); // 20 Gwei as fallback
        }
        
        const estimatedCost = estimatedGas * gasPrice;
        const estimatedCostEth = Number(estimatedCost) / 1e18;
        
        console.log('   Estimated gas price:', gasPrice.toString(), 'wei');
        console.log('   Estimated total cost:', estimatedCostEth.toFixed(6), 'ETH');
        
        // Check if user has enough balance
        const balance = await this.provider!.getBalance(signerAddress);
        const balanceEth = Number(balance) / 1e18;
        
        console.log('   Your balance:', balanceEth.toFixed(6), 'ETH');
        
        if (balance < estimatedCost) {
          throw new Error(
            `Insufficient funds for gas. You have ${balanceEth.toFixed(6)} ETH but need approximately ${estimatedCostEth.toFixed(6)} ETH. ` +
            `Please add more Sepolia ETH to your wallet.`
          );
        }
        console.log('✅ Sufficient balance for transaction');
        
      } catch (gasError: any) {
        console.error('❌ Gas estimation failed:', gasError);
        
        if (gasError.message.includes('Insufficient funds')) {
          throw gasError;
        }
        
        throw new Error(
          `Gas estimation failed: ${gasError.message}. ` +
          `This might indicate an issue with the transaction parameters or contract state. ` +
          `Please try again or contact support.`
        );
      }

      // ============================================================
      // STEP 3: EXECUTE BLOCKCHAIN TRANSACTION (V6.0.0 - STRUCT)
      // ============================================================
      console.log('📤 Step 3: Executing blockchain transaction...');
      console.log('   This will open MetaMask for approval...');
      
      // Build transaction options with proper gas configuration
      let txOptions: any = {};
      try {
        const feeData = await this.provider!.getFeeData();
        
        // Use legacy gas pricing if available
        if (feeData.gasPrice) {
          txOptions.gasPrice = feeData.gasPrice;
          console.log('   Using legacy gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'Gwei');
        } else if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // Use EIP-1559 if supported
          txOptions.maxFeePerGas = feeData.maxFeePerGas;
          txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
          console.log('   Using EIP-1559 fees');
        }
      } catch (feeError: any) {
        console.warn('⚠️ getFeeData failed for tx, using fallback gas price');
        txOptions.gasPrice = ethers.parseUnits('20', 'gwei');
      }
      
      txOptions.gasLimit = (estimatedGas * 120n / 100n);
      
      // V6.0.0: Call contract with STRUCT parameter (much cleaner!)
      const tx = await this.contract.createTransaction(params, txOptions);

      console.log('');
      console.log('✅ Transaction submitted to blockchain');
      console.log('📝 Transaction hash:', tx.hash);
      console.log('   🔗 Tip: Go to https://sepolia.etherscan.io/tx/' + tx.hash);
      console.log('   📊 Look at "Input Data" → "Decode Input Data" to see all 24 fields');
      console.log('   📋 Or check "Logs" section for human-readable TransactionCreated event');
      console.log('');

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed or was rejected on blockchain');
      }

      console.log('');
      console.log('+------------------------------------------------------------------+');
      console.log('│           ✅ ORDER SUCCESSFULLY RECORDED ON BLOCKCHAIN           │');
      console.log('+------------------------------------------------------------------+');
      console.log('');
      console.log('📊 BLOCKCHAIN CONFIRMATION DETAILS:');
      console.log('   Transaction Hash: ' + (receipt.transactionHash || tx.hash));
      console.log('   Block Number: ' + receipt.blockNumber);
      console.log('   Gas Used: ' + receipt.gasUsed.toString() + ' units');
      console.log('   Network: Sepolia Testnet (Chain ID: 11155111)');
      console.log('   Contract Address: ' + this.contractAddress);
      console.log('');
      console.log('📝 VERIFY YOUR DATA ON ETHERSCAN:');
      console.log('   URL: https://sepolia.etherscan.io/tx/' + (receipt.transactionHash || tx.hash));
      console.log('');
      console.log('??  IMPORTANT: How to View ALL 11 Fields (Including Numbers!)');
      console.log('');
      console.log('? METHOD 1 - VIEW LOGS TAB (EASIEST - RECOMMENDED):');
      console.log('');
      console.log('   Step 1: Click the "Logs" tab on your transaction page');
      console.log('   Step 2: You will see "TransactionCreated" event');
      console.log('   Step 3: Look at the decoded data - ALL fields are shown!');
      console.log('');
      console.log('   What you\'ll see in Logs:');
      console.log('   +---------------------------------------------------------+');
      console.log('   � Name: TransactionCreated                                �');
      console.log('   �                                                         �');
      console.log('   � blockchainId (indexed): 1                               �');
      console.log('   � buyer (indexed): 0x1234...                              �');
      console.log('   � Data (hex):                                             �');
      console.log('   │   - supabaseId: ' + transactionData.transaction_id.substring(0, 20) + '...      │');
      console.log('   │   - seller: 0xabcd...                                   │');
      console.log('   │   - buyerName: ' + buyerName.substring(0, 20).padEnd(20) + '                │');
      console.log('   │   - sellerName: ' + sellerName.substring(0, 20).padEnd(20) + '              │');
      console.log('   │   - sellerPhone: ' + sellerPhone.padEnd(20) + '                     │');
      console.log('   │   - listingType: ' + listingTypeString + ' (' + transactionData.listing_type + ')         │');
      console.log('   │   - itemName: ' + transactionData.item_name.substring(0, 20).padEnd(20) + '                  │');
      console.log('   │   - itemDescription: (full text)                        │');
      console.log('   │   - itemPrice: ' + transactionData.item_price + ' PHP                   │');
      console.log('   │   - quantity: ' + quantity.toString() + '                                      │');
      console.log('   │   - pickupLocation: ' + (transactionData.pickup_location || '(empty)').substring(0, 15).padEnd(15) + '                     │');
      console.log('   │   - meetupLocation: ' + (transactionData.meetup_location || '(empty)').substring(0, 15).padEnd(15) + '                     │');
      console.log('   │   - status: 0 (pending)                                 │');
      console.log('   │   - timestamp: ' + Math.floor(Date.now() / 1000) + ' (Unix)                        │');
      console.log('   +---------------------------------------------------------+');
      console.log('');
      console.log('   ? All fields are automatically decoded by Etherscan!');
      console.log('   ? Numbers show as decimal values, not garbage!');
      console.log('   ? Strings show as readable text!');
      console.log('');
      console.log('? METHOD 2 - USE CONTRACT READ FUNCTION:');
      console.log('');
      console.log('   Step 1: Go to contract page:');
      console.log('   https://sepolia.etherscan.io/address/0x737FA501E84BAC292F7E80f72D80701641CF98c6#readContract');
      console.log('');
      console.log('   Step 2: Find function "getTransaction" or similar');
      console.log('   Step 3: Enter your order ID: ' + transactionData.transaction_id);
      console.log('   Step 4: Click "Query"');
      console.log('   Step 5: See complete transaction with ALL fields decoded');
      console.log('');
      console.log('? DO NOT USE "View Input As UTF-8" - IT ONLY SHOWS STRINGS!');
      console.log('');
      console.log('   What UTF-8 shows you:');
      console.log('   ? buyerName, sellerName, sellerPhone ? Readable');
      console.log('   ? itemName, itemDescription ? Readable');
      console.log('   ? pickupLocation, meetupLocation ? Readable');
      console.log('   ? listingType ? Shows as "�" or garbage (it\'s a NUMBER!)');
      console.log('   ? itemPrice ? Shows as random bytes (it\'s a 32-byte NUMBER!)');
      console.log('   ? quantity ? Shows as garbage (it\'s a NUMBER!)');
      console.log('   ? status ? Shows as garbage (it\'s a NUMBER!)');
      console.log('   ? timestamp ? Shows as garbage (it\'s a NUMBER!)');
      console.log('');
      console.log('? All 11 key fields ARE stored correctly on blockchain!');
      console.log('   Use the LOGS tab to see them all properly decoded.');
      console.log('');

      // Fetch blockchain timestamp from the transaction
      let blockchainTimestamp: string | undefined;
      try {
        const txDetails = await this.contract.getTransactionBySupabaseId(transactionData.transaction_id);
        const unixTimestamp = Number(txDetails.createdAt);
        blockchainTimestamp = new Date(unixTimestamp * 1000).toISOString();
        
        console.log('   ');
        console.log('   📅 BLOCKCHAIN TIMESTAMP INFORMATION:');
        console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Unix Timestamp (on blockchain):', unixTimestamp);
        console.log('   Human Readable:', new Date(unixTimestamp * 1000).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        }));
        console.log('   ISO Format (for database):', blockchainTimestamp);
        console.log('   ');
        console.log('   ℹ️  NOTE: Etherscan shows Unix timestamps (e.g., ' + unixTimestamp + ')');
        console.log('   This is normal - blockchain stores time as seconds since 1970');
        console.log('   The app converts it to human-readable format automatically.');
        console.log('   ');
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch blockchain timestamp:', fetchError);
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash || tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        blockchainTimestamp,
        transactionReceipt: receipt,
        message: '? Transaction recorded on blockchain! View on Etherscan: https://sepolia.etherscan.io/tx/' + (receipt.transactionHash || tx.hash),
      };
    } catch (error: any) {
      console.error('? Blockchain recording error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data,
      });

      let errorMessage = 'Failed to record transaction on blockchain';
      let userFriendlyMessage = '';

      // Handle specific error cases
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
        userFriendlyMessage = 'You rejected the transaction in MetaMask. Please try again and approve the transaction to continue.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
        userFriendlyMessage = 'You don\'t have enough Sepolia ETH to pay for gas fees. Please add more Sepolia ETH to your wallet from a faucet: https://sepoliafaucet.com/';
      } else if (error.message.includes('gas required exceeds allowance') || error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Gas estimation failed';
        userFriendlyMessage = 'Unable to estimate gas for this transaction. This might be due to invalid parameters or contract state. Please check your order details and try again.';
      } else if (error.message.includes('already recorded on blockchain')) {
        errorMessage = error.message;
        userFriendlyMessage = 'This order has already been recorded on the blockchain. Please refresh the page to see your orders.';
      } else if (error.message.includes('network changed') || error.code === -32603) {
        errorMessage = 'Network error';
        userFriendlyMessage = 'Please ensure you are connected to the Sepolia Test Network in MetaMask and try again.';
      } else if (error.message.includes('user denied')) {
        errorMessage = 'Transaction signature denied';
        userFriendlyMessage = 'You must approve the transaction in MetaMask to place your order.';
      } else if (error.code === 'NONCE_EXPIRED') {
        errorMessage = 'Transaction nonce expired';
        userFriendlyMessage = 'A previous transaction is still pending. Please wait for it to complete or speed it up in MetaMask.';
      } else if (error.code === 'REPLACEMENT_UNDERPRICED') {
        errorMessage = 'Gas price too low';
        userFriendlyMessage = 'The gas price is too low. Please try again with a higher gas price.';
      } else if (error.code === 'TIMEOUT') {
        errorMessage = 'Transaction timeout';
        userFriendlyMessage = 'The transaction took too long to confirm. It may still be processing. Check your MetaMask activity or Etherscan for status.';
      } else if (error.message.includes('MetaMask') || error.message.includes('ethereum')) {
        errorMessage = 'MetaMask connection error';
        userFriendlyMessage = 'Please ensure MetaMask is installed, unlocked, and connected to this site.';
      } else if (error.message.includes('revert')) {
        errorMessage = 'Contract execution reverted';
        userFriendlyMessage = 'The smart contract rejected this transaction. This might be due to invalid data or a duplicate order. Please check your order details.';
      } else {
        userFriendlyMessage = error.message || 'An unexpected error occurred while recording the transaction on the blockchain.';
      }

      console.log('');
      console.log('? Transaction failed');
      console.log('   Error:', errorMessage);
      console.log('   User Message:', userFriendlyMessage);
      console.log('');

      return {
        success: false,
        message: userFriendlyMessage || errorMessage,
        transactionHash: undefined,
        blockNumber: undefined,
        gasUsed: undefined,
      };
    }
  }

  async updateTransactionStatus(
    supabaseId: string,
    newStatus: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled',
    reason?: string
  ): Promise<BlockchainTransactionResult> {
    // Declare txnDetails outside try-catch so it's accessible in catch block
    let txnDetails: any = null;
    
    try {
      console.log('Updating transaction status on blockchain...');
      console.log('Supabase ID:', supabaseId);
      console.log('New Status:', newStatus);
      if (reason) console.log('Reason:', reason);

      await this.switchToSepoliaNetwork();

      if (!this.contract) {
        await this.connectToContract();
      }

      if (!this.contract) {
        throw new Error('Failed to connect to smart contract');
      }

      // Get current signer to debug buyer address mismatch
      const signer = await this.getSigner();
      const signerAddress = await signer.getAddress();
      console.log('');
      console.log('+----------------------------------------------------------------+');
      console.log('�                    CANCELLATION ATTEMPT                        �');
      console.log('+----------------------------------------------------------------+');
      console.log('');
      console.log('?? STEP 1: WALLET VERIFICATION');
      console.log('?? Current wallet address:', signerAddress);
      console.log('?? Supabase ID to cancel:', supabaseId);
      console.log('?? New Status:', newStatus);
      console.log('?? Cancellation Reason:', reason || '(no reason provided)');
      console.log('');


      // For debugging: Try to get the transaction details from the contract
      try {
        console.log('?? STEP 2: FETCHING TRANSACTION DETAILS FROM BLOCKCHAIN');
        console.log('   Querying contract for order:', supabaseId);
        txnDetails = await this.contract.getTransactionBySupabaseId(supabaseId);
        
        console.log('');
        console.log('?? TRANSACTION FOUND ON BLOCKCHAIN:');
        console.log('   +- Blockchain ID:', txnDetails.blockchainId?.toString());
        console.log('   +- Supabase ID:', txnDetails.supabaseId);
        console.log('   +- Buyer Wallet (stored):', txnDetails.buyerWallet);
        console.log('   +- Seller Wallet:', txnDetails.sellerWallet);
        console.log('   +- Item Name:', txnDetails.itemName);
        console.log('   +- Current Status:', txnDetails.transactionStatus);
        console.log('   +- Item Price:', txnDetails.itemPrice?.toString());
        console.log('   +- Quantity:', txnDetails.quantity?.toString());
        console.log('   +- Last Updated By:', txnDetails.lastUpdatedBy);
        
        console.log('');
        console.log('?? STEP 3: VERIFYING WALLET AUTHORIZATION');
        
        // For cancellation: Check if current signer is the buyer
        if (newStatus === 'cancelled') {
          const isBuyer = txnDetails.buyerWallet && txnDetails.buyerWallet.toLowerCase() === signerAddress.toLowerCase();
          const isSeller = txnDetails.sellerWallet && txnDetails.sellerWallet.toLowerCase() === signerAddress.toLowerCase();
          
          console.log('   Current wallet (attempting cancel):', signerAddress.toLowerCase());
          console.log('   Buyer wallet (stored):', txnDetails.buyerWallet?.toLowerCase());
          console.log('   Is Current User the Buyer?:', isBuyer ? '? YES' : '? NO');
          console.log('   Is Current User the Seller?:', isSeller ? '? YES' : '? NO');
          console.log('');
          
          // Only the buyer can cancel
          if (!isBuyer) {
            console.error('? CRITICAL ERROR: You are NOT the buyer of this transaction!');
            console.error('   Stored buyer:', txnDetails.buyerWallet);
            console.error('   Your wallet:', signerAddress);
            throw new Error(
              'Only the buyer can cancel this order. ' +
              'You are not the buyer of this order. ' +
              'Please use the correct wallet that placed this order.'
            );
          }
        }
      } catch (queryError: any) {
        if (queryError.message && queryError.message.includes('Only the buyer')) {
          throw queryError; // Re-throw buyer authorization error
        }
        console.warn('?? Could not fetch transaction details from contract:', queryError);
        console.warn('?? This could mean: 1) Transaction not found, 2) Contract read error, 3) Network issue');
        console.warn('?? Continuing anyway - smart contract will validate authorization...');
      }

      // Map status strings to blockchain enum values (V4 compatibility)
      // V5 uses separate methods (acceptTransaction, rejectTransaction, etc.)
      const statusMap: Record<string, number> = {
        pending: 0,   // PENDING
        accepted: 1,  // ACCEPTED
        rejected: 2,  // REJECTED
        completed: 3, // COMPLETED
        cancelled: 4, // CANCELLED
      };

      const blockchainStatus = statusMap[newStatus] || 0;

      console.log('?? STEP 4: PREPARING BLOCKCHAIN CALL');
      console.log('   Status Code:', blockchainStatus);
      console.log('   Status Name:', newStatus);
      console.log('');
      console.log('?? STEP 5: SENDING TRANSACTION TO SEPOLIA');

      // Call appropriate contract method based on status
      let tx;
      switch (newStatus) {
        case 'accepted':
          console.log('   Function: acceptTransaction()');
          console.log('   Parameters:');
          console.log('      +- supabaseId:', supabaseId);
          console.log('      +- caller:', signerAddress);
          tx = await this.contract.acceptTransaction(supabaseId);
          break;
        case 'rejected':
          console.log('   Function: rejectTransaction()');
          const rejectionReason = reason || 'Rejected by seller';
          console.log('   Parameters:');
          console.log('      +- supabaseId:', supabaseId);
          console.log('      +- rejectionReason:', rejectionReason);
          tx = await this.contract.rejectTransaction(supabaseId, rejectionReason);
          break;
        case 'completed':
          console.log('   Function: completeTransaction()');
          console.log('   Parameters:');
          console.log('      +- supabaseId:', supabaseId);
          console.log('      +- caller:', signerAddress);
          tx = await this.contract.completeTransaction(supabaseId);
          break;
        case 'cancelled':
          console.log('   Function: cancelTransaction()');
          const cancellationReason = reason || 'Cancelled by buyer';
          console.log('   Parameters:');
          console.log('      +- supabaseId:', supabaseId);
          console.log('      +- cancellationReason:', cancellationReason);
          console.log('      +- reason length:', cancellationReason.length);
          console.log('      +- caller:', signerAddress);
          tx = await this.contract.cancelTransaction(supabaseId, cancellationReason);
          break;
        default:
          throw new Error('Invalid status transition');
      }

      console.log('');
      console.log('? STEP 6: WAITING FOR BLOCKCHAIN CONFIRMATION');
      console.log('   Transaction Hash:', tx.hash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Status update failed');
      }

      console.log('');
      console.log('+----------------------------------------------------------------+');
      console.log('�        ? TRANSACTION STATUS UPDATE CONFIRMED ON BLOCKCHAIN     �');
      console.log('+----------------------------------------------------------------+');
      console.log('');
      console.log('?? STATUS UPDATE DETAILS:');
      console.log('   Order ID (Supabase):', supabaseId);
      console.log('   Status Changed To:', newStatus.toUpperCase());
      if (reason) {
        console.log('   Reason:', reason);
      }
      console.log('');
      console.log('?? BLOCKCHAIN CONFIRMATION:');
      console.log('   Transaction Hash:', receipt.transactionHash || tx.hash);
      console.log('   Block Number:', receipt.blockNumber);
      console.log('   Gas Used:', receipt.gasUsed.toString(), 'units');
      console.log('   Network: Sepolia Testnet');
      console.log('');
      console.log('?? VIEW ON ETHERSCAN:');
      console.log('   https://sepolia.etherscan.io/tx/' + (receipt.transactionHash || tx.hash));
      console.log('');
      console.log('? Status update stored on blockchain and synced to Supabase');
      console.log('');

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        message: 'Status updated to ' + newStatus,
      };
    } catch (error: any) {
      console.error('');
      console.error('+----------------------------------------------------------------+');
      console.error('�              ? TRANSACTION STATUS UPDATE FAILED                �');
      console.error('+----------------------------------------------------------------+');
      console.error('');
      console.error('Status update error:', error);
      console.error('Error code:', error.code);
      console.error('Error reason:', error.reason);
      console.error('Error data:', error.data);
      console.error('');

      let errorMessage = error.message || 'Failed to update transaction status';

      if (error.code === 'CALL_EXCEPTION') {
        if (error.data === '0x31fb878f') {
          console.error('');
          console.error('+----------------------------------------------------------------+');
          console.error('�     CONTRACT ERROR: OnlyBuyerCanCancel (0x31fb878f)             �');
          console.error('+----------------------------------------------------------------+');
          console.error('');
          console.error('The smart contract rejected the cancellation because:');
          console.error('You are NOT the buyer who placed this order.');
          console.error('');
          console.error('This could happen if:');
          console.error('1. ⚠️  Wrong wallet selected in MetaMask');
          console.error('2. ⚠️  You logged in with one wallet but MetaMask is set to another');
          console.error('3. ⚠️  The order was placed by a different account');
          console.error('');
          console.error('? SOLUTION:');
          console.error('   1. Check which wallet is connected in MetaMask');
          console.error('   2. Check your login email in the app');
          console.error('   3. Make sure they match the same account');
          console.error('   4. If you have multiple MetaMask accounts, try switching to each one');
          console.error('   5. Check Supabase - verify buyer_id matches your user_id');
          console.error('');
          
          errorMessage = '? Cannot Cancel: You are not the buyer of this order\n\n' +
            'Only the buyer who placed the order can cancel it.\n\n' +
            'Solution:\n' +
            '1. Check which wallet is selected in MetaMask\n' +
            '2. Verify you\'re logged in with the correct account\n' +
            '3. Try switching to different wallets in MetaMask\n\n' +
            'For detailed help, check the browser console (F12).';
        } else if (error.data === '0xc39e8d4e') {
          errorMessage = '? TransactionNotFound: This transaction ID does not exist on the blockchain.';
        } else if (error.data === '0x4e487b71') {
          errorMessage = '? InvalidStatusTransition: The order is already cancelled or in an invalid state.';
        } else if (error.data === '0x0a') {
          errorMessage = '? Address validation failed - you may not be the buyer of this order';
        } else {
          errorMessage = '? Contract Error (Code: ' + error.data + '): ' + error.message;
        }
      } else if (error.message && error.message.includes('Only the buyer')) {
        // This is our custom buyer validation error
        errorMessage = error.message;
      } else if (error.message && error.message.includes('insufficient funds')) {
        errorMessage = '? Insufficient ETH: You need Sepolia ETH for gas. Get free ETH from https://sepoliafaucet.com/';
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async getWalletAddress(): Promise<string | null> {
    try {
      const signer = await this.getSigner();
      return await signer.getAddress();
    } catch (error: any) {
      console.error('Wallet error:', error);
      return null;
    }
  }

  async getChainId(): Promise<number | null> {
    try {
      const signer = await this.getSigner();
      if (!signer) return null;

      const network = await signer.provider?.getNetwork();
      return network?.chainId ? Number(network.chainId) : null;
    } catch (error: any) {
      console.error('Chain ID error:', error);
      return null;
    }
  }

  async getBlockchainStatus(): Promise<{
    connected: boolean;
    walletAddress: string | null;
    chainId: number | null;
    contractAddress: string;
  }> {
    try {
      const walletAddress = await this.getWalletAddress();
      const chainId = await this.getChainId();

      return {
        connected: !!this.provider,
        walletAddress,
        chainId,
        contractAddress: this.contractAddress,
      };
    } catch (error: any) {
      console.error('Status error:', error);
      return {
        connected: false,
        walletAddress: null,
        chainId: null,
        contractAddress: this.contractAddress,
      };
    }
  }

  // ============================================================
  // V5.0.0 TRANSACTION LIFECYCLE METHODS
  // ============================================================

  /**
   * Accept a transaction (seller only) - V6.5 Compatible
   * @param supabaseId - Original Supabase transaction ID
   * @param newSupabaseId - NEW Supabase ID for the acceptance transaction
   * @param finalPickupLocation - Final confirmed pickup location
   * @param finalMeetupLocation - Final confirmed meetup location
   */
  async acceptTransaction(
    supabaseId: string,
    newSupabaseId: string,
    finalPickupLocation: string,
    finalMeetupLocation: string
  ): Promise<BlockchainTransactionResult> {
    try {
      console.log('📥 Accepting transaction on blockchain (V6.5)...');
      console.log('   Original Supabase ID:', supabaseId);
      console.log('   NEW Supabase ID:', newSupabaseId);
      console.log('   Final Pickup:', finalPickupLocation);
      console.log('   Final Meetup:', finalMeetupLocation);

      await this.switchToSepoliaNetwork();

      if (!this.contract) {
        await this.connectToContract();
      }

      if (!this.contract) {
        throw new Error('Failed to connect to smart contract');
      }

      console.log('📤 Calling acceptTransaction on contract (V6.5 - 4 params)...');
      const tx = await this.contract.acceptTransaction(
        supabaseId,
        newSupabaseId,
        finalPickupLocation,
        finalMeetupLocation
      );

      console.log('✅ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      console.log('✅ Transaction accepted on blockchain');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());

      // Fetch blockchain timestamp from the transaction
      let blockchainTimestamp: string | undefined;
      try {
        const txDetails = await this.contract.getTransactionBySupabaseId(newSupabaseId);
        blockchainTimestamp = new Date(Number(txDetails.acceptedAt) * 1000).toISOString();
        console.log('   📅 Blockchain accepted_at timestamp:', blockchainTimestamp);
        console.log('   Raw acceptedAt:', txDetails.acceptedAt.toString());
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch blockchain timestamp:', fetchError);
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash || tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        blockchainTimestamp,
        message: 'Transaction accepted successfully on blockchain',
      };
    } catch (error: any) {
      console.error('❌ Error accepting transaction:', error);
      return {
        success: false,
        message: error.message || 'Failed to accept transaction on blockchain',
      };
    }
  }

  /**
   * Reject a transaction (seller only) - V6.5 Compatible
   * @param supabaseId - Original Supabase transaction ID
   * @param newSupabaseId - NEW Supabase ID for the rejection transaction
   * @param rejectionReason - Reason for rejection
   */
  async rejectTransaction(
    supabaseId: string,
    newSupabaseId: string,
    rejectionReason: string
  ): Promise<BlockchainTransactionResult> {
    try {
      console.log('❌ Rejecting transaction on blockchain (V6.5)...');
      console.log('   Original Supabase ID:', supabaseId);
      console.log('   NEW Supabase ID:', newSupabaseId);
      console.log('   Reason:', rejectionReason);

      await this.switchToSepoliaNetwork();

      if (!this.contract) {
        await this.connectToContract();
      }

      if (!this.contract) {
        throw new Error('Failed to connect to smart contract');
      }

      console.log('📤 Calling rejectTransaction on contract (V6.5 - 3 params)...');
      const tx = await this.contract.rejectTransaction(
        supabaseId,
        newSupabaseId,
        rejectionReason
      );

      console.log('✅ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      console.log('✅ Transaction rejected on blockchain');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());

      // Fetch blockchain timestamp from the transaction
      let blockchainTimestamp: string | undefined;
      try {
        const txDetails = await this.contract.getTransactionBySupabaseId(newSupabaseId);
        blockchainTimestamp = new Date(Number(txDetails.rejectedAt) * 1000).toISOString();
        console.log('   📅 Blockchain rejected_at timestamp:', blockchainTimestamp);
        console.log('   Raw rejectedAt:', txDetails.rejectedAt.toString());
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch blockchain timestamp:', fetchError);
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash || tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        blockchainTimestamp,
        message: 'Transaction rejected successfully on blockchain',
      };
    } catch (error: any) {
      console.error('❌ Error rejecting transaction:', error);
      return {
        success: false,
        message: error.message || 'Failed to reject transaction on blockchain',
      };
    }
  }

  /**
   * Cancel a transaction (buyer only) - V6.5 Compatible
   * @param supabaseId - Original Supabase transaction ID
   * @param newSupabaseId - NEW Supabase ID for the cancellation transaction
   * @param cancellationReason - Reason for cancellation
   */
  async cancelTransactionV5(
    supabaseId: string,
    newSupabaseId: string,
    cancellationReason: string
  ): Promise<BlockchainTransactionResult> {
    try {
      console.log('🚫 Cancelling transaction on blockchain (V6.5)...');
      console.log('   Original Supabase ID:', supabaseId);
      console.log('   NEW Supabase ID:', newSupabaseId);
      console.log('   Reason:', cancellationReason);

      await this.switchToSepoliaNetwork();

      if (!this.contract) {
        await this.connectToContract();
      }

      if (!this.contract) {
        throw new Error('Failed to connect to smart contract');
      }

      console.log('📤 Calling cancelTransaction on contract (V6.5 - 3 params)...');
      const tx = await this.contract.cancelTransaction(
        supabaseId,
        newSupabaseId,
        cancellationReason
      );

      console.log('✅ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      console.log('✅ Transaction cancelled on blockchain');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());

      // Fetch blockchain timestamp from the transaction
      let blockchainTimestamp: string | undefined;
      try {
        const txDetails = await this.contract.getTransactionBySupabaseId(newSupabaseId);
        blockchainTimestamp = new Date(Number(txDetails.cancelledAt) * 1000).toISOString();
        console.log('   Blockchain cancelled_at timestamp:', blockchainTimestamp);
        console.log('   Raw cancelledAt:', txDetails.cancelledAt.toString());
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch blockchain timestamp:', fetchError);
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash || tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        blockchainTimestamp,
        message: 'Transaction cancelled successfully on blockchain',
      };
    } catch (error: any) {
      console.error('❌ Error cancelling transaction:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel transaction on blockchain',
      };
    }
  }

  /**
   * Complete a transaction (buyer confirms completion) - V6.5 Compatible
   * @param supabaseId - Original Supabase transaction ID
   * @param newSupabaseId - NEW Supabase ID for the completion transaction
   */
  async completeTransaction(
    supabaseId: string,
    newSupabaseId: string
  ): Promise<BlockchainTransactionResult> {
    try {
      console.log('✅ Completing transaction on blockchain (V6.5)...');
      console.log('   Original Supabase ID:', supabaseId);
      console.log('   NEW Supabase ID:', newSupabaseId);

      await this.switchToSepoliaNetwork();

      if (!this.contract) {
        await this.connectToContract();
      }

      if (!this.contract) {
        throw new Error('Failed to connect to smart contract');
      }

      console.log('📤 Calling completeTransaction on contract (V6.5 - 2 params)...');
      const tx = await this.contract.completeTransaction(supabaseId, newSupabaseId);

      console.log('✅ Transaction submitted:', tx.hash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      console.log('✅ Transaction completed on blockchain');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());

      // Fetch blockchain timestamp from the transaction
      let blockchainTimestamp: string | undefined;
      try {
        const txDetails = await this.contract.getTransactionBySupabaseId(newSupabaseId);
        blockchainTimestamp = new Date(Number(txDetails.completedAt) * 1000).toISOString();
        console.log('   📅 Blockchain completed_at timestamp:', blockchainTimestamp);
        console.log('   Raw completedAt:', txDetails.completedAt.toString());
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch blockchain timestamp:', fetchError);
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash || tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        blockchainTimestamp,
        message: 'Transaction completed successfully on blockchain',
      };
    } catch (error: any) {
      console.error('❌ Error completing transaction:', error);
      return {
        success: false,
        message: error.message || 'Failed to complete transaction on blockchain',
      };
    }
  }
}

export default new BlockchainService();

