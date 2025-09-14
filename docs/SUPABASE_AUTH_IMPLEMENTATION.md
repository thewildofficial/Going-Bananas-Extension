# Supabase Authentication Implementation

This document describes the implementation of Google login functionality using Supabase for the Going Bananas browser extension.

## Overview

The authentication system integrates Supabase with Google OAuth to provide seamless user authentication and personalization for the T&C analyzer extension.

## Architecture

### Frontend (Extension)
- **Supabase Client**: Handles authentication state and token management
- **Auth Service**: Manages authentication flow and user state
- **Login Components**: UI components for sign-in/sign-out
- **Personalization Form**: Multi-step form for first-time user setup
- **Chrome Identity API**: Handles OAuth flow in browser extension context

### Backend (API)
- **Supabase Service**: Server-side Supabase integration
- **Authentication Routes**: RESTful endpoints for auth operations
- **Personalization Integration**: Links auth with existing personalization system
- **Dual Auth Support**: Maintains compatibility with Firebase auth

## Implementation Details

### 1. Extension Setup

#### Dependencies Added
```json
{
  "@supabase/supabase-js": "^2.38.4"
}
```

#### Manifest Permissions
```json
{
  "permissions": [
    "activeTab",
    "storage", 
    "scripting",
    "identity"
  ]
}
```

### 2. Authentication Flow

#### First-Time User Experience
1. User installs extension
2. Extension opens popup with login prompt
3. User clicks "Sign in with Google"
4. Chrome Identity API launches OAuth flow
5. User completes Google authentication
6. Extension receives auth code and exchanges for Supabase session
7. First-time users see personalization form
8. Form data is submitted to backend personalization API
9. User profile is created and linked

#### Returning User Experience
1. User opens extension popup
2. Extension checks for existing session
3. If session exists, user sees personalized analysis
4. If session expired, user is prompted to sign in again

### 3. Components

#### LoginButton Component
- Handles sign-in/sign-out UI
- Shows user profile when authenticated
- Provides compact and full variants

#### PersonalizationForm Component
- Multi-step form with 4 sections:
  1. Demographics (age, country, occupation)
  2. Digital Behavior (tech comfort, reading habits)
  3. Risk Preferences (privacy, financial, legal)
  4. Context & Preferences (dependents, alert settings)

#### PopupWithAuth Component
- Enhanced popup with authentication state
- Shows login prompt for unauthenticated users
- Shows personalization form for first-time users
- Shows analysis for authenticated users

#### OptionsWithAuth Component
- Enhanced settings page with user profile
- Login/logout functionality
- User information display

### 4. Backend Integration

#### Supabase Service
```javascript
class SupabaseService {
  // Token verification
  async verifyToken(token)
  
  // User management
  async getUser(userId)
  async createUser(userData)
  async updateUser(userId, updateData)
  async deleteUser(userId)
  
  // Middleware
  getAuthMiddleware()
  getOptionalAuthMiddleware()
}
```

#### Authentication Routes
- `POST /api/supabase-auth/verify` - Verify JWT token
- `POST /api/supabase-auth/create-user` - Create new user
- `GET /api/supabase-auth/user/:userId` - Get user info
- `PUT /api/supabase-auth/user/:userId` - Update user
- `DELETE /api/supabase-auth/user/:userId` - Delete user
- `POST /api/supabase-auth/link-profile` - Link with personalization

### 5. Data Flow

#### Authentication
```
Extension → Chrome Identity API → Google OAuth → Supabase → Backend API
```

#### Personalization
```
User Form → Extension → Backend API → Personalization Service → MongoDB
```

#### Analysis
```
Page Analysis → Extension → Backend API → Gemini AI → Personalized Results
```

## Configuration

### Environment Variables

#### Extension (.env)
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_SUPABASE_CLIENT_ID=your-google-oauth-client-id
```

#### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Setup

1. Create Supabase project
2. Enable Google OAuth provider
3. Configure OAuth redirect URLs
4. Set up Row Level Security (RLS) policies
5. Create user profiles table

## Security Considerations

### Token Management
- JWT tokens are stored securely in Chrome storage
- Tokens are automatically refreshed
- Sensitive data is never stored in plain text

### OAuth Flow
- Uses Chrome Identity API for secure OAuth
- Redirect URLs are validated
- State parameter prevents CSRF attacks

### Data Protection
- User data is encrypted in transit
- Personalization data is stored securely
- GDPR compliance features included

## Testing

### Manual Testing
1. Install extension in development mode
2. Test first-time user flow
3. Test returning user flow
4. Test personalization form submission
5. Test logout functionality

### Automated Testing
- Unit tests for auth service
- Integration tests for API endpoints
- E2E tests for complete auth flow

## Deployment

### Extension
1. Build extension with production config
2. Update Supabase URLs to production
3. Test OAuth flow in production
4. Submit to Chrome Web Store

### Backend
1. Deploy to production server
2. Update environment variables
3. Configure production Supabase project
4. Test API endpoints

## Troubleshooting

### Common Issues

#### OAuth Flow Fails
- Check Chrome Identity API permissions
- Verify redirect URLs in Supabase
- Ensure client ID is correct

#### Token Verification Fails
- Check Supabase service initialization
- Verify JWT token format
- Check network connectivity

#### Personalization Not Saving
- Verify backend API connectivity
- Check user authentication state
- Review form validation

### Debug Mode
Enable debug logging in development:
```javascript
localStorage.setItem('debug', 'supabase:*');
```

## Future Enhancements

### Planned Features
- Multi-provider authentication (GitHub, Microsoft)
- Advanced personalization options
- User preference synchronization
- Analytics and usage tracking

### Performance Optimizations
- Token caching improvements
- Lazy loading of auth components
- Background session refresh
- Offline capability

## Support

For issues or questions:
- Check the troubleshooting section
- Review Supabase documentation
- Contact the development team
- Open an issue on GitHub