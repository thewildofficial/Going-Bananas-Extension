/**
 * Real OAuth Test Interface Server
 *
 * Serves the real Google OAuth test interface
 * This allows you to sign in with your actual Google account
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const HTML_FILE = path.join(__dirname, 'real-oauth-test.html');

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
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page not found');
    }
});

server.listen(PORT, () => {
    console.log('\n🔐 REAL GOOGLE OAUTH TEST INTERFACE STARTED!');
    console.log('===============================================');
    console.log(`🌐 Open your browser and go to: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 What you can do:');
    console.log('   ✅ Sign in with your REAL Google account');
    console.log('   ✅ Create a personalized profile');
    console.log('   ✅ Test AI analysis with your preferences');
    console.log('   ✅ See the complete OAuth flow in action');
    console.log('');
    console.log('🔧 Prerequisites:');
    console.log('   • Backend running on port 3003');
    console.log('   • Firebase project configured');
    console.log('   • Google OAuth enabled in Firebase Console');
    console.log('');
    console.log('🚀 Steps to test:');
    console.log('   1. Click "Sign in with Google"');
    console.log('   2. Choose your Google account');
    console.log('   3. Grant permissions');
    console.log('   4. Create your personalization profile');
    console.log('   5. Test AI analysis');
    console.log('');
    console.log('⚠️  Important: Make sure Google OAuth is enabled in Firebase Console');
    console.log('   Go to: Firebase Console → Authentication → Sign-in method → Google → Enable');
    console.log('');
    console.log('🛑 To stop this server: Ctrl+C');
    console.log('===============================================\n');
});

process.on('SIGINT', () => {
    console.log('\n👋 Real OAuth test server stopped');
    server.close();
    process.exit(0);
});

