/**
 * Supabase Service for Going Bananas T&C Analyzer
 *
 * Alternative to MongoDB using Supabase PostgreSQL with real-time features
 * Provides user profile management with Supabase Auth integration ready
 *
 * @fileoverview Supabase database service for user profiles and analytics
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!this.supabaseUrl || !this.supabaseKey) {
      logger.warn('Supabase credentials not provided, service will run in limited mode');
      this.client = null;
      return;
    }

    // Public client for user operations
    this.client = createClient(this.supabaseUrl, this.supabaseKey);

    // Admin client for server operations (if service key provided)
    if (this.supabaseServiceKey) {
      this.adminClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }

    logger.info('Supabase service initialized');
  }

  /**
   * Test Supabase connection
   */
  async testConnection() {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
        throw error;
      }

      logger.info('Supabase connection successful');
      return true;
    } catch (error) {
      logger.error('Supabase connection failed:', error.message);
      return false;
    }
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    try {
      if (!this.adminClient) {
        logger.warn('No service key provided, skipping schema initialization');
        return;
      }

      // Create user_profiles table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id SERIAL PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          version TEXT DEFAULT '1.0',
          completed_at TIMESTAMPTZ NOT NULL,
          demographics JSONB,
          digital_behavior JSONB,
          risk_preferences JSONB,
          contextual_factors JSONB,
          computed_profile JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);
      `;

      const { error } = await this.adminClient.rpc('exec_sql', {
        sql: createTableSQL
      });

      if (error) {
        logger.error('Schema initialization failed:', error);
        return false;
      }

      logger.info('Supabase schema initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize schema:', error.message);
      return false;
    }
  }

  /**
   * Save user profile to Supabase
   */
  async saveUserProfile(profileData) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const profile = {
        user_id: profileData.userId,
        version: profileData.version || '1.0',
        completed_at: profileData.completedAt,
        demographics: profileData.demographics,
        digital_behavior: profileData.digitalBehavior,
        risk_preferences: profileData.riskPreferences,
        contextual_factors: profileData.contextualFactors,
        computed_profile: profileData.computedProfile,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('user_profiles')
        .upsert(profile, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('User profile saved to Supabase:', {
        userId: data.user_id,
        profileTags: data.computed_profile?.profileTags
      });

      return data;
    } catch (error) {
      logger.error('Failed to save profile to Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Get user profile from Supabase
   */
  async getUserProfile(userId) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      // Transform Supabase format to our application format
      return {
        userId: data.user_id,
        version: data.version,
        completedAt: data.completed_at,
        demographics: data.demographics,
        digitalBehavior: data.digital_behavior,
        riskPreferences: data.risk_preferences,
        contextualFactors: data.contextual_factors,
        computedProfile: data.computed_profile,
        lastUpdated: data.updated_at
      };
    } catch (error) {
      logger.error('Failed to get profile from Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Delete user profile from Supabase
   */
  async deleteUserProfile(userId) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { error } = await this.client
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.info('User profile deleted from Supabase:', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete profile from Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Get user profile insights for analytics
   */
  async getUserInsights(userId) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return null;
      }

      const riskTolerance = profile.computedProfile?.riskTolerance || {};
      const alertThresholds = profile.computedProfile?.alertThresholds || {};

      return {
        userId: profile.userId,
        riskProfileSummary: {
          overallRiskTolerance: riskTolerance.overall || 5,
          highestRiskCategory: this.getHighestRiskCategory(riskTolerance),
          riskCategories: riskTolerance
        },
        alertConfiguration: {
          recommendedThresholds: alertThresholds,
          alertFrequencyLimit: profile.contextualFactors?.alertPreferences?.alertFrequencyLimit || 10
        },
        profileCompleteness: this.calculateProfileCompleteness(profile),
        lastUpdated: profile.lastUpdated
      };
    } catch (error) {
      logger.error('Failed to get user insights:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Get highest risk category
   */
  getHighestRiskCategory(riskTolerance) {
    const categories = ['privacy', 'financial', 'legal'];
    let highest = { category: 'privacy', value: riskTolerance.privacy || 5 };

    categories.forEach(category => {
      const value = riskTolerance[category] || 5;
      if (value > highest.value) {
        highest = { category, value };
      }
    });

    return highest;
  }

  /**
   * Helper: Calculate profile completeness
   */
  calculateProfileCompleteness(profile) {
    const sections = ['demographics', 'digitalBehavior', 'riskPreferences', 'contextualFactors'];
    let completedSections = 0;

    sections.forEach(section => {
      if (profile[section] && Object.keys(profile[section]).length > 0) {
        completedSections++;
      }
    });

    return Math.round((completedSections / sections.length) * 100);
  }

  /**
   * List user profiles with pagination
   */
  async listUserProfiles(options = {}) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { limit = 50, offset = 0, orderBy = 'updated_at', ascending = false } = options;

      const { data, error } = await this.client
        .from('user_profiles')
        .select('user_id, version, completed_at, computed_profile, updated_at')
        .order(orderBy, { ascending })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data.map(profile => ({
        userId: profile.user_id,
        version: profile.version,
        completedAt: profile.completed_at,
        riskTolerance: profile.computed_profile?.riskTolerance || {},
        lastUpdated: profile.updated_at
      }));
    } catch (error) {
      logger.error('Failed to list profiles:', error.message);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics() {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client
        .from('user_profiles')
        .select('demographics, risk_preferences, computed_profile');

      if (error) {
        throw error;
      }

      // Calculate analytics
      const analytics = {
        totalUsers: data.length,
        demographics: this.analyzeDemographics(data),
        riskDistribution: this.analyzeRiskDistribution(data),
        completionStats: this.analyzeCompletionStats(data)
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get analytics:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Analyze demographics
   */
  analyzeDemographics(data) {
    const ageRanges = {};
    const occupations = {};
    const countries = {};

    data.forEach(profile => {
      if (profile.demographics) {
        const age = profile.demographics.ageRange;
        const occupation = profile.demographics.occupation;
        const country = profile.demographics.jurisdiction?.primaryCountry;

        if (age) ageRanges[age] = (ageRanges[age] || 0) + 1;
        if (occupation) occupations[occupation] = (occupations[occupation] || 0) + 1;
        if (country) countries[country] = (countries[country] || 0) + 1;
      }
    });

    return { ageRanges, occupations, countries };
  }

  /**
   * Helper: Analyze risk distribution
   */
  analyzeRiskDistribution(data) {
    const distribution = { privacy: {}, financial: {}, legal: {}, overall: {} };

    data.forEach(profile => {
      if (profile.computed_profile?.riskTolerance) {
        const risk = profile.computed_profile.riskTolerance;

        ['privacy', 'financial', 'legal', 'overall'].forEach(category => {
          const score = Math.floor(risk[category] || 5);
          distribution[category][score] = (distribution[category][score] || 0) + 1;
        });
      }
    });

    return distribution;
  }

  /**
   * Helper: Analyze completion statistics
   */
  analyzeCompletionStats(data) {
    const completionRates = {};
    const versions = {};

    data.forEach(profile => {
      const version = profile.version || '1.0';
      versions[version] = (versions[version] || 0) + 1;

      // Calculate completion rate
      let completedFields = 0;
      let totalFields = 4; // demographics, digitalBehavior, riskPreferences, contextualFactors

      if (profile.demographics && Object.keys(profile.demographics).length > 0) completedFields++;
      if (profile.digital_behavior && Object.keys(profile.digital_behavior).length > 0) completedFields++;
      if (profile.risk_preferences && Object.keys(profile.risk_preferences).length > 0) completedFields++;
      if (profile.contextual_factors && Object.keys(profile.contextual_factors).length > 0) completedFields++;

      const rate = Math.floor((completedFields / totalFields) * 100);
      completionRates[rate] = (completionRates[rate] || 0) + 1;
    });

    return { completionRates, versions };
  }
}

module.exports = SupabaseService;
