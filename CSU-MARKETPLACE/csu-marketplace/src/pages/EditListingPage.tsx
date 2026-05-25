import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { productService, type Product, type Category } from '../services/productService';
import { uploadProductImages, deleteProductImage } from '../services/productImageService';
import type { ProductImage } from '../services/productImageService';
import { Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageCarousel from '../components/ImageCarousel';
import Footer from '../components/Footer';

const EditListingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Edit Listing - CSU Marketplace';
  }, []);

  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const { showSuccess, showError } = useModal();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    condition: '',
    category_id: 0,
    listing_type: '',
    contact_info: '',
    quantity: 1,
    rent_duration: '',
    pickup_location: '',
    return_condition: '',
    service_schedule: '',
    service_duration: '',
    meetup_location: '',
    requirements: ''
  });

  // Image management
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load product and categories
  useEffect(() => {
    if (!productId || !user) {
      showError('Error', 'Invalid product or user');
      navigate('/my-listings');
      return;
    }
    
    loadProduct();
    loadCategories();
  }, [productId, user]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      if (!productId || !user) return;

      const result = await productService.getProductById(Number(productId));
      
      if (result.success && result.data) {
        const prod = result.data;
        
        // Verify ownership
        if (prod.user_id !== user.id) {
          showError('Unauthorized', 'You can only edit your own products');
          navigate('/my-listings');
          return;
        }

        setProduct(prod);
        setFormData({
          title: prod.product_name,
          description: prod.description,
          price: prod.price,
          condition: prod.condition || '',
          category_id: prod.category_id,
          listing_type: prod.listing_type,
          contact_info: prod.contact_information || '',
          quantity: prod.quantity || 1,
          rent_duration: prod.rent_duration || '',
          pickup_location: prod.pickup_location || '',
          return_condition: prod.return_condition || '',
          service_schedule: prod.service_schedule || '',
          service_duration: prod.service_duration || '',
          meetup_location: prod.meetup_location || '',
          requirements: prod.requirements || ''
        });

        const images: ProductImage[] = (prod.images || []).map(img => ({
          image_id: img.image_id,
          product_id: prod.product_id,
          user_id: prod.user_id,
          storage_path: img.storage_path,
          file_name: img.storage_path.split('/').pop() || '',
          file_size: 0,
          mime_type: 'image/jpeg',
          image_order: img.image_order,
          created_at: prod.created_at
        }));
        setExistingImages(images);
      } else {
        showError('Error', result.error || 'Failed to load product');
        navigate('/my-listings');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      showError('Error', 'Failed to load product');
      navigate('/my-listings');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await productService.getCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'category_id' ? Number(value) : value
    }));
  };

  const handleImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxImages = 5;
    const totalImages = existingImages.length + selectedImages.length + files.length;

    if (totalImages > maxImages) {
      showError('Error', `Maximum ${maxImages} images allowed`);
      return;
    }

    const newFiles: File[] = [];
    const previewPromises: Promise<string>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        showError('Error', `${file.name} is not an image file`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        showError('Error', `${file.name} exceeds 5MB limit`);
        continue;
      }

      newFiles.push(file);
      const previewPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      previewPromises.push(previewPromise);
    }

    if (previewPromises.length > 0) {
      const newPreviews = await Promise.all(previewPromises);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setSelectedImages(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = async (imageId: number, storagePath: string) => {
    try {
      await deleteProductImage(imageId, storagePath);
      setExistingImages(prev => prev.filter(img => img.image_id !== imageId));
      showSuccess('Deleted', 'Image removed successfully');
    } catch (error: any) {
      showError('Failed', error.message || 'Failed to delete image');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files);
    }
  };

  const handleSave = async () => {
    if (!product || !user) {
      showError('Error', 'Product or user information is missing');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      showError('Required', 'Product title is required');
      return;
    }

    if (!formData.description.trim()) {
      showError('Required', 'Product description is required');
      return;
    }

    if (formData.price <= 0) {
      showError('Required', 'Price must be greater than 0');
      return;
    }

    if (formData.category_id === 0) {
      showError('Required', 'Please select a category');
      return;
    }

    if (!formData.listing_type) {
      showError('Required', 'Listing type is required');
      return;
    }

    setSaving(true);
    try {
      const updatePayload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category_id: formData.category_id,
        listing_type: formData.listing_type as 'FOR_SALE' | 'FOR_RENT' | 'SERVICE',
        contact_information: formData.contact_info,
        condition: formData.condition || null,
        rent_duration: formData.rent_duration || null,
        return_condition: formData.return_condition || null,
        pickup_location: formData.pickup_location || null,
        service_schedule: formData.service_schedule || null,
        service_duration: formData.service_duration || null,
        requirements: formData.requirements || null,
        quantity: formData.quantity || 1
      };

      const result = await productService.updateProduct(
        product.product_id,
        updatePayload,
        user.id
      );

      if (result.success) {
        if (selectedImages.length > 0) {
          try {
            await uploadProductImages(product.product_id, selectedImages);
          } catch (imageError) {
            console.warn('Image upload warning:', imageError);
          }
        }

        showSuccess('Updated', 'Your listing has been updated successfully!');
        setTimeout(() => {
          navigate('/my-listings');
        }, 2000);
      } else {
        showError('Failed', result.error || 'Failed to update product');
      }
    } catch (error: any) {
      showError('Error', error?.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#208756' }} />
          <p style={{ color: '#666666' }}>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Green Top Bar */}
      <div className="h-1" style={{ backgroundColor: '#208756' }}></div>

      {/* Back Button Section */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <button
            onClick={() => navigate('/my-listings')}
            className="py-3 flex items-center gap-2 transition-all font-semibold group"
            style={{ color: '#208756' }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.transform = 'translateX(-4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to My Listings</span>
          </button>
        </div>
      </div>

      {/* Header - Edit Product Listing */}
      <div className="bg-white border-b-2" style={{ borderBottomColor: '#208756' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="py-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-lg" style={{ backgroundColor: '#e8f5f0' }}>
                <svg className="w-6 h-6" style={{ color: '#208756' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Edit Product Listing</h1>
                <p className="text-sm text-gray-500 mt-1">Update your product or service details</p>
              </div>
            </div>
            {/* Right: Add Product Button */}
            <button
              onClick={() => navigate('/create-listing')}
              className="text-white px-6 sm:px-8 py-3 rounded-lg font-bold shadow-lg transition-all duration-300 flex items-center space-x-2 hover:shadow-2xl hover:scale-105 active:scale-95 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: '#208756' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#208756'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-3 lg:px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-8 border border-gray-200 border-t-4" style={{ borderTopColor: '#208756' }}>
                {/* Product Name */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">Product Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    maxLength={60}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                    onFocus={(e) => (e.target.style.borderColor = '#208756')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/60</p>
                </div>

                                {/* Listing Type - Can change between FOR_SALE and FOR_RENT */}
                <div className="mb-4">
                  <p className="text-xs text-gray-900 font-bold mb-2">Listing Type <span className="text-red-500">*</span></p>
                  <div className="flex gap-3">
                    {formData.listing_type === 'FOR_SALE' && (
                      <>
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, listing_type: 'FOR_SALE' }))}
                          className="flex-1 px-3 py-2 font-semibold rounded text-sm cursor-pointer border-2"
                          style={{ borderColor: '#208756', color: '#208756' }}
                        >
                          For Sale
                        </div>
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, listing_type: 'FOR_RENT' }))}
                          className="flex-1 px-3 py-2 font-semibold rounded text-sm cursor-pointer"
                          style={{ color: '#999' }}
                        >
                          For Rent
                        </div>
                      </>
                    )}
                    {formData.listing_type === 'FOR_RENT' && (
                      <>
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, listing_type: 'FOR_SALE' }))}
                          className="flex-1 px-3 py-2 font-semibold rounded text-sm cursor-pointer"
                          style={{ color: '#999' }}
                        >
                          For Sale
                        </div>
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, listing_type: 'FOR_RENT' }))}
                          className="flex-1 px-3 py-2 font-semibold rounded text-sm cursor-pointer border-2"
                          style={{ borderColor: '#208756', color: '#208756' }}
                        >
                          For Rent
                        </div>
                      </>
                    )}
                    {formData.listing_type === 'SERVICE' && (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="w-full px-3 py-2 text-center font-semibold rounded text-sm border border-green-800 text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"style={{ borderColor: '#208756', color: '#208756' }}>
                          Service
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-500">(This cannot change)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category & Condition */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Category <span className="text-red-500">*</span></label>
                    <div className="relative" style={{ zIndex: 49 }}>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: '36px'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#208756';
                          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {formData.listing_type === 'FOR_SALE' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Condition <span className="text-red-500">*</span></label>
                      <div className="relative" style={{ zIndex: 49 }}>
                        <select
                          name="condition"
                          value={formData.condition}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '36px'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#208756';
                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select condition</option>
                          <option value="Brand New">Brand New</option>
                          <option value="Like New">Like New</option>
                          <option value="Very Good">Very Good</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {formData.listing_type === 'FOR_RENT' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Return Condition <span className="text-red-500">*</span></label>
                      <div className="relative" style={{ zIndex: 48 }}>
                        <select
                          name="return_condition"
                          value={formData.return_condition}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '36px'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#208756';
                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select return condition</option>
                          <option value="Same as Rental">Same as Rental</option>
                          <option value="Like New">Like New</option>
                          <option value="Very Good">Very Good</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price & Contact */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Price (₱) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price || ''}
                      onChange={handleInputChange}
                      min="0.01"
                      step="100"
                      placeholder="5000"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                      onFocus={(e) => (e.target.style.borderColor = '#208756')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Contact <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="contact_info"
                      value={formData.contact_info}
                      onChange={handleInputChange}
                      placeholder="Messenger, Instagram, etc"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                      onFocus={(e) => (e.target.style.borderColor = '#208756')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                  </div>
                </div>
                {/* Description - Resizable textbox */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your product/service..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm resize-vertical"
                    style={{ minHeight: '120px', overflow: 'auto' }}
                    onFocus={(e) => (e.target.style.borderColor = '#208756')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>

                {/* Conditional Sections - Black text */}
                {formData.listing_type && (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                      {formData.listing_type === 'FOR_SALE' ? 'Sale Details' : formData.listing_type === 'FOR_RENT' ? 'Rental Details' : 'Service Details'}
                    </h3>

                    {formData.listing_type === 'FOR_SALE' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Quantity</label>
                          <input
                            type="number"
                            name="quantity"
                            value={formData.quantity || 1}
                            onChange={handleInputChange}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Pickup Location</label>
                          <input
                            type="text"
                            name="pickup_location"
                            value={formData.pickup_location}
                            onChange={handleInputChange}
                            placeholder="e.g., CSU Main Campus"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Notes</label>
                          <textarea
                            name="requirements"
                            value={formData.requirements}
                            onChange={handleInputChange}
                            placeholder="Any conditions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-xs resize-none"
                            style={{ minHeight: '60px', overflow: 'hidden' }}
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                      </div>
                    )}

                    {formData.listing_type === 'FOR_RENT' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Rental Duration</label>
                          <div className="relative" style={{ zIndex: 47 }}>
                            <select
                              name="rent_duration"
                              value={formData.rent_duration}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                paddingRight: '36px'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#208756';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">Select rental duration</option>
                              <option value="1-3 days">1-3 days</option>
                              <option value="4-6 days">4-6 days</option>
                              <option value="1 week">1 week</option>
                              <option value="2 weeks">2 weeks</option>
                              <option value="1 month">1 month</option>
                              <option value="2-3 months">2-3 months</option>
                              <option value="Per semester">Per semester</option>
                              <option value="Flexible">Flexible</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Pickup/Return Location</label>
                          <input
                            type="text"
                            name="pickup_location"
                            value={formData.pickup_location}
                            onChange={handleInputChange}
                            placeholder="e.g., CSU Main Campus"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                               <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Notes</label>
                          <textarea
                            name="requirements"
                            value={formData.requirements}
                            onChange={handleInputChange}
                            placeholder="Any conditions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-xs resize-none"
                            style={{ minHeight: '60px', overflow: 'hidden' }}
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                      </div>
                    )}

                    {formData.listing_type === 'SERVICE' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Service Schedule</label>
                          <div className="relative" style={{ zIndex: 46 }}>
                            <select
                              name="service_schedule"
                              value={formData.service_schedule}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                paddingRight: '36px'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#208756';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">Select service schedule</option>
                              <option value="Monday-Friday">Monday-Friday</option>
                              <option value="Weekends only">Weekends only</option>
                              <option value="Monday-Saturday">Monday-Saturday</option>
                              <option value="Everyday">Everyday</option>
                              <option value="By appointment">By appointment</option>
                              <option value="Flexible schedule">Flexible schedule</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Service Duration</label>
                          <div className="relative" style={{ zIndex: 45 }}>
                            <select
                              name="service_duration"
                              value={formData.service_duration}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#208756] focus:ring-2 focus:ring-green-100 text-sm bg-white appearance-none cursor-pointer transition-all duration-200 hover:border-[#208756] shadow-sm"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 12 12'%3E%3Cpath fill='%23208756' d='M1 4l5 5 5-5'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                paddingRight: '36px'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#208756';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(32, 135, 86, 0.1)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">Select service duration</option>
                              <option value="1 hour">1 hour</option>
                              <option value="1-2 hours">1-2 hours</option>
                              <option value="2-3 hours">2-3 hours</option>
                              <option value="3-4 hours">3-4 hours</option>
                              <option value="Half day (4 hours)">Half day (4 hours)</option>
                              <option value="Full day (8 hours)">Full day (8 hours)</option>
                              <option value="Multiple days">Multiple days</option>
                              <option value="Depends on project">Depends on project</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Location</label>
                          <input
                            type="text"
                            name="meetup_location"
                            value={formData.meetup_location}
                            onChange={handleInputChange}
                            placeholder="e.g., CSU Campus"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/my-listings')}
                    className="flex-1 px-4 py-2 border-2 rounded-lg font-bold text-sm"
                    style={{ borderColor: '#208756', color: '#208756' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-white font-bold rounded-lg text-sm"
                    style={{ backgroundColor: saving ? '#9ca3af' : '#208756' }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Images */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg p-8 border border-gray-200 border-t-4" style={{ borderTopColor: '#208756' }}>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Product Images</h2>
                                
                {/* Image Carousel and Upload */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  {/* Carousel or Empty State */}
                  <div style={{ height: '300px' }}>
                    {(existingImages.length > 0 || imagePreviews.length > 0) ? (
                      <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                        {imagePreviews.length > 0 ? (
                          <img 
                            src={imagePreviews[0]} 
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : existingImages.length > 0 ? (
                          <ImageCarousel 
                            images={existingImages} 
                            productName={formData.title || 'Product'}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-[#208756] mb-2" viewBox="0 0 24 24" fill="none">
                          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="text-gray-400 text-sm">No image available</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Area */}
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all hover:bg-gray-50 flex flex-col items-center justify-center"
                    style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb', height: '300px' }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageSelect(e.target.files)}
                      className="hidden"
                    />
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600 text-sm">Drop your image here, or</p>
                    <p className="text-sm font-semibold" style={{ color: '#208756' }}>Click to browse</p>
                  </div>
                </div>

                  {/* Info Text */}
                <div className="flex items-start gap-2 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold mb-1">Image format: jpg, jpeg, png</p>
                    <p>Minimum size 300 × 300px (For optimal images use a minimum size of 700 × 700px)</p>
                  </div>
                </div>

                {/* Thumbnails Grid */}
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div className="border-t pt-4">
                {/* Image Counter */}
                <p className="text-center text-sm text-gray-700 mb-4">
                  <span style={{ color: '#208756', fontWeight: 'bold' }}>{existingImages.length + imagePreviews.length}</span>/5 images
                </p>
                    <p className="text-xs font-bold text-gray-900 mb-3">Uploaded Images</p>
                    <div className="grid grid-cols-4 gap-2">
                      {existingImages.map((img, idx) => {
                        let imageUrl = '';
                        try {
                          if (supabase && img.storage_path) {
                            const { data } = supabase.storage.from('product-images').getPublicUrl(img.storage_path);
                            imageUrl = data.publicUrl;
                          }
                        } catch (error) {
                          console.error('Error:', error);
                        }
                        
                        return (
                          <div key={`existing-${img.image_id}`} className="relative group">
                            <div className="rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center" style={{ minHeight: '100px' }}>
                              {imageUrl ? (
                                <img 
                                  src={imageUrl} 
                                  alt={`Image ${idx + 1}`}
                                  className="w-auto h-auto object-contain"
                                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                                />
                              ) : (
                                <div className="flex items-center justify-center text-xs text-gray-400">
                                  Loading
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img.image_id, img.storage_path)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}

                      {imagePreviews.map((preview, idx) => (
                        <div key={`new-${idx}`} className="relative group">
                          <div className="rounded-lg overflow-hidden border-2 bg-gray-50" style={{ borderColor: '#208756', minHeight: '100px' }} >
                            <div className="flex items-center justify-center h-full">
                              <img 
                                src={preview} 
                                alt={`New ${idx + 1}`}
                                className="w-auto h-auto object-contain"
                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
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

export default EditListingPage;

