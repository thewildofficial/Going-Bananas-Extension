# Supabase Integration Guide

## Overview

This guide explains how to use the Supabase CLI to inspect your remote database schemas and integrate them properly with your backend services.

## What We've Accomplished

### ✅ Supabase CLI Setup
- Installed Supabase CLI via Homebrew
- Initialized local Supabase project configuration
- Linked to your remote project (`yoniuihgyzowmlvsmayt`)

### ✅ Schema Inspection
- Generated TypeScript types from your remote schema
- Created inspection scripts to understand table structures
- Identified all available tables, views, and functions

## Your Current Database Schema

### Tables
1. **`analyses_generic`** - Generic analysis results (not user-specific)
2. **`analyses_personalized`** - User-specific analysis results with personalization
3. **`analysis_history`** - Historical analysis records for users
4. **`documents`** - Document metadata and content hashes
5. **`user_preferences`** - User personalization preferences and settings
6. **`user_profiles`** - User profile information (authentication data)

### Views
1. **`user_dashboard`** - Aggregated user data for dashboard display

### Functions
1. **`get_user_stats`** - Returns user statistics and metrics

## Key Schema Insights

### User Preferences Table Structure
```sql
user_preferences:
- id (string, primary key)
- user_id (string, foreign key to user_profiles)
- analysis_preferences (json)
- notification_preferences (json)
- privacy_importance (string)
- risk_tolerance (string)
- created_at (timestamp)
- updated_at (timestamp)
```

### Analysis Tables Structure
```sql
analyses_personalized:
- id (string, primary key)
- user_id (string, foreign key)
- content_hash (string)
- options_hash (string)
- personalization_hash (string)
- analysis_version (string)
- result (json)
- risk_score (number)
- ttl_expires_at (timestamp)
- updated_at (timestamp)
```

## Updated Backend Integration

### 1. TypeScript Types
Generated types are available in `types/supabase.ts` with full type safety for:
- Table row types
- Insert types
- Update types
- Relationship mappings

### 2. Updated Services
- **`SupabasePersonalizationService`** - Updated to use correct table names
- **`PersonalizationService`** - Updated to work with actual schema
- All services now use the development logging system

### 3. Key Changes Made

#### Table Name Corrections
- ❌ `user_personalization_profiles` → ✅ `user_preferences`
- ❌ `cached_analyses` → ✅ `analyses_personalized`

#### New Features Added
- Analysis history tracking via `analysis_history` table
- User dashboard data via `user_dashboard` view
- User statistics via `get_user_stats` function
- Proper content hashing for cache management

## Usage Examples

### Save User Preferences
```javascript
const supabaseService = new SupabasePersonalizationService();

await supabaseService.saveProfile({
  userId: 'user-123',
  analysisPreferences: { style: 'detailed' },
  notificationPreferences: { alerts: true },
  privacyImportance: 'very_important',
  riskTolerance: 'moderate'
});
```

### Cache Analysis Results
```javascript
await supabaseService.saveAnalysis('user-123', 'https://example.com', {
  riskScore: 7.5,
  riskLevel: 'high',
  summary: 'High risk terms detected'
});
```

### Get User Dashboard Data
```javascript
const dashboard = await supabaseService.getUserDashboard('user-123');
// Returns aggregated data including total analyses, avg risk score, etc.
```

## CLI Commands Reference

### Generate Types
```bash
supabase gen types typescript --project-id yoniuihgyzowmlvsmayt > types/supabase.ts
```

### Inspect Schema
```bash
node scripts/inspect-schema-simple.js
```

### Link to Remote Project
```bash
supabase link --project-ref yoniuihgyzowmlvsmayt
```

## Benefits of This Integration

### 1. **Type Safety**
- Full TypeScript support for all database operations
- Compile-time error checking for table/column names
- IntelliSense support in your IDE

### 2. **Schema Awareness**
- Always know exactly what tables and columns exist
- Automatic updates when schema changes
- No more guessing about table structures

### 3. **Development Efficiency**
- Generate types automatically from remote schema
- Inspect database structure without accessing dashboard
- Version control your schema understanding

### 4. **Reliability**
- Services use correct table names and structures
- Proper error handling for missing tables
- Consistent data access patterns

## Next Steps

### 1. Update Your Routes
Update your API routes to use the corrected service methods:
```javascript
// In your routes
const personalizationService = new PersonalizationService();

// This now uses the correct Supabase tables
const profile = await personalizationService.getUserProfile(userId);
```

### 2. Test the Integration
```bash
# Test the schema inspection
node scripts/inspect-schema-simple.js

# Test the updated services
npm test
```

### 3. Monitor Usage
Use the development logging system to monitor Supabase operations:
```bash
node scripts/view-logs.js --context supabase
```

## Troubleshooting

### Common Issues

#### 1. Table Not Found Errors
- **Cause**: Using old table names
- **Solution**: Use the updated service methods

#### 2. Permission Errors
- **Cause**: Service key doesn't have required permissions
- **Solution**: Check your Supabase project settings

#### 3. Type Errors
- **Cause**: Outdated TypeScript types
- **Solution**: Regenerate types with `supabase gen types`

### Getting Help

1. **Check Logs**: Use `node scripts/view-logs.js --context supabase`
2. **Inspect Schema**: Run `node scripts/inspect-schema-simple.js`
3. **Test Connection**: Use the Supabase dashboard to verify table access

## Conclusion

You now have a fully integrated Supabase backend that:
- ✅ Uses the correct database schema
- ✅ Provides type safety
- ✅ Includes comprehensive logging
- ✅ Supports all your personalization features
- ✅ Can be easily maintained and updated

The CLI integration allows you to stay in sync with your remote database schema and ensures your backend services always work with the correct table structures.