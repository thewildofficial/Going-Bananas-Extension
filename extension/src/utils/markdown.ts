/**
 * Utility function to render markdown-style text
 * Converts basic markdown syntax to HTML
 */
export const renderMarkdownText = (text: string): string => {
  // Convert **text** to <strong>text</strong>
  const boldText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* to <em>text</em>
  const italicText = boldText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return italicText;
};