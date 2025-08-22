// Text Processing Utilities
function processText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,;:!?()-]/g, '')
    .trim();
}

module.exports = { processText };
