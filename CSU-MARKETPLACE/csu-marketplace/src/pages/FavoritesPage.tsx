import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router';
import ImageCarousel from '../components/ImageCarousel';


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
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderColor: '#208756' }}></div>
          <p className="text-lg text-gray-700 font-medium">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#208756' }}>My Favorites</h1>
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
                className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 group"
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
                  
                  {/* Listing Type Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold text-white ${
                    favorite.product?.listing_type === 'FOR_SALE' 
                      ? 'bg-green-600' 
                      : favorite.product?.listing_type === 'FOR_RENT'
                      ? 'bg-blue-500'
                      : 'bg-purple-600'
                  }`}>
                    {favorite.product?.listing_type === 'FOR_SALE' ? 'FOR SALE' : favorite.product?.listing_type === 'FOR_RENT' ? 'FOR RENT' : 'SERVICE'}
                  </div>

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
                <div className="p-4 mt-4">
                  {/* Product Name */}
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 min-h-[3rem] group-hover:text-green-700 transition-colors">
                    {favorite.product?.product_name}
                  </h3>

                  {/* Price */}
                  <div className="mb-3">
                    <p className="text-2xl font-bold" style={{ color: '#208756' }}>
                      {formatPrice(favorite.product?.price || 0)}
                    </p>
                  </div>

                  {/* Seller Info */}
                  <div className="pb-3 mb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      {favorite.product?.seller?.profile_picture_url ? (
                        <img
                          src={favorite.product.seller.profile_picture_url}
                          alt={favorite.product.seller.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0f8f5' }}>
                          <svg className="w-4 h-4" style={{ color: '#208756' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate font-medium">
                          {favorite.product?.seller?.username || 'Unknown'}
                        </p>
                        {/* Seller Rating */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          {(favorite.product?.seller?.average_seller_rating ?? 0) > 0 && (favorite.product?.seller?.total_reviews_received ?? 0) > 0 ? (
                            <span className="text-xs text-gray-600">
                              {(favorite.product?.seller?.average_seller_rating || 0).toFixed(1)} ({favorite.product?.seller?.total_reviews_received || 0})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No ratings ({favorite.product?.seller?.total_reviews_received || 0})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Stats */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {favorite.product && productRatings[favorite.product.product_id] && productRatings[favorite.product.product_id].count > 0 ? (
                        <span className="text-xs text-gray-600">
                          {productRatings[favorite.product.product_id].avgRating.toFixed(1)} ({productRatings[favorite.product.product_id].count})
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No Reviews ({favorite.product && productRatings[favorite.product.product_id]?.count || 0})</span>
                      )}
                    </div>
                    {(favorite.product?.sold_count ?? 0) > 0 && (
                      <span className="text-xs font-medium" style={{ color: '#208756' }}>
                        {favorite.product?.sold_count} sold
                      </span>
                    )}
                  </div>

                  {/* Location & Details */}
                  {favorite.product?.listing_type === 'FOR_SALE' && favorite.product.pickup_location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="truncate">{favorite.product.pickup_location}</p>
                    </div>
                  )}

                  {favorite.product?.listing_type === 'FOR_RENT' && (
                    <div className="space-y-2 mb-3">
                      {favorite.product.pickup_location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="truncate">{favorite.product.pickup_location}</p>
                        </div>
                      )}
                      {favorite.product.rent_duration && (
                        <p className="text-xs text-gray-500">Duration: {favorite.product.rent_duration}</p>
                      )}
                    </div>
                  )}

                  {favorite.product?.listing_type === 'SERVICE' && (
                    <div className="space-y-2 mb-3">
                      {favorite.product.meetup_location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="truncate">{favorite.product.meetup_location}</p>
                        </div>
                      )}
                      {favorite.product.service_schedule && (
                        <p className="text-xs text-gray-500">Schedule: {favorite.product.service_schedule}</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
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
    </div>
  );
};

export default FavoritesPage;
