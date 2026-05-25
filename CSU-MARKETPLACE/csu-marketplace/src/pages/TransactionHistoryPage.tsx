import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import { Wallet, Link2, CheckCircle, Eye, X, ExternalLink, Trash2, Loader } from 'lucide-react';
import Footer from '../components/Footer';

interface Transaction {
  transaction_id: string;
  order_id: string | null;
  blockchain_id: number | null;
  blockchain_tx_hash: string | null;
  blockchain_confirmed_at: string | null;
  blockchain_block_number: number | null;
  gas_used: number | null;
  is_blockchain_pending: boolean;
  buyer_id: string;
  seller_id: string;
  product_id: number | null;
  category_id: number | null;
  buyer_name: string;
  seller_name: string;
  seller_phone: string | null;
  listing_type: 'FOR_SALE' | 'FOR_RENT' | 'SERVICE';
  category_name: string | null;
  item_name: string;
  item_description: string;
  item_price: number;
  quantity: number;
  final_pickup_location: string | null;
  final_meetup_location: string | null;
  contact_info: string | null;
  return_condition: string | null;
  rental_duration: string | null;
  start_date: string | null;
  end_date: string | null;
  service_schedule: string | null;
  service_duration: string | null;
  message_to_seller: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  transaction_status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  pending_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  buyer_wallet?: string;
  seller_wallet?: string;
}

const TransactionHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { account } = useWallet();
  const { showError, showSuccess } = useModal();

  useEffect(() => {
    document.title = 'Transaction History - CSU Marketplace';
  }, []);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (user && account) {
      loadBlockchainTransactions();
    }
  }, [user, account]);

  const loadBlockchainTransactions = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        showError('Error', 'Database connection not available');
        return;
      }

      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║         FETCHING BLOCKCHAIN TRANSACTION HISTORY                 ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('FETCHING FROM DATABASE:');
      console.log('   Current User:', user?.id);
      console.log('');

      // Get transactions with wallet addresses from users table
      const { data: dbTransactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          buyer:buyer_id(wallet_address),
          seller:seller_id(wallet_address)
        `)
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        showError('Error', 'Failed to fetch transactions: ' + error.message);
        return;
      }

      console.log(`FOUND ${dbTransactions?.length || 0} TRANSACTIONS FOR USER ${user?.id} IN DATABASE`);
      console.log('');

      if (!dbTransactions || dbTransactions.length === 0) {
        console.log('❌ NO TRANSACTIONS FOUND IN DATABASE');
        console.log('   This means no transactions exist for this user');
        console.log('   User ID:', user?.id);
        setTransactions([]);
        setLoading(false);
        return;
      }

      console.log('✅ TRANSACTIONS FOUND:');
      dbTransactions.forEach((tx, index) => {
        console.log(`   [${index + 1}] Transaction ID: ${tx.transaction_id}`);
        console.log(`       Buyer ID: ${tx.buyer_id}`);
        console.log(`       Seller ID: ${tx.seller_id}`);
        console.log(`       Status: ${tx.transaction_status}`);
        console.log(`       Item: ${tx.item_name}`);
        console.log(`       Block Number: ${tx.blockchain_block_number || 'Not recorded'}`);
      });
      console.log('');

      // Map transactions with wallet addresses
      const mappedTransactions: Transaction[] = dbTransactions.map((tx: any) => ({
        ...tx,
        buyer_wallet: tx.buyer?.wallet_address || account || '',
        seller_wallet: tx.seller?.wallet_address || ''
      }));

      console.log(`═════════════════════════════════════════════════════════════════`);
      console.log(`TOTAL TRANSACTIONS LOADED FROM DATABASE: ${mappedTransactions.length}`);
      console.log(`═════════════════════════════════════════════════════════════════`);
      console.log('');

      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('Error loading blockchain transactions:', error);
      showError('Error', 'Failed to load blockchain transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Accepted': 'bg-green-100 text-green-800 border-green-300',
      'Rejected': 'bg-red-100 text-red-800 border-red-300',
      'Completed': 'bg-blue-100 text-blue-800 border-blue-300',
      'Cancelled': 'bg-gray-100 text-gray-800 border-gray-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles['Pending']}`}>
        {status}
      </span>
    );
  };

  const formatAddress = (address: string): string => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (timestamp: string | null): string => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUserBuyer = (tx: Transaction): boolean => {
    return tx.buyer_id === user?.id;
  };

  const isUserSeller = (tx: Transaction): boolean => {
    return tx.seller_id === user?.id;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'buyer') return isUserBuyer(tx);
    if (filter === 'seller') return isUserSeller(tx);
    return true;
  });

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    if (!supabase) {
      showError('Error', 'Database connection not available');
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transaction_id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        showError('Error', 'Failed to delete transaction: ' + error.message);
        return;
      }

      showSuccess('Deleted', 'Transaction deleted successfully');
      
      // Reload transactions
      await loadBlockchainTransactions();
    } catch (error: any) {
      console.error('Exception deleting transaction:', error);
      showError('Error', 'Failed to delete transaction');
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          BLOCKCHAIN TRANSACTION DETAILS                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('BLOCKCHAIN ID:', transaction.blockchain_block_number || 'Not recorded');
    console.log('TRANSACTION ID:', transaction.transaction_id);
    console.log('');
    console.log('PARTICIPANTS:');
    console.log('   Buyer:', transaction.buyer_wallet, `(${transaction.buyer_name})`);
    console.log('   Seller:', transaction.seller_wallet, `(${transaction.seller_name})`);
    console.log('');
    console.log('ITEM DETAILS:');
    console.log('   Name:', transaction.item_name);
    console.log('   Type:', transaction.listing_type);
    console.log('   Price:', transaction.item_price);
    console.log('   Quantity:', transaction.quantity);
    console.log('');
    console.log('STATUS INFORMATION:');
    console.log('   Current Status:', transaction.transaction_status);
    if (transaction.rejection_reason) {
      console.log('   Rejection Reason:', transaction.rejection_reason);
    }
    if (transaction.cancellation_reason) {
      console.log('   Cancellation Reason:', transaction.cancellation_reason);
    }
    console.log('');
    console.log('TIMESTAMPS:');
    console.log('   Created:', formatDate(transaction.created_at));
    if (transaction.accepted_at) {
      console.log('   Accepted:', formatDate(transaction.accepted_at));
    }
    if (transaction.rejected_at) {
      console.log('   Rejected:', formatDate(transaction.rejected_at));
    }
    if (transaction.completed_at) {
      console.log('   Completed:', formatDate(transaction.completed_at));
    }
    if (transaction.cancelled_at) {
      console.log('   Cancelled:', formatDate(transaction.cancelled_at));
    }
    console.log('');

    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#208756' }} />
          <p style={{ color: '#666666' }}>Loading blockchain transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container mx-auto px-6 lg:px-12 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#208756' }}>Blockchain Transaction History</h1>
          <p className="text-base" style={{ color: '#666666' }}>
            {transactions.length === 0 
              ? 'No blockchain transactions yet' 
              : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} recorded on blockchain`}
          </p>
          <div className="mt-4 rounded-lg p-4 border" style={{ backgroundColor: '#f0f8f6', borderColor: '#d4e8e4' }}>
            <p className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: '#208756' }}>
              <Wallet className="w-4 h-4" />
              Connected Wallet: <span className="font-mono text-xs" style={{ color: '#1a1a1a' }}>{formatAddress(account || '')}</span>
            </p>
            <p className="text-xs flex items-center gap-2" style={{ color: '#666666' }}>
              <Link2 className="w-3 h-3" />
              Smart Contract: <span className="font-mono">0x7597d6fe0329aF3DD4b47E7874f1745ADa9C9AaE</span> (Sepolia)
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            {['all', 'buyer', 'seller'].map((tab) => {
              const count = tab === 'all' 
                ? transactions.length 
                : tab === 'buyer'
                ? transactions.filter(t => isUserBuyer(t)).length
                : transactions.filter(t => isUserSeller(t)).length;
              const isActive = filter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab as typeof filter)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                    isActive
                      ? 'border-b-2 text-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                  style={isActive ? { backgroundColor: '#208756', borderColor: '#208756', color: 'white' } : {}}
                >
                  {tab === 'all' && 'All Transactions'}
                  {tab === 'buyer' && 'As Buyer'}
                  {tab === 'seller' && 'As Seller'}
                  {' '}({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border-t-4 overflow-hidden" style={{ borderTopColor: '#208756', borderColor: '#e0e0e0' }}>
            <div className="p-12 text-center">
              <CheckCircle className="w-20 h-20 mx-auto mb-4" style={{ color: '#d4e8e4' }} strokeWidth={1.5} />
              <p style={{ color: '#1a1a1a' }} className="mb-2 text-lg font-semibold">No transactions found</p>
              <p style={{ color: '#666666' }} className="mb-6">
                {filter === 'all' 
                  ? "Your blockchain transactions will appear here"
                  : `No transactions as ${filter} yet`
                }
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="font-medium transition-colors mb-4"
                  style={{ color: '#208756' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#1a6d46')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#208756')}
                >
                  View all transactions
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTransactions.map((tx) => (
              <div key={tx.transaction_id} className="bg-white rounded-lg shadow-sm overflow-hidden border-t-4 hover:shadow-md transition-shadow" style={{ borderTopColor: '#208756' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>{tx.item_name}</h3>
                        {getStatusBadge(tx.transaction_status)}
                      </div>
                      <p className="text-sm" style={{ color: '#666666' }}>Block Number: <span className="font-mono">{tx.blockchain_block_number || 'Not recorded'}</span> | Transaction ID: <span className="font-mono">{tx.transaction_id.substring(0, 8)}...</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>₱{(tx.item_price * tx.quantity).toLocaleString()}</p>
                      <p className="text-sm" style={{ color: '#666666' }}>{tx.quantity} × ₱{tx.item_price.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="rounded-lg p-4 mb-4 border" style={{ backgroundColor: '#f8f9fa', borderColor: '#e0e0e0' }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: '#208756' }}>Transaction Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span style={{ color: '#666666' }}>Type:</span>
                        <span className="ml-2 font-semibold" style={{ color: '#1a1a1a' }}>{tx.listing_type}</span>
                      </div>
                      <div>
                        <span style={{ color: '#666666' }}>Created:</span>
                        <span className="ml-2 font-semibold" style={{ color: '#1a1a1a' }}>{formatDate(tx.created_at)}</span>
                      </div>
                      {isUserBuyer(tx) ? (
                        <div>
                          <span style={{ color: '#666666' }}>Seller:</span>
                          <span className="ml-2 font-semibold" style={{ color: '#1a1a1a' }}>{tx.seller_name} <span className="font-mono text-xs">({formatAddress(tx.seller_wallet || '')})</span></span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ color: '#666666' }}>Buyer:</span>
                          <span className="ml-2 font-semibold" style={{ color: '#1a1a1a' }}>{tx.buyer_name} <span className="font-mono text-xs">({formatAddress(tx.buyer_wallet || '')})</span></span>
                        </div>
                      )}
                      {tx.rejection_reason && (
                        <div className="md:col-span-2">
                          <span style={{ color: '#666666' }}>Rejection Reason:</span>
                          <p className="mt-1 text-sm p-2 rounded" style={{ color: '#1a1a1a', backgroundColor: '#ffffff' }}>{tx.rejection_reason}</p>
                        </div>
                      )}
                      {tx.cancellation_reason && (
                        <div className="md:col-span-2">
                          <span style={{ color: '#666666' }}>Cancellation Reason:</span>
                          <p className="mt-1 text-sm p-2 rounded" style={{ color: '#1a1a1a', backgroundColor: '#ffffff' }}>{tx.cancellation_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleViewDetails(tx)}
                      className="flex-1 min-w-[140px] px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: '#208756', color: 'white', border: '2px solid #208756' }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#1a6d46';
                        e.currentTarget.style.borderColor = '#1a6d46';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#208756';
                        e.currentTarget.style.borderColor = '#208756';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                    {tx.blockchain_tx_hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[140px] px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        style={{ backgroundColor: 'white', color: '#208756', border: '2px solid #208756' }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f8f6';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Etherscan</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteTransaction(tx.transaction_id)}
                      className="px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: 'white', color: '#dc2626', border: '2px solid #dc2626' }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#dc2626';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 backdrop-blur-[1px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Overview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Item</p>
                      <p className="font-semibold text-gray-900">{selectedTransaction.item_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold">{getStatusBadge(selectedTransaction.transaction_status)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="font-semibold text-gray-900">₱{selectedTransaction.item_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="font-semibold text-gray-900">{selectedTransaction.quantity}</p>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Participants</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Buyer</p>
                      <p className="text-sm font-medium text-gray-900">{selectedTransaction.buyer_name}</p>
                      <p className="text-xs text-gray-600 font-mono">{selectedTransaction.buyer_wallet || 'Not available'}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Seller</p>
                      <p className="text-sm font-medium text-gray-900">{selectedTransaction.seller_name}</p>
                      <p className="text-xs text-gray-600 font-mono">{selectedTransaction.seller_wallet || 'Not available'}</p>
                    </div>
                  </div>
                </div>

                {/* Blockchain IDs */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Blockchain Data</h3>
                  <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-gray-600">Block Number</p>
                      <p className="font-mono font-semibold text-gray-900">{selectedTransaction.blockchain_block_number || 'Not recorded on blockchain'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Transaction ID</p>
                      <p className="font-mono font-semibold text-gray-900">{selectedTransaction.transaction_id}</p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    {selectedTransaction.accepted_at && (
                      <div>
                        <p className="text-gray-600">Accepted</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedTransaction.accepted_at)}</p>
                      </div>
                    )}
                    {selectedTransaction.rejected_at && (
                      <div>
                        <p className="text-gray-600">Rejected</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedTransaction.rejected_at)}</p>
                      </div>
                    )}
                    {selectedTransaction.completed_at && (
                      <div>
                        <p className="text-gray-600">Completed</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedTransaction.completed_at)}</p>
                      </div>
                    )}
                    {selectedTransaction.cancelled_at && (
                      <div>
                        <p className="text-gray-600">Cancelled</p>
                        <p className="font-semibold text-gray-900">{formatDate(selectedTransaction.cancelled_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason if rejected/cancelled */}
                {selectedTransaction.rejection_reason && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Rejection Reason</h3>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900">{selectedTransaction.rejection_reason}</p>
                    </div>
                  </div>
                )}
                {selectedTransaction.cancellation_reason && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Cancellation Reason</h3>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900">{selectedTransaction.cancellation_reason}</p>
                    </div>
                  </div>
                )}

                {/* Etherscan Link */}
                {selectedTransaction.blockchain_tx_hash && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Blockchain Explorer</h3>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${selectedTransaction.blockchain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 px-4 rounded-lg font-semibold transition-all text-center shadow-sm hover:shadow-md"
                      style={{ backgroundColor: 'white', color: '#208756', border: '2px solid #208756' }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f8f6';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        View Transaction on Etherscan (Sepolia)
                      </div>
                    </a>
                    <p className="text-xs text-gray-500 mt-2 text-center font-mono">
                      Tx Hash: {selectedTransaction.blockchain_tx_hash.substring(0, 10)}...{selectedTransaction.blockchain_tx_hash.substring(selectedTransaction.blockchain_tx_hash.length - 8)}
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full py-3 px-4 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
                  style={{ backgroundColor: '#208756' }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a6d46';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#208756';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default TransactionHistoryPage;
