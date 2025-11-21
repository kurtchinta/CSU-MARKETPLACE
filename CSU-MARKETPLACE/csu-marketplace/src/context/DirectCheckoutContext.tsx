import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface DirectCheckoutItem {
  product_id: number;
  product_name: string;
  description: string;
  price: number;
  listing_type: 'for_sale' | 'for_rent' | 'service';
  user_id: string;
  category_id: number;
  quantity: number;
  pickup_location?: string;
  meetup_location?: string;
  images?: string[];
  seller?: {
    username: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    wallet_address?: string;
  };
}

export interface DirectCheckoutData {
  items: DirectCheckoutItem[];
  paymentMethod: 'gcash' | 'cash';
  isDirectCheckout: boolean; // Flag to differentiate from cart checkout
}

interface DirectCheckoutContextType {
  checkoutData: DirectCheckoutData | null;
  setDirectCheckout: (item: DirectCheckoutItem, paymentMethod?: 'gcash' | 'cash') => void;
  clearDirectCheckout: () => void;
  isDirectCheckout: () => boolean;
}

const DirectCheckoutContext = createContext<DirectCheckoutContextType | undefined>(undefined);

export const DirectCheckoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [checkoutData, setCheckoutData] = useState<DirectCheckoutData | null>(null);

  const setDirectCheckout = (item: DirectCheckoutItem, paymentMethod: 'gcash' | 'cash' = 'gcash') => {
    setCheckoutData({
      items: [{ ...item, quantity: item.quantity || 1 }],
      paymentMethod,
      isDirectCheckout: true
    });
  };

  const clearDirectCheckout = () => {
    setCheckoutData(null);
  };

  const isDirectCheckout = () => {
    return checkoutData?.isDirectCheckout === true;
  };

  return (
    <DirectCheckoutContext.Provider 
      value={{ 
        checkoutData, 
        setDirectCheckout, 
        clearDirectCheckout,
        isDirectCheckout 
      }}
    >
      {children}
    </DirectCheckoutContext.Provider>
  );
};

export const useDirectCheckout = (): DirectCheckoutContextType => {
  const context = useContext(DirectCheckoutContext);
  if (!context) {
    throw new Error('useDirectCheckout must be used within DirectCheckoutProvider');
  }
  return context;
};
