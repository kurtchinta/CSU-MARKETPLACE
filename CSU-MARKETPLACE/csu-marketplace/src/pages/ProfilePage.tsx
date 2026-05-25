import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { useWallet } from '../hooks/useWallet';
import { uploadProfilePicture } from '../services/profilePictureService';
import { supabase } from '../lib/supabase';
import Footer from '../components/Footer';

interface ProfileData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  gender: string;
  id_number: string;
  phone_number: string;
  department: string;
  year_level: string;
  bio?: string;
  wallet_address?: string;
  profile_picture_url?: string;
}

const ProfilePage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showModal, showSuccess, showError } = useModal();
  const { account, isConnected: walletConnected, connectWallet, disconnectWallet, formatAddress } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Profile - CSU Marketplace';
  }, []);
  
  // Form state
  const [profileData, setProfileData] = useState<ProfileData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    gender: '',
    id_number: '',
    phone_number: '',
    department: '',
    year_level: '',
    bio: '',
    wallet_address: '',
    profile_picture_url: ''
  });
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string>('');

  // Statistics state
  const [statistics, setStatistics] = useState({
    productsPosted: 0,
    productsSold: 0,
    ordersAsBuyer: 0,
    ordersAsSeller: 0,
    totalRevenue: 0
  });

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        email: profile.email || '',
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        gender: profile.gender || '',
        id_number: profile.id_number || '',
        phone_number: profile.phone_number || '',
        department: profile.department || '',
        year_level: profile.year_level || '',
        bio: profile.bio || '',
        wallet_address: profile.wallet_address || '',
        profile_picture_url: profile.profile_picture_url || ''
      });
      setPreviewImage(profile.profile_picture_url || '');
    }
  }, [profile, user?.id]);

  // Fetch statistics
  const fetchStatistics = async () => {
    if (!user?.id || !supabase) {
      console.log('⚠️ User or supabase not available');
      return;
    }

    try {
      console.log('📊 Fetching statistics for user:', user.id);

      // Fetch products posted (APPROVED only)
      const { data: productsData } = await supabase
        .from('products')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('status', 'APPROVED');
      const productsPosted = productsData?.length || 0;

      // Fetch products sold (COMPLETED transactions as seller)
      const { data: soldData } = await supabase
        .from('transactions')
        .select('product_id')
        .eq('seller_id', user.id)
        .eq('transaction_status', 'COMPLETED');
      const productsSold = soldData?.length || 0;

      // Fetch orders as buyer (COMPLETED transactions as buyer)
      const { data: buyerOrdersData } = await supabase
        .from('transactions')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('transaction_status', 'COMPLETED');
      const ordersAsBuyer = buyerOrdersData?.length || 0;

      // Fetch orders as seller (COMPLETED transactions as seller)
      const { data: sellerOrdersData } = await supabase
        .from('transactions')
        .select('id')
        .eq('seller_id', user.id)
        .eq('transaction_status', 'COMPLETED');
      const ordersAsSeller = sellerOrdersData?.length || 0;

      // Fetch total revenue (sum of product prices for COMPLETED sales)
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('product_id')
        .eq('seller_id', user.id)
        .eq('transaction_status', 'COMPLETED');

      let totalRevenue = 0;
      if (revenueData && revenueData.length > 0) {
        const productIds = revenueData.map((tx: any) => tx.product_id);
        const { data: pricesData } = await supabase
          .from('products')
          .select('price')
          .in('product_id', productIds);
        
        if (pricesData) {
          totalRevenue = pricesData.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
        }
      }

      console.log('✅ Statistics fetched:', {
        productsPosted,
        productsSold,
        ordersAsBuyer,
        ordersAsSeller,
        totalRevenue
      });

      setStatistics({
        productsPosted,
        productsSold,
        ordersAsBuyer,
        ordersAsSeller,
        totalRevenue
      });
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
    }
  };

  // Load statistics when user changes
  useEffect(() => {
    if (user?.id) {
      fetchStatistics();
    }
  }, [user?.id]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profileData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (profileData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!profileData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!profileData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!profileData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }

    if (!profileData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!profileData.year_level.trim()) {
      newErrors.year_level = 'Year level is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!user) {
      showModal('Error', 'You must be logged in to update your profile');
      return;
    }

    if (!validateForm()) {
      showModal('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setSaving(true);

    try {
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { error } = await supabase
        .from('users')
        .update({
          username: profileData.username,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          gender: profileData.gender,
          phone_number: profileData.phone_number,
          department: profileData.department,
          year_level: profileData.year_level,
          bio: profileData.bio || null,
          wallet_address: profileData.wallet_address || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error updating profile:', error);
        showModal('Error', error.message);
        return;
      }

      showModal('Success', 'Your profile has been updated successfully!');
      setIsEditing(false);
      window.location.reload();
      
    } catch (error: any) {
      console.error('❌ Exception updating profile:', error);
      showModal('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      
      // Wait a bit for the wallet state to update
      setTimeout(async () => {
        if (account && account !== 'Not connected' && user) {
          // Update local state
          setProfileData(prev => ({
            ...prev,
            wallet_address: account
          }));

          // Save to Supabase
          const { error } = await supabase!
            .from('users')
            .update({
              wallet_address: account,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('❌ Error saving wallet address:', error);
            showError('Save Failed', 'Wallet connected but failed to save to database.');
            return;
          }

          console.log('✅ Wallet address saved to database:', account);
          showSuccess('Wallet Connected', `Wallet ${formatAddress(account)} connected and saved successfully!`);
          
          // Reload to sync profile
          setTimeout(() => window.location.reload(), 1000);
        }
      }, 500);
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      showError('Connection Failed', error.message || 'Failed to connect wallet. Please try again.');
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = async () => {
    try {
      if (!user) return;

      // Disconnect from MetaMask
      await disconnectWallet();

      // Update local state
      setProfileData(prev => ({
        ...prev,
        wallet_address: ''
      }));

      // Remove from Supabase
      const { error } = await supabase!
        .from('users')
        .update({
          wallet_address: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error removing wallet address:', error);
        showError('Save Failed', 'Wallet disconnected but failed to update database.');
        return;
      }

      showSuccess('Wallet Disconnected', 'Wallet has been disconnected and removed from your profile.');
      
      // Reload to sync profile
      window.location.reload();
    } catch (error: any) {
      console.error('❌ Wallet disconnection error:', error);
      showError('Disconnection Failed', error.message || 'Failed to disconnect wallet.');
    }
  };

  // Sync wallet address with connected wallet on account change
  useEffect(() => {
    if (walletConnected && account && account !== profileData.wallet_address) {
      // If a different wallet is connected, update it
      const updateWallet = async () => {
        if (!user) return;

        try {
          setProfileData(prev => ({
            ...prev,
            wallet_address: account
          }));

          const { error } = await supabase!
            .from('users')
            .update({
              wallet_address: account,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('❌ Error updating wallet address:', error);
          } else {
            console.log('✅ Wallet address updated to:', account);
            showSuccess('Wallet Switched', `Switched to wallet ${formatAddress(account)}`);
            // Reload to sync profile
            setTimeout(() => window.location.reload(), 1000);
          }
        } catch (error) {
          console.error('❌ Exception updating wallet:', error);
        }
      };

      updateWallet();
    }
  }, [walletConnected, account, user]);

  // Handle profile picture upload picture upload
  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPicture(true);

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = () => {
        const previewUrl = reader.result as string;
        setPreviewImage(previewUrl);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const url = await uploadProfilePicture(user.id, file);
      
      // Update state with the actual uploaded URL
      setProfileData(prev => ({
        ...prev,
        profile_picture_url: url
      }));

      // Set preview to the uploaded URL (not data URL)
      setPreviewImage(url);

      showSuccess('Success', 'Profile picture uploaded successfully!');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('❌ Error uploading profile picture:', error);
      showError('Upload Failed', error.message || 'Failed to upload profile picture');
      // Reset preview on error
      setPreviewImage(profileData.profile_picture_url || '');
    } finally {
      setUploadingPicture(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (profile) {
      setProfileData({
        email: profile.email || '',
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        gender: profile.gender || '',
        id_number: profile.id_number || '',
        phone_number: profile.phone_number || '',
        department: profile.department || '',
        year_level: profile.year_level || '',
        bio: profile.bio || '',
        wallet_address: profile.wallet_address || '',
        profile_picture_url: profile.profile_picture_url || ''
      });
      setPreviewImage(profile.profile_picture_url || '');
    }
    setIsEditing(false);
    setErrors({});
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Profile not found</div>
        </div>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = () => {
    const first = profileData.first_name?.charAt(0) || '';
    const last = profileData.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Render star rating (matching ProductDetails)
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(
          <svg key={i} className={`${sizeClasses[size]} text-yellow-400 fill-current`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        stars.push(
          <svg key={i} className={`${sizeClasses[size]} text-yellow-400`} viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`half-star-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path fill={`url(#half-star-${i})`} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      } else {
        stars.push(
          <svg key={i} className={`${sizeClasses[size]} text-gray-300 fill-current`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 py-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 px-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 text-center">
              {/* Profile Picture */}
              <div className="relative inline-block mb-4">
                {previewImage ? (
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4"
                      style={{ borderColor: '#208756' }}
                    />
                    {isEditing && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer shadow-lg hover:shadow-xl transition-shadow border-2"
                        style={{ borderColor: '#208756', backgroundColor: 'white' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                    {uploadingPicture && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto border-4 relative"
                    style={{ backgroundColor: '#208756', borderColor: '#208756' }}
                  >
                    {getInitials()}
                    {isEditing && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer shadow-lg hover:shadow-xl transition-shadow border-2"
                        style={{ borderColor: '#208756', backgroundColor: 'white' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {profileData.first_name} {profileData.last_name}
              </h2>
              <p className="text-gray-600 mb-4">@{profileData.username}</p>

              {/* Upload Info */}
              <p className="text-xs text-gray-500 mb-2">
                Upload a new avatar. Larger image will be resized automatically.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Maximum upload size is <span className="font-semibold">5 MB</span>
              </p>

              {/* Member Since */}
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-semibold">Member Since:</span>{' '}
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>

            {/* Statistics Card */}
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Statistics</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Products Posted</span>
                  <span className="text-lg font-bold" style={{ color: '#208756' }}>{statistics.productsPosted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Products Sold</span>
                  <span className="text-lg font-bold" style={{ color: '#208756' }}>{statistics.productsSold}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Orders as Buyer</span>
                  <span className="text-lg font-bold" style={{ color: '#208756' }}>{statistics.ordersAsBuyer}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Orders as Seller</span>
                  <span className="text-lg font-bold" style={{ color: '#208756' }}>{statistics.ordersAsSeller}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Total Revenue</span>
                  <span className="text-lg font-bold" style={{ color: '#208756' }}>₱{(statistics.totalRevenue).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Seller Rating</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold" style={{ color: '#208756' }}>{(profile?.average_seller_rating || 0).toFixed(1)}</span>
                    {renderStars(profile?.average_seller_rating || 0, 'sm')}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reviews Received</span>
                  <span className="text-lg font-bold" style={{ color: '#208756' }}>{profile?.total_reviews_received || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Edit Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button className="px-6 py-4 text-sm font-semibold border-b-2" style={{ color: '#208756', borderColor: '#208756' }}>
                    User Info
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-white font-semibold py-2 px-6 rounded-lg"
                      style={{ backgroundColor: '#208756', color: 'white' }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="James"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : errors.first_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : errors.last_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                  </div>

                                   {/* Username */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={profileData.username}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Allan"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : errors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      value={profileData.gender}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Email Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      placeholder="demomail@mail.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* ID Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ID Number</label>
                    <input
                      type="text"
                      value={profileData.id_number}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={profileData.phone_number}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : errors.phone_number ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={profileData.department}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : errors.department ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>

                  {/* Year Level */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Year Level</label>
                    <select
                      name="year_level"
                      value={profileData.year_level}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : errors.year_level ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select Year Level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                    {errors.year_level && <p className="text-red-500 text-xs mt-1">{errors.year_level}</p>}
                  </div>
                </div>

                {/* Social Profile Section */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Social Profile</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Wallet Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-5 h-5 inline mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                        Wallet Address
                        {profileData.wallet_address && (
                          <span className="ml-2 text-xs text-green-600 font-normal">✓ Saved</span>
                        )}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="wallet_address"
                          value={profileData.wallet_address || ''}
                          disabled
                          placeholder={walletConnected ? 'Wallet connected' : 'No wallet connected'}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm"
                        />
                        <>
                          {!walletConnected || !profileData.wallet_address ? (
                            <button
                              onClick={handleConnectWallet}
                              className="text-white font-semibold px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
                              style={{ backgroundColor: '#208756' }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1a6d46')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#208756')}
                            >
                              {profileData.wallet_address ? 'Switch Wallet' : 'Connect Wallet'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleConnectWallet}
                                className="text-white font-semibold px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
                                style={{ backgroundColor: '#f59e0b' }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d97706')}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f59e0b')}
                              >
                                Switch Wallet
                              </button>
                              <button
                                onClick={handleDisconnectWallet}
                                className="text-white font-semibold px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
                                style={{ backgroundColor: '#dc2626' }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {profileData.wallet_address 
                          ? 'Your wallet is connected and saved. You can switch to a different wallet or remove it.'
                          : 'Connect your MetaMask wallet to enable blockchain features. You can switch wallets anytime.'
                        }
                      </p>
                    </div>

                    {/* Bio */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bio (Optional)</label>
                    <textarea
                      name="bio"
                      value={profileData.bio || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="mt-8 flex justify-end space-x-4">
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={saving}
                      className="text-white font-semibold px-8 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                      style={{ backgroundColor: '#208756' }}
                      onMouseOver={(e) => !saving && (e.currentTarget.style.backgroundColor = '#1a6d46')}
                      onMouseOut={(e) => !saving && (e.currentTarget.style.backgroundColor = '#208756')}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Update Info'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
