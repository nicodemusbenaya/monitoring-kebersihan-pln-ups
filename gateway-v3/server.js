'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || '/data');
const API_TOKEN = String(process.env.API_TOKEN || '').trim();
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 100);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = Number(process.env.MAX_FILES_PER_REQUEST || 30);
const MONITORING_UPSTREAM = String(process.env.MONITORING_UPSTREAM || '').replace(/\/$/, '');

if (String(process.env.TRUST_PROXY || '') === '1') app.set('trust proxy', 1);
if (API_TOKEN.length < 24) console.warn('[SECURITY] API_TOKEN belum diisi atau terlalu pendek. Gunakan minimal 24 karakter.');

fs.mkdirSync(STORAGE_ROOT, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: `${Math.max(10, MAX_FILE_SIZE_MB * MAX_FILES * 1.45)}mb` }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 180, standardHeaders: true, legacyHeaders: false }));

const ALLOWED_EXTENSIONS = new Set([
  'pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv',
  'jpg','jpeg','png','gif','webp','zip','rar','7z'
]);

function apiAuth(req, res, next) {
  const bearer = String(req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const key = String(req.header('x-api-key') || '').trim();
  const supplied = bearer || key;
  if (!API_TOKEN || supplied !== API_TOKEN) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

function cleanSegment(value, fallback, maxLength = 120) {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '-')
    .replace(/\.\.+/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .slice(0, maxLength);
  return cleaned || fallback;
}

function monthName(n) {
  return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][n - 1] || 'Januari';
}

function parseArchiveDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function extensionFor(file) {
  const filename = String(file.name || file.filename || 'file');
  let ext = path.extname(filename).replace(/^\./, '').toLowerCase();
  if (!ext && file.mimeType) ext = String(mime.extension(file.mimeType) || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`Jenis file .${ext || '(tanpa ekstensi)'} tidak diizinkan.`);
  return ext;
}

function decodeFile(file) {
  let raw = String(file.data || file.contentBase64 || '');
  const comma = raw.indexOf(',');
  if (comma >= 0) raw = raw.slice(comma + 1);
  if (!raw) throw new Error('Data file kosong.');
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length) throw new Error('File gagal dibaca.');
  if (buffer.length > MAX_FILE_SIZE_BYTES) throw new Error(`Ukuran tiap file maksimal ${MAX_FILE_SIZE_MB} MB.`);
  return buffer;
}


function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function storageStatus() {
  let totalBytes = 0;
  let freeBytes = 0;
  let availableBytes = 0;
  if (typeof fs.promises.statfs === 'function') {
    const stat = await fs.promises.statfs(STORAGE_ROOT);
    totalBytes = Number(stat.blocks) * Number(stat.bsize);
    freeBytes = Number(stat.bfree) * Number(stat.bsize);
    availableBytes = Number(stat.bavail) * Number(stat.bsize);
  }
  return {
    storageRoot: STORAGE_ROOT,
    totalBytes,
    freeBytes,
    availableBytes,
    usedBytes: totalBytes > 0 ? Math.max(totalBytes - freeBytes, 0) : 0,
    usedPercent: totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 10000) / 100 : 0
  };
}

function relativePath(abs) {
  return path.relative(STORAGE_ROOT, abs).split(path.sep).join('/');
}

function resolveSafe(rel) {
  const normalized = String(rel || '').replace(/^\/+/, '');
  const abs = path.resolve(STORAGE_ROOT, normalized);
  if (abs !== STORAGE_ROOT && !abs.startsWith(STORAGE_ROOT + path.sep)) throw new Error('Path tidak valid.');
  return abs;
}

function signature(rel) {
  return crypto.createHmac('sha256', API_TOKEN || 'NOT_CONFIGURED').update(rel).digest('hex');
}

function publicFileUrl(rel, download) {
  const base = PUBLIC_BASE_URL || `http://localhost:${PORT}`;
  return `${base}/api/file?path=${encodeURIComponent(rel)}&sig=${signature(rel)}${download ? '&download=1' : ''}`;
}

async function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.promises.rename(tmp, filePath);
}

async function appendAudit(action, detail, req) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    action,
    ip: req.ip,
    actor: String(req.body?.actor || req.query?.actor || ''),
    detail
  }) + '\n';
  await fs.promises.appendFile(path.join(STORAGE_ROOT, '_audit.log'), line, 'utf8').catch(() => {});
}

function buildArchiveFolder(body) {
  const date = parseArchiveDate(body.tanggal || body.date);
  const subBidang = cleanSegment(body.divisi || body.subBidang, 'TANPA SUB BIDANG').toUpperCase();
  const year = String(date.getFullYear());
  const monthNo = String(date.getMonth() + 1).padStart(2, '0');
  const month = `${monthNo} - ${monthName(date.getMonth() + 1)}`;
  const kode = cleanSegment(body.kodeArsip || body.kode, 'ARSIP');
  return { date, subBidang, year, month, kode, folder: path.join(STORAGE_ROOT, subBidang, year, month, `${kode} - BANTEX`) };
}

app.get('/health', async (req, res) => {
  try {
    const probe = path.join(STORAGE_ROOT, `.health-${process.pid}.tmp`);
    await fs.promises.writeFile(probe, 'ok');
    await fs.promises.unlink(probe);
    res.json({ ok: true, service: 'UPS E-Arsip NAS Gateway - App Compatible', version: '4.0.0', port: PORT, storageRoot: STORAGE_ROOT, storageWritable: true });
  } catch (error) {
    res.status(500).json({ ok: false, storageWritable: false, error: error.message });
  }
});


app.get('/api/storage/status', apiAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await storageStatus() });
  } catch (error) { next(error); }
});

app.post('/api/arsip/upload', apiAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const files = Array.isArray(body.files) ? body.files.filter(f => f && (f.data || f.contentBase64)) : [];
    if (!files.length && body.file && (body.file.data || body.file.contentBase64)) files.push(body.file);
    if (!files.length) return res.status(400).json({ success: false, message: 'File belum dipilih.' });
    if (files.length > MAX_FILES) return res.status(400).json({ success: false, message: `Maksimal ${MAX_FILES} file per permintaan.` });

    const names = Array.isArray(body.namaItems) ? body.namaItems : String(body.namaArsip || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    const structure = buildArchiveFolder(body);
    await fs.promises.mkdir(structure.folder, { recursive: true });

    if (body.clearExistingFiles === true) {
      const entries = await fs.promises.readdir(structure.folder, { withFileTypes: true });
      await Promise.all(entries.filter(e => e.isFile() && e.name !== '_metadata.json').map(e => fs.promises.unlink(path.join(structure.folder, e.name))));
    }

    const details = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const ext = extensionFor(file);
      const archiveName = cleanSegment(names[i] || path.basename(String(file.name || `File ${i + 1}`), path.extname(String(file.name || ''))), `File ${i + 1}`, 140);
      const storedName = cleanSegment(`File ${i + 1} - ${structure.kode} - ${archiveName}`, `File ${i + 1} - ${structure.kode}`, 190) + `.${ext}`;
      const target = path.join(structure.folder, storedName);
      const buffer = decodeFile(file);
      await fs.promises.writeFile(target, buffer);
      const rel = relativePath(target);
      details.push({
        nomor: i + 1,
        namaArsip: archiveName,
        fileName: storedName,
        originalName: path.basename(String(file.name || storedName)),
        mimeType: file.mimeType || mime.lookup(ext) || 'application/octet-stream',
        size: buffer.length,
        sha256: sha256(buffer),
        uploadedAt: new Date().toISOString(),
        relativePath: rel,
        url: publicFileUrl(rel, false),
        downloadUrl: publicFileUrl(rel, true)
      });
    }

    const folderRel = relativePath(structure.folder);
    const metadata = {
      kode: structure.kode,
      divisi: structure.subBidang,
      tanggal: structure.date.toISOString(),
      kategori: String(body.kategori || ''),
      namaArsip: names,
      keterangan: String(body.keterangan || ''),
      updatedAt: new Date().toISOString(),
      files: details
    };
    await writeJsonAtomic(path.join(structure.folder, '_metadata.json'), metadata);
    await appendAudit('UPLOAD_ARSIP', { kode: structure.kode, folder: folderRel, jumlahFile: details.length }, req);

    res.status(201).json({
      success: true,
      message: `${details.length} file berhasil disimpan ke NAS.`,
      data: {
        kode: structure.kode,
        folderPath: folderRel,
        folderUrl: details[0]?.url || '',
        fileUrl: details.length === 1 ? details[0].url : (details[0]?.url || ''),
        fileDetails: details,
        storage: await storageStatus()
      }
    });
  } catch (error) { next(error); }
});

app.delete('/api/arsip', apiAuth, async (req, res, next) => {
  try {
    const rel = String(req.body?.folderPath || req.query?.folderPath || '').trim();
    if (!rel) return res.status(400).json({ success: false, message: 'folderPath wajib diisi.' });
    const abs = resolveSafe(rel);
    if (abs === STORAGE_ROOT) throw new Error('Folder root tidak boleh dihapus.');
    await fs.promises.rm(abs, { recursive: true, force: false });
    await appendAudit('DELETE_ARSIP', { folderPath: rel }, req);
    res.json({ success: true, message: 'Folder arsip dan seluruh lampirannya berhasil dihapus.' });
  } catch (error) { next(error); }
});

app.get('/api/arsip/list', apiAuth, async (req, res, next) => {
  try {
    const startRel = String(req.query.path || '').trim();
    const start = resolveSafe(startRel);
    const entries = await fs.promises.readdir(start, { withFileTypes: true });
    const result = await Promise.all(entries.map(async entry => {
      const abs = path.join(start, entry.name);
      const stat = await fs.promises.stat(abs);
      return { name: entry.name, type: entry.isDirectory() ? 'folder' : 'file', relativePath: relativePath(abs), size: entry.isFile() ? stat.size : null, modifiedAt: stat.mtime.toISOString() };
    }));
    result.sort((a,b) => b.modifiedAt.localeCompare(a.modifiedAt));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

app.get('/api/file', async (req, res, next) => {
  try {
    const rel = String(req.query.path || '');
    const sig = String(req.query.sig || '');
    if (!rel || !sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature(rel)))) return res.status(403).json({ success: false, message: 'Tautan file tidak valid.' });
    const abs = resolveSafe(rel);
    const stat = await fs.promises.stat(abs);
    if (!stat.isFile()) return res.status(404).json({ success: false, message: 'File tidak ditemukan.' });
    res.type(mime.lookup(abs) || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `${String(req.query.download) === '1' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(path.basename(abs))}`);
    fs.createReadStream(abs).pipe(res);
  } catch (error) { next(error); }
});



// =========================================================
// TAHAP 3 - ARSIP RAHASIA (R) DI NAS
// =========================================================
function buildRahasiaFolder(body) {
  const date = parseArchiveDate(body.tanggalDokumen || body.tanggal || body.date);
  const subBidang = cleanSegment(body.subBidang || body.divisi, 'TANPA SUB BIDANG').toUpperCase();
  const year = String(date.getFullYear());
  const monthNo = String(date.getMonth() + 1).padStart(2, '0');
  const month = `${monthNo} - ${monthName(date.getMonth() + 1)}`;
  const idRahasia = cleanSegment(body.idRahasia || body.id || `R-${Date.now()}`, `R-${Date.now()}`);
  const folder = path.join(STORAGE_ROOT, 'RAHASIA', subBidang, year, month, idRahasia);
  return { date, subBidang, year, month, idRahasia, folder };
}

async function nextRahasiaVersion(folder) {
  const versionsDir = path.join(folder, 'VERSIONS');
  await fs.promises.mkdir(versionsDir, { recursive: true });
  const entries = await fs.promises.readdir(versionsDir, { withFileTypes: true }).catch(() => []);
  const nums = entries.filter(e => e.isDirectory() && /^v\d{3}$/i.test(e.name))
    .map(e => Number(e.name.slice(1))).filter(Number.isFinite);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return { number: next, name: `v${String(next).padStart(3, '0')}`, versionsDir };
}

app.post('/api/rahasia/upload', apiAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const files = Array.isArray(body.files) ? body.files.filter(f => f && (f.data || f.contentBase64)) : [];
    if (!files.length && body.file && (body.file.data || body.file.contentBase64)) files.push(body.file);
    if (!files.length) return res.status(400).json({ success:false, message:'Minimal satu file rahasia wajib dipilih.' });
    if (files.length > MAX_FILES) return res.status(400).json({ success:false, message:`Maksimal ${MAX_FILES} file per permintaan.` });

    const names = Array.isArray(body.namaItems) ? body.namaItems : String(body.namaDokumen || '').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
    if (names.length && names.length !== files.length) return res.status(400).json({ success:false, message:'Jumlah nama dokumen dan file rahasia harus sama.' });

    const structure = buildRahasiaFolder(body);
    await fs.promises.mkdir(structure.folder, { recursive:true });
    const version = await nextRahasiaVersion(structure.folder);
    const versionFolder = path.join(version.versionsDir, version.name);
    await fs.promises.mkdir(versionFolder, { recursive:true });

    const details=[];
    for (let i=0;i<files.length;i++) {
      const file=files[i];
      const ext=extensionFor(file);
      const docName=cleanSegment(names[i] || path.basename(String(file.name || `Dokumen ${i+1}`), path.extname(String(file.name || ''))), `Dokumen ${i+1}`, 140);
      const storedName=cleanSegment(`File ${i+1} - ${structure.idRahasia} - ${docName}`, `File ${i+1} - ${structure.idRahasia}`, 190)+`.${ext}`;
      const target=path.join(versionFolder, storedName);
      const buffer=decodeFile(file);
      await fs.promises.writeFile(target, buffer, { flag:'wx' });
      const rel=relativePath(target);
      details.push({
        nomor:i+1, namaDokumen:docName, fileName:storedName,
        originalName:path.basename(String(file.name || storedName)),
        mimeType:file.mimeType || mime.lookup(ext) || 'application/octet-stream',
        size:buffer.length, sha256:crypto.createHash('sha256').update(buffer).digest('hex'),
        relativePath:rel, version:version.number, uploadedAt:new Date().toISOString()
      });
    }

    const folderRel=relativePath(structure.folder);
    const metadata={
      idRahasia:structure.idRahasia, subBidang:structure.subBidang,
      tanggalDokumen:structure.date.toISOString(), kategori:String(body.kategori || 'Rahasia'),
      namaDokumen:names, keterangan:String(body.keterangan || ''),
      currentVersion:version.number, currentVersionName:version.name,
      updatedAt:new Date().toISOString(), actor:String(body.actor || ''), files:details
    };
    await writeJsonAtomic(path.join(structure.folder, '_metadata.json'), metadata);
    await writeJsonAtomic(path.join(versionFolder, '_version.json'), metadata);
    await appendAudit('UPLOAD_RAHASIA', { idRahasia:structure.idRahasia, folder:folderRel, version:version.number, jumlahFile:details.length }, req);
    res.status(201).json({ success:true, message:`Dokumen R versi ${version.number} berhasil disimpan ke NAS.`, data:{ idRahasia:structure.idRahasia, folderPath:folderRel, version:version.number, versionName:version.name, fileDetails:details } });
  } catch(error) { next(error); }
});

app.post('/api/rahasia/read', apiAuth, async (req, res, next) => {
  try {
    const rel=String(req.body?.relativePath || '').trim();
    if (!rel) return res.status(400).json({success:false,message:'relativePath wajib diisi.'});
    if (!rel.toUpperCase().startsWith('RAHASIA/')) return res.status(403).json({success:false,message:'Path bukan dokumen rahasia.'});
    const abs=resolveSafe(rel);
    const stat=await fs.promises.stat(abs);
    if (!stat.isFile()) return res.status(404).json({success:false,message:'File rahasia tidak ditemukan.'});
    const buffer=await fs.promises.readFile(abs);
    await appendAudit('READ_RAHASIA', { relativePath:rel, size:buffer.length }, req);
    res.json({ success:true, data:{ relativePath:rel, fileName:path.basename(abs), mimeType:mime.lookup(abs)||'application/octet-stream', size:buffer.length, sha256:crypto.createHash('sha256').update(buffer).digest('hex'), base64:buffer.toString('base64') } });
  } catch(error) { next(error); }
});

app.delete('/api/rahasia', apiAuth, async (req, res, next) => {
  try {
    const rel=String(req.body?.folderPath || '').trim();
    if (!rel) return res.status(400).json({success:false,message:'folderPath wajib diisi.'});
    if (!rel.toUpperCase().startsWith('RAHASIA/')) return res.status(403).json({success:false,message:'Folder bukan Arsip Rahasia.'});
    const abs=resolveSafe(rel);
    const recycle=path.join(STORAGE_ROOT,'_RECYCLE_RAHASIA');
    await fs.promises.mkdir(recycle,{recursive:true});
    const target=path.join(recycle, `${Date.now()}-${path.basename(abs)}`);
    await fs.promises.rename(abs,target);
    await appendAudit('DELETE_RAHASIA_TO_RECYCLE', { folderPath:rel, recyclePath:relativePath(target) }, req);
    res.json({success:true,message:'Folder Arsip Rahasia dipindahkan ke recycle NAS.',data:{recyclePath:relativePath(target)}});
  } catch(error) { next(error); }
});


// =========================================================
// TAHAP 4A - DASAR ATURAN DIGITAL DI NAS
// =========================================================
function aturanRoot() {
  return path.join(STORAGE_ROOT, 'DASAR_ATURAN');
}

function aturanRecycleRoot() {
  return path.join(STORAGE_ROOT, '_RECYCLE_DASAR_ATURAN');
}

function aturanPublicData(meta) {
  const rel = String(meta.relativePath || '');
  return {
    id: String(meta.id || ''),
    nama: String(meta.nama || meta.fileName || ''),
    kategori: String(meta.kategori || 'Lainnya'),
    nomorDokumen: String(meta.nomorDokumen || ''),
    tahun: String(meta.tahun || ''),
    keterangan: String(meta.keterangan || ''),
    uploader: String(meta.uploader || ''),
    uploadedAt: String(meta.uploadedAt || ''),
    modifiedAt: String(meta.modifiedAt || meta.uploadedAt || ''),
    size: Number(meta.size || 0),
    mimeType: String(meta.mimeType || 'application/pdf'),
    sha256: String(meta.sha256 || ''),
    relativePath: rel,
    url: rel ? publicFileUrl(rel, false) : '',
    downloadUrl: rel ? publicFileUrl(rel, true) : '',
    storageProvider: 'NAS'
  };
}

async function walkAturanFiles(dir, output, metadataByPath) {
  const entries = await fs.promises.readdir(dir, { withFileTypes:true }).catch(() => []);
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAturanFiles(abs, output, metadataByPath);
      continue;
    }
    if (!entry.isFile()) continue;

    // Metadata buatan menu upload aplikasi.
    if (entry.name.endsWith('.aturan.json')) {
      try {
        const meta = JSON.parse(await fs.promises.readFile(abs, 'utf8'));
        const rel = String(meta.relativePath || '').replace(/\\/g, '/');
        if (rel) metadataByPath.set(rel.toLowerCase(), meta);
      } catch (e) {
        console.warn('[ATURAN] Metadata dilewati:', abs, e.message);
      }
      continue;
    }

    // PDF yang dicopy langsung melalui QNAP File Station juga dibaca.
    if (path.extname(entry.name).toLowerCase() !== '.pdf') continue;
    try {
      const stat = await fs.promises.stat(abs);
      const rel = relativePath(abs);
      const relativeInsideRoot = path.relative(aturanRoot(), abs);
      const parts = relativeInsideRoot.split(path.sep).filter(Boolean);
      const kategori = parts.length >= 2 ? parts[0] : 'Lainnya';
      const tahunFolder = parts.length >= 3 ? parts[1] : '';
      const yearMatch = String(tahunFolder).match(/(?:19|20)\d{2}/);
      const existing = metadataByPath.get(rel.toLowerCase()) || {};
      const namaTanpaExt = path.basename(entry.name, path.extname(entry.name));
      const id = String(existing.id || `RAW-${crypto.createHash('sha1').update(rel).digest('hex').slice(0,16)}`);
      const meta = {
        id,
        nama: String(existing.nama || namaTanpaExt),
        kategori: String(existing.kategori || kategori || 'Lainnya'),
        nomorDokumen: String(existing.nomorDokumen || ''),
        tahun: String(existing.tahun || (yearMatch ? yearMatch[0] : '')),
        keterangan: String(existing.keterangan || ''),
        uploader: String(existing.uploader || 'QNAP File Station'),
        uploadedAt: String(existing.uploadedAt || stat.birthtime.toISOString()),
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size,
        mimeType: 'application/pdf',
        sha256: String(existing.sha256 || ''),
        relativePath: rel,
        fileName: entry.name,
        sourceType: Object.keys(existing).length ? 'metadata' : 'direct-file'
      };
      output.push(aturanPublicData(meta));
    } catch (e) {
      console.warn('[ATURAN] PDF dilewati:', abs, e.message);
    }
  }
}

app.get('/api/aturan/list', apiAuth, async (req, res, next) => {
  try {
    const root = aturanRoot();
    await fs.promises.mkdir(root, { recursive:true });
    const data = [];
    const metadataByPath = new Map();
    async function collectMetadata(dir) {
      const entries = await fs.promises.readdir(dir, { withFileTypes:true }).catch(() => []);
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) await collectMetadata(abs);
        else if (entry.isFile() && entry.name.endsWith('.aturan.json')) {
          try {
            const meta = JSON.parse(await fs.promises.readFile(abs, 'utf8'));
            const rel = String(meta.relativePath || '').replace(/\\/g, '/');
            if (rel) metadataByPath.set(rel.toLowerCase(), meta);
          } catch (e) {
            console.warn('[ATURAN] Metadata dilewati:', abs, e.message);
          }
        }
      }
    }
    await collectMetadata(root);
    await walkAturanFiles(root, data, metadataByPath);
    const q = String(req.query.q || '').trim().toLowerCase();
    const kategori = String(req.query.kategori || '').trim().toLowerCase();
    let filtered = data;
    if (q) filtered = filtered.filter(x => [x.nama,x.kategori,x.nomorDokumen,x.tahun,x.keterangan].join(' ').toLowerCase().includes(q));
    if (kategori) filtered = filtered.filter(x => String(x.kategori).toLowerCase() === kategori);
    filtered.sort((a,b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)) || String(a.nama).localeCompare(String(b.nama)));
    res.json({ success:true, data:filtered });
  } catch (error) { next(error); }
});

app.post('/api/aturan/upload', apiAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const file = body.file || (Array.isArray(body.files) ? body.files[0] : null);
    if (!file || !(file.data || file.contentBase64)) return res.status(400).json({ success:false, message:'File dasar aturan belum dipilih.' });
    const ext = extensionFor(file);
    if (ext !== 'pdf') return res.status(400).json({ success:false, message:'Dasar aturan hanya menerima file PDF.' });
    const buffer = decodeFile(file);
    const now = new Date();
    const kategori = cleanSegment(body.kategori, 'Lainnya', 80);
    const tahun = cleanSegment(body.tahun || now.getFullYear(), String(now.getFullYear()), 4);
    const id = cleanSegment(body.id || `ATURAN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, `ATURAN-${Date.now()}`, 80);
    const nama = cleanSegment(body.nama || path.basename(String(file.name || 'Dasar Aturan.pdf'), path.extname(String(file.name || ''))), 'Dasar Aturan', 170);
    const folder = path.join(aturanRoot(), kategori, tahun, id);
    await fs.promises.mkdir(folder, { recursive:true });
    const storedName = cleanSegment(nama, 'Dasar Aturan', 180) + '.pdf';
    const target = path.join(folder, storedName);
    await fs.promises.writeFile(target, buffer, { flag:'wx' });
    const rel = relativePath(target);
    const meta = {
      id, nama, kategori, tahun,
      nomorDokumen:String(body.nomorDokumen || ''),
      keterangan:String(body.keterangan || ''),
      uploader:String(body.uploader || body.actor || ''),
      uploadedAt:now.toISOString(), modifiedAt:now.toISOString(),
      fileName:storedName, relativePath:rel,
      mimeType:'application/pdf', size:buffer.length, sha256:sha256(buffer)
    };
    await writeJsonAtomic(path.join(folder, `${id}.aturan.json`), meta);
    await appendAudit('UPLOAD_DASAR_ATURAN', { id, nama, kategori, relativePath:rel }, req);
    res.status(201).json({ success:true, message:'Dasar aturan berhasil disimpan ke NAS.', data:aturanPublicData(meta) });
  } catch (error) { next(error); }
});

app.post('/api/aturan/delete', apiAuth, async (req, res, next) => {
  try {
    const id = String(req.body?.id || '').trim();
    const rel = String(req.body?.relativePath || '').trim();
    if (!id || !rel) return res.status(400).json({ success:false, message:'ID dan relativePath wajib diisi.' });
    if (!rel.toUpperCase().startsWith('DASAR_ATURAN/')) return res.status(403).json({ success:false, message:'Path bukan dokumen dasar aturan.' });
    const fileAbs = resolveSafe(rel);
    const folder = path.dirname(fileAbs);
    if (!folder.startsWith(aturanRoot() + path.sep)) return res.status(403).json({ success:false, message:'Folder dasar aturan tidak valid.' });
    const recycleRoot = aturanRecycleRoot();
    await fs.promises.mkdir(recycleRoot, { recursive:true });
    const target = path.join(recycleRoot, `${Date.now()}-${path.basename(folder)}`);
    await fs.promises.rename(folder, target);
    await appendAudit('DELETE_DASAR_ATURAN_TO_RECYCLE', { id, relativePath:rel, recyclePath:relativePath(target) }, req);
    res.json({ success:true, message:'Dasar aturan dipindahkan ke recycle NAS.', data:{ recyclePath:relativePath(target) } });
  } catch (error) { next(error); }
});

// =========================================================
// PROXY TERBATAS KE CONTAINER MONITORING KEBERSIHAN
// Port publik tetap 18080, data dan token divalidasi container monitoring.
// =========================================================
app.use('/api/kebersihan', async (req, res, next) => {
  if (!MONITORING_UPSTREAM) {
    return res.status(503).json({ ok:false, message:'MONITORING_UPSTREAM belum dikonfigurasi.' });
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    const target = MONITORING_UPSTREAM + req.originalUrl;
    const headers = {
      authorization: String(req.header('authorization') || ''),
      accept: String(req.header('accept') || '*/*')
    };
    const options = {
      method: req.method,
      headers,
      signal: controller.signal
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(req.body || {});
    }
    const upstream = await fetch(target, options);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    const body = Buffer.from(await upstream.arrayBuffer());
    clearTimeout(timer);
    res.status(upstream.status).send(body);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ ok:false, message:'Container monitoring tidak merespons dalam 90 detik.' });
    }
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = /tidak ditemukan/i.test(error.message) ? 404 : 500;
  res.status(status).json({ success: false, message: error.message || 'Kesalahan server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UPS E-Arsip Gateway Tahap 4A Direct PDF aktif pada port ${PORT}`);
  console.log(`Storage root: ${STORAGE_ROOT}`);
});
