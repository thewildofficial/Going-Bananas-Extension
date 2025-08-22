// CORS Middleware
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'chrome-extension://*',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    callback(null, true);
  },
  credentials: true
};

module.exports = cors(corsOptions);
