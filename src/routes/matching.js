import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken, requireSeeker, requireLister } from '../middleware/auth.js';
import {
  calculateCompatibility,
  getSeekerMatches,
  getListerMatches,
  saveListing,
  unsaveListing,
  getSavedListings,
  updateMatchStatus
} from '../controllers/matchingController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const saveListingValidation = [
  body('listingId')
    .isInt({ min: 1 })
    .withMessage('Invalid listing ID')
];

const updateMatchStatusValidation = [
  body('status')
    .isIn(['accepted', 'rejected', 'expired'])
    .withMessage('Invalid match status')
];

const searchMatchesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('minCompatibility')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Minimum compatibility must be between 0 and 100'),
  query('maxCompatibility')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Maximum compatibility must be between 0 and 100')
];

// Routes
router.post('/calculate', calculateCompatibility);

// Seeker routes
router.get('/seeker-matches', requireSeeker, searchMatchesValidation, validateRequest, getSeekerMatches);
router.post('/save', requireSeeker, saveListingValidation, validateRequest, saveListing);
router.delete('/unsave/:listingId', requireSeeker, unsaveListing);
router.get('/saved', requireSeeker, getSavedListings);

// Lister routes
router.get('/lister-matches', requireLister, searchMatchesValidation, validateRequest, getListerMatches);
router.patch('/:matchId/status', requireLister, updateMatchStatusValidation, validateRequest, updateMatchStatus);

export default router;
