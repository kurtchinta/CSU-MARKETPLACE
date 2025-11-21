import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useWallet as useWalletHook } from '../hooks/useWallet';

// Define the context type
interface WalletContextType {
  account: string;
  isConnecting: boolean;
  error: string;
  contractState: {
    provider: any;
    signer: any;
    contract: any;
  };
  connectWallet: (showModal?: (type: string, title: string, message: string, callback?: () => void) => void) => Promise<void>;
  disconnectWallet: (showModal?: (type: string, title: string, message: string) => void) => void;
  isConnected: boolean;
  formatAddress: (address: string) => string;
}

// Create the context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const walletState = useWalletHook();

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWalletContext = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

// Export for backward compatibility
export { useWalletHook as useWallet };