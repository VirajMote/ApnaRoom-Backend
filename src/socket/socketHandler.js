import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { setCache, getCache, deleteCache } from '../config/redis.js';
import { sendEmail } from '../services/emailService.js';

// Store connected users
const connectedUsers = new Map();
const userSockets = new Map();

// Setup Socket.IO
export const setupSocketIO = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, full_name, user_type FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          return next(new Error('User not found'));
        }

        const user = result.rows[0];
        socket.user = {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          userType: user.user_type
        };

        next();
      } finally {
        client.release();
      }
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.fullName} (${socket.user.id})`);

    // Store user connection
    connectedUsers.set(socket.user.id, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    userSockets.set(socket.user.id, socket.id);

    // Join user to their personal room
    socket.join(`user:${socket.user.id}`);

    // Update online status
    updateOnlineStatus(socket.user.id, true);

    // Handle user typing
    socket.on('typing', async (data) => {
      const { conversationId, isTyping } = data;
      
      // Emit typing status to other participants
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        userId: socket.user.id,
        userName: socket.user.fullName,
        isTyping,
        conversationId
      });
    });

    // Handle new message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, content, messageType = 'text' } = data;
        
        if (!conversationId || !content) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        // Save message to database
        const client = await pool.connect();
        try {
          // Verify user is part of conversation
          const convResult = await client.query(
            'SELECT participant1_id, participant2_id FROM conversations WHERE id = $1',
            [conversationId]
          );

          if (convResult.rows.length === 0) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          const conversation = convResult.rows[0];
          if (conversation.participant1_id !== socket.user.id && conversation.participant2_id !== socket.user.id) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Insert message
          const messageResult = await client.query(
            `INSERT INTO messages (conversation_id, sender_id, content, message_type)
             VALUES ($1, $2, $3, $4)
             RETURNING id, created_at`,
            [conversationId, socket.user.id, content, messageType]
          );

          const message = messageResult.rows[0];

          // Update conversation last message time
          await client.query(
            'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
            [message.created_at, conversationId]
          );

          // Get recipient ID
          const recipientId = conversation.participant1_id === socket.user.id 
            ? conversation.participant2_id 
            : conversation.participant1_id;

          // Prepare message data
          const messageData = {
            id: message.id,
            conversationId,
            senderId: socket.user.id,
            senderName: socket.user.fullName,
            content,
            messageType,
            timestamp: message.created_at,
            read: false
          };

          // Emit to conversation room
          io.to(`conversation:${conversationId}`).emit('newMessage', messageData);

          // Emit to recipient's personal room
          io.to(`user:${recipientId}`).emit('newMessageNotification', {
            conversationId,
            senderName: socket.user.fullName,
            content: content.length > 50 ? content.substring(0, 50) + '...' : content,
            timestamp: message.created_at
          });

          // Send email notification if user is offline
          if (!connectedUsers.has(recipientId)) {
            await sendMessageEmailNotification(recipientId, socket.user.fullName, content);
          }

        } finally {
          client.release();
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message read status
    socket.on('markAsRead', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
          return;
        }

        // Update message read status in database
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE messages SET read_status = true WHERE id = ANY($1) AND conversation_id = $2',
            [messageIds, conversationId]
          );

          // Emit read status to conversation
          socket.to(`conversation:${conversationId}`).emit('messagesRead', {
            messageIds,
            readBy: socket.user.id,
            timestamp: new Date()
          });

        } finally {
          client.release();
        }

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle conversation join
    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.user.fullName} joined conversation ${conversationId}`);
    });

    // Handle conversation leave
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.user.fullName} left conversation ${conversationId}`);
    });

    // Handle user status update
    socket.on('updateStatus', (status) => {
      const userData = connectedUsers.get(socket.user.id);
      if (userData) {
        userData.status = status;
        userData.lastStatusUpdate = new Date();
        
        // Broadcast status to all connected users
        socket.broadcast.emit('userStatusUpdate', {
          userId: socket.user.id,
          status,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.fullName} (${socket.user.id})`);
      
      // Remove from connected users
      connectedUsers.delete(socket.user.id);
      userSockets.delete(socket.user.id);

      // Update online status
      updateOnlineStatus(socket.user.id, false);

      // Broadcast user offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.user.id,
        timestamp: new Date()
      });
    });
  });

  // Handle errors
  io.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
};

// Update user online status
const updateOnlineStatus = async (userId, isOnline) => {
  try {
    const status = isOnline ? 'online' : 'offline';
    const lastSeen = isOnline ? new Date() : new Date();
    
    await setCache(`user:${userId}:status`, { status, lastSeen }, 24 * 60 * 60);
    
    // Also store in user's personal hash
    await setCache(`user:${userId}:presence`, { status, lastSeen }, 24 * 60 * 60);
  } catch (error) {
    console.error('Error updating online status:', error);
  }
};

// Send email notification for new message
const sendMessageEmailNotification = async (recipientId, senderName, messageContent) => {
  try {
    const client = await pool.connect();
    try {
      // Get recipient details
      const userResult = await client.query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [recipientId]
      );

      if (userResult.rows.length === 0) return;

      const recipient = userResult.rows[0];

      // Send email notification
      await sendEmail({
        to: recipient.email,
        template: 'newMessage',
        data: {
          recipientName: recipient.full_name,
          senderName,
          messagePreview: messageContent,
          chatLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/chat`
        }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error sending message email notification:', error);
  }
};

// Get user's online status
export const getUserStatus = async (userId) => {
  try {
    const status = await getCache(`user:${userId}:status`);
    return status || { status: 'offline', lastSeen: null };
  } catch (error) {
    console.error('Error getting user status:', error);
    return { status: 'offline', lastSeen: null };
  }
};

// Get all online users
export const getOnlineUsers = () => {
  return Array.from(connectedUsers.values()).map(user => ({
    id: user.user.id,
    email: user.user.email,
    fullName: user.user.fullName,
    userType: user.user.userType,
    connectedAt: user.connectedAt
  }));
};

// Send notification to specific user
export const sendUserNotification = (userId, notification) => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    const io = require('socket.io');
    io.to(socketId).emit('notification', notification);
  }
};

// Broadcast to all connected users
export const broadcastToAll = (event, data) => {
  const io = require('socket.io');
  io.emit(event, data);
};

// Get socket instance for a user
export const getUserSocket = (userId) => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    const io = require('socket.io');
    return io.sockets.sockets.get(socketId);
  }
  return null;
};
