import express from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';
import {
  getUserConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  deleteConversation
} from '../controllers/chatController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schemas
const createConversationValidation = [
  body('participantId')
    .isInt({ min: 1 })
    .withMessage('Invalid participant ID'),
  body('listingId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid listing ID'),
  body('initialMessage')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Initial message must be between 1 and 1000 characters')
];

const sendMessageValidation = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Invalid message type')
];

const markAsReadValidation = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID'),
  body('messageIds')
    .isArray({ min: 1 })
    .withMessage('Message IDs must be an array with at least one element'),
  body('messageIds.*')
    .isInt({ min: 1 })
    .withMessage('Each message ID must be a positive integer')
];

const searchConversationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// Routes
router.get('/', searchConversationsValidation, validateRequest, getUserConversations);
router.post('/', createConversationValidation, validateRequest, createConversation);
router.get('/:conversationId/messages', requireOwnership('conversation'), getConversationMessages);
router.post('/:conversationId/messages', requireOwnership('conversation'), sendMessageValidation, validateRequest, sendMessage);
router.patch('/:conversationId/read', requireOwnership('conversation'), markAsReadValidation, validateRequest, markMessagesAsRead);
router.delete('/:conversationId', requireOwnership('conversation'), deleteConversation);

export default router;
