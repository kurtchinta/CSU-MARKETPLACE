import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { productService, type Product, type Category } from '../services/productService';
import { useModal } from '../context/ModalContext';
import ImageCarousel from '../components/ImageCarousel';
import { supabase } from '../lib/supabase';

const BrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showModal } = useModal();
  
  // State - Load directly from Supabase, no localStorage caching
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productRatings, setProductRatings] = useState<{[key: number]: {avgRating: number, count: number}}>({}); 
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedListingTypes, setSelectedListingTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
  const [minRating, setMinRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<string>('relevance');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Set page title
  useEffect(() => {
    document.title = 'Browse Products - CSU Marketplace';
  }, []);

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedCategory, selectedListingTypes, priceRange, minRating, searchQuery, sortBy]);

  // Update URL search params when searchQuery changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  }, [searchQuery, setSearchParams]);

  const loadCategories = async () => {
    try {
      console.log('📂 BrowsePage: Loading categories from Supabase...');
      const result = await productService.getCategories();
      
      if (result.success && result.data) {
        setCategories(result.data);
        console.log('✅ BrowsePage: Categories loaded:', result.data.length);
      } else {
        console.error('❌ BrowsePage: Failed to load categories:', result.error);
        showModal('Error', result.error || 'Failed to load categories');
      }
    } catch (error) {
      console.error('❌ BrowsePage: Exception loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      console.log('📦 BrowsePage: Loading products with filters...', {
        category: selectedCategory,
        listingTypes: selectedListingTypes,
        priceRange,
        minRating,
        searchQuery
      });

      const filters: any = {
        status: 'APPROVED' // Only show approved products (uppercase to match database constraint)
      };
      
      if (selectedCategory) {
        filters.category_id = selectedCategory;
      }
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const result = await productService.getProducts(filters);
      
      if (result.success && result.data) {
        let filteredProducts = result.data;
        
        // Client-side filtering for listing types (multiple selection)
        if (selectedListingTypes.length > 0) {
          filteredProducts = filteredProducts.filter(p => 
            selectedListingTypes.includes(p.listing_type)
          );
        }
        
        // Client-side filtering for price range
        filteredProducts = filteredProducts.filter(p => 
          p.price >= priceRange.min && p.price <= priceRange.max
        );
        
        // Client-side filtering for minimum rating
        if (minRating > 0) {
          filteredProducts = filteredProducts.filter(p => 
            (p.seller?.average_seller_rating || 0) >= minRating
          );
        }
        
        // Apply sorting
        if (sortBy === 'latest') {
          filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortBy === 'top_sales') {
          filteredProducts.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        } else if (sortBy === 'price_low') {
          filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price_high') {
          filteredProducts.sort((a, b) => b.price - a.price);
        }
        
        setProducts(filteredProducts);
        console.log('✅ BrowsePage: Products loaded and filtered:', filteredProducts.length);
        
        // Fetch ratings for all products
        await loadProductRatings(filteredProducts.map(p => p.product_id));
      } else {
        console.error('❌ BrowsePage: Failed to load products:', result.error);
        showModal('Error', result.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('❌ BrowsePage: Exception loading products:', error);
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

  // Format price
  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Handle price range change
  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    setPriceRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Navigate to product details
  const navigateToProductDetails = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedListingTypes([]);
    setPriceRange({ min: 0, max: 100000 });
    setMinRating(0);
    setSearchQuery('');
    setSearchParams({});
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar Section */}
      <div className="shadow-md" style={{ backgroundColor: '#208756' }}>
        <div className="container mx-auto px-6 lg:px-12 py-6">
          {/* Search Bar */}
          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, rent products and look for offered services"
                className="flex-1 px-6 py-4 text-base focus:outline-none"
              />
              <button className="px-8 py-4 text-white font-medium transition-colors" style={{ backgroundColor: '#1fac68ff' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1f8d58ff'}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 py-6">
        {/* Compact Horizontal Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort By Label */}
            <span className="text-xs text-gray-600 font-medium">Sort by</span>
            
            {/* Sort Options - Compact */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('relevance')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  sortBy === 'relevance'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={sortBy === 'relevance' ? { backgroundColor: '#208756' } : {}}
              >
                Relevance
              </button>
              <button
                onClick={() => setSortBy('latest')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  sortBy === 'latest'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={sortBy === 'latest' ? { backgroundColor: '#208756' } : {}}
              >
                Latest
              </button>
              <button
                onClick={() => setSortBy('top_sales')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  sortBy === 'top_sales'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={sortBy === 'top_sales' ? { backgroundColor: '#208756' } : {}}
              >
                Top Sales
              </button>
            </div>

            <span className="text-gray-300">|</span>
            
            {/* Listing Type Buttons - Compact */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedListingTypes([])}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedListingTypes.length === 0
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedListingTypes.length === 0 ? { backgroundColor: '#208756' } : {}}
              >
                All
              </button>
              <button
                onClick={() => setSelectedListingTypes(['FOR_SALE'])}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedListingTypes.includes('FOR_SALE') && selectedListingTypes.length === 1
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedListingTypes.includes('FOR_SALE') && selectedListingTypes.length === 1 ? { backgroundColor: '#208756' } : {}}
              >
                For Sale
              </button>
              <button
                onClick={() => setSelectedListingTypes(['FOR_RENT'])}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedListingTypes.includes('FOR_RENT') && selectedListingTypes.length === 1
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedListingTypes.includes('FOR_RENT') && selectedListingTypes.length === 1 ? { backgroundColor: '#208756' } : {}}
              >
                For Rent
              </button>
              <button
                onClick={() => setSelectedListingTypes(['SERVICE'])}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedListingTypes.includes('SERVICE') && selectedListingTypes.length === 1
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedListingTypes.includes('SERVICE') && selectedListingTypes.length === 1 ? { backgroundColor: '#208756' } : {}}
              >
                Service
              </button>
            </div>

            <span className="text-gray-300">|</span>

            {/* Category Dropdown - Compact */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>

            {/* Price Dropdown - Compact */}
            <div className="relative group">
              <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1.5">
                Price Range
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 hidden group-hover:block z-10">
                <div className="space-y-1">
                  <button
                    onClick={() => setPriceRange({ min: 0, max: 100000 })}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-green-50 rounded"
                  >
                    All Prices
                  </button>
                  <button
                    onClick={() => setPriceRange({ min: 0, max: 500 })}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-green-50 rounded"
                  >
                    Under ₱500
                  </button>
                  <button
                    onClick={() => setPriceRange({ min: 500, max: 2000 })}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-green-50 rounded"
                  >
                    ₱500 - ₱2,000
                  </button>
                  <button
                    onClick={() => setPriceRange({ min: 2000, max: 5000 })}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-green-50 rounded"
                  >
                    ₱2,000 - ₱5,000
                  </button>
                  <button
                    onClick={() => setPriceRange({ min: 5000, max: 100000 })}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-green-50 rounded"
                  >
                    Over ₱5,000
                  </button>
                  <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating Filter - Compact */}
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500"
            >
              <option value="0">All Ratings</option>
              <option value="4">⭐ 4 & Up</option>
              <option value="3">⭐ 3 & Up</option>
              <option value="2">⭐ 2 & Up</option>
              <option value="1">⭐ 1 & Up</option>
            </select>

            {/* Clear Filters */}
            {(selectedCategory || selectedListingTypes.length > 0 || minRating > 0 || priceRange.min > 0 || priceRange.max < 100000) && (
              <button
                onClick={clearAllFilters}
                className="ml-auto text-xs font-medium flex items-center gap-1"
                style={{ color: '#208756' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#1a6d46'}
                onMouseOut={(e) => e.currentTarget.style.color = '#208756'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All
              </button>
            )}
          </div>

          {/* Results Count - Compact */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-900">{products.length}</span> {products.length === 1 ? 'product' : 'products'} found
              {selectedCategory && ` in ${categories.find(c => c.category_id === selectedCategory)?.category_name}`}
            </p>
          </div>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
              {/* Filters Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-800 uppercase">Filters</h2>
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium"
                  style={{ color: '#208756' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#1a6d46'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#208756'}
                >
                  Clear All
                </button>
              </div>
              
              {/* Listing Type Checkboxes */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Listing Type</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedListingTypes.includes('FOR_SALE')}
                      onChange={() => {
                        setSelectedListingTypes(prev => 
                          prev.includes('FOR_SALE') 
                            ? prev.filter(t => t !== 'FOR_SALE')
                            : [...prev, 'FOR_SALE']
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 focus:ring-green-500"
                      style={{ accentColor: '#208756' }}
                    />
                    <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">For Sale</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedListingTypes.includes('FOR_RENT')}
                      onChange={() => {
                        setSelectedListingTypes(prev => 
                          prev.includes('FOR_RENT') 
                            ? prev.filter(t => t !== 'FOR_RENT')
                            : [...prev, 'FOR_RENT']
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 focus:ring-green-500"
                      style={{ accentColor: '#208756' }}
                    />
                    <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">For Rent</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedListingTypes.includes('SERVICE')}
                      onChange={() => {
                        setSelectedListingTypes(prev => 
                          prev.includes('SERVICE') 
                            ? prev.filter(t => t !== 'SERVICE')
                            : [...prev, 'SERVICE']
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 focus:ring-green-500"
                      style={{ accentColor: '#208756' }}
                    />
                    <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">Service</span>
                  </label>
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Price Range</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Min</label>
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:ring-1 focus:ring-green-100"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Max</label>
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:ring-1 focus:ring-green-100"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{formatPrice(priceRange.min)}</span>
                    <span>—</span>
                    <span>{formatPrice(priceRange.max)}</span>
                  </div>
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Minimum Rating</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1, 0].map((rating) => (
                    <label key={rating} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="w-4 h-4 border-gray-300 focus:ring-green-500"
                        style={{ accentColor: '#208756' }}
                      />
                      <div className="ml-2 flex items-center">
                        {rating > 0 ? (
                          <>
                            <div className="flex">
                              {Array.from({ length: rating }).map((_, i) => (
                                <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-700 ml-1">& Up</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-700">All Ratings</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Filters Summary */}
              {(selectedCategory || selectedListingTypes.length > 0 || minRating > 0 || priceRange.min > 0 || priceRange.max < 100000) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Active Filters</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedCategory && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#e8f5e9', color: '#1a6d46' }}>
                        {categories.find(c => c.category_id === selectedCategory)?.category_name}
                        <button onClick={() => setSelectedCategory(null)} className="ml-1" style={{ color: '#1a6d46' }} onMouseOver={(e) => e.currentTarget.style.color = '#0f4d2e'} onMouseOut={(e) => e.currentTarget.style.color = '#1a6d46'}>×</button>
                      </span>
                    )}
                    {selectedListingTypes.map(type => (
                      <span key={type} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#e8f5e9', color: '#1a6d46' }}>
                        {type.replace('_', ' ')}
                        <button onClick={() => setSelectedListingTypes(prev => prev.filter(t => t !== type))} className="ml-1" style={{ color: '#1a6d46' }} onMouseOver={(e) => e.currentTarget.style.color = '#0f4d2e'} onMouseOut={(e) => e.currentTarget.style.color = '#1a6d46'}>×</button>
                      </span>
                    ))}
                    {minRating > 0 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#e8f5e9', color: '#1a6d46' }}>
                        {minRating}+ Stars
                        <button onClick={() => setMinRating(0)} className="ml-1" style={{ color: '#1a6d46' }} onMouseOver={(e) => e.currentTarget.style.color = '#0f4d2e'} onMouseOut={(e) => e.currentTarget.style.color = '#1a6d46'}>×</button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Pagination - Top */}
            {products.length > 0 && (
              <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#208756' }}
                    onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1a6d46')}
                    onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#208756')}
                  >
                    &lt;
                  </button>
                  <div className="px-4 py-2 text-sm">
                  <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{Math.ceil(products.length / itemsPerPage)}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(products.length / itemsPerPage), prev + 1))}
                    disabled={currentPage >= Math.ceil(products.length / itemsPerPage)}
                    className="w-8 h-8 flex items-center justify-center text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#208756' }}
                    onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1a6d46')}
                    onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#208756')}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
            
            {/* Products Grid */}
          {products.length === 0 ? (
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product) => (
                <div 
                  key={product.product_id} 
                  onClick={() => navigateToProductDetails(product.product_id)}
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
                  </div>                    {/* Rating */}
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

                    {/* Pickup Location for Rental Products */}
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

                    {/* Service Schedule & Meetup Location for SERVICE */}
                    {product.listing_type === 'SERVICE' && (
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="truncate">{product.meetup_location || 'N/A'}</p>
                        </div>
                        <div className="text-xs text-gray-500 mb-2 mt-2">
                          Schedule: {product.service_schedule || 'N/A'}
                        </div>
                      </div>
                    )}

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
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination - Bottom */}
          {products.length > 0 && (
            <div className="flex flex-col items-center mt-6 gap-2">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-semibold">{Math.min(currentPage * itemsPerPage, products.length)}</span> of <span className="font-semibold">{products.length}</span> products
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
      
    {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-6 lg:px-12 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* About Section */}
            <div>
              <h3 className="text-lg font-bold mb-3">CSU Marketplace</h3>
              <p className="text-sm text-gray-300">
                Your trusted platform for buying, selling, and renting within the CSU community.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/browse" className="hover:text-white transition-colors">Browse Products</a></li>
                <li><a href="/create-listing" className="hover:text-white transition-colors">Create Listing</a></li>
                <li><a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="/profile" className="hover:text-white transition-colors">My Profile</a></li>
              </ul>
            </div>
            
            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold mb-3">Contact Us</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Caraga State University</li>
                <li>Butuan City, Philippines</li>
              </ul>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-700 pt-6 text-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} CSU Marketplace. All rights reserved. | Powered by Blockchain Technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BrowsePage;