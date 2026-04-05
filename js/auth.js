'use strict';

// ══════════════════════════════════════════════════
//  PingIN Auth System
//  Shared between website + extension
//  Replace CLIENT_ID with your LinkedIn App credentials
// ══════════════════════════════════════════════════

// ── CONFIG — Replace these when you get LinkedIn App credentials ──
const PINGIN_CONFIG = {
  // Get this from: developer.linkedin.com → Create App → Auth tab
  LI_CLIENT_ID:    '8685m4w7pd2wdc',

  // Must match exactly what you set in LinkedIn App → Authorized redirect URLs
  LI_REDIRECT_URI:  window.location.origin + '/auth-callback.html',

  // Session duration: 7 days
  SESSION_HOURS:   168,
};
// ─────────────────────────────────────────────────

// ── LinkedIn OAuth ──
function loginWithLinkedIn() {
  const state = Math.random().toString(36).substring(2);
  sessionStorage.setItem('li_oauth_state', state);

  // Show loading
  document.getElementById('email-form')?.style && (document.getElementById('email-form').style.display='none');
  document.getElementById('btn-li')?.style && (document.getElementById('btn-li').style.display='none');
  document.querySelector('.divider')?.style && (document.querySelector('.divider').style.display='none');
  document.querySelector('.li-note')?.style && (document.querySelector('.li-note').style.display='none');
  document.getElementById('oauth-loading').style.display='block';

  const scope       = encodeURIComponent('openid profile email');
  const redirectUri = encodeURIComponent(PINGIN_CONFIG.LI_REDIRECT_URI);
  const authUrl     = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${PINGIN_CONFIG.LI_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

  // Open popup
  const popup = window.open(authUrl, 'pingin_li_auth', 'width=600,height=700,scrollbars=yes,resizable=yes');

  if (!popup) {
    // Popup blocked — redirect instead
    sessionStorage.setItem('li_return_url', window.location.href);
    window.location.href = authUrl;
    return;
  }

  // Listen for result from callback page
  const handler = (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== 'pingin_auth_success') return;
    window.removeEventListener('message', handler);
    clearInterval(checkClosed);
    handleLoginSuccess(event.data.user);
  };
  window.addEventListener('message', handler);

  // Check if popup closed without auth
  const checkClosed = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkClosed);
      setTimeout(() => {
        if (document.getElementById('auth-success')?.style.display !== 'block') {
          resetLoginUI();
        }
      }, 500);
    }
  }, 1000);
}

// ── Email login ──
function loginWithEmail() {
  const email = document.getElementById('login-email')?.value?.trim();
  const pass  = document.getElementById('login-pass')?.value;
  if (!email || !pass) { showAuthError('Please enter your email and password.'); return; }

  const btn = document.getElementById('btn-email');
  if (btn) { btn.disabled=true; btn.textContent='Signing in...'; }

  // In production: replace with real API call
  // POST /api/auth/login { email, password }
  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('pingin_users') || '[]');
    const user  = users.find(u => u.email===email && u.passwordHash===btoa(pass));
    if (user) {
      handleLoginSuccess(user);
    } else {
      if (btn) { btn.disabled=false; btn.textContent='Sign in with Email'; }
      showAuthError('Incorrect email or password. Please try again.');
    }
  }, 1000);
}

// ── Handle successful login ──
function handleLoginSuccess(user) {
  const session = {
    name:        user.name   || user.email?.split('@')[0] || 'User',
    email:       user.email  || '',
    photo:       user.photo  || '',
    headline:    user.headline || '',
    planStatus:  user.planStatus  || getPlanFromStorage() || 'trial',
    planExpiry:  user.planExpiry  || '',
    loginAt:     new Date().toISOString(),
    method:      user.method || 'email',
    liId:        user.liId   || '',
  };

  // Save to localStorage (website)
  localStorage.setItem('pingin_session', JSON.stringify(session));

  // Sync to Chrome extension if installed
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    chrome.storage.local.set({
      userSession: session,
      planStatus:  session.planStatus,
    });
  }

  // Update UI
  document.getElementById('oauth-loading') && (document.getElementById('oauth-loading').style.display='none');
  document.getElementById('auth-success')  && (document.getElementById('auth-success').style.display='block');
  document.getElementById('user-name')     && (document.getElementById('user-name').textContent = session.name);

  // Redirect to dashboard
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
}

// ── Helper: get current plan from storage ──
function getPlanFromStorage() {
  try {
    const data = JSON.parse(localStorage.getItem('pingin_plan') || '{}');
    if (data.expiry && new Date(data.expiry) > new Date()) return data.status;
  } catch(e) {}
  return 'trial';
}

// ── Reset UI ──
function resetLoginUI() {
  document.getElementById('email-form')  && (document.getElementById('email-form').style.display='block');
  document.getElementById('btn-li')      && (document.getElementById('btn-li').style.display='flex');
  document.querySelector('.divider')     && (document.querySelector('.divider').style.display='flex');
  document.querySelector('.li-note')     && (document.querySelector('.li-note').style.display='block');
  document.getElementById('oauth-loading') && (document.getElementById('oauth-loading').style.display='none');
}

// ── Show error ──
function showAuthError(msg) {
  let el = document.getElementById('auth-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'auth-error';
    el.style.cssText = 'background:rgba(226,75,74,.1);border:1px solid rgba(226,75,74,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#F09595;margin-bottom:12px;line-height:1.5;';
    const form = document.getElementById('email-form');
    if (form) form.insertBefore(el, form.firstChild);
  }
  el.textContent = msg;
}

// ── Forgot password ──
function showForgot() {
  const email = document.getElementById('login-email')?.value?.trim();
  if (!email) { showAuthError('Enter your email address first, then click Forgot password.'); return; }
  // In production: POST /api/auth/forgot-password { email }
  alert(`Password reset email sent to ${email}.\nCheck your inbox (including spam folder).`);
}

// ── Check session on page load ──
function checkExistingSession() {
  try {
    const session = JSON.parse(localStorage.getItem('pingin_session') || 'null');
    if (!session?.loginAt) return false;
    const hours = (Date.now() - new Date(session.loginAt)) / 3600000;
    return hours < PINGIN_CONFIG.SESSION_HOURS;
  } catch(e) { return false; }
}

// ── Get current user ──
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('pingin_session') || 'null'); }
  catch(e) { return null; }
}

// ── Logout ──
function signOut() {
  localStorage.removeItem('pingin_session');
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    chrome.storage.local.remove(['userSession']);
  }
  window.location.href = 'login.html';
}

// ── Auto check on login page ──
if (window.location.pathname.includes('login.html')) {
  window.addEventListener('DOMContentLoaded', () => {
    if (checkExistingSession()) {
      window.location.href = 'dashboard.html';
    }
  });
}

// ── Password show/hide ──
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-pass');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      const inp = document.getElementById('login-pass');
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      this.textContent = inp.type === 'password' ? 'Show' : 'Hide';
    });
  }
});
