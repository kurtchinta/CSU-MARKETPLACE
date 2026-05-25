import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'profile-pictures';
const MAX_FILE_SIZE = 5242880; // 5MB in bytes

/**
 * Validate image upload before processing
 * @param file - Image file to validate
 */
function validateImageUpload(file: File): void {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Allowed types: JPEG, PNG, WebP');
  }

  // Validate file size (max 5MB)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
}

/**
 * Upload or update user's profile picture
 * Path structure: profile-pictures/{user_id}/profile.{ext}
 * @param userId - User's unique ID (auth.uid())
 * @param file - Image file to upload
 * @returns Public URL of the uploaded profile picture
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validate file before upload
  validateImageUpload(file);

  try {
    // Generate file path following bucket structure: {user_id}/{filename}
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `profile.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log('📸 Uploading profile picture to:', filePath);

    // Delete existing profile picture if it exists (list files in user's folder)
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId);

    if (listError) {
      console.warn('⚠️ Could not list existing files:', listError);
    }

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filesToDelete);
      
      if (deleteError) {
        console.warn('⚠️ Could not delete old profile pictures:', deleteError);
      } else {
        console.log('🗑️ Deleted existing profile pictures:', filesToDelete);
      }
    }

    // Upload new profile picture with upsert to replace if exists
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('❌ Error uploading profile picture:', error);
      throw error;
    }

    console.log('✅ Profile picture uploaded successfully:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    // Add cache-busting query parameter to force browser refresh
    const cacheBustUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update user profile with new picture URL
    const { error: updateError } = await supabase
      .from('users')
      .update({
        profile_picture_url: cacheBustUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error updating user profile with picture URL:', updateError);
      throw updateError;
    }

    console.log('✅ User profile updated with picture URL:', cacheBustUrl);

    return cacheBustUrl;
  } catch (error) {
    console.error('❌ Exception in uploadProfilePicture:', error);
    throw error;
  }
}

/**
 * Delete user's profile picture from storage and database
 * @param userId - User's unique ID (auth.uid())
 */
export async function deleteProfilePicture(userId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    console.log('🗑️ Deleting profile picture for user:', userId);

    // List all files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId);

    if (listError) {
      console.error('❌ Error listing files:', listError);
      throw listError;
    }

    // Delete all files if any exist
    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${userId}/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filesToDelete);

      if (deleteError) {
        console.error('❌ Error deleting profile picture files:', deleteError);
        throw deleteError;
      }
      
      console.log('✅ Deleted files:', filesToDelete);
    }

    // Update user profile to remove picture URL
    const { error: updateError } = await supabase
      .from('users')
      .update({
        profile_picture_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error updating user profile:', updateError);
      throw updateError;
    }

    console.log('✅ Profile picture deleted successfully');
  } catch (error) {
    console.error('❌ Exception in deleteProfilePicture:', error);
    throw error;
  }
}

/**
 * Get user's profile picture URL
 * @param userId - User's unique ID
 * @returns URL of the profile picture or null if not found
 */
export async function getProfilePictureUrl(userId: string): Promise<string | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching profile picture URL:', error);
      return null;
    }

    return data?.profile_picture_url || null;
  } catch (error) {
    console.error('❌ Exception in getProfilePictureUrl:', error);
    return null;
  }
}
