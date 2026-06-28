/* ============================================================================
   Grimorio di Sessione — stato condiviso per gli strumenti della campagna.
   Script CLASSICO (non module): espone window.Grimorio, così gli onclick inline
   delle pagine continuano a funzionare. Path d'inclusione SEMPRE relativo
   (assets/core.js), mai assoluto, per non rompere GitHub Pages.

   - Fonte di verità unica: localStorage chiave `greyhawk:v1:<sessione>`
   - Sync same-device live: BroadcastChannel + evento `storage`
   - Sync cross-device live: Firebase Firestore (opzionale, Fase 4)
   - Permessi asimmetrici: lo scope decide cosa una pagina legge/scrive.
       'artiglio' → solo slice artiglio
       'ruth'     → slice ruth + Grimorio.faro() (sola lettura del Faro)
       'dm'       → tutto (orchestratore)
   ============================================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'greyhawk:v1';
  var CHANNEL = 'greyhawk:channel';
  var SESSION = (function () {
    try { return new URLSearchParams(location.search).get('session') || 'dronjons'; }
    catch (e) { return 'dronjons'; }
  })();

  // id univoco di questa scheda/dispositivo: distingue le nostre scritture da quelle altrui
  var CLIENT = Math.random().toString(36).slice(2) + Date.now().toString(36);

  function defaults() {
    return {
      artiglio: { sospiri: 0, des: 4, livello: 5 },
      ruth: { grazie: 0, condanne: 0, cicatrici: 0, livello: 8, sag: 4, runaAttiva: 'grigia' },
      meta: { updatedAt: 0, sessione: SESSION, writer: '' }
    };
  }

  var state = defaults();
  var listeners = [];
  var bc = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v, d) { return (v === undefined || v === null || isNaN(+v)) ? d : +v; }
  function keyFor() { return STORAGE_KEY + ':' + SESSION; }

  function mergeInto(target, src) {
    if (!src) return;
    ['artiglio', 'ruth', 'meta'].forEach(function (k) {
      if (src[k] && typeof src[k] === 'object') {
        for (var p in src[k]) { if (src[k].hasOwnProperty(p)) target[k][p] = src[k][p]; }
      }
    });
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(keyFor());
      if (raw) { mergeInto(state, JSON.parse(raw)); return true; }
    } catch (e) {}
    return false;
  }

  /* Migrazione retro-compatibile dalle vecchie chiavi separate. */
  function migrateLegacy() {
    var changed = false;
    try {
      var a = JSON.parse(localStorage.getItem('artiglio') || 'null');
      if (a) {
        state.artiglio.sospiri = num(a.sospiri, state.artiglio.sospiri);
        state.artiglio.des = num(a.des, state.artiglio.des);
        state.artiglio.livello = num(a.livello, state.artiglio.livello);
        changed = true;
      }
    } catch (e) {}
    try {
      var r = JSON.parse(localStorage.getItem('ruth') || 'null');
      if (r) {
        state.ruth.grazie = num(r.grazie, state.ruth.grazie);
        state.ruth.condanne = num(r.condanne, state.ruth.condanne);
        state.ruth.cicatrici = num(r.cicatrici, state.ruth.cicatrici);
        state.ruth.livello = num(r.livello, state.ruth.livello);
        state.ruth.sag = num(r.sag, state.ruth.sag);
        if (r.runaAttiva) state.ruth.runaAttiva = r.runaAttiva;
        changed = true;
      }
    } catch (e) {}
    return changed;
  }

  function persistLocal() {
    try { localStorage.setItem(keyFor(), JSON.stringify(state)); } catch (e) {}
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (e) {}
    }
  }

  /* Cambi ESTERNI (altra tab / altro device): aggiorna e notifica i listener. */
  function ingestExternal(incoming) {
    if (!incoming) return;
    mergeInto(state, incoming);
    notify();
  }

  /* ---- Faro: unica finestra che Ruth ha sull'Artiglio ---- */
  var FARO = [
    { idx: 0, lbl: 'Faro Silente', col: '#6a6762' },
    { idx: 1, lbl: 'Faro Tepore', col: '#7ab8f0' },
    { idx: 2, lbl: 'Faro Pulsante', col: '#f5c06a' },
    { idx: 3, lbl: 'Faro Ardente', col: '#f09595' }
  ];
  function faroIdx(s) { s = num(s, 0); return s === 0 ? 0 : s <= 2 ? 1 : s <= 4 ? 2 : 3; }
  function faroState() { return FARO[faroIdx(state.artiglio.sospiri)]; }

  /* ---- Motore CD dinamico (usato dalla Fase 3) ----
     Base di livello + modulazione per stato dell'arma. */
  var cd = {
    cdLiv: function (L) { return 14 + num(L, 1); },
    faroIdx: faroIdx,
    catturaMorte: function (L, f) { return this.cdLiv(L) + num(f, 0) - 2; },
    catturaAttiva: function (L, f) { return this.cdLiv(L) + num(f, 0) + 2; },
    faro: function (f) { return 14 + num(f, 0) * 2; },        // drawback Artiglio (Corruzione, Identità, Gregge)
    guanto: function (L, f) { return this.cdLiv(L) + num(f, 0); }, // nemici vs Artiglio (scala con livello+faro)
    inCondanna: function (sbil) { return 14 + Math.min(num(sbil, 0), 6); },
    ancorare: function (L, cic) { return this.cdLiv(L) + (num(cic, 0) >= 3 ? 1 : 0); },
    protesta: function (f) { return 14 + num(f, 0); },
    /* Sostituisce i token {{cd...}} nel testo col valore corrente.
       ctx: { livello, faro, sbil, cic } */
    interpola: function (text, ctx) {
      if (text == null) return text;
      ctx = ctx || {};
      var L = num(ctx.livello, 1), f = num(ctx.faro, 0),
          sbil = num(ctx.sbil, 0), cic = num(ctx.cic, 0);
      var map = {
        cdLivello: this.cdLiv(L),
        cdCatturaMorte: this.catturaMorte(L, f),
        cdCatturaAttiva: this.catturaAttiva(L, f),
        cdFaro: this.faro(f),
        cdGuanto: this.guanto(L, f),
        cdInCondanna: this.inCondanna(sbil),
        cdAncorare: this.ancorare(L, cic),
        cdProtesta: this.protesta(f)
      };
      return String(text).replace(/\{\{(\w+)\}\}/g, function (m, k) {
        return map.hasOwnProperty(k) ? map[k] : m;
      });
    }
  };

  var Grimorio = {
    SESSION: SESSION,

    init: function (opts) {
      opts = opts || {};
      var hadUnified = loadLocal();
      if (!hadUnified) {
        if (migrateLegacy()) persistLocal();
      }
      if (typeof opts.onChange === 'function') listeners.push(opts.onChange);

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          bc = new BroadcastChannel(CHANNEL + ':' + SESSION);
          bc.onmessage = function (ev) {
            if (ev.data && ev.data.type === 'state') ingestExternal(ev.data.state);
          };
        } catch (e) { bc = null; }
      }

      window.addEventListener('storage', function (ev) {
        if (ev.key === keyFor() && ev.newValue) {
          try { ingestExternal(JSON.parse(ev.newValue)); } catch (e) {}
        }
      });

      /* Hook Fase 4: attiva Firestore se è presente una config. */
      if (window.FIREBASE_CONFIG && typeof Grimorio._initFirebase === 'function') {
        try { Grimorio._initFirebase(SESSION, state, ingestExternal); } catch (e) {}
      }
      return Grimorio;
    },

    get: function (slice) { return clone(state[slice]); },

    /* Scrive uno slice: persiste e propaga AGLI ALTRI (broadcast + firebase),
       ma NON richiama il listener locale — chi ha chiamato patch ha già
       aggiornato la propria UI. Questo evita ricorsione e ping-pong tra tab. */
    patch: function (slice, partial) {
      if (!state[slice] || !partial) return;
      for (var p in partial) { if (partial.hasOwnProperty(p)) state[slice][p] = partial[p]; }
      state.meta.updatedAt = Date.now();
      state.meta.writer = CLIENT; // marca la scrittura come nostra (per ignorarne l'eco)
      persistLocal();
      if (bc) { try { bc.postMessage({ type: 'state', state: state }); } catch (e) {} }
      if (typeof Grimorio._pushFirebase === 'function') {
        try { Grimorio._pushFirebase(state); } catch (e) {}
      }
    },

    faro: faroState,
    faroIdx: function () { return faroIdx(state.artiglio.sospiri); },
    subscribe: function (cb) { if (typeof cb === 'function') listeners.push(cb); },
    cd: cd
  };

  /* ---- Fase 4: sync cross-device via Firebase Firestore (opzionale) ----
     Attivo solo se la pagina definisce window.FIREBASE_CONFIG (caricando
     assets/js/firebase-config.js PRIMA di core.js). Import dinamico dalla CDN:
     nessun bundler. In caso di errore → fallback silenzioso a localStorage. */
  Grimorio._initFirebase = function (session, liveState, ingest) {
    Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]).then(function (mods) {
      var fbApp = mods[0], fs = mods[1], fbAuth = mods[2];
      var app = fbApp.initializeApp(window.FIREBASE_CONFIG);
      var db = fs.getFirestore(app);
      try { fbAuth.signInAnonymously(fbAuth.getAuth(app)); } catch (e) {}
      var ref = fs.doc(db, 'sessions', session);

      Grimorio._pushFirebase = function (s) {
        try { fs.setDoc(ref, { state: s }, { merge: true }); } catch (e) {}
      };

      fs.onSnapshot(ref, function (snap) {
        if (!snap.exists()) { Grimorio._pushFirebase(liveState); return; } // doc vuoto → seed con lo stato locale
        var data = snap.data();
        if (!data || !data.state) return;
        // ingerisci solo le scritture di ALTRI client; ignora l'eco delle nostre
        // (anche intermedie ancora in volo) — niente gare sui timestamp.
        if (data.state.meta && data.state.meta.writer === CLIENT) return;
        ingest(data.state);
      });
    }).catch(function (e) {
      console.warn('Firebase non attivo, sync solo locale:', e);
    });
  };

  window.Grimorio = Grimorio;
})();
