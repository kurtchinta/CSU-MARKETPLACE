import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { productService, type Product, type Category } from '../services/productService';
import { uploadProductImages, deleteProductImage } from '../services/productImageService';
import type { ProductImage } from '../services/productImageService';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        contact_information: formData.contact_info
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Simple with back button and add product */}
      <div className="bg-white border-b border-gray-200"style={{ backgroundColor: '#208756' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <button
                onClick={() => navigate('/my-listings')}
                className="text-gray-600 hover:text-gray-900"
                title="Back to my listings"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white">Edit Product Listing</h1>
            </div>
            {/* Right: Add Product Button */}
            <button
              onClick={() => navigate('/create-listing')}
              className="text-white px-8 py-4 rounded-lg font-bold shadow-lg transition-all duration-300 flex items-center space-x-3 hover:shadow-2xl hover:scale-105 active:scale-95 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: '#1fac68ff' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a6d46'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1f8d58ff'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-base font-bold">Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                {/* Product Name */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">Product Name *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                    onFocus={(e) => (e.target.style.borderColor = '#208756')}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/60</p>
                </div>

                {/* Category & Condition */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Category *</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm bg-white"
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#208756')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                    >
                      <option value="">Select</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Condition *</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#208756')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    >
                      <option value="">Select</option>
                      <option value="Brand New">Brand New</option>
                      <option value="Like New">Like New</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                    </select>
                  </div>
                </div>

                {/* Price & Contact */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Price (₱) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="100"
                      placeholder="5000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                      onFocus={(e) => (e.target.style.borderColor = '#208756')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Contact *</label>
                    <input
                      type="text"
                      name="contact_info"
                      value={formData.contact_info}
                      onChange={handleInputChange}
                      placeholder="Messenger, Instagram, etc"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                      onFocus={(e) => (e.target.style.borderColor = '#208756')}
                      onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                    />
                  </div>
                </div>

                {/* Description - Non-scrollable textbox */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your product..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm resize-none"
                    style={{ minHeight: '100px', overflow: 'hidden' }}
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
                          <input
                            type="text"
                            name="rent_duration"
                            value={formData.rent_duration}
                            onChange={handleInputChange}
                            placeholder="Per day / week / month"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Return Condition</label>
                          <select
                            name="return_condition"
                            value={formData.return_condition}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm bg-white"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          >
                            <option value="">Select</option>
                            <option value="Same as Rental">Same as Rental</option>
                            <option value="Like New">Like New</option>
                            <option value="Very Good">Very Good</option>
                          </select>
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
                      </div>
                    )}

                    {formData.listing_type === 'SERVICE' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Schedule</label>
                          <input
                            type="text"
                            name="service_schedule"
                            value={formData.service_schedule}
                            onChange={handleInputChange}
                            placeholder="e.g., Mon-Fri 9AM-5PM"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-900 mb-1">Duration</label>
                          <input
                            type="text"
                            name="service_duration"
                            value={formData.service_duration}
                            onChange={handleInputChange}
                            placeholder="e.g., 1-2 hours"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                            onFocus={(e) => (e.target.style.borderColor = '#208756')}
                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                          />
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

                {/* Listing Type - Simple info */}
                <div className="mb-4 p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-900 font-bold">Type: {formData.listing_type === 'FOR_SALE' ? 'For Sale' : formData.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}</p>
                </div>

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
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Product Images</h2>

                {/* Main Image Preview */}
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-300" style={{ maxHeight: '350px' }}>
                      {imagePreviews.length > 0 ? (
                        <img 
                          src={imagePreviews[0]} 
                          alt="Preview"
                          className="w-full h-auto object-contain"
                        />
                      ) : (
                        (() => {
                          const firstImg = existingImages[0];
                          let imageUrl = '';
                          try {
                            if (supabase && firstImg.storage_path) {
                              const { data } = supabase.storage.from('product-images').getPublicUrl(firstImg.storage_path);
                              imageUrl = data.publicUrl;
                            }
                          } catch (error) {
                            console.error('Error:', error);
                          }
                          return imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt="Product"
                              className="w-full h-auto object-contain"
                            />
                          ) : null;
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Area - Expanded and simple */}
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4 transition-all"
                  style={{ borderColor: '#208756', backgroundColor: '#f9fafb' }}
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
                  <p className="font-bold text-gray-900 text-lg mb-2">Drag & drop images here</p>
                  <p className="text-sm text-gray-600">or click to browse</p>
                  <p className="text-xs text-gray-500 mt-2">Max 5MB each, up to 5 images</p>
                </div>

                {/* Image Counter */}
                <p className="text-center text-sm text-gray-700 mb-4">
                  <span style={{ color: '#208756', fontWeight: 'bold' }}>{existingImages.length + imagePreviews.length}</span>/5 images
                </p>

                {/* Image Grid */}
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
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
                          <div className="aspect-square rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={`Image ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">
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
                        <div className="aspect-square rounded-lg overflow-hidden border-2 bg-gray-50" style={{ borderColor: '#208756' }}>
                          <img 
                            src={preview} 
                            alt={`New ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditListingPage;

