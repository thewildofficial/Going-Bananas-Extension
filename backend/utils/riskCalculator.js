// Risk Calculation Utilities
function calculateRiskScore(text, factors = {}) {
  let score = 5.0;
  
  // Simple keyword-based scoring
  const riskKeywords = ['liability', 'terminate', 'collect', 'share', 'third party'];
  const foundKeywords = riskKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  score += foundKeywords.length * 0.5;
  return Math.min(10, Math.max(1, score));
}

module.exports = { calculateRiskScore };
