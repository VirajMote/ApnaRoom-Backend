import { getSupabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/uploadService.js';

const supabase = getSupabase();

// Get user profile
export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError('Failed to fetch user profile', 500);
    }

    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, user_type, verification_status, email_verified, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new AppError('Failed to fetch user info', 500);
    }

    res.json({
      success: true,
      data: {
        ...user,
        profile: profile || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update profile', 500);
      }
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...updateData
        })
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to create profile', 500);
      }
      result = data;
    }

    res.json({
      success: true,
      data: result,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const userId = req.user.id;

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, 'profile-photos');

    // Update profile with photo URL
    const { data, error } = await supabase
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
        profile_photo_url: uploadResult.secure_url
      },
      message: 'Profile photo uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get verification status
export const getVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('verification_status, email_verified')
      .eq('id', userId)
      .single();

    if (error) {
      throw new AppError('Failed to fetch verification status', 500);
    }

    res.json({
      success: true,
      data: {
        verification_status: user.verification_status,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    next(error);
  }
};

// Request verification
export const requestVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Update verification status to pending
    const { error } = await supabase
      .from('users')
      .update({ verification_status: 'pending' })
      .eq('id', userId);

    if (error) {
      throw new AppError('Failed to request verification', 500);
    }

    // TODO: Send verification request to admin
    // This would typically involve sending an email to admin or creating a verification request record

    res.json({
      success: true,
      message: 'Verification request submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};
