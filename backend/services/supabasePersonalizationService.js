/**
 * Supabase Personalization Service for Going Bananas T&C Analyzer
 * 
 * This service handles user personalization profile management using Supabase
 * for persistent server-side storage. It provides seamless data persistence
 * across extension reinstalls and device changes.
 * 
 * Updated to use the actual Supabase schema structure.
 * 
 * @fileoverview Supabase-based personalization data management
 * @author Aban Hasan (thewildofficial)
 * @version 2.0.0
 */

const { createClient } = require('@supabase/supabase-js');
const { createDevLogger } = require('../utils/devLogger');

class SupabasePersonalizationService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    this.devLog = createDevLogger('supabase');
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      this.devLog.error('Supabase configuration missing', {
        hasUrl: !!this.supabaseUrl,
        hasServiceKey: !!this.supabaseServiceKey
      });
      throw new Error('Supabase configuration is required for personalization service');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
    this.devLog.info('Supabase personalization service initialized');
  }

  /**
   * Save user personalization profile to Supabase
   * Uses the user_preferences table which matches the actual schema
   * @param {Object} profile - Complete user personalization profile
   * @returns {Promise<Object>} Saved profile with computed data
   */
  async saveProfile(profile) {
    try {
      this.devLog.info('Saving personalization profile to Supabase', { userId: profile.userId });
      
      const profileData = {
        user_id: profile.userId,
        analysis_preferences: profile.analysisPreferences || {},
        notification_preferences: profile.notificationPreferences || {},
        privacy_importance: profile.privacyImportance || 'moderately_important',
        risk_tolerance: profile.riskTolerance || 'moderate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_preferences')
        .upsert(profileData)
        .select()
        .single();

      if (error) {
        this.devLog.error('Failed to save profile to Supabase', { error: error.message, userId: profile.userId });
        throw new Error(`Supabase save failed: ${error.message}`);
      }

      this.devLog.info('Profile saved successfully to Supabase', { userId: profile.userId });
      return {
        success: true,
        profile: data,
        metadata: {
          saved_at: new Date().toISOString(),
          storage: 'supabase'
        }
      };
    } catch (error) {
      this.devLog.error('Supabase profile save error', { error: error.message, userId: profile.userId });
      throw error;
    }
  }

  /**
   * Retrieve user personalization profile from Supabase
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} User profile or null if not found
   */
  async getProfile(userId) {
    try {
      this.devLog.info('Retrieving personalization profile from Supabase', { userId });
      
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          this.devLog.info('No personalization profile found for user', { userId });
          return null;
        }
        this.devLog.error('Failed to retrieve profile from Supabase', { error: error.message, userId });
        throw new Error(`Supabase retrieval failed: ${error.message}`);
      }

      this.devLog.info('Profile retrieved successfully from Supabase', { userId });
      return data;
    } catch (error) {
      this.devLog.error('Supabase profile retrieval error', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Check if user has completed personalization
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if user has completed personalization
   */
  async hasCompletedPersonalization(userId) {
    try {
      const profile = await this.getProfile(userId);
      return profile !== null && profile.analysis_preferences !== null;
    } catch (error) {
      this.devLog.error('Error checking personalization completion', { error: error.message, userId });
      return false;
    }
  }

  /**
   * Update specific section of user profile
   * @param {string} userId - User identifier
   * @param {string} section - Profile section to update
   * @param {Object} data - Section data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfileSection(userId, section, data) {
    try {
      this.devLog.info('Updating profile section in Supabase', { userId, section });
      
      const updateData = {
        [section]: data,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await this.supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        this.devLog.error('Failed to update profile section in Supabase', { error: error.message, userId, section });
        throw new Error(`Supabase update failed: ${error.message}`);
      }

      this.devLog.info('Profile section updated successfully in Supabase', { userId, section });
      return result;
    } catch (error) {
      this.devLog.error('Supabase profile section update error', { error: error.message, userId, section });
      throw error;
    }
  }

  /**
   * Save analysis results for caching
   * Uses the analyses_personalized table for user-specific analyses
   * @param {string} userId - User identifier
   * @param {string} url - Analyzed URL
   * @param {Object} analysis - Analysis results
   * @returns {Promise<Object>} Saved analysis
   */
  async saveAnalysis(userId, url, analysis) {
    try {
      this.devLog.info('Saving analysis to Supabase cache', { userId, url });
      
      // Create content hash for caching
      const crypto = require('crypto');
      const contentHash = crypto.createHash('md5').update(url).digest('hex');
      const optionsHash = crypto.createHash('md5').update(JSON.stringify(analysis.options || {})).digest('hex');
      const personalizationHash = crypto.createHash('md5').update(userId).digest('hex');
      
      const analysisData = {
        user_id: userId,
        content_hash: contentHash,
        options_hash: optionsHash,
        personalization_hash: personalizationHash,
        analysis_version: '1.0',
        result: analysis,
        risk_score: analysis.riskScore || null,
        ttl_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('analyses_personalized')
        .insert(analysisData)
        .select()
        .single();

      if (error) {
        this.devLog.error('Failed to save analysis to Supabase', { error: error.message, userId, url });
        throw new Error(`Supabase analysis save failed: ${error.message}`);
      }

      this.devLog.info('Analysis saved successfully to Supabase cache', { userId, url });
      return data;
    } catch (error) {
      this.devLog.error('Supabase analysis save error', { error: error.message, userId, url });
      throw error;
    }
  }

  /**
   * Retrieve cached analysis results
   * @param {string} userId - User identifier
   * @param {string} url - URL to check for cached analysis
   * @returns {Promise<Object|null>} Cached analysis or null if not found/expired
   */
  async getCachedAnalysis(userId, url) {
    try {
      this.devLog.info('Retrieving cached analysis from Supabase', { userId, url });
      
      // Create content hash for lookup
      const crypto = require('crypto');
      const contentHash = crypto.createHash('md5').update(url).digest('hex');
      const personalizationHash = crypto.createHash('md5').update(userId).digest('hex');
      
      const { data, error } = await this.supabase
        .from('analyses_personalized')
        .select('*')
        .eq('user_id', userId)
        .eq('content_hash', contentHash)
        .eq('personalization_hash', personalizationHash)
        .gt('ttl_expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found or expired
          this.devLog.info('No cached analysis found or expired', { userId, url });
          return null;
        }
        this.devLog.error('Failed to retrieve cached analysis from Supabase', { error: error.message, userId, url });
        throw new Error(`Supabase analysis retrieval failed: ${error.message}`);
      }

      this.devLog.info('Cached analysis retrieved successfully from Supabase', { userId, url });
      return data;
    } catch (error) {
      this.devLog.error('Supabase cached analysis retrieval error', { error: error.message, userId, url });
      throw error;
    }
  }

  /**
   * Save analysis history entry
   * Uses the analysis_history table
   * @param {string} userId - User identifier
   * @param {string} url - Analyzed URL
   * @param {Object} analysis - Analysis results
   * @returns {Promise<Object>} Saved analysis history entry
   */
  async saveAnalysisHistory(userId, url, analysis) {
    try {
      this.devLog.info('Saving analysis history to Supabase', { userId, url });
      
      const historyData = {
        user_id: userId,
        url: url,
        domain: new URL(url).hostname,
        analysis_data: analysis,
        risk_level: analysis.riskLevel || 'unknown',
        risk_score: analysis.riskScore || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('analysis_history')
        .insert(historyData)
        .select()
        .single();

      if (error) {
        this.devLog.error('Failed to save analysis history to Supabase', { error: error.message, userId, url });
        throw new Error(`Supabase history save failed: ${error.message}`);
      }

      this.devLog.info('Analysis history saved successfully to Supabase', { userId, url });
      return data;
    } catch (error) {
      this.devLog.error('Supabase analysis history save error', { error: error.message, userId, url });
      throw error;
    }
  }

  /**
   * Get user's analysis history
   * @param {string} userId - User identifier
   * @param {number} limit - Number of entries to return
   * @returns {Promise<Array>} Analysis history entries
   */
  async getAnalysisHistory(userId, limit = 50) {
    try {
      this.devLog.info('Retrieving analysis history from Supabase', { userId, limit });
      
      const { data, error } = await this.supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.devLog.error('Failed to retrieve analysis history from Supabase', { error: error.message, userId });
        throw new Error(`Supabase history retrieval failed: ${error.message}`);
      }

      this.devLog.info('Analysis history retrieved successfully from Supabase', { userId, count: data.length });
      return data || [];
    } catch (error) {
      this.devLog.error('Supabase analysis history retrieval error', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user dashboard data
   * Uses the user_dashboard view
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} User dashboard data
   */
  async getUserDashboard(userId) {
    try {
      this.devLog.info('Retrieving user dashboard from Supabase', { userId });
      
      const { data, error } = await this.supabase
        .from('user_dashboard')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          this.devLog.info('No dashboard data found for user', { userId });
          return null;
        }
        this.devLog.error('Failed to retrieve user dashboard from Supabase', { error: error.message, userId });
        throw new Error(`Supabase dashboard retrieval failed: ${error.message}`);
      }

      this.devLog.info('User dashboard retrieved successfully from Supabase', { userId });
      return data;
    } catch (error) {
      this.devLog.error('Supabase user dashboard retrieval error', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user statistics using the get_user_stats function
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    try {
      this.devLog.info('Retrieving user stats from Supabase', { userId });
      
      const { data, error } = await this.supabase
        .rpc('get_user_stats', { user_uuid: userId });

      if (error) {
        this.devLog.error('Failed to retrieve user stats from Supabase', { error: error.message, userId });
        throw new Error(`Supabase stats retrieval failed: ${error.message}`);
      }

      this.devLog.info('User stats retrieved successfully from Supabase', { userId });
      return data;
    } catch (error) {
      this.devLog.error('Supabase user stats retrieval error', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete user profile and all associated data
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if deletion successful
   */
  async deleteUserData(userId) {
    try {
      this.devLog.info('Deleting user data from Supabase', { userId });
      
      // Delete analysis history
      const { error: historyError } = await this.supabase
        .from('analysis_history')
        .delete()
        .eq('user_id', userId);

      if (historyError) {
        this.devLog.error('Failed to delete analysis history', { error: historyError.message, userId });
      }

      // Delete personalized analyses
      const { error: analysesError } = await this.supabase
        .from('analyses_personalized')
        .delete()
        .eq('user_id', userId);

      if (analysesError) {
        this.devLog.error('Failed to delete personalized analyses', { error: analysesError.message, userId });
      }

      // Delete user preferences
      const { error: preferencesError } = await this.supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);

      if (preferencesError) {
        this.devLog.error('Failed to delete user preferences', { error: preferencesError.message, userId });
        throw new Error(`Supabase deletion failed: ${preferencesError.message}`);
      }

      this.devLog.info('User data deleted successfully from Supabase', { userId });
      return true;
    } catch (error) {
      this.devLog.error('Supabase user data deletion error', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = SupabasePersonalizationService;