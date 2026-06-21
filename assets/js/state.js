/* common state module: uses Firebase if window.FIREBASE_CONFIG is present, otherwise localStorage + BroadcastChannel fallback */
const STORAGE_KEY = 'artiglio:session:v1';
const CHANNEL_NAME = 'artiglio:channel';

let internalState = { sessionId: 'default', state: { sospiri: 0, des: 4, livello: 5 } };
let listeners = new Set();
let fbUnsubscribe = null;
let useFirebase = false;
let firebaseApp = null;
let firestore = null;
let auth = null;

async function initFirebaseIfNeeded(sessionId) {
  if (!window.FIREBASE_CONFIG) return false;
  if (useFirebase && firebaseApp) return true;
  try {
    // dynamic ESM imports from Firebase CDN
    const [{ initializeApp }, { getFirestore, doc, onSnapshot, setDoc, updateDoc, serverTimestamp }, { getAuth, signInAnonymously }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/9.24.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/9.24.0/firebase-auth.js')
    ]);
    firebaseApp = initializeApp(window.FIREBASE_CONFIG);
    firestore = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    await signInAnonymously(auth);
    useFirebase = true;
    // subscribe to session doc
    const ref = doc(firestore, 'sessions', sessionId);
    fbUnsubscribe = onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      // expect data.state
      const s = data.state || {};
      internalState = { sessionId, state: { ...internalState.state, ...s } };
      notify();
    });
    return true;
  } catch (e) {
    console.warn('Firebase init failed, falling back to local:', e);
    useFirebase = false;
    return false;
  }
}

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY + ':' + internalState.sessionId, JSON.stringify(internalState.state));
  } catch (e) {}
  // broadcast
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME + ':' + internalState.sessionId);
      bc.postMessage(internalState.state);
      bc.close();
    } catch (e) {}
  } else {
    // fallback: use storage event
    try {
      localStorage.setItem(STORAGE_KEY + ':_signal', Date.now().toString());
    } catch (e) {}
  }
}

function loadLocal(sessionId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + ':' + sessionId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function notify() {
  for (const cb of listeners) cb(JSON.parse(JSON.stringify(internalState.state)));
}

// public API
export async function openSession(sessionId = 'default') {
  internalState.sessionId = sessionId;
  // try firebase
  const fb = await initFirebaseIfNeeded(sessionId);
  if (!fb) {
    // load local
    const local = loadLocal(sessionId);
    if (local) internalState.state = { ...internalState.state, ...local };
    // subscribe to BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(CHANNEL_NAME + ':' + sessionId);
      bc.onmessage = (ev) => {
        internalState.state = { ...internalState.state, ...ev.data };
        notify();
      };
    } else {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY + ':_signal') {
          const local = loadLocal(sessionId);
          if (local) { internalState.state = { ...internalState.state, ...local }; notify(); }
        }
      });
    }
  }
  // notify initial
  notify();
}

export function getState() { return JSON.parse(JSON.stringify(internalState.state)); }

export async function setState(partial) {
  internalState.state = { ...internalState.state, ...partial };
  // push to firebase if available
  if (useFirebase && firestore) {
    try {
      const { getFirestore, doc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore.js');
      const ref = doc(firestore, 'sessions', internalState.sessionId);
      await updateDoc(ref, { state: internalState.state, 'meta.updatedAt': serverTimestamp() }).catch(async (err) => {
        // if update fails, try setDoc merge
        await setDoc(ref, { state: internalState.state, meta: { updatedAt: new Date() } }, { merge: true });
      });
    } catch (e) {
      console.warn('Firebase write failed, persisting locally', e);
      persistLocal();
    }
  } else {
    persistLocal();
  }
  notify();
}

export function subscribe(cb) { listeners.add(cb); cb(getState()); return () => listeners.delete(cb); }

export async function clearSession() {
  internalState.state = { sospiri: 0, des: 4, livello: 1 };
  await setState(internalState.state);
}
