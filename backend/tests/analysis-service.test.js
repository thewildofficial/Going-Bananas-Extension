// Test analysis service major clauses preservation
const AnalysisService = require('./services/analysisService');
const GeminiService = require('./services/geminiService');

async function testAnalysisService() {
  const geminiService = new GeminiService();
  const analysisService = new AnalysisService(geminiService);

  console.log('🔬 Testing Analysis Service Major Clauses Preservation\n');

  const testText = 'Terms of service text with privacy and liability clauses that should trigger major clauses detection and preservation through the analysis service layers';

  const result = await analysisService.analyzeText(testText, {
    multiPass: false,
    detail_level: 'standard'
  });

  console.log('✅ Analysis result has major_clauses:', !!result.major_clauses);
  console.log('📊 Major clauses count:', result.major_clauses?.clauses?.length || 0);

  if (result.major_clauses) {
    console.log('\n📋 First clause:', result.major_clauses.clauses[0]);
  }
}

testAnalysisService().catch(console.error);
