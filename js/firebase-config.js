// ═══════════════════════════════════════════════════════════════════
// PingIN — Firebase Realtime Database (REST API)
// Uses your existing RTDB: pingin-in-default-rtdb
// No Firestore needed. No rules setup needed.
// Just replace YOUR_API_KEY below with your real key.
// ═══════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:   "AIzaSyDf7EY6c4vuysukC7TJGRQ51GTQj_exL5w",   // ← only this needs to change
  rtdbUrl:  "https://pingin-in-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// ── Simple RTDB REST helpers ─────────────────────────────────────────────────
// No SDK imports needed — just fetch() calls

function _rtdbReady() {
  return FIREBASE_CONFIG.apiKey !== 'AIzaSyDf7EY6c4vuysukC7TJGRQ51GTQj_exL5w' && FIREBASE_CONFIG.rtdbUrl;
}

function _rtdbKey(email) {
  // Firebase keys can't have . so encode email
  return encodeURIComponent(email.toLowerCase().trim())
    .replace(/\./g, '%2E').replace(/@/g, '%40');
}

async function fbGet(col, docId) {
  if (!_rtdbReady()) return null;
  try {
    const url = `${FIREBASE_CONFIG.rtdbUrl}/${col}/${_rtdbKey(docId)}.json?auth=${FIREBASE_CONFIG.apiKey}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    return data || null;
  } catch(e) { return null; }
}

async function fbSet(col, docId, data) {
  if (!_rtdbReady()) return false;
  try {
    // GET existing first to merge
    const existing = await fbGet(col, docId) || {};
    const merged = { ...existing, ...data };
    const url = `${FIREBASE_CONFIG.rtdbUrl}/${col}/${_rtdbKey(docId)}.json?auth=${FIREBASE_CONFIG.apiKey}`;
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });
    return r.ok;
  } catch(e) { return false; }
}

async function fbGetAll(col) {
  if (!_rtdbReady()) return [];
  try {
    const url = `${FIREBASE_CONFIG.rtdbUrl}/${col}.json?auth=${FIREBASE_CONFIG.apiKey}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    if (!data) return [];
    return Object.values(data);
  } catch(e) { return []; }
}

async function fbDelete(col, docId) {
  if (!_rtdbReady()) return false;
  try {
    const url = `${FIREBASE_CONFIG.rtdbUrl}/${col}/${_rtdbKey(docId)}.json?auth=${FIREBASE_CONFIG.apiKey}`;
    const r = await fetch(url, { method: 'DELETE' });
    return r.ok;
  } catch(e) { return false; }
}

async function fbFindByPhone(phone) {
  if (!_rtdbReady() || !phone) return null;
  try {
    // RTDB doesn't support queries without indexing — fetch all and filter
    const all = await fbGetAll('users');
    return all.find(u => u.phone === phone) || null;
  } catch(e) { return null; }
}

// Compatibility shims (pingin-firebase.js calls these)
async function initFirebase() { return _rtdbReady(); }
const _db = null;
const _fbReady = false;
const _fbFailed = false;
