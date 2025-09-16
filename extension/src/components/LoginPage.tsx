import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleGoogleLogin = async () => {
    if (!agreed) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // For now, simulate a successful login
      // In production, this would integrate with your actual auth service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = {
        email: 'user@example.com',
        name: 'Demo User',
        provider: 'google'
      };
      
      onLoginSuccess(mockUser);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      margin: 0,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
      background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
      color: '#1a1a1a',
      display: 'grid',
      placeItems: 'center',
      lineHeight: '1.5'
    }}>
      <div style={{
        width: 'min(92vw, 980px)',
        display: 'grid',
        gridTemplateColumns: '1.1fr .9fr',
        gap: '28px',
        alignItems: 'center'
      }}>
        {/* Sign-in Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e9ecef',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '6px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
              boxShadow: '0 4px 16px rgba(255,107,149,0.3)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))' }}>
                <path d="M7 10V7a5 5 0 1 1 10 0v3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                <rect x="4" y="10" width="16" height="10" rx="2" stroke="#fff" strokeWidth="2"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: 'clamp(22px, 3.4vw, 28px)',
              margin: '0 0 2px',
              letterSpacing: '.2px'
            }}>Going Bananas</h1>
          </div>
          <p style={{
            color: '#4a5568',
            fontSize: '14px',
            margin: '0 0 18px'
          }}>
            Log in to sync your summaries, device settings, and saved highlights.
          </p>

          <div style={{
            display: 'grid',
            gap: '14px',
            marginTop: '10px'
          }}>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{
                cursor: isLoading ? 'not-allowed' : 'pointer',
                outline: 'none',
                borderRadius: '16px',
                padding: '12px 14px',
                fontSize: '15px',
                fontWeight: '600',
                letterSpacing: '.2px',
                color: '#1a1a1a',
                background: 'white',
                boxShadow: '0 4px 16px rgba(0,0,0,.1)',
                border: '1px solid #e9ecef',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform .06s ease, filter .15s ease, box-shadow .15s ease',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseDown={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(1px) scale(.995)';
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }
              }}
            >
              {isLoading ? (
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,.2)',
                  borderTopColor: 'currentColor',
                  animation: 'spin .8s linear infinite'
                }}></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.826 31.91 29.274 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.313 0 6.332 1.235 8.639 3.261l5.657-5.657C34.637 3.046 29.566 1 24 1 10.745 1 0 11.745 0 25s10.745 24 24 24s24-10.745 24-24c0-1.627-.17-3.216-.389-4.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.35 16.095 18.821 13 24 13c3.313 0 6.332 1.235 8.639 3.261l5.657-5.657C34.637 3.046 29.566 1 24 1 15.317 1 7.813 6.089 4.258 13.042l2.048 1.649z"/>
                  <path fill="#4CAF50" d="M24 49c5.186 0 9.86-1.977 13.432-5.197l-6.199-5.238C29.995 40.847 27.177 42 24 42c-5.248 0-9.681-3.359-11.288-8.028l-6.522 5.02C9.707 44.973 16.316 49 24 49z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.078 3.044-3.318 5.452-6.07 6.863l.001-.001 6.199 5.238C34.121 40.855 41 36 41 25c0-1.627-.17-3.216-.389-4.917z"/>
                </svg>
              )}
              <span>{isLoading ? 'Connecting…' : 'Continue with Google'}</span>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    borderRadius: '4px'
                  }}
                />
                <label htmlFor="agree" style={{
                  fontSize: '13px',
                  color: '#4a5568'
                }}>
                  I agree to the{' '}
                  <a href="#" style={{ color: '#ff6b95', textDecoration: 'none' }}>Terms</a>
                  {' '}and{' '}
                  <a href="#" style={{ color: '#ff6b95', textDecoration: 'none' }}>Privacy Policy</a>
                </label>
              </div>
            </div>

            <div style={{
              color: '#ef4444',
              fontSize: '13px',
              minHeight: '18px'
            }}>
              {error}
            </div>

            <p style={{
              marginTop: '12px',
              fontSize: '12px',
              color: '#4a5568'
            }}>
              We only request what we need: email and basic profile to associate your summaries. No ads, ever.
            </p>
          </div>
        </div>

        {/* Right side: value prop / reassurance */}
        <div style={{
          borderRadius: '20px',
          padding: '32px',
          border: '1px solid #e9ecef',
          background: '#ffffff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '600' }}>Read less. Know more.</h2>
          <p style={{
            color: '#4a5568',
            fontSize: '13px',
            margin: '0 0 16px',
            lineHeight: '1.5'
          }}>
            Our extension scans Terms & Conditions and Privacy Policies, then highlights what matters: 
            data use, auto‑renewals, cancellation, arbitration, hidden fees, and more — in plain English.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '14px',
            marginTop: '16px'
          }}>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '700', fontSize: '18px' }}>10×</div>
              <div style={{ color: '#4a5568', fontSize: '12px' }}>Faster to grasp</div>
            </div>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '700', fontSize: '18px' }}>95%</div>
              <div style={{ color: '#4a5568', fontSize: '12px' }}>Less legalese</div>
            </div>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '700', fontSize: '18px' }}>AES‑256</div>
              <div style={{ color: '#4a5568', fontSize: '12px' }}>Encrypted sync</div>
            </div>
          </div>
          
          <div style={{
            marginTop: '16px',
            fontSize: '12px',
            color: '#155724',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            padding: '12px 16px',
            borderRadius: '8px'
          }}>
            Tip: On first run, your browser may ask for permission to open the sign‑in popup. 
            Allow it so Google sign‑in can complete.
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @media (max-width: 920px) {
            .shell { 
              grid-template-columns: 1fr !important; 
              gap: 18px !important; 
            }
            .art { order: -1; }
          }
        `}
      </style>
    </div>
  );
};

export default LoginPage;