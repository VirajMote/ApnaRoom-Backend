import express from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken, requireLister, requireOwnership } from '../middleware/auth.js';
import {
  getAllListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  searchListings,
  getMyListings,
  uploadListingPhotos,
  deleteListingPhoto,
  updateListingStatus
} from '../controllers/listingController.js';

const router = express.Router();

// Validation schemas
const createListingValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('location')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Location must be between 3 and 255 characters'),
  body('rentAmount')
    .isFloat({ min: 0 })
    .withMessage('Rent amount must be a positive number'),
  body('depositAmount')
    .isFloat({ min: 0 })
    .withMessage('Deposit amount must be a positive number'),
  body('roomType')
    .isIn(['private', 'shared', 'studio', '1bhk', '2bhk', '3bhk'])
    .withMessage('Invalid room type'),
  body('furnishedStatus')
    .optional()
    .isIn(['fully', 'semi', 'unfurnished'])
    .withMessage('Invalid furnished status'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('genderPreference')
    .optional()
    .isIn(['any', 'male', 'female'])
    .withMessage('Invalid gender preference'),
  body('ageRangePreference')
    .optional()
    .matches(/^\d+-\d+$/)
    .withMessage('Age range must be in format: min-max'),
  body('occupationPreference')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Occupation preference must be less than 255 characters'),
  body('houseRules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('House rules must be less than 1000 characters')
];

const updateListingValidation = [
  param('id')
    .isInt()
    .withMessage('Invalid listing ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Location must be between 3 and 255 characters'),
  body('rentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rent amount must be a positive number'),
  body('depositAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Deposit amount must be a positive number'),
  body('roomType')
    .optional()
    .isIn(['private', 'shared', 'studio', '1bhk', '2bhk', '3bhk'])
    .withMessage('Invalid room type'),
  body('furnishedStatus')
    .optional()
    .isIn(['fully', 'semi', 'unfurnished'])
    .withMessage('Invalid furnished status'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('genderPreference')
    .optional()
    .isIn(['any', 'male', 'female'])
    .withMessage('Invalid gender preference'),
  body('ageRangePreference')
    .optional()
    .matches(/^\d+-\d+$/)
    .withMessage('Age range must be in format: min-max'),
  body('occupationPreference')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Occupation preference must be less than 255 characters'),
  body('houseRules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('House rules must be less than 1000 characters')
];

const searchValidation = [
  query('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  query('minRent')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum rent must be a positive number'),
  query('maxRent')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum rent must be a positive number'),
  query('roomType')
    .optional()
    .isIn(['private', 'shared', 'studio', '1bhk', '2bhk', '3bhk'])
    .withMessage('Invalid room type'),
  query('furnished')
    .optional()
    .isIn(['fully', 'semi', 'unfurnished'])
    .withMessage('Invalid furnished status'),
  query('gender')
    .optional()
    .isIn(['any', 'male', 'female'])
    .withMessage('Invalid gender preference'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Public routes
router.get('/', getAllListings);
router.get('/search', searchValidation, validateRequest, searchListings);
router.get('/:id', getListingById);

// Protected routes (require authentication)
router.use(authenticateToken);

// Lister-only routes
router.post('/', requireLister, createListingValidation, validateRequest, createListing);
router.get('/my/listings', requireLister, getMyListings);
router.put('/:id', requireLister, requireOwnership('listing'), updateListingValidation, validateRequest, updateListing);
router.delete('/:id', requireLister, requireOwnership('listing'), deleteListing);
router.patch('/:id/status', requireLister, requireOwnership('listing'), updateListingStatus);
router.post('/:id/photos', requireLister, requireOwnership('listing'), uploadListingPhotos);
router.delete('/:id/photos/:photoId', requireLister, requireOwnership('listing'), deleteListingPhoto);

export default router;
