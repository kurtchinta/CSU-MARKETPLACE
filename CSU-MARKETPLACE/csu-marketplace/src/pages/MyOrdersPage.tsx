import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import blockchainService from '../services/blockchainService';
import { 
  Package, 
  XCircle, 
  User, 
  MapPin, 
  MessageSquare, 
  Calendar,
  Loader,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Trash2
} from 'lucide-react';

interface OrderDetail {
  order_id: string;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  product_name: string;
  description: string;
  price: number;
  listing_type: string;
  buyer_quantity: number;
  pickup_location?: string;
  meetup_location?: string;
  final_pickup_location?: string;
  final_meetup_location?: string;
  message_to_seller?: string;
  rental_duration?: string;
  start_date?: string;
  end_date?: string;
  return_condition?: string;
  condition?: string;
  service_schedule?: string;
  service_duration?: string;
  requirements?: string;
  order_status: string;
  created_at: string;
  updated_at?: string;
  
  // Seller information (enriched)
  seller_username?: string;
  seller_first_name?: string;
  seller_last_name?: string;
  seller_phone?: string;
  seller_profile_picture?: string | null;
  seller_wallet?: string | null;
  seller_department?: string;
  seller_email?: string;
  seller_id_number?: string;
  seller_contact_info?: string;
  
  // Transaction details
  transaction_id?: string;
  blockchain_tx_hash?: string;
  transaction_status?: string;
  category_name?: string;
  buyer_wallet?: string;  // Wallet address that placed the order
  has_reviewed?: boolean;  // Whether buyer has reviewed this transaction
}

interface TransactionRecord {
  order_id: string;
  transaction_id?: string;
  blockchain_tx_hash?: string;
  transaction_status?: string;
  message_to_seller?: string;
  buyer_wallet?: string;  // Wallet address that placed the order
  pending_at?: string;  // Timestamp of original transaction creation
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useModal();

  useEffect(() => {
    document.title = 'My Orders - CSU Marketplace';
  }, []);

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const normalizeStatus = (status?: string, fallback?: string) => {
    // Normalize status to lowercase for consistent display
    // Handles both 'CANCELLED' (from transactions table) and 'cancelled' (from order_details)
    const normalized = (status || fallback || 'pending').toLowerCase();
    return normalized;
  };

  const fetchTransactionsMap = async (orderIds: string[]) => {
    const map = new Map<string, TransactionRecord>();
    if (!supabase || orderIds.length === 0) return map;

    // ✅ V6.5 FIX: Fetch the LATEST transaction for each order (handles multi-transaction model)
    // This will show the current status (PENDING, ACCEPTED, REJECTED, CANCELLED, etc.)
    const { data: transactionRecords, error } = await supabase
      .from('transactions')
      .select('order_id, transaction_id, blockchain_tx_hash, transaction_status, message_to_seller, buyer_wallet, pending_at, created_at')
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

      console.log('🔍 Fetching orders for buyer:', user?.id);

      // Fetch all order data from order_details where you are the buyer
      const { data, error } = await supabase
        .from('order_details')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        showError('Error', 'Failed to load orders: ' + error.message);
        return;
      }

      console.log('✅ Found', data?.length || 0, 'orders');

      // Enrich orders with seller info and transaction data
      if (data && data.length > 0) {
        const orderIds = data.map((order: any) => order.order_id).filter(Boolean);
        const transactionMap = await fetchTransactionsMap(orderIds);

        const ordersWithData = await Promise.all(
          data.map(async (order: any) => {
            try {
              // Get seller details
              const { data: sellerData } = await supabase!
                .from('users')
                .select('username, first_name, last_name, phone_number, wallet_address, profile_picture_url, department, email, id_number')
                .eq('user_id', order.seller_id)
                .single();

              // Get product details (contact info, requirements, category, return_condition, condition)
              const { data: productData } = await supabase!
                .from('products')
                .select('category_id, contact_information, requirements, return_condition, condition')
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

              // Check if buyer has reviewed this transaction
              let hasReviewed = false;
              if (transactionData?.transaction_id) {
                const { data: reviewData } = await supabase!
                  .from('reviews')
                  .select('review_id')
                  .eq('transaction_id', transactionData.transaction_id)
                  .eq('reviewer_id', user?.id)
                  .single();
                hasReviewed = !!reviewData;
              }

              const enrichedOrder = {
                ...order,
                seller_username: sellerData?.username,
                seller_first_name: sellerData?.first_name,
                seller_last_name: sellerData?.last_name,
                seller_phone: sellerData?.phone_number,
                seller_wallet: sellerData?.wallet_address,
                seller_profile_picture: sellerData?.profile_picture_url,
                seller_department: sellerData?.department,
                seller_email: sellerData?.email,
                seller_id_number: sellerData?.id_number,
                seller_contact_info: productData?.contact_information || sellerData?.phone_number,
                requirements: productData?.requirements,
                condition: productData?.condition,
                category_name: categoryName,
                transaction_id: transactionData?.transaction_id,
                blockchain_tx_hash: transactionData?.blockchain_tx_hash,
                buyer_wallet: transactionData?.buyer_wallet,  // ✅ ADDED: Track buyer wallet
                has_reviewed: hasReviewed,
                order_status: normalizeStatus(transactionData?.transaction_status, order.order_status),
                message_to_seller: order.message_to_seller || transactionData?.message_to_seller,
                pickup_location: order.pickup_location,
                meetup_location: order.meetup_location,
                rental_duration: order.rental_duration,
                start_date: order.start_date,
                end_date: order.end_date,
                return_condition: productData?.return_condition || order.return_condition
              };

              // Debug logging for status
              if (transactionData?.transaction_status) {
                console.log(`📊 Order ${order.order_id.substring(0, 8)}... status:`, {
                  transaction_status: transactionData.transaction_status,
                  order_status: order.order_status,
                  normalized_status: enrichedOrder.order_status
                });
              }

              return enrichedOrder;
            } catch (err) {
              console.error('Error fetching supplementary data for order:', err);
              return order;
            }
          })
        );

        setOrders(ordersWithData);
        console.log('✅ Loaded', ordersWithData.length, 'orders for buyer');
      } else {
        setOrders([]);
        console.log('⚠️ No orders found for buyer');
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
      .channel('buyer_orders_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_details',
          filter: `buyer_id=eq.${user.id}`
        },
        () => {
          console.log('🔁 Buyer order update detected, reloading orders');
          loadOrders();
        }
      )
      .subscribe();

    // Listen to transactions table for real-time blockchain updates
    const transactionsChannel = supabase
      .channel('buyer_transactions_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('🔁 Transaction update detected:', payload);
          // Reload orders when any transaction is updated (seller accepts, rejects, completes, etc.)
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

  const handleCompleteOrder = async (order: OrderDetail) => {
    if (!order.transaction_id) {
      showError('Error', 'This order does not have a transaction ID.');
      return;
    }

    setProcessingOrderId(order.order_id);

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ STARTING ORDER COMPLETION PROCESS (BUYER)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📦 Order ID:', order.order_id);
      console.log('🔗 Transaction ID (Supabase):', order.transaction_id);
      console.log('👤 Buyer ID:', user?.id);
      console.log('🏪 Seller ID:', order.seller_id);
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
      if (supabase && completeResult.transactionHash) {
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
            buyer_name: `${order.seller_first_name} ${order.seller_last_name}`,
            seller_name: user?.email || 'Buyer',
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
        'Transaction Completed', 
        `The transaction has been marked as complete on the blockchain.\n\n🔗 Transaction: ${completeResult.transactionHash?.substring(0, 10)}...\n\nView on Etherscan: https://sepolia.etherscan.io/tx/${completeResult.transactionHash?.substring(0, 10)}...`
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

  const handleCancelOrder = async (order: OrderDetail) => {
    if (!order.transaction_id) {
      showError('Error', 'This order does not have a transaction ID.');
      return;
    }

    setProcessingOrderId(order.order_id);

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚫 STARTING ORDER CANCELLATION PROCESS');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📦 Order ID:', order.order_id);
      console.log('🔗 Transaction ID (Supabase):', order.transaction_id);
      console.log('👤 Buyer ID:', user?.id);
      console.log('🏪 Seller ID:', order.seller_id);
      console.log('');

      // Get currently connected wallet (no validation - any wallet can cancel)
      const currentWallet = await blockchainService.getWalletAddress();
      if (!currentWallet) {
        showError(
          'Wallet Not Connected',
          'Please connect your MetaMask wallet and try again.'
        );
        return;
      }
      console.log('🔗 Using wallet:', currentWallet);
      console.log('');

      // Get cancellation reason
      const cancellationReason = await showCancellationModal(order);
      if (cancellationReason === null) return;

      console.log('💬 Cancellation Reason:', cancellationReason);
      console.log('');
      
      // Step 1: Call database function to cancel order and create transaction record
      console.log('📤 Step 1: Calling database function to cancel order...');
      const { data: newTransactionId, error: cancelDbError } = await supabase!.rpc('cancel_order_by_buyer', {
        p_order_id: order.order_id,
        p_cancellation_reason: cancellationReason
      });

      if (cancelDbError) {
        console.error('❌ Database function error:', cancelDbError);
        showError('Database Error', 'Failed to cancel order: ' + cancelDbError.message);
        return;
      }

      console.log('✅ Order cancelled in database, transaction ID:', newTransactionId);

      console.log('📊 Transaction data ready for blockchain');
      console.log('🔗 Cancelling transaction on blockchain (V6.6)...');
      console.log('💳 MetaMask will open for gas fee payment');

      // Step 2: CANCEL the transaction on blockchain (V6.6 - wallet-agnostic)
      console.log('🔗 Calling cancelTransactionV5 on blockchain...');
      console.log('   Original transaction_id:', order.transaction_id);
      console.log('   NEW transaction_id:', newTransactionId);
      const cancelResult = await blockchainService.cancelTransactionV5(
        order.transaction_id,  // Original supabaseId
        newTransactionId,      // NEW supabaseId for cancellation
        cancellationReason
      );

      console.log('📥 Step 2: Blockchain service response received');
      console.log('   Success:', cancelResult.success);
      console.log('   Transaction Hash:', cancelResult.transactionHash || 'N/A');
      console.log('   Message:', cancelResult.message);

      if (!cancelResult.success) {
        console.error('❌ Blockchain cancellation failed:', cancelResult.message);
        showError('Blockchain Error', cancelResult.message || 'Failed to cancel order on blockchain');
        return;
      }

      console.log('✅ Blockchain transaction cancelled!');
      console.log('🔗 Cancel Transaction Hash:', cancelResult.transactionHash);
      
      // Use blockchain timestamp if available, otherwise fallback to current time
      const cancelTimestamp = cancelResult.blockchainTimestamp || new Date().toISOString();
      console.log('📅 Using blockchain cancelled_at timestamp:', cancelTimestamp);
      
      // Step 3: Update transaction record with REAL blockchain hash from MetaMask
      const { error: updateError } = await supabase!
        .from('transactions')
        .update({
          blockchain_tx_hash: cancelResult.transactionHash,
          transaction_status: 'CANCELLED',
          cancelled_at: cancelTimestamp,
          updated_at: cancelTimestamp,
          is_blockchain_pending: false
        })
        .eq('transaction_id', newTransactionId);

      if (updateError) {
        console.error('⚠️ Error updating transaction in DB:', updateError);
      } else {
        console.log('✅ Transaction record updated with blockchain hash');
      }

      // Step 4: Update order_details status (this triggers real-time sync to SellerOrdersPage)
      const { error: orderUpdateError } = await supabase!
        .from('order_details')
        .update({
          order_status: 'cancelled',
          cancellation_reason: cancellationReason,
          updated_at: cancelTimestamp
        })
        .eq('order_id', order.order_id);

      if (orderUpdateError) {
        console.error('⚠️ Error updating order status:', orderUpdateError);
      } else {
        console.log('✅ Order status updated to cancelled');
      }

      // ✅ QUANTITY RESTORATION: Restore product quantity on cancellation
      if (order.listing_type === 'FOR_SALE' || order.listing_type === 'FOR_RENT') {
        try {
          console.log('📦 Restoring product quantity after cancellation...');
          console.log('   Product ID:', order.product_id);
          console.log('   Quantity to restore:', order.buyer_quantity);

          // Get current product quantity
          const { data: currentProduct, error: fetchError } = await supabase!
            .from('products')
            .select('quantity, is_available')
            .eq('product_id', order.product_id)
            .single();

          if (fetchError) {
            console.error('❌ Failed to fetch current product quantity:', fetchError);
          } else {
            const restoredQuantity = (currentProduct.quantity ?? 0) + order.buyer_quantity;
            console.log('   Current quantity:', currentProduct.quantity);
            console.log('   Restored quantity:', restoredQuantity);

            const { error: quantityError } = await supabase!
              .from('products')
              .update({ 
                quantity: restoredQuantity,
                is_available: true,  // Make available again
                updated_at: new Date().toISOString()
              })
              .eq('product_id', order.product_id);

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

      console.log('✅ All updates completed successfully');
      console.log('🔔 Seller will see status change in real-time on SellerOrdersPage');

      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ ORDER CANCELLATION SUCCESSFUL');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔗 Blockchain TX:', cancelResult.transactionHash);
      console.log('🌐 View on Etherscan:', `https://sepolia.etherscan.io/tx/${cancelResult.transactionHash}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      showSuccess(
        'Order Cancelled', 
        `Your order has been cancelled successfully on the blockchain.\n\n🔗 Transaction: ${cancelResult.transactionHash?.substring(0, 10)}...\n\nView on Etherscan: https://sepolia.etherscan.io/tx/${cancelResult.transactionHash?.substring(0, 10)}...`
      );
      
      // Automatically open Etherscan link in new tab
      setTimeout(() => {
        window.open(`https://sepolia.etherscan.io/tx/${cancelResult.transactionHash}`, '_blank');
      }, 500);
      
      // Immediately reload orders to get fresh data from database
      console.log('🔄 Reloading orders to reflect changes...');
      await loadOrders();
      console.log('✅ Orders reloaded successfully');
    } catch (error: any) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ ORDER CANCELLATION FAILED');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════════');
      console.error('');
      showError('Error', error.message || 'Failed to cancel order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const showCancellationModal = async (order: OrderDetail): Promise<string | null> => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        border-top: 4px solid #ff9500;
      `;

      modal.innerHTML = `
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0; margin-bottom: 8px;">
              Cancel Order
            </h2>
            <p style="color: #666666; margin: 0;">
              ${order.product_name}
            </p>
          </div>

          <div style="background: #f8f9fa; border: 1px solid #d4e8e4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="color: #666666; font-size: 14px;">Order ID:</span>
              <span style="color: #1a1a1a; font-weight: 600; font-family: monospace;">${order.order_id.substring(0, 12)}...</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="color: #666666; font-size: 14px;">Seller:</span>
              <span style="color: #1a1a1a; font-weight: 600;">${order.seller_first_name} ${order.seller_last_name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #666666; font-size: 14px;">Amount:</span>
              <span style="color: #208756; font-weight: 700; font-size: 18px;">₱${(order.price * order.buyer_quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style="background: #fef3e0; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Important Information</p>
            <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 13px;">
              <li style="margin-bottom: 6px;">MetaMask will open to confirm the cancellation</li>
              <li style="margin-bottom: 6px;">All transaction data will be permanently recorded on blockchain</li
              <li>Cancellation cannot be undone</li>
            </ul>
          </div>

          <div style="margin-bottom: 24px;">
            <label style="display: block; color: #1a1a1a; font-weight: 600; margin-bottom: 8px; font-size: 14px;">
              Why are you cancelling? (Optional)
            </label>
            <textarea 
              id="cancellation-reason" 
              placeholder="e.g., Found cheaper elsewhere, changed mind, seller not responding..."
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid #d4e8e4;
                border-radius: 8px;
                font-family: inherit;
                font-size: 14px;
                color: #1a1a1a;
                resize: vertical;
                min-height: 80px;
                box-sizing: border-box;
              "
            ></textarea>
            <p style="color: #999999; font-size: 12px; margin: 6px 0 0 0;">Character limit: 500</p>
          </div>

          <div style="display: flex; gap: 12px;">
            <button 
              id="cancel-btn"
              style="
                flex: 1;
                padding: 12px;
                border: 1px solid #d4e8e4;
                background: white;
                color: #666666;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
              "
              onmouseover="this.style.backgroundColor='#f8f9fa'"
              onmouseout="this.style.backgroundColor='white'"
            >
              Keep Order
            </button>
            <button 
              id="confirm-cancel-btn"
              style="
                flex: 1;
                padding: 12px;
                background: #ff9500;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
              "
              onmouseover="this.style.background='#ff8c00'"
              onmouseout="this.style.background='#ff9500'"
            >
              Yes, Cancel Order
            </button>
          </div>

          <div style="background: #f0f8f6; border: 1px solid #d4e8e4; border-radius: 8px; padding: 12px; margin-top: 16px;">
            <p style="margin: 0; color: #208756; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
              Blockchain Transaction
            </p>
            <p style="margin: 0; color: #666666; font-size: 12px;">
              After confirmation, you'll see this order on Sepolia blockchain with status "Cancelled"
            </p>
          </div>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;
      const confirmBtn = modal.querySelector('#confirm-cancel-btn') as HTMLButtonElement;
      const reasonInput = modal.querySelector('#cancellation-reason') as HTMLTextAreaElement;

      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      confirmBtn.addEventListener('click', () => {
        let reason = reasonInput.value.trim();
        if (!reason) {
          reason = 'Order cancelled by buyer';
        }
        if (reason.length > 500) {
          alert('Reason cannot exceed 500 characters');
          return;
        }
        cleanup();
        resolve(reason);
      });

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(null);
        }
      };
      document.addEventListener('keydown', handleEscape);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(null);
        }
      });

      reasonInput.focus();
    });
  };

  const showDeleteModal = async (order: OrderDetail): Promise<boolean> => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        border-top: 4px solid #dc2626;
      `;

      modal.innerHTML = `
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0; margin-bottom: 8px;">
              Delete Order
            </h2>
            <p style="color: #666666; margin: 0;">
              This action cannot be undone
            </p>
          </div>

          <div style="background: #f8f9fa; border: 1px solid #d4e8e4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <span style="color: #666666; font-size: 13px; display: block; margin-bottom: 4px;">Product:</span>
              <span style="color: #1a1a1a; font-weight: 600; font-size: 15px;">${order.product_name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #666666; font-size: 14px;">Order ID:</span>
              <span style="color: #1a1a1a; font-weight: 600; font-family: monospace; font-size: 11px;">${order.order_id.substring(0, 16)}...</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #666666; font-size: 14px;">Status:</span>
              <span style="color: #1a1a1a; font-weight: 600; text-transform: capitalize;">${order.order_status}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #666666; font-size: 14px;">Amount:</span>
              <span style="color: #208756; font-weight: 700; font-size: 16px;">₱${(order.price * order.buyer_quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style="background: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #dc2626; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Warning</p>
            <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 13px;">
              <li style="margin-bottom: 6px;">This will permanently remove the order from your records</li>
              <li style="margin-bottom: 6px;">Order history will be deleted from the database</li>
              ${order.blockchain_tx_hash ? '<li style="margin-bottom: 6px;">Blockchain transaction will remain recorded (cannot be deleted)</li>' : ''}
              <li>This action is irreversible</li>
            </ul>
          </div>

          <div style="display: flex; gap: 12px;">
            <button 
              id="cancel-delete-btn"
              style="
                flex: 1;
                padding: 12px;
                border: 1px solid #d4e8e4;
                background: white;
                color: #666666;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
              "
              onmouseover="this.style.backgroundColor='#f8f9fa'"
              onmouseout="this.style.backgroundColor='white'"
            >
              Cancel
            </button>
            <button 
              id="confirm-delete-btn"
              style="
                flex: 1;
                padding: 12px;
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
              "
              onmouseover="this.style.background='#b91c1c'"
              onmouseout="this.style.background='#dc2626'"
            >
              Yes, Delete Order
            </button>
          </div>

          ${order.blockchain_tx_hash ? `
          <div style="background: #f0f8f6; border: 1px solid #d4e8e4; border-radius: 8px; padding: 12px; margin-top: 16px;">
            <p style="margin: 0; color: #208756; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
              Blockchain Record
            </p>
            <p style="margin: 0; color: #666666; font-size: 12px;">
              This order's blockchain transaction will remain permanently on Sepolia testnet and can be viewed on Etherscan
            </p>
          </div>
          ` : ''}
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const cancelBtn = modal.querySelector('#cancel-delete-btn') as HTMLButtonElement;
      const confirmBtn = modal.querySelector('#confirm-delete-btn') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
    });
  };

  const handleDeleteOrder = async (order: OrderDetail) => {
    const confirmDelete = await showDeleteModal(order);
    if (!confirmDelete) return;

    setProcessingOrderId(order.order_id);

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🗑️ STARTING ORDER DELETION PROCESS');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📦 Order ID:', order.order_id);
      console.log('📝 Product:', order.product_name);
      console.log('📊 Status:', order.order_status);
      console.log('');

      if (!supabase) {
        showError('Error', 'Database connection not available');
        return;
      }

      // Delete associated transactions first (if any)
      if (order.transaction_id) {
        console.log('🔄 Step 1: Deleting associated transactions...');
        const { error: txDeleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('order_id', order.order_id);

        if (txDeleteError) {
          console.error('❌ Error deleting transactions:', txDeleteError);
          showError('Database Error', 'Failed to delete transaction records: ' + txDeleteError.message);
          return;
        }
        console.log('✅ Transactions deleted successfully');
      }

      // Delete the order
      console.log('🔄 Step 2: Deleting order from order_details...');
      const { error: orderError } = await supabase
        .from('order_details')
        .delete()
        .eq('order_id', order.order_id);

      if (orderError) {
        console.error('❌ Error deleting order:', orderError);
        showError('Database Error', 'Failed to delete order: ' + orderError.message);
        return;
      }

      console.log('✅ Order deleted successfully');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ ORDER DELETION SUCCESSFUL');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      // Remove from local state
      setOrders(orders.filter(o => o.order_id !== order.order_id));
      
      showSuccess(
        'Order Deleted', 
        `Order "${order.product_name}" has been permanently deleted from your records.`
      );
    } catch (error: any) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ ORDER DELETION FAILED');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('═══════════════════════════════════════════════════════════');
      console.error('');
      showError('Error', error.message || 'Failed to delete order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#208756' }} />
          <p style={{ color: '#666666' }}>Loading your orders...</p>
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
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#208756' }}>My Orders</h1>
          <p className="text-base" style={{ color: '#666666' }}>Manage and track your purchases</p>
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
              <p style={{ color: '#1a1a1a' }} className="mb-2 text-lg font-semibold">No orders found</p>
              <p style={{ color: '#666666' }} className="mb-6">
                {filter === 'all' 
                  ? "You haven't placed any orders yet." 
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
                      {/* Seller Profile Picture */}
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {order.seller_profile_picture ? (
                          <img 
                            src={order.seller_profile_picture} 
                            alt={order.seller_username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{order.product_name}</h3>
                        </div>
                        <p className="text-sm font-medium mb-2" style={{ color: '#666666' }}>
                          Seller: <span style={{ color: '#1a1a1a', fontWeight: '600' }}>@{order.seller_username}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm" style={{ color: '#666666' }}>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {order.seller_first_name} {order.seller_last_name}
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
                            Blockchain transaction pending
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>{formatPrice(order.price * order.buyer_quantity)}</p>
                      <p className="text-sm" style={{ color: '#666666' }}>{formatPrice(order.price)} × {order.buyer_quantity}</p>
                      
                      {/* Status Badges Container */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                          order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.order_status === 'accepted' ? 'bg-green-100 text-green-800' :
                          order.order_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          order.order_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          order.order_status === 'cancelled' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                        </span>
                        
                        {/* Review Status Badge - Only for completed orders */}
                        {order.order_status === 'completed' && order.has_reviewed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full" style={{
                            background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)',
                            color: '#7c3aed',
                            border: '1.5px solid #a78bfa'
                          }}>
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                            Reviewed
                          </span>
                        )}
                      </div>
                      
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
                    {/* Review Prompt Alert for Completed Orders */}
                    {normalizeStatus(order.order_status, order.order_status) === 'completed' && (
                      <div className="rounded-lg p-5 border-2" style={{ 
                        background: '#f0f8f6', 
                        borderColor: '#208756' 
                      }}>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <svg className="w-12 h-12" style={{ color: '#208756' }} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: '#208756' }}>
                              Transaction Completed
                            </h4>
                            <p style={{ color: '#1a1a1a', fontSize: '14px', marginBottom: '12px', fontWeight: '500' }}>
                              Your transaction has been successfully completed on the blockchain. Help other buyers by sharing your experience.
                            </p>
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#d4e8e4' }}>
                              <p style={{ color: '#208756', fontSize: '13px', margin: 0, fontWeight: '600' }}>
                                Review the product and give the seller a rating
                              </p>
                              <p style={{ color: '#666666', fontSize: '12px', margin: '4px 0 0 0' }}>
                                Share your feedback to help the CSU marketplace community make informed decisions
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Blockchain Status Alert for Pending Orders */}
                    {order.order_status === 'pending' && order.blockchain_tx_hash && (
                      <div className="rounded-lg p-4 border" style={{ backgroundColor: '#fef9e7', borderColor: '#f59e0b' }}>
                        <p style={{ color: '#92400e', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                          Waiting for seller response
                        </p>
                        <p style={{ color: '#666666', fontSize: '12px', margin: '4px 0 0 0' }}>
                          Your transaction is recorded on blockchain. Seller will respond with acceptance or rejection.
                        </p>
                      </div>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column - Seller Information */}
                      <div className="space-y-6">
                        {/* Seller Details */}
                        <div className="rounded-lg p-5 border" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4' }}>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                            <User className="w-4 h-4" />
                            Seller Information
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Name:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>
                                {order.seller_first_name} {order.seller_last_name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ color: '#666666' }}>Username:</span>
                              <span style={{ color: '#1a1a1a', fontWeight: '600' }}>@{order.seller_username}</span>
                            </div>
                            {order.seller_department && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Department:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.seller_department}</span>
                              </div>
                            )}
                            {order.seller_id_number && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>ID Number:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600', fontFamily: 'monospace' }}>{order.seller_id_number}</span>
                              </div>
                            )}
                                                        {order.seller_email && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Email:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600', fontSize: '12px' }}>{order.seller_email}</span>
                              </div>
                            )}
                            {order.seller_phone && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Phone:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.seller_phone}</span>
                              </div>
                            )}
                            {order.seller_contact_info && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Contact:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.seller_contact_info}</span>
                              </div>
                            )}
                            {order.seller_wallet && (
                              <div className="flex items-center justify-between">
                                <span style={{ color: '#666666' }}>Wallet:</span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>
                                  {order.seller_wallet.substring(0, 12)}...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location Details */}
                        {(order.pickup_location || order.meetup_location) && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                              <MapPin className="w-4 h-4" />
                              Location Details
                            </h4>
                            <div className="space-y-3 text-sm">
                              {order.pickup_location && (
                                <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                  <span style={{ color: '#666666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Pickup Location:</span>
                                  <p style={{ color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{order.pickup_location}</p>
                                </div>
                              )}
                              {order.meetup_location && (
                                <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                  <span style={{ color: '#666666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Meetup Location:</span>
                                  <p style={{ color: '#1a1a1a', margin: 0, fontWeight: '500' }}>{order.meetup_location}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Message to Seller */}
                        {order.message_to_seller && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#208756' }}>
                              <MessageSquare className="w-4 h-4" />
                              Your Message to Seller
                            </h4>
                            <div className="p-3 rounded" style={{ backgroundColor: '#f0f8f6', borderLeft: '4px solid #208756' }}>
                              <p style={{ color: '#1a1a1a', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>
                                "{order.message_to_seller}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Show empty state if no message */}
                        {!order.message_to_seller && (
                          <div className="rounded-lg p-5 border" style={{ backgroundColor: '#f9f9f9', borderColor: '#e0e0e0' }}>
                            <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#999999' }}>
                              <MessageSquare className="w-4 h-4" />
                              Message to Seller
                            </h4>
                            <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>No message provided</p>
                          </div>
                        )}
                      </div>

                      {/* Right Column - Order Details */}
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

                        {/* For Sale Information */}
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
                              <div>
                                <span style={{ color: '#666666', fontWeight: '600' }}>Condition: </span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.condition || 'N/A'}</span>
                              </div>
                              <div>
                                <span style={{ color: '#666666', fontWeight: '600' }}>Requirements: </span>
                                <span style={{ color: '#1a1a1a', fontWeight: '600' }}>{order.requirements || 'N/A'}</span>
                              </div>
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

                    {/* Blockchain Info - Enhanced with prominent Etherscan button */}
                    {order.blockchain_tx_hash && (
                      <div className="rounded-lg p-5 border-2" style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: order.order_status === 'accepted' ? '#208756' : 
                                    order.order_status === 'rejected' ? '#dc2626' : 
                                    order.order_status === 'completed' ? '#208756' : 
                                    order.order_status === 'cancelled' ? '#f59e0b' : '#208756'
                      }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold flex items-center gap-2" style={{ 
                            color: order.order_status === 'accepted' ? '#208756' : 
                                  order.order_status === 'rejected' ? '#dc2626' : 
                                  order.order_status === 'completed' ? '#208756' : 
                                  order.order_status === 'cancelled' ? '#f59e0b' : '#208756'
                          }}>
                            <span>
                              {order.order_status === 'accepted' && 'Order Accepted on Blockchain'}
                              {order.order_status === 'rejected' && 'Order Rejected on Blockchain'}
                              {order.order_status === 'completed' && 'Transaction Completed on Blockchain'}
                              {order.order_status === 'cancelled' && 'Order Cancelled on Blockchain'}
                              {order.order_status === 'pending' && 'Order on Blockchain (Pending)'}
                            </span>
                          </h4>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${order.blockchain_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
                            style={{ 
                              backgroundColor: order.order_status === 'accepted' ? '#208756' : 
                                              order.order_status === 'rejected' ? '#dc2626' : 
                                              order.order_status === 'completed' ? '#208756' : 
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
                            backgroundColor: order.order_status === 'accepted' ? '#f0f8f6' : 
                                            order.order_status === 'rejected' ? '#fef2f2' : 
                                            order.order_status === 'completed' ? '#f0f8f6' : 
                                            order.order_status === 'cancelled' ? '#fef9e7' : '#f0f8f6', 
                            borderRadius: '6px', 
                            padding: '12px', 
                            marginTop: '8px',
                            border: `1px solid ${order.order_status === 'accepted' ? '#208756' : 
                                                  order.order_status === 'rejected' ? '#dc2626' : 
                                                  order.order_status === 'completed' ? '#208756' : 
                                                  order.order_status === 'cancelled' ? '#f59e0b' : '#208756'}`
                          }}>
                            <p style={{ 
                              color: order.order_status === 'accepted' ? '#208756' : 
                                    order.order_status === 'rejected' ? '#dc2626' : 
                                    order.order_status === 'completed' ? '#208756' : 
                                    order.order_status === 'cancelled' ? '#f59e0b' : '#208756', 
                              fontSize: '13px', 
                              margin: 0,
                              fontWeight: '600'
                            }}>
                              {order.order_status === 'accepted' && 'Order accepted by seller and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'rejected' && 'Order rejected by seller and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'completed' && 'Transaction completed and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'cancelled' && 'Order cancelled by you and permanently recorded on Sepolia testnet'}
                              {order.order_status === 'pending' && 'Order created and recorded on Sepolia testnet, waiting for seller response'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-6 border-t" style={{ borderColor: '#e0e0e0' }}>
                      {/* Complete Button - Only shows for accepted orders */}
                      {normalizeStatus(order.order_status, order.order_status) === 'accepted' && (
                        <button
                          onClick={() => handleCompleteOrder(order)}
                          disabled={processingOrderId === order.order_id}
                          className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                          style={{
                            backgroundColor: processingOrderId === order.order_id ? '#9ca3af' : '#208756',
                            color: 'white',
                            fontSize: '14px'
                          }}
                        >
                          {processingOrderId === order.order_id ? 'Completing...' : 'Complete Transaction'}
                        </button>
                      )}

                      {/* Cancel Button - Only shows for pending/accepted orders with transaction */}
                      {order.transaction_id && (order.order_status === 'pending' || order.order_status === 'accepted') && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          disabled={processingOrderId === order.order_id}
                          className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 border-2"
                          style={{
                            backgroundColor: processingOrderId === order.order_id ? '#9ca3af' : 'white',
                            color: processingOrderId === order.order_id ? 'white' : '#dc2626',
                            fontSize: '14px',
                            borderColor: processingOrderId === order.order_id ? '#9ca3af' : '#dc2626'
                          }}
                          onMouseOver={(e) => {
                            if (processingOrderId !== order.order_id) {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = processingOrderId === order.order_id ? '#9ca3af' : 'white';
                          }}
                        >
                          {processingOrderId === order.order_id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Cancel Order
                            </>
                          )}
                        </button>
                      )}

                      {/* Review Button - Only shows for completed orders */}
                      {normalizeStatus(order.transaction_status, order.order_status) === 'completed' && (
                        <button
                          onClick={() => {
                            if (order.has_reviewed) {
                              // Navigate to product details to view review
                              navigate(`/product/${order.product_id}`);
                            } else {
                              // Navigate to write new review
                              navigate(`/product/${order.product_id}`, {
                                state: { 
                                  showReviewModal: true,
                                  transactionId: order.transaction_id,
                                  orderId: order.order_id,
                                  productName: order.product_name,
                                  sellerId: order.seller_id,
                                  sellerName: `${order.seller_first_name} ${order.seller_last_name}`
                                }
                              });
                            }
                          }}
                          className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 inline-flex items-center justify-center gap-2 border-2"
                          style={{
                            backgroundColor: order.has_reviewed ? '#f0f8f6' : 'white',
                            color: order.has_reviewed ? '#208756' : '#208756',
                            fontSize: '14px',
                            borderColor: order.has_reviewed ? '#208756' : '#208756'
                          }}
                          onMouseOver={(e) => {
                            if (order.has_reviewed) {
                              e.currentTarget.style.backgroundColor = '#d4e8e4';
                              e.currentTarget.style.borderColor = '#1a6d46';
                            } else {
                              e.currentTarget.style.backgroundColor = '#208756';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.borderColor = '#208756';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (order.has_reviewed) {
                              e.currentTarget.style.backgroundColor = '#f0f8f6';
                              e.currentTarget.style.borderColor = '#208756';
                            } else {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.color = '#208756';
                              e.currentTarget.style.borderColor = '#208756';
                            }
                          }}
                        >
                          {order.has_reviewed ? (
                            <>
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                              Review Submitted
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                              Write Review
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete Button - Always available */}
                      <button
                        onClick={() => handleDeleteOrder(order)}
                        disabled={processingOrderId === order.order_id}
                        className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 border-2"
                        style={{
                          backgroundColor: processingOrderId === order.order_id ? '#9ca3af' : 'white',
                          color: processingOrderId === order.order_id ? 'white' : '#666666',
                          fontSize: '14px',
                          borderColor: processingOrderId === order.order_id ? '#9ca3af' : '#e0e0e0'
                        }}
                        onMouseOver={(e) => {
                          if (processingOrderId !== order.order_id) {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#666666';
                          }
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = processingOrderId === order.order_id ? '#9ca3af' : 'white';
                          e.currentTarget.style.borderColor = processingOrderId === order.order_id ? '#9ca3af' : '#e0e0e0';
                        }}
                      >
                        {processingOrderId === order.order_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete Order
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
