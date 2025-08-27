// Test major clauses feature
const GeminiService = require('./services/geminiService');

async function testMajorClauses() {
  const service = new GeminiService();

  console.log('🧪 Testing Major Clauses Generation\n');

  const result = service.generateMockAnalysis(
    'Terms of service text with privacy and liability clauses that should trigger major clauses detection',
    {}
  );

  console.log('✅ Has major_clauses:', !!result.major_clauses);
  console.log('📊 Major clauses object:', result.major_clauses);

  if (result.major_clauses && result.major_clauses.clauses) {
    console.log('\n📋 Individual Clauses:');
    result.major_clauses.clauses.forEach((clause, index) => {
      console.log(`${index + 1}. ${clause.title} (${clause.importance})`);
      console.log(`   Risk: ${clause.risk_level}`);
      console.log(`   Description: ${clause.description}`);
      console.log('');
    });
  }
}

testMajorClauses().catch(console.error);
