import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  emailVerification: (data) => ({
    subject: 'Verify your ApnaRoom account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your ApnaRoom account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ApnaRoom!</h1>
            <p>Your smart flatmate finder</p>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>Thank you for joining ApnaRoom! To complete your registration and start finding your perfect flatmate, please verify your email address.</p>
            <p>Click the button below to verify your account:</p>
            <a href="${data.verificationLink}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.verificationLink}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with ApnaRoom, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ApnaRoom. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Reset your ApnaRoom password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your ApnaRoom password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>ApnaRoom Account Security</p>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>We received a request to reset your ApnaRoom account password. If you made this request, click the button below to create a new password:</p>
            <a href="${data.resetLink}" class="button">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetLink}</p>
            <p>This password reset link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, we recommend changing your password regularly and never sharing it with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ApnaRoom. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  newMatch: (data) => ({
    subject: 'New flatmate match found! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New flatmate match found!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .match-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .compatibility { background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 14px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Match Found!</h1>
            <p>Your perfect flatmate is waiting</p>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>Great news! We found a new flatmate match for you with <strong>${data.compatibilityScore}% compatibility</strong>.</p>
            
            <div class="match-card">
              <h3>${data.matchType === 'listing' ? 'Property Details' : 'Seeker Profile'}</h3>
              ${data.matchType === 'listing' ? `
                <p><strong>Location:</strong> ${data.location}</p>
                <p><strong>Rent:</strong> ₹${data.rent}/month</p>
                <p><strong>Room Type:</strong> ${data.roomType}</p>
              ` : `
                <p><strong>Name:</strong> ${data.seekerName}</p>
                <p><strong>Age:</strong> ${data.seekerAge} years</p>
                <p><strong>Occupation:</strong> ${data.seekerOccupation}</p>
              `}
              <p><strong>Compatibility:</strong> <span class="compatibility">${data.compatibilityScore}% Match</span></p>
            </div>
            
            <p>Don't miss this opportunity! Click the button below to view the full details and start a conversation:</p>
            <a href="${data.matchLink}" class="button">View Match Details</a>
            
            <p>You can also check your dashboard for more matches and manage your preferences.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ApnaRoom. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  newMessage: (data) => ({
    subject: 'New message from ${data.senderName}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New message received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 New Message</h1>
            <p>Someone wants to connect with you</p>
          </div>
          <div class="content">
            <h2>Hi ${data.recipientName},</h2>
            <p>You have a new message from <strong>${data.senderName}</strong> regarding your flatmate search.</p>
            
            <div class="message-box">
              <p><strong>Message:</strong></p>
              <p>"${data.messagePreview}"</p>
            </div>
            
            <p>Click the button below to view the full conversation and reply:</p>
            <a href="${data.chatLink}" class="button">View Conversation</a>
            
            <p>You can also check your messages dashboard to see all your conversations.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ApnaRoom. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  listingUpdate: (data) => ({
    subject: 'Your listing has been updated',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Listing Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Listing Update</h1>
            <p>Your property is getting attention</p>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>Your listing "<strong>${data.listingTitle}</strong>" has been updated with new activity:</p>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${data.views}</div>
                <div>Total Views</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.applications}</div>
                <div>Applications</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.matches}</div>
                <div>New Matches</div>
              </div>
            </div>
            
            <p>Keep your listing active to get more responses. You can also:</p>
            <ul>
              <li>Add more photos to attract more seekers</li>
              <li>Update your preferences for better matches</li>
              <li>Respond to applications quickly</li>
            </ul>
            
            <a href="${data.dashboardLink}" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 ApnaRoom. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const { to, subject, template, data, html, text } = options;
    
    let emailContent;
    
    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else {
      emailContent = {
        subject: subject || 'ApnaRoom Notification',
        html: html || text || 'No content provided'
      };
    }

    const mailOptions = {
      from: `"ApnaRoom" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text || emailContent.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: to,
      subject: emailContent.subject
    });

    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

// Send bulk emails
export const sendBulkEmails = async (recipients, options) => {
  try {
    const transporter = createTransporter();
    const results = [];

    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: `"ApnaRoom" <${process.env.EMAIL_USER}>`,
          to: recipient.email,
          subject: options.subject,
          html: options.html,
          text: options.text
        };

        const info = await transporter.sendMail(mailOptions);
        results.push({
          email: recipient.email,
          success: true,
          messageId: info.messageId
        });
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Bulk email sending failed:', error);
    throw new Error('Failed to send bulk emails');
  }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email configuration verification failed:', error.message);
    return false;
  }
};

// Test email sending
export const sendTestEmail = async (to) => {
  try {
    await sendEmail({
      to,
      subject: 'ApnaRoom Test Email',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from ApnaRoom backend.</p>
        <p>If you received this, the email service is working correctly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });
    
    console.log('✅ Test email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    return false;
  }
};
