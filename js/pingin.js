'use strict';
// ══ PingIN Core Library ═══════════════════════════════════════════════════════

const EMAILJS_SERVICE  = 'service_2gph56v';
const EMAILJS_TEMPLATE = 'template_ylb2tmp';
const EMAILJS_KEY      = 'OboQTWg4MMuVOJWWt';
// Email subject set in EmailJS template dashboard
// Template variables: to_email, user_name, plan_name, plan_days, plan_price,
//   expiry_date, license_key, download_url, dashboard_url, from_name, reply_to, email_type

const PLANS = {
  free:    { name:'Free Trial',    days:5,   price:0,      priceStr:'₹0',        label:'5 Days Free',  dailyMsgs:5  },
  starter: { name:'Starter',       days:15,  price:650,    priceStr:'₹650',      label:'15 Days',      dailyMsgs:50 },
  pro:     { name:'Pro',           days:30,  price:1200,   priceStr:'₹1,200',    label:'Per Month',    dailyMsgs:50 },
  annual:  { name:'Annual',        days:365, price:10000,  priceStr:'₹10,000',   label:'1 Year',       dailyMsgs:50 },
};

const PingIN = {

  // ── Session management ──────────────────────────────────────────────────────
  getSession() {
    try { return JSON.parse(localStorage.getItem('pingin_session') || 'null'); } catch(e) { return null; }
  },
  saveSession(data) {
    localStorage.setItem('pingin_session', JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  },
  isLoggedIn() {
    const s = this.getSession();
    return !!(s?.email && s?.loginAt);
  },
  signOut() {
    localStorage.removeItem('pingin_session');
    window.location.href = 'login.html';
  },
  requireLogin() {
    if (!this.isLoggedIn()) window.location.href = 'login.html';
  },

  // ── User registration ───────────────────────────────────────────────────────
  getUsers() {
    try { return JSON.parse(localStorage.getItem('pingin_users') || '[]'); } catch(e) { return []; }
  },
  saveUsers(users) {
    localStorage.setItem('pingin_users', JSON.stringify(users));
  },
  findUser(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  registerUser({ name, email, password, phone }) {
    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Email already registered. Please sign in.' };
    }
    const user = {
      id:           'u_' + Date.now(),
      name, email, phone,
      passwordHash: btoa(password),
      plan:         'none',
      trialUsed:    false,
      trialStart:   null,
      planExpiry:   null,
      msgsToday:    0,
      msgsDate:     new Date().toDateString(),
      licenseKey:   null,
      createdAt:    new Date().toISOString(),
    };
    users.push(user);
    this.saveUsers(users);
    return { ok: true, user };
  },
  loginUser(email, password) {
    const user = this.findUser(email);
    if (!user) return { ok: false, error: 'No account found with this email.' };
    if (user.passwordHash !== btoa(password)) return { ok: false, error: 'Incorrect password.' };
    return { ok: true, user };
  },
  updateUser(email, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx >= 0) { users[idx] = { ...users[idx], ...updates }; this.saveUsers(users); }
    // Also update session
    const session = this.getSession();
    if (session?.email === email) this.saveSession({ ...session, ...updates });
  },

  // ── Plan management ─────────────────────────────────────────────────────────
  getPlanInfo(user) {
    if (!user?.plan || user.plan === 'none') return { status:'none', daysLeft:0, plan:null };
    const plan = PLANS[user.plan];
    if (!plan) return { status:'none', daysLeft:0, plan:null };

    const now = Date.now();
    const expiry = user.planExpiry ? new Date(user.planExpiry) : null;
    const daysLeft = expiry ? Math.max(0, Math.ceil((expiry - now) / 86400000)) : 0;
    const expired = expiry && now > expiry;


    return {
      status:   expired ? 'expired' : 'active',
      plan:     user.plan,
      planObj:  plan,
      daysLeft,

      expiry:   user.planExpiry,
      expired,
    };
  },
  activatePlan(email, planKey, licenseKey) {
    const plan = PLANS[planKey];
    if (!plan) return false;
    const expiry = new Date(Date.now() + plan.days * 86400000).toISOString();
    this.updateUser(email, {
      plan:       planKey,
      planExpiry: expiry,
      licenseKey,
      trialUsed:  planKey === 'free' ? true : (this.findUser(email)?.trialUsed || false),
      trialStart: planKey === 'free' ? new Date().toISOString() : (this.findUser(email)?.trialStart || null),
    });
    return true;
  },

  // ── License key generation ──────────────────────────────────────────────────
  generateKey(email, plan) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
    const planCode = { free:'FR', starter:'ST', pro:'PR', annual:'AN' }[plan] || 'XX';
    return `PING-${planCode}-${seg()}-${seg()}`;
  },

  // ── Email via EmailJS ───────────────────────────────────────────────────────
  async sendEmail(params) {
    try {
      if (typeof emailjs === 'undefined') return false;
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, params, EMAILJS_KEY);
      return true;
    } catch(e) { console.error('[PingIN] Email error:', e); return false; }
  },

  // ── WhatsApp message ────────────────────────────────────────────────────────
  sendWhatsApp(message) {
    // Admin notifications handled via Razorpay dashboard
    console.log('[PingIN] Admin notify:', message);
  },
  sendCustomerWhatsApp(phone, message) {
    // Customer contact via email only
    console.log('[PingIN] Customer msg:', message);
  },

  // ── Expiry check ────────────────────────────────────────────────────────────
  checkExpiry(user) {
    const info = this.getPlanInfo(user);
    if (info.status === 'expired') return 'expired';
    if (info.daysLeft <= 3 && info.daysLeft > 0) return 'expiring';
    return 'ok';
  },
};

window.PingIN = PingIN;
window.PLANS  = PLANS;
