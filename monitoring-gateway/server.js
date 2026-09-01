'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const STORAGE_ROOT = path.resolve(process.env.MONITORING_STORAGE_ROOT || process.env.STORAGE_ROOT || '/data');
const API_TOKEN = String(process.env.MONITORING_API_TOKEN || process.env.API_TOKEN || '').trim();
const MAX_BODY_MB = Number(process.env.MONITORING_MAX_BODY_MB || process.env.MAX_BODY_MB || 12);
const TIMEZONE = String(process.env.MONITORING_TIMEZONE || process.env.TZ || 'Asia/Jakarta').trim();
const LOCAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

if (String(process.env.TRUST_PROXY || '') === '1') app.set('trust proxy', 1);
if (API_TOKEN.length < 32) throw new Error('API_TOKEN wajib diisi minimal 32 karakter.');
fs.mkdirSync(STORAGE_ROOT, { recursive: true });

app.use(helmet());
app.use(express.json({ limit: `${MAX_BODY_MB}mb` }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

function auth(req, res, next) {
  const supplied = String(req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const expected = Buffer.from(API_TOKEN);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  next();
}

function safeSegment(value, fallback) {
  const clean = String(value || '').normalize('NFKC')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/\.\.+/g, '.')
    .replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').slice(0, 120);
  return clean || fallback;
}

function safeResolve(...segments) {
  const target = path.resolve(STORAGE_ROOT, ...segments);
  if (target !== STORAGE_ROOT && !target.startsWith(STORAGE_ROOT + path.sep)) throw new Error('Path tidak valid.');
  return target;
}

function localDateParts(date) {
  const parts = {};
  for (const part of LOCAL_DATE_FORMATTER.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    stamp: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}-${parts.minute}-${parts.second}`
  };
}

async function writeAtomic(target, content) {
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await fs.promises.writeFile(temporary, content);
  await fs.promises.rename(temporary, target);
}

function decodeBase64(value, maxBytes = 7 * 1024 * 1024) {
  const buffer = Buffer.from(String(value || ''), 'base64');
  if (!buffer.length || buffer.length > maxBytes) throw new Error('Ukuran evidence tidak valid.');
  return buffer;
}

async function verifyStorageWritable() {
  const probe = safeResolve(`.health-${process.pid}-${Date.now()}`);
  await fs.promises.writeFile(probe, 'ok');
  await fs.promises.unlink(probe);
}

app.get('/health', async (req, res) => {
  try {
    await verifyStorageWritable();
    res.json({
      ok: true,
      service: 'Monitoring Kebersihan NAS Gateway',
      version: '3.1.0',
      storageWritable: true,
      databaseMode: 'SPREADSHEET',
      timezone: TIMEZONE
    });
  } catch (error) {
    res.status(500).json({ ok: false, storageWritable: false, databaseMode: 'SPREADSHEET', message: error.message });
  }
});

app.get('/api/kebersihan/status', auth, async (req, res) => {
  try {
    await verifyStorageWritable();
    const stats = typeof fs.promises.statfs === 'function' ? await fs.promises.statfs(STORAGE_ROOT) : null;
    res.json({
      ok: true,
      storageWritable: true,
      storageRoot: STORAGE_ROOT,
      totalBytes: stats ? Number(stats.blocks) * Number(stats.bsize) : 0,
      availableBytes: stats ? Number(stats.bavail) * Number(stats.bsize) : 0,
      databaseMode: 'SPREADSHEET',
      evidenceEnabled: true,
      sheetBackupEnabled: true,
      timezone: TIMEZONE
    });
  } catch (error) {
    res.status(500).json({ ok: false, storageWritable: false, databaseMode: 'SPREADSHEET', message: error.message });
  }
});

app.all('/api/kebersihan/db/*', auth, (req, res) => {
  res.status(410).json({
    ok: false,
    code: 'MARIADB_DISABLED',
    message: 'Endpoint database dinonaktifkan. Data aplikasi menggunakan Google Spreadsheet.'
  });
});

app.post('/api/kebersihan/snapshot', auth, async (req, res, next) => {
  try {
    const createdAt = new Date(req.body?.createdAt || Date.now());
    if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ ok: false, message: 'createdAt tidak valid.' });
    const bytes = decodeBase64(req.body?.base64, 50 * 1024 * 1024);
    const local = localDateParts(createdAt);
    const target = safeResolve('SNAPSHOTS', local.year, local.month, `database-${local.stamp}.xlsx`);
    await writeAtomic(target, bytes);
    const storedPath = path.relative(STORAGE_ROOT, target).split(path.sep).join('/');
    res.status(201).json({
      ok: true, storedPath, timezone: TIMEZONE, size: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/evidence', auth, async (req, res, next) => {
  try {
    const contentType = String(req.body?.contentType || '');
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' :
      contentType === 'image/jpeg' ? 'jpg' : '';
    if (!extension) return res.status(400).json({ ok: false, message: 'Format evidence harus JPG, PNG, atau WebP.' });
    const bytes = decodeBase64(req.body?.base64);
    const createdAt = new Date(req.body?.createdAt || Date.now());
    if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ ok: false, message: 'createdAt tidak valid.' });
    const local = localDateParts(createdAt);
    const baseName = safeSegment(String(req.body?.fileName || `evidence-${Date.now()}`).replace(/\.[a-z0-9]+$/i, ''), `evidence-${Date.now()}`);
    const target = safeResolve('EVIDENCE', local.year, local.month, local.day, `${baseName}.${extension}`);
    await writeAtomic(target, bytes);
    const storedPath = path.relative(STORAGE_ROOT, target).split(path.sep).join('/');
    res.status(201).json({
      ok: true,
      fileId: storedPath,
      storedPath,
      size: bytes.length,
      contentType,
      timezone: TIMEZONE,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    });
  } catch (error) { next(error); }
});

app.get('/api/kebersihan/evidence', auth, async (req, res, next) => {
  try {
    const rel = String(req.query.path || '');
    if (!/^(INSPECTIONS|EVIDENCE)\//.test(rel)) return res.status(400).json({ ok: false, message: 'Path evidence tidak valid.' });
    const target = safeResolve(...rel.split('/'));
    const stat = await fs.promises.stat(target);
    if (!stat.isFile() || !/\.(jpg|jpeg|png|webp)$/i.test(path.basename(target))) {
      return res.status(404).json({ ok: false, message: 'Evidence tidak ditemukan.' });
    }
    res.sendFile(target);
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(Number(error.statusCode || 500)).json({ ok: false, message: error.message || 'Kesalahan server.' });
});

const databaseReady = Promise.resolve(true);

if (require.main === module) {
  databaseReady.then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Monitoring Kebersihan NAS Gateway v3.1 aktif pada port ${PORT}`);
      console.log(`Storage root: ${STORAGE_ROOT}`);
      console.log(`Timezone: ${TIMEZONE}`);
    });
  });
}

module.exports = { app, databaseReady };
