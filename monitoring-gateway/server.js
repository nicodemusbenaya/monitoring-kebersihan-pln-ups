'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const {
  initializeDatabase,
  databaseHealth,
  listRows,
  upsertRow,
  upsertRows,
  upsertTransaction,
  updateRow,
  deleteRow
} = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const STORAGE_ROOT = path.resolve(process.env.MONITORING_STORAGE_ROOT || process.env.STORAGE_ROOT || '/data');
const API_TOKEN = String(process.env.MONITORING_API_TOKEN || process.env.API_TOKEN || '').trim();
const MAX_BODY_MB = Number(process.env.MONITORING_MAX_BODY_MB || process.env.MAX_BODY_MB || 12);

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

function inspectionFolder(inspection) {
  const date = String(inspection.dateKey || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('dateKey tidak valid.');
  return safeResolve(
    'INSPECTIONS', date.slice(0, 4), date.slice(5, 7),
    safeSegment(inspection.room?.code, 'ROOM'),
    date, safeSegment(inspection.slot?.code, 'SLOT')
  );
}

app.get('/health', async (req, res) => {
  try {
    const probe = safeResolve(`.health-${process.pid}`);
    await fs.promises.writeFile(probe, 'ok');
    await fs.promises.unlink(probe);
    const database = await databaseHealth();
    res.status(database.connected ? 200 : 503).json({
      ok: database.connected,
      service: 'Monitoring Kebersihan NAS Gateway',
      version: '2.0.0',
      storageWritable: true,
      databaseConnected: database.connected,
      database: database.connected ? database.database : undefined,
      message: database.connected ? undefined : database.message
    });
  } catch (error) {
    res.status(500).json({ ok: false, storageWritable: false, databaseConnected: false, message: error.message });
  }
});

app.get('/api/kebersihan/status', auth, async (req, res) => {
  const stats = typeof fs.promises.statfs === 'function' ? await fs.promises.statfs(STORAGE_ROOT) : null;
  const database = await databaseHealth();
  res.json({
    ok: database.connected,
    storageRoot: STORAGE_ROOT,
    totalBytes: stats ? Number(stats.blocks) * Number(stats.bsize) : 0,
    availableBytes: stats ? Number(stats.bavail) * Number(stats.bsize) : 0,
    databaseConnected: database.connected,
    database: database.connected ? database.database : '',
    databaseMessage: database.connected ? '' : database.message
  });
});

app.get('/api/kebersihan/db/rows', auth, async (req, res, next) => {
  try {
    const rows = await listRows(req.query.table);
    res.json({ ok: true, table: String(req.query.table || '').toUpperCase(), rows });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/db/upsert', auth, async (req, res, next) => {
  try {
    const result = await upsertRow(req.body?.table, req.body?.row || {});
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/db/batch', auth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.rows)) return res.status(400).json({ ok: false, message: 'rows wajib berupa array.' });
    const result = await upsertRows(req.body?.table, req.body.rows);
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/db/transaction', auth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.mutations)) return res.status(400).json({ ok: false, message: 'mutations wajib berupa array.' });
    const result = await upsertTransaction(req.body.mutations);
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/db/update', auth, async (req, res, next) => {
  try {
    const result = await updateRow(req.body?.table, req.body?.key, req.body?.updates || {});
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/db/delete', auth, async (req, res, next) => {
  try {
    const result = await deleteRow(req.body?.table, req.body?.key);
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/inspection', auth, async (req, res, next) => {
  try {
    const inspection = req.body?.inspection;
    const evidence = req.body?.evidence;
    if (!inspection?.inspectionId || !inspection.room?.code || !inspection.slot?.code) {
      return res.status(400).json({ ok: false, message: 'Payload pemeriksaan tidak lengkap.' });
    }
    const idempotency = String(req.header('idempotency-key') || '');
    if (idempotency && idempotency !== inspection.inspectionId) {
      return res.status(400).json({ ok: false, message: 'Idempotency key tidak sesuai.' });
    }
    const folder = inspectionFolder(inspection);
    await fs.promises.mkdir(folder, { recursive: true });
    const extension = evidence?.contentType === 'image/png' ? 'png' :
      evidence?.contentType === 'image/webp' ? 'webp' : 'jpg';
    const evidenceBuffer = decodeBase64(evidence?.base64);
    const evidenceName = `evidence.${extension}`;
    const record = {
      schemaVersion: Number(req.body.schemaVersion || 1),
      receivedAt: new Date().toISOString(),
      inspection,
      evidence: {
        fileName: evidenceName,
        contentType: evidence.contentType,
        size: evidenceBuffer.length,
        sha256: crypto.createHash('sha256').update(evidenceBuffer).digest('hex')
      }
    };
    await writeAtomic(path.join(folder, evidenceName), evidenceBuffer);
    await writeAtomic(path.join(folder, 'inspection.json'), JSON.stringify(record, null, 2));
    res.status(201).json({ ok: true, inspectionId: inspection.inspectionId, storedPath: path.relative(STORAGE_ROOT, folder).split(path.sep).join('/') });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/snapshot', auth, async (req, res, next) => {
  try {
    const createdAt = new Date(req.body?.createdAt || Date.now());
    if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ ok: false, message: 'createdAt tidak valid.' });
    const bytes = decodeBase64(req.body?.base64, 50 * 1024 * 1024);
    const year = String(createdAt.getUTCFullYear());
    const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
    const stamp = createdAt.toISOString().replace(/[:.]/g, '-');
    const target = safeResolve('SNAPSHOTS', year, month, `database-${stamp}.xlsx`);
    await writeAtomic(target, bytes);
    res.status(201).json({ ok: true, size: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
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
    const year = String(createdAt.getUTCFullYear());
    const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(createdAt.getUTCDate()).padStart(2, '0');
    const baseName = safeSegment(String(req.body?.fileName || `evidence-${Date.now()}`).replace(/\.[a-z0-9]+$/i, ''), `evidence-${Date.now()}`);
    const target = safeResolve('EVIDENCE', year, month, day, `${baseName}.${extension}`);
    await writeAtomic(target, bytes);
    const storedPath = path.relative(STORAGE_ROOT, target).split(path.sep).join('/');
    res.status(201).json({
      ok: true,
      fileId: storedPath,
      storedPath,
      size: bytes.length,
      contentType,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    });
  } catch (error) { next(error); }
});

app.post('/api/kebersihan/report', auth, async (req, res, next) => {
  try {
    const contentType = String(req.body?.contentType || 'application/octet-stream');
    const allowed = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
    };
    const extension = allowed[contentType];
    if (!extension) return res.status(400).json({ ok: false, message: 'Format laporan tidak didukung.' });
    const bytes = decodeBase64(req.body?.base64, 50 * 1024 * 1024);
    const createdAt = new Date(req.body?.createdAt || Date.now());
    if (Number.isNaN(createdAt.getTime())) return res.status(400).json({ ok: false, message: 'createdAt tidak valid.' });
    const year = String(createdAt.getUTCFullYear());
    const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
    const baseName = safeSegment(String(req.body?.fileName || `laporan-${Date.now()}`).replace(/\.[a-z0-9]+$/i, ''), `laporan-${Date.now()}`);
    const target = safeResolve('REPORTS', year, month, `${baseName}.${extension}`);
    await writeAtomic(target, bytes);
    const storedPath = path.relative(STORAGE_ROOT, target).split(path.sep).join('/');
    res.status(201).json({
      ok: true, storedPath, size: bytes.length, contentType,
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

function scheduleDatabaseRetry() {
  const timer = setTimeout(async () => {
    const connected = await initializeDatabase();
    if (connected) console.log('Koneksi MariaDB berhasil dipulihkan.');
    else scheduleDatabaseRetry();
  }, 30_000);
  timer.unref();
}

const databaseReady = initializeDatabase().then(connected => {
  if (!connected) {
    console.error('MariaDB belum siap. Gateway akan mencoba kembali setiap 30 detik.');
    scheduleDatabaseRetry();
  }
  return connected;
});

if (require.main === module) {
  databaseReady.then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Monitoring Kebersihan NAS Gateway v2 aktif pada port ${PORT}`);
      console.log(`Storage root: ${STORAGE_ROOT}`);
    });
  });
}

module.exports = { app, databaseReady };
