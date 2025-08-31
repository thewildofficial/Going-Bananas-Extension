// Direct test of analysis service
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const AnalysisService = require('./services/analysisService');
const GeminiService = require('./services/geminiService');

async function directTest() {
  console.log('🔬 DIRECT ANALYSIS SERVICE TEST\n');

  // Create services
  const geminiService = new GeminiService();
  const analysisService = new AnalysisService(geminiService);

  const testText = "This is a longer terms of service text that should pass validation. By using our service, you agree to these terms. We collect personal data including email, location, and browsing habits. This data may be shared with advertising partners. We are not liable for any damages. You agree to binding arbitration. Subscription fees are non-refundable.";

  console.log('📝 Test text length:', testText.length, 'characters\n');

  // Test 1: Basic analysis
  console.log('🧪 Test 1: Basic Analysis (multiPass: false)');
  try {
    const basicResult = await analysisService.analyzeText(testText, {
      multiPass: false,
      detail_level: 'standard'
    });
    console.log('✅ Basic result:', {
      risk_score: basicResult.risk_score,
      multi_pass_analysis: basicResult.multi_pass_analysis,
      passes_completed: basicResult.passes_completed,
      mock: basicResult.mock
    });
  } catch (error) {
    console.log('❌ Basic analysis failed:', error.message);
  }

  // Test 2: Multi-pass analysis
  console.log('\n🔄 Test 2: Multi-Pass Analysis (multiPass: true)');
  try {
    const multiPassResult = await analysisService.analyzeText(testText, {
      multiPass: true,
      detail_level: 'comprehensive'
    });
    console.log('✅ Multi-pass result:', {
      risk_score: multiPassResult.risk_score,
      multi_pass_analysis: multiPassResult.multi_pass_analysis,
      passes_completed: multiPassResult.passes_completed,
      mock: multiPassResult.mock,
      aggregated_scores: !!multiPassResult.aggregated_scores,
      document_metadata: !!multiPassResult.document_metadata
    });

    if (multiPassResult.aggregated_scores) {
      console.log('📊 Aggregated Scores:', multiPassResult.aggregated_scores);
    }
  } catch (error) {
    console.log('❌ Multi-pass analysis failed:', error.message);
  }

  // Test 3: Direct Gemini service
  console.log('\n🤖 Test 3: Direct Gemini Service Call');
  try {
    const directResult = await geminiService.analyzeTermsAndConditions(testText, {
      multiPass: true,
      detail_level: 'comprehensive'
    });
    console.log('✅ Direct Gemini result:', {
      risk_score: directResult.risk_score,
      multi_pass_analysis: directResult.multi_pass_analysis,
      passes_completed: directResult.passes_completed,
      mock: directResult.mock,
      aggregated_scores: !!directResult.aggregated_scores,
      document_metadata: !!directResult.document_metadata
    });
  } catch (error) {
    console.log('❌ Direct Gemini failed:', error.message);
  }
}

directTest().catch(console.error);
