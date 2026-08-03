'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || '/data');
const API_TOKEN = String(process.env.API_TOKEN || '').trim();
const MAX_BODY_MB = Number(process.env.MAX_BODY_MB || 12);

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
    res.json({ ok: true, service: 'Monitoring Kebersihan NAS Gateway', version: '1.0.0', storageWritable: true });
  } catch (error) {
    res.status(500).json({ ok: false, storageWritable: false, message: error.message });
  }
});

app.get('/api/kebersihan/status', auth, async (req, res) => {
  const stats = typeof fs.promises.statfs === 'function' ? await fs.promises.statfs(STORAGE_ROOT) : null;
  res.json({
    ok: true,
    storageRoot: STORAGE_ROOT,
    totalBytes: stats ? Number(stats.blocks) * Number(stats.bsize) : 0,
    availableBytes: stats ? Number(stats.bavail) * Number(stats.bsize) : 0
  });
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

app.get('/api/kebersihan/evidence', auth, async (req, res, next) => {
  try {
    const rel = String(req.query.path || '');
    if (!rel.startsWith('INSPECTIONS/')) return res.status(400).json({ ok: false, message: 'Path evidence tidak valid.' });
    const target = safeResolve(...rel.split('/'));
    const stat = await fs.promises.stat(target);
    if (!stat.isFile() || !/^evidence\.(jpg|png|webp)$/.test(path.basename(target))) {
      return res.status(404).json({ ok: false, message: 'Evidence tidak ditemukan.' });
    }
    res.sendFile(target);
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ ok: false, message: error.message || 'Kesalahan server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Monitoring Kebersihan NAS Gateway aktif pada port ${PORT}`);
  console.log(`Storage root: ${STORAGE_ROOT}`);
});
