// ═══════════════════════════════════════════════════════════════════════════
// PingIN — Firebase Configuration
// Project: pingin-in (create at console.firebase.google.com)
// ═══════════════════════════════════════════════════════════════════════════
// SETUP INSTRUCTIONS (one-time):
// 1. Go to console.firebase.google.com
// 2. Create project "pingin-in"
// 3. Add Web app → copy the config values below
// 4. Enable Firestore Database (start in production mode)
// 5. Set these Firestore Security Rules:
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /users/{email} {
//          allow read, write: if true; // locked down by app logic + admin key
//        }
//        match /visitor_counts/{page} {
//          allow read, write: if true;
//        }
//      }
//    }
// ═══════════════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDf7EY6c4vuysukC7TJGRQ51GTQj_exL5w",
  authDomain:        "pingin-in.firebaseapp.com",
  projectId:         "pingin-in",
  storageBucket:     "pingin-in.appspot.com",
  messagingSenderId: "1010877641840",
  appId:             "1:1010877641840:web:b4a10767fc40fbeaab70b5"
};

// ── Firebase SDK (loaded via CDN in HTML) ──────────────────────────────────
// Import in HTML BEFORE this script:
// <script type="module">
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
//   import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// </script>

let _db = null;
let _firebaseReady = false;

async function initFirebase() {
  if (_firebaseReady) return true;
  try {
    const { initializeApp }   = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore }    = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = initializeApp(FIREBASE_CONFIG);
    _db = getFirestore(app);
    _firebaseReady = true;
    console.log('[PingIN] Firebase ready ✓');
    return true;
  } catch(e) {
    console.warn('[PingIN] Firebase init failed — using localStorage fallback', e);
    return false;
  }
}

async function fbGet(collection_name, docId) {
  if (!_db) return null;
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(_db, collection_name, docId));
    return snap.exists() ? snap.data() : null;
  } catch(e) { return null; }
}

async function fbSet(collection_name, docId, data) {
  if (!_db) return false;
  try {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(_db, collection_name, docId), data, { merge: true });
    return true;
  } catch(e) { return false; }
}

async function fbGetAll(collection_name) {
  if (!_db) return [];
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(collection(_db, collection_name));
    return snap.docs.map(d => d.data());
  } catch(e) { return []; }
}

async function fbFindByPhone(phone) {
  if (!_db || !phone) return null;
  try {
    const { collection, getDocs, query, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(collection(_db, 'users'), where('phone', '==', phone));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  } catch(e) { return null; }
}
