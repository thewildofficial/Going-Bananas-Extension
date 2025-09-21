# Going Bananas Landing Page

A modern, responsive landing page for the Going Bananas Chrome Extension - AI-powered Terms & Conditions analysis tool.

## 🚀 Features

- **Modern Design**: Clean, professional design with gradient animations and smooth interactions
- **Responsive Layout**: Mobile-first approach with seamless desktop experience
- **Interactive Elements**: Hover effects, scroll animations, and engaging user interactions
- **Browser Detection**: Automatically detects user's browser and highlights appropriate download
- **Performance Optimized**: Fast loading times with optimized assets and code
- **SEO Ready**: Proper meta tags, structured data, and semantic HTML
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

## 📁 Project Structure

```
landing_page/
├── index.html          # Main landing page
├── css/
│   └── main.css        # Styles with CSS custom properties
├── js/
│   └── main.js         # Interactive functionality
├── assets/
│   └── images/         # Icons, avatars, and graphics
├── package.json        # Dependencies and build scripts
└── README.md          # This file
```

## 🛠️ Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

### Quick Start

1. **Install Dependencies**

   ```bash
   cd landing_page
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

   This will start a live server at `http://localhost:3001` with auto-reload.

3. **Open in Browser**
   The page will automatically open in your default browser, or visit `http://localhost:3001`

### Available Scripts

- `npm run dev` - Start development server with live reload
- `npm run serve` - Start simple HTTP server
- `npm run build` - Build optimized production version
- `npm run validate:html` - Validate HTML structure
- `npm run lighthouse` - Run Lighthouse performance audit
- `npm run test:accessibility` - Run accessibility tests
- `npm run deploy:netlify` - Deploy to Netlify
- `npm run deploy:github` - Deploy to GitHub Pages

## 🎨 Customization

### Brand Colors

The landing page uses CSS custom properties for easy theming:

```css
:root {
  --primary-orange: #ff8a00;
  --primary-pink: #e52e71;
  --accent-yellow: #ffd700;
  --background: #0f0f23;
  --surface: #1a1a2e;
}
```

### Typography

Uses Inter font family with responsive sizing:

```css
:root {
  --font-primary: "Inter", system-ui, -apple-system, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-5xl: 3rem;
}
```

### Animations

Smooth animations and transitions using CSS transforms:

- Hero section particles floating animation
- Card hover effects with scale and translate
- Scroll-triggered fade-in animations
- Button hover effects with glow

## 📱 Responsive Design

The landing page is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Features

- Collapsible navigation menu
- Touch-friendly buttons
- Optimized text sizes
- Stacked layouts

## ⚡ Performance

### Optimization Features

- Minified CSS and JavaScript in production
- Optimized images (SVG icons)
- Efficient animations using CSS transforms
- Lazy loading for images
- Minimal external dependencies

### Performance Metrics

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Total Bundle Size**: < 100KB

## 🔧 Browser Support

- **Chrome**: 90+ ✅
- **Firefox**: 88+ ✅
- **Safari**: 14+ ✅
- **Edge**: 90+ ✅

## 📊 Analytics & Tracking

The landing page includes event tracking for:

- Download button clicks
- Navigation interactions
- Demo video plays
- Section scrolling
- Easter egg discoveries

### Setting up Analytics

Replace the tracking implementation in `js/main.js`:

```javascript
function trackEvent(event, data = {}) {
  // Google Analytics 4
  if (typeof gtag !== "undefined") {
    gtag("event", event, data);
  }

  // Custom analytics
  if (typeof analytics !== "undefined") {
    analytics.track(event, data);
  }
}
```

## 🎯 SEO Optimization

### Meta Tags

- Open Graph tags for social sharing
- Twitter Card meta tags
- Structured data markup
- Proper heading hierarchy

### Content Strategy

- Keyword-optimized content
- Semantic HTML structure
- Alt text for all images
- Descriptive URLs and navigation

## 🚀 Deployment

### Netlify (Recommended)

```bash
npm run deploy:netlify
```

### GitHub Pages

```bash
npm run deploy:github
```

### Manual Deployment

Simply upload all files to your web server. The page works without a build step.

### Environment Variables

For production deployment, set:

```bash
NODE_ENV=production
ANALYTICS_ID=your-analytics-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Test thoroughly: `npm run validate:html && npm run lighthouse`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports

If you find any issues, please report them on our [GitHub Issues](https://github.com/thewildofficial/Going-Bananas-Extension/issues) page.

## 📞 Support

- **Email**: support@goingbananas.dev
- **Documentation**: [docs.goingbananas.dev](https://docs.goingbananas.dev)
- **Community**: [discord.gg/goingbananas](https://discord.gg/goingbananas)

---

Built with ❤️ by the Going Bananas team. Don't go bananas over terms and conditions! 🍌
