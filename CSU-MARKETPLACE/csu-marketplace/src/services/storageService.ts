import { supabase } from '../lib/supabase';

/**
 * Storage Service for Product Images
 * Handles all image upload, download, and deletion operations
 */

const BUCKET_NAME = 'product-images';

export interface UploadImageResult {
  success: boolean;
  image_url?: string;
  storage_path?: string;
  error?: string;
}

export const storageService = {
  /**
   * Upload a single product image
   * @param file - Image file to upload
   * @param userId - User ID (for organizing files)
   * @param productId - Product ID (optional, for organizing)
   * @returns Upload result with public URL and storage path
   */
  async uploadProductImage(
    file: File,
    userId: string,
    productId?: number
  ): Promise<UploadImageResult> {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      // Validate file
      const validationError = this.validateImageFile(file);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Generate unique file path: userId/productId_timestamp_random.ext
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = productId 
        ? `${productId}_${timestamp}_${random}.${fileExt}`
        : `temp_${timestamp}_${random}.${fileExt}`;
      
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        success: true,
        image_url: publicUrl,
        storage_path: filePath
      };
    } catch (error: any) {
      console.error('Upload exception:', error);
      return { success: false, error: error.message || 'Upload failed' };
    }
  },

  /**
   * Upload multiple product images
   * @param files - Array of image files
   * @param userId - User ID
   * @param productId - Product ID (optional)
   * @returns Array of upload results
   */
  async uploadMultipleImages(
    files: File[],
    userId: string,
    productId?: number
  ): Promise<UploadImageResult[]> {
    const uploadPromises = files.map(file => 
      this.uploadProductImage(file, userId, productId)
    );
    
    return await Promise.all(uploadPromises);
  },

  /**
   * Delete a product image
   * @param storagePath - Storage path (from product_images table)
   * @returns Success status
   */
  async deleteProductImage(storagePath: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Delete exception:', error);
      return { success: false, error: error.message || 'Delete failed' };
    }
  },

  /**
   * Delete multiple product images
   * @param storagePaths - Array of storage paths
   * @returns Success status
   */
  async deleteMultipleImages(storagePaths: string[]): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(storagePaths);

      if (error) {
        console.error('Bulk delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Bulk delete exception:', error);
      return { success: false, error: error.message || 'Bulk delete failed' };
    }
  },

  /**
   * Get public URL for an image
   * @param storagePath - Storage path
   * @returns Public URL
   */
  getPublicUrl(storagePath: string): string {
    if (!supabase) return '';

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return publicUrl;
  },

  /**
   * Validate image file
   * @param file - File to validate
   * @returns Error message or null if valid
   */
  validateImageFile(file: File): string | null {
    // Check file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return 'File size must be less than 5MB';
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'File must be an image (JPEG, PNG, WebP, or GIF)';
    }

    return null;
  },

  /**
   * Generate thumbnail URL (if using Supabase Image Transformation)
   * @param storagePath - Storage path
   * @param width - Thumbnail width
   * @param height - Thumbnail height
   * @returns Thumbnail URL
   */
  getThumbnailUrl(storagePath: string, width: number = 200, height: number = 200): string {
    if (!supabase) return '';

    // Note: Image transformation requires Supabase Pro plan
    // For now, just return the regular public URL
    // When you upgrade, you can use: .getPublicUrl(storagePath, { transform: { width, height } })
    return this.getPublicUrl(storagePath);
  },

  /**
   * List all images for a user
   * @param userId - User ID
   * @returns List of file paths
   */
  async listUserImages(userId: string): Promise<string[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId);

      if (error) {
        console.error('List error:', error);
        return [];
      }

      return data?.map(file => `${userId}/${file.name}`) || [];
    } catch (error) {
      console.error('List exception:', error);
      return [];
    }
  },

  /**
   * Clean up temporary images (for abandoned product creations)
   * @param userId - User ID
   * @param maxAgeMinutes - Maximum age of temp files to keep (default 60 minutes)
   */
  async cleanupTempImages(userId: string, maxAgeMinutes: number = 60): Promise<void> {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId);

      if (error || !data) return;

      const now = Date.now();
      const maxAge = maxAgeMinutes * 60 * 1000;

      const tempFiles = data
        .filter(file => file.name.startsWith('temp_'))
        .filter(file => {
          const fileTime = parseInt(file.name.split('_')[1]);
          return now - fileTime > maxAge;
        })
        .map(file => `${userId}/${file.name}`);

      if (tempFiles.length > 0) {
        await this.deleteMultipleImages(tempFiles);
        console.log(`Cleaned up ${tempFiles.length} temporary images`);
      }
    } catch (error) {
      console.error('Cleanup exception:', error);
    }
  }
};

export default storageService;
