const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Data directory ──────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ── JSON file store ─────────────────────────────────────────────────────────
// Each "table" is a single JSON file: tasks.json, biz.json, settings.json
// Tasks use auto-increment integer IDs; biz + settings use string IDs.

function storePath(name) {
  return path.join(dataDir, `${name}.json`);
}

function readStore(name) {
  const p = storePath(name);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return []; }
}

function writeStore(name, arr) {
  fs.writeFileSync(storePath(name), JSON.stringify(arr, null, 2));
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map(r => r.id || 0)) + 1 : 1;
}

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '4mb' }));

// ── Basic password protection (set DASHBOARD_PASS env var to enable) ─────────
const PASS = process.env.DASHBOARD_PASS;
if (PASS) {
  app.use((req, res, next) => {
    // Allow health check without auth
    if (req.path === '/api/health') return next();
    // Check Authorization header (Bearer token) or ?pass= query param
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.pass;
    if (token === PASS) return next();
    // No valid token — serve login page
    if (req.path === '/login' || req.path === '/login.html') return next();
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.send(`<!DOCTYPE html><html><head><title>Command Dashboard</title>
<style>body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui}
.box{background:#111;border:1px solid #222;border-radius:12px;padding:40px;width:320px;text-align:center}
h2{color:#fff;margin:0 0 8px}p{color:#666;margin:0 0 24px;font-size:14px}
input{width:100%;box-sizing:border-box;padding:12px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#fff;font-size:16px;margin-bottom:16px}
button{width:100%;padding:12px;background:#4f8ef7;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;font-weight:600}
button:hover{background:#3d7ef6}.err{color:#f74f4f;font-size:13px;margin-top:12px;display:none}</style></head>
<body><div class="box"><h2>Command Dashboard</h2><p>Private Operations Center</p>
<input type="password" id="p" placeholder="Password" onkeydown="if(event.key==='Enter')go()">
<button onclick="go()">Enter</button><div class="err" id="e">Wrong password</div></div>
<script>function go(){const p=document.getElementById('p').value;
fetch('/api/health',{headers:{'Authorization':'Bearer '+p}}).then(r=>{
if(r.ok){document.cookie='dp='+p+';path=/;max-age=2592000';location.href='/?pass='+p;}
else{document.getElementById('e').style.display='block';}});}</script></body></html>`);
    }
    res.status(401).json({ error: 'Unauthorized' });
  });
}

app.use(express.static(path.join(__dirname, 'public')));

// ── TASKS ───────────────────────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  res.json(readStore('tasks'));
});

app.get('/api/tasks/:id', (req, res) => {
  const tasks = readStore('tasks');
  const row = tasks.find(r => String(r.id) === req.params.id);
  row ? res.json(row) : res.status(404).json(null);
});

app.post('/api/tasks', (req, res) => {
  const tasks = readStore('tasks');
  const obj   = { ...req.body, id: nextId(tasks) };
  tasks.push(obj);
  writeStore('tasks', tasks);
  res.json({ id: obj.id });
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readStore('tasks');
  const idx   = tasks.findIndex(r => String(r.id) === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false });
  tasks[idx] = { ...req.body, id: parseInt(req.params.id) };
  writeStore('tasks', tasks);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readStore('tasks').filter(r => String(r.id) !== req.params.id);
  writeStore('tasks', tasks);
  res.json({ ok: true });
});

// ── BIZ ──────────────────────────────────────────────────────────────────────
app.get('/api/biz', (req, res) => {
  res.json(readStore('biz'));
});

app.get('/api/biz/:id', (req, res) => {
  const rows = readStore('biz');
  const row  = rows.find(r => r.id === decodeURIComponent(req.params.id));
  row ? res.json(row) : res.status(404).json(null);
});

app.put('/api/biz/:id', (req, res) => {
  const rows = readStore('biz');
  const id   = decodeURIComponent(req.params.id);
  const idx  = rows.findIndex(r => r.id === id);
  if (idx === -1) rows.push({ ...req.body, id });
  else rows[idx] = { ...req.body, id };
  writeStore('biz', rows);
  res.json({ ok: true });
});

// ── SETTINGS ─────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(readStore('settings'));
});

app.get('/api/settings/:id', (req, res) => {
  const rows = readStore('settings');
  const row  = rows.find(r => r.id === decodeURIComponent(req.params.id));
  row ? res.json(row) : res.status(404).json(null);
});

app.put('/api/settings/:id', (req, res) => {
  const rows = readStore('settings');
  const id   = decodeURIComponent(req.params.id);
  const idx  = rows.findIndex(r => r.id === id);
  if (idx === -1) rows.push({ ...req.body, id });
  else rows[idx] = { ...req.body, id };
  writeStore('settings', rows);
  res.json({ ok: true });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    tasks:     readStore('tasks').length,
    timestamp: new Date().toISOString(),
  });
});

// ── Backup — download everything as JSON ─────────────────────────────────────
app.get('/api/backup', (req, res) => {
  const backup = {
    tasks:    readStore('tasks'),
    biz:      readStore('biz'),
    settings: readStore('settings'),
    exported: new Date().toISOString(),
  };
  res.setHeader('Content-Disposition', `attachment; filename="command-backup-${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(backup);
});

// ── Restore — upload backup JSON ─────────────────────────────────────────────
app.post('/api/restore', (req, res) => {
  const { tasks, biz, settings } = req.body;
  if (tasks)    writeStore('tasks',    tasks);
  if (biz)      writeStore('biz',      biz);
  if (settings) writeStore('settings', settings);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n  ┌─────────────────────────────────────────────┐');
  console.log(`  │  Command Dashboard  →  http://localhost:${PORT}   │`);
  console.log('  │  $150K target · 120-day plan · 16 streams   │');
  console.log('  │  Data saved in: ./data/  (tasks/biz/settings)│');
  console.log('  └─────────────────────────────────────────────┘\n');
  console.log('  Backup anytime:  http://localhost:'+PORT+'/api/backup\n');
});
