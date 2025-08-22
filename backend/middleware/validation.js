// Request Validation Middleware
function validationMiddleware(req, res, next) {
  // Basic request validation
  if (req.method === 'POST' && !req.body) {
    return res.status(400).json({
      success: false,
      error: 'Request body required'
    });
  }
  
  next();
}

module.exports = validationMiddleware;
