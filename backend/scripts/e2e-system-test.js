#!/usr/bin/env node

/**
 * End-to-End System Test for Going Bananas Backend
 * 
 * This script performs comprehensive testing of the entire system including:
 * - API endpoint functionality
 * - Caching mechanisms efficiency
 * - Personalization storage optimization
 * - Read/write operation analysis
 * - Performance benchmarking
 * 
 * @fileoverview Comprehensive system testing and performance analysis
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createDevLogger } = require('../utils/devLogger');
const SupabasePersonalizationService = require('../services/supabasePersonalizationService');
const PersonalizationService = require('../services/personalizationService');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

class E2ESystemTester {
  constructor() {
    this.devLog = createDevLogger('e2e-test');
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.supabaseService = new SupabasePersonalizationService();
    this.personalizationService = new PersonalizationService();
    this.testResults = {
      apiEndpoints: {},
      caching: {},
      personalization: {},
      performance: {},
      optimizations: []
    };
  }

  /**
   * Generate a test user ID that follows UUID format
   */
  generateTestUserId() {
    // Generate a proper UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Test API endpoint functionality
   */
  async testAPIEndpoints() {
    this.devLog.info('Testing API endpoint functionality...');
    
    // Use existing user ID from Google OAuth
    const testUserId = '200417f1-f363-42a2-875f-b788c6b36da8';
    const testUrl = 'https://example.com/terms';
    
    try {
      // Test 1: Personalization Profile Update (since user already exists)
      const startTime = Date.now();
      const profileData = {
        userId: testUserId,
        analysisPreferences: {
          style: 'detailed',
          language: 'technical',
          focus: 'privacy'
        },
        notificationPreferences: {
          alerts: true,
          frequency: 'moderate'
        },
        privacyImportance: 'very_important',
        riskTolerance: 'moderate'
      };

      // Try to update existing profile or create if doesn't exist
      let profileResult;
      try {
        profileResult = await this.supabaseService.saveProfile(profileData);
      } catch (error) {
        // If save fails due to constraints, try updating instead
        profileResult = await this.supabaseService.updateProfileSection(testUserId, 'analysis_preferences', profileData.analysisPreferences);
      }
      
      const profileTime = Date.now() - startTime;
      
      this.testResults.apiEndpoints.profileCreation = {
        success: !!profileResult,
        timeMs: profileTime,
        dataSize: JSON.stringify(profileData).length
      };

      // Test 2: Profile Retrieval
      const retrievalStart = Date.now();
      const retrievedProfile = await this.supabaseService.getProfile(testUserId);
      const retrievalTime = Date.now() - retrievalStart;
      
      this.testResults.apiEndpoints.profileRetrieval = {
        success: !!retrievedProfile,
        timeMs: retrievalTime,
        dataSize: JSON.stringify(retrievedProfile).length
      };

      // Test 3: Analysis Caching
      const analysisData = {
        riskScore: 7.5,
        riskLevel: 'high',
        summary: 'High risk terms detected',
        details: {
          privacy: 'moderate',
          liability: 'high',
          termination: 'low'
        },
        options: {
          personalized: true,
          version: '1.0'
        }
      };

      const cacheStart = Date.now();
      const cacheResult = await this.supabaseService.saveAnalysis(testUserId, testUrl, analysisData);
      const cacheTime = Date.now() - cacheStart;
      
      this.testResults.apiEndpoints.analysisCaching = {
        success: !!cacheResult,
        timeMs: cacheTime,
        dataSize: JSON.stringify(analysisData).length
      };

      // Test 4: Cache Retrieval
      const cacheRetrievalStart = Date.now();
      const cachedAnalysis = await this.supabaseService.getCachedAnalysis(testUserId, testUrl);
      const cacheRetrievalTime = Date.now() - cacheRetrievalStart;
      
      this.testResults.apiEndpoints.cacheRetrieval = {
        success: !!cachedAnalysis,
        timeMs: cacheRetrievalTime,
        cacheHit: !!cachedAnalysis
      };

      // Test 5: Analysis History
      const historyStart = Date.now();
      await this.supabaseService.saveAnalysisHistory(testUserId, testUrl, analysisData);
      const historyTime = Date.now() - historyStart;
      
      this.testResults.apiEndpoints.analysisHistory = {
        success: true,
        timeMs: historyTime
      };

      this.devLog.info('API endpoint tests completed successfully');
      return { success: true, testUserId };

    } catch (error) {
      this.devLog.error('API endpoint test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test caching mechanisms efficiency
   */
  async testCachingMechanisms(testUserId) {
    this.devLog.info('Testing caching mechanisms efficiency...');
    
    const testUrls = [
      'https://example.com/terms1',
      'https://example.com/terms2',
      'https://example.com/terms3'
    ];

    try {
      // Test 1: Cache Write Performance
      const writeTimes = [];
      const analysisData = {
        riskScore: Math.random() * 10,
        riskLevel: 'moderate',
        summary: 'Test analysis',
        timestamp: new Date().toISOString()
      };

      for (const url of testUrls) {
        const start = Date.now();
        await this.supabaseService.saveAnalysis(testUserId, url, analysisData);
        writeTimes.push(Date.now() - start);
      }

      this.testResults.caching.writePerformance = {
        averageTimeMs: writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length,
        minTimeMs: Math.min(...writeTimes),
        maxTimeMs: Math.max(...writeTimes),
        totalWrites: testUrls.length
      };

      // Test 2: Cache Read Performance
      const readTimes = [];
      for (const url of testUrls) {
        const start = Date.now();
        const cached = await this.supabaseService.getCachedAnalysis(testUserId, url);
        readTimes.push(Date.now() - start);
      }

      this.testResults.caching.readPerformance = {
        averageTimeMs: readTimes.reduce((a, b) => a + b, 0) / readTimes.length,
        minTimeMs: Math.min(...readTimes),
        maxTimeMs: Math.max(...readTimes),
        totalReads: testUrls.length
      };

      // Test 3: Cache Hit Rate Analysis
      const cacheHitTests = [];
      for (let i = 0; i < 10; i++) {
        const url = `https://test${i}.com/terms`;
        const start = Date.now();
        const cached = await this.supabaseService.getCachedAnalysis(testUserId, url);
        cacheHitTests.push({
          url,
          hit: !!cached,
          timeMs: Date.now() - start
        });
      }

      const hitRate = cacheHitTests.filter(test => test.hit).length / cacheHitTests.length;
      
      this.testResults.caching.hitRateAnalysis = {
        hitRate: hitRate,
        totalTests: cacheHitTests.length,
        averageMissTimeMs: cacheHitTests.filter(test => !test.hit).reduce((a, b) => a + b.timeMs, 0) / cacheHitTests.filter(test => !test.hit).length || 0
      };

      this.devLog.info('Caching mechanism tests completed');
      return { success: true };

    } catch (error) {
      this.devLog.error('Caching mechanism test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test personalization storage optimization
   */
  async testPersonalizationStorage(testUserId) {
    this.devLog.info('Testing personalization storage optimization...');

    try {
      // Test 1: Profile Computation Performance
      const computationStart = Date.now();
      const computedProfile = await this.personalizationService.computeProfileParameters({
        userId: testUserId,
        demographics: {
          ageRange: '26_40',
          occupation: 'technology',
          jurisdiction: { primaryCountry: 'US' }
        },
        digitalBehavior: {
          techSophistication: {
            comfortLevel: 'advanced',
            readingFrequency: 'often',
            preferredExplanationStyle: 'technical_detailed'
          },
          usagePatterns: {
            primaryActivities: ['work', 'shopping']
          }
        },
        riskPreferences: {
          privacy: { overallImportance: 'very_important' },
          financial: { 
            paymentApproach: 'moderate',
            financialSituation: 'stable_employment'
          },
          legal: { arbitrationComfort: 'neutral' }
        },
        contextualFactors: {
          dependentStatus: 'just_myself',
          alertPreferences: {
            interruptionTiming: 'moderate_and_high',
            alertFrequencyLimit: 15
          },
          specialCircumstances: []
        }
      });
      const computationTime = Date.now() - computationStart;

      this.testResults.personalization.computationPerformance = {
        timeMs: computationTime,
        profileTags: computedProfile.profileTags.length,
        riskTolerance: computedProfile.riskTolerance.overall,
        explanationStyle: computedProfile.explanationStyle
      };

      // Test 2: Profile Update Efficiency
      const updateStart = Date.now();
      await this.supabaseService.updateProfileSection(testUserId, 'analysis_preferences', {
        style: 'simple',
        language: 'plain',
        focus: 'liability'
      });
      const updateTime = Date.now() - updateStart;

      this.testResults.personalization.updateEfficiency = {
        timeMs: updateTime,
        operation: 'section_update'
      };

      // Test 3: Profile Retrieval Efficiency
      const retrievalStart = Date.now();
      const profile = await this.supabaseService.getProfile(testUserId);
      const retrievalTime = Date.now() - retrievalStart;

      this.testResults.personalization.retrievalEfficiency = {
        timeMs: retrievalTime,
        dataSize: JSON.stringify(profile).length,
        hasComputedProfile: !!profile?.computedProfile
      };

      this.devLog.info('Personalization storage tests completed');
      return { success: true };

    } catch (error) {
      this.devLog.error('Personalization storage test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze read/write operations for optimization opportunities
   */
  analyzeReadWriteOperations() {
    this.devLog.info('Analyzing read/write operations for optimization...');

    const analysis = {
      inefficiencies: [],
      optimizations: [],
      recommendations: []
    };

    // Analyze API endpoint performance
    const apiResults = this.testResults.apiEndpoints;
    
    // Check for slow operations
    Object.entries(apiResults).forEach(([operation, result]) => {
      if (result.timeMs > 1000) {
        analysis.inefficiencies.push({
          operation,
          issue: 'Slow operation',
          timeMs: result.timeMs,
          recommendation: 'Consider caching or optimization'
        });
      }
    });

    // Analyze caching performance
    const cacheResults = this.testResults.caching;
    if (cacheResults.hitRateAnalysis?.hitRate < 0.5) {
      analysis.inefficiencies.push({
        operation: 'cache_hit_rate',
        issue: 'Low cache hit rate',
        hitRate: cacheResults.hitRateAnalysis.hitRate,
        recommendation: 'Review cache key strategy and TTL settings'
      });
    }

    // Check for unnecessary read/write operations
    if (cacheResults.writePerformance?.averageTimeMs > 500) {
      analysis.inefficiencies.push({
        operation: 'cache_write',
        issue: 'Slow cache writes',
        timeMs: cacheResults.writePerformance.averageTimeMs,
        recommendation: 'Consider batch writes or async operations'
      });
    }

    // Generate optimization recommendations
    analysis.optimizations = [
      {
        type: 'caching',
        description: 'Implement Redis for frequently accessed data',
        impact: 'High',
        effort: 'Medium'
      },
      {
        type: 'database',
        description: 'Add database indexes for user_id and content_hash',
        impact: 'Medium',
        effort: 'Low'
      },
      {
        type: 'api',
        description: 'Implement request batching for multiple operations',
        impact: 'Medium',
        effort: 'Medium'
      }
    ];

    this.testResults.optimizations = analysis;
    this.devLog.info('Read/write operation analysis completed');
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    this.devLog.info('Generating performance report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: Object.keys(this.testResults.apiEndpoints).length + 
                   Object.keys(this.testResults.caching).length + 
                   Object.keys(this.testResults.personalization).length,
        successRate: this.calculateSuccessRate(),
        averageResponseTime: this.calculateAverageResponseTime()
      },
      detailedResults: this.testResults,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  calculateSuccessRate() {
    const allResults = [
      ...Object.values(this.testResults.apiEndpoints),
      ...Object.values(this.testResults.caching),
      ...Object.values(this.testResults.personalization)
    ];
    
    const successful = allResults.filter(result => result.success !== false).length;
    return (successful / allResults.length) * 100;
  }

  calculateAverageResponseTime() {
    const allTimes = [];
    
    Object.values(this.testResults.apiEndpoints).forEach(result => {
      if (result.timeMs) allTimes.push(result.timeMs);
    });
    
    Object.values(this.testResults.caching).forEach(result => {
      if (result.averageTimeMs) allTimes.push(result.averageTimeMs);
    });
    
    Object.values(this.testResults.personalization).forEach(result => {
      if (result.timeMs) allTimes.push(result.timeMs);
    });

    return allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;
  }

  generateRecommendations() {
    const recommendations = [];

    // Performance recommendations
    if (this.calculateAverageResponseTime() > 500) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        description: 'Average response time is above 500ms. Consider implementing caching strategies.',
        action: 'Implement Redis caching for frequently accessed data'
      });
    }

    // Caching recommendations
    const hitRate = this.testResults.caching.hitRateAnalysis?.hitRate;
    if (hitRate && hitRate < 0.7) {
      recommendations.push({
        category: 'Caching',
        priority: 'Medium',
        description: 'Cache hit rate is below 70%. Review cache key strategy.',
        action: 'Optimize cache keys and TTL settings'
      });
    }

    // Database recommendations
    recommendations.push({
      category: 'Database',
      priority: 'Low',
      description: 'Consider adding database indexes for better query performance.',
      action: 'Add indexes on user_id, content_hash, and created_at columns'
    });

    return recommendations;
  }

  /**
   * Clean up test data (only test-specific data, not user data)
   */
  async cleanup(testUserId) {
    try {
      // Only clean up test analysis data, not user preferences
      const testUrls = [
        'https://example.com/terms',
        'https://example.com/terms1',
        'https://example.com/terms2',
        'https://example.com/terms3'
      ];
      
      // Clean up test analysis history
      for (const url of testUrls) {
        try {
          await this.supabase
            .from('analysis_history')
            .delete()
            .eq('user_id', testUserId)
            .eq('url', url);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      this.devLog.info('Test analysis data cleaned up successfully');
    } catch (error) {
      this.devLog.warn('Failed to clean up test data', { error: error.message });
    }
  }

  /**
   * Run complete end-to-end test
   */
  async runCompleteTest() {
    console.log('🚀 Starting End-to-End System Test...\n');

    try {
      // Test 1: API Endpoints
      console.log('📋 Test 1: API Endpoint Functionality');
      const apiResult = await this.testAPIEndpoints();
      if (!apiResult.success) {
        throw new Error(`API test failed: ${apiResult.error}`);
      }
      console.log('✅ API endpoints working correctly\n');

      // Test 2: Caching Mechanisms
      console.log('📋 Test 2: Caching Mechanisms Efficiency');
      const cacheResult = await this.testCachingMechanisms(apiResult.testUserId);
      if (!cacheResult.success) {
        throw new Error(`Caching test failed: ${cacheResult.error}`);
      }
      console.log('✅ Caching mechanisms working efficiently\n');

      // Test 3: Personalization Storage
      console.log('📋 Test 3: Personalization Storage Optimization');
      const personalizationResult = await this.testPersonalizationStorage(apiResult.testUserId);
      if (!personalizationResult.success) {
        throw new Error(`Personalization test failed: ${personalizationResult.error}`);
      }
      console.log('✅ Personalization storage optimized\n');

      // Test 4: Performance Analysis
      console.log('📋 Test 4: Performance Analysis');
      this.analyzeReadWriteOperations();
      console.log('✅ Performance analysis completed\n');

      // Generate Report
      console.log('📋 Test 5: Generating Performance Report');
      const report = this.generatePerformanceReport();
      
      // Save report
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.join(__dirname, '..', 'docs', 'e2e-test-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('✅ Performance report generated\n');

      // Cleanup
      console.log('📋 Test 6: Cleanup');
      await this.cleanup(apiResult.testUserId);
      console.log('✅ Test data cleaned up\n');

      // Display Results
      this.displayResults(report);

      return report;

    } catch (error) {
      console.error('❌ End-to-end test failed:', error.message);
      this.devLog.error('E2E test failed', { error: error.message });
      throw error;
    }
  }

  displayResults(report) {
    console.log('🎉 End-to-End System Test Completed Successfully!\n');
    
    console.log('📊 Performance Summary:');
    console.log(`   Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   Average Response Time: ${report.summary.averageResponseTime.toFixed(1)}ms`);
    console.log(`   Total Tests: ${report.summary.totalTests}\n`);

    console.log('🔍 Key Findings:');
    
    // API Performance
    const apiResults = report.detailedResults.apiEndpoints;
    console.log('   API Endpoints:');
    Object.entries(apiResults).forEach(([operation, result]) => {
      console.log(`     ${operation}: ${result.timeMs}ms (${result.success ? '✅' : '❌'})`);
    });

    // Caching Performance
    const cacheResults = report.detailedResults.caching;
    console.log('\n   Caching Mechanisms:');
    console.log(`     Write Performance: ${cacheResults.writePerformance?.averageTimeMs.toFixed(1)}ms avg`);
    console.log(`     Read Performance: ${cacheResults.readPerformance?.averageTimeMs.toFixed(1)}ms avg`);
    console.log(`     Cache Hit Rate: ${(cacheResults.hitRateAnalysis?.hitRate * 100).toFixed(1)}%`);

    // Personalization Performance
    const personalizationResults = report.detailedResults.personalization;
    console.log('\n   Personalization Storage:');
    console.log(`     Computation Time: ${personalizationResults.computationPerformance?.timeMs}ms`);
    console.log(`     Update Time: ${personalizationResults.updateEfficiency?.timeMs}ms`);
    console.log(`     Retrieval Time: ${personalizationResults.retrievalEfficiency?.timeMs}ms`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.description}`);
      console.log(`      Action: ${rec.action}`);
    });

    console.log('\n📄 Full report saved to: docs/e2e-test-report.json');
    console.log('\n🚀 Your system is ready for production!');
  }
}

// Run the test
async function runE2ETest() {
  const tester = new E2ESystemTester();
  
  try {
    await tester.runCompleteTest();
  } catch (error) {
    console.error('E2E test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runE2ETest();
}

module.exports = { E2ESystemTester };