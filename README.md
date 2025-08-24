# ApnaRoom Backend API

A comprehensive Node.js backend for the ApnaRoom Smart Flatmate Finder platform.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with refresh tokens
- 👥 **User Management**: Seeker and Lister profiles with verification
- 🏠 **Property Listings**: CRUD operations for room listings
- 🎯 **Smart Matching**: AI-powered compatibility algorithm
- 💬 **Real-time Chat**: Socket.IO based messaging system
- 🔍 **Advanced Search**: Full-text search with filters
- 📧 **Email Notifications**: Automated email system
- 📱 **File Upload**: Cloudinary integration for images
- 🚀 **Performance**: Redis caching and rate limiting
- 🛡️ **Security**: Helmet, CORS, input validation

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Validation**: Joi + express-validator

## Prerequisites

- Node.js >= 18.0.0
- Supabase account and project
- Redis >= 6.0
- npm >= 8.0.0

## Installation

### Quick Setup (Recommended)

**Windows:**
```bash
git clone <repository-url>
cd apnaroom-backend
install.bat
```

**Linux/Mac:**
```bash
git clone <repository-url>
cd apnaroom-backend
chmod +x install.sh
./install.sh
```

### Manual Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apnaroom-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   **Supabase Configuration:**
   1. Create a new project at [supabase.com](https://supabase.com)
   2. Get your project URL and API keys from Settings > API
   3. Copy environment file:
   ```bash
   cp env.example .env
   ```
   4. Update `.env` with your Supabase credentials:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   
   **Other Services:**
   - Configure Redis, Cloudinary, and email settings in `.env`

4. **Database Setup**
   
   **Option 1: Automatic Setup (Recommended)**
   ```bash
   # Run migrations (creates tables automatically)
   npm run db:migrate
   
   # Seed with sample data (optional)
   npm run db:seed
   ```
   
   **Option 2: Manual Setup (if automatic fails)**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Run the script to create all tables manually
   
   **Note**: The automatic setup uses Supabase's RPC functionality. If you encounter issues, use the manual SQL script.

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload-photo` - Upload profile photo
- `GET /api/users/verification-status` - Check verification status

### Listings
- `GET /api/listings` - Get all listings
- `POST /api/listings` - Create new listing
- `GET /api/listings/:id` - Get specific listing
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing
- `GET /api/listings/search` - Search listings

### Matching
- `POST /api/matching/calculate` - Calculate compatibility
- `GET /api/matching/seeker-matches` - Get seeker matches
- `GET /api/matching/lister-matches` - Get lister matches
- `POST /api/matching/save` - Save listing to favorites

### Chat
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Start new conversation
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/conversations/:id/messages` - Send message

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `user_profiles` - Extended user information
- `listings` - Property listings
- `listing_photos` - Property images
- `seeker_preferences` - User preferences for matching
- `matches` - Compatibility matches
- `conversations` - Chat conversations
- `messages` - Individual chat messages

## Environment Variables

Key environment variables to configure:
- Database connection details
- JWT secrets
- Cloudinary credentials
- Email configuration
- Redis connection
- CORS origins

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Check code quality
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

### Code Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── database/        # Database setup and migrations
├── socket/          # Socket.IO handlers
└── server.js        # Main server file
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testNamePattern="auth"
```

## Troubleshooting

### Supabase Issues

**Table Creation Fails:**
- If automatic table creation fails, use the manual SQL script in `supabase-setup.sql`
- Ensure you have the correct service role key (not the anon key)
- Check that your Supabase project has the necessary extensions enabled

**Connection Issues:**
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure your Supabase project is active and not paused
- Check if there are any IP restrictions on your Supabase project

**RLS Policy Issues:**
- The SQL script includes basic RLS policies
- You may need to customize these based on your authentication setup
- Consider using Supabase Auth if you want to leverage built-in authentication

### General Issues

**Redis Connection:**
- Ensure Redis server is running and accessible
- Check Redis host, port, and password in `.env`

**File Upload:**
- Verify Cloudinary credentials are correct
- Check file size limits and allowed file types

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   NODE_ENV=production
   ```

3. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name "apnaroom-backend"
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the repository.
