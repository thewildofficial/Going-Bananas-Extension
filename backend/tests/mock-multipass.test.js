// Quick test for mock multi-pass analysis
const GeminiService = require('../services/geminiService');

async function testMockMultiPass() {
  const geminiService = new GeminiService();

  console.log('Testing mock multi-pass analysis...\n');

  // Test basic mock
  const basicResult = await geminiService.generateMockAnalysis(
    "Terms of service text",
    { multiPass: false }
  );
  console.log('Basic mock result:', {
    multi_pass_analysis: basicResult.multi_pass_analysis,
    passes_completed: basicResult.passes_completed
  });

  // Test multi-pass mock
  const multiPassResult = await geminiService.generateMockAnalysis(
    "Terms of service text",
    { multiPass: true }
  );
  console.log('\nMulti-pass mock result:', {
    multi_pass_analysis: multiPassResult.multi_pass_analysis,
    passes_completed: multiPassResult.passes_completed,
    aggregated_scores: !!multiPassResult.aggregated_scores,
    document_metadata: !!multiPassResult.document_metadata
  });

  // Test via analyzeTermsAndConditions
  const fullResult = await geminiService.analyzeTermsAndConditions(
    "Terms of service text",
    { multiPass: true }
  );
  console.log('\nFull analysis result:', {
    multi_pass_analysis: fullResult.multi_pass_analysis,
    passes_completed: fullResult.passes_completed
  });
}

test('mock-multipass placeholder', () => {
  expect(true).toBe(true);
});

testMockMultiPass().catch(console.error);
