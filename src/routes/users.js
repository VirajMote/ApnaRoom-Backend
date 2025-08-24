import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  getVerificationStatus,
  requestVerification
} from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const updateProfileValidation = [
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Occupation must be less than 255 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Location must be between 3 and 255 characters'),
  body('smokingPreference')
    .optional()
    .isIn(['no', 'yes', 'occasionally'])
    .withMessage('Invalid smoking preference'),
  body('drinkingPreference')
    .optional()
    .isIn(['no', 'yes', 'socially'])
    .withMessage('Invalid drinking preference'),
  body('petFriendly')
    .optional()
    .isBoolean()
    .withMessage('Pet friendly must be a boolean'),
  body('foodHabits')
    .optional()
    .isIn(['veg', 'nonveg', 'vegan', 'jain'])
    .withMessage('Invalid food habits'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('moveInDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

const updateSeekerPreferencesValidation = [
  body('budgetMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum budget must be a positive number'),
  body('budgetMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum budget must be a positive number'),
  body('preferredLocations')
    .optional()
    .isArray()
    .withMessage('Preferred locations must be an array'),
  body('roomTypePreference')
    .optional()
    .isArray()
    .withMessage('Room type preferences must be an array'),
  body('genderPreference')
    .optional()
    .isIn(['any', 'male', 'female'])
    .withMessage('Invalid gender preference'),
  body('moveInDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

// Routes
router.get('/profile', getUserProfile);
router.put('/profile', updateProfileValidation, validateRequest, updateUserProfile);
router.post('/profile/photo', uploadProfilePhoto);
router.get('/verification-status', getVerificationStatus);
router.post('/verification-request', requestVerification);

// Seeker-specific routes
router.put('/seeker-preferences', updateSeekerPreferencesValidation, validateRequest, updateUserProfile);

export default router;
