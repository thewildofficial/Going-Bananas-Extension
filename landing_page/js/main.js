// ===================================
// GLOBAL VARIABLES & STATE
// ===================================
let isNavOpen = false;
let currentSection = 'hero';
let hasVisitedSections = new Set(['hero']);

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggle(theme);
    
    // Update navbar styling based on initial theme
    updateNavbarOnScroll();
}

function updateThemeToggle(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    if (theme === 'light') {
        sunIcon.style.opacity = '1';
        moonIcon.style.opacity = '0';
    } else {
        sunIcon.style.opacity = '0';
        moonIcon.style.opacity = '1';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
    
    // Update navbar styling immediately
    updateNavbarOnScroll();
}

function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener((e) => {
        if (!localStorage.getItem('theme')) {
            const theme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeToggle(theme);
        }
    });
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Smooth scroll to a section
 * @param {string} sectionId - The ID of the section to scroll to
 */
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
}

/**
 * Detect user's browser
 * @returns {string} Browser name
 */
function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
    return 'chrome';
  } else if (userAgent.includes('firefox')) {
    return 'firefox';
  } else if (userAgent.includes('edge')) {
    return 'edge';
  } else if (userAgent.includes('safari')) {
    return 'safari';
  }
  return 'unknown';
}

/**
 * Check if Chrome extension is already installed
 * @returns {Promise<boolean>} Whether extension is installed
 */
async function isExtensionInstalled() {
  return new Promise((resolve) => {
    // This would need to be implemented based on your actual extension ID
    // For now, we'll simulate the check
    setTimeout(() => {
      // Try to communicate with extension
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage('your-extension-id', { ping: true }, (response) => {
            resolve(!!response);
          });
        } else {
          resolve(false);
        }
      } catch (error) {
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Animate elements when they come into view
 * @param {Element} element - Element to animate
 */
function animateOnScroll(element) {
  if (!element.classList.contains('fade-in-up')) {
    element.classList.add('fade-in-up');
  }
}

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Throttle limit in milliseconds
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// ===================================
// NAVIGATION FUNCTIONALITY
// ===================================

/**
 * Toggle mobile navigation
 */
function toggleNav() {
  const navLinks = document.querySelector('.nav-links');
  const navToggle = document.querySelector('.nav-toggle');
  
  isNavOpen = !isNavOpen;
  
  if (isNavOpen) {
    navLinks.style.display = 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '100%';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(15, 15, 35, 0.98)';
    navLinks.style.padding = '20px';
    navLinks.style.backdropFilter = 'blur(10px)';
    navToggle.classList.add('open');
  } else {
    navLinks.style.display = '';
    navLinks.style.flexDirection = '';
    navLinks.style.position = '';
    navLinks.style.top = '';
    navLinks.style.left = '';
    navLinks.style.right = '';
    navLinks.style.background = '';
    navLinks.style.padding = '';
    navLinks.style.backdropFilter = '';
    navToggle.classList.remove('open');
  }
}

/**
 * Update active navigation link based on scroll position
 */
function updateActiveNavLink() {
  const sections = ['hero', 'features', 'demo', 'testimonials', 'download'];
  const navLinks = document.querySelectorAll('.nav-link');
  
  let current = 'hero';
  
  for (const sectionId of sections) {
    const section = document.getElementById(sectionId);
    if (section) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 150) {
        current = sectionId;
      }
    }
  }
  
  if (current !== currentSection) {
    currentSection = current;
    hasVisitedSections.add(current);
    
    // Update nav link styles
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${current}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

/**
 * Handle navbar transparency on scroll
 */
function updateNavbarOnScroll() {
  const navbar = document.querySelector('.navbar');
  const scrollY = window.scrollY;
  const currentTheme = document.documentElement.getAttribute('data-theme');
  
  if (currentTheme === 'light') {
    if (scrollY > 50) {
      navbar.style.background = 'rgba(255, 255, 255, 0.98)';
      navbar.style.backdropFilter = 'blur(15px)';
      navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
      navbar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
    } else {
      navbar.style.background = 'rgba(255, 255, 255, 0.95)';
      navbar.style.backdropFilter = 'blur(10px)';
      navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      navbar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.08)';
    }
  } else {
    if (scrollY > 50) {
      navbar.style.background = 'rgba(10, 10, 10, 0.98)';
      navbar.style.backdropFilter = 'blur(15px)';
      navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
      navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.15)';
    } else {
      navbar.style.background = 'rgba(10, 10, 10, 0.95)';
      navbar.style.backdropFilter = 'blur(10px)';
      navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
      navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    }
  }
}

// ===================================
// DOWNLOAD & INSTALLATION HANDLING
// ===================================

/**
 * Handle download button clicks
 * @param {string} browser - Browser type
 */
async function handleDownloadClick(browser = 'chrome') {
  const isInstalled = await isExtensionInstalled();
  
  if (isInstalled) {
    showNotification('Extension is already installed! 🎉', 'success');
    return;
  }
  
  // Track download event
  trackEvent('download_attempt', { browser });
  
  switch (browser) {
    case 'chrome':
      // Replace with actual Chrome Web Store URL
      window.open('https://chrome.google.com/webstore/detail/going-bananas/YOUR_EXTENSION_ID', '_blank');
      break;
    case 'firefox':
      showNotification('Firefox version coming soon! 🦊', 'info');
      break;
    case 'edge':
      showNotification('Edge version coming soon! 🔷', 'info');
      break;
    default:
      showNotification('Browser not supported yet 😔', 'warning');
  }
}

/**
 * Update download buttons based on detected browser
 */
function updateDownloadButtons() {
  const browser = detectBrowser();
  const chromeBtn = document.getElementById('main-download-btn');
  const firefoxBtn = document.getElementById('firefox-download-btn');
  const edgeBtn = document.getElementById('edge-download-btn');
  
  // Highlight the user's browser
  switch (browser) {
    case 'chrome':
      if (chromeBtn) {
        chromeBtn.classList.add('pulse');
        chromeBtn.innerHTML = '<img src="assets/images/chrome-icon.svg" alt="Chrome" class="browser-icon">Install for Chrome (Recommended)';
      }
      break;
    case 'firefox':
      if (firefoxBtn) {
        firefoxBtn.style.opacity = '1';
        firefoxBtn.innerHTML = '<img src="assets/images/firefox-icon.svg" alt="Firefox" class="browser-icon">Your Browser (Coming Soon)';
      }
      break;
    case 'edge':
      if (edgeBtn) {
        edgeBtn.style.opacity = '1';
        edgeBtn.innerHTML = '<img src="assets/images/edge-icon.svg" alt="Edge" class="browser-icon">Your Browser (Coming Soon)';
      }
      break;
  }
}

// ===================================
// DEMO & INTERACTION EFFECTS
// ===================================

/**
 * Simulate extension demo animation
 */
function playDemo() {
  const analysisPopup = document.querySelector('.analysis-popup');
  const textLines = document.querySelectorAll('.text-line');
  
  if (!analysisPopup) return;
  
  // Reset animation
  analysisPopup.style.animation = 'none';
  analysisPopup.offsetHeight; // Trigger reflow
  
  // Animate text highlighting
  textLines.forEach((line, index) => {
    setTimeout(() => {
      line.style.transform = 'scale(1.02)';
      line.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        line.style.transform = 'scale(1)';
      }, 300);
    }, index * 200);
  });
  
  // Show analysis popup with delay
  setTimeout(() => {
    analysisPopup.style.animation = 'slideInFromRight 0.8s ease-out';
  }, 1000);
  
  trackEvent('demo_played');
}

/**
 * Add interactive effects to feature cards
 */
function enhanceFeatureCards() {
  const cards = document.querySelectorAll('.feature-card');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
    });
  });
}

/**
 * Add hover effects to testimonial cards
 */
function enhanceTestimonialCards() {
  const cards = document.querySelectorAll('.testimonial-card');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'rgba(255, 138, 0, 0.5)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });
  });
}

// ===================================
// NOTIFICATIONS & FEEDBACK
// ===================================

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info, warning)
 */
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 16px 20px;
    border-radius: 8px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: slideInFromRight 0.3s ease-out;
    max-width: 300px;
    backdrop-filter: blur(10px);
  `;
  
  const colors = {
    success: { bg: 'rgba(0, 255, 136, 0.2)', border: '#00ff88', text: '#ffffff' },
    error: { bg: 'rgba(255, 71, 87, 0.2)', border: '#ff4757', text: '#ffffff' },
    warning: { bg: 'rgba(255, 170, 0, 0.2)', border: '#ffaa00', text: '#ffffff' },
    info: { bg: 'rgba(83, 82, 237, 0.2)', border: '#5352ed', text: '#ffffff' }
  };
  
  const color = colors[type] || colors.info;
  notification.style.background = color.bg;
  notification.style.borderLeft = `4px solid ${color.border}`;
  notification.style.color = color.text;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutToRight 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
  
  // Add click to dismiss
  notification.addEventListener('click', () => {
    notification.style.animation = 'slideOutToRight 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  });
}

// ===================================
// ANALYTICS & TRACKING
// ===================================

/**
 * Track user events for analytics
 * @param {string} event - Event name
 * @param {Object} data - Additional event data
 */
function trackEvent(event, data = {}) {
  // Replace with your analytics implementation
  console.log('Event tracked:', event, data);
  
  // Example: Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', event, data);
  }
  
  // Example: Custom analytics
  if (typeof analytics !== 'undefined') {
    analytics.track(event, data);
  }
}

// ===================================
// SCROLL ANIMATIONS & OBSERVERS
// ===================================

/**
 * Set up intersection observer for scroll animations
 */
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
        animateOnScroll(entry.target);
        entry.target.classList.add('animated');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  // Observe elements for animation
  const animateElements = document.querySelectorAll(
    '.feature-card, .testimonial-card, .step, .section-header'
  );
  animateElements.forEach(element => observer.observe(element));
}

// ===================================
// EASTER EGGS & FUN INTERACTIONS
// ===================================

/**
 * Add easter egg interactions
 */
function setupEasterEggs() {
  let bananaClickCount = 0;
  const bananaIcons = document.querySelectorAll('.logo-icon');
  
  bananaIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      bananaClickCount++;
      
      // Add bounce effect
      icon.style.animation = 'bounce 0.6s ease';
      setTimeout(() => icon.style.animation = '', 600);
      
      // Easter egg after 5 clicks
      if (bananaClickCount === 5) {
        showNotification('🍌 You found the banana easter egg! Going bananas! 🍌', 'success');
        
        // Add party effect
        createBananaRain();
        bananaClickCount = 0; // Reset
      }
      
      trackEvent('banana_clicked', { count: bananaClickCount });
    });
  });
}

/**
 * Create banana rain effect
 */
function createBananaRain() {
  const bananas = ['🍌', '🍌', '🍌', '🍌', '🍌'];
  
  bananas.forEach((banana, index) => {
    setTimeout(() => {
      const element = document.createElement('div');
      element.textContent = banana;
      element.style.cssText = `
        position: fixed;
        top: -20px;
        left: ${Math.random() * 100}%;
        font-size: 24px;
        z-index: 9999;
        pointer-events: none;
        animation: bananaFall 2s linear forwards;
      `;
      
      document.body.appendChild(element);
      
      setTimeout(() => element.remove(), 2000);
    }, index * 100);
  });
}

// ===================================
// INITIALIZATION & EVENT LISTENERS
// ===================================

/**
 * Initialize all functionality when DOM is ready
 */
function init() {
  // Initialize theme
  initializeTheme();
  setupSystemThemeListener();
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Navigation
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelectorAll('.nav-link');
  
  if (navToggle) {
    navToggle.addEventListener('click', toggleNav);
  }
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const sectionId = href.substring(1);
        scrollToSection(sectionId);
        
        // Close mobile nav if open
        if (isNavOpen) {
          toggleNav();
        }
        
        trackEvent('nav_click', { section: sectionId });
      }
    });
  });
  
  // Download buttons
  const heroDownloadBtn = document.getElementById('hero-download-btn');
  const mainDownloadBtn = document.getElementById('main-download-btn');
  const firefoxBtn = document.getElementById('firefox-download-btn');
  const edgeBtn = document.getElementById('edge-download-btn');
  
  if (heroDownloadBtn) {
    heroDownloadBtn.addEventListener('click', () => handleDownloadClick('chrome'));
  }
  
  if (mainDownloadBtn) {
    mainDownloadBtn.addEventListener('click', () => handleDownloadClick('chrome'));
  }
  
  if (firefoxBtn) {
    firefoxBtn.addEventListener('click', () => handleDownloadClick('firefox'));
  }
  
  if (edgeBtn) {
    edgeBtn.addEventListener('click', () => handleDownloadClick('edge'));
  }
  
  // Demo video
  const videoPlaceholder = document.querySelector('.video-placeholder');
  if (videoPlaceholder) {
    videoPlaceholder.addEventListener('click', playDemo);
  }
  
  // Scroll events
  const throttledScrollHandler = throttle(() => {
    updateNavbarOnScroll();
    updateActiveNavLink();
  }, 16); // ~60fps
  
  window.addEventListener('scroll', throttledScrollHandler);
  
  // Setup enhancements
  updateDownloadButtons();
  setupScrollAnimations();
  enhanceFeatureCards();
  enhanceTestimonialCards();
  setupEasterEggs();
  
  // Track page load
  trackEvent('page_loaded', {
    browser: detectBrowser(),
    timestamp: Date.now()
  });
  
  console.log('🍌 Going Bananas Landing Page initialized!');
}

// ===================================
// CSS ANIMATIONS (added dynamically)
// ===================================

// Add additional CSS animations
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
  @keyframes slideInFromRight {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutToRight {
    0% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
  
  @keyframes bananaFall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
  
  .nav-toggle.open span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }
  
  .nav-toggle.open span:nth-child(2) {
    opacity: 0;
  }
  
  .nav-toggle.open span:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
  }
`;

document.head.appendChild(additionalStyles);

// ===================================
// START APPLICATION
// ===================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}