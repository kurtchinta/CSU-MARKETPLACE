import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router';
import ImageCarousel from '../components/ImageCarousel';
import { Users, MapPin, Phone, Loader } from 'lucide-react';
import Footer from '../components/Footer';


interface FavoriteItem {
  favorite_id: number;
  product_id: number;
  created_at: string;
  product?: {
    product_id: number;
    product_name: string;
    description: string;
    price: number;
    listing_type: string;
    status: string;
    quantity: number;
    category_id?: number;
    user_id?: string;
    pickup_location?: string;
    meetup_location?: string;
    rent_duration?: string;
    service_schedule?: string;
    sold_count?: number;
    images?: Array<{ image_id?: number; storage_path: string; image_order?: number }>;
    seller?: {
      user_id: string;
      username: string;
      first_name: string;
      last_name: string;
      profile_picture_url?: string;
      phone_number?: string;
      average_seller_rating?: number;
      total_reviews_received?: number;
    };
  };
  sellerRating?: number;
}

const FavoritesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showError, showSuccess } = useModal();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'My Favorites - CSU Marketplace';
  }, []);
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productRatings, setProductRatings] = useState<{[key: number]: {avgRating: number, count: number}}>({}); 

  // Helper to format price
  const formatPrice = (price: number): string => {
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    if (user && profile) {
      loadFavorites();
    }
  }, [user, profile]);

  const loadProductRatings = async (productIds: number[]) => {
    try {
      if (!supabase || productIds.length === 0) return;
      
      const { data, error } = await supabase
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', productIds);
      
      if (error) {
        console.error('❌ Error fetching ratings:', error);
        return;
      }
      
      const ratingsMap: {[key: number]: {avgRating: number, count: number}} = {};
      
      (data || []).forEach((review: any) => {
        if (!ratingsMap[review.product_id]) {
          ratingsMap[review.product_id] = { avgRating: 0, count: 0 };
        }
        ratingsMap[review.product_id].avgRating += review.rating;
        ratingsMap[review.product_id].count += 1;
      });
      
      Object.keys(ratingsMap).forEach((productId) => {
        const id = Number(productId);
        ratingsMap[id].avgRating = ratingsMap[id].avgRating / ratingsMap[id].count;
      });
      
      setProductRatings(ratingsMap);
      console.log('✅ Product ratings loaded:', Object.keys(ratingsMap).length);
    } catch (error) {
      console.error('❌ Exception loading product ratings:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        showError('Error', 'Database connection not available');
        return;
      }

      const { data, error } = await supabase
        .from('product_favorites')
        .select(`
          favorite_id,
          product_id,
          created_at,
          product:products (
            product_id,
            product_name,
            description,
            price,
            listing_type,
            status,
            quantity,
            category_id,
            user_id,
            pickup_location,
            meetup_location,
            rent_duration,
            service_schedule,
            sold_count,
            images:product_images (
              storage_path
            ),
            seller:users!products_user_id_fkey (
              user_id,
              username,
              first_name,
              last_name,
              profile_picture_url,
              phone_number,
              average_seller_rating,
              total_reviews_received
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading favorites:', error);
        showError('Error', 'Failed to load favorites');
        return;
      }

      // Fetch and calculate seller ratings and sold count for each favorite
      const favoritesWithRatings = await Promise.all(
        (data || []).map(async (favorite: any) => {
          if (!favorite.product?.seller?.user_id || !supabase) {
            console.log('⚠️ Missing seller info for favorite:', favorite.product_id);
            return favorite;
          }

          try {
            console.log('🔍 Fetching ratings for seller:', favorite.product.seller.user_id);
            
            // Fetch all products by this seller
            const { data: sellerProducts, error: productsError } = await supabase!
              .from('products')
              .select('product_id')
              .eq('user_id', favorite.product.seller.user_id);

            if (productsError) {
              console.error('❌ Error fetching seller products:', productsError);
              return favorite;
            }

            if (!sellerProducts || sellerProducts.length === 0) {
              console.log('⚠️ No products found for seller:', favorite.product.seller.user_id);
              return favorite;
            }

            console.log('✅ Found', sellerProducts.length, 'products for seller');

            const productIds = sellerProducts.map((p: any) => p.product_id);

            // Fetch reviews for all seller's products
            const { data: reviews, error: reviewsError } = await supabase!
              .from('reviews')
              .select('rating')
              .in('product_id', productIds);

            if (reviewsError) {
              console.error('❌ Error fetching reviews:', reviewsError);
              return favorite;
            }

            let sellerRating = 0;
            if (reviews && reviews.length > 0) {
              sellerRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
              console.log('✅ Calculated seller rating:', sellerRating, 'from', reviews.length, 'reviews');
            } else {
              console.log('⚠️ No reviews found for seller');
            }

            const updatedFavorite = {
              ...favorite,
              sellerRating: sellerRating,
            };
            
            console.log('✅ Updated favorite:', updatedFavorite);
            return updatedFavorite;
          } catch (err) {
            console.error('Error fetching seller rating and sold count:', err);
            return favorite;
          }
        })
      );

      console.log('📊 All favorites with ratings:', favoritesWithRatings);
      setFavorites(favoritesWithRatings || []);
      
      // Load product ratings
      const productIds = (data || []).map((fav: any) => fav.product_id).filter((id: number) => id);
      if (productIds.length > 0) {
        await loadProductRatings(productIds);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      showError('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: number) => {
    try {
      if (!supabase) {
        showError('Error', 'Database connection not available');
        return;
      }

      const { error } = await supabase
        .from('product_favorites')
        .delete()
        .eq('favorite_id', favoriteId);

      if (error) {
        console.error('Error removing favorite:', error);
        showError('Error', 'Failed to remove favorite');
        return;
      }

      showSuccess('Removed', 'Item removed from favorites');
      loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      showError('Error', 'An unexpected error occurred');
    }
  };

  const handleAddToCart = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    
    if (!user) {
      showError('Login Required', 'Please log in to add items to cart');
      navigate('/landing');
      return;
    }

    if (!product?.product_id) {
      showError('Error', 'Invalid product');
      return;
    }

    // Check if product is available
    if (product.listing_type === 'FOR_SALE' && product.quantity === 0) {
      showError('Not Available', 'This item is sold out');
      return;
    }

    const success = await addToCart(product.product_id, 1);
    
    if (success) {
      showSuccess('Added to Cart', `${product.product_name} has been added to your cart`);
    } else {
      showError('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  const handleBuyNow = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    
    if (!user) {
      showError('Login Required', 'Please log in to purchase');
      navigate('/landing');
      return;
    }

    if (!product?.product_id) {
      showError('Error', 'Invalid product');
      return;
    }

    // Check if product is available
    if (product.listing_type === 'FOR_SALE' && product.quantity === 0) {
      showError('Not Available', 'This item is sold out');
      return;
    }

    // Prepare checkout item matching the CheckoutPage interface
    const checkoutItem = {
      cart_id: 0, // Direct checkout doesn't have cart_id
      product_id: product.product_id,
      quantity: 1,
      product: {
        product_id: product.product_id,
        product_name: product.product_name,
        description: product.description,
        price: product.price,
        listing_type: product.listing_type,
        user_id: product.user_id || product.seller?.user_id || '',
        category_id: product.category_id || 0,
        pickup_location: product.pickup_location,
        meetup_location: product.meetup_location,
        images: product.images
      }
    };

    // Navigate to checkout with the product data
    navigate('/checkout', { 
      state: { 
        items: [checkoutItem],
        isDirectCheckout: true
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#208756' }} />
          <p style={{ color: '#666666' }}>Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 mt-6" style={{ color: '#208756' }}>My Favorites</h1>
          <p className="text-gray-500 text-lg">
            {favorites.length === 0 
              ? 'Start saving items you love' 
              : `${favorites.length} ${favorites.length === 1 ? 'item' : 'items'} saved`}
          </p>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center">
            <div className="max-w-sm mx-auto">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0f8f5' }}>
                  <svg className="w-12 h-12" style={{ color: '#208756' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#1a1a1a' }}>No favorites yet</h3>
              <p className="text-gray-500 mb-8">Discover amazing products and save your favorites</p>
              <button
                onClick={() => navigate('/browse')}
                className="px-8 py-3.5 text-white rounded-lg font-semibold text-base transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2"
                style={{ backgroundColor: '#208756' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Products
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favorites.map((favorite) => (
              <div 
                key={favorite.favorite_id}
                onClick={() => navigate(`/product/${favorite.product_id}`)}
                className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 border-gray-200 hover:border-[#208756]"
              >
                {/* Product Image */}
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  <div className="absolute inset-0">
                    <ImageCarousel 
                      images={favorite.product?.images as any || []}
                      productName={favorite.product?.product_name || ''}
                      className="h-full w-full"
                    />
                  </div>

                  {/* Image Counter - Top Right */}
                  {favorite.product?.images && favorite.product.images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-green-600 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1 border border-green-400 border-opacity-50">
                      <span className="text-xs font-bold text-white">+{favorite.product.images.length - 1}</span>
                    </div>
                  )}

                  {/* Sold Out Badge */}
                  {favorite.product?.quantity === 0 && favorite.product?.listing_type === 'FOR_SALE' && (
                    <div className="absolute top-2 right-10 px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                      SOLD OUT
                    </div>
                  )}

                  {/* Remove from Favorites Heart Button - Top Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(favorite.favorite_id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full transition-all"
                    style={{ backgroundColor: '#208756' }}
                    title="Remove from favorites"
                  >
                    <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-3">
                  {/* Product Name */}
                  <h3 className="text-sm mt-5 font-medium text-gray-900 line-clamp-2 mb-1" style={{ minHeight: '40px' }}>
                    {favorite.product?.product_name}
                  </h3>

                  {/* Product Description */}
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                    {favorite.product?.description}
                  </p>

                  {/* Price & Listing Type Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-lg font-bold" style={{ color: '#208756' }}>
                      {formatPrice(favorite.product?.price || 0)}
                    </p>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
                      favorite.product?.listing_type === 'FOR_SALE' 
                        ? 'bg-[#208756]' 
                        : favorite.product?.listing_type === 'FOR_RENT'
                        ? 'bg-blue-600'
                        : 'bg-purple-600'
                    }`}>
                      {favorite.product?.listing_type === 'FOR_SALE' ? 'For Sale' : favorite.product?.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <div className="flex-shrink-0">
                      {favorite.product?.seller?.profile_picture_url ? (
                        <img
                          src={favorite.product.seller.profile_picture_url}
                          alt={favorite.product.seller.username}
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
                        {favorite.product?.seller?.first_name} {favorite.product?.seller?.last_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {favorite.product?.seller?.phone_number && (
                          <Phone className="w-3 h-3 text-gray-400" />
                        )}
                        <p className="text-xs text-gray-500 truncate">
                          {favorite.product?.seller?.phone_number || favorite.product?.seller?.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seller Rating */}
                  <div className="flex items-center space-x-1 mt-3 mb-2">
                    <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    {(favorite.product?.seller?.average_seller_rating ?? 0) > 0 && (favorite.product?.seller?.total_reviews_received ?? 0) > 0 ? (
                      <>
                        <span className="text-xs font-medium text-gray-700">
                          {(favorite.product?.seller?.average_seller_rating || 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({favorite.product?.seller?.total_reviews_received || 0})
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No ratings ({favorite.product?.seller?.total_reviews_received || 0})</span>
                    )}
                  </div>

                  {/* Product Rating */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {favorite.product && productRatings[favorite.product.product_id] && productRatings[favorite.product.product_id].count > 0 && productRatings[favorite.product.product_id].avgRating > 0 ? (
                        <>
                          <span className="font-medium text-gray-900">{productRatings[favorite.product.product_id].avgRating.toFixed(1)}</span>
                          <span className="text-gray-500">({productRatings[favorite.product.product_id].count})</span>
                        </>
                      ) : (
                        <span className="text-gray-400">No Reviews ({favorite.product && productRatings[favorite.product.product_id]?.count || 0})</span>
                      )}
                    </div>
                    {/* Sold Count Badge */}
                    {(favorite.product?.sold_count ?? 0) > 0 && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                        </svg>
                        <span className="font-medium text-green-600">{favorite.product?.sold_count} sold</span>
                      </div>
                    )}
                  </div>

                  {/* Location Info - Only for FOR_SALE */}
                  {favorite.product?.listing_type === 'FOR_SALE' && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <div className="flex items-center space-x-1 flex-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0" />
                        <p className="truncate">{favorite.product.pickup_location || 'N/A'}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span className="text-green-600 font-bold">{favorite.product.sold_count || 0}</span> sold
                      </div>
                    </div>
                  )}

                  {/* Quantity Available - Only for FOR_SALE */}
                  {favorite.product?.listing_type === 'FOR_SALE' && (
                    <div className="text-xs text-gray-500 mb-2">
                      Quantity Available: {favorite.product.quantity || 0}
                    </div>
                  )}

                  {/* Pickup Location for FOR_RENT */}
                  {favorite.product?.listing_type === 'FOR_RENT' && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0" />
                      <p className="truncate">{favorite.product.pickup_location || 'N/A'}</p>
                    </div>
                  )}

                  {/* Rental Duration for FOR_RENT */}
                  {favorite.product?.listing_type === 'FOR_RENT' && (
                    <div className="text-xs text-gray-500 mb-2">
                      Rent Duration: {favorite.product.rent_duration || 'N/A'}
                    </div>
                  )}

                  {/* Meetup Location for SERVICE */}
                  {favorite.product?.listing_type === 'SERVICE' && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0" />
                      <p className="truncate">{favorite.product.meetup_location || 'N/A'}</p>
                    </div>
                  )}

                  {/* Service Schedule for SERVICE */}
                  {favorite.product?.listing_type === 'SERVICE' && (
                    <div className="text-xs text-gray-500 mb-2">
                      Schedule: {favorite.product.service_schedule || 'N/A'}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100 mt-3">
                    <button
                      onClick={(e) => handleAddToCart(e, favorite.product)}
                      className="flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1.5"
                      style={{
                        borderColor: '#208756',
                        color: '#208756',
                        backgroundColor: 'white',
                        border: '2px solid #208756'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f8f5';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Add to Cart
                    </button>
                    <button
                      onClick={(e) => handleBuyNow(e, favorite.product)}
                      className="flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all"
                      style={{
                        backgroundColor: '#208756',
                        color: 'white'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#1a6d46';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#208756';
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FavoritesPage;
