import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { useCart } from '../context/CartContext';
import { productService, type Product } from '../services/productService';
import { supabase } from '../lib/supabase';
import ImageCarousel from '../components/ImageCarousel';
import { Star, Package, X } from 'lucide-react';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    document.title = 'Product Details - CSU Marketplace';
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showError, showSuccess } = useModal();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [activeRatingFilter, setActiveRatingFilter] = useState<'All' | '5' | '4' | '3' | '2' | '1'>('All');
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const reviewsPerPage = 5;

  // Review state from navigation
  const reviewState = location.state as any;

  useEffect(() => {
    if (id) {
      loadProductDetails();
      checkIfFavorite();
    }
  }, [id, user]);

  useEffect(() => {
    // Show review modal if navigated from MyOrdersPage
    if (reviewState?.showReviewModal) {
      setShowReviewModal(true);
    }
  }, [reviewState]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      const result = await productService.getProductById(Number(id));

      if (result.success && result.data) {
        console.log('✅ Product loaded:', result.data.product_name);
        console.log('📷 Product images:', result.data.images);
        setProduct(result.data);
        await loadSellerInfo(result.data.user_id);
        await loadProductReviews(result.data.product_id);
      } else {
        console.error('❌ Failed to load product:', result.error);
        showError('Error', result.error || 'Failed to load product details');
        navigate('/browse');
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
      showError('Error', 'An unexpected error occurred');
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  const loadSellerInfo = async (sellerId: string) => {
    try {
      if (!supabase) return;

      console.log('🔍 Looking for seller with ID:', sellerId, 'Type:', typeof sellerId);

      // Get seller profile and stats - using user_id instead of id
      const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('username, first_name, last_name, department, created_at, profile_picture_url')
        .eq('user_id', sellerId)
        .single();

      if (sellerError) {
        console.error('❌ Error loading seller info:', sellerError);
        return;
      }

      console.log('✅ Seller loaded:', sellerData.first_name, sellerData.last_name);
      console.log('🖼️ Seller profile pic:', sellerData.profile_picture_url);

      // Get seller ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', sellerId);

      let avgRating = 0;
      let reviewCount = 0;
      if (!ratingsError && ratingsData && ratingsData.length > 0) {
        const totalRating = ratingsData.reduce((sum, review) => sum + review.rating, 0);
        avgRating = totalRating / ratingsData.length;
        reviewCount = ratingsData.length;
      }

      // Get total products posted by seller
      const { data: productsData } = await supabase
        .from('products')
        .select('product_id', { count: 'exact' })
        .eq('user_id', sellerId)
        .eq('status', 'APPROVED');

      const totalProducts = productsData?.length || 0;

      setSellerInfo({
        ...sellerData,
        avgRating,
        reviewCount,
        totalProducts
      });
    } catch (error) {
      console.error('Exception loading seller info:', error);
    }
  };

  const loadProductReviews = async (productId: number) => {
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:users!reviews_reviewer_id_fkey(username, first_name, last_name, profile_picture_url)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading reviews:', error);
        return;
      }

      console.log('✅ Reviews loaded:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🖼️ First reviewer profile pic:', data[0].reviewer?.profile_picture_url);
        console.log('📷 Review images:', data[0].review_images);
      }
      setProductReviews(data || []);
    } catch (error) {
      console.error('❌ Exception loading reviews:', error);
    }
  };

  const checkIfFavorite = async () => {
    if (!user || !id || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('product_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', Number(id))
        .single();

      if (!error && data) {
        setIsFavorite(true);
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      showError('Login Required', 'Please log in to add items to favorites');
      return;
    }

    if (!product || !supabase) return;

    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('product_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.product_id);
        setIsFavorite(false);
        showSuccess('Removed', `${product.product_name} removed from favorites`);
      } else {
        // Add to favorites
        await supabase
          .from('product_favorites')
          .insert({
            user_id: user.id,
            product_id: product.product_id,
            created_at: new Date().toISOString()
          });
        setIsFavorite(true);
        showSuccess('Added', `${product.product_name} added to favorites`);
      }
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update favorites');
    }
  };

  const handleAddToCart = async () => {
    if (!product || !user) {
      showError('Login Required', 'Please log in to add items to cart');
      return;
    }

    try {
      await addToCart(product.product_id, quantity);
      showSuccess('Added to Cart', `${quantity} ${product.product_name} added to your cart!`);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to add to cart');
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!user) {
      showError('Login Required', 'Please log in to purchase this product');
      return;
    }

    // Format product data as CheckoutItem for direct checkout
    const checkoutItem = {
      cart_id: 0, // Temporary cart_id for direct purchase
      product_id: product.product_id,
      quantity: product.listing_type === 'FOR_SALE' ? quantity : 1,
      product: {
        product_id: product.product_id,
        product_name: product.product_name,
        description: product.description,
        price: product.price,
        listing_type: product.listing_type,
        user_id: product.user_id,
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

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    if (fileArray.length + reviewImages.length > 5) {
      showError('Too Many Images', 'You can upload up to 5 images only');
      return;
    }

    setReviewImages([...reviewImages, ...fileArray]);

    // Generate previews
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(reviewImages.filter((_, i) => i !== index));
    setReviewImagePreviews(reviewImagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!user || !reviewState) return;

    // Validation
    if (reviewRating === 0) {
      showError('Rating Required', 'Please select a rating (1-5 stars)');
      return;
    }

    if (!reviewText.trim()) {
      showError('Review Required', 'Please write a review');
      return;
    }

    setSubmittingReview(true);
    try {
      if (!supabase) {
        showError('Error', 'Database connection not available');
        return;
      }

      console.log('📝 Submitting review:', {
        transaction_id: reviewState.transactionId,
        reviewer_id: user.id,
        seller_id: reviewState.sellerId,
        product_id: product?.product_id,
        rating: reviewRating,
        review_text: reviewText,
        images_count: reviewImages.length
      });

      // Upload review images to Supabase Storage if any
      let uploadedImageUrls: string[] = [];
      if (reviewImages.length > 0) {
        console.log('📤 Uploading', reviewImages.length, 'review images...');
        
        for (let i = 0; i < reviewImages.length; i++) {
          const file = reviewImages[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${i}.${fileExt}`;
          const filePath = `review-images/${user.id}/${fileName}`;

          try {
            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('❌ Error uploading image', i + 1, ':', uploadError);
              continue;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);

            uploadedImageUrls.push(publicUrl);
            console.log('✅ Uploaded image', i + 1, ':', publicUrl);
          } catch (err) {
            console.error('❌ Exception uploading image', i + 1, ':', err);
          }
        }

        console.log('✅ Total images uploaded:', uploadedImageUrls.length);
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          transaction_id: reviewState.transactionId,
          reviewer_id: user.id,
          seller_id: reviewState.sellerId,
          product_id: product?.product_id,
          rating: reviewRating,
          review_text: reviewText,
          review_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting review:', error);
        if (error.message.includes('duplicate')) {
          showError('Already Reviewed', 'You have already reviewed this transaction');
        } else if (error.message.includes('not a buyer')) {
          showError('Not Authorized', 'Only buyers can review completed transactions');
        } else {
          showError('Error', error.message || 'Failed to submit review');
        }
        return;
      }

      console.log('✅ Review submitted successfully:', data);
      showSuccess('Review Submitted', 'Thank you for your feedback!');
      
      // Reset form and close modal
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewText('');
      setReviewImages([]);
      setReviewImagePreviews([]);
      
      // Reload reviews to show the new one
      if (product) {
        await loadProductReviews(product.product_id);
      }
    } catch (error: any) {
      console.error('❌ Exception submitting review:', error);
      showError('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(
          <svg key={i} className={`${sizeClasses[size]} text-yellow-400 fill-current`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        stars.push(
          <svg key={i} className={`${sizeClasses[size]} text-yellow-400`} viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`half-star-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path fill={`url(#half-star-${i})`} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      } else {
        stars.push(
          <svg key={i} className={`${sizeClasses[size]} text-gray-300 fill-current`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  // Filter and paginate reviews
  const filteredReviews = productReviews.filter(review => 
    activeRatingFilter === 'All' || review.rating === parseInt(activeRatingFilter)
  );
  
  const totalReviewPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentReviewPage - 1) * reviewsPerPage,
    currentReviewPage * reviewsPerPage
  );

  // Calculate rating stats
  const getRatingStats = () => {
    if (productReviews.length === 0) return { avgRating: 0, total: 0, breakdown: {}, percentages: {} };
    
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / productReviews.length;
    
    const breakdown: any = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach(r => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });
    
    const percentages: any = {};
    Object.keys(breakdown).forEach(star => {
      percentages[star] = ((breakdown[star] / productReviews.length) * 100).toFixed(0);
    });
    
    return { avgRating, total: productReviews.length, breakdown, percentages };
  };

  const ratingStats = getRatingStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Product not found</p>
          <button
            onClick={() => navigate('/browse')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  const isOwnProduct = user?.id === product.user_id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 lg:px-12 py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            Home
          </button>
          <span className="text-gray-400">&gt;</span>
          <button onClick={() => navigate('/browse')} className="text-gray-500 hover:text-gray-700">
            Browse
          </button>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-900 font-bold">{product.product_name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Image Gallery */}
            <div>
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200" style={{ height: '450px' }}>
                {(() => {
                  console.log('🖼️ Product images check:', {
                    hasImages: !!product.images,
                    imageCount: product.images?.length || 0,
                    firstImage: product.images?.[0],
                    allImages: product.images
                  });
                  return product.images && product.images.length > 0 ? (
                    <ImageCarousel
                      images={product.images}
                      productName={product.product_name}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100">
                      <Package className="w-24 h-24 text-gray-300" />
                      <span className="text-gray-500 mt-2">No images available</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right - Product Details */}
            <div className="space-y-4">
              {/* Product Title */}
              <h1 className="text-2xl text-gray-900 leading-snug font-bold">
                {product.product_name}
              </h1>

              {/* Rating & Sales Row */}
              <div className="flex items-center gap-6 text-sm border-b pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500 underline font-medium">{ratingStats.avgRating.toFixed(1)}</span>
                  {renderStars(ratingStats.avgRating, 'sm')}
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-900">{ratingStats.total}</span>
                  <span className="text-gray-600">Ratings</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-900">{product.sold_count || 0}</span>
                  <span className="text-gray-600">Sold</span>
                </div>
              </div>

              {/* PRICE - NEW LINE */}
              <div className="bg-gray-50 px-5 py-4 rounded-lg">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold" style={{ color: '#208756' }}>
                    ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Product Info - Vertical Layout */}
              <div className="space-y-3 text-sm">
                {/* Type */}
                <div>
                  <span className="text-gray-600 font-medium">Type: </span>
                  <span className="font-bold" style={{ color: '#208756' }}>
                    {product.listing_type === 'FOR_SALE' ? 'FOR SALE' : 
                     product.listing_type === 'FOR_RENT' ? 'FOR RENT' : 'SERVICE'}
                  </span>
                </div>

                {/* Location */}
                {product.pickup_location && (
                  <div>
                    <span className="text-gray-600 font-medium">Location: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.pickup_location}</span>
                  </div>
                )}

                {/* Return Condition - For Rental Items */}
                {product.listing_type === 'FOR_RENT' && product.return_condition && (
                  <div>
                    <span className="text-gray-600 font-medium">Return Condition: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.return_condition}</span>
                  </div>
                )}

                {/* Rent Duration - For Rental Items */}
                {product.listing_type === 'FOR_RENT' && product.rent_duration && (
                  <div>
                    <span className="text-gray-600 font-medium">Rent Duration: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.rent_duration}</span>
                  </div>
                )}

                {/* Condition - Display for sale items */}
                {product.listing_type === 'FOR_SALE' && product.condition && (
                  <div>
                    <span className="text-gray-600 font-medium">Condition: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.condition}</span>
                  </div>
                )}

                {/* Quantity - For Sale Items */}
                {product.listing_type === 'FOR_SALE' && product.quantity && (
                  <div>
                    <span className="text-gray-600 font-medium">Available Stock: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.quantity} available</span>
                  </div>
                )}

                {/* Service Schedule - For Service Items */}
                {product.listing_type === 'SERVICE' && product.service_schedule && (
                  <div>
                    <span className="text-gray-600 font-medium">Schedule: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.service_schedule}</span>
                  </div>
                )}

                {/* Service Duration - For Service Items */}
                {product.listing_type === 'SERVICE' && product.service_duration && (
                  <div>
                    <span className="text-gray-600 font-medium">Duration: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.service_duration}</span>
                  </div>
                )}

                {/* Meetup Location - For Service Items */}
                {product.listing_type === 'SERVICE' && product.meetup_location && (
                  <div>
                    <span className="text-gray-600 font-medium">Meetup Location: </span>
                    <span className="font-bold" style={{ color: '#208756' }}>{product.meetup_location}</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector (for FOR_SALE) */}
              {!isOwnProduct && product.listing_type === 'FOR_SALE' && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-gray-600 font-medium">Select Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 hover:bg-gray-100 text-gray-600"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.quantity || 99, parseInt(e.target.value) || 1)))}
                      className="w-14 text-center border-x border-gray-300 py-1 text-sm"
                      min="1"
                      max={product.quantity || 99}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.quantity || 99, quantity + 1))}
                      className="px-3 py-1 hover:bg-gray-100 text-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Favorites Button */}
              {!isOwnProduct && (
                <div className="pt-2">
                  <button
                    onClick={handleToggleFavorite}
                    className="h-9 rounded-lg border-2 flex items-center justify-center transition-all duration-300 gap-2 px-4"
                    style={{
                      borderColor: '#208756',
                      backgroundColor: isFavorite ? '#208756' : 'white'
                    }}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ color: isFavorite ? 'white' : '#208756' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span style={{ color: isFavorite ? 'white' : '#208756' }} className="font-semibold text-xs">
                      {isFavorite ? 'Added to Favorites' : 'Add to Favorites'}
                    </span>
                  </button>
                </div>
              )}

              {/* Action Buttons - Add to Cart & Buy Now */}
              {!isOwnProduct && (
                <div className="flex items-center gap-3 pt-2">
                  {product.listing_type === 'FOR_SALE' ? (
                    <>
                      {/* Add to Cart Button */}
                      <button
                        onClick={handleAddToCart}
                        className="flex-1 px-6 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2 border-2"
                        style={{
                          backgroundColor: 'white',
                          borderColor: '#208756',
                          color: '#208756'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#208756';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#208756';
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </button>

                      {/* Buy Now Button */}
                      <button
                        onClick={handleBuyNow}
                        className="flex-1 px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg border-2"
                        style={{
                          backgroundColor: '#208756',
                          borderColor: '#208756',
                          color: 'white'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#208756';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#208756';
                          e.currentTarget.style.color = 'white';
                        }}
                      >
                        Buy Now
                      </button>
                    </>
                  ) : product.listing_type === 'FOR_RENT' ? (
                    <button
                      onClick={handleBuyNow}
                      className="w-full px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg border-2"
                      style={{
                        backgroundColor: '#208756',
                        borderColor: '#208756',
                        color: 'white'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#208756';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#208756';
                        e.currentTarget.style.color = 'white';
                      }}
                    >
                      Rent Now
                    </button>
                  ) : product.listing_type === 'SERVICE' ? (
                    <button
                      onClick={handleBuyNow}
                      className="w-full px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg border-2"
                      style={{
                        backgroundColor: '#208756',
                        borderColor: '#208756',
                        color: 'white'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#208756';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#208756';
                        e.currentTarget.style.color = 'white';
                      }}
                    >
                      Get Service Now
                    </button>
                  ) : (
                    <button
                      onClick={handleBuyNow}
                      className="w-full px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                      style={{ backgroundColor: '#208756' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
                    >
                      Contact Seller
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seller Information Section */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-6">
            <div className="flex items-center gap-4">
              {/* Seller Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden border-4" style={{ backgroundColor: '#208756', borderColor: '#ff9500' }}>
                {sellerInfo?.profile_picture_url ? (
                  <img 
                    src={sellerInfo.profile_picture_url}
                    alt={`${sellerInfo?.first_name} ${sellerInfo?.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = `${sellerInfo?.first_name?.charAt(0)}${sellerInfo?.last_name?.charAt(0)}`;
                      }
                    }}
                  />
                ) : (
                  <>{sellerInfo?.first_name?.charAt(0)}{sellerInfo?.last_name?.charAt(0)}</>
                )}
              </div>
              
              {/* Seller Details */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {sellerInfo?.first_name} {sellerInfo?.last_name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {sellerInfo?.department || 'Student'}
                </p>
                
                {/* Seller Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {/* Joined Date */}
                  {sellerInfo?.created_at && (
                    <div>
                      <span className="text-gray-600 font-medium">Joined: </span>
                      <span className="text-gray-900">{new Date(sellerInfo.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 font-medium">Rating: </span>
                    {sellerInfo && (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-orange-500 font-medium">{sellerInfo.avgRating.toFixed(1)}</span>
                        {renderStars(sellerInfo.avgRating, 'sm')}
                      </span>
                    )}
                  </div>
                  
                  {/* Total Products */}
                  {sellerInfo?.totalProducts !== undefined && (
                    <div>
                      <span className="text-gray-600 font-medium">Products: </span>
                      <span className="text-gray-900">{sellerInfo.totalProducts}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Specifications or Service Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {product.listing_type === 'SERVICE' ? 'Service Information' : 'Product Specifications'}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex">
              <span className="text-gray-600 w-40">Category</span>
              <span className="text-gray-900">{product.category?.category_name || 'N/A'}</span>
            </div>
            
            {/* Stock - Hide for SERVICE listings */}
            {product.listing_type !== 'SERVICE' && (
              <div className="flex">
                <span className="text-gray-600 w-40">Stock</span>
                <span className="text-gray-900">{product.quantity || 'N/A'} available</span>
              </div>
            )}
            
            <div className="flex">
              <span className="text-gray-600 w-40">Occasion</span>
              <span className="text-gray-900">
                {product.listing_type === 'FOR_SALE' ? 'Daily Use' : 
                 product.listing_type === 'FOR_RENT' ? 'Rental' : 'Service'}
              </span>
            </div>
            
            {/* SERVICE Section */}
            {product.listing_type === 'SERVICE' && (
              <>
                {product.service_schedule && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Service Schedule</span>
                    <span className="text-gray-900">{product.service_schedule}</span>
                  </div>
                )}
                {product.service_duration && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Service Duration</span>
                    <span className="text-gray-900">{product.service_duration}</span>
                  </div>
                )}
                {product.meetup_location && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Meetup Location</span>
                    <span className="text-gray-900">{product.meetup_location}</span>
                  </div>
                )}
              </>
            )}
            
            {/* Non-SERVICE Sections */}
            {product.listing_type !== 'SERVICE' && (
              <>
                {product.pickup_location && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Pickup From</span>
                    <span className="text-gray-900">{product.pickup_location}</span>
                  </div>
                )}
                {product.listing_type === 'FOR_RENT' && product.rent_duration && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Rental Duration</span>
                    <span className="text-gray-900">{product.rent_duration}</span>
                  </div>
                )}
                {product.condition && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Condition</span>
                    <span className="text-gray-900">{product.condition}</span>
                  </div>
                )}
                {product.listing_type === 'FOR_RENT' && product.return_condition && (
                  <div className="flex">
                    <span className="text-gray-600 w-40">Return Condition</span>
                    <span className="text-gray-900">{product.return_condition}</span>
                  </div>
                )}
              </>
            )}
            
            {product.requirements && (
              <div className="flex">
                <span className="text-gray-600 w-40">Requirements</span>
                <span className="text-gray-900">{product.requirements}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Description or Service Description */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {product.listing_type === 'SERVICE' ? 'Service Description' : 'Product Description'}
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>

        {/* Product Ratings Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Product Ratings & Reviews</h2>
          </div>
          
          {/* Rating Summary */}
          <div className="flex items-center gap-8 pb-6 mb-6" style={{ borderBottom: '2px solid #f3f4f6' }}>
            <div className="text-center px-6 py-4 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0' }}>
              <div className="text-5xl font-bold mb-2" style={{ color: '#208756' }}>
                {ratingStats.avgRating > 0 ? ratingStats.avgRating.toFixed(1) : '0.0'}
              </div>
              <div className="flex items-center justify-center mb-2">
                {renderStars(ratingStats.avgRating, 'md')}
              </div>
              <div className="text-sm font-medium text-gray-600">
                {ratingStats.total} {ratingStats.total === 1 ? 'review' : 'reviews'}
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingStats.breakdown[star] || 0;
                const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveRatingFilter(star.toString() as any);
                        setCurrentReviewPage(1);
                      }}
                      className="text-sm font-medium min-w-[70px] transition-colors"
                      style={{ color: activeRatingFilter === star.toString() ? '#208756' : '#6b7280' }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#208756'}
                      onMouseOut={(e) => activeRatingFilter !== star.toString() && (e.currentTarget.style.color = '#6b7280')}
                    >
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        {star}
                      </span>
                    </button>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: star >= 4 ? '#22c55e' : star === 3 ? '#eab308' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 min-w-[50px] text-right">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
            {['All', '5', '4', '3', '2', '1'].map((filter) => {
              const isActive = activeRatingFilter === filter;
              const count = filter === 'All' ? ratingStats.total : (ratingStats.breakdown[filter] || 0);
              return (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveRatingFilter(filter as any);
                    setCurrentReviewPage(1);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2"
                  style={isActive ? {
                    backgroundColor: '#208756',
                    borderColor: '#208756',
                    color: 'white'
                  } : {
                    backgroundColor: 'white',
                    borderColor: '#e5e7eb',
                    color: '#374151'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#208756';
                      e.currentTarget.style.color = '#208756';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                >
                  {filter === 'All' ? `All (${count})` : `${filter}★ (${count})`}
                </button>
              );
            })}
          </div>

          {/* Reviews List */}
          {paginatedReviews.length > 0 ? (
            <div className="space-y-4">
              {paginatedReviews.map((review) => (
                <div key={review.review_id} className="bg-white rounded-xl p-5 transition-all hover:shadow-md" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: '#208756' }}>
                      {review.reviewer?.profile_picture_url ? (
                        <img 
                          src={review.reviewer.profile_picture_url}
                          alt={`${review.reviewer?.first_name} ${review.reviewer?.last_name}`}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <>{review.reviewer?.first_name?.charAt(0)}{review.reviewer?.last_name?.charAt(0)}</>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-base">
                            {review.reviewer?.first_name} {review.reviewer?.last_name}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating, 'sm')}
                            </div>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                              Verified Purchase
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {review.review_text && (
                        <p className="text-gray-700 text-sm leading-relaxed mb-3">{review.review_text}</p>
                      )}
                      
                      {review.review_images && review.review_images.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                          {review.review_images.map((img: string, idx: number) => (
                            <img 
                              key={idx} 
                              src={img} 
                              alt={`Review ${idx + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border-2 cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                              style={{ borderColor: '#e5e7eb' }}
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                      )}
                      
                      {review.response && (
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#f0fdf4', borderLeft: '3px solid #22c55e' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4" style={{ color: '#22c55e' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold" style={{ color: '#166534' }}>Seller Response</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{review.response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                <svg className="w-10 h-10" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-600 mb-6">Be the first to share your experience with this product!</p>
              <button
                onClick={() => navigate('/my-orders')}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-md"
                style={{ backgroundColor: '#208756' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
              >
                View My Orders to Write Review
              </button>
              <p className="text-xs text-gray-500 mt-3">Complete a transaction first to leave a review</p>
            </div>
          )}

          {/* Pagination */}
          {filteredReviews.length > reviewsPerPage && (
            <div className="flex items-center justify-center gap-3 mt-6 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setCurrentReviewPage(prev => Math.max(1, prev - 1))}
                disabled={currentReviewPage === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2"
                style={currentReviewPage === 1 ? {
                  borderColor: '#e5e7eb',
                  color: '#9ca3af'
                } : {
                  borderColor: '#208756',
                  color: '#208756'
                }}
                onMouseOver={(e) => {
                  if (currentReviewPage !== 1) {
                    e.currentTarget.style.backgroundColor = '#208756';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentReviewPage !== 1) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#208756';
                  }
                }}
              >
                ← Previous
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Page</span>
                <span className="px-3 py-1 rounded-lg font-semibold text-sm" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                  {currentReviewPage}
                </span>
                <span className="text-sm text-gray-600">of {totalReviewPages}</span>
              </div>
              <button
                onClick={() => setCurrentReviewPage(prev => Math.min(totalReviewPages, prev + 1))}
                disabled={currentReviewPage === totalReviewPages}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2"
                style={currentReviewPage === totalReviewPages ? {
                  borderColor: '#e5e7eb',
                  color: '#9ca3af'
                } : {
                  borderColor: '#208756',
                  color: '#208756'
                }}
                onMouseOver={(e) => {
                  if (currentReviewPage !== totalReviewPages) {
                    e.currentTarget.style.backgroundColor = '#208756';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentReviewPage !== totalReviewPages) {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#208756';
                  }
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

      {/* Review Modal */}
      {showReviewModal && reviewState && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewRating(0);
                  setReviewText('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Reviewing</p>
                <p className="font-semibold text-gray-900">{reviewState.productName}</p>
                <p className="text-sm text-gray-600 mt-1">Seller: {reviewState.sellerName}</p>
              </div>

              {/* Rating Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                      type="button"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewRating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {reviewRating} {reviewRating === 1 ? 'star' : 'stars'}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reviewText"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  placeholder="Share your experience with this product and seller..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reviewText.length}/1000 characters
                </p>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Photos (Optional)
                </label>
                <div className="space-y-3">
                  {/* Image Previews */}
                  {reviewImagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {reviewImagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                          />
                          <button
                            onClick={() => removeReviewImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  {reviewImages.length < 5 && (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB ({5 - reviewImages.length} remaining)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleReviewImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || reviewRating === 0 || !reviewText.trim()}
                className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#208756' }}
                onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1a6d46')}
                onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#208756')}
              >
                {submittingReview ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Review'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ProductDetails;
