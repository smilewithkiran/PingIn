'use strict';

// ════════════════════════════════════════
//  YOUR DETAILS — UPDATE THESE
// ════════════════════════════════════════
const YOUR_UPI_ID       = 'yourname@upi';    // ← e.g. 9876543210@paytm
// ════════════════════════════════════════

// ── All 4 plans ──────────────────────────────────────────────────────────────
const PLANS = {
  trial:   {
    name: 'Free Trial — 5 Days',
    badge: 'free', price: '₹0',
    sub: '₹0', gst: '₹0', total: '₹0', totalNum: 0,
    days: 5, msgs: 10,
    feats: ['10 messages / day','5-day access','All search filters','College + degree filter','CSV export'],
  },
  starter: {
    name: 'Starter — 15 Days',
    badge: 'pro', price: '₹499',
    sub: '₹499', gst: '₹0', total: '₹499', totalNum: 499,
    days: 15, msgs: 25,
    feats: ['25 messages / day','15-day access','Multi-page scraping (5 pages)','Save 5 searches','Company live search'],
  },
  pro: {
    name: 'Pro — 30 Days',
    badge: 'pro', price: '₹999',
    sub: '₹999', gst: '₹0', total: '₹999', totalNum: 999,
    days: 30, msgs: 50,
    feats: ['50 messages / day','30-day access','Unlimited multi-page scraping','Save unlimited searches','Campaign history (30 days)','All 11 profile type filters','GCC + Startup + Layoff filters'],
  },
  annual: {
    name: 'Annual — 1 Year',
    badge: 'team', price: '₹10,000',
    sub: '₹10,000', gst: '₹0', total: '₹10,000', totalNum: 10000,
    days: 365, msgs: 50,
    feats: ['50 messages / day','365-day access','Everything in Pro plan','Unlimited multi-page scraping','Save unlimited searches','Campaign history (30 days)','~₹27/day — best value'],
  },
};

// ── Read plan from URL param ──────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const planKey   = urlParams.get('plan') || 'pro';
const P         = PLANS[planKey] || PLANS.pro;

// ── Populate order summary on load ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Plan name + badge
  const badge = document.getElementById('oc-badge');
  if (badge) { badge.textContent = P.name; badge.className = 'oc-plan-badge ' + P.badge; }

  // Prices
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('oc-price',    P.price);
  set('oc-sub',      P.sub);
  set('oc-gst',      P.gst);
  set('oc-total',    P.total);
  set('pay-amount',  P.total);
  set('upi-id-text', YOUR_UPI_ID);

  const cfAmt = document.getElementById('cf-amount');
  if (cfAmt) cfAmt.placeholder = P.totalNum.toString();

  // Features list
  const featEl = document.getElementById('oc-feats');
  if (featEl && P.feats) {
    featEl.innerHTML = P.feats.map(f => `<div class="oc-feat">✓ ${f}</div>`).join('');
  }

  // Page title
  document.title = `Pay ${P.total} — ${P.name} — PingIN`;

  const guarantee = document.querySelector('.oc-guarantee');
  if (guarantee) guarantee.style.display = 'none';

  // Free trial — hide payment steps, redirect to login
  if (planKey === 'trial') {
    const paySection = document.getElementById('payment-steps');
    if (paySection) paySection.style.display = 'none';
    const freeBox = document.getElementById('free-trial-box');
    if (freeBox) freeBox.style.display = 'block';
  }

  // Try to load UPI QR image
  const testImg = new Image();
  testImg.onload = () => {
    const qrBox = document.getElementById('qr-box');
    if (qrBox) qrBox.innerHTML = `<img src="images/upi-qr.png" alt="UPI QR Code" style="width:180px;height:180px;border-radius:8px;display:block;">`;
  };
  testImg.src = 'images/upi-qr.png';
});

// ── Step switcher ─────────────────────────────────────────────────────────────
function showStep(n) {
  const s1 = document.getElementById('step1');
  const s2 = document.getElementById('step2');
  const t1 = document.getElementById('tab1');
  const t2 = document.getElementById('tab2');
  if (s1) s1.style.display = n===1 ? 'block' : 'none';
  if (s2) s2.style.display = n===2 ? 'block' : 'none';
  if (t1) t1.classList.toggle('active', n===1);
  if (t2) t2.classList.toggle('active', n===2);
}

// ── Copy UPI ID ───────────────────────────────────────────────────────────────
function copyUPI() {
  const btn = document.querySelector('.copy-btn');
  navigator.clipboard.writeText(YOUR_UPI_ID)
    .then(() => {
      if (btn) { const o=btn.textContent; btn.textContent='✓ Copied!'; setTimeout(()=>btn.textContent=o, 2000); }
    })
    .catch(() => {
      const el = document.createElement('textarea');
      el.value = YOUR_UPI_ID;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
      if (btn) { const o=btn.textContent; btn.textContent='✓ Copied!'; setTimeout(()=>btn.textContent=o, 2000); }
    });
}

// ── Submit payment confirmation ───────────────────────────────────────────────
function submitForm() {
  const name   = document.getElementById('cf-name')?.value?.trim();
  const email  = document.getElementById('cf-email')?.value?.trim();
  const mobile = document.getElementById('cf-mobile')?.value?.trim();
  const utr    = document.getElementById('cf-utr')?.value?.trim();
  const amount = document.getElementById('cf-amount')?.value?.trim();

  if (!name)   { highlight('cf-name');   return; }
  if (!email)  { highlight('cf-email');  return; }
  if (!mobile) { highlight('cf-mobile'); return; }
  if (!utr)    { highlight('cf-utr');    return; }

  if (utr.replace(/\D/g,'').length < 8) {
    alert('Please enter a valid UTR / Transaction ID. Check your UPI app payment history.');
    return;
  }

  const btn = document.getElementById('btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  // Send to your WhatsApp

  setTimeout(() => {
    const step2 = document.getElementById('step2');
    const successBox = document.getElementById('success-box');
    if (step2)      step2.style.display      = 'none';
    if (successBox) successBox.style.display = 'block';
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set('sb-name',   name);
    set('sb-plan',   P.name);
    set('sb-email',  email);
    set('sb-mobile', mobile);
  }, 1200);
}

function highlight(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#E24B4A';
  el.focus();
  setTimeout(() => el.style.borderColor = '', 2500);
  el.scrollIntoView({ behavior:'smooth', block:'center' });
}
