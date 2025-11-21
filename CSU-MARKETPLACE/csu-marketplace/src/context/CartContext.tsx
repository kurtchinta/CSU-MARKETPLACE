import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { cartService, type CartItem, type CartSummary } from '../services/cartService';

// Debounce delay for cart refresh operations (ms)
const CART_REFRESH_DEBOUNCE_DELAY = 300;

interface CartContextType {
  cartItems: CartItem[];
  cartSummary: CartSummary | null;
  
  // Actions
  addToCart: (productId: number, quantity?: number) => Promise<boolean>;
  removeFromCart: (cartItemId: number) => Promise<boolean>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
  isInCart: (productId: number) => boolean;
  
  // UI state
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for debouncing and preventing duplicate operations
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);

  // Load cart when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      console.log('🛒 User logged in, loading cart...');
      refreshCart();
    } else {
      // Clear cart when user logs out
      setCartItems([]);
      setCartSummary(null);
    }
  }, [isLoggedIn, user?.id]); // Changed to user?.id to prevent unnecessary reruns

  // Refresh cart data - debounced to prevent excessive API calls
  const refreshCart = async () => {
    if (!user || isRefreshingRef.current) {
      console.log('🛒 Cart refresh skipped - user not logged in or already refreshing');
      return;
    }

    // Debounce - don't refresh if we just refreshed
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 500) {
      console.log('🛒 Cart refresh debounced - refreshed too recently');
      return;
    }

    lastRefreshTimeRef.current = now;
    isRefreshingRef.current = true;
    setIsLoading(true);

    console.log('🛒 Refreshing cart data for user:', user.id);

    try {
      const summaryResult = await cartService.getCartSummary(user.id);
      
      if (summaryResult.success && summaryResult.data) {
        setCartItems(summaryResult.data.items);
        setCartSummary(summaryResult.data);
        console.log('✅ Cart refreshed successfully:', {
          items: summaryResult.data.total_items,
          amount: summaryResult.data.total_amount
        });
      } else {
        console.error('❌ Failed to refresh cart:', summaryResult.error);
        setCartItems([]);
        setCartSummary(null);
      }
    } catch (error: any) {
      console.error('❌ Exception refreshing cart:', error);
      setCartItems([]);
      setCartSummary(null);
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  };

  // Debounced refresh - cancels previous pending refresh and schedules new one
  const debouncedRefresh = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setTimeout(() => {
      refreshCart();
    }, CART_REFRESH_DEBOUNCE_DELAY);
  };

  // Add item to cart
  const addToCart = async (productId: number, quantity: number = 1): Promise<boolean> => {
    if (!user) {
      console.error('❌ Cannot add to cart: user not logged in');
      return false;
    }

    console.log('🛒 Adding to cart:', { productId, quantity });

    try {
      const result = await cartService.addToCart(user.id, { product_id: productId, quantity });
      
      if (result.success) {
        console.log('✅ Item added to cart, refreshing...');
        debouncedRefresh(); // Use debounced refresh to allow batching
        return true;
      } else {
        console.error('❌ Failed to add to cart:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Exception adding to cart:', error);
      return false;
    }
  };

  // Remove item from cart
  const removeFromCart = async (cartItemId: number): Promise<boolean> => {
    if (!user) {
      console.error('❌ Cannot remove from cart: user not logged in');
      return false;
    }

    console.log('🛒 Removing from cart:', cartItemId);

    // Optimistic update - update UI immediately for better UX
    const previousItems = cartItems;
    const previousSummary = cartSummary;
    
    const updatedItems = previousItems.filter(item => item.cart_id !== cartItemId);
    
    // Recalculate summary
    const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
    
    setCartItems(updatedItems);
    setCartSummary({
      items: updatedItems,
      total_items: totalItems,
      total_amount: totalAmount
    });

    try {
      // Update in background
      const result = await cartService.removeFromCart(user.id, cartItemId);
      
      if (!result.success) {
        console.error('❌ Failed to remove from cart:', result.error);
        // Revert on failure
        setCartItems(previousItems);
        setCartSummary(previousSummary);
        return false;
      }
      
      console.log('✅ Item removed from cart');
      return true;
    } catch (error) {
      console.error('❌ Exception removing from cart:', error);
      // Revert on error
      setCartItems(previousItems);
      setCartSummary(previousSummary);
      return false;
    }
  };

  // Update item quantity
  const updateQuantity = async (cartItemId: number, quantity: number): Promise<boolean> => {
    if (!user) {
      console.error('❌ Cannot update cart: user not logged in');
      return false;
    }

    console.log('🛒 Updating cart quantity:', { cartItemId, quantity });

    // Optimistic update - update UI immediately
    const previousItems = cartItems;
    const previousSummary = cartSummary;
    
    const updatedItems = cartItems.map(item => 
      item.cart_id === cartItemId ? { ...item, quantity } : item
    );
    
    // Recalculate summary
    const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
    
    setCartItems(updatedItems);
    setCartSummary({
      items: updatedItems,
      total_items: totalItems,
      total_amount: totalAmount
    });

    try {
      // Update in background
      const result = await cartService.updateCartItemQuantity(user.id, cartItemId, quantity);
      
      if (!result.success) {
        console.error('❌ Failed to update cart quantity:', result.error);
        // Revert on failure
        setCartItems(previousItems);
        setCartSummary(previousSummary);
        return false;
      }
      
      console.log('✅ Cart quantity updated');
      return true;
    } catch (error) {
      console.error('❌ Exception updating cart quantity:', error);
      // Revert on error
      setCartItems(previousItems);
      setCartSummary(previousSummary);
      return false;
    }
  };

  // Clear entire cart
  const clearCart = async (): Promise<boolean> => {
    if (!user) {
      console.error('❌ Cannot clear cart: user not logged in');
      return false;
    }

    console.log('🛒 Clearing cart...');

    try {
      const result = await cartService.clearCart(user.id);
      
      if (result.success) {
        setCartItems([]);
        setCartSummary({ total_items: 0, total_amount: 0, items: [] });
        console.log('✅ Cart cleared successfully');
        return true;
      } else {
        console.error('❌ Failed to clear cart:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Exception clearing cart:', error);
      return false;
    }
  };

  // Check if product is in cart
  const isInCart = (productId: number): boolean => {
    return cartItems.some(item => item.product?.product_id === productId);
  };

  const contextValue: CartContextType = {
    cartItems,
    cartSummary,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart,
    isInCart,
    cartOpen,
    setCartOpen,
    isLoading
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
