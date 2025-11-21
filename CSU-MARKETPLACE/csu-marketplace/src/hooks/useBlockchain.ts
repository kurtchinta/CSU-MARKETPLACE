/**
 * useBlockchain Hook
 * React hook for blockchain integration
 * NOTE: This hook is deprecated - use blockchainService directly from src/services/blockchainService.ts
 * The service is now called directly in CheckoutPage and SellerOrdersPage
 */

import { useState, useEffect, useCallback } from 'react';
import blockchainService from '../services/blockchainService';

export function useBlockchain() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  /**
   * Check blockchain connection status
   */
  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await blockchainService.getBlockchainStatus();
      setIsConnected(status.connected);
      setWalletAddress(status.walletAddress);
      setChainId(status.chainId);
      
      console.log('✅ Blockchain status checked');
    } catch (err: any) {
      setError(err.message || 'Failed to check blockchain status');
      console.error('❌ Blockchain status check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Connect wallet
   */
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await blockchainService.initializeProvider();
      await checkStatus();
      
      console.log('✅ Wallet connected');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to connect wallet';
      setError(errorMsg);
      console.error('❌ Wallet connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus]);

  /**
   * Switch to Sepolia network
   */
  const switchToSepolia = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await blockchainService.switchToSepoliaNetwork();
      await checkStatus();
      
      console.log('✅ Switched to Sepolia network');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to switch network';
      setError(errorMsg);
      console.error('❌ Network switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkStatus]);

  // Auto-check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    // State
    isConnected,
    isLoading,
    error,
    walletAddress,
    chainId,
    
    // Actions
    checkStatus,
    connectWallet,
    switchToSepolia,
    
    // Service reference for advanced usage
    blockchainService,
    
    // Clear error
    clearError: () => setError(null)
  };
}
