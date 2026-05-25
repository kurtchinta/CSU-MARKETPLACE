import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useModal } from '../context/ModalContext';
import { useDirectCheckout } from '../context/DirectCheckoutContext';
import { supabase } from '../lib/supabase';
import { storageService } from '../services/storageService';
import blockchainService from '../services/blockchainService';
import { ethers } from 'ethers';
import { ArrowLeft, X, Phone, MapPin, Calendar, Clock, MessageSquare, Star, Package, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';

interface CheckoutItem {
  cart_id: number;
  product_id: number;
  quantity: number;
  category_name?: string;
  specifications?: {
    category_name: string;
    condition?: string;
    return_condition?: string;
    listing_type: string;
    contact_information?: string;
    requirements?: string;
    service_duration?: string;
    service_schedule?: string;
    rental_duration?: string;
  };
  product?: {
    product_id: number;
    product_name: string;
    description: string;
    price: number;
    listing_type: string;
    user_id: string;
    category_id: number;
    quantity?: number;
    pickup_location?: string;
    meetup_location?: string;
    service_schedule?: string;
    service_duration?: string;
    contact_information?: string;
    images?: { image_id: number; storage_path: string; image_order: number }[];
  };
}

interface SellerInfo {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  department?: string;
  phone_number?: string;
  wallet_address?: string;
  profile_picture_url?: string;
  created_at?: string;
  avgRating?: number;
  reviewCount?: number;
  totalProducts?: number;
}

const CheckoutPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Checkout - CSU Marketplace';
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { refreshCart } = useCart();
  const { showSuccess, showError } = useModal();
  const { checkoutData, clearDirectCheckout } = useDirectCheckout();

  // Get items from either location.state (ProductDetails) or DirectCheckoutContext (SellerProfilePage, BrowsePage)
  const { items: locationItems = [], isDirectCheckout: locationIsDirectCheckout = false } = location.state || { items: [], isDirectCheckout: false };
  
  // Merge DirectCheckoutContext data with location.state data
  const checkoutItems = checkoutData?.items?.map(item => ({
    cart_id: 0,
    product_id: item.product_id,
    quantity: item.quantity,
    product: {
      product_id: item.product_id,
      product_name: item.product_name,
      description: item.description,
      price: item.price,
      listing_type: item.listing_type.toUpperCase(),
      user_id: item.user_id,
      category_id: item.category_id,
      pickup_location: item.pickup_location,
      meetup_location: item.meetup_location,
      images: item.images?.map((path, index) => ({
        image_id: index,
        storage_path: path,
        image_order: index
      })) || []
    }
  })) || locationItems;
  
  const isDirectCheckout = checkoutData?.isDirectCheckout || locationIsDirectCheckout;

  const [items, setItems] = useState<CheckoutItem[]>(checkoutItems);
  const [sellerInfoMap, setSellerInfoMap] = useState<{ [key: string]: SellerInfo }>({});
  const [productAvailability, setProductAvailability] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState<{ [key: number]: boolean }>({});
  const [blockchainStatus, setBlockchainStatus] = useState<{
    step: string;
    message: string;
    isProcessing: boolean;
  }>({
    step: '',
    message: '',
    isProcessing: false
  });

  const [formData, setFormData] = useState({
    orderPreferences: '',
    pickupLocation: '',
    meetupLocation: '',
    buyerMessage: '',
    rentStartDate: '',
    rentEndDate: '',
    rentDuration: '',
    preferredServiceDate: '',
    serviceSchedule: ''
  });

  const [allowNavigation, setAllowNavigation] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutItems || checkoutItems.length === 0) {
      showError('No Items', 'No items to checkout. Please add items to your cart first.');
      setTimeout(() => navigate(isDirectCheckout ? '/browse' : '/cart'), 2000);
      return;
    }

    setItems(checkoutItems);
    loadSellerInfo();
    loadCategoryNames();
    loadSpecifications();
    loadProductAvailability();

    // Protect checkout page - block all navigation attempts
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!allowNavigation) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (!allowNavigation) {
        e.preventDefault();
        setShowDiscardModal(true);
        // Push state back to prevent navigation
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    // Block link clicks and navigation
    const handleClick = (e: MouseEvent) => {
      if (allowNavigation) return; // Allow click if navigation is allowed

      const target = (e.target as HTMLElement).closest('a');
      if (target) {
        const href = target.getAttribute('href');
        // Allow same-page navigation, external links, and internal modal buttons
        if (href && !href.startsWith('#') && href !== window.location.pathname && !href.startsWith('javascript:')) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigationPath(href);
          setShowDiscardModal(true);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick, true);
      // Clear DirectCheckout context when component unmounts
      if (checkoutData) {
        clearDirectCheckout();
      }
    };
  }, [checkoutItems, navigate, showError, isDirectCheckout, showDiscardModal, allowNavigation]);

  const loadCategoryNames = async () => {
    try {
      const categoryIds = new Set(
        checkoutItems
          .map((item: any) => item.product?.category_id)
          .filter(Boolean)
      );

      for (const categoryId of categoryIds) {
        if (!categoryId) continue;
        try {
          if (!supabase) continue;

          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('category_id, category_name')
            .eq('category_id', categoryId)
            .single();

          if (!categoryError && categoryData) {
            setItems(prevItems =>
              prevItems.map(item =>
                item.product?.category_id === categoryId
                  ? { ...item, category_name: categoryData.category_name }
                  : item
              )
            );
          }
        } catch (error) {
          console.error('Error loading category:', error);
        }
      }
    } catch (error) {
      console.error('Error loading category names:', error);
    }
  };

  const loadSpecifications = async () => {
    try {
      for (const item of checkoutItems) {
        if (!item.product?.product_id) continue;
        try {
          if (!supabase) continue;

          // Dynamically select fields based on listing type - always include requirements
          let selectFields = 'listing_type, category_id, contact_information, requirements, service_duration, service_schedule';
          
          if (item.product.listing_type === 'FOR_RENT') {
            selectFields = 'listing_type, category_id, contact_information, requirements, service_duration, service_schedule, return_condition, rent_duration';
          } else if (item.product.listing_type === 'FOR_SALE') {
            selectFields = 'listing_type, category_id, contact_information, requirements, service_duration, service_schedule, condition';
          } else if (item.product.listing_type === 'SERVICE') {
            selectFields = 'listing_type, category_id, contact_information, requirements, service_duration, service_schedule';
          }

          const { data: productData, error } = await supabase
            .from('products')
            .select(selectFields)
            .eq('product_id', item.product.product_id)
            .single();

          console.log('🔍 DEBUG loadSpecifications:', {
            productId: item.product.product_id,
            listingType: item.product.listing_type,
            selectFields,
            fetchedData: productData,
            error
          });

          if (!error && productData) {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('category_name')
              .eq('category_id', (productData as any).category_id)
              .single();

            const specifications = {
              category_name: categoryData?.category_name || item.category_name || 'N/A',
              condition: (productData as any).listing_type === 'FOR_SALE' ? ((productData as any).condition || 'Brand New') : undefined,
              return_condition: (productData as any).listing_type === 'FOR_RENT' ? ((productData as any).return_condition || 'Good Condition') : undefined,
              rental_duration: (productData as any).listing_type === 'FOR_RENT' ? ((productData as any).rent_duration || undefined) : undefined,
              listing_type: (productData as any).listing_type || 'FOR SALE',
              contact_information: (productData as any).contact_information || undefined,
              requirements: (productData as any).requirements || undefined,
              service_duration: (productData as any).service_duration || undefined,
              service_schedule: (productData as any).service_schedule || undefined
            };

            console.log('✅ DEBUG specifications built:', specifications);

            setItems(prevItems =>
              prevItems.map(checkItem =>
                checkItem.product_id === item.product?.product_id
                  ? {
                      ...checkItem,
                      specifications
                    }
                  : checkItem
              )
            );
          } else {
            console.error('❌ DEBUG error fetching product data:', error);
          }
        } catch (error) {
          console.error('Error loading specifications:', error);
        }
      }
    } catch (error) {
      console.error('Error loading specifications:', error);
    }
  };

  const loadProductAvailability = async () => {
    try {
      if (!supabase) return;

      const availabilityMap: { [key: number]: number } = {};
      
      for (const item of checkoutItems) {
        if (!item.product?.product_id) continue;
        
        const { data: productData, error } = await supabase
          .from('products')
          .select('quantity')
          .eq('product_id', item.product.product_id)
          .single();
        
        if (!error && productData) {
          availabilityMap[item.product.product_id] = productData.quantity;
          
          // Also update the items state with quantity
          setItems(prevItems =>
            prevItems.map(prevItem =>
              prevItem.product?.product_id === item.product.product_id
                ? {
                    ...prevItem,
                    product: {
                      ...prevItem.product!,
                      quantity: productData.quantity
                    }
                  }
                : prevItem
            )
          );
        }
      }
      
      setProductAvailability(availabilityMap);
      console.log('📦 Product availability loaded:', availabilityMap);
    } catch (error) {
      console.error('Error loading product availability:', error);
    }
  };

  const loadSellerInfo = async () => {
    try {
      setPageLoading(true);
      const sellerMap: { [key: string]: SellerInfo } = {};
      const uniqueSellers = new Set(checkoutItems.map((item: CheckoutItem) => item.product?.user_id).filter(Boolean));

      for (const sellerId of uniqueSellers) {
        const sellerIdStr = sellerId as string;
        if (!sellerIdStr || sellerMap[sellerIdStr]) continue;

        try {
          if (!supabase) continue;
          
          const { data: sellerData, error: sellerError } = await supabase
            .from('users')
            .select('user_id, username, first_name, last_name, department, phone_number, wallet_address, profile_picture_url, created_at')
            .eq('user_id', sellerIdStr)
            .single();

          if (sellerError || !sellerData) {
            console.error('Error loading seller info:', sellerError);
            continue;
          }

          const { data: ratingsData } = await supabase
            .from('reviews')
            .select('rating')
            .eq('seller_id', sellerIdStr);

          let avgRating = 0;
          let reviewCount = 0;
          if (ratingsData && ratingsData.length > 0) {
            const totalRating = ratingsData.reduce((sum: number, review: any) => sum + review.rating, 0);
            avgRating = totalRating / ratingsData.length;
            reviewCount = ratingsData.length;
          }

          const { data: productsData } = await supabase
            .from('products')
            .select('product_id', { count: 'exact' })
            .eq('user_id', sellerIdStr)
            .eq('status', 'APPROVED');

          const totalProducts = productsData?.length || 0;

          sellerMap[sellerIdStr] = {
            ...sellerData,
            avgRating,
            reviewCount,
            totalProducts
          };
        } catch (error) {
          console.error('Exception loading seller info for', sellerIdStr, ':', error);
        }
      }

      setSellerInfoMap(sellerMap);
    } catch (error) {
      console.error('Error loading seller information:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuantityChange = (cartId: number, newQuantity: number, productId: number) => {
    if (newQuantity < 1) return;
    
    const availableStock = productAvailability[productId];
    if (availableStock !== undefined && newQuantity > availableStock) return;
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.cart_id === cartId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const handleQuantityInput = (cartId: number, productId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue > 0) handleQuantityChange(cartId, numValue, productId);
  };

  const handleBackClick = () => {
    setPendingNavigationPath(isDirectCheckout ? '/browse' : '/cart');
    setShowDiscardModal(true);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    setAllowNavigation(true);
    setTimeout(() => {
      if (pendingNavigationPath) {
        // Clear checkout from history and navigate away
        window.history.replaceState(null, '', pendingNavigationPath);
        navigate(pendingNavigationPath, { replace: true });
      } else {
        // Fallback to browse/cart if no pending path
        const fallbackPath = isDirectCheckout ? '/browse' : '/cart';
        window.history.replaceState(null, '', fallbackPath);
        navigate(fallbackPath, { replace: true });
      }
    }, 0);
  };

  const formatPrice = (price: number): string => {
    return `₱${price.toFixed(2)}`;
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);
  };

  const validateWalletAddress = (address: string): boolean => {
    return ethers.isAddress(address);
  };

  const handlePlaceOrder = async () => {
    if (!user || !profile) {
      showError('Authentication Error', 'Please log in to place an order.');
      return;
    }

    if (!profile.wallet_address || !validateWalletAddress(profile.wallet_address)) {
      showError(
        'Wallet Address Required',
        'Please set a valid wallet address in your profile to record this transaction on the blockchain.'
      );
      return;
    }

    // Check if user is trying to buy their own product
    const currentWallet = await blockchainService.getWalletAddress();
    if (currentWallet) {
      for (const item of items) {
        if (!item.product) continue;
        const seller = sellerInfoMap[item.product.user_id];
        if (seller?.wallet_address && 
            currentWallet.toLowerCase() === seller.wallet_address.toLowerCase()) {
          showError(
            'Cannot Buy Own Product',
            `You cannot purchase your own product "${item.product.product_name}".\n\n` +
            `The smart contract requires buyer and seller to have different wallet addresses.\n\n` +
            `Current wallet: ${currentWallet}\n` +
            `Seller wallet: ${seller.wallet_address}`
          );
          return;
        }
      }
    }

    for (const item of items) {
      if (!item.product) continue;

      if (item.product.listing_type === 'FOR_SALE' || item.product.listing_type === 'FOR_RENT') {
        if (!formData.pickupLocation.trim()) {
          showError('Required Field', 'Please specify a pickup location.');
          return;
        }
      }

      if (item.product.listing_type === 'FOR_RENT') {
        if (!formData.rentDuration.trim()) {
          showError('Required Field', 'Please specify the rental duration.');
          return;
        }
        if (!formData.rentStartDate) {
          showError('Required Field', 'Please select a rental start date.');
          return;
        }
      }

      if (item.product.listing_type === 'SERVICE') {
        if (!formData.meetupLocation.trim()) {
          showError('Required Field', 'Please specify where the service will be conducted.');
          return;
        }
        if (!formData.preferredServiceDate) {
          showError('Required Field', 'Please select a preferred service date.');
          return;
        }
      }
    }

    setLoading(true);
    setBlockchainStatus({
      step: 'validation',
      message: 'Validating order details...',
      isProcessing: true
    });

    try {
      const orderResults = [];

      setBlockchainStatus({
        step: 'preparation',
        message: 'Preparing blockchain transaction...',
        isProcessing: true
      });

      for (const item of items) {
        if (!item.product) continue;

        const orderToInsert: any = {
          buyer_id: user.id,
          seller_id: item.product.user_id,
          product_id: item.product.product_id,
          listing_type: item.product.listing_type,
          product_name: item.product.product_name,
          description: item.product.description,
          price: item.product.price,
          buyer_quantity: item.quantity,
          pickup_location: item.product.pickup_location || null,
          meetup_location: item.product.meetup_location || null,
          message_to_seller: formData.buyerMessage || null,
          order_status: 'pending'
        };

        if (item.product.listing_type === 'FOR_SALE' || item.product.listing_type === 'FOR_RENT') {
          if (formData.pickupLocation) {
            orderToInsert.pickup_location = formData.pickupLocation;
          }
        } else if (item.product.listing_type === 'SERVICE') {
          if (formData.meetupLocation) {
            orderToInsert.meetup_location = formData.meetupLocation;
          }
        }

        // ✅ Add listing-type specific fields with BUYER inputs
        if (item.product.listing_type === 'FOR_SALE') {
          // FOR_SALE: Only requirements (condition is in products table, not order_details)
          orderToInsert.requirements = item.specifications?.requirements || null;
        }

        if (item.product.listing_type === 'FOR_RENT') {
          // FOR_RENT: Get buyer inputs + product specifications
          orderToInsert.rental_duration = formData.rentDuration || null;  // BUYER input
          orderToInsert.start_date = formData.rentStartDate || null;      // BUYER input
          orderToInsert.end_date = formData.rentEndDate || null;          // BUYER input
          orderToInsert.return_condition = item.specifications?.return_condition || null;  // FROM product
          orderToInsert.requirements = item.specifications?.requirements || null;          // FROM product
        }

        if (item.product.listing_type === 'SERVICE') {
          // SERVICE: Get buyer inputs for schedule and duration
          orderToInsert.service_duration = formData.rentDuration || null;  // BUYER input (service duration dropdown)
          orderToInsert.service_schedule = formData.preferredServiceDate || null;  // BUYER input (preferred date)
          orderToInsert.requirements = item.specifications?.requirements || null;  // FROM product
        }

        if (!supabase) {
          throw new Error('Database connection not available');
        }

        const { data: insertedOrder, error: insertError } = await supabase
          .from('order_details')
          .insert([orderToInsert])
          .select('order_id')
          .single();

        if (insertError) {
          console.error('Error creating order:', insertError);
          throw new Error('Failed to create order: ' + insertError.message);
        }

        if (!insertedOrder || !insertedOrder.order_id) {
          throw new Error('Order created but ID could not be retrieved');
        }

        const orderId = insertedOrder.order_id;

        // ✅ V6.5: Generate NEW transaction_id (separate from order_id)
        const transactionId = crypto.randomUUID();
        console.log('📝 Generated new transaction_id:', transactionId);
        console.log('📝 Order ID:', orderId);

        setBlockchainStatus({
          step: 'blockchain',
          message: 'Opening MetaMask for gas payment. Please approve the transaction.',
          isProcessing: true
        });

        const seller = sellerInfoMap[item.product.user_id];
        
        const blockchainData: any = {
          transaction_id: transactionId,  // ✅ NEW UUID for V6.5
          order_id: orderId.toString(),
          buyer_id: user.id,
          seller_id: item.product.user_id,
          item_name: item.product.product_name,
          item_description: item.product.description,
          item_price: item.product.price,
          listing_type: item.product.listing_type,
          quantity: item.quantity,
          transaction_status: 'PENDING',
          category: item.category_name || ''
        };

        if (item.product.listing_type === 'FOR_SALE') {
          blockchainData.pickup_location = formData.pickupLocation || item.product.pickup_location || '';
          blockchainData.message_to_seller = formData.buyerMessage || '';
          blockchainData.requirements = item.specifications?.requirements || '';
        }
        else if (item.product.listing_type === 'FOR_RENT') {
          blockchainData.pickup_location = formData.pickupLocation || item.product.pickup_location || '';
          blockchainData.return_condition = item.specifications?.return_condition || '';
          blockchainData.rental_duration = formData.rentDuration || '';
          blockchainData.start_date = formData.rentStartDate || '';
          blockchainData.end_date = formData.rentEndDate || '';
          blockchainData.requirements = item.specifications?.requirements || '';
          blockchainData.message_to_seller = formData.buyerMessage || '';
        }
        else if (item.product.listing_type === 'SERVICE') {
          blockchainData.meetup_location = formData.meetupLocation || item.product.meetup_location || '';
          blockchainData.service_duration = formData.rentDuration || '';  // BUYER selected duration
          blockchainData.service_schedule = formData.preferredServiceDate || '';  // BUYER selected preferred date
          blockchainData.requirements = item.specifications?.requirements || '';
          blockchainData.message_to_seller = formData.buyerMessage || '';
        }

        const blockchainResult = await blockchainService.recordTransaction(
          blockchainData,
          profile,
          seller || { first_name: '', last_name: '', wallet_address: '', phone_number: '' }
        );

        if (!blockchainResult.success) {
          setBlockchainStatus({
            step: 'error',
            message: 'Blockchain transaction failed. Rolling back...',
            isProcessing: true
          });

          await supabase
            .from('order_details')
            .delete()
            .eq('order_id', orderId);

          throw new Error(blockchainResult.message || 'Failed to record transaction on blockchain');
        }

        setBlockchainStatus({
          step: 'confirmation',
          message: 'Confirming on blockchain...',
          isProcessing: true
        });

        // ✅ V6.5: Use the generated transaction_id (NOT order_id)
        // ✅ Use blockchain timestamp if available, otherwise fallback to current time
        const blockchainTimestamp = blockchainResult.blockchainTimestamp || new Date().toISOString();
        console.log('📅 Using blockchain timestamp for database:', blockchainTimestamp);

        const transactionData: any = {
          transaction_id: transactionId,  // ✅ NEW UUID - same as sent to blockchain
          order_id: orderId,
          blockchain_tx_hash: blockchainResult.transactionHash || '',
          buyer_id: user.id,
          seller_id: item.product.user_id,
          product_id: item.product.product_id,
          category_id: item.product.category_id,  // ✅ Add category_id
          buyer_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Buyer',
          buyer_wallet: profile?.wallet_address || '',  // ✅ CRITICAL: Store buyer wallet for authorization checks
          seller_name: `${seller?.first_name || ''} ${seller?.last_name || ''}`.trim() || 'Seller',
          seller_phone: seller?.phone_number || '',
          listing_type: item.product.listing_type,
          category_name: item.category_name || '',  // ✅ Add category_name
          item_name: item.product.product_name,
          item_description: item.product.description || '',
          item_price: parseFloat(item.product.price.toString()),
          quantity: item.quantity,
          final_pickup_location: formData.pickupLocation || '',
          final_meetup_location: formData.meetupLocation || '',
          message_to_seller: formData.buyerMessage || '',  // ✅ Use buyerMessage (not orderPreferences)
          transaction_status: 'PENDING',
          is_blockchain_pending: false,
          blockchain_confirmed_at: blockchainTimestamp,
          blockchain_block_number: blockchainResult.blockNumber || 0,
          gas_used: blockchainResult.gasUsed ? parseInt(blockchainResult.gasUsed.toString()) : 0,
          pending_at: blockchainTimestamp,
          created_at: blockchainTimestamp,
          updated_at: blockchainTimestamp,
          accepted_at: null,
          rejected_at: null,
          completed_at: null,
          cancelled_at: null,
          rejection_reason: null,
          cancellation_reason: null
        };

        if (item.product.listing_type === 'FOR_RENT') {
          transactionData.rental_duration = formData.rentDuration || '';
          transactionData.start_date = formData.rentStartDate || null;
          transactionData.end_date = formData.rentEndDate || null;
          transactionData.return_condition = null;
        }

        if (item.product.listing_type === 'SERVICE') {
          transactionData.service_duration = formData.rentDuration || '';  // BUYER selected duration
          transactionData.service_schedule = formData.preferredServiceDate || '';  // BUYER preferred date (stored in service_schedule)
          transactionData.start_date = formData.preferredServiceDate || null;  // Also store in start_date for consistency
        }

        console.log('💾 Inserting transaction to database:', {
          transaction_id: transactionId,  // ✅ NEW UUID
          order_id: orderId,
          blockchain_tx_hash: blockchainResult.transactionHash,
          transaction_status: 'PENDING'
        });

        const { data: insertedTransaction, error: txInsertError } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select();

        if (txInsertError) {
          console.error('❌ Failed to insert transaction to database:', txInsertError);
          throw new Error(`Database insert failed: ${txInsertError.message}`);
        }

        console.log('✅ Transaction inserted to database:', insertedTransaction);

        // ✅ QUANTITY REDUCTION: Update product quantity for FOR_SALE and FOR_RENT
        if (item.product.listing_type === 'FOR_SALE' || item.product.listing_type === 'FOR_RENT') {
          try {
            console.log('📦 Reducing product quantity...');
            console.log('   Product ID:', item.product.product_id);
            console.log('   Current quantity:', item.product.quantity);
            console.log('   Buyer quantity:', item.quantity);
            console.log('   New quantity:', (item.product.quantity ?? 0) - item.quantity);

            const { data: updatedProduct, error: quantityError } = await supabase
              .from('products')
              .update({ 
                quantity: (item.product.quantity ?? 0) - item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('product_id', item.product.product_id)
              .select('quantity')
              .single();

            if (quantityError) {
              console.error('❌ Failed to update product quantity:', quantityError);
              // Don't throw error - order is already placed, just log the issue
            } else {
              console.log('✅ Product quantity updated:', updatedProduct);
              
              // Check if product is now out of stock
              if (updatedProduct.quantity <= 0) {
                console.log('📦 Product is now out of stock, marking as unavailable');
                await supabase
                  .from('products')
                  .update({ 
                    is_available: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('product_id', item.product.product_id);
              }
            }
          } catch (quantityUpdateError) {
            console.error('⚠️ Exception updating product quantity:', quantityUpdateError);
            // Don't throw - order is already placed
          }
        } else {
          console.log('ℹ️ SERVICE listing type - no quantity reduction needed');
        }

        orderResults.push({
          orderId: orderId,
          productName: item.product.product_name,
          cartId: item.cart_id,
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber
        });
      }

      if (!isDirectCheckout && supabase) {
        for (const item of items) {
          try {
            await supabase.from('cart').delete().eq('cart_id', item.cart_id);
          } catch (err) {
            console.error('Error removing from cart:', err);
          }
        }
        await refreshCart();
      }

      setBlockchainStatus({
        step: 'complete',
        message: 'Order placed successfully!',
        isProcessing: false
      });

      showSuccess(
        'Order Placed Successfully',
        `${orderResults.length} order(s) placed successfully. Status: PENDING`
      );

      setTimeout(() => navigate('/my-orders', { replace: true }), 3000);

    } catch (error: any) {
      console.error('Checkout error:', error);

      setBlockchainStatus({
        step: 'error',
        message: 'Order failed',
        isProcessing: false
      });

      let errorTitle = 'Order Failed';
      let errorMessage = error.message || 'Failed to place orders. Please try again.';

      // ✅ CRITICAL FIX: Check for database errors FIRST (most specific)
      if (error.message.includes('Database insert failed')) {
        errorTitle = 'Database Error';
        errorMessage = 'The order was recorded on blockchain but failed to save to database. Please contact support with your transaction hash.';
      } else if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        errorTitle = 'Duplicate Transaction';
        errorMessage = 'This transaction has already been recorded. Please refresh the page to see your orders.';
      } else if (error.message.includes('rejected') || error.message.includes('denied')) {
        errorTitle = 'Transaction Rejected';
        errorMessage = 'You rejected the transaction in MetaMask. Please try again and approve the transaction.';
      } else if (error.message.includes('insufficient funds')) {
        errorTitle = 'Insufficient Funds';
        errorMessage = 'You do not have enough Sepolia ETH for gas fees. Please get free Sepolia ETH from faucets.';
      } else if (error.message.includes('MetaMask') || error.message.includes('not connected') || error.message.includes('unlock')) {
        errorTitle = 'Wallet Error';
        errorMessage = 'Please ensure MetaMask is installed, unlocked, and connected to Sepolia Test Network.';
      } else if (error.message.includes('network')) {
        errorTitle = 'Network Error';
        errorMessage = 'Please ensure you are connected to Sepolia Test Network in MetaMask.';
      }

      showError(errorTitle, errorMessage);
    } finally {
      setLoading(false);
      setBlockchainStatus({
        step: '',
        message: '',
        isProcessing: false
      });
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#208756' }} />
          <p style={{ color: '#666666' }}>Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container mx-auto px-6 lg:px-12 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="flex items-center font-medium transition-colors mb-4"
            style={{ color: '#208756' }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {isDirectCheckout ? 'Back to Browse' : 'Back to Cart'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#1a1a1a' }}>Checkout</h1>
              <p className="text-base" style={{ color: '#666666' }}>Review your order and provide delivery details</p>
            </div>
            <div className="hidden lg:block text-right">
              <div className="inline-block px-4 py-2 rounded-lg" style={{ backgroundColor: '#e8f4f0' }}>
                <p className="text-sm font-semibold" style={{ color: '#208756' }}>Secure Checkout</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div key={item.cart_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Product Image and Details Container */}
                <div className="p-6 border-t-4" style={{ borderTopColor: '#208756' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col">
                      {/* Product Image Card */}
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 flex-1" style={{ minHeight: '350px', borderColor: '#208756' }}>
                        <ImageCarousel
                          images={item.product?.images}
                          productName={item.product?.product_name || 'Product'}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{item.product?.product_name}</h3>
                        <p className="text-xs text-gray-500 font-medium">{item.category_name || 'Loading...'}</p>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 space-y-3 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3 border" style={{ borderColor: '#e0e0e0' }}>
                            <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Listing Type</p>
                            <p className="text-sm font-bold" style={{ color: '#208756' }}>
                              {item.product?.listing_type === 'FOR_SALE' ? 'For Sale' :
                               item.product?.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                            </p>
                          </div>
                          <div className="bg-white rounded p-3 border" style={{ borderColor: '#e0e0e0' }}>
                            <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>
                              {item.product?.listing_type === 'SERVICE' ? 'Service Fee' : 'Price'}
                            </p>
                            <p className="text-sm font-bold" style={{ color: '#208756' }}>
                              {formatPrice(item.product?.price || 0)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded p-4 border border-gray-200">
                          {item.product?.listing_type === 'FOR_SALE' ? (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-1">Quantity</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-gray-600">Available:</p>
                                    <span className="text-sm font-semibold" style={{ color: '#208756' }}>
                                      {item.product?.quantity ?? 0} units
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleQuantityChange(item.cart_id, item.quantity - 1, item.product?.product_id || 0)}
                                  disabled={item.quantity <= 1 || loading}
                                  className="w-8 h-8 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                  −
                                </button>
                                
                                <input
                                  type="number"
                                  min="1"
                                  max={item.product?.quantity || 1}
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityInput(item.cart_id, item.product?.product_id || 0, e.target.value)}
                                  disabled={loading}
                                  className="w-16 h-8 text-center border border-gray-300 rounded focus:outline-none focus:border-green-600"
                                />
                                
                                <button
                                  onClick={() => handleQuantityChange(item.cart_id, item.quantity + 1, item.product?.product_id || 0)}
                                  disabled={item.quantity >= (item.product?.quantity || 0) || loading}
                                  className="w-8 h-8 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                  +
                                </button>
                              </div>
                              
                              {(item.product?.quantity ?? 0) === 0 && (
                                <div className="mt-3 p-2 rounded text-sm text-red-600 bg-red-50">
                                  Out of Stock
                                </div>
                              )}
                            </>
                          ) : item.product?.listing_type === 'FOR_RENT' ? (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-700">Quantity</p>
                              </div>
                              
                              {item.quantity > 1 && (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleQuantityChange(item.cart_id, item.quantity - 1, item.product?.product_id || 0)}
                                    disabled={item.quantity <= 1 || loading}
                                    className="w-8 h-8 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                                  >
                                    −
                                  </button>
                                  
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityInput(item.cart_id, item.product?.product_id || 0, e.target.value)}
                                    disabled={loading}
                                    className="w-16 h-8 text-center border border-gray-300 rounded focus:outline-none focus:border-green-600"
                                  />
                                  
                                  <button
                                    onClick={() => handleQuantityChange(item.cart_id, item.quantity + 1, item.product?.product_id || 0)}
                                    disabled={loading}
                                    className="w-8 h-8 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                                  >
                                    +
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-2 p-3 rounded mt-3" style={{ backgroundColor: '#f5f5f5' }}>
                                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ff9800' }} />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Rental Item</p>
                                  <p className="text-xs text-gray-600">Quantity is fixed at 1 per rental booking.</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded" style={{ backgroundColor: '#f5f5f5' }}>
                              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ff9800' }} />
                              <div>
                                <p className="text-sm font-medium text-gray-700">Service</p>
                                <p className="text-xs text-gray-600">Quantity is fixed at 1 per service booking.</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Subtotal</span>
                              <div className="text-right">
                                <p className="text-xl font-semibold" style={{ color: '#208756' }}>
                                  {formatPrice((item.product?.price || 0) * item.quantity)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatPrice(item.product?.price || 0)} × {item.quantity}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {item.product?.listing_type === 'FOR_SALE' && (
                            <div className="bg-white rounded p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Condition</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications?.condition || 'Brand New'}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'FOR_RENT' && (
                            <div className="bg-white rounded p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Return Condition</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications?.return_condition || 'Good Condition'}</p>
                            </div>
                          )}
                          <div className="bg-white rounded p-3 border" style={{ borderColor: '#e0e0e0' }}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <MapPin className="w-3.5 h-3.5" style={{ color: '#208756' }} />
                              <p className="text-xs font-semibold uppercase" style={{ color: '#999999' }}>
                                {item.product?.listing_type === 'SERVICE' ? 'Location' : 'Pickup'}
                              </p>
                            </div>
                            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                              {item.product?.listing_type === 'SERVICE' 
                                ? (item.product?.meetup_location || 'TBA')
                                : (item.product?.pickup_location || 'TBA')
                              }
                            </p>
                          </div>
                          {item.product?.listing_type === 'SERVICE' && (item.product?.service_schedule || item.specifications?.service_schedule) && (
                            <div className="bg-white rounded p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Clock className="w-3.5 h-3.5" style={{ color: '#208756' }} />
                                <p className="text-xs font-semibold uppercase" style={{ color: '#999999' }}>Schedule</p>
                              </div>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                                {item.product?.service_schedule || item.specifications?.service_schedule}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Specifications and Seller Info Side by Side */}
                <div className="px-6 py-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Specifications Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5" style={{ color: '#208756' }} />
                        <h4 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
                          {item.product?.listing_type === 'SERVICE' ? 'Service Information' : 'Product Specifications'}
                        </h4>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                            <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Category</p>
                            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications?.category_name || item.category_name || 'Loading...'}</p>
                          </div>
                          {item.product?.listing_type === 'FOR_SALE' && (() => {
                            const stockQty = item.product?.quantity ?? 0;
                            return (
                              <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                                <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Availability</p>
                                <p className="text-sm font-medium" style={{ color: stockQty > 0 ? '#208756' : '#ef4444' }}>
                                  {stockQty > 0 
                                    ? `In Stock (${stockQty})` 
                                    : 'Out of Stock'}
                                </p>
                              </div>
                            );
                          })()}
           
                          {item.product?.listing_type === 'FOR_RENT' && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Return Condition</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications?.return_condition || 'Good Condition'}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'FOR_RENT' && item.specifications?.rental_duration && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Rental Duration</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications.rental_duration}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'FOR_RENT' && item.specifications?.requirements && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Requirements</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications?.requirements}</p>
                            </div>
                          )}
                          <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                            <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Type</p>
                            <p className="text-sm font-medium" style={{ color: '#208756' }}>
                              {item.specifications?.listing_type === 'FOR_SALE' ? 'For Sale' :
                               item.specifications?.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                            </p>
                          </div>
                          {item.product?.listing_type === 'FOR_SALE' && item.specifications?.requirements && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Requirements</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications.requirements}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'SERVICE' && (item.product?.service_schedule || item.specifications?.service_schedule) && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Schedule</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.product?.service_schedule || item.specifications?.service_schedule}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'SERVICE' && (item.product?.service_duration || item.specifications?.service_duration) && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Duration</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.product?.service_duration || item.specifications?.service_duration}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'SERVICE' && item.product?.meetup_location && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Location</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.product.meetup_location}</p>
                            </div>
                          )}
                          {item.product?.listing_type === 'SERVICE' && item.specifications?.requirements && (
                            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e0e0e0' }}>
                              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#999999' }}>Requirements</p>
                              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.specifications.requirements}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seller Information Beside Specifications */}
                    {sellerInfoMap[item.product?.user_id || ''] && (
                      <div>
                        <h4 className="text-lg font-bold mb-4" style={{ color: '#1a1a1a' }}>Seller Information</h4>
                        <div className="rounded-xl p-5 shadow-sm border" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4' }}>
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 border-3"
                              style={{ 
                                backgroundColor: '#208756',
                                borderColor: '#208756'
                              }}
                            >
                              {sellerInfoMap[item.product?.user_id || '']?.profile_picture_url ? (
                                <img
                                  src={sellerInfoMap[item.product?.user_id || '']?.profile_picture_url}
                                  alt="Seller"
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <>
                                  {sellerInfoMap[item.product?.user_id || '']?.first_name?.charAt(0)}
                                  {sellerInfoMap[item.product?.user_id || '']?.last_name?.charAt(0)}
                                </>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="mb-2 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-xs" style={{ color: '#1a1a1a' }}>
                                      {sellerInfoMap[item.product?.user_id || '']?.first_name} {sellerInfoMap[item.product?.user_id || '']?.last_name}
                                    </p>
                                    {sellerInfoMap[item.product?.user_id || '']?.department && (
                                      <p className="text-xs font-semibold" style={{ color: '#666666' }}>Department: {sellerInfoMap[item.product?.user_id || '']?.department}</p>
                                    )}
                                  </div>
                                  {sellerInfoMap[item.product?.user_id || '']?.phone_number && (
                                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#666666' }}>
                                      <Phone className="w-3.5 h-3.5" />
                                      <span>{sellerInfoMap[item.product?.user_id || '']?.phone_number}</span>
                                    </div>
                                  )}
                                </div>
                                {item.specifications?.contact_information && (
                                  <div className="rounded p-3 border mt-2" style={{ backgroundColor: '#ffffff', borderColor: '#d4e8e4' }}>
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#208756' }} />
                                      <div>
                                        <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Seller Contact:</p>
                                        <p className="text-xs leading-relaxed" style={{ color: '#1a1a1a' }}>{item.specifications.contact_information}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 text-xs mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                  <span className="font-semibold" style={{ color: '#1a1a1a' }}>{sellerInfoMap[item.product?.user_id || '']?.avgRating?.toFixed(1) || '0'}/5</span>
                                  <span style={{ color: '#999999' }}>({sellerInfoMap[item.product?.user_id || '']?.reviewCount || 0} reviews)</span>
                                </div>
                                <div className="flex items-center gap-2" style={{ color: '#666666' }}>
                                  <Package className="w-3.5 h-3.5" />
                                  <span>{sellerInfoMap[item.product?.user_id || '']?.totalProducts || 0} products listed</span>
                                </div>
                                <div className="flex items-center gap-2" style={{ color: '#666666' }}>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Joined {sellerInfoMap[item.product?.user_id || '']?.created_at 
                                    ? new Date(sellerInfoMap[item.product?.user_id || '']?.created_at || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                    : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-6 border-t border-gray-200">
                  <button
                    onClick={() => setExpandedDescription(prev => ({ ...prev, [item.cart_id]: !prev[item.cart_id] }))}
                    className="flex items-center justify-between w-full mb-4 hover:opacity-80 transition-opacity cursor-pointer" 
                  >
                    <h4 className="text-lg font-bold" style={{ color: '#208756' }}>
                      {item.product?.listing_type === 'SERVICE' ? 'Service Description' : 'Product Description'}
                    </h4>
                    <svg
                      className="w-5 h-5 transition-transform duration-300"
                      style={{ color: '#999999' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedDescription[item.cart_id] ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"} />
                    </svg>
                  </button>
                  {expandedDescription[item.cart_id] ? (
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#1a1a1a' }}>{item.product?.description}</p>
                  ) : (
                    <div 
                      onClick={() => setExpandedDescription(prev => ({ ...prev, [item.cart_id]: !prev[item.cart_id] }))}
                      className="cursor-pointer"
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line line-clamp-3" style={{ color: '#1a1a1a' }}>
                        {item.product?.description}
                      </p>
                      {(item.product?.description || '').split('\n').length > 2 && (
                        <p className="text-xs font-medium mt-2 hover:opacity-80 transition-opacity" style={{ color:'#208756' }}>Click to expand...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-6 py-6 border-t border-gray-200 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5" style={{ color: '#208756' }} />
                    <h4 className="text-sm font-bold" style={{ color: '#1a1a1a' }}>Order Details</h4>
                  </div>
                  {(item.product?.listing_type?.toUpperCase?.() === 'FOR_SALE' || item.product?.listing_type?.toUpperCase?.() === 'FOR_RENT') && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Pickup Location</label>
                        </div>
                        <input
                          type="text"
                          value={formData.pickupLocation}
                          onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                          placeholder="Where will you pick up the item?"
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{ borderColor: '#d0d0d0' }}
                          onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                          onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Requirements or Notes</label>
                        </div>
                        <textarea
                          value={formData.buyerMessage}
                          onChange={(e) => handleInputChange('buyerMessage', e.target.value)}
                          placeholder="Any special requirements or notes for the seller..."
                          rows={3}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors"
                          style={{ borderColor: '#d0d0d0' }}
                          onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                          onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                      </div>
                    </>
                  )}

                  {item.product?.listing_type?.toUpperCase?.() === 'FOR_RENT' && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Rental Duration</label>
                        </div>
                        <select
                          value={formData.rentDuration}
                          onChange={(e) => handleInputChange('rentDuration', e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '36px'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#208756';
                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select rental duration</option>
                          <option value="Monday-Friday">Monday-Friday</option>
                          <option value="Weekends only">Weekends only</option>
                          <option value="Monday-Saturday">Monday-Saturday</option>
                          <option value="Everyday">Everyday</option>
                          <option value="By appointment">By appointment</option>
                          <option value="Flexible schedule">Flexible schedule</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" style={{ color: '#208756' }} />
                            <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Start Date</label>
                          </div>
                          <input
                            type="date"
                            value={formData.rentStartDate}
                            onChange={(e) => handleInputChange('rentStartDate', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                            style={{ borderColor: '#d0d0d0' }}
                            onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" style={{ color: '#208756' }} />
                            <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>End Date</label>
                          </div>
                          <input
                            type="date"
                            value={formData.rentEndDate}
                            onChange={(e) => handleInputChange('rentEndDate', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                            style={{ borderColor: '#d0d0d0' }}
                            onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Requirements or Notes</label>
                        </div>
                        <textarea
                          value={formData.buyerMessage}
                          onChange={(e) => handleInputChange('buyerMessage', e.target.value)}
                          placeholder="Any special requirements or notes for the seller..."
                          rows={3}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors"
                          style={{ borderColor: '#d0d0d0' }}
                          onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                          onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                      </div>
                    </>
                  )}

                  {item.product?.listing_type?.toUpperCase?.() === 'SERVICE' && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Service Location</label>
                        </div>
                        <input
                          type="text"
                          value={formData.meetupLocation}
                          onChange={(e) => handleInputChange('meetupLocation', e.target.value)}
                          placeholder="Where will the service be conducted?"
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{ borderColor: '#d0d0d0' }}
                          onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                          onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Service Duration</label>
                        </div>
                        <select
                          value={formData.rentDuration}
                          onChange={(e) => handleInputChange('rentDuration', e.target.value)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '36px'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#208756';
                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select service duration</option>
                          <option value="1 hour">1 hour</option>
                          <option value="1-2 hours">1-2 hours</option>
                          <option value="2-3 hours">2-3 hours</option>
                          <option value="3-4 hours">3-4 hours</option>
                          <option value="Half day (4 hours)">Half day (4 hours)</option>
                          <option value="Full day (8 hours)">Full day (8 hours)</option>
                          <option value="Multiple days">Multiple days</option>
                          <option value="Depends on project">Depends on project</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Preferred Date</label>
                        </div>
                        <input
                          type="date"
                          value={formData.preferredServiceDate}
                          onChange={(e) => handleInputChange('preferredServiceDate', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{ borderColor: '#d0d0d0' }}
                          onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                          onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4" style={{ color: '#208756' }} />
                          <label className="block text-sm font-medium" style={{ color: '#1a1a1a' }}>Message to Seller</label>
                        </div>
                        <textarea
                          value={formData.buyerMessage}
                          onChange={(e) => handleInputChange('buyerMessage', e.target.value)}
                          placeholder="Any questions or special requests..."
                          rows={3}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors"
                          style={{ borderColor: '#d0d0d0' }}
                          onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(32, 135, 86, 0.1)'}
                          onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8 space-y-5 border-t-4" style={{ borderTopColor: '#208756' }}>
              {/* Header Section */}
              <div>
                <h3 className="text-2xl font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  {items.some(item => item.product?.listing_type === 'SERVICE') ? 'Service Acquisition Summary' : 'Order Summary'}
                </h3>
                <p className="text-xs" style={{ color: '#999999' }}>Order reference • {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>

              {/* Items Section */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3" style={{ backgroundColor: '#f8f9fa' }}>
                <p className="text-xs font-semibold uppercase" style={{ color: '#999999' }}>
                  {items.some(item => item.product?.listing_type === 'SERVICE') ? 'Services' : 'Items in Order'} ({items.length})
                </p>
                <div className="space-y-2.5">
                  {items.map((item, index) => {
                    const firstImagePath = item.product?.images?.[0]?.storage_path;
                    const firstImageUrl = firstImagePath ? storageService.getPublicUrl(firstImagePath) : null;
                    
                    console.log('📷 Debug - Image:', {
                      product: item.product?.product_name,
                      imagePath: firstImagePath,
                      imageUrl: firstImageUrl,
                      imagesArray: item.product?.images
                    });

                    return (
                      <div key={item.cart_id} className="flex gap-3 py-2 border-b last:border-b-0" style={{ borderBottomColor: '#e0e0e0' }}>
                        {/* Product Image Thumbnail */}
                        {firstImageUrl ? (
                          <div className="flex-shrink-0 w-12 h-12 rounded border overflow-hidden" style={{ borderColor: '#d0d0d0' }}>
                            <img
                              src={firstImageUrl}
                              alt={item.product?.product_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('❌ Image failed to load:', firstImageUrl);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                              onLoad={() => console.log('✅ Image loaded successfully:', firstImageUrl)}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-12 h-12 rounded bg-white border flex items-center justify-center text-xs font-bold" style={{ borderColor: '#d0d0d0', color: '#208756' }}>
                            {index + 1}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#1a1a1a' }}>{item.product?.product_name}</p>
                          <p className="text-xs" style={{ color: '#999999' }}>
                            {item.product?.listing_type === 'SERVICE' 
                              ? `Service • ${item.specifications?.category_name || item.category_name || 'Service'}`
                              : `${item.product?.listing_type === 'FOR_RENT' ? 'Rental' : 'Item'} • Qty: ${item.quantity}`
                            }
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold" style={{ color: '#208756' }}>{formatPrice((item.product?.price || 0) * item.quantity)}</p>
                          <p className="text-xs" style={{ color: '#999999' }}>
                            {item.product?.listing_type === 'SERVICE'
                              ? 'Per service'
                              : `₱${item.product?.price || 0} x ${item.quantity}`
                            }
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cost Breakdown Section */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold uppercase" style={{ color: '#999999' }}>Cost Breakdown</p>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: '#666666' }}>Subtotal</span>
                    <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{formatPrice(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1" style={{ color: '#666666' }}>
                      Platform Fee
                      <span className="text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: '#e8f4f0', color: '#208756' }}>Free</span>
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>₱0.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1" style={{ color: '#666666' }}>
                      Delivery/Service Fee
                      <span className="text-xs rounded px-1.5 py-0.5" style={{ backgroundColor: '#e8f4f0', color: '#208756' }}>Varies</span>
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>TBA</span>
                  </div>
                </div>
                <div className="border-t pt-3" style={{ borderTopColor: '#e0e0e0' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold" style={{ color: '#1a1a1a' }}>Total Amount</span>
                    <span className="text-3xl font-bold" style={{ color: '#208756' }}>
                      {formatPrice(calculateTotal())}
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#999999' }}>Additional fees will be discussed during transaction</p>
                </div>
              </div>

              {/* Payment Method & Transaction Details */}
              <div className="rounded-lg p-4 border space-y-3" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: '#208756' }} />
                  <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>Payment Details</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-semibold mb-1 uppercase" style={{ color: '#999999' }}>Payment Method</p>
                    <p style={{ color: '#1a1a1a' }}>Cash on hand ({items.some(item => item.product?.listing_type === 'SERVICE') ? 'at meetup' : 'at pickup'})</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1 uppercase" style={{ color: '#999999' }}>Transaction Status</p>
                    <p style={{ color: '#208756' }}>Pending Confirmation</p>
                  </div>
                </div>
              </div>

              <div className="rounded p-3 text-xs bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-700 mb-1">Blockchain Recording</p>
                <p className="text-gray-600">This transaction will be recorded on the Ethereum Sepolia blockchain.</p>
              </div>  

              {/* Action Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full py-4 px-6 rounded-lg font-bold text-white text-base transition-all duration-200"
                style={{
                  backgroundColor: loading ? '#cccccc' : '#208756',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(32, 135, 86, 0.25)',
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1a6c44')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#208756')}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Order...
                  </div>
                ) : (
                  'Confirm & Place Order'
                )}
              </button>

              {blockchainStatus.isProcessing && (
                <div className="rounded p-4 bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full animate-pulse bg-green-600"></div>
                    <p className="text-sm font-medium text-gray-700">
                      {blockchainStatus.step === 'validation' && 'Validating Order'}
                      {blockchainStatus.step === 'preparation' && 'Preparing Transaction'}
                      {blockchainStatus.step === 'blockchain' && 'Waiting for MetaMask'}
                      {blockchainStatus.step === 'confirmation' && 'Confirming on Blockchain'}
                      {blockchainStatus.step === 'complete' && 'Order Placed'}
                    </p>
                  </div>
                  <p className="text-xs ml-6 text-gray-600 mt-1">{blockchainStatus.message}</p>
                </div>
              )}

              {/* Transaction Process Guide */}
              <div className="border rounded-lg p-4 space-y-3" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: '#208756' }} />
                  <h4 className="text-sm font-bold" style={{ color: '#1a1a1a' }}>How It Works</h4>
                </div>
                <div className="space-y-3 text-xs" style={{ color: '#666666' }}>
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#208756' }}>1</div>
                    <div className="pt-0.5">
                      <p className="font-semibold" style={{ color: '#1a1a1a' }}>Click "Confirm & Place Order"</p>
                      <p>Review your order details and proceed</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#208756' }}>2</div>
                    <div className="pt-0.5">
                      <p className="font-semibold" style={{ color: '#1a1a1a' }}>MetaMask Confirmation</p>
                      <p>Approve the blockchain transaction (requires Sepolia ETH)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#208756' }}>3</div>
                    <div className="pt-0.5">
                      <p className="font-semibold" style={{ color: '#1a1a1a' }}>Order Recorded</p>
                      <p>Transaction is recorded on the blockchain</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#208756' }}>4</div>
                    <div className="pt-0.5">
                      <p className="font-semibold" style={{ color: '#1a1a1a' }}>Payment at Meetup</p>
                      <p>Cash payment happens during pickup/service</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-center text-gray-500">
                <p>By placing this order, you agree to our <span className="text-green-700 font-medium">terms and conditions</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDiscardModal && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header with Icon */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f4f0', color: '#208756' }}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>Leave Checkout?</h3>
                </div>
                <button
                  onClick={() => setShowDiscardModal(false)}
                  className="transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  style={{ color: '#999999' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#666666'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4" style={{ backgroundColor: '#f9fafb' }}>
              <div className="space-y-3">
                <p className="text-sm font-medium" style={{ color: '#666666' }}>
                  Are you sure you want to leave checkout?
                </p>
                <div className="bg-white rounded-lg p-3 border-l-4" style={{ borderLeftColor: '#208756' }}>
                  <p className="text-xs" style={{ color: '#999999' }}>
                    • Your order details will not be saved
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: '#999999' }}>
                    • You'll need to enter everything again
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderTopColor: '#e5e7eb' }}>
              <button
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 px-4 py-2.5 border-2 rounded-lg font-semibold transition-all duration-200"
                style={{ borderColor: '#208756', color: '#208756' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f8f6';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Continue Checkout
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-all duration-200"
                style={{ backgroundColor: '#208756' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a6d46';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#208756';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Leave Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
