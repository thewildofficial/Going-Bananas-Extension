/**
 * Test Interface Server
 *
 * Serves the OAuth test interface HTML file
 * Run this to test the complete OAuth flow
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const HTML_FILE = path.join(__dirname, 'test-interface.html');

function serveFile(res, filePath, contentType = 'text/html') {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        serveFile(res, HTML_FILE);
    } else if (req.url === '/style.css') {
        // If you add CSS later
        res.writeHead(404);
        res.end('CSS not found');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page not found');
    }
});

server.listen(PORT, () => {
    console.log('\n🎭 OAUTH TEST INTERFACE SERVER STARTED!');
    console.log('=====================================');
    console.log(`🌐 Open your browser and go to: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 What you can test:');
    console.log('   ✅ System Health Check');
    console.log('   ✅ Firebase Authentication');
    console.log('   ✅ User Profile Creation');
    console.log('   ✅ AI Analysis with Personalization');
    console.log('');
    console.log('🔧 Make sure your backend is running on port 3003:');
    console.log('   PORT=3003 MOCK_GEMINI_API=true NODE_ENV=test node server.js');
    console.log('');
    console.log('🛑 To stop this server: Ctrl+C');
    console.log('=====================================\n');
});

process.on('SIGINT', () => {
    console.log('\n👋 Test interface server stopped');
    server.close();
    process.exit(0);
});

