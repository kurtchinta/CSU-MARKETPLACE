// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CSUMarketplace V6.6 - Wallet-Agnostic Multi-Transaction Logging
 * @notice Each action creates a NEW transaction on Sepolia blockchain
 * @notice ANY WALLET can perform ANY action (accept, reject, cancel, complete)
 * @dev PLACE ORDER → Pending transaction, ACCEPT → New Accepted transaction
 * @dev REJECT → New Rejected transaction, CANCEL → New Cancelled transaction
 * @dev COMPLETE → New Completed transaction
 * @dev All transaction data is preserved on Sepolia - complete audit trail
 * @dev Wallet validation REMOVED - allows testing with multiple wallets
 */
contract CSUMarketplace {
    
    // ============================================================
    // STATE VARIABLES
    // ============================================================
    
    uint256 private _transactionCount;
    address public owner;
    
    // Constants
    uint256 public constant MAX_STRING_LENGTH = 500;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 2000;
    
    // ============================================================
    // DATA STRUCTURES
    // ============================================================
    
    /**
     * @dev Core transaction struct - supports all listing types
     * Stores comprehensive data for FOR SALE, FOR RENT, and SERVICE transactions
     */
    struct Transaction {
        // Core identifiers
        uint256 blockchainId;
        string supabaseId;
        string orderId;
        
        // Participant information
        address buyerWallet;
        address sellerWallet;
        string buyerName;
        string sellerName;
        string sellerPhone;
        
        // Product/Service details
        string category;
        string listingType;              // "FOR SALE", "FOR RENT", "SERVICE"
        string itemName;
        string itemDescription;
        uint256 itemPrice;               // Total price in PHP (not wei)
        uint256 quantity;
        
        // Location details
        string pickupLocation;
        string meetupLocation;
        string finalPickupLocation;      // Set by seller on accept
        string finalMeetupLocation;      // Set by seller on accept
        
        // FOR SALE specific
        string requirements;
        string contactInfo;
        
        // FOR RENT specific
        string returnCondition;
        string rentalDuration;
        string startDate;
        string endDate;
        
        // SERVICE specific
        string serviceSchedule;
        string serviceDuration;
        
        // Communication
        string messageToSeller;
        string rejectionReason;
        
        // Status and timestamps
        string transactionStatus;        // "Pending", "Accepted", "Rejected", "Completed", "Cancelled"
        uint256 createdAt;
        uint256 updatedAt;
        uint256 acceptedAt;
        uint256 rejectedAt;
        uint256 completedAt;
        uint256 cancelledAt;
        
        // Metadata
        address lastUpdatedBy;
    }
    
    // ============================================================
    // STORAGE
    // ============================================================
    
    mapping(uint256 => Transaction) private _transactions;
    mapping(string => uint256) private _supabaseToBlockchainId;
    mapping(string => bool) private _supabaseExists;
    mapping(string => uint256) private _orderToBlockchain;
    mapping(string => uint256[]) private _orderTransactionHistory;  // Track all transactions per order
    
    // ============================================================
    // EVENTS
    // ============================================================
    
    /**
     * @dev Emitted when a new transaction is created (Pending status)
     * @notice All essential order data visible in Sepolia logs
     */
    event TransactionCreated(
        uint256 indexed blockchainId,
        string supabaseId,
        string orderId,
        address indexed buyerWallet,
        address indexed sellerWallet,
        string buyerName,
        string sellerName,
        string category,
        string listingType,
        string itemName,
        string itemDescription,
        uint256 itemPrice,
        uint256 quantity,
        string pickupLocation,
        string meetupLocation,
        string messageToSeller,
        uint256 createdAt
    );
    
    /**
     * @dev Emitted when seller accepts an order
     * @notice Shows all order data plus final locations in Sepolia logs
     */
    event TransactionAccepted(
        uint256 indexed blockchainId,
        string supabaseId,
        string orderId,
        address indexed buyerWallet,
        address indexed sellerWallet,
        string sellerName,
        string itemName,
        uint256 itemPrice,
        uint256 quantity,
        string listingType,
        string finalPickupLocation,
        string finalMeetupLocation,
        uint256 acceptedAt
    );
    
    /**
     * @dev Emitted when seller rejects an order
     * @notice Shows complete order data and rejection reason in Sepolia logs
     */
    event TransactionRejected(
        uint256 indexed blockchainId,
        string supabaseId,
        string orderId,
        address indexed buyerWallet,
        address indexed sellerWallet,
        string sellerName,
        string itemName,
        uint256 itemPrice,
        uint256 quantity,
        string listingType,
        string rejectionReason,
        uint256 rejectedAt
    );
    
    /**
     * @dev Emitted when transaction is completed
     * @notice Shows complete transaction data in Sepolia logs
     */
    event TransactionCompleted(
        uint256 indexed blockchainId,
        string supabaseId,
        string orderId,
        address indexed buyerWallet,
        address indexed sellerWallet,
        address completedBy,
        string itemName,
        uint256 itemPrice,
        uint256 quantity,
        string listingType,
        string finalPickupLocation,
        string finalMeetupLocation,
        uint256 completedAt
    );
    
    /**
     * @dev Emitted when buyer cancels an order
     * @notice Shows complete order data and cancellation reason in Sepolia logs
     */
    event TransactionCancelled(
        uint256 indexed blockchainId,
        string supabaseId,
        string orderId,
        address indexed buyerWallet,
        address indexed sellerWallet,
        string buyerName,
        string itemName,
        uint256 itemPrice,
        uint256 quantity,
        string listingType,
        string cancellationReason,
        uint256 cancelledAt
    );
    
    /**
     * @dev Emitted when any transaction status changes
     */
    event TransactionStatusUpdated(
        uint256 indexed blockchainId,
        string supabaseId,
        string orderId,
        address indexed updatedBy,
        string oldStatus,
        string newStatus,
        uint256 updatedAt
    );
    
    // ============================================================
    // ERRORS
    // ============================================================
    
    error InvalidAddress();
    error InvalidPrice();
    error InvalidQuantity();
    error StringTooLong();
    error DuplicateTransaction();
    error TransactionNotFound();
    error InvalidStatusTransition();
    error OnlyBuyerCanCancel();
    error OnlySellerCanAcceptReject();
    error OnlySellerOrBuyerCanComplete();
    error Unauthorized();
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier validTransaction(string calldata supabaseId) {
        if (!_supabaseExists[supabaseId]) revert TransactionNotFound();
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        _transactionCount = 0;
    }
    
    // ============================================================
    // MAIN FUNCTIONS
    // ============================================================
    
    // ============================================================
    // INPUT STRUCTS (To reduce parameter count)
    // ============================================================
    
    struct CreateTransactionParams {
        string supabaseId;
        string orderId;
        address buyerWallet;
        address sellerWallet;
        string buyerName;
        string sellerName;
        string sellerPhone;
        string category;
        string listingType;
        string itemName;
        string itemDescription;
        uint256 itemPrice;
        uint256 quantity;
        string pickupLocation;
        string meetupLocation;
        string requirements;
        string contactInfo;
        string returnCondition;
        string rentalDuration;
        string startDate;
        string endDate;
        string serviceSchedule;
        string serviceDuration;
        string messageToSeller;
        string transactionStatus;
    }
    
    /**
     * @dev Create a new transaction (buyer places order)
     * @notice This sets the transaction to "Pending" status automatically
     * @param params Struct containing all transaction parameters
     */
    function createTransaction(CreateTransactionParams calldata params) external returns (uint256) {
        // Validation
        if (params.buyerWallet == address(0) || params.sellerWallet == address(0)) revert InvalidAddress();
        if (params.buyerWallet == params.sellerWallet) revert InvalidAddress();
        if (_supabaseExists[params.supabaseId]) revert DuplicateTransaction();
        if (params.itemPrice == 0) revert InvalidPrice();
        if (params.quantity == 0) revert InvalidQuantity();
        if (bytes(params.itemName).length > MAX_STRING_LENGTH) revert StringTooLong();
        if (bytes(params.itemDescription).length > MAX_DESCRIPTION_LENGTH) revert StringTooLong();
        
        // Create new transaction
        _transactionCount++;
        uint256 blockchainId = _transactionCount;
        uint256 currentTime = block.timestamp;
        
        Transaction storage txn = _transactions[blockchainId];
        txn.blockchainId = blockchainId;
        txn.supabaseId = params.supabaseId;
        txn.orderId = params.orderId;
        txn.buyerWallet = params.buyerWallet;
        txn.sellerWallet = params.sellerWallet;
        txn.buyerName = params.buyerName;
        txn.sellerName = params.sellerName;
        txn.sellerPhone = params.sellerPhone;
        txn.category = params.category;
        txn.listingType = params.listingType;
        txn.itemName = params.itemName;
        txn.itemDescription = params.itemDescription;
        txn.itemPrice = params.itemPrice;
        txn.quantity = params.quantity;
        txn.pickupLocation = params.pickupLocation;
        txn.meetupLocation = params.meetupLocation;
        txn.requirements = params.requirements;
        txn.contactInfo = params.contactInfo;
        txn.returnCondition = params.returnCondition;
        txn.rentalDuration = params.rentalDuration;
        txn.startDate = params.startDate;
        txn.endDate = params.endDate;
        txn.serviceSchedule = params.serviceSchedule;
        txn.serviceDuration = params.serviceDuration;
        txn.messageToSeller = params.messageToSeller;
        txn.transactionStatus = params.transactionStatus;
        txn.createdAt = currentTime;
        txn.updatedAt = currentTime;
        txn.lastUpdatedBy = params.buyerWallet;
        
        // Update mappings
        _supabaseToBlockchainId[params.supabaseId] = blockchainId;
        _supabaseExists[params.supabaseId] = true;
        _orderToBlockchain[params.orderId] = blockchainId;
        _orderTransactionHistory[params.orderId].push(blockchainId);  // Add to history
        
        // Emit event
        emit TransactionCreated(
            blockchainId,
            params.supabaseId,
            params.orderId,
            params.buyerWallet,
            params.sellerWallet,
            params.buyerName,
            params.sellerName,
            params.category,
            params.listingType,
            params.itemName,
            params.itemDescription,
            params.itemPrice,
            params.quantity,
            params.pickupLocation,
            params.meetupLocation,
            params.messageToSeller,
            currentTime
        );
        
        return blockchainId;
    }
    
    /**
     * @dev Seller accepts the transaction - CREATES NEW TRANSACTION ON SEPOLIA
     * @param supabaseId Original transaction UUID
     * @param newSupabaseId NEW UUID for the acceptance transaction
     * @param finalPickupLocation Final confirmed pickup location
     * @param finalMeetupLocation Final confirmed meetup location
     */
    function acceptTransaction(
        string calldata supabaseId,
        string calldata newSupabaseId,
        string calldata finalPickupLocation,
        string calldata finalMeetupLocation
    ) external validTransaction(supabaseId) {
        uint256 originalBlockchainId = _supabaseToBlockchainId[supabaseId];
        Transaction storage originalTxn = _transactions[originalBlockchainId];
        
        // Validate (wallet check removed - any wallet can accept)
        if (keccak256(bytes(originalTxn.transactionStatus)) != keccak256(bytes("Pending"))) {
            revert InvalidStatusTransition();
        }
        if (_supabaseExists[newSupabaseId]) revert DuplicateTransaction();
        
        // CREATE NEW TRANSACTION ON SEPOLIA FOR ACCEPTANCE
        _transactionCount++;
        uint256 newBlockchainId = _transactionCount;
        uint256 currentTime = block.timestamp;
        
        Transaction storage newTxn = _transactions[newBlockchainId];
        
        // Copy all original data
        newTxn.blockchainId = newBlockchainId;
        newTxn.supabaseId = newSupabaseId;
        newTxn.orderId = originalTxn.orderId;
        newTxn.buyerWallet = originalTxn.buyerWallet;
        newTxn.sellerWallet = originalTxn.sellerWallet;
        newTxn.buyerName = originalTxn.buyerName;
        newTxn.sellerName = originalTxn.sellerName;
        newTxn.sellerPhone = originalTxn.sellerPhone;
        newTxn.category = originalTxn.category;
        newTxn.listingType = originalTxn.listingType;
        newTxn.itemName = originalTxn.itemName;
        newTxn.itemDescription = originalTxn.itemDescription;
        newTxn.itemPrice = originalTxn.itemPrice;
        newTxn.quantity = originalTxn.quantity;
        newTxn.pickupLocation = originalTxn.pickupLocation;
        newTxn.meetupLocation = originalTxn.meetupLocation;
        newTxn.requirements = originalTxn.requirements;
        newTxn.contactInfo = originalTxn.contactInfo;
        newTxn.returnCondition = originalTxn.returnCondition;
        newTxn.rentalDuration = originalTxn.rentalDuration;
        newTxn.startDate = originalTxn.startDate;
        newTxn.endDate = originalTxn.endDate;
        newTxn.serviceSchedule = originalTxn.serviceSchedule;
        newTxn.serviceDuration = originalTxn.serviceDuration;
        newTxn.messageToSeller = originalTxn.messageToSeller;
        
        // Set ACCEPTED status and new data
        newTxn.transactionStatus = "Accepted";
        newTxn.finalPickupLocation = finalPickupLocation;
        newTxn.finalMeetupLocation = finalMeetupLocation;
        newTxn.createdAt = originalTxn.createdAt;  // Keep original creation time
        newTxn.acceptedAt = currentTime;
        newTxn.updatedAt = currentTime;
        newTxn.lastUpdatedBy = msg.sender;
        
        // Update mappings
        _supabaseToBlockchainId[newSupabaseId] = newBlockchainId;
        _supabaseExists[newSupabaseId] = true;
        _orderToBlockchain[originalTxn.orderId] = newBlockchainId;  // Point to latest
        _orderTransactionHistory[originalTxn.orderId].push(newBlockchainId);
        
        // Emit events
        emit TransactionAccepted(
            newBlockchainId,
            newSupabaseId,
            originalTxn.orderId,
            originalTxn.buyerWallet,
            msg.sender,
            originalTxn.sellerName,
            originalTxn.itemName,
            originalTxn.itemPrice,
            originalTxn.quantity,
            originalTxn.listingType,
            finalPickupLocation,
            finalMeetupLocation,
            currentTime
        );
        
        emit TransactionStatusUpdated(
            newBlockchainId,
            newSupabaseId,
            originalTxn.orderId,
            msg.sender,
            "Pending",
            "Accepted",
            currentTime
        );
    }
    
    /**
     * @dev Seller rejects the transaction - CREATES NEW TRANSACTION ON SEPOLIA
     * @param supabaseId Original transaction UUID
     * @param newSupabaseId NEW UUID for the rejection transaction
     * @param rejectionReason Reason for rejection
     */
    function rejectTransaction(
        string calldata supabaseId,
        string calldata newSupabaseId,
        string calldata rejectionReason
    ) external validTransaction(supabaseId) {
        uint256 originalBlockchainId = _supabaseToBlockchainId[supabaseId];
        Transaction storage originalTxn = _transactions[originalBlockchainId];
        
        // Validate (wallet check removed - any wallet can reject)
        if (keccak256(bytes(originalTxn.transactionStatus)) != keccak256(bytes("Pending"))) {
            revert InvalidStatusTransition();
        }
        if (_supabaseExists[newSupabaseId]) revert DuplicateTransaction();
        
        // CREATE NEW TRANSACTION ON SEPOLIA FOR REJECTION
        _transactionCount++;
        uint256 newBlockchainId = _transactionCount;
        uint256 currentTime = block.timestamp;
        
        Transaction storage newTxn = _transactions[newBlockchainId];
        
        // Copy all original data
        newTxn.blockchainId = newBlockchainId;
        newTxn.supabaseId = newSupabaseId;
        newTxn.orderId = originalTxn.orderId;
        newTxn.buyerWallet = originalTxn.buyerWallet;
        newTxn.sellerWallet = originalTxn.sellerWallet;
        newTxn.buyerName = originalTxn.buyerName;
        newTxn.sellerName = originalTxn.sellerName;
        newTxn.sellerPhone = originalTxn.sellerPhone;
        newTxn.category = originalTxn.category;
        newTxn.listingType = originalTxn.listingType;
        newTxn.itemName = originalTxn.itemName;
        newTxn.itemDescription = originalTxn.itemDescription;
        newTxn.itemPrice = originalTxn.itemPrice;
        newTxn.quantity = originalTxn.quantity;
        newTxn.pickupLocation = originalTxn.pickupLocation;
        newTxn.meetupLocation = originalTxn.meetupLocation;
        newTxn.requirements = originalTxn.requirements;
        newTxn.contactInfo = originalTxn.contactInfo;
        newTxn.returnCondition = originalTxn.returnCondition;
        newTxn.rentalDuration = originalTxn.rentalDuration;
        newTxn.startDate = originalTxn.startDate;
        newTxn.endDate = originalTxn.endDate;
        newTxn.serviceSchedule = originalTxn.serviceSchedule;
        newTxn.serviceDuration = originalTxn.serviceDuration;
        newTxn.messageToSeller = originalTxn.messageToSeller;
        
        // Set REJECTED status
        newTxn.transactionStatus = "Rejected";
        newTxn.rejectionReason = rejectionReason;
        newTxn.createdAt = originalTxn.createdAt;
        newTxn.rejectedAt = currentTime;
        newTxn.updatedAt = currentTime;
        newTxn.lastUpdatedBy = msg.sender;
        
        // Update mappings
        _supabaseToBlockchainId[newSupabaseId] = newBlockchainId;
        _supabaseExists[newSupabaseId] = true;
        _orderToBlockchain[originalTxn.orderId] = newBlockchainId;
        _orderTransactionHistory[originalTxn.orderId].push(newBlockchainId);
        
        // Emit events
        emit TransactionRejected(
            newBlockchainId,
            newSupabaseId,
            originalTxn.orderId,
            originalTxn.buyerWallet,
            msg.sender,
            originalTxn.sellerName,
            originalTxn.itemName,
            originalTxn.itemPrice,
            originalTxn.quantity,
            originalTxn.listingType,
            rejectionReason,
            currentTime
        );
        
        emit TransactionStatusUpdated(
            newBlockchainId,
            newSupabaseId,
            originalTxn.orderId,
            msg.sender,
            "Pending",
            "Rejected",
            currentTime
        );
    }
    
    /**
     * @dev Complete the transaction - CREATES NEW TRANSACTION ON SEPOLIA
     * @param supabaseId Original transaction UUID
     * @param newSupabaseId NEW UUID for the completion transaction
     * @notice Buyer or seller can mark as completed (creates new blockchain record)
     */
    function completeTransaction(
        string calldata supabaseId,
        string calldata newSupabaseId
    ) external validTransaction(supabaseId) {
        uint256 originalBlockchainId = _supabaseToBlockchainId[supabaseId];
        Transaction storage originalTxn = _transactions[originalBlockchainId];
        
        // Validate (wallet check removed - any wallet can complete)
        if (keccak256(bytes(originalTxn.transactionStatus)) != keccak256(bytes("Accepted"))) {
            revert InvalidStatusTransition();
        }
        if (_supabaseExists[newSupabaseId]) revert DuplicateTransaction();
        
        // CREATE NEW TRANSACTION ON SEPOLIA FOR COMPLETION
        _transactionCount++;
        uint256 newBlockchainId = _transactionCount;
        uint256 currentTime = block.timestamp;
        
        // Copy data to new transaction
        _copyTransactionData(originalBlockchainId, newBlockchainId, newSupabaseId);
        
        Transaction storage newTxn = _transactions[newBlockchainId];
        
        // Set COMPLETED status
        newTxn.transactionStatus = "Completed";
        newTxn.completedAt = currentTime;
        newTxn.updatedAt = currentTime;
        newTxn.lastUpdatedBy = msg.sender;
        
        // Update mappings
        _supabaseToBlockchainId[newSupabaseId] = newBlockchainId;
        _supabaseExists[newSupabaseId] = true;
        _orderToBlockchain[newTxn.orderId] = newBlockchainId;
        _orderTransactionHistory[newTxn.orderId].push(newBlockchainId);
        
        // Emit events (use newTxn to avoid stack too deep)
        emit TransactionCompleted(
            newBlockchainId,
            newSupabaseId,
            newTxn.orderId,
            newTxn.buyerWallet,
            newTxn.sellerWallet,
            msg.sender,
            newTxn.itemName,
            newTxn.itemPrice,
            newTxn.quantity,
            newTxn.listingType,
            newTxn.finalPickupLocation,
            newTxn.finalMeetupLocation,
            currentTime
        );
        
        emit TransactionStatusUpdated(
            newBlockchainId,
            newSupabaseId,
            newTxn.orderId,
            msg.sender,
            "Accepted",
            "Completed",
            currentTime
        );
    }
    
    /**
     * @dev Buyer cancels the transaction - CREATES NEW TRANSACTION ON SEPOLIA
     * @param supabaseId Original transaction UUID
     * @param newSupabaseId NEW UUID for the cancellation transaction
     * @param cancellationReason Reason for cancellation
     */
    function cancelTransaction(
        string calldata supabaseId,
        string calldata newSupabaseId,
        string calldata cancellationReason
    ) external validTransaction(supabaseId) {
        uint256 originalBlockchainId = _supabaseToBlockchainId[supabaseId];
        Transaction storage originalTxn = _transactions[originalBlockchainId];
        
        // Validate (wallet check removed - any wallet can cancel)
        // Can only cancel if Pending or Accepted
        bytes32 statusHash = keccak256(bytes(originalTxn.transactionStatus));
        if (statusHash != keccak256(bytes("Pending")) && statusHash != keccak256(bytes("Accepted"))) {
            revert InvalidStatusTransition();
        }
        if (_supabaseExists[newSupabaseId]) revert DuplicateTransaction();
        
        // CREATE NEW TRANSACTION ON SEPOLIA FOR CANCELLATION
        _transactionCount++;
        uint256 newBlockchainId = _transactionCount;
        uint256 currentTime = block.timestamp;
        
        Transaction storage newTxn = _transactions[newBlockchainId];
        
        // Copy all original data
        newTxn.blockchainId = newBlockchainId;
        newTxn.supabaseId = newSupabaseId;
        newTxn.orderId = originalTxn.orderId;
        newTxn.buyerWallet = originalTxn.buyerWallet;
        newTxn.sellerWallet = originalTxn.sellerWallet;
        newTxn.buyerName = originalTxn.buyerName;
        newTxn.sellerName = originalTxn.sellerName;
        newTxn.sellerPhone = originalTxn.sellerPhone;
        newTxn.category = originalTxn.category;
        newTxn.listingType = originalTxn.listingType;
        newTxn.itemName = originalTxn.itemName;
        newTxn.itemDescription = originalTxn.itemDescription;
        newTxn.itemPrice = originalTxn.itemPrice;
        newTxn.quantity = originalTxn.quantity;
        newTxn.pickupLocation = originalTxn.pickupLocation;
        newTxn.meetupLocation = originalTxn.meetupLocation;
        newTxn.finalPickupLocation = originalTxn.finalPickupLocation;
        newTxn.finalMeetupLocation = originalTxn.finalMeetupLocation;
        newTxn.requirements = originalTxn.requirements;
        newTxn.contactInfo = originalTxn.contactInfo;
        newTxn.returnCondition = originalTxn.returnCondition;
        newTxn.rentalDuration = originalTxn.rentalDuration;
        newTxn.startDate = originalTxn.startDate;
        newTxn.endDate = originalTxn.endDate;
        newTxn.serviceSchedule = originalTxn.serviceSchedule;
        newTxn.serviceDuration = originalTxn.serviceDuration;
        newTxn.messageToSeller = originalTxn.messageToSeller;
        
        // Set CANCELLED status
        newTxn.transactionStatus = "Cancelled";
        newTxn.rejectionReason = cancellationReason;
        newTxn.createdAt = originalTxn.createdAt;
        newTxn.cancelledAt = currentTime;
        newTxn.updatedAt = currentTime;
        newTxn.lastUpdatedBy = msg.sender;
        
        // Update mappings
        _supabaseToBlockchainId[newSupabaseId] = newBlockchainId;
        _supabaseExists[newSupabaseId] = true;
        _orderToBlockchain[originalTxn.orderId] = newBlockchainId;
        _orderTransactionHistory[originalTxn.orderId].push(newBlockchainId);
        
        // Emit events
        emit TransactionCancelled(
            newBlockchainId,
            newSupabaseId,
            originalTxn.orderId,
            msg.sender,
            originalTxn.sellerWallet,
            originalTxn.buyerName,
            originalTxn.itemName,
            originalTxn.itemPrice,
            originalTxn.quantity,
            originalTxn.listingType,
            cancellationReason,
            currentTime
        );
        
        emit TransactionStatusUpdated(
            newBlockchainId,
            newSupabaseId,
            originalTxn.orderId,
            msg.sender,
            originalTxn.transactionStatus,
            "Cancelled",
            currentTime
        );
    }
    
    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================
    
    /**
     * @dev Get transaction by blockchain ID
     */
    function getTransaction(uint256 blockchainId) external view returns (Transaction memory) {
        return _transactions[blockchainId];
    }
    
    /**
     * @dev Get transaction by Supabase ID
     */
    function getTransactionBySupabaseId(string calldata supabaseId) external view returns (Transaction memory) {
        if (!_supabaseExists[supabaseId]) revert TransactionNotFound();
        return _transactions[_supabaseToBlockchainId[supabaseId]];
    }
    
    /**
     * @dev Get transaction by order ID
     */
    function getTransactionByOrderId(string calldata orderId) external view returns (Transaction memory) {
        uint256 blockchainId = _orderToBlockchain[orderId];
        if (blockchainId == 0) revert TransactionNotFound();
        return _transactions[blockchainId];
    }
    
    /**
     * @dev Check if transaction exists
     */
    function transactionExists(string calldata supabaseId) external view returns (bool) {
        return _supabaseExists[supabaseId];
    }
    
    /**
     * @dev Get blockchain ID from Supabase ID
     */
    function getBlockchainId(string calldata supabaseId) external view returns (uint256) {
        return _supabaseToBlockchainId[supabaseId];
    }
    
    /**
     * @dev Get transaction status
     */
    function getTransactionStatus(string calldata supabaseId) external view returns (string memory) {
        if (!_supabaseExists[supabaseId]) revert TransactionNotFound();
        uint256 blockchainId = _supabaseToBlockchainId[supabaseId];
        return _transactions[blockchainId].transactionStatus;
    }
    
    /**
     * @dev Get total transaction count
     */
    function getTransactionCount() external view returns (uint256) {
        return _transactionCount;
    }
    
    /**
     * @dev Get complete transaction history for an order
     * @notice Returns all blockchain IDs for this order (Place, Accept/Reject/Cancel)
     */
    function getOrderTransactionHistory(string calldata orderId) external view returns (uint256[] memory) {
        return _orderTransactionHistory[orderId];
    }
    
    /**
     * @dev Get all transactions for an order with full data
     */
    function getOrderFullHistory(string calldata orderId) external view returns (Transaction[] memory) {
        uint256[] memory txIds = _orderTransactionHistory[orderId];
        Transaction[] memory history = new Transaction[](txIds.length);
        
        for (uint256 i = 0; i < txIds.length; i++) {
            history[i] = _transactions[txIds[i]];
        }
        
        return history;
    }
    
    // ============================================================
    // INTERNAL HELPER FUNCTIONS
    // ============================================================
    
    /**
     * @dev Helper function to copy transaction data (reduces stack depth)
     */
    function _copyTransactionData(
        uint256 fromBlockchainId,
        uint256 toBlockchainId,
        string calldata newSupabaseId
    ) private {
        Transaction storage originalTxn = _transactions[fromBlockchainId];
        Transaction storage newTxn = _transactions[toBlockchainId];
        
        // Copy all data
        newTxn.blockchainId = toBlockchainId;
        newTxn.supabaseId = newSupabaseId;
        newTxn.orderId = originalTxn.orderId;
        newTxn.buyerWallet = originalTxn.buyerWallet;
        newTxn.sellerWallet = originalTxn.sellerWallet;
        newTxn.buyerName = originalTxn.buyerName;
        newTxn.sellerName = originalTxn.sellerName;
        newTxn.sellerPhone = originalTxn.sellerPhone;
        newTxn.category = originalTxn.category;
        newTxn.listingType = originalTxn.listingType;
        newTxn.itemName = originalTxn.itemName;
        newTxn.itemDescription = originalTxn.itemDescription;
        newTxn.itemPrice = originalTxn.itemPrice;
        newTxn.quantity = originalTxn.quantity;
        newTxn.pickupLocation = originalTxn.pickupLocation;
        newTxn.meetupLocation = originalTxn.meetupLocation;
        newTxn.finalPickupLocation = originalTxn.finalPickupLocation;
        newTxn.finalMeetupLocation = originalTxn.finalMeetupLocation;
        newTxn.requirements = originalTxn.requirements;
        newTxn.contactInfo = originalTxn.contactInfo;
        newTxn.returnCondition = originalTxn.returnCondition;
        newTxn.rentalDuration = originalTxn.rentalDuration;
        newTxn.startDate = originalTxn.startDate;
        newTxn.endDate = originalTxn.endDate;
        newTxn.serviceSchedule = originalTxn.serviceSchedule;
        newTxn.serviceDuration = originalTxn.serviceDuration;
        newTxn.messageToSeller = originalTxn.messageToSeller;
        newTxn.createdAt = originalTxn.createdAt;
        newTxn.acceptedAt = originalTxn.acceptedAt;
    }
}
