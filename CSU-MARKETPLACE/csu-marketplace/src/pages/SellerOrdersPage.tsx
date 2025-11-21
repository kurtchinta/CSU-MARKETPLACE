import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import blockchainService from '../services/blockchainService';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  User, 
  MapPin, 
  Calendar,
  Loader,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';

interface SellerOrder {
  order_id: string;
  order_detail_id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  
  // Product info (snapshot from product at time of order)
  product_name: string;
  description: string;
  price: number;
  listing_type: string;
  condition?: string;  // Product condition (Brand New, Used, etc.)
  
  // Buyer info (from users table) - ENHANCED
  buyer_username: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_profile_picture: string | null;
  buyer_wallet: string | null;
  buyer_phone: string | null;
  buyer_department?: string;
  buyer_email?: string;
  buyer_id_number?: string;
  
  // Order details
  buyer_quantity: number;
  pickup_location?: string;
  meetup_location?: string;
  
  // Type-specific fields
  requirements?: string;
  return_condition?: string;
  rental_duration?: string;
  start_date?: string;
  end_date?: string;
  service_schedule?: string;
  service_duration?: string;
  
  // Communication
  message_to_seller?: string;
  
  // Seller Response
  final_pickup_location?: string;
  final_meetup_location?: string;
  rejection_reason?: string;
  
  // Buyer Actions
  cancellation_reason?: string;
  
  // Status & Timestamps
  order_status: string;
  created_at: string;
  updated_at?: string;
  
  // Transaction details (from transactions table)
  transaction_id?: string;
  blockchain_tx_hash?: string;
  transaction_status?: string;
  accepted_at?: string;
  rejected_at?: string;
  
  // Category (from products table)
  category_name?: string;
}

interface TransactionRecord {
  order_id: string;
  transaction_id?: string;
  blockchain_tx_hash?: string;
  transaction_status?: string;
  message_to_seller?: string;
}


export default function SellerOrdersPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useModal();

  useEffect(() => {
    document.title = 'Seller Orders - CSU Marketplace';
  }, []);

  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  // Accept/Reject form states
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [finalPickupLocation, setFinalPickupLocation] = useState('');
  const [finalMeetupLocation, setFinalMeetupLocation] = useState('');

  const normalizeStatus = (status?: string, fallback?: string) => {
    const normalized = (status || fallback || 'pending').toLowerCase();
    return normalized;
  };

  const fetchTransactionsMap = async (orderIds: string[]) => {
    const map = new Map<string, TransactionRecord>();
    if (!supabase || orderIds.length === 0) return map;

    // ✅ V6.6 FIX: Fetch the LATEST transaction for each order (handles multi-transaction model)
    // This will show the current status (PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED)
    const { data: transactionRecords, error } = await supabase
      .from('transactions')
      .select('order_id, transaction_id, blockchain_tx_hash, transaction_status, message_to_seller, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false });  // ✅ Get LATEST transaction (most recent)

    if (error) {
      console.error('Error loading transaction information:', error);
      return map;
    }

    // ✅ Store the LATEST transaction for each order (shows current status)
    (transactionRecords || []).forEach((record: TransactionRecord) => {
      if (record.order_id && !map.has(record.order_id)) {
        map.set(record.order_id, record);
      }
    });

    console.log('📊 Fetched latest transactions for', map.size, 'orders');
    return map;
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      if (!supabase) {
        showError('Error', 'Database connection not available');
        return;
      }

      console.log('🔍 Fetching orders for seller:', user?.id);

      // Fetch all order data from order_details where you are the seller
      const { data, error } = await supabase
        .from('order_details')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        showError('Error', 'Failed to load orders: ' + error.message);
        return;
      }

      console.log('✅ Found', data?.length || 0, 'orders');

      // Enrich orders with buyer info and transaction data
      if (data && data.length > 0) {
        const orderIds = data.map((order: any) => order.order_id).filter(Boolean);
        const transactionMap = await fetchTransactionsMap(orderIds);

        const ordersWithData = await Promise.all(
          data.map(async (order: any) => {
            try {
              // Get buyer details - FETCH ALL BUYER INFORMATION
              const { data: buyerData } = await supabase!
                .from('users')
                .select('username, first_name, last_name, phone_number, wallet_address, profile_picture_url, department, email, id_number')
                .eq('user_id', order.buyer_id)
                .single();

              // Get LATEST product info from products table
              const { data: productData } = await supabase!
                .from('products')
                .select('product_name, description, price, listing_type, category_id, images, condition')
                .eq('product_id', order.product_id)
                .single();

              let categoryName = '';
              if (productData?.category_id) {
                const { data: categoryData } = await supabase!
                  .from('categories')
                  .select('category_name')
                  .eq('category_id', productData.category_id)
                  .single();
                categoryName = categoryData?.category_name || '';
              }

              const transactionData = transactionMap.get(order.order_id);

              const enrichedOrder = {
                ...order,
                // Buyer information
                buyer_username: buyerData?.username,
                buyer_first_name: buyerData?.first_name,
                buyer_last_name: buyerData?.last_name,
                buyer_phone: buyerData?.phone_number,
                buyer_wallet: buyerData?.wallet_address,
                buyer_profile_picture: buyerData?.profile_picture_url,
                buyer_department: buyerData?.department,
                buyer_email: buyerData?.email,
                buyer_id_number: buyerData?.id_number,
                // Product information (LATEST from products table)
                product_name: productData?.product_name || order.product_name,
                description: productData?.description || order.description,
                price: productData?.price || order.price,
                listing_type: productData?.listing_type || order.listing_type,
                condition: productData?.condition || order.condition,
                category_name: categoryName,
                // Transaction information (LATEST transaction)
                transaction_id: transactionData?.transaction_id,
                blockchain_tx_hash: transactionData?.blockchain_tx_hash,
                transaction_status: transactionData?.transaction_status,
                order_status: normalizeStatus(transactionData?.transaction_status, order.order_status),
                message_to_seller: transactionData?.message_to_seller || order.message_to_seller,
                pickup_location: order.pickup_location,
                meetup_location: order.meetup_location
              };

              // Debug logging
              console.log('📦 Order Information:', {
                order_id: enrichedOrder.order_id,
                product_name: enrichedOrder.product_name,
                price: enrichedOrder.price,
                order_status: enrichedOrder.order_status,
                transaction_status: enrichedOrder.transaction_status,
                blockchain_tx_hash: enrichedOrder.blockchain_tx_hash
              });
              console.log('👤 Buyer Information:', {
                buyer_id: enrichedOrder.buyer_id,
                buyer_username: enrichedOrder.buyer_username,
                buyer_first_name: enrichedOrder.buyer_first_name,
                buyer_last_name: enrichedOrder.buyer_last_name,
                buyer_phone: enrichedOrder.buyer_phone,
                buyer_profile_picture: enrichedOrder.buyer_profile_picture,
                buyer_department: enrichedOrder.buyer_department,
                message_to_seller: enrichedOrder.message_to_seller,
                pickup_location: enrichedOrder.pickup_location,
                meetup_location: enrichedOrder.meetup_location
              });

              return enrichedOrder;
            } catch (err) {
              console.error('Error fetching supplementary data for order:', err);
              return order;
            }
          })
        );

        setOrders(ordersWithData);
        console.log('✅ Loaded', ordersWithData.length, 'orders for seller');
      } else {
        setOrders([]);
        console.log('⚠️ No orders found for seller');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      showError('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [showError, user]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, loadOrders]);

  useEffect(() => {
    if (!supabase || !user) return;
    
    // Listen to order_details changes
    const orderDetailsChannel = supabase
      .channel('seller_orders_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_details',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          console.log('🔁 Seller order update detected, reloading orders');
          loadOrders();
        }
      )
      .subscribe();

    // Listen to transactions table for real-time blockchain updates
    const transactionsChannel = supabase
      .channel('seller_transactions_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('🔁 Transaction update detected:', payload);
          // Reload orders when any transaction is updated (buyer completes, cancels, etc.)
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      orderDetailsChannel.unsubscribe();
      transactionsChannel.unsubscribe();
    };
  }, [user, loadOrders]);

  const formatPrice = (price: number): string => {
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    // Handle both ISO strings and Unix timestamps
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If invalid date, try parsing as Unix timestamp
      const unixTimestamp = parseInt(dateString);
      if (!isNaN(unixTimestamp)) {
        return new Date(unixTimestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder || !supabase) return;

    try {
      setProcessingOrderId(selectedOrder.order_id);
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ STARTING ORDER ACCEPTANCE PROCESS (SELLER)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 Order ID:', selectedOrder.order_id);
      console.log('📍 Final Pickup:', finalPickupLocation || 'Not specified');
      console.log('📍 Final Meetup:', finalMeetupLocation || 'Not specified');
      console.log('');

      // Ensure we have the original transaction ID (from initial order creation)
      if (!selectedOrder.transaction_id) {
        throw new Error('Original transaction ID not found. Order may not have been created properly.');
      }

      console.log('📤 Step 1: Calling blockchain to accept transaction (V6.6)...');
      console.log('   Original transaction_id:', selectedOrder.transaction_id);
      console.log('   💳 MetaMask will open for gas fee payment...');
      
      // Generate NEW transaction_id for acceptance
      const newTransactionId = crypto.randomUUID();
      console.log('   NEW transaction_id:', newTransactionId);
      
      // Step 1: ACCEPT the transaction on blockchain FIRST (V6.6 - wallet-agnostic)
      const blockchainAcceptResult = await blockchainService.acceptTransaction(
        selectedOrder.transaction_id,  // Original supabaseId
        newTransactionId,              // NEW supabaseId for acceptance
        finalPickupLocation || '',
        finalMeetupLocation || ''
      );

      if (!blockchainAcceptResult.success) {
        console.error('❌ Blockchain accept failed:', blockchainAcceptResult.message);
        throw new Error(blockchainAcceptResult.message || 'Failed to accept on blockchain');
      }

      console.log('✅ Blockchain transaction accepted!');
      console.log('🔗 Accept Transaction Hash:', blockchainAcceptResult.transactionHash);
      console.log('');
      
      // Use blockchain timestamp if available, otherwise fallback to current time
      const acceptTimestamp = blockchainAcceptResult.blockchainTimestamp || new Date().toISOString();
      console.log('📅 Using blockchain accepted_at timestamp:', acceptTimestamp);
      console.log('');
      
      console.log('📥 Step 2: Updating database with blockchain results...');
      
      // Step 2: Insert NEW transaction record with ACCEPTED status
      const { error: txInsertError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: newTransactionId,
          order_id: selectedOrder.order_id,
          buyer_id: selectedOrder.buyer_id,
          seller_id: selectedOrder.seller_id,
          product_id: selectedOrder.product_id,
          category_name: selectedOrder.category_name,
          item_name: selectedOrder.product_name,
          item_description: selectedOrder.description,
          item_price: selectedOrder.price,
          listing_type: selectedOrder.listing_type,
          quantity: selectedOrder.buyer_quantity,
          final_pickup_location: finalPickupLocation || selectedOrder.pickup_location,
          final_meetup_location: finalMeetupLocation || selectedOrder.meetup_location,
          return_condition: selectedOrder.return_condition,
          rental_duration: selectedOrder.rental_duration,
          start_date: selectedOrder.start_date,
          end_date: selectedOrder.end_date,
          service_schedule: selectedOrder.service_schedule,
          service_duration: selectedOrder.service_duration,
          message_to_seller: selectedOrder.message_to_seller,
          buyer_name: `${selectedOrder.buyer_first_name} ${selectedOrder.buyer_last_name}`,
          seller_name: user?.email || 'Seller',
          transaction_status: 'ACCEPTED',
          blockchain_tx_hash: blockchainAcceptResult.transactionHash,
          accepted_at: acceptTimestamp,
          created_at: acceptTimestamp,
          updated_at: acceptTimestamp,
          is_blockchain_pending: false
        });

      if (txInsertError) {
        console.error('⚠️ Error inserting acceptance transaction:', txInsertError);
        throw txInsertError;
      } else {
        console.log('✅ Acceptance transaction record inserted');
      }

      // Step 3: Update order_details status to accepted
      const { error: orderUpdateError } = await supabase
        .from('order_details')
        .update({
          order_status: 'accepted',
          final_pickup_location: finalPickupLocation || null,
          final_meetup_location: finalMeetupLocation || null,
          updated_at: acceptTimestamp
        })
        .eq('order_id', selectedOrder.order_id);

      if (orderUpdateError) {
        console.error('⚠️ Error updating order status:', orderUpdateError);
        throw orderUpdateError;
      } else {
        console.log('✅ Order status updated to accepted');
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ ORDER ACCEPTANCE SUCCESSFUL');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('� Blockchain TX:', blockchainAcceptResult.transactionHash);
      console.log('🌐 View on Etherscan:', `https://sepolia.etherscan.io/tx/${blockchainAcceptResult.transactionHash}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      showSuccess(
        '✅ Order Accepted Successfully!',
        `Order has been accepted and recorded on blockchain.\n\n` +
        `🔗 Transaction Hash: ${blockchainAcceptResult.transactionHash?.substring(0, 16)}...\n` +
        `📍 Pickup: ${finalPickupLocation || 'As specified'}\n` +
        `📍 Meetup: ${finalMeetupLocation || 'As specified'}\n\n` +
        `The buyer will be notified immediately.\n\n` +
        `View on Etherscan: https://sepolia.etherscan.io/tx/${blockchainAcceptResult.transactionHash?.substring(0, 10)}...`
      );

      // Automatically open Etherscan link in new tab
      setTimeout(() => {
        window.open(`https://sepolia.etherscan.io/tx/${blockchainAcceptResult.transactionHash}`, '_blank');
      }, 500);

      // Close modal and refresh
      setShowAcceptModal(false);
      setSelectedOrder(null);
      setFinalPickupLocation('');
      setFinalMeetupLocation('');
      
      // Reload orders to reflect changes
      setTimeout(() => loadOrders(), 1500);
      
    } catch (error: any) {
      console.error('❌ Error in handleAcceptOrder:', error);
      showError('Error', `Failed to accept order: ${error.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !supabase) return;

    try {
      setProcessingOrderId(selectedOrder.order_id);
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ STARTING ORDER REJECTION PROCESS (SELLER)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 Order ID:', selectedOrder.order_id);
      console.log('');

      // Ensure we have the original transaction ID
      if (!selectedOrder.transaction_id) {
        throw new Error('Original transaction ID not found');
      }

      console.log('� Step 1: Calling blockchain to reject transaction (V6.6)...');
      console.log('   Original transaction_id:', selectedOrder.transaction_id);
      console.log('   💳 MetaMask will open for gas fee payment...');
      
      // Generate NEW transaction_id for rejection
      const newTransactionId = crypto.randomUUID();
      console.log('   NEW transaction_id:', newTransactionId);
      
      // Step 1: REJECT the transaction on blockchain FIRST (V6.6 - wallet-agnostic)
      const blockchainRejectResult = await blockchainService.rejectTransaction(
        selectedOrder.transaction_id,   // Original supabaseId
        newTransactionId,               // NEW supabaseId for rejection
        'Order rejected by seller'
      );

      if (!blockchainRejectResult.success) {
        console.error('❌ Blockchain reject failed:', blockchainRejectResult.message);
        throw new Error(blockchainRejectResult.message || 'Failed to reject on blockchain');
      }

      console.log('✅ Blockchain transaction rejected!');
      console.log('🔗 Reject Transaction Hash:', blockchainRejectResult.transactionHash);
      console.log('');
      
      // Use blockchain timestamp if available, otherwise fallback to current time
      const rejectTimestamp = blockchainRejectResult.blockchainTimestamp || new Date().toISOString();
      console.log('📅 Using blockchain rejected_at timestamp:', rejectTimestamp);
      console.log('');
      
      console.log('📥 Step 2: Updating database with blockchain results...');
      
      // Step 2: Insert NEW transaction record with REJECTED status
      const { error: txInsertError } = await supabase
        .from('transactions')
        .insert({
          transaction_id: newTransactionId,
          order_id: selectedOrder.order_id,
          buyer_id: selectedOrder.buyer_id,
          seller_id: selectedOrder.seller_id,
          product_id: selectedOrder.product_id,
          category_name: selectedOrder.category_name,
          item_name: selectedOrder.product_name,
          item_description: selectedOrder.description,
          item_price: selectedOrder.price,
          listing_type: selectedOrder.listing_type,
          quantity: selectedOrder.buyer_quantity,
          final_pickup_location: selectedOrder.pickup_location,
          final_meetup_location: selectedOrder.meetup_location,
          return_condition: selectedOrder.return_condition,
          rental_duration: selectedOrder.rental_duration,
          start_date: selectedOrder.start_date,
          end_date: selectedOrder.end_date,
          service_schedule: selectedOrder.service_schedule,
          service_duration: selectedOrder.service_duration,
          message_to_seller: selectedOrder.message_to_seller,
          buyer_name: `${selectedOrder.buyer_first_name} ${selectedOrder.buyer_last_name}`,
          seller_name: user?.email || 'Seller',
          transaction_status: 'REJECTED',
          rejection_reason: 'Order rejected by seller',
          blockchain_tx_hash: blockchainRejectResult.transactionHash,
          rejected_at: rejectTimestamp,
          created_at: rejectTimestamp,
          updated_at: rejectTimestamp,
          is_blockchain_pending: false
        });

      // ✅ QUANTITY RESTORATION: Restore product quantity on rejection
      if (selectedOrder.listing_type === 'FOR_SALE' || selectedOrder.listing_type === 'FOR_RENT') {
        try {
          console.log('📦 Restoring product quantity after rejection...');
          console.log('   Product ID:', selectedOrder.product_id);
          console.log('   Quantity to restore:', selectedOrder.buyer_quantity);

          // Get current product quantity
          const { data: currentProduct, error: fetchError } = await supabase
            .from('products')
            .select('quantity, is_available')
            .eq('product_id', selectedOrder.product_id)
            .single();

          if (fetchError) {
            console.error('❌ Failed to fetch current product quantity:', fetchError);
          } else {
            const restoredQuantity = (currentProduct.quantity ?? 0) + selectedOrder.buyer_quantity;
            console.log('   Current quantity:', currentProduct.quantity);
            console.log('   Restored quantity:', restoredQuantity);

            const { error: quantityError } = await supabase
              .from('products')
              .update({ 
                quantity: restoredQuantity,
                is_available: true,  // Make available again
                updated_at: new Date().toISOString()
              })
              .eq('product_id', selectedOrder.product_id);

            if (quantityError) {
              console.error('❌ Failed to restore product quantity:', quantityError);
            } else {
              console.log('✅ Product quantity restored and marked as available');
            }
          }
        } catch (quantityRestoreError) {
          console.error('⚠️ Exception restoring product quantity:', quantityRestoreError);
        }
      }

      if (txInsertError) {
        console.error('⚠️ Error inserting rejection transaction:', txInsertError);
        throw txInsertError;
      } else {
        console.log('✅ Rejection transaction record inserted');
      }

      // Step 3: Update order_details status to rejected
      const { error: orderUpdateError } = await supabase
        .from('order_details')
        .update({
          order_status: 'rejected',
          rejection_reason: 'Order rejected by seller',
          updated_at: rejectTimestamp
        })
        .eq('order_id', selectedOrder.order_id);

      if (orderUpdateError) {
        console.error('⚠️ Error updating order status:', orderUpdateError);
        throw orderUpdateError;
      } else {
        console.log('✅ Order status updated to rejected');
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ ORDER REJECTION SUCCESSFUL');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('� Blockchain TX:', blockchainRejectResult.transactionHash);
      console.log('🌐 View on Etherscan:', `https://sepolia.etherscan.io/tx/${blockchainRejectResult.transactionHash}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      showSuccess(
        '✅ Order Rejected Successfully!',
        `Order has been rejected and recorded on blockchain.\n\n` +
        `🔗 Transaction Hash: ${blockchainRejectResult.transactionHash?.substring(0, 16)}...\n\n` +
        `The buyer will be notified immediately.\n\n` +
        `View on Etherscan: https://sepolia.etherscan.io/tx/${blockchainRejectResult.transactionHash?.substring(0, 10)}...`
      );

      // Automatically open Etherscan link in new tab
      setTimeout(() => {
        window.open(`https://sepolia.etherscan.io/tx/${blockchainRejectResult.transactionHash}`, '_blank');
      }, 500);

      // Close modal and refresh
      setShowRejectModal(false);
      setSelectedOrder(null);
      
      // Reload orders to reflect changes
      setTimeout(() => loadOrders(), 1500);
      
    } catch (error: any) {
      console.error('❌ Error in handleRejectOrder:', error);
      showError('Error', `Failed to reject order: ${error.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const openAcceptModal = (order: SellerOrder) => {
    setSelectedOrder(order);
    setFinalPickupLocation(order.pickup_location || '');
    setFinalMeetupLocation(order.meetup_location || '');
    setShowAcceptModal(true);
  };

  const openRejectModal = (order: SellerOrder) => {
    setSelectedOrder(order);
    setShowRejectModal(true);
  };

  const handleCompleteOrder = async (order: SellerOrder) => {
    if (!order.transaction_id || !supabase) {
      showError('Error', 'This order does not have a transaction ID.');
      return;
    }

    setProcessingOrderId(order.order_id);

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ STARTING ORDER COMPLETION PROCESS (SELLER)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📦 Order ID:', order.order_id);
      console.log('🔗 Transaction ID (Supabase):', order.transaction_id);
      console.log('👤 Seller ID:', user?.id);
      console.log('🛒 Buyer ID:', order.buyer_id);
      console.log('');

      // Get currently connected wallet
      const currentWallet = await blockchainService.getWalletAddress();
      if (!currentWallet) {
        showError('Error', 'Please connect your MetaMask wallet first');
        setProcessingOrderId(null);
        return;
      }
      console.log('🔗 Using wallet:', currentWallet);
      console.log('');

      // Generate NEW transaction_id for V6.6 completion
      const newTransactionId = crypto.randomUUID();
      console.log('📤 Step 1: Calling blockchain service to complete transaction (V6.6)...');
      console.log('   Original transaction_id:', order.transaction_id);
      console.log('   NEW transaction_id:', newTransactionId);
      console.log('   Using wallet:', currentWallet);
      
      const completeResult = await blockchainService.completeTransaction(
        order.transaction_id,  // Original transaction ID
        newTransactionId       // NEW transaction ID for completion
      );

      console.log('📥 Step 2: Blockchain service response received');
      console.log('   Success:', completeResult.success);
      console.log('   Transaction Hash:', completeResult.transactionHash || 'N/A');
      console.log('   Message:', completeResult.message);

      if (!completeResult.success) {
        throw new Error(completeResult.message || 'Failed to complete transaction on blockchain');
      }

      console.log('✅ Blockchain completion successful!');
      console.log('');

      // Update database ONLY after successful blockchain transaction
      if (completeResult.transactionHash) {
        const completedTimestamp = completeResult.blockchainTimestamp || new Date().toISOString();
        console.log('📅 Using blockchain completed_at timestamp:', completedTimestamp);

        // Insert NEW transaction record with COMPLETED status
        const { error: txInsertError } = await supabase
          .from('transactions')
          .insert({
            transaction_id: newTransactionId,
            order_id: order.order_id,
            buyer_id: order.buyer_id,
            seller_id: order.seller_id,
            product_id: order.product_id,
            category_name: order.category_name,
            item_name: order.product_name,
            item_description: order.description,
            item_price: order.price,
            listing_type: order.listing_type,
            quantity: order.buyer_quantity,
            final_pickup_location: order.final_pickup_location || order.pickup_location,
            final_meetup_location: order.final_meetup_location || order.meetup_location,
            return_condition: order.return_condition,
            rental_duration: order.rental_duration,
            start_date: order.start_date,
            end_date: order.end_date,
            service_schedule: order.service_schedule,
            service_duration: order.service_duration,
            message_to_seller: order.message_to_seller,
            buyer_name: `${order.buyer_first_name} ${order.buyer_last_name}`,
            seller_name: user?.email || 'Seller',
            transaction_status: 'COMPLETED',
            blockchain_tx_hash: completeResult.transactionHash,
            completed_at: completedTimestamp,
            created_at: completedTimestamp,
            updated_at: completedTimestamp,
            is_blockchain_pending: false
          });

        if (txInsertError) {
          console.error('⚠️ Error inserting completion transaction:', txInsertError);
        } else {
          console.log('✅ Completion transaction record inserted');
        }

        // Update order_details status to completed
        const { error: orderUpdateError } = await supabase
          .from('order_details')
          .update({
            order_status: 'completed',
            updated_at: completedTimestamp
          })
          .eq('order_id', order.order_id);

        if (orderUpdateError) {
          console.error('⚠️ Error updating order status:', orderUpdateError);
        } else {
          console.log('✅ Order status updated to completed');
        }
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ ORDER COMPLETION SUCCESSFUL');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔗 Blockchain TX:', completeResult.transactionHash);
      console.log('🌐 View on Etherscan:', `https://sepolia.etherscan.io/tx/${completeResult.transactionHash}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      showSuccess(
        '✅ Transaction Completed Successfully!',
        `Transaction has been marked as complete on blockchain.\n\n` +
        `🔗 Transaction Hash: ${completeResult.transactionHash?.substring(0, 16)}...\n\n` +
        `The buyer will be notified immediately.`
      );

      // Automatically open Etherscan link in new tab
      setTimeout(() => {
        window.open(`https://sepolia.etherscan.io/tx/${completeResult.transactionHash}`, '_blank');
      }, 500);

      // Reload orders to reflect changes
      console.log('🔄 Reloading orders to reflect changes...');
      await loadOrders();
      console.log('✅ Orders reloaded successfully');
    } catch (error: any) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ ORDER COMPLETION FAILED');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════════');
      console.error('');
      showError('Error', error.message || 'Failed to complete transaction');
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#208756' }} />
          <p style={{ color: '#666666' }}>Loading order requests...</p>
        </div>
      </div>
    );
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.order_status === filter);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container mx-auto px-6 lg:px-12 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#208756' }}>Order Requests</h1>
          <p className="text-base" style={{ color: '#666666' }}>Manage purchase requests from buyers</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map((tab) => {
              const count = tab === 'all' ? orders.length : orders.filter(o => o.order_status === tab).length;
              const isActive = filter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                    isActive
                      ? 'border-b-2 text-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                  style={isActive ? { backgroundColor: '#208756', borderColor: '#208756', color: 'white' } : {}}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border-t-4 overflow-hidden" style={{ borderTopColor: '#208756', borderColor: '#e0e0e0' }}>
            <div className="p-12 text-center">
              <Package className="w-20 h-20 mx-auto mb-4" style={{ color: '#d4e8e4' }} />
              <p style={{ color: '#1a1a1a' }} className="mb-2 text-lg font-semibold">No order requests found</p>
              <p style={{ color: '#666666' }} className="mb-6">
                {filter === 'all' 
                  ? "You haven't received any order requests yet." 
                  : `No ${filter} orders at the moment.`}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="font-medium transition-colors"
                  style={{ color: '#208756' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#1a6d46')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#208756')}
                >
                  View all orders
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.order_id} className="bg-white rounded-lg shadow-sm overflow-hidden border-t-4 hover:shadow-md transition-shadow" style={{ borderTopColor: '#208756' }}>
                {/* Order Header - Always Visible */}
                <div 
                  onClick={() => setExpandedOrderId(expandedOrderId === order.order_id ? null : order.order_id)}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 flex items-start gap-4">
                      {/* Buyer Profile Picture */}
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {order.buyer_profile_picture ? (
                          <img 
                            src={order.buyer_profile_picture} 
                            alt={order.buyer_username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#1a1a1a' }}>{order.product_name}</h3>
                        <div className="flex flex-wrap gap-3 text-sm" style={{ color: '#666666' }}>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {order.buyer_first_name} {order.buyer_last_name} (@{order.buyer_username})
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(order.created_at)}
                          </span>
                          <span className="flex items-center gap-1 uppercase font-medium" style={{ color: '#208756' }}>
                            {order.listing_type.replace('_', ' ')}
                          </span>
                        </div>
                        {order.blockchain_tx_hash && (
                          <div className="mt-3 flex items-center gap-2">
                            <div 
                              className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full cursor-pointer transition-colors"
                              style={{ 
                                backgroundColor: order.order_status === 'accepted' ? '#f0fdf4' : order.order_status === 'rejected' ? '#fef2f2' : '#f0f8f6',
                                color: order.order_status === 'accepted' ? '#10b981' : order.order_status === 'rejected' ? '#ef4444' : '#208756',
                                border: `1px solid ${order.order_status === 'accepted' ? '#10b981' : order.order_status === 'rejected' ? '#ef4444' : '#208756'}`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(order.blockchain_tx_hash!);
                              }}
                            >
                              {copiedHash === order.blockchain_tx_hash ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              {order.blockchain_tx_hash.substring(0, 10)}...
                            </div>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${order.blockchain_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs inline-flex items-center gap-1 transition-colors font-medium"
                              style={{ color: '#208756' }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#1a6d46')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#208756')}
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {!order.blockchain_tx_hash && (
                          <div className="mt-3 text-xs" style={{ color: '#999999' }}>
                            Blockchain transaction pending...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>{formatPrice(order.price * order.buyer_quantity)}</p>
                      <p className="text-sm" style={{ color: '#666666' }}>{formatPrice(order.price)} × {order.buyer_quantity}</p>
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                        order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.order_status === 'accepted' ? 'bg-green-100 text-green-800' :
                        order.order_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                      </span>
                      {expandedOrderId === order.order_id ? (
                        <ChevronUp className="w-5 h-5" style={{ color: '#666666' }} />
                      ) : (
                        <ChevronDown className="w-5 h-5" style={{ color: '#666666' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Details */}
                {expandedOrderId === order.order_id && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-6">
                    {/* Blockchain Status Alert for Pending Orders */}
                    {order.order_status === 'pending' && order.blockchain_tx_hash && (
                      <div className="rounded-lg p-4 border" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
                        <p style={{ color: '#92400e', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                          Order waiting for your response...
                        </p>
                        <p style={{ color: '#b45309', fontSize: '12px', margin: '4px 0 0 0' }}>
                          Buyer's transaction is recorded on blockchain. Accept or reject this order.
                        </p>
                      </div>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column - Buyer Information */}
                      <div className="space-y-6">
                        {/* Buyer Details */}
                        <div className="rounded-lg p-5 border" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4' }}>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                            <User className="w-4 h-4" />
                            Buyer Information
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Name:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>
                                {order.buyer_first_name} {order.buyer_last_name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Username:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>@{order.buyer_username}</span>
                            </div>
                            {order.buyer_department && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Department:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.buyer_department}</span>
                              </div>
                            )}
                            {order.buyer_id_number && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>ID Number:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600', fontFamily: 'monospace' }}>{order.buyer_id_number}</span>
                              </div>
                            )}
                                                        {order.buyer_email && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Email:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600', fontSize: '12px' }}>{order.buyer_email}</span>
                              </div>
                            )}
                            {order.buyer_phone && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Phone:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.buyer_phone}</span>
                              </div>
                            )}
                            {order.buyer_wallet && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Wallet:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>
                                  {order.buyer_wallet.substring(0, 12)}...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location Details */}
                        {(order.pickup_location || order.meetup_location) && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#f8f9fa', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                              <MapPin className="w-4 h-4" />
                              Location Details
                            </h4>
                            <div className="space-y-3 text-sm">
                              {order.pickup_location && (
                                <div className="rounded p-3" style={{ backgroundColor: '#f0f8f6', borderLeft: '4px solid #208756' }}>
                                  <span style={{ color: '#666666', fontWeight: '600', fontSize: '12px' }}>Pickup Location:</span>
                                  <p style={{ color: '#1a1a1a', margin: '4px 0 0 0', fontWeight: '500' }}>{order.pickup_location}</p>
                                </div>
                              )}
                              {order.meetup_location && (
                                <div className="rounded p-3" style={{ backgroundColor: '#f0f8f6', borderLeft: '4px solid #208756' }}>
                                  <span style={{ color: '#666666', fontWeight: '600', fontSize: '12px' }}>📍 Meetup Location:</span>
                                  <p style={{ color: '#1a1a1a', margin: '4px 0 0 0', fontWeight: '500' }}>{order.meetup_location}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Message from Buyer */}
                        <div className="rounded-lg p-5 border" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4', borderLeft: '4px solid #208756' }}>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                             Message from Buyer
                          </h4>
                          {order.message_to_seller ? (
                            <p style={{ color: '#1a1a1a', fontSize: '14px', fontStyle: 'italic', margin: '0' }}>
                              "{order.message_to_seller}"
                            </p>
                          ) : (
                            <p style={{ color: '#999999', fontSize: '14px', fontStyle: 'italic', margin: '0' }}>
                              No message provided
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Order Details & Product Information */}
                      <div className="space-y-6">
                        {/* Order Summary */}
                        <div className="rounded-lg p-5 border" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0' }}>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                            <Package className="w-4 h-4" />
                            Order Summary
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Product:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.product_name}</span>
                            </div>
                            {order.category_name && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Category:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.category_name}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Listing Type:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.listing_type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Quantity Ordered:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.buyer_quantity}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Price per unit:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{formatPrice(order.price)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#e0e0e0' }}>
                              <span style={{ color: '#666666', fontWeight: '700' }}>Total Amount:</span>
                              <span style={{ color: '#208756', fontWeight: '700', fontSize: '18px' }}>
                                {formatPrice(order.price * order.buyer_quantity)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span style={{ color: '#666666' }}>Order ID:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>
                                {order.order_id.substring(0, 12)}...
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Order Date:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Product/Service Information - Dynamic based on listing type */}
                        {order.listing_type === 'FOR_SALE' && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                              <Package className="w-4 h-4" />
                              Product Information
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span style={{ color: '#666666', fontWeight: '600' }}>Quantity Ordered: </span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.buyer_quantity}</span>
                              </div>
                              {order.condition && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Condition: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.condition}</span>
                                </div>
                              )}
                              {order.requirements && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Requirements: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.requirements}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Rental Information */}
                        {order.listing_type === 'FOR_RENT' && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                              <Calendar className="w-4 h-4" />
                              Rental Information
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span style={{ color: '#666666', fontWeight: '600' }}>Quantity Ordered: </span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.buyer_quantity}</span>
                              </div>
                              {order.rental_duration && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Rental Duration: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.rental_duration}</span>
                                </div>
                              )}
                              {(order.start_date && order.end_date) && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Rental Period: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>
                                    {formatDate(order.start_date)} - {formatDate(order.end_date)}
                                  </span>
                                </div>
                              )}
                              {order.return_condition && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Return Condition: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.return_condition}</span>
                                </div>
                              )}
                              {order.requirements && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Requirements: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.requirements}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Service Information */}
                        {order.listing_type === 'SERVICE' && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                              <Calendar className="w-4 h-4" />
                              Service Information
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span style={{ color: '#666666', fontWeight: '600' }}>Quantity Ordered: </span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.buyer_quantity}</span>
                              </div>
                              {order.service_schedule && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Service Schedule (Buyer): </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.service_schedule}</span>
                                </div>
                              )}
                              {order.service_duration && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Service Duration (Buyer): </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.service_duration}</span>
                                </div>
                              )}
                              {order.requirements && (
                                <div>
                                  <span style={{ color: '#666666', fontWeight: '600' }}>Requirements: </span>
                                  <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.requirements}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blockchain Info - Show for all orders with blockchain transaction */}
                    {order.blockchain_tx_hash && (
                      <div className="rounded-lg p-5 border-2" style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: order.order_status === 'accepted' ? '#10b981' : 
                                    order.order_status === 'rejected' ? '#ef4444' : 
                                    order.order_status === 'completed' ? '#3b82f6' : 
                                    order.order_status === 'cancelled' ? '#f59e0b' : '#208756'
                      }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold flex items-center gap-2" style={{ 
                            color: order.order_status === 'accepted' ? '#10b981' : 
                                  order.order_status === 'rejected' ? '#ef4444' : 
                                  order.order_status === 'completed' ? '#3b82f6' : 
                                  order.order_status === 'cancelled' ? '#f59e0b' : '#208756'
                          }}>
                            <span>
                              {order.order_status === 'accepted' && '✅ Transaction Accepted on Blockchain'}
                              {order.order_status === 'rejected' && '❌ Transaction Rejected on Blockchain'}
                              {order.order_status === 'completed' && '✅ Transaction Completed on Blockchain'}
                              {order.order_status === 'cancelled' && '🚫 Transaction Cancelled on Blockchain'}
                              {order.order_status === 'pending' && '🔗 Blockchain Transaction Recorded'}
                            </span>
                          </h4>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${order.blockchain_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                            style={{ 
                              backgroundColor: order.order_status === 'accepted' ? '#10b981' : 
                                              order.order_status === 'rejected' ? '#ef4444' : 
                                              order.order_status === 'completed' ? '#3b82f6' : 
                                              order.order_status === 'cancelled' ? '#f59e0b' : '#208756',
                              color: 'white'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.opacity = '0.8';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            View on Etherscan
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span style={{ color: '#666666', fontSize: '12px' }}>Transaction Hash:</span>
                            <button
                              onClick={() => copyToClipboard(order.blockchain_tx_hash!)}
                              className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full transition-colors"
                              style={{
                                backgroundColor: '#f8f9fa',
                                color: '#208756',
                                border: '1px solid #d4e8e4'
                              }}
                            >
                              {copiedHash === order.blockchain_tx_hash ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <code className="text-xs font-mono break-all p-2 rounded block" style={{ color: '#666666', backgroundColor: '#f8f9fa' }}>
                            {order.blockchain_tx_hash}
                          </code>
                          <div style={{ 
                            backgroundColor: order.order_status === 'accepted' ? '#f0fdf4' : 
                                            order.order_status === 'rejected' ? '#fef2f2' : 
                                            order.order_status === 'completed' ? '#eff6ff' : 
                                            order.order_status === 'cancelled' ? '#fffbeb' : '#f0f8f6', 
                            borderRadius: '6px', 
                            padding: '12px', 
                            marginTop: '8px',
                            border: `1px solid ${order.order_status === 'accepted' ? '#10b981' : 
                                                  order.order_status === 'rejected' ? '#ef4444' : 
                                                  order.order_status === 'completed' ? '#3b82f6' : 
                                                  order.order_status === 'cancelled' ? '#f59e0b' : '#208756'}`
                          }}>
                            <p style={{ 
                              color: order.order_status === 'accepted' ? '#10b981' : 
                                    order.order_status === 'rejected' ? '#ef4444' : 
                                    order.order_status === 'completed' ? '#3b82f6' : 
                                    order.order_status === 'cancelled' ? '#f59e0b' : '#208756', 
                              fontSize: '13px', 
                              margin: 0,
                              fontWeight: '600'
                            }}>
                              {order.order_status === 'accepted' && '✅ This order has been accepted and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'rejected' && '❌ This order has been rejected and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'completed' && '✅ This transaction is complete and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'cancelled' && '🚫 This order was cancelled and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'pending' && '⏳ Transaction is waiting for your response on the blockchain'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Show Complete for accepted orders, Accept/Reject for pending */}
                    {order.order_status === 'accepted' && (
                      <div className="flex gap-4 pt-6 border-t" style={{ borderColor: '#e0e0e0' }}>
                        <button
                          onClick={() => handleCompleteOrder(order)}
                          disabled={processingOrderId === order.order_id}
                          className="flex-1 px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                          style={{
                            backgroundColor: processingOrderId === order.order_id ? '#9ca3af' : '#208756',
                            color: 'white',
                            fontSize: '16px',
                            border: 'none'
                          }}
                          onMouseOver={(e) => {
                            if (processingOrderId !== order.order_id) {
                              e.currentTarget.style.backgroundColor = '#1a6d46';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (processingOrderId !== order.order_id) {
                              e.currentTarget.style.backgroundColor = '#208756';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          <CheckCircle className="w-5 h-5" />
                          {processingOrderId === order.order_id ? 'Completing Transaction...' : 'Complete Transaction'}
                        </button>
                      </div>
                    )}

                    {/* Action Buttons - Only show for pending orders */}
                    {order.order_status === 'pending' && (
                      <div className="flex gap-4 pt-6 border-t" style={{ borderColor: '#e0e0e0' }}>
                        <button
                          onClick={() => openAcceptModal(order)}
                          disabled={processingOrderId === order.order_id}
                          className="flex-1 px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                          style={{
                            backgroundColor: processingOrderId === order.order_id ? '#9ca3af' : '#208756',
                            color: 'white',
                            fontSize: '16px',
                            border: 'none'
                          }}
                          onMouseOver={(e) => {
                            if (processingOrderId !== order.order_id) {
                              e.currentTarget.style.backgroundColor = '#1a6d46';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = processingOrderId === order.order_id ? '#9ca3af' : '#208756';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {processingOrderId === order.order_id ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-6 h-6" />
                              Accept Order
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openRejectModal(order)}
                          disabled={processingOrderId === order.order_id}
                          className="flex-1 px-8 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                          style={{
                            backgroundColor: 'white',
                            color: processingOrderId === order.order_id ? '#9ca3af' : '#ef4444',
                            fontSize: '16px',
                            border: processingOrderId === order.order_id ? '2px solid #d1d5db' : '2px solid #ef4444'
                          }}
                          onMouseOver={(e) => {
                            if (processingOrderId !== order.order_id) {
                              e.currentTarget.style.backgroundColor = '#fef2f2';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {processingOrderId === order.order_id ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-6 h-6" />
                              Reject Order
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accept Order Modal */}
      {showAcceptModal && selectedOrder && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#208756' }}>Accept Order</h2>
            <p className="text-gray-600 mb-6">
              Accepting this order for <strong>{selectedOrder.product_name}</strong> from <strong>{selectedOrder.buyer_first_name} {selectedOrder.buyer_last_name}</strong>.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Pickup Location (Optional)
                </label>
                <input
                  type="text"
                  value={finalPickupLocation}
                  onChange={(e) => setFinalPickupLocation(e.target.value)}
                  placeholder="Confirm or modify pickup location"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ borderColor: '#d4e8e4', outline: 'none' }}
                  onFocus={(e) => (e.target.style.borderColor = '#208756')}
                  onBlur={(e) => (e.target.style.borderColor = '#d4e8e4')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {selectedOrder.pickup_location || 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Meetup Location (Optional)
                </label>
                <input
                  type="text"
                  value={finalMeetupLocation}
                  onChange={(e) => setFinalMeetupLocation(e.target.value)}
                  placeholder="Confirm or modify meetup location"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ borderColor: '#d4e8e4', outline: 'none' }}
                  onFocus={(e) => (e.target.style.borderColor = '#208756')}
                  onBlur={(e) => (e.target.style.borderColor = '#d4e8e4')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {selectedOrder.meetup_location || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#f0f8f6', border: '1px solid #d4e8e4' }}>
              <p className="text-sm" style={{ color: '#208756' }}>
                ℹ️ This will create a transaction record and update the blockchain.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAcceptOrder}
                disabled={processingOrderId === selectedOrder.order_id}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#208756', color: 'white' }}
                onMouseOver={(e) => !processingOrderId && (e.currentTarget.style.backgroundColor = '#1a6d46')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#208756')}
              >
                {processingOrderId === selectedOrder.order_id ? 'Processing...' : 'Confirm Accept'}
              </button>
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setSelectedOrder(null);
                  setFinalPickupLocation('');
                  setFinalMeetupLocation('');
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#e0e0e0', color: '#666666' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d4d4d4')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#ef4444' }}>Reject Order</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject this order from <strong>{selectedOrder.buyer_first_name} {selectedOrder.buyer_last_name}</strong> for <strong>{selectedOrder.product_name}</strong>?
            </p>

            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-sm" style={{ color: '#ef4444' }}>
                ⚠️ This action will be recorded on the blockchain and cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleRejectOrder}
                disabled={processingOrderId === selectedOrder.order_id}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
                onMouseOver={(e) => !processingOrderId && (e.currentTarget.style.backgroundColor = '#dc2626')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
              >
                {processingOrderId === selectedOrder.order_id ? 'Processing...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#e0e0e0', color: '#666666' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d4d4d4')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
