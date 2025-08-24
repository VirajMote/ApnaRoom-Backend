import { validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

// Validation middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    const error = new ValidationError('Validation failed', errorMessages);
    return next(error);
  }

  next();
};

// Custom validation functions
export const validateObjectId = (value) => {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return true;
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format');
  }
  return true;
};

export const validatePrice = (price) => {
  if (isNaN(price) || parseFloat(price) < 0) {
    throw new Error('Price must be a positive number');
  }
  return true;
};

export const validateDate = (date) => {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date format');
  }
  return true;
};

export const validateArray = (array, minLength = 0, maxLength = null) => {
  if (!Array.isArray(array)) {
    throw new Error('Must be an array');
  }
  
  if (array.length < minLength) {
    throw new Error(`Array must have at least ${minLength} items`);
  }
  
  if (maxLength && array.length > maxLength) {
    throw new Error(`Array must have at most ${maxLength} items`);
  }
  
  return true;
};

export const validateEnum = (value, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`Value must be one of: ${allowedValues.join(', ')}`);
  }
  return true;
};

export const validateFileType = (file, allowedTypes) => {
  if (!file) {
    throw new Error('File is required');
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return true;
};

export const validateFileSize = (file, maxSize) => {
  if (!file) {
    throw new Error('File is required');
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`File size too large. Maximum size: ${maxSizeMB}MB`);
  }
  
  return true;
};

// Sanitization functions
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;
  return email.toLowerCase().trim();
};

export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return phone;
  return phone.replace(/\D/g, '');
};

export const sanitizePrice = (price) => {
  if (typeof price === 'string') {
    return parseFloat(price.replace(/[^\d.]/g, ''));
  }
  return parseFloat(price);
};

export const sanitizeArray = (array) => {
  if (!Array.isArray(array)) return [];
  return array.filter(item => item && typeof item === 'string').map(item => item.trim());
};

// Custom validation for specific fields
export const validateLocation = (location) => {
  if (!location || typeof location !== 'string' || location.trim().length < 3) {
    throw new Error('Location must be at least 3 characters long');
  }
  return true;
};

export const validateBio = (bio) => {
  if (bio && typeof bio === 'string' && bio.length > 1000) {
    throw new Error('Bio must be less than 1000 characters');
  }
  return true;
};

export const validateAmenities = (amenities) => {
  if (!Array.isArray(amenities)) {
    throw new Error('Amenities must be an array');
  }
  
  const validAmenities = [
    'WiFi', 'Parking', 'Kitchen', 'AC', 'Washing Machine', 'Gym',
    'Swimming Pool', 'Security', 'Elevator', 'Balcony', 'Furnished'
  ];
  
  for (const amenity of amenities) {
    if (!validAmenities.includes(amenity)) {
      throw new Error(`Invalid amenity: ${amenity}`);
    }
  }
  
  return true;
};

export const validateRoomType = (roomType) => {
  const validTypes = ['private', 'shared', 'studio', '1bhk', '2bhk', '3bhk'];
  if (!validTypes.includes(roomType)) {
    throw new Error(`Room type must be one of: ${validTypes.join(', ')}`);
  }
  return true;
};

export const validateGender = (gender) => {
  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(gender)) {
    throw new Error(`Gender must be one of: ${validGenders.join(', ')}`);
  }
  return true;
};

export const validateFoodHabits = (foodHabits) => {
  const validHabits = ['veg', 'nonveg', 'vegan', 'jain'];
  if (!validHabits.includes(foodHabits)) {
    throw new Error(`Food habits must be one of: ${validHabits.join(', ')}`);
  }
  return true;
};
