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
      // patto: Patto del Teschio (sessione 88) — Rui conta +1 Sospiro ai soli
      //        fini del Faro. vistaUsata: cooldown di "Vista condivisa" (1/giorno).
      artiglio: { sospiri: 0, des: 4, livello: 5, patto: true, vistaUsata: false },
      // richiamo: "ciò che dorme sotto il tempio" (0–3, leva DM per luogo).
      // bisaccia: contenitore di Vecna intatto → Argine 4; se cede → Argine 2.
      ruth: { grazie: 0, condanne: 0, cicatrici: 0, livello: 8, sag: 4, runaAttiva: 'grigia', richiamo: 0, bisaccia: true },
      meta: { updatedAt: 0, sessione: SESSION, writer: '' }
    };
  }

  var state = defaults();
  var listeners = [];
  var bc = null;

  /* Permessi per scope: rende reale (non solo convenzionale) il muro asimmetrico.
     L'Artiglio non può leggere lo slice 'ruth' nemmeno per errore di codice.
     N.B. resta enforcement client-side: vedi README per i limiti con Firebase. */
  var SCOPE_PERMS = {
    artiglio: { read: ['artiglio'], write: ['artiglio'] },
    ruth: { read: ['ruth'], write: ['ruth'] },
    dm: { read: ['artiglio', 'ruth', 'meta'], write: ['artiglio', 'ruth', 'meta'] }
  };
  var myScope = 'dm';
  function can(action, slice) {
    var perms = SCOPE_PERMS[myScope] || SCOPE_PERMS.dm;
    return perms[action].indexOf(slice) !== -1;
  }

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

  /* Timestamp strettamente monotòno per-tab: garantisce che scritture multiple
     nello stesso millisecondo (es. le più azioni di una Risonanza) restino
     ordinabili, così la guardia anti-eco-stale non scarta aggiornamenti validi. */
  function nextStamp() {
    var t = Date.now();
    return (t <= state.meta.updatedAt) ? state.meta.updatedAt + 1 : t;
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (e) {}
    }
  }

  /* Cambi ESTERNI (altra tab / altro device): aggiorna, PERSISTI e notifica.
     guardStale: sui canali same-device (BroadcastChannel + storage) ignora le eco
     NON più recenti del nostro stato. Serve quando un'azione fa più scritture
     ravvicinate (es. Risonanza): senza guardia, un'eco intermedia più vecchia
     — che trasporta l'intero stato — può arrivare in ritardo e sovrascrivere i
     campi già aggiornati. Non applicata a Firebase per non cadere su clock skew. */
  function ingestExternal(incoming, opts) {
    if (!incoming) return;
    if (opts && opts.guardStale && incoming.meta &&
        typeof incoming.meta.updatedAt === 'number' &&
        incoming.meta.updatedAt <= state.meta.updatedAt) return;
    mergeInto(state, incoming);
    persistLocal(); // così un reload non torna a uno stato vecchio prima del prossimo snapshot
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
  // Patto del Teschio (sessione 88): finché è attivo, Rui vale +1 Sospiro ai soli
  // fini del Faro. Il conteggio reale dei Sospiri non cambia (overflow, catture,
  // azioni rapide restano sui Sospiri veri) — solo la soglia del Faro sale di 1.
  function pattoAttivo() {
    return !!(state.artiglio && state.artiglio.patto);
  }
  function faroSospiri() {
    return num(state.artiglio && state.artiglio.sospiri, 0) + (pattoAttivo() ? 1 : 0);
  }
  // Bump planare temporaneo (Dono della Pietà di Ruth): alza di 1 stato il Faro
  // finché dura. Best-effort senza DM: scade da solo al prossimo render/evento.
  function bumpAttivo() {
    var b = state.artiglio && state.artiglio.faroBump;
    return !!(b && b.until && Date.now() < b.until);
  }
  function faroIdxEff() {
    var base = faroIdx(faroSospiri());
    return bumpAttivo() ? Math.min(3, base + 1) : base;
  }
  function faroState() { return FARO[faroIdxEff()]; }

  /* ---- Vuoto di Rui (sessione 88) ----
     Valore DERIVATO dallo slice ruth, nessun contatore da gestire a mano:
       Vuoto  = max(0, Condanne + Cicatrici + Richiamo − Grazie)
       Argine = bisaccia intatta ? 4 : 2   (Argine di Wee Jas)
     La misericordia lo trattiene; condanne, cicatrici e "ciò che dorme sotto il
     tempio" lo scavano. NUMERI PROVVISORI — da tarare (backlog in CLAUDE.md). */
  var VUOTO = [
    { idx: 0, lbl: 'Quiescente', col: '#6a6762' },
    { idx: 1, lbl: 'Sommesso', col: '#b08fd8' },
    { idx: 2, lbl: 'Teso', col: '#f5c06a' },
    { idx: 3, lbl: 'Breccia', col: '#f09595' }
  ];
  function vuotoVal() {
    var r = state.ruth;
    var v = num(r.condanne, 0) + num(r.cicatrici, 0) + num(r.richiamo, 0) - num(r.grazie, 0);
    return v < 0 ? 0 : v;
  }
  function vuotoArgine() { return state.ruth.bisaccia === false ? 2 : 4; }
  function vuotoIdx() {
    var v = vuotoVal(), a = vuotoArgine();
    if (v <= 0) return 0;   // Quiescente
    if (v < a) return 1;    // Sommesso
    if (v === a) return 2;  // Teso
    return 3;               // Breccia
  }
  function vuotoSev() { return Math.max(0, vuotoVal() - vuotoArgine()); }

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
    vuoto: function (L, sev) { return this.cdLiv(L) + num(sev, 0); }, // Breccia del Vuoto (provvisoria)
    /* Sostituisce i token {{cd...}} nel testo col valore corrente.
       ctx: { livello, faro, sbil, cic } */
    interpola: function (text, ctx) {
      if (text == null) return text;
      ctx = ctx || {};
      var L = num(ctx.livello, 1), f = num(ctx.faro, 0),
          sbil = num(ctx.sbil, 0), cic = num(ctx.cic, 0),
          vsev = num(ctx.vuotoSev, 0);
      var map = {
        cdLivello: this.cdLiv(L),
        cdCatturaMorte: this.catturaMorte(L, f),
        cdCatturaAttiva: this.catturaAttiva(L, f),
        cdFaro: this.faro(f),
        cdGuanto: this.guanto(L, f),
        cdInCondanna: this.inCondanna(sbil),
        cdAncorare: this.ancorare(L, cic),
        cdProtesta: this.protesta(f),
        cdVuoto: this.vuoto(L, vsev)
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
      myScope = SCOPE_PERMS[opts.scope] ? opts.scope : 'dm';
      var hadUnified = loadLocal();
      if (!hadUnified) {
        if (migrateLegacy()) persistLocal();
      }
      if (typeof opts.onChange === 'function') listeners.push(opts.onChange);

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          bc = new BroadcastChannel(CHANNEL + ':' + SESSION);
          bc.onmessage = function (ev) {
            if (ev.data && ev.data.type === 'state') ingestExternal(ev.data.state, { guardStale: true });
          };
        } catch (e) { bc = null; }
      }

      window.addEventListener('storage', function (ev) {
        if (ev.key === keyFor() && ev.newValue) {
          try { ingestExternal(JSON.parse(ev.newValue), { guardStale: true }); } catch (e) {}
        }
      });

      /* Hook Fase 4: attiva Firestore se è presente una config. */
      if (window.FIREBASE_CONFIG && typeof Grimorio._initFirebase === 'function') {
        try { Grimorio._initFirebase(SESSION, state, ingestExternal); } catch (e) {}
      }
      return Grimorio;
    },

    get: function (slice) {
      if (!can('read', slice) || !state[slice]) return null;
      return clone(state[slice]);
    },

    /* Scrive uno slice: persiste e propaga AGLI ALTRI (broadcast + firebase),
       ma NON richiama il listener locale — chi ha chiamato patch ha già
       aggiornato la propria UI. Questo evita ricorsione e ping-pong tra tab. */
    patch: function (slice, partial) {
      if (!can('write', slice) || !state[slice] || !partial) return;
      for (var p in partial) { if (partial.hasOwnProperty(p)) state[slice][p] = partial[p]; }
      state.meta.updatedAt = nextStamp();
      state.meta.writer = CLIENT; // marca la scrittura come nostra (per ignorarne l'eco)
      persistLocal();
      if (bc) { try { bc.postMessage({ type: 'state', state: state }); } catch (e) {} }
      if (typeof Grimorio._pushFirebase === 'function') {
        try { Grimorio._pushFirebase(state); } catch (e) {}
      }
    },

    /* ---- Risonanza Arco→Artiglio (senza DM, mistero preservato) ----
       core.js è il mediatore fidato: muta l'Artiglio DALL'INTERNO (aggira gli
       scope di proposito, come il motore cd) e deposita un'`eco` nello slice
       artiglio. Dronjons legge solo il proprio slice → vede l'effetto, mai la
       causa. Ritorna il solo bit { risuonato } verso Ruth (ricompensa Grazia);
       non espone MAI i numeri dell'Artiglio. Invocabile solo da ruth/dm. */
    risonanza: function (evento) {
      if (myScope !== 'ruth' && myScope !== 'dm') return { risuonato: false };
      var a = state.artiglio;
      var ts = nextStamp();
      var out = { risuonato: false };
      if (evento === 'morte-spirito') {
        if (num(a.sospiri, 0) > 0) { a.sospiri = a.sospiri - 1; out.risuonato = true; }
        a.eco = { k: 'sospiro-svanito', nonce: ts, ts: ts };
      } else if (evento === 'protesta') {
        a.turbato = true;
        a.eco = { k: 'protesta', nonce: ts, ts: ts };
      } else if (evento === 'sacrificio') {
        a.faroBump = { until: Date.now() + 3600000 }; // +1 stato Faro per 1 ora
        a.eco = { k: 'faro-arde', nonce: ts, ts: ts };
      } else {
        return out;
      }
      state.meta.updatedAt = ts;
      state.meta.writer = CLIENT;
      persistLocal();
      if (bc) { try { bc.postMessage({ type: 'state', state: state }); } catch (e) {} }
      if (typeof Grimorio._pushFirebase === 'function') {
        try { Grimorio._pushFirebase(state); } catch (e) {}
      }
      return out;
    },

    /* ---- Vuoto di Rui → Artiglio (mediatore fidato, come risonanza) ----
       Ruth lo invoca dopo ogni render. Rivaluta lo stato del Vuoto e lo riversa
       sull'Artiglio SENZA esporre la causa:
         Teso/Breccia → faroBump (Faro +1 stato, rinfrescato finché dura)
         Breccia      → artiglio.congiunzione = { sev } (letto da spawn.html)
         salita in Teso/Breccia → eco 'vuoto' a Dronjons (una volta per salita)
       Scrive solo quando qualcosa cambia; non ritorna dati dell'Artiglio. */
    vuotoSync: function () {
      if (myScope !== 'ruth' && myScope !== 'dm') return;
      var a = state.artiglio;
      var idx = vuotoIdx();
      var prev = num(a.vuotoStato, 0);
      var ts = nextStamp();
      var changed = false;
      if (idx >= 2) {
        var b = a.faroBump;
        // rinfresca solo se scade entro 50 min: evita scritture a ogni render
        if (!b || !b.until || b.until - Date.now() < 3000000) {
          a.faroBump = { until: Date.now() + 3600000 };
          changed = true;
        }
      }
      if (idx === 3) {
        var sev = vuotoSev();
        if (!a.congiunzione || a.congiunzione.sev !== sev) {
          a.congiunzione = { sev: sev, ts: ts };
          changed = true;
        }
      } else if (a.congiunzione) {
        delete a.congiunzione;
        changed = true;
      }
      if (idx >= 2 && idx > prev) {
        a.eco = { k: 'vuoto', nonce: ts, ts: ts };
        changed = true;
      }
      if (idx !== prev) { a.vuotoStato = idx; changed = true; }
      if (!changed) return;
      state.meta.updatedAt = ts;
      state.meta.writer = CLIENT;
      persistLocal();
      if (bc) { try { bc.postMessage({ type: 'state', state: state }); } catch (e) {} }
      if (typeof Grimorio._pushFirebase === 'function') {
        try { Grimorio._pushFirebase(state); } catch (e) {}
      }
    },

    /* Letture del Vuoto: solo ruth/dm. Lo scope artiglio vede sempre "Quiescente"
       (il muro asimmetrico resta reale anche per errore di codice). */
    vuoto: {
      val: function () { return myScope === 'artiglio' ? 0 : vuotoVal(); },
      argine: function () { return myScope === 'artiglio' ? 0 : vuotoArgine(); },
      sev: function () { return myScope === 'artiglio' ? 0 : vuotoSev(); },
      idx: function () { return myScope === 'artiglio' ? 0 : vuotoIdx(); },
      stato: function () { return VUOTO[myScope === 'artiglio' ? 0 : vuotoIdx()]; }
    },

    faro: faroState,
    faroIdx: function () { return faroIdxEff(); },
    patto: pattoAttivo,          // Patto del Teschio attivo?
    faroSospiri: faroSospiri,    // Sospiri reali + 1 se Patto attivo (valore del Faro)
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
