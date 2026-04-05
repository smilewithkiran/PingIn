'use strict';
// ── Shared nav logic ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Scroll effect
  const nav = document.getElementById('nav');
  if (nav) {
    // Add scrolled immediately so bg is always solid (mobile needs this)
    nav.classList.add('scrolled');
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10));
  }

  // Mobile menu
  const ham = document.getElementById('hamburger');
  const mob = document.getElementById('mobile-menu');
  if (ham && mob) ham.addEventListener('click', () => mob.classList.toggle('open'));

  // Session-based nav update
  const session = PingIN.getSession();
  const navCta = document.getElementById('nav-cta');
  if (navCta && session) {
    navCta.innerHTML = `
      <a href="dashboard.html" class="btn-ghost-sm">Dashboard</a>
      <button onclick="PingIN.signOut()" class="btn-primary-sm">Sign out</button>`;
  }

  // Reveal on scroll
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }});
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
});
