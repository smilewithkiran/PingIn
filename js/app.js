'use strict';

// ── NAV scroll ──────────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Mobile menu ──────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
}

// ── Reveal on scroll ─────────────────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }});
}, { threshold: 0.1 });
revealEls.forEach(el => revealObs.observe(el));

// ── FAQ accordion ────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── Session check ────────────────────────────────────────────────────────────
function getSession() {
  try { return JSON.parse(localStorage.getItem('pingin_session') || 'null'); } catch(e) { return null; }
}
function isLoggedIn() {
  const s = getSession();
  if (!s?.loginAt) return false;
  return (Date.now() - new Date(s.loginAt)) / 3600000 < 168;
}
function signOut() {
  localStorage.removeItem('pingin_session');
  window.location.href = 'login.html';
}

// Update nav based on login state
window.addEventListener('DOMContentLoaded', () => {
  const navCta = document.getElementById('nav-cta');
  if (!navCta) return;
  const session = getSession();
  if (isLoggedIn() && session) {
    navCta.innerHTML = `
      <span style="font-size:12px;color:var(--ts)">Hi, ${session.name?.split(' ')[0] || 'User'}</span>
      <a href="dashboard.html" class="btn-primary-sm">Dashboard</a>
      <button onclick="signOut()" class="btn-ghost-sm">Sign out</button>`;
  }
});
