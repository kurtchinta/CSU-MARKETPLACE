/**
 * Product Image Storage Service
 * Handles uploading, retrieving, and deleting product images from Supabase Storage
 */

import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'product-images';
const MAX_FILE_SIZE = 5242880; // 5MB in bytes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export interface ProductImage {
  image_id: number;
  product_id: number;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  image_order: number;
  created_at: string;
}

export interface UploadResult {
  image_id: number;
  storage_path: string;
  public_url: string;
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    };
  }

  return { valid: true };
}

/**
 * Generate storage path for product image
 */
export function generateStoragePath(
  userId: string,
  productId: number,
  imageOrder: number,
  fileExtension: string
): string {
  return `${userId}/product_${productId}_image${imageOrder}.${fileExtension}`;
}

/**
 * Get public URL for a storage path
 */
export function getProductImageUrl(storagePath: string): string {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

/**
 * Get public URLs for multiple storage paths
 */
export function getProductImageUrls(storagePaths: string[]): string[] {
  return storagePaths.map(path => getProductImageUrl(path));
}

/**
 * Upload product image to storage and save metadata to database
 */
export async function uploadProductImage(
  productId: number,
  file: File,
  imageOrder: number = 1
): Promise<UploadResult> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate storage path
  const fileExt = file.name.split('.').pop() || 'jpg';
  const storagePath = generateStoragePath(user.id, productId, imageOrder, fileExt);

  console.log(`📤 Uploading to storage:`, {
    bucket: BUCKET_NAME,
    path: storagePath,
    size: file.size,
    type: file.type
  });

  // Upload to storage bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true // Replace if file already exists
    });

  if (uploadError) {
    console.error('❌ Storage upload failed:', uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }
  
  console.log('✅ File uploaded to storage successfully');

  // Save metadata to database
  console.log(`📝 Saving image metadata to database:`, {
    product_id: productId,
    user_id: user.id,
    storage_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    image_order: imageOrder
  });
  
  const { data: dbData, error: dbError } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      user_id: user.id,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      image_order: imageOrder
    })
    .select()
    .single();

  if (dbError) {
    console.error('❌ Database insert failed:', dbError);
    console.error('Error details:', {
      message: dbError.message,
      details: dbError.details,
      hint: dbError.hint,
      code: dbError.code
    });
    // Rollback: delete uploaded file if database insert fails
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Database error: ${dbError.message}`);
  }
  
  console.log('✅ Image metadata saved to database:', dbData.image_id);

  return {
    image_id: dbData.image_id,
    storage_path: storagePath,
    public_url: getProductImageUrl(storagePath)
  };
}

/**
 * Upload multiple product images
 */
export async function uploadProductImages(
  productId: number,
  files: File[]
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const errors: string[] = [];

  // Get existing images to determine starting order
  let startOrder = 1;
  try {
    const existingImages = await getProductImages(productId);
    if (existingImages.length > 0) {
      const maxOrder = Math.max(...existingImages.map(img => img.image_order));
      startOrder = maxOrder + 1;
      console.log(`📝 Existing images found: ${existingImages.length}, starting new uploads at order ${startOrder}`);
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch existing images, starting at order 1');
  }

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadProductImage(productId, files[i], startOrder + i);
      results.push(result);
    } catch (error) {
      errors.push(`File ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (errors.length > 0) {
    console.error('Upload errors:', errors);
  }

  return results;
}

/**
 * Get all images for a product
 */
export async function getProductImages(productId: number): Promise<ProductImage[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('image_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch images: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete product image from storage and database
 */
export async function deleteProductImage(imageId: number, storagePath: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // Delete from database first
  const { error: dbError } = await supabase
    .from('product_images')
    .delete()
    .eq('image_id', imageId);

  if (dbError) {
    throw new Error(`Database deletion failed: ${dbError.message}`);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (storageError) {
    console.error('Storage deletion failed:', storageError);
    // Don't throw error - database record is already deleted
  }
}

/**
 * Delete all images for a product
 */
export async function deleteAllProductImages(productId: number): Promise<void> {
  // Get all images
  const images = await getProductImages(productId);

  // Delete each image
  const deletePromises = images.map(img => 
    deleteProductImage(img.image_id, img.storage_path)
  );

  await Promise.allSettled(deletePromises);
}

/**
 * Update image order
 */
export async function updateImageOrder(imageId: number, newOrder: number): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('product_images')
    .update({ image_order: newOrder })
    .eq('image_id', imageId);

  if (error) {
    throw new Error(`Failed to update image order: ${error.message}`);
  }
}

/**
 * Replace existing product image
 */
export async function replaceProductImage(
  imageId: number,
  oldStoragePath: string,
  newFile: File,
  productId: number,
  imageOrder: number
): Promise<UploadResult> {
  // Delete old image
  await deleteProductImage(imageId, oldStoragePath);

  // Upload new image
  return uploadProductImage(productId, newFile, imageOrder);
}

/**
 * Get product images with public URLs (for display)
 */
export async function getProductImagesWithUrls(productId: number): Promise<Array<ProductImage & { public_url: string }>> {
  const images = await getProductImages(productId);
  
  return images.map(img => ({
    ...img,
    public_url: getProductImageUrl(img.storage_path)
  }));
}

/**
 * Check if user owns product image (for authorization)
 */
export async function userOwnsProductImage(imageId: number): Promise<boolean> {
  if (!supabase) return false;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('product_images')
    .select('user_id')
    .eq('image_id', imageId)
    .single();

  if (error || !data) return false;

  return data.user_id === user.id;
}

/**
 * Compress image before upload (optional, requires browser-image-compression)
 * Note: Compression library not installed, returns original file
 */
export async function compressImage(file: File, _maxSizeMB: number = 1): Promise<File> {
  // Image compression not implemented - would require browser-image-compression package
  // For now, just return the original file
  console.log(`Compression skipped for ${file.name} (library not installed)`);
  return file;
}

export default {
  validateImageFile,
  generateStoragePath,
  getProductImageUrl,
  getProductImageUrls,
  uploadProductImage,
  uploadProductImages,
  getProductImages,
  deleteProductImage,
  deleteAllProductImages,
  updateImageOrder,
  replaceProductImage,
  getProductImagesWithUrls,
  userOwnsProductImage
};
