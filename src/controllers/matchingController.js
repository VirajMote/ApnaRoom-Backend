import { getSupabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const supabase = getSupabase();

// Calculate compatibility score between seeker and listing
const calculateCompatibilityScore = (seekerPrefs, listing) => {
  let score = 0;
  let totalFactors = 0;

  // Budget compatibility (40% weight)
  if (seekerPrefs.budget_min && seekerPrefs.budget_max) {
    const avgBudget = (seekerPrefs.budget_min + seekerPrefs.budget_max) / 2;
    const budgetDiff = Math.abs(avgBudget - listing.rent_amount);
    const budgetScore = Math.max(0, 100 - (budgetDiff / avgBudget) * 100);
    score += budgetScore * 0.4;
    totalFactors += 0.4;
  }

  // Location compatibility (25% weight)
  if (seekerPrefs.preferred_locations && seekerPrefs.preferred_locations.length > 0) {
    const locationMatch = seekerPrefs.preferred_locations.some(loc => 
      listing.location.toLowerCase().includes(loc.toLowerCase())
    );
    score += (locationMatch ? 100 : 0) * 0.25;
    totalFactors += 0.25;
  }

  // Room type compatibility (20% weight)
  if (seekerPrefs.room_type_preference && seekerPrefs.room_type_preference.length > 0) {
    const roomTypeMatch = seekerPrefs.room_type_preference.includes(listing.room_type);
    score += (roomTypeMatch ? 100 : 0) * 0.2;
    totalFactors += 0.2;
  }

  // Gender compatibility (15% weight)
  if (seekerPrefs.gender_preference && listing.gender_preference) {
    const genderMatch = seekerPrefs.gender_preference === 'any' || 
                       seekerPrefs.gender_preference === listing.gender_preference;
    score += (genderMatch ? 100 : 0) * 0.15;
    totalFactors += 0.15;
  }

  // Normalize score if no factors were considered
  if (totalFactors === 0) return 50;

  return Math.round(score / totalFactors);
};

// Calculate compatibility for a seeker
export const calculateCompatibility = async (req, res, next) => {
  try {
    const { seekerId, listingId } = req.body;

    // Get seeker preferences
    const { data: seekerPrefs, error: seekerError } = await supabase
      .from('seeker_preferences')
      .select('*')
      .eq('user_id', seekerId)
      .single();

    if (seekerError && seekerError.code !== 'PGRST116') {
      throw new AppError('Failed to fetch seeker preferences', 500);
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError) {
      throw new AppError('Listing not found', 404);
    }

    // Calculate compatibility score
    const compatibilityScore = calculateCompatibilityScore(seekerPrefs || {}, listing);

    // Save or update match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .upsert({
        seeker_id: seekerId,
        listing_id: listingId,
        compatibility_score: compatibilityScore,
        status: 'pending'
      })
      .select()
      .single();

    if (matchError) {
      throw new AppError('Failed to save match', 500);
    }

    res.json({
      success: true,
      data: {
        match,
        compatibility_score: compatibilityScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get seeker matches
export const getSeekerMatches = async (req, res, next) => {
  try {
    const seekerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: matches, error, count } = await supabase
      .from('matches')
      .select(`
        *,
        listing:listings!matches_listing_id_fkey(
          *,
          lister:users!listings_lister_id_fkey(id, full_name, email),
          photos:listing_photos(*)
        )
      `)
      .eq('seeker_id', seekerId)
      .range(offset, offset + limit - 1)
      .order('compatibility_score', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch matches', 500);
    }

    res.json({
      success: true,
      data: matches,
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

// Get lister matches
export const getListerMatches = async (req, res, next) => {
  try {
    const listerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get all listings by this lister
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('lister_id', listerId);

    if (listingsError) {
      throw new AppError('Failed to fetch listings', 500);
    }

    if (!listings || listings.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
      });
    }

    const listingIds = listings.map(l => l.id);

    // Get matches for these listings
    const { data: matches, error, count } = await supabase
      .from('matches')
      .select(`
        *,
        seeker:users!matches_seeker_id_fkey(
          id, full_name, email,
          profile:user_profiles(*)
        ),
        listing:listings!matches_listing_id_fkey(
          id, title, location, rent_amount
        )
      `)
      .in('listing_id', listingIds)
      .range(offset, offset + limit - 1)
      .order('compatibility_score', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch matches', 500);
    }

    res.json({
      success: true,
      data: matches,
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

// Save listing to favorites
export const saveListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    const { data: savedListing, error } = await supabase
      .from('saved_listings')
      .insert({
        user_id: userId,
        listing_id: listingId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new AppError('Listing already saved', 400);
      }
      throw new AppError('Failed to save listing', 500);
    }

    res.json({
      success: true,
      data: savedListing,
      message: 'Listing saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Remove listing from favorites
export const unsaveListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    if (error) {
      throw new AppError('Failed to remove saved listing', 500);
    }

    res.json({
      success: true,
      message: 'Listing removed from favorites'
    });
  } catch (error) {
    next(error);
  }
};

// Get saved listings
export const getSavedListings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { data: savedListings, error, count } = await supabase
      .from('saved_listings')
      .select(`
        *,
        listing:listings!saved_listings_listing_id_fkey(
          *,
          lister:users!listings_lister_id_fkey(id, full_name, email),
          photos:listing_photos(*)
        )
      `)
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch saved listings', 500);
    }

    res.json({
      success: true,
      data: savedListings,
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

// Update match status
export const updateMatchStatus = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { status } = req.body;
    const listerId = req.user.id;

    // Verify the match belongs to a listing owned by this lister
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        listing:listings!matches_listing_id_fkey(lister_id)
      `)
      .eq('id', matchId)
      .single();

    if (matchError) {
      throw new AppError('Match not found', 404);
    }

    if (match.listing.lister_id !== listerId) {
      throw new AppError('Unauthorized to update this match', 403);
    }

    // Update match status
    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update({ status })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update match status', 500);
    }

    res.json({
      success: true,
      data: updatedMatch,
      message: 'Match status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
