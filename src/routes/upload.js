import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  uploadProfilePhoto,
  uploadListingPhotos,
  deletePhoto
} from '../controllers/uploadController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const uploadValidation = [
  body('type')
    .isIn(['profile', 'listing'])
    .withMessage('Upload type must be either profile or listing'),
  body('listingId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid listing ID')
];

// Routes
router.post('/', uploadValidation, validateRequest, uploadProfilePhoto);
router.post('/listing/:listingId', uploadListingPhotos);
router.delete('/:photoId', deletePhoto);

export default router;
