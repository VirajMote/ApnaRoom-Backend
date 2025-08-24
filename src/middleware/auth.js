import jwt from 'jsonwebtoken';
import { getCache } from '../config/redis.js';
import { getSupabase } from '../config/database.js';

// Verify JWT token middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await getCache(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, user_type, verification_status, email_verified')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is verified
    if (user.verification_status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Account has been rejected'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      userType: user.user_type,
      verificationStatus: user.verification_status,
      emailVerified: user.email_verified
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    // Check if token is blacklisted
    const isBlacklisted = await getCache(`blacklist:${token}`);
    if (isBlacklisted) {
      return next(); // Continue without authentication
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, user_type, verification_status, email_verified')
      .eq('id', decoded.userId)
      .single();

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        userType: user.user_type,
        verificationStatus: user.verification_status,
        emailVerified: user.email_verified
      };
    }

    next();
  } catch (error) {
    // If token verification fails, continue without authentication
    next();
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Require specific user type
export const requireSeeker = requireRole(['seeker']);
export const requireLister = requireRole(['lister']);

// Require verified user
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.verificationStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Account verification required'
    });
  }

  next();
};

// Require email verification
export const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required'
    });
  }

  next();
};

// Check if user owns the resource
export const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const resourceId = req.params.id || req.params.listingId;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      const supabase = getSupabase();
      let resource;
      let error;

      switch (resourceType) {
        case 'listing':
          const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('lister_id')
            .eq('id', resourceId)
            .single();
          resource = listing;
          error = listingError;
          break;
        case 'profile':
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('id', resourceId)
            .single();
          resource = profile;
          error = profileError;
          break;
        case 'conversation':
          const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('participant1_id, participant2_id')
            .eq('id', resourceId)
            .single();
          resource = conversation;
          error = convError;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type'
          });
      }
      
      if (error || !resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      let isOwner = false;

      if (resourceType === 'conversation') {
        isOwner = resource.participant1_id === req.user.id || resource.participant2_id === req.user.id;
      } else {
        const ownerId = resource.lister_id || resource.user_id;
        isOwner = ownerId === req.user.id;
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};
