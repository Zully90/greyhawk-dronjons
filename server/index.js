// Minimal realtime backend
// - Express REST API for sessions
// - WebSocket server for realtime broadcasts
// - lowdb JSON persistence (db.json)
// - Optional admin token (ADMIN_TOKEN)
// - Optional Google OAuth for owner identification (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const PORT = process.env.PORT || 3000;

// DB setup
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

async function initDB(){
  await db.read();
  db.data = db.data || { sessions: {} };
  await db.write();
}

function getSession(id){
  const sessions = db.data.sessions;
  if(!sessions[id]){
    sessions[id] = {
      id,
      state: { sospiri: 0, des: 4, livello: 5 },
      assignments: {},
      meta: { createdAt: Date.now(), updatedAt: Date.now() }
    };
  }
  return sessions[id];
}

// Passport / Google OAuth (optional)
if(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET){
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  }, (accessToken, refreshToken, profile, cb) => {
    // profile contains id, displayName, emails
    return cb(null, profile);
  }));

  passport.serializeUser((user, done) => { done(null, user); });
  passport.deserializeUser((obj, done) => { done(null, obj); });
}

// App
const app = express();
app.use(cors());
app.use(bodyParser.json());

if(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET){
  const session = require('express-session');
  app.use(session({ secret: process.env.SESSION_SECRET || 'keyboard cat', resave: false, saveUninitialized: true }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile','email'] }));
  app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    // successful auth
    res.redirect('/');
  });

  app.get('/auth/me', (req, res) => {
    if(req.user) return res.json({ user: { id: req.user.id, name: req.user.displayName, emails: req.user.emails } });
    return res.json({ user: null });
  });
}

// helper: check admin
function isAdmin(req){
  const h = req.headers['authorization'];
  if(!h) return false;
  const parts = h.split(' ');
  if(parts.length!==2) return false;
  return parts[1] === ADMIN_TOKEN;
}

// REST API
app.get('/api/session/:id', async (req, res) => {
  await db.read();
  const s = getSession(req.params.id);
  res.json({ ok: true, session: s });
});

app.post('/api/session/:id', async (req, res) => {
  await db.read();
  const s = getSession(req.params.id);
  const partial = req.body.state || req.body;
  s.state = Object.assign({}, s.state, partial);
  s.meta.updatedAt = Date.now();
  await db.write();
  broadcastSession(s.id, s);
  res.json({ ok: true, session: s });
});

// claim a page: assigns assignments[pageKey] = { clientId, name }
app.post('/api/session/:id/claim', async (req, res) => {
  await db.read();
  const s = getSession(req.params.id);
  const page = req.query.page;
  const name = (req.body && req.body.name) || ('player-' + nanoid(6));
  if(!page) return res.status(400).json({ error: 'page required' });
  s.assignments = s.assignments || {};
  if(!s.assignments[page]){
    s.assignments[page] = { clientId: nanoid(8), name };
    s.meta.updatedAt = Date.now();
    await db.write();
    broadcastSession(s.id, s);
  }
  res.json({ ok: true, assignment: s.assignments[page], session: s });
});

// admin endpoints
app.get('/api/sessions', async (req, res) => {
  if(!isAdmin(req)) return res.status(403).json({ error: 'admin required' });
  await db.read();
  res.json({ ok: true, sessions: db.data.sessions });
});

app.post('/api/session/:id/assign', async (req, res) => {
  if(!isAdmin(req)) return res.status(403).json({ error: 'admin required' });
  await db.read();
  const s = getSession(req.params.id);
  const { page, uid, name } = req.body;
  if(!page || !uid) return res.status(400).json({ error: 'page and uid required' });
  s.assignments = s.assignments || {};
  s.assignments[page] = { clientId: uid, name: name || ('player-'+uid) };
  s.meta.updatedAt = Date.now();
  await db.write();
  broadcastSession(s.id, s);
  res.json({ ok: true, session: s });
});

// start server + ws
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const sessionsClients = {}; // map sessionId -> Set(ws)

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session');
    if(!sessionId){ ws.close(); return; }
    sessionsClients[sessionId] = sessionsClients[sessionId] || new Set();
    sessionsClients[sessionId].add(ws);
    ws.on('close', ()=> sessionsClients[sessionId].delete(ws));
  } catch(e){ ws.close(); }
});

function broadcastSession(sessionId, sessionObj){
  const set = sessionsClients[sessionId];
  if(!set) return;
  const payload = JSON.stringify({ type: 'session', session: sessionObj });
  for(const ws of set) if(ws.readyState === WebSocket.OPEN) ws.send(payload);
}

(async ()=>{
  await initDB();
  server.listen(PORT, ()=> console.log('server listening on', PORT));
})();
