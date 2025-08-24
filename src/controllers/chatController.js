import { getSupabase } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const supabase = getSupabase();

// Get user conversations
export const getUserConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:users!conversations_participant1_id_fkey(id, full_name, email),
        participant2:users!conversations_participant2_id_fkey(id, full_name, email),
        listing:listings!conversations_listing_id_fkey(id, title, location),
        last_message:messages!conversations_last_message_at_fkey(content, created_at, sender_id)
      `)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch conversations', 500);
    }

    // Format conversations to show the other participant
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participant1_id === userId 
        ? conv.participant2 
        : conv.participant1;
      
      return {
        ...conv,
        other_participant: otherParticipant
      };
    });

    res.json({
      success: true,
      data: formattedConversations
    });
  } catch (error) {
    next(error);
  }
};

// Create new conversation
export const createConversation = async (req, res, next) => {
  try {
    const { participant2Id, listingId } = req.body;
    const participant1Id = req.user.id;

    if (participant1Id === participant2Id) {
      throw new AppError('Cannot create conversation with yourself', 400);
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${participant1Id},participant2_id.eq.${participant2Id}),and(participant1_id.eq.${participant2Id},participant2_id.eq.${participant1Id})`)
      .single();

    if (existingConv) {
      return res.json({
        success: true,
        data: existingConv,
        message: 'Conversation already exists'
      });
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        participant1_id: participant1Id,
        participant2_id: participant2Id,
        listing_id: listingId
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create conversation', 500);
    }

    res.status(201).json({
      success: true,
      data: conversation,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get conversation messages
export const getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .single();

    if (convError) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError('Failed to fetch messages', 500);
    }

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// Send message
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const senderId = req.user.id;

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${senderId},participant2_id.eq.${senderId}`)
      .single();

    if (convError) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    // Create message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      throw new AppError('Failed to send message', 500);
    }

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .single();

    if (convError) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    // Mark unread messages as read
    const { error } = await supabase
      .from('messages')
      .update({ read_status: true })
      .eq('conversation_id', conversationId)
      .eq('sender_id', '!=', userId)
      .eq('read_status', false);

    if (error) {
      throw new AppError('Failed to mark messages as read', 500);
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Delete conversation
export const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .single();

    if (convError) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    // Delete conversation (messages will be deleted due to CASCADE)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw new AppError('Failed to delete conversation', 500);
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
