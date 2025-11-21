import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { productService, type CreateProductData, type Category } from '../services/productService';
import { uploadProductImages } from '../services/productImageService';

const CreateListingPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showSuccess, showError, showWarning } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Create Listing - CSU Marketplace';
  }, []);
  
  // Form state
  const [formData, setFormData] = useState<CreateProductData>({
    title: '',
    description: '',
    price: 0,
    category_id: 0,
    listing_type: 'FOR_SALE',
    quantity: 1,
    condition: '',
    rent_duration: '',
    return_condition: '',
    service_schedule: '',
    service_duration: '',
    requirements: '',
    pickup_location: '',
    meetup_location: '',
    contact_information: ''
  });
  
  // Image state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  // UI state - Load directly from Supabase, no localStorage
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('📂 CreateListingPage: Loading categories from Supabase...');
      
      const result = await productService.getCategories();
      
      if (result.success && result.data) {
        setCategories(result.data);
        console.log('✅ CreateListingPage: Categories loaded:', result.data.length);
      } else {
        console.error('❌ CreateListingPage: Failed to load categories:', result.error);
        showError('Categories Error', result.error || 'Failed to load categories');
      }
    } catch (error) {
      console.error('❌ CreateListingPage: Exception loading categories:', error);
    }
  };

  // Handle image file selection
  const handleImageSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxImages = 5;
    const newFiles: File[] = [];

    // Check total images limit
    if (selectedImages.length + files.length > maxImages) {
      showWarning('Image Limit', `Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate and process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Invalid File', `${file.name} is not an image file`);
        continue;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('File Too Large', `${file.name} exceeds 5MB limit`);
        continue;
      }

      newFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }

    setSelectedImages(prev => [...prev, ...newFiles]);
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'category_id' ? Number(value) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.category_id || formData.category_id === 0) {
      newErrors.category_id = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      showError('Authentication Required', 'You must be logged in to create a listing');
      navigate('/');
      return;
    }

    if (!validateForm()) {
      showWarning('Validation Error', 'Please fix the errors in the form before submitting');
      return;
    }

    setSubmitting(true);
    console.log('📝 Submitting new product listing...');

    try {
      // Step 1: Create the product
      const result = await productService.createProduct(formData, profile.user_id);
      
      if (result.success && result.data) {
        console.log('✅ Product created successfully!');
        const productId = result.data.product_id;
        
        // Step 2: Upload images if any were selected
        if (selectedImages.length > 0) {
          console.log(`📸 Uploading ${selectedImages.length} images for product ${productId}...`);
          try {
            const uploadResults = await uploadProductImages(productId, selectedImages);
            console.log(`✅ Successfully uploaded ${uploadResults.length} images`);
          } catch (imageError: any) {
            console.error('⚠️ Warning: Product created but image upload failed:', imageError);
            showWarning('Partial Success', 'Your listing was created but some images failed to upload. You can add images later from My Listings.');
          }
        }
        
        showSuccess(
          'Listing Created!',
          'Your listing has been created and is pending admin approval. You will be notified once it\'s reviewed.',
          () => {
            // Reset form
            setFormData({
              title: '',
              description: '',
              price: 0,
              category_id: 0,
              listing_type: 'FOR_SALE',
              quantity: 1,
              condition: '',
              rent_duration: '',
              return_condition: '',
              service_schedule: '',
              service_duration: '',
              requirements: '',
              pickup_location: '',
              meetup_location: '',
              contact_information: ''
            });
            
            // Reset images
            setSelectedImages([]);
            setImagePreviews([]);
            
            // Navigate to my listings
            navigate('/my-listings');
          }
        );
      } else {
        console.error('❌ Failed to create product:', result.error);
        showError('Creation Failed', result.error || 'Failed to create listing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Exception creating product:', error);
      showError('Unexpected Error', 'An unexpected error occurred while creating your listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Listing</h1>
          <p className="text-gray-600">Share your products or services with the CSU community</p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                Listing Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                maxLength={200}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.title 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-[#208756] focus:ring-green-100'
                }`}
                placeholder="Enter a clear, descriptive title"
              />
              {errors.title && (
                <p className="mt-1.5 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                required
                maxLength={2000}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors ${
                  errors.description 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-[#208756] focus:ring-green-100'
                }`}
                placeholder="Describe your listing in detail..."
              />
              <div className="mt-1.5 flex justify-between items-center">
                {errors.description ? (
                  <p className="text-sm text-red-600">{errors.description}</p>
                ) : (
                  <span></span>
                )}
                <span className="text-xs text-gray-500">{formData.description.length} / 2000</span>
              </div>
            </div>

            {/* Price and Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (PHP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      errors.price 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-[#208756] focus:ring-green-100'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category_id" className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.category_id 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#208756] focus:ring-green-100'
                  }`}
                >
                  <option value="0">Select a category</option>
                  {categories.map(category => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.category_id}</p>
                )}
              </div>
            </div>

            {/* Listing Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Listing Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* For Sale Option */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, listing_type: 'FOR_SALE' }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.listing_type === 'FOR_SALE'
                      ? 'border-[#208756] bg-green-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">For Sale</div>
                  <div className="text-sm text-gray-600 mt-0.5">Sell your items</div>
                </button>

                {/* For Rent Option */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, listing_type: 'FOR_RENT' }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.listing_type === 'FOR_RENT'
                      ? 'border-[#208756] bg-green-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">For Rent</div>
                  <div className="text-sm text-gray-600 mt-0.5">Rent out items</div>
                </button>

                {/* Service Option */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, listing_type: 'SERVICE' }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.listing_type === 'SERVICE'
                      ? 'border-[#208756] bg-green-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Service</div>
                  <div className="text-sm text-gray-600 mt-0.5">Offer services</div>
                </button>
              </div>
            </div>

            {/* Conditional Fields Based on Listing Type */}
            
            {/* FOR SALE - Quantity, Condition, Pickup Location, Requirements */}
            {formData.listing_type === 'FOR_SALE' && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">For Sale Details</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity Available
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        name="quantity"
                        value={formData.quantity || 1}
                        onChange={handleInputChange}
                        min="1"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
                        placeholder="1"
                      />
                    </div>

                    {/* Condition */}
                    <div>
                      <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                        Condition
                      </label>
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
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

                  {/* Pickup Location */}
                  <div>
                    <label htmlFor="pickup_location" className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Location
                    </label>
                    <input
                      type="text"
                      id="pickup_location"
                      name="pickup_location"
                      value={formData.pickup_location || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
                      placeholder="e.g., CSU Main Campus, Gate 2"
                    />
                  </div>

                  {/* Requirements */}
                  <div>
                    <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      id="requirements"
                      name="requirements"
                      value={formData.requirements || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100 resize-none"
                      placeholder="Add any additional notes for buyers..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* FOR RENT - Rent Duration, Condition, Pickup Location, Requirements */}
            {formData.listing_type === 'FOR_RENT' && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">For Rent Details</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Rent Duration */}
                    <div>
                      <label htmlFor="rent_duration" className="block text-sm font-medium text-gray-700 mb-2">
                        Rental Duration
                      </label>
                      <select
                        id="rent_duration"
                        name="rent_duration"
                        value={formData.rent_duration || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
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

                    {/* Condition */}
                    <div>
                      <label htmlFor="return_condition" className="block text-sm font-medium text-gray-700 mb-2">
                        Expected Return Condition
                      </label>
                      <select
                        id="return_condition"
                        name="return_condition"
                        value={formData.return_condition || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
                      >
                        <option value="">Select condition</option>
                        <option value="Same as Rental">Same as Rental</option>
                        <option value="Like New">Like New</option>
                        <option value="Very Good">Very Good</option>
                        <option value="Good">Good</option>
                      </select>
                    </div>
                  </div>

                  {/* Pickup Location */}
                  <div>
                    <label htmlFor="pickup_location" className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup/Return Location
                    </label>
                    <input
                      type="text"
                      id="pickup_location"
                      name="pickup_location"
                      value={formData.pickup_location || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
                      placeholder="e.g., CSU Main Campus, Gate 2"
                    />
                  </div>

                  {/* Requirements */}
                  <div>
                    <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Requirements
                    </label>
                    <textarea
                      id="requirements"
                      name="requirements"
                      value={formData.requirements || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100 resize-none"
                      placeholder="Any terms or conditions for renters..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SERVICE - Service Schedule, Service Duration, Requirements */}
            {formData.listing_type === 'SERVICE' && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Service Details</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Service Schedule */}
                    <div>
                      <label htmlFor="service_schedule" className="block text-sm font-medium text-gray-700 mb-2">
                        Service Schedule
                      </label>
                      <select
                        id="service_schedule"
                        name="service_schedule"
                        value={formData.service_schedule || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
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

                    {/* Service Duration */}
                    <div>
                      <label htmlFor="service_duration" className="block text-sm font-medium text-gray-700 mb-2">
                        Service Duration
                      </label>
                      <select
                        id="service_duration"
                        name="service_duration"
                        value={formData.service_duration || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
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
                  
                  {/* Meetup Location */}
                  <div>
                    <label htmlFor="meetup_location" className="block text-sm font-medium text-gray-700 mb-2">
                      Service Location / Meetup Place
                    </label>
                    <input
                      type="text"
                      id="meetup_location"
                      name="meetup_location"
                      value={formData.meetup_location || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
                      placeholder="e.g., CSU Main Campus, Library, or Online"
                    />
                  </div>

                  {/* Requirements */}
                  <div>
                    <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                      Requirements & Special Notes
                    </label>
                    <textarea
                      id="requirements"
                      name="requirements"
                      value={formData.requirements || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100 resize-none"
                      placeholder="What clients need to prepare or special requirements..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info - For ALL listing types */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
              <input
                type="text"
                id="contact_information"
                name="contact_information"
                value={formData.contact_information || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-[#208756] focus:ring-green-100"
                placeholder="Phone number or Facebook Messenger link"
              />
              <p className="mt-2 text-xs text-gray-500">Example: 09XX-XXX-XXXX or https://m.me/yourfacebookname</p>
            </div>

            {/* Product Images Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Images <span className="text-gray-500 text-xs font-normal">(Optional - Up to 5 images)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">JPEG, PNG, WebP, GIF - Max 5MB each</p>
              
              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-[#208756] bg-green-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => handleImageSelect(e.target.files)}
                  className="hidden"
                />
                
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {dragActive ? 'Drop images here' : 'Drag and drop images here'}
                </p>
                <p className="text-xs text-gray-500 mb-3">or click to select files</p>
                
                <span className="inline-block text-xs px-3 py-1.5 rounded bg-gray-200 text-gray-700">
                  {selectedImages.length} / 5 images
                </span>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Selected Images ({imagePreviews.length}/5)</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <span className="absolute top-2 left-2 bg-[#208756] text-white text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full">
                          {index + 1}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Remove image"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        <p className="mt-1.5 text-xs text-gray-600 truncate">
                          {selectedImages[index]?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/browse')}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#208756] hover:bg-[#1a6d45]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating...</span>
                  </span>
                ) : (
                  'Create Listing'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;