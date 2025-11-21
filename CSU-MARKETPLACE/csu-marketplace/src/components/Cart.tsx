import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from '../context/CartContext';
import { useModal } from '../context/ModalContext';
import { storageService } from '../services/storageService';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { 
    cartItems, 
    cartSummary, 
    cartOpen, 
    setCartOpen, 
    removeFromCart, 
    updateQuantity
  } = useCart();
  const { showSuccess, showError } = useModal();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Helper to get image URL from storage path
  const getImageUrl = (storagePath: string): string => {
    return storageService.getPublicUrl(storagePath);
  };

  const handleRemoveItem = async (cartItemId: number, productTitle: string) => {
    if (!cartItemId) {
      showError('Error', 'Invalid cart item. Please refresh and try again.');
      return;
    }
    
    const success = await removeFromCart(cartItemId);
    if (success) {
      showSuccess('Item Removed', `${productTitle} has been removed from your cart.`);
      // Remove from selected items if it was selected
      setSelectedItems(prev => prev.filter(id => id !== cartItemId));
    } else {
      showError('Error', 'Failed to remove item from cart. Please try again.');
    }
  };

  const handleUpdateQuantity = async (cartItemId: number, newQuantity: number, maxQuantity?: number) => {
    if (!cartItemId) {
      showError('Error', 'Invalid cart item. Please refresh and try again.');
      return;
    }
    
    if (newQuantity < 1) {
      showError('Invalid Quantity', 'Quantity must be at least 1.');
      return;
    }
    
    if (maxQuantity && newQuantity > maxQuantity) {
      showError('Insufficient Stock', `Only ${maxQuantity} items available in stock.`);
      return;
    }
    
    const success = await updateQuantity(cartItemId, newQuantity);
    if (!success) {
      showError('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0 && cartItems.length > 0) {
      showError('No Items Selected', 'Please select at least one item to checkout');
      return;
    }
    
    const itemsToCheckout = selectedItems.length > 0 
      ? cartItems.filter(item => selectedItems.includes(item.cart_id))
      : cartItems;
    
    // Navigate to checkout page (to be implemented)
    setCartOpen(false);
    navigate('/checkout', { state: { items: itemsToCheckout } });
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map(item => item.cart_id));
    }
  };

  const toggleSelectItem = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const calculateSelectedTotal = () => {
    if (selectedItems.length === 0) return cartSummary?.total_amount || 0;
    
    return cartItems
      .filter(item => selectedItems.includes(item.cart_id))
      .reduce((total, item) => total + ((item.product?.price || 0) * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return `₱${price.toFixed(2)}`;
  };

  if (!cartOpen) return null;

  const selectedTotal = calculateSelectedTotal();
  const selectedCount = selectedItems.length > 0 ? selectedItems.length : cartItems.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={() => setCartOpen(false)}
      />
      
      {/* Cart drawer - Full width table view */}
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-white">
            <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
            <button
              onClick={() => setCartOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart content */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg className="w-32 h-32 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-orange-500 mb-2">Your shopping cart is empty</h3>
                  <p className="text-gray-500 mb-6">Browse our products and add items to your cart</p>
                  <button 
                    onClick={() => setCartOpen(false)}
                    className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-lg"
                  >
                    Go Shop Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === cartItems.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unit Price</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Price</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cartItems.map((item) => (
                        <tr key={item.cart_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.cart_id)}
                              onChange={() => toggleSelectItem(item.cart_id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                                {item.product?.images && item.product.images.length > 0 ? (
                                  <img 
                                    src={getImageUrl(item.product.images[0].storage_path)} 
                                    alt={item.product?.product_name || 'Product'} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to emoji if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📦</div>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                                    📦
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.product?.product_name || 'Unknown Product'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {item.product?.seller?.username ? `Seller: ${item.product.seller.username}` : 'Unknown Seller'}
                                </p>
                                {item.product?.listing_type && (
                                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                                    item.product.listing_type === 'FOR_SALE' ? 'bg-green-100 text-green-700' :
                                    item.product.listing_type === 'FOR_RENT' ? 'bg-blue-100 text-blue-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {item.product.listing_type === 'FOR_SALE' ? 'For Sale' :
                                     item.product.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-medium text-gray-900">
                              {formatPrice(item.product?.price || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleUpdateQuantity(item.cart_id, item.quantity - 1, item.product?.quantity)}
                                disabled={item.quantity <= 1}
                                className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.cart_id, item.quantity + 1, item.product?.quantity)}
                                disabled={item.product?.quantity ? item.quantity >= item.product.quantity : false}
                                className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                aria-label="Increase quantity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                            {item.product?.quantity !== undefined && (
                              <p className="text-xs text-gray-500 text-center mt-1">
                                {item.quantity >= item.product.quantity ? (
                                  <span className="text-red-500 font-medium">Max stock reached</span>
                                ) : (
                                  <span>{item.product.quantity} available</span>
                                )}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPrice((item.product?.price || 0) * item.quantity)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.cart_id, item.product?.product_name || 'Item')}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer with checkout */}
          {cartItems.length > 0 && (
            <div className="border-t bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === cartItems.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span>Select All ({cartItems.length})</span>
                  </label>
                  {selectedItems.length > 0 && (
                    <button
                      onClick={() => {
                        // Batch delete selected items
                        const itemsToDelete = cartItems.filter(item => selectedItems.includes(item.cart_id));
                        if (itemsToDelete.length === 0) return;
                        
                        // Show confirmation
                        const confirmDelete = window.confirm(
                          `Are you sure you want to remove ${itemsToDelete.length} item${itemsToDelete.length > 1 ? 's' : ''} from your cart?`
                        );
                        
                        if (confirmDelete) {
                          itemsToDelete.forEach(item => {
                            handleRemoveItem(item.cart_id, item.product?.product_name || 'Item');
                          });
                          setSelectedItems([]);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete Selected ({selectedItems.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Total ({selectedCount} Item{selectedCount !== 1 ? 's' : ''})
                    </p>
                    <p className="text-2xl font-bold text-orange-500">
                      {formatPrice(selectedTotal)}
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold text-lg"
                  >
                    Check Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CartIcon: React.FC = () => {
  const navigate = useNavigate();
  const { cartSummary } = useCart();
  
  const itemCount = cartSummary?.total_items || 0;

  return (
    <button
      onClick={() => navigate('/cart')}
      className="relative p-2 text-white hover:text-yellow-300 transition-colors group"
      aria-label="Shopping cart"
    >
      <div className="relative">
        {/* Cart Icon */}
        <svg 
          className="h-6 w-6 group-hover:scale-110 transition-transform" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
          />
        </svg>
        
        {/* Badge with item count */}
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center shadow-lg animate-pulse">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>
      
      {/* Tooltip */}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {itemCount === 0 ? 'Cart is empty' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
      </span>
    </button>
  );
};

export default CartDrawer;