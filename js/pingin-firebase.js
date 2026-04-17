// ═══════════════════════════════════════════════════════════════════════════
// PingIN — Firebase-backed user management
// Replaces localStorage with Firestore for cross-device persistence
// Falls back to localStorage if Firebase not configured yet
// ═══════════════════════════════════════════════════════════════════════════

const PingINDB = {

  // ── Check if Firebase is configured ─────────────────────────────────────
  async isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
  },

  // ── SHA-256 helper ───────────────────────────────────────────────────────
  async sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  },

  // ── Register user ────────────────────────────────────────────────────────
  // Returns { ok, error, user }
  async registerUser({ name, email, phone, password }) {
    const emailKey = email.toLowerCase().trim();
    const phoneClean = (phone || '').replace(/\s+/g,'').trim();

    // ── DUPLICATE CHECK 1: email ──
    const existing = await this.findUserByEmail(emailKey);
    if (existing) {
      return { ok: false, error: 'This email is already registered. Please sign in instead.' };
    }

    // ── DUPLICATE CHECK 2: phone (if provided) ──
    if (phoneClean && phoneClean.length >= 10) {
      const byPhone = await this.findUserByPhone(phoneClean);
      if (byPhone) {
        return { ok: false, error: 'This phone number is already registered with another account.' };
      }
    }

    // ── TRIAL CHECK: one free trial per email ever ──
    // (email check above already covers this — same email = blocked)

    const passwordHash = await this.sha256(password);
    const user = {
      id:           'u_' + Date.now(),
      name:         name.trim(),
      email:        emailKey,
      phone:        phoneClean,
      passwordHash,
      plan:         'none',
      trialUsed:    false,
      trialStart:   null,
      planExpiry:   null,
      licenseKey:   null,
      msgsToday:    0,
      msgsDate:     new Date().toDateString(),
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    };

    // Save to Firebase
    const fbOk = await this.isFirebaseConfigured() && await initFirebase()
      ? await fbSet('users', emailKey, user)
      : false;

    // Always save to localStorage as backup
    const local = PingIN.getUsers();
    if (!local.find(u => u.email === emailKey)) {
      local.push(user);
      PingIN.saveUsers(local);
    }

    if (!fbOk && !(await this.isFirebaseConfigured())) {
      console.log('[PingIN] Using localStorage (Firebase not configured)');
    }

    return { ok: true, user };
  },

  // ── Login ────────────────────────────────────────────────────────────────
  async loginUser(email, password) {
    const emailKey = email.toLowerCase().trim();
    const passwordHash = await this.sha256(password);

    const user = await this.findUserByEmail(emailKey);
    if (!user) return { ok: false, error: 'No account found with this email. Please register first.' };

    // Support legacy btoa passwords (for users registered before SHA-256 migration)
    const legacyHash = btoa(password);
    const matchesSHA = user.passwordHash === passwordHash;
    const matchesLegacy = user.passwordHash === legacyHash;

    if (!matchesSHA && !matchesLegacy) {
      return { ok: false, error: 'Incorrect password.' };
    }

    // Upgrade legacy password hash silently
    if (matchesLegacy && !matchesSHA) {
      await this.updateUser(emailKey, { passwordHash });
    }

    return { ok: true, user };
  },

  // ── Find user by email ───────────────────────────────────────────────────
  async findUserByEmail(email) {
    const emailKey = email.toLowerCase().trim();

    // Firebase first
    if (await this.isFirebaseConfigured() && await initFirebase()) {
      const fbUser = await fbGet('users', emailKey);
      if (fbUser) return fbUser;
    }

    // localStorage fallback
    return PingIN.findUser(emailKey) || null;
  },

  // ── Find user by phone ───────────────────────────────────────────────────
  async findUserByPhone(phone) {
    const phoneClean = (phone || '').replace(/\s+/g,'').trim();
    if (!phoneClean) return null;

    // Firebase
    if (await this.isFirebaseConfigured() && await initFirebase()) {
      const fbUser = await fbFindByPhone(phoneClean);
      if (fbUser) return fbUser;
    }

    // localStorage fallback
    const users = PingIN.getUsers();
    return users.find(u =>
      u.phone && u.phone.replace(/\s+/g,'') === phoneClean
    ) || null;
  },

  // ── Update user ──────────────────────────────────────────────────────────
  async updateUser(email, updates) {
    const emailKey = email.toLowerCase().trim();
    updates.updatedAt = new Date().toISOString();

    // Firebase
    if (await this.isFirebaseConfigured() && await initFirebase()) {
      await fbSet('users', emailKey, updates);
    }

    // localStorage always
    PingIN.updateUser(emailKey, updates);
  },

  // ── Get all users (for admin) ────────────────────────────────────────────
  async getAllUsers() {
    // Firebase
    if (await this.isFirebaseConfigured() && await initFirebase()) {
      const fbUsers = await fbGetAll('users');
      if (fbUsers.length > 0) {
        // Sync to localStorage for admin
        localStorage.setItem('pingin_users', JSON.stringify(fbUsers));
        return fbUsers;
      }
    }
    // localStorage fallback
    return PingIN.getUsers();
  },

  // ── Activate plan ────────────────────────────────────────────────────────
  async activatePlan(email, { plan, licenseKey, planExpiry }) {
    const updates = {
      plan,
      licenseKey,
      planExpiry,
      trialUsed: true,
      updatedAt: new Date().toISOString(),
    };
    await this.updateUser(email, updates);
  },

  // ── Check if email or phone already used for free trial ─────────────────
  async hasUsedTrial(email, phone) {
    // Email check
    const byEmail = await this.findUserByEmail(email);
    if (byEmail && (byEmail.trialUsed || byEmail.plan !== 'none')) {
      return { blocked: true, reason: 'email', msg: 'This email has already used a free trial or has an active plan. Please sign in to your existing account.' };
    }

    // Phone check
    if (phone && phone.length >= 10) {
      const byPhone = await this.findUserByPhone(phone);
      if (byPhone && (byPhone.trialUsed || byPhone.plan !== 'none')) {
        return { blocked: true, reason: 'phone', msg: 'This phone number has already been used for a free trial. Please sign in or purchase a plan.' };
      }
    }

    return { blocked: false };
  },
};

console.log('[PingIN] PingINDB ready ✓');
