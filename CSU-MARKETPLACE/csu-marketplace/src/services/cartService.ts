import { supabase } from '../lib/supabase';

// Types for cart operations
export interface CartItem {
  cart_id: number;
  user_id: string;
  product_id: number;
  quantity: number;
  added_at: string;
  // Joined product information
  product?: {
    product_id: number;
    product_name: string;
    description: string;
    price: number;
    quantity: number; // Stock quantity from seller
    images?: { image_id: number; storage_path: string; image_order: number }[];
    user_id: string;
    category_id: number;
    listing_type: string;
    status: string;
    pickup_location?: string;
    meetup_location?: string;
    seller?: {
      username: string;
      first_name: string;
      last_name: string;
    };
    category?: {
      category_name: string;
    };
  };
}

export interface AddToCartData {
  product_id: number;
  quantity?: number;
}

export interface CartSummary {
  total_items: number;
  total_amount: number;
  items: CartItem[];
}

class CartService {
  // Get user's cart items with product details
  async getCartItems(userId: string): Promise<{ success: boolean; data?: CartItem[]; error?: string }> {
    console.log('🛒 Getting cart items for user:', userId);

    if (!supabase) {
      return { success: false, error: 'Service unavailable' };
    }

    try {
      const { data, error } = await supabase
        .from('cart')
        .select(`
          cart_id,
          user_id,
          product_id,
          quantity,
          added_at,
          product:products!inner (
            product_id,
            product_name,
            description,
            price,
            quantity,
            user_id,
            category_id,
            listing_type,
            status,
            pickup_location,
            meetup_location,
            seller:users!products_user_id_fkey (
              username,
              first_name,
              last_name
            ),
            category:categories (
              category_name
            ),
            images:product_images(image_id, storage_path, image_order)
          )
        `)
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching cart items:', error);
        return { success: false, error: error.message };
      }

      // Filter out products that are not approved - do this after fetching
      const approvedItems = (data as unknown as CartItem[] || []).filter(item => 
        item.product?.status?.toUpperCase() === 'APPROVED'
      );

      console.log('✅ Cart items fetched successfully:', approvedItems?.length || 0, 'of', data?.length || 0);
      return { success: true, data: approvedItems };
    } catch (error: any) {
      console.error('❌ Exception getting cart items:', error);
      return { success: false, error: error.message || 'Failed to get cart items' };
    }
  }

  // Add item to cart
  async addToCart(userId: string, data: AddToCartData): Promise<{ success: boolean; error?: string }> {
    console.log('🛒 Adding item to cart:', { userId, ...data });

    if (!supabase) {
      return { success: false, error: 'Service unavailable' };
    }

    try {
      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from('cart')
        .select('cart_id, quantity')
        .eq('user_id', userId)
        .eq('product_id', data.product_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Error checking existing cart item:', checkError);
        return { success: false, error: checkError.message };
      }

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + (data.quantity || 1);
        const { error: updateError } = await supabase
          .from('cart')
          .update({ quantity: newQuantity })
          .eq('cart_id', existingItem.cart_id);

        if (updateError) {
          console.error('❌ Error updating cart item quantity:', updateError);
          return { success: false, error: updateError.message };
        }

        console.log('✅ Cart item quantity updated');
      } else {
        // Add new item to cart
        const { error: insertError } = await supabase
          .from('cart')
          .insert({
            user_id: userId,
            product_id: data.product_id,
            quantity: data.quantity || 1
          });

        if (insertError) {
          console.error('❌ Error adding item to cart:', insertError);
          return { success: false, error: insertError.message };
        }

        console.log('✅ Item added to cart successfully');
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception adding to cart:', error);
      return { success: false, error: error.message || 'Failed to add item to cart' };
    }
  }

  // Update cart item quantity
  async updateCartItemQuantity(userId: string, cartItemId: number, quantity: number): Promise<{ success: boolean; error?: string }> {
    console.log('🛒 Updating cart item quantity:', { userId, cartItemId, quantity });

    if (!supabase) {
      return { success: false, error: 'Service unavailable' };
    }

    // Validate inputs
    if (!userId || !cartItemId || quantity === undefined || quantity === null) {
      console.error('❌ Invalid parameters for updateCartItemQuantity:', { userId, cartItemId, quantity });
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return this.removeFromCart(userId, cartItemId);
      }

      const { error } = await supabase
        .from('cart')
        .update({ quantity })
        .eq('cart_id', cartItemId)
        .eq('user_id', userId); // Security check

      if (error) {
        console.error('❌ Error updating cart item quantity:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Cart item quantity updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception updating cart item quantity:', error);
      return { success: false, error: error.message || 'Failed to update quantity' };
    }
  }

  // Remove item from cart
  async removeFromCart(userId: string, cartItemId: number): Promise<{ success: boolean; error?: string }> {
    console.log('🛒 Removing item from cart:', { userId, cartItemId });

    if (!supabase) {
      return { success: false, error: 'Service unavailable' };
    }

    // Validate inputs
    if (!userId || !cartItemId) {
      console.error('❌ Invalid parameters for removeFromCart:', { userId, cartItemId });
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('cart_id', cartItemId)
        .eq('user_id', userId); // Security check

      if (error) {
        console.error('❌ Error removing cart item:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Item removed from cart successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception removing cart item:', error);
      return { success: false, error: error.message || 'Failed to remove item from cart' };
    }
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<{ success: boolean; error?: string }> {
    console.log('🛒 Clearing entire cart for user:', userId);

    if (!supabase) {
      return { success: false, error: 'Service unavailable' };
    }

    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error clearing cart:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Cart cleared successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Exception clearing cart:', error);
      return { success: false, error: error.message || 'Failed to clear cart' };
    }
  }

  // Get cart summary (total items and amount)
  async getCartSummary(userId: string): Promise<{ success: boolean; data?: CartSummary; error?: string }> {
    console.log('🛒 Getting cart summary for user:', userId);

    const cartResult = await this.getCartItems(userId);
    
    if (!cartResult.success || !cartResult.data) {
      return { success: false, error: cartResult.error };
    }

    const items = cartResult.data;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    const summary: CartSummary = {
      total_items: totalItems,
      total_amount: totalAmount,
      items
    };

    console.log('✅ Cart summary calculated:', { totalItems, totalAmount });
    return { success: true, data: summary };
  }

  // Check if product is in user's cart
  async isInCart(userId: string, productId: number): Promise<{ success: boolean; data?: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Service unavailable' };
    }

    try {
      const { data, error } = await supabase
        .from('cart')
        .select('cart_id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Error checking cart status:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: !!data };
    } catch (error: any) {
      console.error('❌ Exception checking cart status:', error);
      return { success: false, error: error.message || 'Failed to check cart status' };
    }
  }
}

// Export singleton instance
export const cartService = new CartService();
export default cartService;