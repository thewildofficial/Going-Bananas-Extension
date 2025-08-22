# Going Bananas Extension 🍌

A Chrome browser extension that uses Google Gemini AI to automatically parse, analyze, and rank terms and conditions documents. Get instant clarity on what you're signing up for with AI-powered risk assessment and plain-English summaries.

## 🚀 Features

- **Instant T&C Analysis**: Automatically detects and analyzes terms of service documents
- **Risk Assessment**: AI-powered scoring system (🟢 Low, 🟡 Medium, 🔴 High risk)
- **Plain English Summaries**: Complex legal jargon translated into understandable language
- **Key Points Extraction**: Highlights the most important clauses you need to know
- **Privacy Concerns**: Identifies data collection and privacy-related terms
- **One-Click Insights**: See everything at a glance without reading pages of legal text

## 🏗️ Architecture

### Frontend (Browser Extension)
- **Popup Interface**: Main extension UI for viewing analysis results
- **Content Script**: Automatically detects T&C pages and extracts text
- **Options Page**: Configure API settings and preferences
- **Background Service**: Handles API communication and data management

### Backend API
- **Express.js Server**: RESTful API for T&C analysis
- **Gemini AI Integration**: Uses Google's Gemini Pro for text analysis
- **Risk Assessment Engine**: Custom scoring algorithm for terms evaluation
- **Caching Layer**: Optimizes performance and reduces API calls

### Data Flow
```
Website T&C → Content Script → Background Service → Backend API → Gemini AI
                                      ↓
User Interface ← Risk Analysis ← Processed Results ← AI Response
```

## 📁 Project Structure

```
Going-Bananas-Extension/
├── extension/                 # Chrome extension files
│   ├── manifest.json         # Extension configuration
│   ├── popup/               # Main extension popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── content/             # Content scripts
│   │   ├── content.js
│   │   └── content.css
│   ├── background/          # Background service worker
│   │   └── background.js
│   ├── options/             # Settings page
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── assets/              # Icons and images
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── backend/                 # Express.js API server
│   ├── server.js           # Main server file
│   ├── routes/             # API routes
│   │   ├── analyze.js      # T&C analysis endpoint
│   │   └── health.js       # Health check endpoint
│   ├── services/           # Business logic
│   │   ├── geminiService.js # Gemini AI integration
│   │   ├── analysisService.js # Risk assessment logic
│   │   └── cacheService.js  # Caching implementation
│   ├── middleware/         # Express middleware
│   │   ├── cors.js
│   │   ├── rateLimit.js
│   │   └── validation.js
│   ├── utils/              # Utility functions
│   │   ├── textProcessor.js
│   │   └── riskCalculator.js
│   └── package.json
├── mock-api/               # Mock API for testing
│   ├── mockServer.js
│   ├── mockData.json
│   └── package.json
├── docs/                   # Documentation
│   ├── API.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
└── scripts/                # Build and utility scripts
    ├── build.sh
    ├── dev.sh
    └── package.sh
```

## 🛠️ Technology Stack

### Frontend
- **Vanilla JavaScript**: Lightweight extension code
- **Chrome Extensions API**: Manifest V3 for modern browser compatibility
- **CSS3**: Modern styling with flexbox and grid
- **HTML5**: Semantic markup for accessibility

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework for API development
- **Google Gemini Pro**: AI model for text analysis
- **Redis** (optional): Caching layer for performance
- **Cors**: Cross-origin resource sharing
- **Helmet**: Security middleware

### Development Tools
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Nodemon**: Development server with hot reload

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Chrome browser for extension testing
- Google AI Studio API key for Gemini

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Going-Bananas-Extension.git
   cd Going-Bananas-Extension
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install mock API dependencies**
   ```bash
   cd ../mock-api
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../backend
   cp .env.example .env
   # Edit .env with your Gemini API key
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Backend API
   cd backend
   npm run dev

   # Terminal 2: Mock API (for testing)
   cd mock-api
   npm start
   ```

6. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` folder

## 🧪 How It Works

### 1. Detection Phase
When you visit a website, the content script automatically:
- Scans for common T&C patterns (links, keywords, page structure)
- Identifies terms of service, privacy policy, and user agreement pages
- Extracts the full text content for analysis

### 2. Analysis Phase
The extracted text is sent to our backend API which:
- Preprocesses the text to remove formatting and normalize content
- Sends structured prompts to Gemini AI for analysis
- Processes the AI response to extract key insights

### 3. Risk Assessment
Our custom algorithm evaluates:
- **Data Collection**: What personal information is collected
- **Third-Party Sharing**: How your data might be shared
- **Liability**: What you're responsible for
- **Termination**: How accounts can be closed
- **Changes**: How terms can be modified

### 4. Presentation
Results are displayed in an intuitive popup showing:
- Overall risk score with color coding
- Top 3 most important points
- Detailed breakdown by category
- Plain English explanations

## 🔧 API Endpoints

### `POST /api/analyze`
Analyzes terms and conditions text

**Request Body:**
```json
{
  "text": "Terms and conditions text...",
  "url": "https://example.com/terms",
  "options": {
    "language": "en",
    "detail_level": "standard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "risk_score": 6.5,
    "risk_level": "medium",
    "summary": "Plain English summary...",
    "key_points": [
      "Your data may be shared with third parties",
      "Service can be terminated without notice",
      "You waive rights to class action lawsuits"
    ],
    "categories": {
      "privacy": { "score": 7, "concerns": [...] },
      "liability": { "score": 8, "concerns": [...] },
      "termination": { "score": 5, "concerns": [...] }
    }
  }
}
```

## 🛡️ Privacy & Security

- **No Data Storage**: We don't store your personal browsing data
- **Encrypted Communication**: All API calls use HTTPS
- **Minimal Permissions**: Extension only accesses necessary website content
- **Open Source**: Full transparency in our code and processes

## 📈 Development Roadmap

- [x] Basic T&C detection and parsing
- [x] Gemini AI integration for analysis
- [x] Risk scoring algorithm
- [ ] Multi-language support
- [ ] Browser compatibility (Firefox, Safari)
- [ ] Advanced filtering options
- [ ] Historical analysis tracking
- [ ] Community-driven risk database

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



---

**Made with 🍌 by the Going Bananas team**
