import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { productService, type Product } from '../services/productService';
import ImageCarousel from '../components/ImageCarousel';
import { supabase } from '../lib/supabase';

const MyListingsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'My Listings - CSU Marketplace';
  }, []);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showWarning, showSuccess, showError } = useModal();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [productRatings, setProductRatings] = useState<{[key: number]: {avgRating: number, count: number}}>({}); 
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [deleting, setDeleting] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Load data
  useEffect(() => {
    loadMyProducts();
  }, []);

  // Filter products based on search query
  useEffect(() => {
    setCurrentPage(1);
    // Update URL search params
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  }, [searchQuery, setSearchParams]);

  const loadMyProducts = async () => {
    try {
      if (!user) return;

      const result = await productService.getProductsBySeller(user.id);
      
      if (result.success && result.data) {
        setProducts(result.data);
        // Fetch ratings for all products
        await loadProductRatings(result.data.map(p => p.product_id));
      } else {
        showError('Error', result.error || 'Failed to load your products');
      }
    } catch (error) {
      console.error('Exception loading products:', error);
    }
  };

  const loadProductRatings = async (productIds: number[]) => {
    try {
      if (!supabase || productIds.length === 0) return;
      
      console.log('⭐ Fetching ratings for products:', productIds.length);
      
      const { data, error } = await supabase
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', productIds);
      
      if (error) {
        console.error('❌ Error fetching ratings:', error);
        return;
      }
      
      // Calculate average rating and count for each product
      const ratingsMap: {[key: number]: {avgRating: number, count: number}} = {};
      
      (data || []).forEach((review: any) => {
        if (!ratingsMap[review.product_id]) {
          ratingsMap[review.product_id] = { avgRating: 0, count: 0 };
        }
        ratingsMap[review.product_id].avgRating += review.rating;
        ratingsMap[review.product_id].count += 1;
      });
      
      // Calculate averages
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

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      product.product_name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category?.category_name.toLowerCase().includes(query)
    );
  });

  const handleDeleteProduct = async (productId: number, title: string) => {
    if (!user) return;

    showWarning(
      'Delete Product',
      `Are you sure you want to delete "${title}"?`,
      async () => {
        setDeleting(productId);
        try {
          const result = await productService.deleteProduct(productId, user.id);
          
          if (result.success) {
            showSuccess('Deleted', 'Product deleted successfully!');
            setProducts(prev => prev.filter(p => p.product_id !== productId));
          } else {
            showError('Failed', result.error || 'Failed to delete product');
          }
        } catch (error: any) {
          showError('Error', 'An error occurred');
        } finally {
          setDeleting(null);
        }
      }
    );
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/edit-listing/${product.product_id}`);
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="shadow-md" style={{ backgroundColor: '#208756' }}>
        <div className="container mx-auto px-6 lg:px-12 py-8">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Title */}
            <div className="flex-shrink-0">
              <h1 className="text-4xl font-bold text-white mb-2">My Products</h1>
              <p className="text-green-100">Organize and manage your inventory</p>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your products"
                  className="flex-1 px-6 py-4 text-sm focus:outline-none"
                />
                <button className="px-8 py-4 text-white font-medium transition-colors" style={{ backgroundColor: '#1fac68ff' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1f8d58ff'}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: Add Product Button */}
            <button
              onClick={() => navigate('/create-listing')}
              className="text-white px-8 py-4 rounded-lg font-bold shadow-lg transition-all duration-300 flex items-center space-x-3 hover:shadow-2xl hover:scale-105 active:scale-95 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: '#1fac68ff' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1f8d58ff'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-base font-bold">Add Product</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 py-8">
        {/* Empty State */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Listings Yet</h3>
            <p className="text-gray-600 mb-6">Start selling by creating your first listing</p>
            <button
              onClick={() => navigate('/create-listing')}
              className="px-6 py-2 text-white font-medium rounded transition-colors"
              style={{ backgroundColor: '#208756' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
            >
              Create First Listing
            </button>
          </div>
        ) : (
          <>
            {/* Filtered Products Count */}
            {searchQuery && (
              <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700">
                  Showing <span className="font-bold">{filteredProducts.length}</span> result{filteredProducts.length !== 1 ? 's' : ''} for "<span className="font-semibold">{searchQuery}</span>"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#208756' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#1a6d46'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#208756'}
                >
                  Clear search
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product) => (
              <div 
                key={product.product_id}
                onClick={() => navigate(`/product/${product.product_id}`)}
                className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
              >
                {/* Product Image */}
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  <div className="absolute inset-0">
                    <ImageCarousel 
                      images={product.images}
                      productName={product.product_name}
                      className="h-full w-full"
                    />
                  </div>
                  
                  {/* Listing Type Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold text-white ${
                    product.listing_type === 'FOR_SALE' 
                      ? 'bg-green-600' 
                      : product.listing_type === 'FOR_RENT'
                      ? 'bg-blue-500'
                      : 'bg-purple-600'
                  }`}>
                    {product.listing_type === 'FOR_SALE' ? 'FOR SALE' : product.listing_type === 'FOR_RENT' ? 'FOR RENT' : 'SERVICE'}
                  </div>

                  {/* Status Badge - Only for approved/pending/rejected */}
                  {product.status !== 'APPROVED' && (
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white ${
                      product.status === 'PENDING' 
                        ? 'bg-yellow-500' 
                        : 'bg-red-600'
                    }`}>
                      {product.status}
                    </div>
                  )}

                  {/* Sold Out Badge */}
                  {product.quantity === 0 && product.listing_type === 'FOR_SALE' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                      SOLD OUT
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3">
                  {/* Product Name */}
                  <h3 className="text-sm mt-5 font-medium text-gray-900 line-clamp-2 mb-1" style={{ minHeight: '40px' }}>
                    {product.product_name}
                  </h3>

                  {/* Product Description */}
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                    {product.description}
                  </p>

                  {/* Price */}
                  <div className="mb-2">
                    <p className="text-lg font-bold" style={{ color: '#208756' }}>
                      {formatPrice(product.price)}
                    </p>
                  </div>

                  {/* Seller Info */}
                  <div className="pb-2 border-t border-gray-100 pt-2">
                    <div className="flex items-center space-x-2">
                      {product.seller?.profile_picture ? (
                        <img
                          src={product.seller.profile_picture}
                          alt={product.seller.username}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 truncate font-medium">
                          {product.seller?.username || 'Unknown'}
                        </p>
                      </div>
                      {product.seller?.phone_number && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <p className="text-xs text-gray-500 truncate">
                            {product.seller.phone_number}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                
                  {/* Seller Rating */}
                  <div className="flex items-center space-x-1 mt-0.5 mb-2">
                    <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    {(product.seller?.average_seller_rating ?? 0) > 0 && (product.seller?.total_reviews_received ?? 0) > 0 ? (
                      <>
                        <span className="text-xs font-medium text-gray-700">
                          {(product.seller?.average_seller_rating || 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({product.seller?.total_reviews_received || 0})
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No ratings ({product.seller?.total_reviews_received || 0})</span>
                    )}
                  </div>

                  {/* Rating */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        {productRatings[product.product_id] && productRatings[product.product_id].count > 0 && productRatings[product.product_id].avgRating > 0 ? (
                          <>
                            <span className="font-medium text-gray-900">{productRatings[product.product_id].avgRating.toFixed(1)}</span>
                            <span className="text-gray-500">({productRatings[product.product_id].count})</span>
                          </>
                        ) : (
                          <span className="text-gray-400">No Reviews ({productRatings[product.product_id]?.count || 0})</span>
                        )}
                      </div>
                      {/* Sold Count Badge */}
                      {(product.sold_count ?? 0) > 0 && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                          </svg>
                          <span className="font-medium text-green-600">{product.sold_count} sold</span>
                        </div>
                      )}
                    </div>

                  {/* Location Info & Sold Count - Only for FOR_SALE */}
                  {product.listing_type === 'FOR_SALE' && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      {/* Pickup Location */}
                      <div className="flex items-center space-x-1 flex-1 min-w-0">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="truncate">{product.pickup_location || 'N/A'}</p>
                      </div>
                      {/* Sold Count */}
                      <div className="flex-shrink-0 ml-2">
                        <span className="text-green-600 font-bold">{product.sold_count || 0}</span> sold
                      </div>
                    </div>
                  )}

                  {/* Quantity Available - Only for FOR_SALE */}
                  {product.listing_type === 'FOR_SALE' && (
                    <div className="text-xs text-gray-500 mt-2">
                      Quantity Available: {product.quantity || 0}
                    </div>
                  )}

                  {/* Pickup Location for FOR_RENT */}
                  {product.listing_type === 'FOR_RENT' && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="truncate">{product.pickup_location || 'N/A'}</p>
                    </div>
                  )}

                  {/* Rental Duration for FOR_RENT */}
                  {product.listing_type === 'FOR_RENT' && (
                    <div className="text-xs text-gray-500 mb-2">
                      Rent Duration: {product.rent_duration || 'N/A'}
                    </div>
                  )}

                  {/* Meetup Location for SERVICE */}
                  {product.listing_type === 'SERVICE' && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="truncate">{product.meetup_location || 'N/A'}</p>
                    </div>
                  )}

                  {/* Service Schedule for SERVICE */}
                  {product.listing_type === 'SERVICE' && (
                    <div className="text-xs text-gray-500 mb-2">
                      Schedule: {product.service_schedule || 'N/A'}
                    </div>
                  )}

                  {/* Action Buttons - Always visible */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="flex-1 text-white px-3 py-2 rounded text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                      style={{ backgroundColor: '#208756' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.product_id, product.product_name);
                      }}
                      disabled={deleting === product.product_id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyListingsPage;
