import { supabase } from '../lib/supabase';

// Types for product data based on database schema
export interface Product {
  product_id: number;
  user_id: string;
  category_id: number;
  product_name: string;
  description: string;
  price: number;
  quantity: number;
  listing_type: 'FOR_SALE' | 'FOR_RENT' | 'SERVICE';
  condition?: string;
  rent_duration?: string;
  return_condition?: string;
  service_schedule?: string;
  service_duration?: string;
  requirements?: string;
  meetup_location?: string;
  pickup_location?: string;
  contact_information?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  view_count?: number;
  favorite_count?: number;
  sold_count?: number;
  // Joined data (from admin queries)
  user?: {
    username: string;
    first_name: string;
    last_name: string;
    department: string;
    phone_number: string;
    profile_picture?: string;
  };
  seller?: {
    username: string;
    first_name: string;
    last_name: string;
    department: string;
    phone_number: string;
    profile_picture?: string;
    average_seller_rating?: number;
    total_reviews_received?: number;
  };
  category?: {
    category_id: number;
    category_name: string;
  };
  images?: {
    image_id: number;
    storage_path: string;
    image_order: number;
  }[];
  product_images?: {
    image_id: number;
    image_url: string;
    image_order: number;
  }[];
}

export interface Category {
  category_id: number;
  category_name: string;
  created_at: string;
}

export interface CreateProductData {
  title: string;
  description: string;
  price: number;
  category_id: number;
  listing_type: 'FOR_SALE' | 'FOR_RENT' | 'SERVICE';
  quantity?: number;
  condition?: string;
  rent_duration?: string;
  return_condition?: string;
  service_schedule?: string;
  service_duration?: string;
  requirements?: string;
  meetup_location?: string;
  pickup_location?: string;
  contact_information?: string;
}

export interface UpdateProductData {
  title?: string;
  description?: string;
  price?: number;
  category_id?: number;
  listing_type?: 'FOR_SALE' | 'FOR_RENT' | 'SERVICE';
  images?: string[];
  contact_information?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
}

class ProductService {
  // Get all categories
  async getCategories(): Promise<{ success: boolean; data?: Category[]; error?: string }> {
    try {
      console.log('📂 Fetching categories...');
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('category_name');

      if (error) {
        console.error('❌ Error fetching categories:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Categories fetched:', data?.length);
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Exception fetching categories:', error);
      return { success: false, error: error.message };
    }
  }

  // Create new product
  async createProduct(productData: CreateProductData, sellerId: string): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      console.log('📝 Creating product:', productData);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      // Build insert object with all fields
      const insertData: any = {
        user_id: sellerId,
        product_name: productData.title,
        description: productData.description,
        price: productData.price,
        category_id: productData.category_id,
        listing_type: productData.listing_type,
        status: 'PENDING'
      };

      // Add listing-specific fields based on listing type
      if (productData.listing_type === 'FOR_SALE') {
        insertData.quantity = productData.quantity || 1;
        insertData.condition = productData.condition || null;
        insertData.pickup_location = productData.pickup_location || null;
        insertData.requirements = productData.requirements || null;
        insertData.contact_information = productData.contact_information || null;
      } else if (productData.listing_type === 'FOR_RENT') {
        insertData.rent_duration = productData.rent_duration || null;
        insertData.condition = productData.condition || null;
        insertData.return_condition = productData.return_condition || null;
        insertData.pickup_location = productData.pickup_location || null;
        insertData.requirements = productData.requirements || null;
        insertData.contact_information = productData.contact_information || null;
      } else if (productData.listing_type === 'SERVICE') {
        insertData.service_schedule = productData.service_schedule || null;
        insertData.service_duration = productData.service_duration || null;
        insertData.meetup_location = productData.meetup_location || null;
        insertData.requirements = productData.requirements || null;
        insertData.contact_information = productData.contact_information || null;
      }

      const { data, error } = await supabase
        .from('products')
        .insert(insertData)
        .select(`
          *,
          seller:users!products_user_id_fkey(username, first_name, last_name, department, phone_number),
          category:categories(category_id, category_name)
        `)
        .single();

      if (error) {
        console.error('❌ Error creating product:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Product created successfully:', data?.product_id);
      return { success: true, data: data };
    } catch (error: any) {
      console.error('❌ Exception creating product:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all products (with filters)
  async getProducts(filters?: {
    category_id?: number;
    status?: string;
    listing_type?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    min_rating?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    try {
      console.log('📋 Fetching products with filters:', filters);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      // Use optimized search function if search query exists
      if (filters?.search && filters.search.trim() !== '') {
        console.log('🔍 Using optimized full-text search');
        
        const { data, error } = await supabase.rpc('fn_search_products', {
          p_search_query: filters.search.trim(),
          p_category_id: filters.category_id || null,
          p_listing_types: filters.listing_type ? [filters.listing_type] : null,
          p_min_price: filters.min_price || 0,
          p_max_price: filters.max_price || 999999,
          p_min_rating: filters.min_rating || 0,
          p_limit: filters.limit || 50,
          p_offset: filters.offset || 0
        });

        if (error) {
          console.error('❌ Error in optimized search:', error);
          // Fallback to regular query if search function fails
          return this.getProductsFallback(filters);
        }

        // Transform search results to match Product interface
        const products = (data || []).map((item: any) => ({
          product_id: item.product_id,
          user_id: item.seller_id,
          category_id: item.category_id,
          product_name: item.product_name,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          listing_type: item.listing_type,
          status: item.status,
          created_at: item.created_at,
          view_count: item.view_count,
          pickup_location: item.pickup_location,
          meetup_location: item.meetup_location,
          sold_count: item.sold_count || 0,
          seller: {
            username: item.seller_username,
            first_name: item.seller_first_name,
            last_name: item.seller_last_name,
            department: item.seller_department,
            phone_number: '',
            profile_picture: item.seller_profile_picture,
            average_seller_rating: item.seller_average_rating,
            total_reviews_received: item.seller_total_reviews
          },
          category: {
            category_id: item.category_id,
            category_name: item.category_name
          },
          images: item.images || []
        }));

        console.log(`✅ Optimized search returned ${products.length} products`);
        return { success: true, data: products };
      }

      // Regular query without search (for browsing all products)
      return this.getProductsFallback(filters);

    } catch (error: any) {
      console.error('❌ Exception fetching products:', error);
      return { success: false, error: error.message };
    }
  }

  // Fallback method for regular queries without search
  private async getProductsFallback(filters?: {
    category_id?: number;
    status?: string;
    listing_type?: string;
    search?: string;
  }): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    try {
      let query = supabase!
        .from('products')
        .select(`
          *,
          seller:users!products_user_id_fkey(username, first_name, last_name, department, phone_number, profile_picture_url, average_seller_rating, total_reviews_received),
          category:categories(category_id, category_name),
          images:product_images(image_id, storage_path, image_order)
        `);

      // Apply filters
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      
      if (filters?.status) {
        // Ensure uppercase status for database constraint
        const statusUpper = filters.status.toUpperCase();
        query = query.eq('status', statusUpper);
      } else {
        // Default to approved products only for public viewing
        query = query.eq('status', 'APPROVED');
      }
      
      if (filters?.listing_type) {
        query = query.eq('listing_type', filters.listing_type);
      }
      
      // Fallback search using ILIKE (slower but works)
      if (filters?.search) {
        query = query.or(`product_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching products:', error);
        return { success: false, error: error.message };
      }

      // Fetch sold counts for all products
      const productIds = (data || []).map((p: any) => p.product_id);
      let soldCountsMap: { [key: number]: number } = {};
      
      if (productIds.length > 0) {
        const { data: soldData } = await supabase!
          .from('transactions')
          .select('product_id')
          .in('product_id', productIds)
          .eq('transaction_status', 'COMPLETED');
        
        // Count occurrences of each product_id
        if (soldData) {
          soldData.forEach((transaction: any) => {
            soldCountsMap[transaction.product_id] = (soldCountsMap[transaction.product_id] || 0) + 1;
          });
        }
      }

      // Map seller data to include profile_picture and sold_count
      const products = (data || []).map((product: any) => ({
        ...product,
        seller: product.seller ? {
          ...product.seller,
          profile_picture: product.seller.profile_picture_url
        } : undefined,
        sold_count: soldCountsMap[product.product_id] || 0
      }));

      console.log('✅ Products fetched (fallback):', products.length);
      return { success: true, data: products };
    } catch (error: any) {
      console.error('❌ Exception in fallback query:', error);
      return { success: false, error: error.message };
    }
  }

  // Get products by seller (for My Listings)
  async getProductsBySeller(sellerId: string): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    try {
      console.log('👤 Fetching products for seller:', sellerId);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!products_user_id_fkey(username, first_name, last_name, department, phone_number, profile_picture_url),
          category:categories(category_id, category_name),
          images:product_images(image_id, storage_path, image_order)
        `)
        .eq('user_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching seller products:', error);
        return { success: false, error: error.message };
      }

      // Transform data to map profile_picture_url to profile_picture
      const transformedData = (data || []).map((product: any) => ({
        ...product,
        seller: product.seller ? {
          ...product.seller,
          profile_picture: product.seller.profile_picture_url
        } : undefined
      }));

      console.log('✅ Seller products fetched:', data?.length);
      return { success: true, data: transformedData };
    } catch (error: any) {
      console.error('❌ Exception fetching seller products:', error);
      return { success: false, error: error.message };
    }
  }

  // Get single product by ID
  async getProductById(productId: number): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      console.log('🔍 Fetching product:', productId);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!products_user_id_fkey(username, first_name, last_name, department, phone_number),
          category:categories(category_id, category_name),
          images:product_images(image_id, storage_path, image_order)
        `)
        .eq('product_id', productId)
        .single();

      if (error) {
        console.error('❌ Error fetching product:', error);
        return { success: false, error: error.message };
      }

      // Calculate sold count from completed order_details
      const { data: soldData, error: soldError } = await supabase
        .from('order_details')
        .select('buyer_quantity')
        .eq('product_id', productId)
        .eq('order_status', 'completed');

      let soldCount = 0;
      if (!soldError && soldData) {
        soldCount = soldData.reduce((total, item) => total + (item.buyer_quantity || 0), 0);
      }

      console.log('✅ Product fetched:', data?.product_name);
      console.log('📷 Product images from DB:', data?.images);
      console.log('🛒 Sold count:', soldCount);
      
      return { success: true, data: { ...data, sold_count: soldCount } };
    } catch (error: any) {
      console.error('❌ Exception fetching product:', error);
      return { success: false, error: error.message };
    }
  }

  // Update product
  async updateProduct(productId: number, updateData: UpdateProductData, userId: string): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      console.log('🔄 Starting product update for product_id:', productId);
      console.log('📝 Update data received:', updateData);
      console.log('👤 User ID:', userId);
      
      if (!supabase) {
        console.error('❌ Supabase client not available');
        return { success: false, error: 'Database connection not available' };
      }
      
      console.log('✅ Supabase client is available');

      // Verify user owns the product
      console.log('🔍 Verifying product ownership...');
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('user_id, product_name, description, price, category_id, listing_type, contact_information')
        .eq('product_id', productId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching product:', fetchError);
        return { success: false, error: 'Product not found' };
      }

      if (existingProduct.user_id !== userId) {
        console.error('❌ Ownership verification failed - user does not own this product');
        return { success: false, error: 'You can only edit your own products' };
      }

      console.log('✅ Ownership verified');

      // Transform title to product_name for database
      const { title, ...restData } = updateData;
      const dbUpdateData = {
        ...restData,
        ...(title !== undefined && { product_name: title }),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Transformed data for database:', dbUpdateData);
      console.log('🔍 Update keys:', Object.keys(dbUpdateData));

      console.log('📤 Executing UPDATE query...');
      
      const { error: updateError, data: updatedData } = await supabase
        .from('products')
        .update(dbUpdateData)
        .eq('product_id', productId)
        .select();
      
      if (updateError) {
        console.error('❌ Update failed:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        return { success: false, error: updateError.message };
      }

      console.log('📥 Update response:', updatedData);
      console.log('✅ Product updated successfully!');
      return { success: true, data: updatedData?.[0] };
    } catch (error: any) {
      console.error('❌ Exception in updateProduct:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  // Delete product
  async deleteProduct(productId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting product:', productId);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      // First check if user owns the product
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('user_id')
        .eq('product_id', productId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching product for deletion:', fetchError);
        return { success: false, error: 'Product not found' };
      }

      if (existingProduct.user_id !== userId) {
        return { success: false, error: 'You can only delete your own products' };
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId);

      if (error) {
        console.error('❌ Error deleting product:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Product deleted successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception deleting product:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin delete product (bypasses ownership check)
  async adminDeleteProduct(productId: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Admin deleting product:', productId);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId);

      if (error) {
        console.error('❌ Error deleting product:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Product deleted successfully by admin');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception deleting product:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin functions
  async updateProductStatus(productId: number, status: 'approved' | 'rejected' | 'APPROVED' | 'REJECTED'): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 Admin updating product status:', productId, status);
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      // Ensure uppercase status
      const uppercaseStatus = status.toUpperCase();
      
      const { error } = await supabase
        .from('products')
        .update({
          status: uppercaseStatus,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', productId);

      if (error) {
        console.error('❌ Error updating product status:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Product status updated successfully to:', uppercaseStatus);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception updating product status:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all products for admin dashboard
  async getAllProductsForAdmin(): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    try {
      console.log('🛡️ Admin fetching all products...');
      
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:users!products_user_id_fkey(username, first_name, last_name, department, phone_number),
          category:categories(category_id, category_name),
          images:product_images(image_id, storage_path, image_order)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching admin products:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Admin products fetched:', data?.length);
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Exception fetching admin products:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // ADMIN FUNCTIONS FOR PRODUCT MANAGEMENT
  // ============================================================================

  /**
   * Get all pending products (for admin approval)
   */
  async getPendingProducts(): Promise<Product[]> {
    try {
      console.log('📦 Fetching pending products...');

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          user:users (username, first_name, last_name, department, phone_number),
          category:categories (category_id, category_name),
          product_images (image_id, image_url, image_order)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} pending products`);
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching pending products:', error);
      throw new Error(error.message || 'Failed to fetch pending products');
    }
  }

  /**
   * Get all products (for admin overview)
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      console.log('📦 Fetching all products...');

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          user:users (username, first_name, last_name, department, phone_number),
          category:categories (category_id, category_name),
          product_images (image_id, image_url, image_order)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} products`);
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching all products:', error);
      throw new Error(error.message || 'Failed to fetch all products');
    }
  }

  /**
   * Approve a product (admin only)
   */
  async approveProduct(productId: number): Promise<void> {
    try {
      console.log(`✅ Approving product ${productId}...`);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { error } = await supabase
        .from('products')
        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
        .eq('product_id', productId);

      if (error) throw error;

      console.log(`✅ Product ${productId} approved successfully`);
    } catch (error: any) {
      console.error(`❌ Error approving product ${productId}:`, error);
      throw new Error(error.message || 'Failed to approve product');
    }
  }

  /**
   * Reject a product (admin only)
   */
  async rejectProduct(productId: number): Promise<void> {
    try {
      console.log(`❌ Rejecting product ${productId}...`);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { error } = await supabase
        .from('products')
        .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
        .eq('product_id', productId);

      if (error) throw error;

      console.log(`✅ Product ${productId} rejected successfully`);
    } catch (error: any) {
      console.error(`❌ Error rejecting product ${productId}:`, error);
      throw new Error(error.message || 'Failed to reject product');
    }
  }

  // Increment product view count
  async incrementViewCount(productId: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      // Increment the view_count column
      const { error } = await supabase.rpc('increment_product_views', {
        product_id: productId
      });

      if (error) {
        // Fallback: Use direct update if RPC doesn't exist
        console.warn('⚠️ RPC not available, using direct update');
        const { error: updateError } = await supabase
          .from('products')
          .update({ view_count: supabase.raw('view_count + 1') })
          .eq('product_id', productId);

        if (updateError) {
          console.warn('⚠️ Could not increment view count:', updateError);
          return { success: false, error: updateError.message };
        }
      }

      console.log(`📈 View count incremented for product ${productId}`);
      return { success: true };
    } catch (error: any) {
      console.warn('⚠️ Error incrementing view count:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const productService = new ProductService();