/**
 * Product Image Upload Component
 * Drag-and-drop image uploader with preview for product listings
 */

import React, { useState, useRef } from 'react';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export interface ProductImage {
  image_id: number;
  product_id: number;
  user_id: string;
  image_url: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_primary?: boolean;
  display_order?: number;
  created_at: string;
}

interface ProductImageUploadProps {
  productId?: number;
  existingImages?: ProductImage[];
  maxImages?: number;
  onUploadSuccess?: (imageId: number, url: string, storagePath: string) => void;
  onDeleteSuccess?: (imageId: number) => void;
  onError?: (error: string) => void;
}

export default function ProductImageUpload({
  productId,
  existingImages = [],
  maxImages = 5,
  onUploadSuccess,
  onDeleteSuccess,
  onError
}: ProductImageUploadProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<ProductImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!user) {
      onError?.('You must be logged in to upload images');
      return;
    }

    // Check if max images exceeded
    if (images.length + files.length > maxImages) {
      onError?.(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

    try {
      const uploadedImages: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file
        const validationError = storageService.validateImageFile(file);
        if (validationError) {
          onError?.(validationError);
          continue;
        }

        // Upload image to Supabase Storage
        const uploadResult = await storageService.uploadProductImage(
          file,
          user.id,
          productId
        );

        if (!uploadResult.success) {
          onError?.(uploadResult.error || 'Upload failed');
          continue;
        }

        // Insert into database
        const { data: imageData, error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            user_id: user.id,
            image_url: uploadResult.image_url!,
            storage_path: uploadResult.storage_path!,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            is_primary: images.length === 0 && i === 0, // First image is primary
            display_order: images.length + i + 1
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          // Clean up uploaded file
          await storageService.deleteProductImage(uploadResult.storage_path!);
          onError?.('Failed to save image to database');
          continue;
        }

        const newImage: ProductImage = imageData;
        uploadedImages.push(newImage);
        onUploadSuccess?.(newImage.image_id, newImage.image_url, newImage.storage_path);
      }

      // Update local state with all uploaded images
      setImages(prev => [...prev, ...uploadedImages]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      onError?.(message);
    } finally {
      setUploading(false);
    }
  };

  // Handle image deletion
  const handleDelete = async (imageId: number, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Delete from storage
      const storageResult = await storageService.deleteProductImage(storagePath);
      
      if (!storageResult.success) {
        onError?.(storageResult.error || 'Failed to delete from storage');
        return;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('image_id', imageId);

      if (dbError) {
        console.error('Database error:', dbError);
        onError?.('Failed to delete from database');
        return;
      }

      setImages(prev => prev.filter(img => img.image_id !== imageId));
      onDeleteSuccess?.(imageId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      onError?.(message);
    }
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
      handleFileChange(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive 
            ? 'border-blue-600 bg-blue-100' 
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
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
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-gray-600">Uploading images...</p>
          </div>
        ) : (
          <div>
            <svg className="w-12 h-12 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-base font-medium text-gray-700 mb-2">
              Drag & drop images here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              {images.length}/{maxImages} images • Max 5MB per image • JPEG, PNG, WebP, GIF
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          {images.map((img, index) => (
            <div key={img.image_id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="relative pt-[100%] bg-gray-50 group">
                <img
                  src={storageService.getPublicUrl(img.storage_path)}
                  alt={`Product image ${index + 1}`}
                  loading="lazy"
                  className="absolute top-0 left-0 w-full h-full object-cover"
                />
                
                {/* Image order badge */}
                <span className="absolute top-2 left-2 bg-black bg-opacity-70 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>
                
                {/* Delete button */}
                <button
                  className="absolute top-2 right-2 bg-red-500 text-white border-none rounded-full w-8 h-8 cursor-pointer flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.image_id, img.storage_path);
                  }}
                  title="Delete image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-3">
                <p className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis mb-1">
                  {img.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {(img.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
