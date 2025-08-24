import { getSupabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/uploadService.js';

const supabase = getSupabase();

// Get all listings
export const getAllListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    const { data: listings, error, count } = await supabase
      .from('listings')
      .select(`
        *,
        lister:users!listings_lister_id_fkey(id, full_name, email),
        photos:listing_photos(*)
      `)
      .eq('status', status)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch listings', 500);
    }

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get listing by ID
export const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        lister:users!listings_lister_id_fkey(id, full_name, email, verification_status),
        photos:listing_photos(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Listing not found', 404);
      }
      throw new AppError('Failed to fetch listing', 500);
    }

    // Increment view count
    await supabase
      .from('listings')
      .update({ views_count: listing.views_count + 1 })
      .eq('id', id);

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

// Create new listing
export const createListing = async (req, res, next) => {
  try {
    const listerId = req.user.id;
    const listingData = req.body;

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        ...listingData,
        lister_id: listerId
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create listing', 500);
    }

    res.status(201).json({
      success: true,
      data: listing,
      message: 'Listing created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update listing
export const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data: listing, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update listing', 500);
    }

    res.json({
      success: true,
      data: listing,
      message: 'Listing updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete listing
export const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError('Failed to delete listing', 500);
    }

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Search listings
export const searchListings = async (req, res, next) => {
  try {
    const {
      query,
      location,
      minPrice,
      maxPrice,
      roomType,
      furnishedStatus,
      genderPreference,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    let supabaseQuery = supabase
      .from('listings')
      .select(`
        *,
        lister:users!listings_lister_id_fkey(id, full_name, email),
        photos:listing_photos(*)
      `)
      .eq('status', 'active');

    // Apply filters
    if (query) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (location) {
      supabaseQuery = supabaseQuery.ilike('location', `%${location}%`);
    }

    if (minPrice) {
      supabaseQuery = supabaseQuery.gte('rent_amount', minPrice);
    }

    if (maxPrice) {
      supabaseQuery = supabaseQuery.lte('rent_amount', maxPrice);
    }

    if (roomType) {
      supabaseQuery = supabaseQuery.eq('room_type', roomType);
    }

    if (furnishedStatus) {
      supabaseQuery = supabaseQuery.eq('furnished_status', furnishedStatus);
    }

    if (genderPreference) {
      supabaseQuery = supabaseQuery.eq('gender_preference', genderPreference);
    }

    const { data: listings, error, count } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to search listings', 500);
    }

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get my listings
export const getMyListings = async (req, res, next) => {
  try {
    const listerId = req.user.id;

    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        *,
        photos:listing_photos(*)
      `)
      .eq('lister_id', listerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch your listings', 500);
    }

    res.json({
      success: true,
      data: listings
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

// Delete listing photo
export const deleteListingPhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;

    // Get photo details first
    const { data: photo, error: fetchError } = await supabase
      .from('listing_photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (fetchError) {
      throw new AppError('Photo not found', 404);
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

// Update listing status
export const updateListingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data: listing, error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update listing status', 500);
    }

    res.json({
      success: true,
      data: listing,
      message: 'Listing status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
