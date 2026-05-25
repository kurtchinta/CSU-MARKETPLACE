import React, { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from '../context/CartContext';
import { useModal } from '../context/ModalContext';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';

const MyCartPage: React.FC = () => {
  useEffect(() => {
    document.title = 'My Cart - CSU Marketplace';
  }, []);

  const navigate = useNavigate();
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity
  } = useCart();
  const { showSuccess, showError } = useModal();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Helper to get image URL from storage path
  const getImageUrl = (storagePath: string): string => {
    if (!supabase) return '';
    const { data } = supabase.storage.from('product-images').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleRemoveItem = async (cartItemId: number, productTitle: string) => {
    const success = await removeFromCart(cartItemId);
    if (success) {
      showSuccess('Item Removed', `${productTitle} has been removed from your cart.`);
      // Remove from selected items if it was selected
      setSelectedItems(selectedItems.filter(id => id !== cartItemId));
    } else {
      showError('Error', 'Failed to remove item from cart. Please try again.');
    }
  };

  const handleUpdateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const success = await updateQuantity(cartItemId, newQuantity);
    if (!success) {
      showError('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      showError('Empty Cart', 'Your cart is empty. Add items to checkout.');
      return;
    }

    if (selectedItems.length === 0) {
      showError('No Items Selected', 'Please select at least one item to checkout');
      return;
    }
    
    const itemsToCheckout = cartItems.filter(item => selectedItems.includes(item.cart_id));
    
    // Navigate to checkout page with selected items
    navigate('/checkout', { 
      state: { 
        items: itemsToCheckout,
        paymentMethod: 'gcash'
      } 
    });
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

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      showError('No Items Selected', 'Please select items to delete');
      return;
    }

    // Delete all selected items
    const deletePromises = selectedItems.map(itemId => {
      const item = cartItems.find(i => i.cart_id === itemId);
      return item ? removeFromCart(item.cart_id) : Promise.resolve(false);
    });

    const results = await Promise.all(deletePromises);
    const successCount = results.filter(r => r).length;

    if (successCount > 0) {
      showSuccess('Items Removed', `${successCount} item(s) removed from your cart`);
      setSelectedItems([]);
    } else {
      showError('Error', 'Failed to remove items. Please try again.');
    }
  };

  const calculateSelectedTotal = () => {
    if (selectedItems.length === 0) return 0;
    
    return cartItems
      .filter(item => selectedItems.includes(item.cart_id))
      .reduce((total, item) => total + ((item.product?.price || 0) * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return `₱${price.toFixed(2)}`;
  };

  const selectedTotal = calculateSelectedTotal();
  const selectedCount = selectedItems.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mt-4">
      <div className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          {/* Header */}
          <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Shopping Cart</h1>
          <p className="text-gray-600 mt-1">
            {cartItems.length === 0 
              ? 'Your cart is empty' 
              : `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} in your cart`}
          </p>
        </div>

        {cartItems.length === 0 ? (
          // Empty Cart State
          <div className="bg-white rounded-lg shadow-md p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="mb-6">
                <svg className="w-32 h-32 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3" style={{ color: '#208756' }}>Your shopping cart is empty</h3>
              <p className="text-gray-500 mb-8">Browse our marketplace and add items to your cart</p>
              <button 
                onClick={() => navigate('/browse')}
                style={{
                  backgroundColor: '#208756',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1a6d46')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#208756')}
                className="px-8 py-3 text-white rounded-md transition-colors font-medium text-lg inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Go Shop Now
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                          onChange={toggleSelectAll}
                          style={{
                            accentColor: '#208756',
                          }}
                          className="w-4 h-4 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Unit Price</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total Price</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cartItems.map((item) => (
                      <tr key={item.cart_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.cart_id)}
                            onChange={() => toggleSelectItem(item.cart_id)}
                            style={{
                              accentColor: '#208756',
                            }}
                            className="w-4 h-4 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4">
                            {/* Product Image */}
                            <div className="w-20 h-20 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                              {item.product?.images && item.product.images.length > 0 ? (
                                <img 
                                  src={getImageUrl(item.product.images[0].storage_path)} 
                                  alt={item.product?.product_name || 'Product'} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                                  📦
                                </div>
                              )}
                            </div>
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate mb-1">
                                {item.product?.product_name || 'Unknown Product'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Seller: {item.product?.seller?.username || 'Unknown'}
                              </p>
                              {item.product?.category && (
                                <p className="text-xs text-gray-400">
                                  {item.product.category.category_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {formatPrice(item.product?.price || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.cart_id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.cart_id, item.quantity + 1)}
                              disabled={item.quantity >= (item.product?.quantity || 1)}
                              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatPrice((item.product?.price || 0) * item.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.cart_id, item.product?.product_name || 'Item')}
                            className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
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

            {/* Footer with Actions and Checkout */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col space-y-6">
                {/* Selection and Checkout Actions */}
                <div className="flex items-center justify-between">
                  {/* Left Side - Selection Actions */}
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                        onChange={toggleSelectAll}
                        style={{
                          accentColor: '#208756',
                        }}
                        className="w-4 h-4 border-gray-300 rounded"
                      />
                      <span className="font-medium">Select All ({cartItems.length})</span>
                    </label>
                    {selectedItems.length > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected ({selectedItems.length})
                      </button>
                    )}
                  </div>

                  {/* Right Side - Total and Checkout */}
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">
                        Total ({selectedCount} Item{selectedCount !== 1 ? 's' : ''})
                      </p>
                      <p className="text-3xl font-bold text-orange-500">
                        {formatPrice(selectedTotal)}
                      </p>
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={selectedItems.length === 0}
                      style={{
                        backgroundColor: selectedItems.length === 0 ? '#ccc' : '#208756',
                        color: 'white',
                      }}
                      onMouseOver={(e) => {
                        if (selectedItems.length > 0) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a6d46';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedItems.length > 0) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#208756';
                        }
                      }}
                      className="px-10 py-4 text-white rounded-md transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Check Out
                    </button>
                  </div>
                </div>
              </div>

              {selectedItems.length === 0 && cartItems.length > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-amber-600">
                    Please select at least one item to checkout
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyCartPage;
