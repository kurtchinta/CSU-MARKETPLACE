"use client"

import { useModal } from "../context/ModalContext.tsx"
import { useWallet } from "../hooks/useWallet"
import { useNavigate } from "react-router"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { productService, type Product } from "../services/productService"
import Footer from "../components/Footer"
import {
  Shield,
  ShoppingBag,
  Zap,
  Users,
  MapPin,
  Star,
  Package,
  Phone,
  ChevronDown,
  LogIn,
  Loader,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"

// Memoized scroll animation setup
const setupScrollAnimations = () => {
  const animatedSections = new Set<string>()

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement
        const sectionId = entry.target.id

        if (entry.isIntersecting) {
          element.classList.remove("scroll-animate-up", "scroll-animate-left", "scroll-animate-right")
          element.style.opacity = "0"
          element.offsetHeight // Trigger reflow
          element.classList.add("scroll-animate-up")
          animatedSections.add(sectionId)
        } else if (animatedSections.has(sectionId)) {
          element.style.opacity = "0"
          element.classList.remove("scroll-animate-up")
          animatedSections.delete(sectionId)
        }
      })
    },
    { threshold: 0.05 },
  )

  return observer
}

function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setLoginModalOpen, setRegisterModalOpen, showError, showWarning } = useModal()
  const { account } = useWallet()

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [showMetaMaskSetup, setShowMetaMaskSetup] = useState(false)

  // Set document title
  useEffect(() => {
    document.title = "CSU Marketplace - Buy, Sell & Rent on Campus"
  }, [])

  // Setup scroll animations
  useEffect(() => {
    const observer = setupScrollAnimations()
    
    const timer = setTimeout(() => {
      const sections = document.querySelectorAll("[data-scroll-animate]")
      sections.forEach((section) => {
        ;(section as HTMLElement).style.opacity = "0"
        observer.observe(section)
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      const sections = document.querySelectorAll("[data-scroll-animate]")
      sections.forEach((section) => observer.unobserve(section))
    }
  }, [])

  // Load featured products
  const loadFeaturedProducts = useCallback(async () => {
    try {
      setLoadingProducts(true)
      const result = await productService.getProducts({ status: "approved" })
      if (result.success && result.data) {
        setFeaturedProducts(result.data.slice(0, 5))
      }
    } catch (error) {
      console.error("Error loading featured products:", error)
      showWarning("Load Error", "Failed to load featured products. Please refresh.")
    } finally {
      setLoadingProducts(false)
    }
  }, [showWarning])

  useEffect(() => {
    loadFeaturedProducts()
  }, [loadFeaturedProducts])

  const formatPrice = useCallback((price: number) => {
    return `₱${price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
  }, [])

  // Memoized product click handler
  const handleProductClick = useCallback((productId: number) => {
    if (!user) {
      showWarning("Login Required", "Please login to view product details")
      setLoginModalOpen(true)
      return
    }
    navigate(`/product/${productId}`)
  }, [user, showWarning, setLoginModalOpen, navigate])

  // Memoized browse all handler
  const handleBrowseAll = useCallback(() => {
    if (!user) {
      showError("Login Required", "Please sign in or register to browse products.")
      setLoginModalOpen(true)
      return
    }

    if (!account) {
      showWarning("Wallet Required", "Please connect your MetaMask wallet to continue.")
      return
    }

    navigate("/browse")
  }, [user, account, showError, showWarning, setLoginModalOpen, navigate])

  // Memoized setup button handler
  const handleSetupClick = useCallback(() => {
    setShowMetaMaskSetup(true)
  }, [])

  // Memoized close setup handler
  const handleCloseSetup = useCallback(() => {
    setShowMetaMaskSetup(false)
  }, [])

  // Memoized create account handler
  const handleCreateAccount = useCallback(() => {
    handleCloseSetup()
    setTimeout(() => setRegisterModalOpen(true), 300)
  }, [handleCloseSetup, setRegisterModalOpen])



  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div
        className="relative"
        style={{
          backgroundImage: "url(/Caraga_State_University.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-12 lg:py-15 z-10">
          <div className="max-w-5xl mx-auto">
            {/* Animated Badge */}
            <div className="text-center animate-fade-in">
              <a
                href="https://www.carsu.edu.ph/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Caraga State University official website"
                className="inline-flex items-center backdrop-blur-md border-2 text-white px-6 py-3 rounded-full text-sm font-semibold mb-6 shadow-2xl hover:scale-105 hover:shadow-3xl transition-all duration-300 cursor-pointer"
                style={{ backgroundColor: "rgba(32, 135, 86, 0.6)", borderColor: "rgba(255, 255, 255, 0.3)" }}
              >
                <img src="/Caraga_State_University1.png" alt="CSU Logo" className="w-6 h-6 mr-3 object-contain" loading="lazy" />
                <span className="tracking-wide">Caraga State University</span>
              </a>
            </div>

            {/* Main Title with Gradient Effect */}
            <div className="text-center mb-8">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 leading-tight tracking-tight">
                <span
                  className="inline-block animate-slide-up"
                  style={{
                    color: "#eeece5ff",
                    textShadow:
                      "0 0 40px rgba(134, 239, 172, 0.8), 0 0 80px rgba(134, 239, 172, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  CSU
                </span>{" "}
                <span
                  className="inline-block animate-slide-up animation-delay-100"
                  style={{
                    color: "#eeece5ff",
                    textShadow:
                      "0 0 40px rgba(134, 239, 172, 0.8), 0 0 80px rgba(134, 239, 172, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  MARKETPLACE
                </span>
              </h1>
              <div
                className="h-1 w-32 mx-auto rounded-full"
                aria-hidden="true"
                style={{
                  background: "linear-gradient(90deg, transparent, #208756, #FFD700, #208756, transparent)",
                }}
              ></div>
            </div>

            {/* Subtitle with Enhanced Styling */}
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto text-center font-light leading-relaxed mb-2">
              <span className="font-semibold text-yellow-300">Blockchain-Powered</span> Student Commerce Platform
              <br />
              <span className="text-lg text-white/80">Buy, Sell & Rent with Complete Security and Transparency</span>
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap justify-center py-2 gap-4 mb-8">
              <div className="backdrop-blur-sm bg-white/10 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold">On-Chain Verification</span>
                </div>
              </div>
              <div className="backdrop-blur-sm bg-white/10 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold">Secure Transactions</span>
                </div>
              </div>
            </div>

                      {/* Call to Action Buttons with Enhanced Design */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="group relative text-white font-bold py-4 px-12 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 overflow-hidden"
                style={{ backgroundColor: "#208756" }}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#208756")}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Create Account
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="group relative text-white font-bold py-4 px-12 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 overflow-hidden"
                style={{ backgroundColor: "#208756" }}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#208756")}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Sign In
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Featured Products Section */}
        <div
          className="relative py-20 bg-white opacity-0"
          data-scroll-animate
          id="featured"
        >
          <div className="relative container mx-auto px-4">
            <div className="text-center mb-14 scroll-animate-up">
              <div className="inline-block px-4 py-2 bg-[#208756]/10 rounded-full mb-4 border-2 border-[#208756]/30 hover:border-[#208756] transition-all duration-300">
                <span className="text-[#208756] font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                  <Star className="w-4 h-4 fill-[#208756] text-[#208756]" /> Featured
                </span>
              </div>
              <h2 className="text-5xl font-black text-[#208756] mb-4 transition-all duration-500 hover:scale-105">Recently Posted</h2>
              <p className="text-[#208756]/70 max-w-2xl mx-auto text-lg">Discover the latest items from CSU students</p>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#208756" }} />
                  <p style={{ color: "#666" }}>Loading featured products...</p>
                </div>
              </div>
            ) : featuredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
                  {featuredProducts.map((product, index) => (
                    <div
                      key={product.product_id}
                      onClick={() => handleProductClick(product.product_id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleProductClick(product.product_id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${product.product_name} for ${formatPrice(product.price)}`}
                      className="scroll-animate-up stagger-item bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 border-gray-200 hover:border-[#208756] focus:outline-none focus:ring-2 focus:ring-[#208756] focus:ring-offset-2"
                      style={{
                        animationDelay: `${index * 200}ms`
                      }}
                    >
                      {/* Product Image */}
                      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                        <div className="absolute inset-0">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={
                                product.images[0].storage_path.startsWith("http")
                                  ? product.images[0].storage_path
                                  : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${product.images[0].storage_path}`
                              }
                              alt={product.product_name}
                              className="w-full h-full object-cover transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <Package className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Image Counter - Top Right */}
                        {product.images && product.images.length > 1 && (
                          <div className="absolute top-3 right-3 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1 border-opacity-50">
                            <span className="text-xs font-bold text-green-800">+{product.images.length - 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-3">
                        {/* Product Name */}
                        <h3 className="text-sm mt-5 font-medium text-gray-900 line-clamp-2 mb-1" style={{ minHeight: '40px' }}>
                          {product.product_name}
                        </h3>

                        {/* Product Description */}
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                          {product.description}
                        </p>

                        {/* Price & Listing Type Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-lg font-bold" style={{ color: '#208756' }}>
                            {formatPrice(product.price)}
                          </p>
                          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
                            product.listing_type === 'FOR_SALE' 
                              ? 'bg-[#208756]' 
                              : product.listing_type === 'FOR_RENT'
                              ? 'bg-blue-600'
                              : 'bg-purple-600'
                          }`}>
                            {product.listing_type === 'FOR_SALE' ? 'For Sale' : product.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                          </div>
                        </div>

                        {/* Seller Info */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <div className="flex-shrink-0">
                            {product.seller?.profile_picture ? (
                              <img
                                src={product.seller.profile_picture.startsWith('http') 
                                  ? product.seller.profile_picture 
                                  : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-pictures/${product.seller.profile_picture}`
                                }
                                alt={`${product.seller?.first_name} ${product.seller?.last_name}`}
                                className="w-8 h-8 rounded-full object-cover border-2 border-[#208756]"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-[#208756] to-[#1a6d45] rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {product.seller?.first_name} {product.seller?.last_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {product.seller?.phone_number && (
                                <Phone className="w-3 h-3 text-gray-400" />
                              )}
                              <p className="text-xs text-gray-500 truncate">
                                {product.seller?.phone_number || product.seller?.username}
                              </p>
                            </div>
                          </div>
                        </div>
                    
                        {/* Seller Rating */}
                        <div className="flex items-center space-x-1 mt-0.5 mb-2 mt-3">
                          <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          {(product.seller?.average_seller_rating ?? 0) > 0 && (product.seller?.total_reviews_received ?? 0) > 0 ? (
                            <>
                              <span className="text-xs font-medium text-gray-700">
                                {(product.seller?.average_seller_rating || 0).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({product.seller?.total_reviews_received || 0})
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">No ratings ({product.seller?.total_reviews_received || 0})</span>
                          )}
                        </div>      
                        
                        {/* Product Reviews & Sold Count */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <div>
                            No reviews
                          </div>
                          {/* Sold Count Badge - Only for FOR_SALE */}
                          {product.listing_type === 'FOR_SALE' && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                              </svg>
                              <span className="font-medium text-green-600">{product.sold_count} sold</span>
                            </div>
                          )}
                        </div>

                        {/* Pickup Location for Rental Products */}
                        {product.listing_type === 'FOR_RENT' && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0 mt-0.5" />
                            <p className="truncate">{product.pickup_location || 'N/A'}</p>
                          </div>
                        )}

                        {/* Rental Duration for FOR_RENT */}
                        {product.listing_type === 'FOR_RENT' && (
                          <div className="text-xs text-gray-500 mb-2">
                            Rent Duration: {product.rent_duration || 'N/A'}
                          </div>
                        )}

                        {/* Service Schedule & Meetup Location for SERVICE */}
                        {product.listing_type === 'SERVICE' && (
                          <div className="space-y-1 mb-2">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0 mt-0.5" />
                              <p className="truncate">{product.meetup_location || 'N/A'}</p>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Schedule: {product.service_schedule || 'N/A'}
                            </div>
                          </div>
                        )}

                        {/* Location Info & Sold Count - Only for FOR_SALE */}
                        {product.listing_type === 'FOR_SALE' && (
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            {/* Pickup Location */}
                            <div className="flex items-center space-x-1 flex-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-[#208756] flex-shrink-0 mt-0.5" />
                              <p className="truncate">{product.pickup_location || 'N/A'}</p>
                            </div>
                            {/* Sold Count */}
                            <div className="flex-shrink-0 ml-2">
                              <span className="text-green-600 font-bold">{product.sold_count || 0}</span> sold
                            </div>
                          </div>
                        )}

                        {/* Quantity Available - Only for FOR_SALE */}
                        {product.listing_type === 'FOR_SALE' && (
                          <div className="text-xs text-gray-500 mt-2">
                            Quantity Available: {product.quantity || 0}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Browse All Products Button */}
                <div className="flex justify-center mt-8 scroll-animate-up">
                  <button
                    onClick={handleBrowseAll}
                    aria-label="Browse all products on CSU Marketplace"
                    className="group relative bg-[#208756] hover:bg-[#1a6d45] text-white hover:text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg hover:shadow-2xl duration-300 border-2 border-[#208756] hover:border-[#1a6d45] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#208756]"
                  >
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Browse All Products
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/20">
                <p className="text-white text-lg font-medium">No products available yet</p>
                <p className="text-white/80 mt-2">Check back soon or browse the marketplace for more items</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works Section - Modern 4-Step Guide */}
      <div className="relative py-24 bg-gradient-to-b from-white via-blue-50/30 to-white" id="guide" data-scroll-animate>
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-20 scroll-animate-up">
            <div className="inline-block px-4 py-2 bg-[#208756]/10 rounded-full mb-3 border border-[#208756]/20 backdrop-blur-sm">
              <span className="text-[#208756] font-semibold text-sm flex items-center justify-center gap-2 uppercase tracking-wide">
                <Zap className="w-4 h-4" /> How It Works
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#208756] mb-4">Get Started in 4 Simple Steps</h2>
            <p className="text-[#208756]/70 max-w-2xl mx-auto text-lg">Experience secure campus trading with blockchain verification</p>
          </div>

          {/* 4-Step Guide - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Step 1 */}
            <div className="scroll-animate-left stagger-item">
              <div className="relative group h-full">
                {/* Step Card */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  {/* Step Number Circle */}
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md group-hover:scale-110 transition-transform duration-300">
                    1
                  </div>
                  
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-[#208756] mb-3 text-center">Create Account</h3>
                  <p className="text-[#208756]/70 text-center text-sm flex-grow">Sign up with your CSU email and connect your MetaMask wallet securely</p>
                  
                  {/* Connector Line for larger screens */}
                  <div className="hidden lg:block absolute -right-3 top-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="scroll-animate-up stagger-item">
              <div className="relative group h-full">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md group-hover:scale-110 transition-transform duration-300">
                    2
                  </div>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <ShoppingBag className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#208756] mb-3 text-center">Browse or Post</h3>
                  <p className="text-[#208756]/70 text-center text-sm flex-grow">Discover products from campus or create your own listings instantly</p>
                  <div className="hidden lg:block absolute -right-3 top-1/2 w-6 h-0.5 bg-gradient-to-r from-amber-500 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="scroll-animate-up stagger-item">
              <div className="relative group h-full">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md group-hover:scale-110 transition-transform duration-300">
                    3
                  </div>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#208756] mb-3 text-center">Transact Securely</h3>
                  <p className="text-[#208756]/70 text-center text-sm flex-grow">Complete transactions with blockchain-backed security and transparency</p>
                  <div className="hidden lg:block absolute -right-3 top-1/2 w-6 h-0.5 bg-gradient-to-r from-purple-500 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="scroll-animate-right stagger-item">
              <div className="relative group h-full">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md group-hover:scale-110 transition-transform duration-300">
                    4
                  </div>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[#208756] mb-3 text-center">Track & Verify</h3>
                  <p className="text-[#208756]/70 text-center text-sm flex-grow">Access your complete transaction history on the blockchain anytime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features Below Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="scroll-animate-left stagger-item bg-gradient-to-br from-[#208756]/5 to-transparent rounded-2xl p-6 border border-[#208756]/10">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-[#208756]/10 rounded-lg">
                  <Users className="w-5 h-5 text-[#208756]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#208756] mb-1">Campus Community</h4>
                  <p className="text-[#208756]/70 text-sm">Buy and sell exclusively within the CSU community</p>
                </div>
              </div>
            </div>
            
            <div className="scroll-animate-up stagger-item bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl p-6 border border-blue-200/30">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-[#208756] mb-1">On-Campus Meetups</h4>
                  <p className="text-[#208756]/70 text-sm">Meet safely at designated campus locations</p>
                </div>
              </div>
            </div>
            
            <div className="scroll-animate-right stagger-item bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl p-6 border border-emerald-200/30">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100/50 rounded-lg">
                  <Star className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-[#208756] mb-1">Verified Transactions</h4>
                  <p className="text-[#208756]/70 text-sm">All trades recorded immutably on blockchain</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Setup Guide Section */}
      <div className="relative py-24 bg-gradient-to-b from-white via-blue-50/20 to-white scroll-animate-up" data-scroll-animate>
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-2 bg-[#208756]/10 rounded-full mb-4 border border-[#208756]/20">
              <span className="text-[#208756] font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4" /> Quick Setup
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#208756] mb-4">Everything You Need to Know</h2>
            <p className="text-[#208756]/70 max-w-2xl mx-auto text-lg">
              Complete beginner's guide to setting up your CSU Marketplace account and getting free test cryptocurrency
            </p>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* What You'll Need */}
            <div className="scroll-animate-left stagger-item bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] h-full transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-[#208756]">What You'll Need</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Web Browser</p>
                    <p className="text-[#208756]/60 text-sm">Chrome, Firefox, Edge, or Brave</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Valid CSU Email</p>
                    <p className="text-[#208756]/60 text-sm">Must end in @carsu.edu.ph</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">MetaMask Wallet</p>
                    <p className="text-[#208756]/60 text-sm">Free digital wallet (see setup below)</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-1">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Free Test ETH</p>
                    <p className="text-[#208756]/60 text-sm">From faucets (10-30 mins to receive)</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Key Benefits */}
            <div className="scroll-animate-right stagger-item bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] h-full transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-[#208756]">Why Blockchain?</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-600 font-bold text-lg mt-1">•</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Immutable Records</p>
                    <p className="text-[#208756]/60 text-sm">All transactions permanently recorded</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-600 font-bold text-lg mt-1">•</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Smart Contract Security</p>
                    <p className="text-[#208756]/60 text-sm">Funds held safely until confirmed</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-600 font-bold text-lg mt-1">•</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Complete Transparency</p>
                    <p className="text-[#208756]/60 text-sm">Every transaction is verifiable</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-600 font-bold text-lg mt-1">•</span>
                  <div>
                    <p className="font-semibold text-[#208756]">No Real Money Required</p>
                    <p className="text-[#208756]/60 text-sm">Test ETH is completely free</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Step-by-Step Timeline */}
          <div className="bg-gradient-to-r from-[#208756]/5 via-transparent to-[#208756]/5 rounded-2xl border border-[#208756]/20 p-8 md:p-12">
            <h3 className="text-2xl font-bold text-[#208756] mb-8 text-center">Complete Setup in 3 Easy Steps</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Timeline Step 1 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
                    <Clock className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-[#208756] mb-2">Step 1: Install MetaMask</h4>
                  <p className="text-[#208756]/70 text-sm mb-2">Download & create wallet</p>
                  <p className="text-[#208756]/50 text-xs font-semibold">~5-10 minutes</p>
                </div>
                {/* Connector line */}
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-transparent"></div>
              </div>

              {/* Timeline Step 2 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
                    <DollarSign className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-[#208756] mb-2">Step 2: Get Free ETH</h4>
                  <p className="text-[#208756]/70 text-sm mb-2">Claim from faucet</p>
                  <p className="text-[#208756]/50 text-xs font-semibold">~10-30 minutes wait</p>
                </div>
                {/* Connector line */}
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-transparent"></div>
              </div>

              {/* Timeline Step 3 */}
              <div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-[#208756] mb-2">Step 3: Start Trading</h4>
                  <p className="text-[#208756]/70 text-sm mb-2">Create account & connect</p>
                  <p className="text-[#208756]/50 text-xs font-semibold">~2-5 minutes</p>
                </div>
              </div>
            </div>
            <div className="mt-10 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-center text-[#208756] font-semibold">
                <Clock className="w-4 h-4 inline mr-1" /> <span className="font-bold">Total Time:</span> 30-50 minutes from start to first transaction
              </p>
            </div>

            {/* Quick Start Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleSetupClick}
                aria-label="View complete MetaMask setup guide"
                className="bg-gradient-to-r from-[#208756] to-[#1a6d45] hover:from-[#1a6d45] hover:to-[#0f4a2a] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#208756]"
              >
                <Zap className="w-5 h-5" />
                View Complete Setup Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMetaMaskSetup && (
        <div className="relative bg-gradient-to-br from-[#208756]/5 via-white to-[#208756]/5 py-20">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-2xl p-12 shadow-2xl">
              {/* Header with interactive progress */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-4xl font-bold text-[#208756]">Complete MetaMask Setup</h3>
                  <button
                    onClick={handleCloseSetup}
                    aria-label="Close setup guide"
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>

                {/* Progress indicator */}
                <div className="bg-white rounded-lg p-4 border border-[#208756]/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[#208756]">Setup Progress</p>
                    <span className="text-xs bg-[#208756] text-white px-3 py-1 rounded-full">3 Steps</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#208756] to-[#1a6d45] w-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Steps */}
              <div className="space-y-6 mb-12">
                {/* Step 1 */}
                <div className="bg-white rounded-2xl border-2 border-[#208756]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <div className="bg-gradient-to-r from-[#208756]/10 to-transparent p-6 border-b-2 border-[#208756]/20">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#208756] to-[#1a6d45] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-[#208756] mb-1">Install MetaMask Extension</h4>
                        <p className="text-[#208756]/70">Download and set up your digital wallet</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <p className="text-[#208756]/80 mb-4">
                        MetaMask is your secure digital wallet for blockchain transactions. Follow these steps:
                      </p>
                      <ol className="space-y-3 text-[#208756]/80">
                        <li className="flex gap-3 items-start">
                          <span className="font-bold text-[#208756] bg-[#208756]/10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm">1</span>
                          <span>Visit <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-[#208756] font-bold hover:underline">metamask.io</a> in your web browser</span>
                        </li>
                        <li className="flex gap-3 items-start">
                          <span className="font-bold text-[#208756] bg-[#208756]/10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm">2</span>
                          <span>Click "Download" and select your browser (Chrome, Firefox, Edge, or Brave)</span>
                        </li>
                        <li className="flex gap-3 items-start">
                          <span className="font-bold text-[#208756] bg-[#208756]/10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm">3</span>
                          <span>Click "Add to [Browser]" and confirm the installation</span>
                        </li>
                        <li className="flex gap-3 items-start">
                          <span className="font-bold text-[#208756] bg-[#208756]/10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm">4</span>
                          <span>Create a new wallet with a strong password and save your seed phrase securely</span>
                        </li>
                      </ol>
                    </div>
                    <a
                      href="https://metamask.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#208756] hover:bg-[#1a6d45] text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Download MetaMask
                    </a>
                  </div>
                </div>

                {/* Step 2 - Get Free Test ETH */}
                <div className="bg-white rounded-2xl border-2 border-[#FFD700]/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group bg-gradient-to-br from-white to-[#FFD700]/5">
                  <div className="bg-gradient-to-r from-[#FFD700]/20 to-transparent p-6 border-b-2 border-[#FFD700]/30">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#FFD700] to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-[#208756] mb-1">Get Free Test ETH</h4>
                        <p className="text-[#208756]/70">Fund your wallet from a faucet</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-[#208756]/80 mb-3 font-semibold">
                      Get free Sepolia ETH (test cryptocurrency) from these faucets. No real money required!
                    </p>
                    <p className="text-[#208756]/70 text-sm mb-6">
                      You need Sepolia ETH to pay for gas fees when making transactions. These are completely free faucets that give you test coins.
                    </p>
                    
                    {/* Faucet Options */}
                    <div className="space-y-3 mb-6">
                      {/* Alchemy Faucet - Recommended */}
                      <a
                        href="https://www.alchemy.com/faucets/ethereum-sepolia"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gradient-to-r from-blue-500/10 to-transparent border-2 border-blue-400 hover:border-blue-600 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:bg-blue-50/50 group/faucet"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-[#208756] text-lg group-hover/faucet:text-[#1a6d45]">Alchemy Sepolia Faucet</p>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">RECOMMENDED</span>
                            </div>
                            <p className="text-sm text-[#208756]/60">✓ Instant ETH • ✓ No signup • ✓ 0.5 ETH per claim</p>
                          </div>
                          <svg className="w-6 h-6 text-blue-600 group-hover/faucet:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </a>

                      {/* Sepolia Mine Faucet */}
                      <a
                        href="https://sepolia-faucet.pk910.de/#/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gradient-to-r from-amber-500/10 to-transparent border-2 border-amber-400 hover:border-amber-600 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:bg-amber-50/50 group/faucet"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-[#208756] text-lg group-hover/faucet:text-[#1a6d45] mb-1">Sepolia Mine Faucet</p>
                            <p className="text-sm text-[#208756]/60">✓ Higher limits • ✓ Email signup • ✓ Up to 100 ETH</p>
                          </div>
                          <svg className="w-6 h-6 text-amber-600 group-hover/faucet:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </a>

                      {/* Google Cloud Faucet */}
                      <a
                        href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gradient-to-r from-purple-500/10 to-transparent border-2 border-purple-400 hover:border-purple-600 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:bg-purple-50/50 group/faucet"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-[#208756] text-lg group-hover/faucet:text-[#1a6d45] mb-1">Google Cloud Faucet</p>
                            <p className="text-sm text-[#208756]/60">✓ Google account required • ✓ Quick ETH • ✓ Reliable</p>
                          </div>
                          <svg className="w-6 h-6 text-purple-600 group-hover/faucet:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </a>
                    </div>

                    {/* How to Use Guide */}
                    <div className="bg-[#208756]/5 border-l-4 border-l-[#208756] rounded-lg p-4 mb-6">
                      <p className="text-sm text-[#208756] font-semibold mb-3">How to claim free ETH:</p>
                      <ol className="text-sm text-[#208756]/70 space-y-1 list-decimal list-inside">
                        <li>Copy your wallet address from MetaMask</li>
                        <li>Paste it into the faucet website</li>
                        <li>Click "Send me ETH" or similar button</li>
                        <li>Wait 10-30 minutes for it to arrive</li>
                        <li>Check your MetaMask balance to confirm</li>
                      </ol>
                    </div>

                    <div className="bg-orange-50 border-l-4 border-l-orange-500 rounded-lg p-4">
                      <p className="text-sm text-orange-800 font-medium mb-2">
                        <strong>Timer: Typical Wait Time:</strong> 10-30 minutes depending on network congestion
                      </p>
                      <p className="text-sm text-orange-800">
                        <strong>Tip: Pro Tip:</strong> If one faucet is slow, try another. You can claim from multiple faucets to get more ETH.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-2xl border-2 border-[#208756]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <div className="bg-gradient-to-r from-[#208756]/10 to-transparent p-6 border-b-2 border-[#208756]/20">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#208756] to-[#1a6d45] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-[#208756] mb-1">Connect to CSU Marketplace</h4>
                        <p className="text-[#208756]/70">Start buying, selling, and trading</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-[#208756]/80 mb-6">
                      Your wallet is ready! Create your CSU Marketplace account and connect your MetaMask wallet to start trading securely on the blockchain.
                    </p>
                    <button
                      onClick={handleCreateAccount}
                      aria-label="Create account and connect MetaMask wallet"
                      className="w-full bg-gradient-to-r from-[#208756] to-[#1a6d45] hover:from-[#1a6d45] hover:to-[#0f4a2a] text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#208756]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Create Account & Connect Wallet
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 shadow-lg">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-800 text-lg mb-3">Security Notice</h4>
                    <ul className="space-y-2 text-red-700/90 text-sm">
                      <li className="flex gap-2">
                        <span className="font-bold text-red-600">•</span>
                        <span>Never share your seed phrase with anyone - not even CSU Marketplace staff</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-red-600">•</span>
                        <span>Never share your private keys</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-red-600">•</span>
                        <span>CSU Marketplace will never ask for your seed phrase or private keys</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-red-600">•</span>
                        <span>Only use official Sepolia faucets from the links above</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Requirements & Important Information Section */}
      <div className="relative py-24 bg-gradient-to-b from-blue-50 via-white to-emerald-50" data-scroll-animate>
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-[#208756]/10 rounded-full mb-4 border border-[#208756]/20">
              <span className="text-[#208756] font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4" /> Important Info
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#208756] mb-4">System Requirements & Safety</h2>
            <p className="text-[#208756]/70 max-w-2xl mx-auto text-lg">
              Everything you need to know before getting started
            </p>
          </div>

          {/* Requirements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* System Requirements */}
            <div className="scroll-animate-left stagger-item bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] h-full transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-[#208756]">System Requirements</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Modern Web Browser</p>
                    <p className="text-[#208756]/60 text-sm">Chrome, Firefox, Edge, or Brave (latest versions)</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Stable Internet Connection</p>
                    <p className="text-[#208756]/60 text-sm">Required for blockchain transactions</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">MetaMask Extension</p>
                    <p className="text-[#208756]/60 text-sm">Installed and configured (see setup above)</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-blue-600 font-bold text-lg mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-[#208756]">Email Account</p>
                    <p className="text-[#208756]/60 text-sm">CSU email required (@carsu.edu.ph)</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Security Best Practices */}
            <div className="scroll-animate-right stagger-item bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#208756] h-full transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-[#208756]">Security Best Practices</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#208756]">Protect Your Seed Phrase</p>
                    <p className="text-[#208756]/60 text-sm">Never share it - not even with CSU staff</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#208756]">Use Official Links Only</p>
                    <p className="text-[#208756]/60 text-sm">Bookmark faucets; don't click unknown links</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#208756]">Keep Password Strong</p>
                    <p className="text-[#208756]/60 text-sm">12+ characters with mixed case and numbers</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#208756]">Enable 2FA</p>
                    <p className="text-[#208756]/60 text-sm">Two-factor authentication on your email</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Common Concerns & Solutions */}
          <div className="bg-gradient-to-r from-[#208756]/5 via-transparent to-[#208756]/5 border border-[#208756]/20 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-[#208756] mb-8">Common Concerns & Solutions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Concern 1 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-[#208756] mb-2 flex items-center gap-2">
                  <span className="font-bold">Q:</span> Is my data safe?
                </h4>
                <p className="text-[#208756]/70 text-sm">
                  Yes. Your transactions are on blockchain (immutable), and account data is encrypted on Supabase with RLS (Row Level Security) policies.
                </p>
              </div>

              {/* Concern 2 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-[#208756] mb-2 flex items-center gap-2">
                  <span className="font-bold">Q:</span> What if I lose my MetaMask password?
                </h4>
                <p className="text-[#208756]/70 text-sm">
                  You can recover your wallet using your seed phrase. Write it down safely. If lost, your wallet is unrecoverable.
                </p>
              </div>

              {/* Concern 3 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-[#208756] mb-2 flex items-center gap-2">
                  <span className="font-bold">Q:</span> Can I use Sepolia on other platforms?
                </h4>
                <p className="text-[#208756]/70 text-sm">
                  Yes! Sepolia test ETH works on any Ethereum-compatible platform on the Sepolia testnet.
                </p>
              </div>

              {/* Concern 4 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-[#208756] mb-2 flex items-center gap-2">
                  <span className="font-bold">Q:</span> What happens after Sepolia?
                </h4>
                <p className="text-[#208756]/70 text-sm">
                  Eventually, CSU Marketplace may move to mainnet. Your accounts and transaction history will be preserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs Section */}
      <div
        className="relative py-20 bg-gray-50"
        id="faqs"
      >
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-10 scroll-animate-up">
            <div className="inline-block px-4 py-2 bg-[#208756]/10 rounded-full mb-4 border-2 border-[#208756]/30 hover:border-[#208756] transition-all duration-300">
              <span className="text-[#208756] font-bold text-sm uppercase tracking-widest">FAQ</span>
            </div>
            <h2 className="text-5xl font-black text-[#208756] mb-4 transition-all duration-500 hover:scale-105">FAQs</h2>
            <p className="text-[#208756]/70 max-w-2xl mx-auto text-lg">
              Quick answers to common questions about CSU Marketplace
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {/* FAQ 1 */}
            <details className="bg-white border-t-4 border-t-[#208756] hover:border-t-[#208756]/70 rounded-lg p-6 hover:shadow-lg transition-all shadow-md group scroll-animate-up stagger-item">
              <summary className="font-bold text-lg text-[#208756] cursor-pointer list-none flex items-center justify-between hover:text-[#208756]/70 transition-colors duration-300">
                <span className="flex items-center">
                  <span className="w-8 h-8 bg-[#208756] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold group-open:bg-[#208756]/80 group-open:text-white transition-all duration-300">
                    1
                  </span>
                  Why do I need MetaMask and Sepolia ETH?
                </span>
                <ChevronDown className="w-5 h-5 text-[#208756] transform group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-[#208756]/70 pl-11">
                <p className="mb-2 font-medium">
                  CSU Marketplace uses blockchain technology for secure, transparent transactions. MetaMask is your digital wallet that:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Stores your transaction history on the blockchain</li>
                  <li>Enables smart contract interactions for transaction security</li>
                  <li>Provides cryptographic security for your account</li>
                  <li>Requires Sepolia ETH (test cryptocurrency) to pay network fees</li>
                </ul>
                <p className="mt-2 text-sm bg-blue-50 border-l-4 border-l-[#208756] rounded p-3">
                  <strong className="text-[#208756]">Note:</strong> Sepolia is a test network, so the ETH has no real-world value—it's free from
                  faucets for testing.
                </p>
              </div>
            </details>

            {/* FAQ 2 */}
            <details className="bg-white border-t-4 border-t-[#208756] hover:border-t-[#208756]/70 rounded-lg p-6 hover:shadow-lg transition-all shadow-md group scroll-animate-up stagger-item">
              <summary className="font-bold text-lg text-[#208756] cursor-pointer list-none flex items-center justify-between hover:text-[#208756]/70 transition-colors duration-300">
                <span className="flex items-center">
                  <span className="w-8 h-8 bg-[#208756] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold group-open:bg-[#208756]/80 group-open:text-white transition-all duration-300">
                    2
                  </span>
                  How long does it take to get Sepolia ETH from faucets?
                </span>
                <ChevronDown className="w-5 h-5 text-[#208756] transform group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-[#208756]/70 pl-11">
                <p className="mb-2 font-medium">Faucet processing times vary:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>
                    <strong className="text-[#208756]">Minimum wait:</strong> 10-15 minutes after submitting faucet request
                  </li>
                  <li>
                    <strong className="text-[#208756]">Average time:</strong> 20-30 minutes during normal network conditions
                  </li>
                  <li>
                    <strong className="text-[#208756]">Peak times:</strong> Up to 1 hour during high network congestion
                  </li>
                </ul>
                <p className="mt-3 bg-blue-50 border-l-4 border-l-[#208756] rounded p-3 text-sm">
                  <strong className="text-[#208756]">Important:</strong> Check your MetaMask balance before creating an account. You need Sepolia ETH to complete transactions.
                </p>
              </div>
            </details>

            {/* FAQ 3 */}
            <details className="bg-white border-t-4 border-t-[#208756] hover:border-t-[#208756]/70 rounded-lg p-6 hover:shadow-lg transition-all shadow-md group scroll-animate-up stagger-item">
              <summary className="font-bold text-lg text-[#208756] cursor-pointer list-none flex items-center justify-between hover:text-[#208756]/70 transition-colors duration-300">
                <span className="flex items-center">
                  <span className="w-8 h-8 bg-[#208756] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold group-open:bg-[#208756]/80 group-open:text-white transition-all duration-300">
                    3
                  </span>
                  What happens if I try to sign up without a connected wallet?
                </span>
                <ChevronDown className="w-5 h-5 text-[#208756] transform group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-[#208756]/70 pl-11">
                <p className="mb-2 font-medium">The system will automatically:</p>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Display an informational modal explaining the MetaMask requirement</li>
                  <li>Guide you to setup MetaMask and get test ETH</li>
                  <li>Block registration/login until you connect a MetaMask wallet with Sepolia ETH</li>
                  <li>Provide step-by-step instructions for configuration</li>
                </ol>
                <p className="mt-3 bg-blue-50 border-l-4 border-l-[#208756] rounded p-3 text-sm font-medium text-[#208756]">
                  A properly configured MetaMask wallet is required for all transactions.
                </p>
              </div>
            </details>

            {/* FAQ 4 */}
            <details className="bg-white border-t-4 border-t-[#208756] hover:border-t-[#FFD700] rounded-lg p-6 hover:shadow-lg transition-all shadow-md group scroll-animate-up stagger-item">
              <summary className="font-bold text-lg text-[#208756] cursor-pointer list-none flex items-center justify-between hover:text-[#FFD700] transition-colors duration-300">
                <span className="flex items-center">
                  <span className="w-8 h-8 bg-[#208756] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold group-open:bg-[#FFD700] group-open:text-[#208756] transition-all duration-300">
                    4
                  </span>
                  How do I know if my transaction is secure?
                </span>
                <ChevronDown className="w-5 h-5 text-[#208756] transform group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-[#208756]/70 pl-11">
                <p className="mb-3 font-medium">CSU Marketplace provides multiple security layers:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-[#FFD700] font-bold mr-2">•</span>
                    <div>
                      <strong className="text-[#208756]">Smart Contract Escrow:</strong> Funds held securely until delivery confirmed
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#FFD700] font-bold mr-2">•</span>
                    <div>
                      <strong className="text-[#208756]">Blockchain Transparency:</strong> All transactions recorded on immutable ledger
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#FFD700] font-bold mr-2">•</span>
                    <div>
                      <strong className="text-[#208756]">Verified Users Only:</strong> Email verification and student ID required
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#FFD700] font-bold mr-2">•</span>
                    <div>
                      <strong className="text-[#208756]">Rating System:</strong> Check seller/buyer ratings before transactions
                    </div>
                  </li>
                </ul>
              </div>
            </details>

            {/* FAQ 5 */}
            <details className="bg-white border-t-4 border-t-[#208756] hover:border-t-[#FFD700] rounded-lg p-6 hover:shadow-lg transition-all shadow-md group scroll-animate-up stagger-item">
              <summary className="font-bold text-lg text-[#208756] cursor-pointer list-none flex items-center justify-between hover:text-[#FFD700] transition-colors duration-300">
                <span className="flex items-center">
                  <span className="w-8 h-8 bg-[#208756] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold group-open:bg-[#FFD700] group-open:text-[#208756] transition-all duration-300">
                    5
                  </span>
                  What are gas fees and how much do they cost?
                </span>
                <ChevronDown className="w-5 h-5 text-[#208756] transform group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-[#208756]/70 pl-11">
                <p className="mb-2 font-medium">
                  Gas fees are small network fees paid to Ethereum miners for processing transactions:
                </p>
                <ul className="list-disc pl-5 space-y-1 mb-3 text-sm">
                  <li>
                    <strong className="text-[#208756]">What they cover:</strong> Computing power to execute smart contracts
                  </li>
                  <li>
                    <strong className="text-[#208756]">Typical cost:</strong> Very small amount of Sepolia ETH (fraction of test ETH)
                  </li>
                  <li>
                    <strong className="text-[#208756]">When charged:</strong> Every blockchain transaction (buy, sell, confirm delivery)
                  </li>
                  <li>
                    <strong className="text-[#208756]">Who pays:</strong> Transaction initiator (buyer or seller depending on action)
                  </li>
                </ul>
                <p className="bg-[#208756]/5 border-l-2 border-l-[#FFD700] rounded p-3 text-sm">
                  <strong className="text-[#208756]">Good News:</strong> Since we use Sepolia testnet, gas fees cost test ETH (no real money)! Get
                  free test ETH from faucets anytime.
                </p>
              </div>
            </details>

            {/* FAQ 6 */}
            <details className="bg-white border-t-4 border-t-[#208756] hover:border-t-[#FFD700] rounded-lg p-6 hover:shadow-lg transition-all shadow-md group scroll-animate-up stagger-item">
              <summary className="font-bold text-lg text-[#208756] cursor-pointer list-none flex items-center justify-between hover:text-[#FFD700] transition-colors duration-300">
                <span className="flex items-center">
                  <span className="w-8 h-8 bg-[#208756] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold group-open:bg-[#FFD700] group-open:text-[#208756] transition-all duration-300">
                    6
                  </span>
                  Can I use CSU Marketplace without being a CSU student?
                </span>
                <ChevronDown className="w-5 h-5 text-[#208756] transform group-open:rotate-180 transition-transform duration-300" />
              </summary>
              <div className="mt-4 text-[#208756]/70 pl-11">
                <p className="font-semibold text-red-600 mb-2">
                  No. CSU Marketplace is exclusively for Caraga State University students.
                </p>
                <p className="mb-2 font-medium">Requirements:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Valid CSU student email address (@carsu.edu.ph)</li>
                  <li>Valid student ID number</li>
                  <li>Email verification required</li>
                  <li>Admin approval for all listings</li>
                </ul>
                <p className="mt-3 text-sm bg-[#208756]/5 border-l-2 border-l-[#FFD700] rounded p-3">
                  This policy ensures a safe, trusted environment exclusively for the CSU community.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
export default LandingPage
