-- Supabase Database Schema Setup for Going Bananas Extension
-- This script creates the required tables for the personalization service

-- Enable Row Level Security (RLS) for all tables
-- This ensures data isolation between users

-- Create user_personalization_profiles table
CREATE TABLE IF NOT EXISTS public.user_personalization_profiles (
    user_id TEXT PRIMARY KEY,
    version TEXT DEFAULT '1.0',
    completed_at TIMESTAMPTZ,
    demographics JSONB,
    digital_behavior JSONB,
    risk_preferences JSONB,
    contextual_factors JSONB,
    computed_profile JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cached_analyses table
CREATE TABLE IF NOT EXISTS public.cached_analyses (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, url)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_personalization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completed_at ON public.user_personalization_profiles(completed_at);
CREATE INDEX IF NOT EXISTS idx_cached_analyses_user_id ON public.cached_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_cached_analyses_url ON public.cached_analyses(url);
CREATE INDEX IF NOT EXISTS idx_cached_analyses_expires_at ON public.cached_analyses(expires_at);

-- Enable Row Level Security
ALTER TABLE public.user_personalization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_personalization_profiles
-- Users can only access their own profiles
CREATE POLICY "Users can view own profile" ON public.user_personalization_profiles
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_personalization_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile" ON public.user_personalization_profiles
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_personalization_profiles
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for cached_analyses
-- Users can only access their own cached analyses
CREATE POLICY "Users can view own cached analyses" ON public.cached_analyses
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own cached analyses" ON public.cached_analyses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own cached analyses" ON public.cached_analyses
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own cached analyses" ON public.cached_analyses
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on user_personalization_profiles
CREATE TRIGGER update_user_personalization_profiles_updated_at 
    BEFORE UPDATE ON public.user_personalization_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to clean up expired cached analyses
CREATE OR REPLACE FUNCTION cleanup_expired_analyses()
RETURNS void AS $$
BEGIN
    DELETE FROM public.cached_analyses 
    WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Grant necessary permissions to the service role
-- Note: These permissions are needed for the backend service to work
GRANT ALL ON public.user_personalization_profiles TO service_role;
GRANT ALL ON public.cached_analyses TO service_role;
GRANT USAGE ON SEQUENCE public.cached_analyses_id_seq TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_personalization_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cached_analyses TO authenticated;