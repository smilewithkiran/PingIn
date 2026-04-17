// ═══════════════════════════════════════════════════════════════════
// PingIN — Firebase-backed user management
// Falls back to localStorage silently if Firebase not configured
// ═══════════════════════════════════════════════════════════════════

const PingINDB = {

  async isFirebaseReady() {
    if (typeof FIREBASE_CONFIG === 'undefined') return false;
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') return false;
    return await initFirebase();
  },

  async sha256(str) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    } catch(e) { return btoa(str); } // fallback if crypto not available
  },

  // ── Register ──────────────────────────────────────────────────────
  async registerUser({ name, email, phone, password }) {
    try {
      const emailKey   = email.toLowerCase().trim();
      const phoneClean = (phone||''). replace(/\s+/g,'').trim();

      // Duplicate email check
      const existing = await this.findUserByEmail(emailKey);
      if (existing) return { ok:false, error:'This email is already registered. Please sign in.' };

      // Duplicate phone check
      if (phoneClean.length >= 10) {
        const byPhone = await this.findUserByPhone(phoneClean);
        if (byPhone) return { ok:false, error:'This phone number is already registered.' };
      }

      const passwordHash = await this.sha256(password);
      const user = {
        id: 'u_'+Date.now(), name:name.trim(), email:emailKey, phone:phoneClean,
        passwordHash, plan:'none', trialUsed:false, trialStart:null,
        planExpiry:null, licenseKey:null, msgsToday:0,
        msgsDate:new Date().toDateString(), createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      };

      // Save to Firebase if available
      if (await this.isFirebaseReady()) {
        await fbSet('users', emailKey, user);
      }

      // Always save to localStorage as backup
      const local = PingIN.getUsers();
      if (!local.find(u => u.email === emailKey)) {
        local.push(user); PingIN.saveUsers(local);
      }

      return { ok:true, user };
    } catch(e) {
      console.error('[PingINDB] registerUser error:', e);
      // Fallback to localStorage-only
      return PingIN.registerUser({ name, email, password, phone });
    }
  },

  // ── Login ─────────────────────────────────────────────────────────
  async loginUser(email, password) {
    try {
      const emailKey     = email.toLowerCase().trim();
      const passwordHash = await this.sha256(password);
      const user         = await this.findUserByEmail(emailKey);

      if (!user) return { ok:false, error:'No account found. Please register first.' };

      const matchSHA    = user.passwordHash === passwordHash;
      const matchLegacy = user.passwordHash === btoa(password);
      if (!matchSHA && !matchLegacy) return { ok:false, error:'Incorrect password.' };

      // Silently upgrade legacy hash
      if (matchLegacy && !matchSHA) {
        await this.updateUser(emailKey, { passwordHash });
      }
      return { ok:true, user };
    } catch(e) {
      console.error('[PingINDB] loginUser error:', e);
      return PingIN.loginUser(email, password);
    }
  },

  // ── Find by email ─────────────────────────────────────────────────
  async findUserByEmail(email) {
    try {
      const emailKey = email.toLowerCase().trim();
      if (await this.isFirebaseReady()) {
        const fbUser = await fbGet('users', emailKey);
        if (fbUser) return fbUser;
      }
      return PingIN.findUser(emailKey) || null;
    } catch(e) { return PingIN.findUser(email) || null; }
  },

  // ── Find by phone ─────────────────────────────────────────────────
  async findUserByPhone(phone) {
    try {
      const phoneClean = (phone||''). replace(/\s+/g,'').trim();
      if (!phoneClean) return null;
      if (await this.isFirebaseReady()) {
        const fbUser = await fbFindByPhone(phoneClean);
        if (fbUser) return fbUser;
      }
      return PingIN.getUsers().find(u =>
        u.phone && u.phone.replace(/\s+/g,'') === phoneClean
      ) || null;
    } catch(e) { return null; }
  },

  // ── Update ────────────────────────────────────────────────────────
  async updateUser(email, updates) {
    try {
      const emailKey = email.toLowerCase().trim();
      updates.updatedAt = new Date().toISOString();
      if (await this.isFirebaseReady()) await fbSet('users', emailKey, updates);
      PingIN.updateUser(emailKey, updates);
    } catch(e) { PingIN.updateUser(email, updates); }
  },

  // ── Get all (admin) ───────────────────────────────────────────────
  async getAllUsers() {
    try {
      if (await this.isFirebaseReady()) {
        const fbUsers = await fbGetAll('users');
        if (fbUsers.length > 0) {
          localStorage.setItem('pingin_users', JSON.stringify(fbUsers));
          return fbUsers;
        }
      }
      return PingIN.getUsers();
    } catch(e) { return PingIN.getUsers(); }
  },

  // ── Activate plan ─────────────────────────────────────────────────
  async activatePlan(email, { plan, licenseKey, planExpiry }) {
    try {
      await this.updateUser(email, { plan, licenseKey, planExpiry, trialUsed:true });
    } catch(e) { PingIN.updateUser(email, { plan, licenseKey, planExpiry }); }
  },

  // ── Trial abuse check ─────────────────────────────────────────────
  async hasUsedTrial(email, phone) {
    try {
      const byEmail = await this.findUserByEmail(email);
      if (byEmail && (byEmail.trialUsed || byEmail.plan !== 'none')) {
        return { blocked:true, msg:'This email already has an account. Please sign in.' };
      }
      if (phone && phone.length >= 10) {
        const byPhone = await this.findUserByPhone(phone);
        if (byPhone && (byPhone.trialUsed || byPhone.plan !== 'none')) {
          return { blocked:true, msg:'This phone number already has a PingIN account.' };
        }
      }
      return { blocked:false };
    } catch(e) { return { blocked:false }; }
  },
};

console.log('[PingIN] PingINDB loaded ✓');
