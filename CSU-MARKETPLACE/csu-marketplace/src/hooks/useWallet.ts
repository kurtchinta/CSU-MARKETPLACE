import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import abi from '../contractJSON/CSUMarketplace.json';

// Types
interface ContractState {
  provider: BrowserProvider | null;
  signer: any | null;
  contract: Contract | null;
}

interface UseWalletReturn {
  account: string;
  isConnecting: boolean;
  error: string;
  contractState: ContractState;
  connectWallet: (showModal?: (type: string, title: string, message: string, callback?: () => void) => void) => Promise<void>;
  disconnectWallet: (showModal?: (type: string, title: string, message: string) => void) => void;
  isConnected: boolean;
  formatAddress: (address: string) => string;
}

export const useWallet = (): UseWalletReturn => {
  const [account, setAccount] = useState<string>('Not connected');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [contractState, setContractState] = useState<ContractState>({
    provider: null,
    signer: null,
    contract: null,
  });

  // Contract configuration (Updated: Nov 16, 2025 - Verified on Etherscan)
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "0x7597d6fe0329aF3DD4b47E7874f1745ADa9C9AaE";
  const contractABI = abi.abi;

  // Connect wallet function with enhanced error handling and modal support
  const connectWallet = useCallback(async (showModal?: (type: string, title: string, message: string, callback?: () => void) => void) => {
    if (!window.ethereum) {
      const message = 'Please install MetaMask browser extension to connect your wallet.';
      setError(message);
      if (showModal) {
        showModal('warning', 'MetaMask Not Installed', 
          `${message}\n\nClick OK to visit MetaMask download page.`,
          () => window.open('https://metamask.io/download/', '_blank')
        );
      }
      return;
    }

    // Check if MetaMask is accessible
    if (!window.ethereum.isMetaMask) {
      const message = 'Please use MetaMask to connect your wallet.';
      setError(message);
      if (showModal) {
        showModal('warning', 'MetaMask Required', message);
      }
      return;
    }

    try {
      setIsConnecting(true);
      setError('');

      // Request account access - this will always trigger MetaMask popup
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        const message = 'Please unlock MetaMask and try again.';
        setError(message);
        if (showModal) {
          showModal('error', 'No Accounts Found', message);
        }
        return;
      }

      setAccount(accounts[0]);

      // Create provider and signer (ethers v6 syntax)
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Initialize contract
      console.log('Contract: Initializing smart contract at:', contractAddress);
      const contract = new Contract(
        contractAddress,
        contractABI,
        signer
      );

      // Update state
      setContractState({ provider, signer, contract });
      console.log('Contract: Smart contract initialized successfully');

      // Show success message
      if (showModal) {
        showModal('success', 'Wallet Connected!', 
          `Successfully connected to MetaMask!\n\nAddress: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
        );
      }

    } catch (error: any) {
      let errorMessage = 'Failed to connect wallet';
      
      // Handle specific error cases
      if (error.code === 4001) {
        errorMessage = 'Please approve the connection in MetaMask to continue.';
      } else if (error.code === -32002) {
        errorMessage = 'MetaMask is already processing a connection request. Please check MetaMask and try again.';
      } else if (error.message?.includes('User rejected')) {
        errorMessage = 'Please approve the connection to use wallet features.';
      } else {
        errorMessage = error.message || 'Unknown error occurred. Please try again or refresh the page.';
      }

      setError(errorMessage);
      setAccount('Not connected');
      setContractState({ provider: null, signer: null, contract: null });

      if (showModal) {
        if (error.code === 4001 || error.code === -32002 || error.message?.includes('User rejected')) {
          showModal('warning', 'Connection Issue', errorMessage);
        } else {
          showModal('error', 'Connection Failed', `Failed to connect wallet: ${errorMessage}`);
        }
      }
    } finally {
      setIsConnecting(false);
    }
  }, [contractAddress, contractABI]);

  // Disconnect wallet function
  const disconnectWallet = useCallback((showModal?: (type: string, title: string, message: string) => void) => {
    if (account === 'Not connected') {
      if (showModal) {
        showModal('warning', 'No Wallet Connected', 'There is no wallet currently connected.');
      }
      return;
    }

    setAccount('Not connected');
    setContractState({ provider: null, signer: null, contract: null });
    setError('');
    
    if (showModal) {
      showModal('info', 'Wallet Disconnected', 'Your wallet has been disconnected successfully!');
    }
  }, [account]);

  // Format address function
  const formatAddress = useCallback((address: string) => {
    if (!address || address === 'Not connected') return 'Not connected';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Handle account changes
  const handleAccountChange = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount('Not connected');
      setContractState({ provider: null, signer: null, contract: null });
    } else {
      setAccount(accounts[0]);
      connectWallet(); // Reinitialize with new account
    }
  }, [connectWallet]);

  // Handle network changes
  const handleNetworkChange = useCallback(() => {
    window.location.reload(); // Simple way to handle network changes
  }, []);

  // Initialize wallet on component mount
  useEffect(() => {
    let initialized = false;
    
    const initializeWallet = async () => {
      if (initialized || !window.ethereum) return;
      initialized = true;
      
      // Check if already connected
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          console.log('Wallet: Found existing connection:', accounts[0]);
          await connectWallet();
        }
      } catch (error) {
        console.error('Wallet: Failed to check existing connection:', error);
      }

      // Setup event listeners
      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', handleNetworkChange);
    };

    initializeWallet();

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
      }
    };
  }, [connectWallet, handleAccountChange, handleNetworkChange]);

  return {
    account,
    isConnecting,
    error,
    contractState,
    connectWallet,
    disconnectWallet,
    isConnected: account !== 'Not connected',
    formatAddress
  };
};