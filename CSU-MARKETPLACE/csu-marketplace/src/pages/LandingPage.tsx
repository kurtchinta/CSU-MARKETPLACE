import { useModal } from '../context/ModalContext.tsx';
import { useWallet } from '../hooks/useWallet';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { productService, type Product } from '../services/productService';
import ImageCarousel from '../components/ImageCarousel';

function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'CSU Marketplace - Buy, Sell & Rent on Campus';
  }, []);
  
  const { 
    setLoginModalOpen, 
    setRegisterModalOpen,
    showSuccess,
    showError,
    showWarning
  } = useModal();

  const {
    account,
    isConnecting,
    connectWallet
  } = useWallet();

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      const result = await productService.getProducts({ status: 'approved' });
      
      if (result.success && result.data) {
        setFeaturedProducts(result.data.slice(0, 12));
      }
    } catch (error) {
      console.error('Error loading featured products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleConnectWallet = async () => {
    await connectWallet((type: string, title: string, message: string, callback?: () => void) => {
      if (type === 'success') {
        showSuccess(title, message, callback);
      } else if (type === 'error') {
        showError(title, message);
      } else if (type === 'warning') {
        showWarning(title, message, callback);
      }
    });
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handleBuyNow = (product: Product) => {
    if (!user) {
      showError('Login Required', 'Please sign in or register to continue.');
      setLoginModalOpen(true);
      return;
    }

    if (!account) {
      showWarning('Wallet Required', 'Please connect your MetaMask wallet to continue.');
      return;
    }

    navigate('/checkout', {
      state: {
        items: [
          {
            cart_id: Date.now(),
            product_id: product.product_id,
            quantity: 1,
            product: {
              product_id: product.product_id,
              product_name: product.product_name,
              description: product.description,
              price: product.price,
              listing_type: product.listing_type,
              user_id: product.user_id,
              category_id: product.category_id,
              pickup_location: product.pickup_location,
              meetup_location: product.meetup_location,
              images: product.images,
              seller: product.seller
            }
          }
        ],
        isDirectCheckout: true,
        paymentMethod: 'gcash'
      }
    });
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      showError('Login Required', 'Please sign in or register to add items to your cart.');
      setLoginModalOpen(true);
      return;
    }

    if (!account) {
      showWarning('Wallet Required', 'Please connect your MetaMask wallet to proceed with purchases.');
      return;
    }

    showSuccess('Added to Cart', `${product.product_name} has been added to your cart`);
  };

  const handleGetService = (selectedProduct: Product) => {
    if (!user) {
      showError('Login Required', 'Please sign in or register to book services.');
      setLoginModalOpen(true);
      return;
    }

    if (!account) {
      showWarning('Wallet Required', 'Please connect your MetaMask wallet to book this service.');
      return;
    }

    // Navigate to service details page
    navigate(`/service/${selectedProduct.product_id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div className="relative">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(/Caraga_State_University.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center backdrop-blur-sm border text-white px-4 py-2 rounded-full text-sm font-medium mb-8" style={{ backgroundColor: 'rgba(32, 135, 86, 0.5)', borderColor: 'rgba(32, 135, 86, 0.3)' }}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Caraga State University Marketplace
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              CSU Marketplace
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto">
              A secure blockchain-powered platform for the CSU community to buy, sell, and rent academic essentials and student services.
            </p>
          
          {/* Wallet Connection Status */}
          <div className="mb-10">
            {account ? (
              <div className="inline-flex items-center bg-green-600/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-lg shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-sm">Wallet Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 text-white px-5 py-2.5 rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium text-sm">{isConnecting ? 'Connecting Wallet...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setRegisterModalOpen(true)}
              className="text-white font-semibold py-4 px-10 rounded-lg shadow-xl hover:shadow-2xl transition-all"
              style={{ backgroundColor: '#208756' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b47'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#208756'}
            >
              Create Account
            </button>
            <button 
              onClick={() => navigate('/browse')}
              className="bg-white hover:bg-gray-50 font-semibold py-4 px-10 rounded-lg shadow-xl hover:shadow-2xl transition-all"
              style={{ color: '#208756' }}
            >
              Browse Products
            </button>
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold py-4 px-10 rounded-lg transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-20">

        {/* Blockchain Features Banner */}
        <div className="rounded-2xl p-10 mb-20 shadow-xl" style={{ background: 'linear-gradient(to right, #208756, #1a6b47)' }}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">Blockchain-Powered Security</h2>
            <p className="text-white/90 text-lg">Enterprise-grade technology for campus commerce</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <svg className="w-12 h-12 text-white mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="text-lg font-semibold text-white mb-2">Smart Contracts</div>
              <div className="text-white/90 text-sm">Automated secure transactions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <svg className="w-12 h-12 text-white mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div className="text-lg font-semibold text-white mb-2">MetaMask Integration</div>
              <div className="text-white/90 text-sm">Secure Web3 wallet</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <svg className="w-12 h-12 text-white mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="text-lg font-semibold text-white mb-2">Transparent Records</div>
              <div className="text-white/90 text-sm">Immutable transaction history</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <svg className="w-12 h-12 text-white mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-lg font-semibold text-white mb-2">Instant Processing</div>
              <div className="text-white/90 text-sm">Real-time verification</div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
          <div className="text-center bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-5xl font-bold mb-3" style={{ color: '#208756' }}>500+</div>
            <div className="text-gray-600 font-medium text-sm uppercase tracking-wide">Active Students</div>
          </div>
          <div className="text-center bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-5xl font-bold mb-3" style={{ color: '#208756' }}>1,200+</div>
            <div className="text-gray-600 font-medium text-sm uppercase tracking-wide">Products Listed</div>
          </div>
          <div className="text-center bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-5xl font-bold mb-3" style={{ color: '#208756' }}>98%</div>
            <div className="text-gray-600 font-medium text-sm uppercase tracking-wide">Satisfaction Rate</div>
          </div>
          <div className="text-center bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-5xl font-bold mb-3" style={{ color: '#208756' }}>24/7</div>
            <div className="text-gray-600 font-medium text-sm uppercase tracking-wide">Platform Access</div>
          </div>
        </div>

        {/* System Features Section */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools for secure and efficient campus commerce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Smart Contract Trading */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Contract Trading</h3>
              <p className="text-gray-600 leading-relaxed">
                All transactions verified on Ethereum blockchain with automatic escrow and instant settlements.
              </p>
            </div>

            {/* Buy, Sell & Rent */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Buy, Sell & Rent</h3>
              <p className="text-gray-600 leading-relaxed">
                List items for sale or rent. Browse textbooks, electronics, furniture, and more.
              </p>
            </div>

            {/* Service Marketplace */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Service Marketplace</h3>
              <p className="text-gray-600 leading-relaxed">
                Offer or book tutoring, project help, and other academic services from verified students.
              </p>
            </div>

            {/* Real-time Analytics */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Track your sales, revenue, seller rating, and performance with detailed insights.
              </p>
            </div>

            {/* Seller Performance Tiers */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Seller Performance Tiers</h3>
              <p className="text-gray-600 leading-relaxed">
                Earn Platinum, Gold, Silver, or Bronze status and build your reputation.
              </p>
            </div>

            {/* Secure Messaging */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Messaging</h3>
              <p className="text-gray-600 leading-relaxed">
                Built-in chat to communicate with buyers and sellers safely.
              </p>
            </div>

            {/* Order Management */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Order Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Track all your orders as buyer or seller and manage transactions seamlessly.
              </p>
            </div>

            {/* Review System */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Review & Rating System</h3>
              <p className="text-gray-600 leading-relaxed">
                Rate sellers and products to build trust within the community.
              </p>
            </div>

            {/* Multi-category Support */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all group" style={{ '--hover-border': '#208756' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(243 244 246)'}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: 'rgba(32, 135, 86, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#208756'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: white'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 135, 86, 0.1)'; e.currentTarget.querySelector('svg')?.setAttribute('style', 'color: #208756'); }}>
                <svg className="w-7 h-7 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Category Browse</h3>
              <p className="text-gray-600 leading-relaxed">
                Electronics, textbooks, furniture, clothing, and more with advanced filters.
              </p>
            </div>
          </div>
        </div>

        {/* Featured Products Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Recently Posted Products</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Check out the latest items listed by your fellow CSU students
            </p>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading products...</p>
              </div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {featuredProducts.map((product) => (
                  <div 
                    key={product.product_id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowProductModal(true);
                    }}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300 transform hover:-translate-y-2 cursor-pointer"
                  >
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-200 overflow-hidden group">
                      {product.images && product.images.length > 0 ? (
                        <>
                          <img
                            src={product.images[0].storage_path.startsWith('http') 
                              ? product.images[0].storage_path 
                              : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${product.images[0].storage_path}`
                            }
                            alt={product.product_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {product.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                              +{product.images.length - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Badge */}
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {product.listing_type === 'FOR_SALE' ? 'For Sale' : product.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      {/* Seller Info */}
                      <p className="text-xs text-gray-500 mb-2">by {product.seller?.first_name} {product.seller?.last_name}</p>
                      
                      {/* Product Name */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {product.product_name}
                      </h3>

                      {/* Category */}
                      <p className="text-xs text-gray-600 mb-3 line-clamp-1">
                        {product.category?.category_name || 'Uncategorized'}
                      </p>

                      {/* Price */}
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <p className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</p>
                        {product.quantity && (
                          <p className="text-xs text-gray-600 mt-1">Available: {product.quantity}</p>
                        )}
                      </div>

                      {/* Description Preview */}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 h-10">
                        {product.description}
                      </p>

                      {/* View Details Button */}
                      <button
                        className="w-full text-white font-bold py-2 px-3 rounded-lg transition-all text-sm"
                        style={{ backgroundColor: '#208756' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b47'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#208756'}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Browse All Products Button */}
              <div className="text-center">
                <button
                  onClick={() => navigate('/browse')}
                  className="text-white font-bold py-4 px-10 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                  style={{ backgroundColor: '#208756' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6b47'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#208756'}
                >
                  Browse All Products
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <p className="text-gray-600 text-lg">No products available yet</p>
              <p className="text-gray-500 mt-2">Check back soon or browse the marketplace for more items</p>
            </div>
          )}
        </div>

        {/* How It Works Section */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #208756 0%, #1a6b47 100%)' }}>
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Create Account</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Register with your CSU email address and verify your account to get started.
                </p>
              </div>
              {/* Connector line for desktop */}
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 -z-10" style={{ background: 'linear-gradient(to right, #208756, transparent)' }} />
            </div>
            
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #208756 0%, #1a6b47 100%)' }}>
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Connect Wallet</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Link your MetaMask wallet for secure blockchain-based transactions.
                </p>
              </div>
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 -z-10" style={{ background: 'linear-gradient(to right, #208756, transparent)' }} />
            </div>
            
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #208756 0%, #1a6b47 100%)' }}>
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Browse or List</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  List items for sale, browse products, or book services from other students.
                </p>
              </div>
              <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 -z-10" style={{ background: 'linear-gradient(to right, #208756, transparent)' }} />
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #208756 0%, #1a6b47 100%)' }}>
                  4
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Complete Transaction</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Confirm delivery, complete payment, and rate your transaction experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="rounded-2xl p-12 lg:p-16 text-white mb-20 shadow-2xl" style={{ background: 'linear-gradient(135deg, #1a6b47 0%, #208756 50%, #1a6b47 100%)' }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg md:text-xl mb-10 text-white/90">
              Join 500+ CSU students trading securely with blockchain technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setRegisterModalOpen(true)}
                className="bg-white font-semibold py-4 px-10 rounded-lg hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                style={{ color: '#208756' }}
              >
                Create Free Account
              </button>
              <button 
                onClick={() => setLoginModalOpen(true)}
                className="bg-transparent border-2 border-white text-white font-semibold py-4 px-10 rounded-lg hover:bg-white/10 transition-all transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 p-6 flex justify-between items-center border-b" style={{ background: 'linear-gradient(to right, #208756, #1a6b47)', borderColor: 'rgba(26, 107, 71, 0.5)' }}>
              <h2 className="text-2xl font-bold text-white">{selectedProduct.product_name}</h2>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Image Carousel */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="mb-6">
                  <ImageCarousel 
                    images={selectedProduct.images} 
                    productName={selectedProduct.product_name}
                  />
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">by {selectedProduct.seller?.first_name} {selectedProduct.seller?.last_name}</p>
                    <p className="text-gray-600 text-sm">{selectedProduct.category?.category_name || 'Uncategorized'}</p>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {selectedProduct.listing_type === 'FOR_SALE' ? 'For Sale' : selectedProduct.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                  </span>
                </div>

                <div>
                  <p className="text-3xl font-bold text-green-600 mb-2">{formatPrice(selectedProduct.price)}</p>
                  {selectedProduct.quantity && (
                    <p className="text-sm text-gray-600">Available: {selectedProduct.quantity}</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedProduct.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t pt-6 grid grid-cols-1 gap-3">
                {selectedProduct.listing_type === 'SERVICE' ? (
                  <>
                    <button
                      onClick={() => {
                        handleGetService(selectedProduct);
                        setShowProductModal(false);
                        setSelectedProduct(null);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                    >
                      Get Service
                    </button>
                  </>
                ) : selectedProduct.listing_type === 'FOR_RENT' ? (
                  <>
                    <button
                      onClick={() => {
                        handleBuyNow(selectedProduct);
                        setShowProductModal(false);
                        setSelectedProduct(null);
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                    >
                      Rent Now
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleBuyNow(selectedProduct);
                        setShowProductModal(false);
                        setSelectedProduct(null);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                    >
                      Buy Now
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setShowProductModal(false);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition-all"
                >
                  Add to Cart
                </button>

                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand Section */}
            <div>
              <h3 className="text-white text-2xl font-bold mb-4">CSU Marketplace</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your trusted campus marketplace for buying, selling, and renting everything you need for student life.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(31 41 55)'}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(31 41 55)'}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#208756'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(31 41 55)'}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => navigate('/browse')} className="text-gray-400 transition-colors text-left" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Browse Products</button>
                </li>
                <li>
                  <button onClick={() => setRegisterModalOpen(true)} className="text-gray-400 transition-colors text-left" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>List Items</button>
                </li>
                <li>
                  <a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>My Orders</a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>My Listings</a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Support</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Help Center</a></li>
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Contact Us</a></li>
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Safety Guidelines</a></li>
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>FAQs</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Cookie Policy</a></li>
                <li><a href="#" className="text-gray-400 transition-colors block" onMouseEnter={(e) => e.currentTarget.style.color = '#208756'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}>Community Guidelines</a></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-gray-400 text-sm text-center md:text-left">
                <p>&copy; 2025 CSU Marketplace. All rights reserved.</p>
                <p className="mt-2">Empowering the CSU community through secure commerce.</p>
              </div>
              
              {/* Payment Methods */}
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">Payment Methods:</span>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 px-3 py-2 rounded text-sm font-semibold text-gray-300">MetaMask</div>
                  <div className="bg-gray-800 px-3 py-2 rounded text-sm font-semibold text-gray-300">GCash</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
