// Debug script to test analysis service directly
const AnalysisService = require('./services/analysisService');
const GeminiService = require('./services/geminiService');

async function debugAnalysis() {
  console.log('🔍 DEBUGGING ANALYSIS SERVICE\n');

  try {
    // Create services
    const geminiService = new GeminiService();
    const analysisService = new AnalysisService(geminiService);

    console.log('✅ Services created');

    // Test basic analysis
    console.log('\n🧪 Testing basic analysis...');
    const basicResult = await analysisService.analyzeText(
      "Terms of service text for testing",
      { multiPass: false }
    );
    console.log('Basic result:', {
      risk_score: basicResult.risk_score,
      multi_pass_analysis: basicResult.multi_pass_analysis,
      mock: basicResult.mock
    });

    // Test multi-pass analysis
    console.log('\n🔄 Testing multi-pass analysis...');
    const multiPassResult = await analysisService.analyzeText(
      "Terms of service text for testing",
      { multiPass: true }
    );
    console.log('Multi-pass result:', {
      risk_score: multiPassResult.risk_score,
      multi_pass_analysis: multiPassResult.multi_pass_analysis,
      passes_completed: multiPassResult.passes_completed,
      mock: multiPassResult.mock
    });

    // Test Gemini service directly
    console.log('\n🤖 Testing Gemini service directly...');
    const geminiResult = await geminiService.analyzeTermsAndConditions(
      "Terms of service text for testing",
      { multiPass: true }
    );
    console.log('Gemini direct result:', {
      risk_score: geminiResult.risk_score,
      multi_pass_analysis: geminiResult.multi_pass_analysis,
      passes_completed: geminiResult.passes_completed,
      mock: geminiResult.mock
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugAnalysis();
