import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Loader, Copy, Check, Phone, Mail, MessageSquare, MapPin, Users, ShoppingBag, Star } from 'lucide-react';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import ImageCarousel from '../components/ImageCarousel';

interface Product {
  product_id: number;
  user_id: string;
  category_id: number;
  product_name: string;
  description: string;
  price: number;
  quantity: number;
  listing_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  product_images?: {
    image_id: number;
    storage_path: string;
    image_order: number;
  }[];
  images?: string[];
  sold_count?: number;
  wishlist_count?: number;
  category?: { category_id: number; category_name: string };
  pickup_location?: string;
  rent_duration?: string;
  meetup_location?: string;
  service_schedule?: string;
  seller?: {
    user_id: string;
    first_name: string;
    last_name: string;
    username: string;
    phone_number?: string;
    profile_picture?: string;
    profile_picture_url?: string;
    average_seller_rating?: number;
    total_reviews_received?: number;
  };
}

interface SellerData {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  gender?: string;
  department?: string;
  phone_number?: string;
  year_level?: string;
  bio?: string;
  profile_picture_url?: string;
  profile_picture?: string;
  wallet_address?: string;
  is_verified: boolean;
  is_active?: boolean;
  created_at: string;
  total_products_posted: number;
  total_products_sold: number;
  average_seller_rating: number;
  total_reviews_received: number;
  last_active_at?: string;
}

interface Review {
  review_id: number;
  rating: number;
  review_text: string;
  review_images?: string[] | null;
  created_at: string;
  product_id?: number;
  reviewer?: {
    username: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  product?: {
    product_id: number;
    product_name: string;
  };
}

interface ProductRating {
  avgRating: number;
  count: number;
}

const SellerProfilePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get product name and ID from navigation state (passed from ProductDetails)
  const { productName = null, productId = null } = (location.state as any) || {};

  const [seller, setSeller] = useState<SellerData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productRatings, setProductRatings] = useState<{[key: number]: ProductRating}>({});
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  
  const [calculatedStats, setCalculatedStats] = useState({
    totalProductsListed: 0,
    totalProductsSold: 0,
    totalProductsRented: 0,
    totalServicesDelivered: 0,
    averageRating: 0,
    totalReviews: 0,
    totalRevenue: 0,
    totalOrdersAsBuyer: 0,
    totalOrdersAsSeller: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'latest' | 'top_sales'>('latest');
  const [selectedListingTypes, setSelectedListingTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'statistics'>('products');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<{category_id: number; category_name: string}[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [minRating, setMinRating] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(2);

  useEffect(() => {
    document.title = 'Seller Profile - CSU Marketplace';
  }, []);

  useEffect(() => {
    if (sellerId) {
      loadSellerProfile();
    }
    loadCategories();
  }, [sellerId]);

  const loadCategories = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('categories')
        .select('category_id, category_name')
        .order('category_name');
      
      if (!error && data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
    }
  };

  useEffect(() => {
    applyFiltersAndSort();
  }, [products, searchQuery, sortBy, selectedListingTypes, selectedCategory, priceRange, minRating]);

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.product_name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    if (selectedListingTypes.length > 0) {
      filtered = filtered.filter(p => selectedListingTypes.includes(p.listing_type));
    }

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    if (priceRange.min > 0 || priceRange.max < 100000) {
      filtered = filtered.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);
    }

    if (minRating > 0) {
      filtered = filtered.filter(p => {
        const rating = productRatings[p.product_id]?.avgRating || 0;
        return rating >= minRating;
      });
    }

    if (sortBy === 'latest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'top_sales') {
      filtered.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
    } else if (sortBy === 'relevance') {
      filtered.sort((a, b) => {
        const ratingA = productRatings[a.product_id]?.avgRating || 0;
        const ratingB = productRatings[b.product_id]?.avgRating || 0;
        return ratingB - ratingA;
      });
    }

    setFilteredProducts(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedListingTypes([]);
    setSortBy('latest');
    setSelectedCategory(null);
    setPriceRange({ min: 0, max: 100000 });
    setMinRating(0);
    setCurrentPage(1);
  };

  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    setPriceRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const loadSellerProfile = async () => {
    try {
      if (!supabase || !sellerId) {
        console.error('Database connection not available');
        return;
      }

      console.log('🔄 Loading seller profile for seller ID:', sellerId);

      const [sellerRes, productsRes] = await Promise.all([
        supabase.from('users').select('*').eq('user_id', sellerId).single(),
        supabase
          .from('products')
          .select('*, category:categories(category_id, category_name)')
          .eq('user_id', sellerId)
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false })
      ]);

      if (sellerRes.error || !sellerRes.data) {
        console.error('❌ Error loading seller:', sellerRes.error);
        return;
      }

      console.log('✅ Seller loaded:', sellerRes.data);
      setSeller(sellerRes.data);
      
      if (productsRes.data) {
        console.log('📦 Products found:', productsRes.data.length);
        console.log('📦 Product IDs:', productsRes.data.map(p => p.product_id));
        await loadEnrichedProducts(productsRes.data);
        // Fetch reviews for all products
        const productIds = productsRes.data.map(p => p.product_id);
        console.log('🔄 Calling loadProductReviews with IDs:', productIds);
        await loadProductReviews(productIds);
      } else {
        console.warn('⚠️ No products found');
        await calculateSellerStatistics([]);
      }
    } catch (error) {
      console.error('❌ Exception loading seller profile:', error);
    }
  };

  const calculateSellerStatistics = async (productsList: Product[] = products) => {
    try {
      if (!supabase || !sellerId) return;

      if (productsList.length === 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('product_id, listing_type')
          .eq('user_id', sellerId)
          .eq('status', 'APPROVED');
        if (productsData) productsList = productsData as any[];
      }

      const productIds = productsList.map(p => p.product_id);

      console.log('📊 CALCULATING SELLER STATISTICS:');
      console.log('   Seller ID:', sellerId);
      console.log('   Products listed:', productIds.length);
      console.log('   Product IDs:', productIds);

      // Fetch transactions with product info to filter by listing type
      // The transactions table stores listing_type directly - no need to join with products
      
      // First, fetch ALL transactions to see what statuses exist
      const [allTransactionsRes, transactionsRes, transactionsAsBuyerRes, allReviewsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('product_id, transaction_status, listing_type')
          .eq('seller_id', sellerId),
        supabase
          .from('transactions')
          .select('product_id, transaction_status, listing_type')
          .eq('seller_id', sellerId)
          .eq('transaction_status', 'COMPLETED'),
        supabase.from('transactions').select('id').eq('buyer_id', sellerId).eq('transaction_status', 'COMPLETED'),
        supabase.from('reviews').select('rating').eq('seller_id', sellerId)
      ]);

      const allTransactions = allTransactionsRes.data || [];
      const transactions = transactionsRes.data || [];
      const transactionsAsBuyer = transactionsAsBuyerRes.data || [];
      const allReviews = allReviewsRes.data || [];

      console.log('   📊 ALL TRANSACTIONS for seller:', allTransactions.length);
      allTransactions.forEach((tx: any) => {
        console.log(`      - Transaction: product=${tx.product_id}, status="${tx.transaction_status}", listing_type="${tx.listing_type}"`);
      });

      console.log('   ✅ COMPLETED Transactions fetched:', transactions.length);
      console.log('   ✅ Raw COMPLETED transactions data:', transactions);
      
      if (transactionsRes.error) {
        console.error('   ❌ Error fetching completed transactions:', transactionsRes.error);
      }
      
      if (allTransactionsRes.error) {
        console.error('   ❌ Error fetching all transactions:', allTransactionsRes.error);
      }

      // Count transactions by listing type (no need to map products)
      let totalSold = 0;
      let totalRented = 0;
      let totalServicesDelivered = 0;

      transactions.forEach((tx: any) => {
        console.log(`   Processing tx: product=${tx.product_id}, listing_type=${tx.listing_type}`);
        if (tx.listing_type === 'FOR_SALE') totalSold++;
        else if (tx.listing_type === 'FOR_RENT') totalRented++;
        else if (tx.listing_type === 'SERVICE') totalServicesDelivered++;
      });

      console.log('   📈 Totals - Sold:', totalSold, 'Rented:', totalRented, 'Services:', totalServicesDelivered);

      const avgRating = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

      setCalculatedStats({
        totalProductsListed: productsList.length,
        totalProductsSold: totalSold,
        totalProductsRented: totalRented,
        totalServicesDelivered: totalServicesDelivered,
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length,
        totalRevenue: 0,
        totalOrdersAsBuyer: transactionsAsBuyer.length,
        totalOrdersAsSeller: transactions.length
      });
    } catch (error) {
      console.error('❌ Exception calculating statistics:', error);
    }
  };

  const loadEnrichedProducts = async (baseProducts: Product[]) => {
    try {
      setProductsLoading(true);

      // Fetch sold counts for all products using transactions table - filtered by seller_id
      const productIds = baseProducts.map(p => p.product_id);
      let soldCountsMap: { [key: number]: number } = {};
      
      if (productIds.length > 0) {
        const { data: soldData } = await supabase!
          .from('transactions')
          .select('product_id')
          .eq('seller_id', sellerId)
          .in('product_id', productIds)
          .eq('transaction_status', 'COMPLETED');
        
        // Count occurrences of each product_id
        if (soldData) {
          soldData.forEach((transaction: any) => {
            soldCountsMap[transaction.product_id] = (soldCountsMap[transaction.product_id] || 0) + 1;
          });
        }
      }

      const enrichedProducts = await Promise.all(
        baseProducts.map(async (product) => {
          if (!supabase) return { ...product, product_images: [] };

          const [imagesRes, wishlistRes] = await Promise.all([
            supabase
              .from('product_images')
              .select('image_id, storage_path, image_order')
              .eq('product_id', product.product_id)
              .order('image_order', { ascending: true }),
            supabase
              .from('wishlists')
              .select('wishlist_id')
              .eq('product_id', product.product_id)
          ]);

          return {
            ...product,
            product_images: imagesRes.data || [],
            sold_count: soldCountsMap[product.product_id] || 0,
            wishlist_count: wishlistRes.data?.length || 0
          };
        })
      );

      setProducts(enrichedProducts);
      await loadProductRatings(enrichedProducts.map(p => p.product_id));
      if (sellerId) {
        await calculateSellerStatistics(enrichedProducts);
      }
    } catch (error) {
      console.error('❌ Exception enriching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadProductRatings = async (productIds: number[]) => {
    try {
      if (!supabase || productIds.length === 0) return;

      const { data, error } = await supabase
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', productIds);

      if (!error && data) {
        const ratings: {[key: number]: ProductRating} = {};
        productIds.forEach(id => {
          const productReviews = data.filter(r => r.product_id === id);
          const avgRating = productReviews.length > 0
            ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
            : 0;
          ratings[id] = {
            avgRating: Math.round(avgRating * 10) / 10,
            count: productReviews.length
          };
        });
        setProductRatings(ratings);
      }
    } catch (error) {
      console.error('❌ Exception loading ratings:', error);
    }
  };

  const loadProductReviews = async (productIds: number[]) => {
    try {
      if (!supabase || productIds.length === 0) {
        console.warn('⚠️ No product IDs to fetch reviews for');
        setReviews([]);
        return;
      }

      console.log('📦 Fetching reviews for product IDs:', productIds);

      // First, try to fetch reviews with product_id filter
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviewer_id(username, first_name, last_name, profile_picture_url),
          product:products!product_id(product_id, product_name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      console.log('🔍 Query error:', error);
      console.log('✅ Reviews fetched:', data);
      console.log('📊 Number of reviews:', data?.length || 0);

      if (error) {
        console.error('❌ Error loading product reviews:', error);
        // Try alternative approach - fetch all reviews and filter by seller_id
        if (sellerId) {
          console.log('🔄 Trying alternative approach with seller_id:', sellerId);
          const { data: altData, error: altError } = await supabase
            .from('reviews')
            .select(`
              *,
              reviewer:users!reviewer_id(username, first_name, last_name, profile_picture_url),
              product:products!product_id(product_id, product_name)
            `)
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false });

          console.log('🔄 Alternative query error:', altError);
          console.log('🔄 Alternative reviews fetched:', altData);
          if (altData) {
            setReviews(altData as any);
          }
        }
        return;
      }

      if (data && data.length > 0) {
        setReviews(data as any);
      } else {
        console.warn('⚠️ No reviews found for these products');
        setReviews([]);
      }
    } catch (error) {
      console.error('❌ Exception loading product reviews:', error);
      setReviews([]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const formatWalletAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-white fill-current stroke-yellow-400'
            }`}
            viewBox="0 0 20 20"
            strokeWidth="1"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  const getInitials = () => {
    if (!seller) return 'S';
    const first = seller.first_name?.charAt(0) || '';
    const last = seller.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || 'S';
  };

  const navigateToProductDetails = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin" style={{ color: '#208756' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/browse')}
              className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors font-medium"
            >
              Browse
            </button>
            <span className="text-[#9CA3AF]">{`>`}</span>
            {productName && productId ? (
              <>
                <button
                  onClick={() => navigate(`/product/${productId}`, { state: { productName } })}
                  className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors font-medium truncate"
                >
                  {productName}
                </button>
                <span className="text-[#9CA3AF]">{`>`}</span>
              </>
            ) : null}
            <span className="text-[#208756] font-bold truncate">Seller Profile</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Seller Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 text-center">
              {/* Profile Picture */}
              <div className="relative inline-block mb-4">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-4"
                  style={{ backgroundColor: '#208756', borderColor: '#208756' }}
                >
                  {seller?.profile_picture_url || seller?.profile_picture ? (
                    <img
                      src={seller.profile_picture_url || seller.profile_picture}
                      alt={seller?.first_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials()
                  )}
                </div>
                {seller?.is_verified && (
                  <div className="absolute bottom-0 right-0 rounded-full p-1.5 border-2 border-white" style={{ backgroundColor: '#208756' }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Seller Info */}
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {seller?.first_name} {seller?.last_name}
              </h2>
              <p className="text-sm text-gray-500 mb-3">@{seller?.username}</p>

              {seller?.is_verified && (
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full text-white mb-3"
                  style={{ backgroundColor: '#208756' }}
                >
                  <Check className="w-3 h-3" />
                  Verified Seller
                </span>
              )}

              {/* Department */}
              {seller?.department && (
                <div className="mb-3 px-3 py-2 bg-gradient-to-r from-[#e6f7ef] to-[#f0faf8] rounded-lg border border-[#c8e6d7]">
                  <p className="text-xs text-gray-500 font-medium mb-1">Department</p>
                  <p className="text-sm font-semibold text-[#208756]">{seller.department}</p>
                </div>
              )}

              {/* Member Since */}
              <p className="text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                Member since {formatDate(seller?.created_at || '')}
              </p>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold" style={{ color: '#208756' }}>{calculatedStats.totalProductsListed}</div>
                  <div className="text-xs text-gray-600 mt-1">Products Posted</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold" style={{ color: '#208756' }}>{calculatedStats.totalProductsSold}</div>
                  <div className="text-xs text-gray-600 mt-1">Sold</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-blue-600">{calculatedStats.totalProductsRented}</div>
                  <div className="text-xs text-gray-600 mt-1">Rented Out</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-purple-600">{calculatedStats.totalServicesDelivered}</div>
                  <div className="text-xs text-gray-600 mt-1">Services Offered</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-yellow-500">{calculatedStats.averageRating.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 mt-1">Rating</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold" style={{ color: '#208756' }}>{calculatedStats.totalReviews}</div>
                  <div className="text-xs text-gray-600 mt-1">Reviews</div>
                </div>
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ color: '#208756' }}>Contact Information</h3>
              
              <div className="space-y-3">
                {seller?.email && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#208756' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-sm text-gray-900 break-all">{seller.email}</p>
                    </div>
                  </div>
                )}
                {seller?.phone_number && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#208756' }} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Phone</p>
                      <p className="text-sm text-gray-900">{seller.phone_number}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Address */}
              {seller?.wallet_address && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-2">Wallet Address</p>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <code className="text-xs text-gray-700 flex-1 break-all font-mono">
                      {formatWalletAddress(seller.wallet_address)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(seller.wallet_address || '')}
                      className="p-2 rounded-lg transition-colors flex-shrink-0"
                      style={{ backgroundColor: copiedWallet ? '#e6f7ef' : 'transparent' }}
                    >
                      {copiedWallet ? (
                        <Check className="w-4 h-4" style={{ color: '#208756' }} />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Bio */}
              {seller?.bio && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-2">About</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{seller.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="border-b-2 border-gray-100">
                <div className="flex p-1 gap-1 bg-gray-50">
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 rounded-lg ${
                      activeTab === 'products'
                        ? 'text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    style={activeTab === 'products' ? { backgroundColor: '#208756' } : {}}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Products ({filteredProducts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 rounded-lg ${
                      activeTab === 'reviews'
                        ? 'text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    style={activeTab === 'reviews' ? { backgroundColor: '#208756' } : {}}
                  >
                    <Star className="w-4 h-4" />
                    Reviews ({reviews.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-8 bg-white">
                {/* Products Tab */}
                {activeTab === 'products' && (
                  <div>
                    {/* Search Bar */}
                    <div className="mb-6">
                      <div className="relative">
                        <div className="flex items-center bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-md overflow-hidden border-2 border-gray-100 hover:border-[#208756] transition-colors">
                          <svg className="w-5 h-5 text-[#208756] ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products, rent items, or services..."
                            className="flex-1 px-4 py-3 text-sm focus:outline-none bg-transparent"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Compact Horizontal Filters Bar */}
                    <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-md border border-gray-100 px-6 py-4 mb-6">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Listing Type Buttons - Compact */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedListingTypes([])}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                              selectedListingTypes.length === 0
                                ? 'text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-[#208756]'
                            }`}
                            style={selectedListingTypes.length === 0 ? { backgroundColor: '#208756' } : {}}
                          >
                            All
                          </button>
                          {['FOR_SALE', 'FOR_RENT', 'SERVICE'].map((type) => (
                            <button
                              key={type}
                              onClick={() => setSelectedListingTypes([type])}
                              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                selectedListingTypes.includes(type) && selectedListingTypes.length === 1
                                  ? 'text-white shadow-md'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-[#208756]'
                              }`}
                              style={selectedListingTypes.includes(type) && selectedListingTypes.length === 1 ? { backgroundColor: '#208756' } : {}}
                            >
                              {type === 'FOR_SALE' ? 'For Sale' : type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                            </button>
                          ))}
                        </div>

                        <span className="text-gray-300 h-6">|</span>
                        
                        {/* Price Dropdown - Compact */}
                        <div className="relative group">
                          <button className="px-4 py-2 text-xs font-semibold border-2 border-gray-300 rounded-lg hover:border-[#208756] hover:text-[#208756] transition-colors flex items-center gap-2">
                            Price
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl p-4 w-64 hidden group-hover:block z-10">
                            <div className="space-y-2">
                              <button
                                onClick={() => setPriceRange({ min: 0, max: 100000 })}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-[#e6f7ef] rounded-lg transition-colors font-medium text-gray-700"
                              >
                                All Prices
                              </button>
                              <button
                                onClick={() => setPriceRange({ min: 0, max: 500 })}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-[#e6f7ef] rounded-lg transition-colors font-medium text-gray-700"
                              >
                                Under ₱500
                              </button>
                              <button
                                onClick={() => setPriceRange({ min: 500, max: 2000 })}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-[#e6f7ef] rounded-lg transition-colors font-medium text-gray-700"
                              >
                                ₱500 - ₱2,000
                              </button>
                              <button
                                onClick={() => setPriceRange({ min: 2000, max: 5000 })}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-[#e6f7ef] rounded-lg transition-colors font-medium text-gray-700"
                              >
                                ₱2,000 - ₱5,000
                              </button>
                              <button
                                onClick={() => setPriceRange({ min: 5000, max: 100000 })}
                                className="block w-full text-left px-3 py-2 text-xs hover:bg-[#e6f7ef] rounded-lg transition-colors font-medium text-gray-700"
                              >
                                Over ₱5,000
                              </button>
                              <div className="border-t border-gray-200 pt-3 mt-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Custom Range</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    placeholder="Min (₱)"
                                    value={priceRange.min}
                                    onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                                    className="px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:border-[#208756] focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Max (₱)"
                                    value={priceRange.max}
                                    onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                                    className="px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:border-[#208756] focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Clear Filters */}
                        {(selectedCategory || selectedListingTypes.length > 0 || minRating > 0 || priceRange.min > 0 || priceRange.max < 100000) && (
                          <button
                            onClick={clearAllFilters}
                            className="ml-auto px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all hover:shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: '#208756' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear Filters
                          </button>
                        )}
                      </div>

                      {/* Results Count */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-bold text-gray-900">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'product' : 'products'} found
                          {selectedCategory && ` in ${categories.find(c => c.category_id === selectedCategory)?.category_name}`}
                        </p>
                      </div>
                    </div>

                    {/* Products Grid */}
                    {productsLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader className="w-10 h-10 animate-spin" style={{ color: '#208756' }} />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Products Found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          We couldn't find any products matching your filters. Try adjusting your search criteria.
                        </p>
                        <button
                          onClick={clearAllFilters}
                          className="px-6 py-2 text-white font-medium rounded transition-colors"
                          style={{ backgroundColor: '#208756' }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
                        >
                          Clear All Filters
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between mb-6 px-2 py-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: currentPage === 1 ? '#9CA3AF' : '#208756' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div className="text-sm font-semibold text-gray-700">
                            Page <span style={{ color: '#208756' }}>{currentPage}</span> of <span style={{ color: '#208756' }}>{Math.ceil(filteredProducts.length / itemsPerPage)}</span>
                          </div>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProducts.length / itemsPerPage), prev + 1))}
                            disabled={currentPage >= Math.ceil(filteredProducts.length / itemsPerPage)}
                            className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: currentPage >= Math.ceil(filteredProducts.length / itemsPerPage) ? '#9CA3AF' : '#208756' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product) => (
                          <div 
                            key={product.product_id} 
                            onClick={() => navigateToProductDetails(product.product_id)}
                            className="bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer border-2 border-gray-200 hover:border-[#208756]"
                          >
                            {/* Product Image */}
                            <div className="relative w-full" style={{ paddingBottom: '60%' }}>
                              <div className="absolute inset-0">
                                <ImageCarousel 
                                  images={product.product_images || []}
                                  productName={product.product_name}
                                  className="h-full w-full"
                                />
                              </div>

                              {/* Image Counter - Top Right */}
                              {product.product_images && product.product_images.length > 1 && (
                                <div className="absolute top-3 right-3 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1 border-opacity-50">
                                  <span className="text-xs font-bold text-green-800">+{product.product_images.length - 1}</span>
                                </div>
                              )}

                              {/* Sold Out Badge */}
                              {product.quantity === 0 && product.listing_type === 'FOR_SALE' && (
                                <div className="absolute top-2 left-3 px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                                  SOLD OUT
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="p-3">
                              {/* Product Name */}
                              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 mt-3" style={{ minHeight: '36px' }}>
                                {product.product_name}
                              </h3>

                              {/* Product Description */}
                              <p className="text-xs text-gray-600 line-clamp-1 mb-2">
                                {product.description}
                              </p>

                              {/* Price & Listing Type Badge */}
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-lg font-bold" style={{ color: '#208756' }}>
                                  {formatPrice(product.price)}
                                </p>
                                <div className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${
                                  product.listing_type === 'FOR_SALE' 
                                    ? 'bg-[#208756]' 
                                    : product.listing_type === 'FOR_RENT'
                                    ? 'bg-blue-600'
                                    : 'bg-purple-600'
                                }`}>
                                  {product.listing_type === 'FOR_SALE' ? 'For Sale' : product.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                                </div>
                              </div>

                              {/* Seller Info */}
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                <div className="flex-shrink-0">
                                  {seller?.profile_picture_url || seller?.profile_picture ? (
                                    <img
                                      src={seller.profile_picture_url || seller.profile_picture}
                                      alt={`${seller?.first_name} ${seller?.last_name}`}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-[#208756]"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-[#208756] to-[#1a6d45] rounded-full flex items-center justify-center">
                                      <Users className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {seller?.first_name} {seller?.last_name}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {seller?.phone_number && (
                                      <Phone className="w-3 h-3 text-gray-400" />
                                    )}
                                    <p className="text-xs text-gray-500 truncate">
                                      {seller?.phone_number || seller?.username}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {/* Product Reviews */}
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-2 mt-3">
                                <div>
                                  {productRatings[product.product_id] && productRatings[product.product_id].count > 0 ? (
                                    <span className="text-gray-700 font-medium">({productRatings[product.product_id].count}) reviewed</span>
                                  ) : (
                                    <span className="text-gray-500">No reviews</span>
                                  )}
                                </div>
                                {/* Real Sold Count Badge - Only for FOR_SALE */}
                                {product.listing_type === 'FOR_SALE' && (
                                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                                      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                                      stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="font-bold text-green-700 text-xs">{product.sold_count || 0}</span>
                                  </div>
                                )}
                                {/* Services Acquired Count Badge - Only for SERVICE */}
                              </div>

                              {/* Location Info - Only for FOR_SALE */}
                              {product.listing_type === 'FOR_SALE' && (
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0" />
                                    <p className="truncate">{product.pickup_location || 'N/A'}</p>
                                  </div>
                                  <div className="flex-shrink-0 ml-2">
                                    <span className="text-green-600 font-bold">{product.sold_count || 0}</span> sold
                                  </div>
                                </div>
                              )}

                              {/* Quantity Available - Only for FOR_SALE */}
                              {product.listing_type === 'FOR_SALE' && (
                                <div className="text-xs text-gray-600 mb-2">
                                  Quantity Available: {product.quantity || 0}
                                </div>
                              )}

                              {/* Pickup Location for FOR_RENT */}
                              {product.listing_type === 'FOR_RENT' && (
                                <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
                                  <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0" />
                                  <p className="truncate">{product.pickup_location || 'N/A'}</p>
                                </div>
                              )}

                              {/* Rental Duration for FOR_RENT */}
                              {product.listing_type === 'FOR_RENT' && (
                                <div className="text-xs text-gray-600 mb-2">
                                  Rent Duration: {product.rent_duration || 'N/A'}
                                </div>
                              )}

                              {/* Meetup Location for SERVICE */}
                              {product.listing_type === 'SERVICE' && (
                                <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
                                  <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0" />
                                  <p className="truncate">{product.meetup_location || 'N/A'}</p>
                                </div>
                              )}

                              {/* Service Schedule for SERVICE */}
                              {product.listing_type === 'SERVICE' && (
                                <div className="text-xs text-gray-600 mb-2">
                                  Schedule: {product.service_schedule || 'N/A'}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div>
                    {reviews.length === 0 ? (
                      <div className="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-700 mb-2">No Reviews Yet</h3>
                        <p className="text-gray-500 text-sm">This seller hasn't received any product reviews yet. Be the first to review!</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                          <MessageSquare className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-semibold text-green-700">Showing <span className="text-green-900">{reviews.length}</span> product review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="space-y-4">
                          {reviews.map((review) => (
                            <div 
                              key={review.review_id} 
                              onClick={() => review.product_id && navigateToProductDetails(review.product_id)}
                              className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-5 border-2 border-gray-200 hover:border-[#208756] hover:shadow-lg transition-all cursor-pointer group"
                            >
                              {/* Product Name */}
                              <div className="mb-4 pb-3 border-b-2 border-gray-100">
                                <p className="text-xs font-bold text-[#208756] uppercase tracking-wide">
                                  {review.product?.product_name || 'Unknown Product'}
                                </p>
                              </div>
                              
                              {/* Reviewer & Rating Header */}
                              <div className="flex items-start gap-3 mb-3">
                                <div className="flex-shrink-0">
                                  {review.reviewer?.profile_picture_url ? (
                                    <img
                                      src={review.reviewer.profile_picture_url}
                                      alt={`${review.reviewer?.first_name} ${review.reviewer?.last_name}`}
                                      className="w-11 h-11 rounded-full object-cover border-3 border-[#208756] shadow-sm"
                                    />
                                  ) : (
                                    <div
                                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                                      style={{ backgroundColor: '#208756' }}
                                    >
                                      {review.reviewer?.first_name?.charAt(0)}
                                      {review.reviewer?.last_name?.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">
                                        {review.reviewer?.first_name} {review.reviewer?.last_name}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(review.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5">{renderStars(review.rating)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Review Text */}
                              {review.review_text && (
                                <p className="text-sm text-gray-700 leading-relaxed mb-3 group-hover:text-gray-900 transition-colors">{review.review_text}</p>
                              )}
                              
                              {/* Review Images */}
                              {review.review_images && review.review_images.length > 0 && (
                                <div className="mt-4 pt-4 border-t-2 border-gray-100">
                                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                                    🖼️ Review Images <span className="ml-auto text-[#208756]">({review.review_images.length})</span>
                                  </p>
                                  <div className="grid grid-cols-6 gap-2">
                                    {review.review_images.map((imageUrl, index) => (
                                      <div
                                        key={index}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-[#208756] cursor-pointer group/image shadow-sm hover:shadow-md transition-all"
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={`Review image ${index + 1}`}
                                          className="w-full h-full object-cover group-hover/image:scale-110 transition-transform"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="M21 15l-5-5L5 21"/%3E%3C/svg%3E';
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-20 transition-all" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* View Details Indicator */}
                              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs text-[#208756] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>View Product Details</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SellerProfilePage;
