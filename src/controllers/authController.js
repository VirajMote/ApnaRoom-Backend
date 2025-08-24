import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { setCache, deleteCache } from '../config/redis.js';
import { sendEmail } from '../services/emailService.js';
import { AppError, AuthenticationError, ConflictError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// User registration
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, userType } = req.body;

  // Check if user already exists
  const client = await pool.connect();
  try {
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, verification_status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, email, full_name, user_type, verification_status, created_at`,
      [email, passwordHash, fullName, userType]
    );

    const user = userResult.rows[0];

    // Store verification token in Redis
    await setCache(`verification:${verificationToken}`, user.id, 24 * 60 * 60);

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify your ApnaRoom account',
      template: 'emailVerification',
      data: {
        name: fullName,
        verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token in database
    await client.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // Remove sensitive data
    delete user.password_hash;

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } finally {
    client.release();
  }
});

// User login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const client = await pool.connect();
  try {
    // Find user
    const userResult = await client.query(
      `SELECT id, email, password_hash, full_name, user_type, verification_status, email_verified
       FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }

    const user = userResult.rows[0];

    // Check if account is rejected
    if (user.verification_status === 'rejected') {
      throw new AuthenticationError('Account has been rejected');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update refresh token in database
    await client.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } finally {
    client.release();
  }
});

// Refresh access token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

    const client = await pool.connect();
    try {
      // Check if refresh token exists in database
      const userResult = await client.query(
        'SELECT id, refresh_token FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        throw new AuthenticationError('User not found');
      }

      const user = userResult.rows[0];

      if (user.refresh_token !== refreshToken) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, newRefreshToken } = generateTokens(user.id);

      // Update refresh token in database
      await client.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2',
        [newRefreshToken, user.id]
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken
          }
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid refresh token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Refresh token expired');
    }
    throw error;
  }
});

// User logout
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const userId = req.user.id;

  if (refreshToken) {
    // Blacklist refresh token in Redis
    await setCache(`blacklist:${refreshToken}`, true, 30 * 24 * 60 * 60); // 30 days

    // Remove refresh token from database
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET refresh_token = NULL WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const client = await pool.connect();
  try {
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, full_name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token in Redis
    await setCache(`reset:${resetToken}`, user.id, 60 * 60);

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Reset your ApnaRoom password',
      template: 'passwordReset',
      data: {
        name: user.full_name,
        resetLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      }
    });

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } finally {
    client.release();
  }
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Get user ID from reset token
  const userId = await getCache(`reset:${token}`);
  if (!userId) {
    throw new AuthenticationError('Invalid or expired reset token');
  }

  // Hash new password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const client = await pool.connect();
  try {
    // Update password
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );

    // Remove reset token from Redis
    await deleteCache(`reset:${token}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } finally {
    client.release();
  }
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  // Get user ID from verification token
  const userId = await getCache(`verification:${token}`);
  if (!userId) {
    throw new AuthenticationError('Invalid or expired verification token');
  }

  const client = await pool.connect();
  try {
    // Update user verification status
    await client.query(
      'UPDATE users SET verification_status = $1, email_verified = $2 WHERE id = $3',
      ['verified', true, userId]
    );

    // Remove verification token from Redis
    await deleteCache(`verification:${token}`);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } finally {
    client.release();
  }
});

// Resend verification email
export const resendVerification = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    // Get user details
    const userResult = await client.query(
      'SELECT email, full_name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      throw new AppError('Email is already verified', 400);
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store verification token in Redis
    await setCache(`verification:${verificationToken}`, userId, 24 * 60 * 60);

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify your ApnaRoom account',
      template: 'emailVerification',
      data: {
        name: user.full_name,
        verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
      }
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } finally {
    client.release();
  }
});
