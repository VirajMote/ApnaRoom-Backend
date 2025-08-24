import { getSupabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/uploadService.js';

const supabase = getSupabase();

// Upload profile photo
export const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const userId = req.user.id;

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, 'profile-photos');

    // Update user profile with photo URL
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        profile_photo_url: uploadResult.secure_url
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update profile photo', 500);
    }

    res.json({
      success: true,
      data: {
        profile_photo_url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      },
      message: 'Profile photo uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Upload listing photos
export const uploadListingPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const { listingId } = req.params;
    const userId = req.user.id;

    // Verify user owns the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('lister_id')
      .eq('id', listingId)
      .single();

    if (listingError) {
      throw new AppError('Listing not found', 404);
    }

    if (listing.lister_id !== userId) {
      throw new AppError('Unauthorized to upload photos for this listing', 403);
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      const uploadResult = await uploadToCloudinary(file, 'listing-photos');
      
      const { data: photo, error } = await supabase
        .from('listing_photos')
        .insert({
          listing_id: listingId,
          photo_url: uploadResult.secure_url,
          photo_public_id: uploadResult.public_id
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to save photo', 500);
      }

      uploadedPhotos.push(photo);
    }

    res.json({
      success: true,
      data: uploadedPhotos,
      message: 'Photos uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete photo
export const deletePhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const userId = req.user.id;

    // Get photo details first
    const { data: photo, error: fetchError } = await supabase
      .from('listing_photos')
      .select(`
        *,
        listing:listings!listing_photos_listing_id_fkey(lister_id)
      `)
      .eq('id', photoId)
      .single();

    if (fetchError) {
      throw new AppError('Photo not found', 404);
    }

    // Verify user owns the listing
    if (photo.listing.lister_id !== userId) {
      throw new AppError('Unauthorized to delete this photo', 403);
    }

    // Delete from Cloudinary
    if (photo.photo_public_id) {
      await deleteFromCloudinary(photo.photo_public_id);
    }

    // Delete from database
    const { error } = await supabase
      .from('listing_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      throw new AppError('Failed to delete photo', 500);
    }

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
