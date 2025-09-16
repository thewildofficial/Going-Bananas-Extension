// Using Supabase auth via background or direct supabase client if needed

const qs = (sel: string) => document.querySelector(sel) as HTMLElement | null;

const googleBtn = qs('#googleBtn') as HTMLButtonElement | null;
const agree = qs('#agree') as HTMLInputElement | null;
const errorEl = qs('#error') as HTMLDivElement | null;
const envEl = qs('#env') as HTMLDivElement | null;

const isExtension = typeof chrome !== 'undefined' && !!chrome?.runtime?.id;

function setLoading(btn: HTMLButtonElement, loading: boolean) {
  if (!btn) return;
  if (loading) {
    (btn as any).dataset.label = btn.textContent || '';
    btn.innerHTML = '<span class="spinner" role="progressbar" aria-label="Loading"></span> Connecting…';
    btn.disabled = true;
  } else {
    btn.innerHTML = (btn as any).dataset.label || btn.innerHTML;
    btn.disabled = false;
  }
}

function requireAgreement(): boolean {
  if (!agree || !agree.checked) {
    if (errorEl) errorEl.textContent = 'Please accept the Terms and Privacy Policy to continue.';
    return false;
  }
  if (errorEl) errorEl.textContent = '';
  return true;
}

async function signInWithGoogle() {
  if (!googleBtn) return;
  if (!requireAgreement()) return;

  setLoading(googleBtn, true);

  try {
    if (!isExtension) {
      await new Promise((r) => setTimeout(r, 1000));
      alert('Preview mode: Login simulation complete!');
      setLoading(googleBtn, false);
      return;
    }

    // Placeholder: invoke background to start Supabase OAuth or use direct flow
    const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_START_OAUTH' });
    if (!response?.ok) throw new Error(response?.error || 'OAuth failed');

    window.close();
  } catch (error: any) {
    console.error('Login error:', error);
    if (errorEl) errorEl.textContent = error?.message || 'Login failed. Please try again.';
  } finally {
    setLoading(googleBtn, false);
  }
}

function init() {
  if (envEl) envEl.textContent = isExtension ? `Extension mode • id: ${chrome.runtime.id}` : 'Preview mode (no chrome.* APIs)';

  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }

  // Replace inline alert links to satisfy CSP
  const termsLink = document.getElementById('link-terms');
  const privacyLink = document.getElementById('link-privacy');
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Link to Terms—replace with your hosted URL');
    });
  }
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Link to Privacy Policy—replace with your hosted URL');
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
