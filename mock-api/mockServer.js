// Mock API Server for Testing
const express = require('express');
const cors = require('cors');
const mockData = require('./mockData.json');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mock: true });
});

// Mock analysis endpoint
app.post('/api/analyze', (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required'
    });
  }

  // Simulate processing time
  setTimeout(() => {
    const analysis = generateMockAnalysis(text);
    res.json({
      success: true,
      analysis: analysis
    });
  }, 1000);
});

function generateMockAnalysis(text) {
  const wordCount = text.split(' ').length;
  let riskScore = 5.0;
  
  if (text.toLowerCase().includes('privacy')) riskScore += 1;
  if (text.toLowerCase().includes('liability')) riskScore += 1;
  if (wordCount > 1000) riskScore += 0.5;
  
  return {
    risk_score: Math.min(10, riskScore),
    risk_level: riskScore > 7 ? 'high' : riskScore > 5 ? 'medium' : 'low',
    summary: 'Mock analysis completed for testing purposes.',
    key_points: [
      'This is a mock analysis result',
      'Real analysis would use Gemini AI',
      'Risk assessment is simplified for testing'
    ],
    categories: {
      privacy: { score: 6.0, concerns: ['Mock privacy concern'] },
      liability: { score: 5.5, concerns: ['Mock liability concern'] },
      termination: { score: 4.0, concerns: ['Mock termination concern'] },
      payment: { score: 3.0, concerns: ['Mock payment concern'] }
    },
    confidence: 0.85,
    mock: true
  };
}

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
