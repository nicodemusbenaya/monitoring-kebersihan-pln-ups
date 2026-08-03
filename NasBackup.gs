/**
 * MariaDB dan folder NAS adalah penyimpanan utama.
 * Spreadsheet/Drive hanya menjadi cache dan outbox ketika gateway tidak tersedia.
 */
function configurePrimaryStorage(endpoint, token) {
  endpoint = String(endpoint || '').trim().replace(/\/+$/, '');
  token = String(token || '').trim();
  assert_(/^https?:\/\//i.test(endpoint), 'INVALID_NAS_URL', 'Alamat gateway NAS wajib diawali http:// atau https://.');
  assert_(token.length >= 32, 'INVALID_NAS_TOKEN', 'Token NAS minimal 32 karakter.');
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('NAS_GATEWAY_URL', endpoint);
  properties.setProperty('NAS_GATEWAY_TOKEN', token);
  return testMonitoringNasConnection();
}

function setNasConfiguration_(payload) {
  requireAdmin_(payload);
  var result = configurePrimaryStorage(payload.endpoint, payload.token);
  logAudit_(payload._session.user.UserId, 'SET_NAS_CONFIGURATION', 'SYSTEM', 'NAS', {
    endpoint: String(payload.endpoint || '').trim().replace(/\/+$/, '')
  });
  return result;
}

function testNasConnection_(payload) {
  requireAdmin_(payload);
  var properties = PropertiesService.getScriptProperties();
  var endpoint = String(payload.endpoint || properties.getProperty('NAS_GATEWAY_URL') || '').trim().replace(/\/+$/, '');
  var token = String(payload.token || properties.getProperty('NAS_GATEWAY_TOKEN') || '').trim();
  assert_(/^https?:\/\//i.test(endpoint), 'INVALID_NAS_URL', 'Isi alamat gateway NAS terlebih dahulu.');
  assert_(token, 'INVALID_NAS_TOKEN', 'Isi token gateway NAS terlebih dahulu.');
  var response = UrlFetchApp.fetch(endpoint + '/api/kebersihan/status', {
    method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var parsed;
  try { parsed = JSON.parse(response.getContentText()); } catch (error) { parsed = {}; }
  assert_(status >= 200 && status < 300, 'NAS_CONNECTION_FAILED',
    parsed.message || ('Gateway NAS belum dapat dihubungi (HTTP ' + status + ').'));
  assert_(parsed.databaseConnected, 'DATABASE_CONNECTION_FAILED',
    parsed.databaseMessage || 'Gateway aktif, tetapi MariaDB belum terhubung.');
  return {
    configured: true,
    connected: true,
    endpoint: endpoint,
    storageRoot: parsed.storageRoot || '',
    availableBytes: Number(parsed.availableBytes || 0),
    databaseConnected: true,
    database: parsed.database || '',
    secureTransport: /^https:\/\//i.test(endpoint)
  };
}

function testMonitoringNasConnection() {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = properties.getProperty('NAS_GATEWAY_URL');
  var token = properties.getProperty('NAS_GATEWAY_TOKEN');
  assert_(endpoint && token, 'NAS_NOT_CONFIGURED', 'Konfigurasikan gateway NAS terlebih dahulu.');
  var result = testNasConnection_({
    endpoint: endpoint,
    token: token,
    _session: { user: { Role: 'ADMIN' } }
  });
  console.log(JSON.stringify(result));
  return result;
}

function uploadEvidenceBlobToNas_(blob, fileName) {
  var result = primaryDatabaseRequest_('/api/kebersihan/evidence', {
    method: 'post',
    payload: {
      fileName: fileName || blob.getName(),
      contentType: blob.getContentType(),
      createdAt: nowIso_(),
      base64: Utilities.base64Encode(blob.getBytes())
    }
  });
  assert_(result.storedPath, 'EVIDENCE_UPLOAD_FAILED', 'Gateway tidak mengembalikan lokasi evidence.');
  return result.storedPath;
}

function uploadReportBlobToNas_(blob, fileName) {
  var result = primaryDatabaseRequest_('/api/kebersihan/report', {
    method: 'post',
    payload: {
      fileName: fileName || blob.getName(),
      contentType: blob.getContentType(),
      createdAt: nowIso_(),
      base64: Utilities.base64Encode(blob.getBytes())
    }
  });
  assert_(result.storedPath, 'REPORT_UPLOAD_FAILED', 'Gateway tidak mengembalikan lokasi laporan.');
  return result.storedPath;
}

function downloadEvidenceBlobFromNas_(storedPath) {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = String(properties.getProperty('NAS_GATEWAY_URL') || '').replace(/\/+$/, '');
  var token = String(properties.getProperty('NAS_GATEWAY_TOKEN') || '');
  assert_(endpoint && token, 'NAS_NOT_CONFIGURED', 'Gateway NAS belum dikonfigurasi.');
  var response = UrlFetchApp.fetch(endpoint + '/api/kebersihan/evidence?path=' + encodeURIComponent(storedPath), {
    method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  assert_(response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    'PHOTO_NOT_FOUND', 'Evidence tidak dapat diambil dari NAS.');
  return response.getBlob().setName(String(storedPath).split('/').pop() || 'evidence.jpg');
}

function loadStoredPhotoBlob_(fileId) {
  var reference = String(fileId || '');
  if (reference.indexOf('DRIVE:') === 0) return DriveApp.getFileById(reference.slice(6)).getBlob();
  return downloadEvidenceBlobFromNas_(reference);
}

function enqueueNasBackup_(inspectionId) {
  // Kompatibilitas pemanggilan versi lama. Mutasi dan evidence kini otomatis masuk outbox.
  return { queued: true, inspectionId: inspectionId };
}

function retryNasBackup_(payload) {
  requireAdmin_(payload);
  return processPendingNasBackups(String(payload.inspectionId || ''));
}

function processPendingNasBackups(targetInspectionId) {
  var rows = rowsAsSheetObjects_('BACKUP_QUEUE').filter(function(row) {
    return row.Status !== 'SYNCED' &&
      (!targetInspectionId || !row.InspectionId || String(row.InspectionId) === String(targetInspectionId));
  });
  var priority = { DB_UPSERT: 1, DB_BATCH: 1, DB_TRANSACTION: 1, DB_UPDATE: 1, DB_DELETE: 1, EVIDENCE_UPLOAD: 2 };
  rows.sort(function(a, b) {
    return Number(priority[a.EventType] || 9) - Number(priority[b.EventType] || 9) ||
      String(a.CreatedAt).localeCompare(String(b.CreatedAt));
  });
  var result = { attempted: 0, synced: 0, failed: 0 };
  rows.slice(0, 25).forEach(function(row) {
    result.attempted++;
    try {
      processOutboxRow_(row);
      markOutboxRow_(row, 'SYNCED', '');
      result.synced++;
    } catch (error) {
      markOutboxRow_(row, 'FAILED', String(error.message || error).slice(0, 1000));
      result.failed++;
    }
  });
  return result;
}

function processOutboxRow_(row) {
  var payload;
  try { payload = JSON.parse(String(row.PayloadJson || '{}')); } catch (error) { payload = {}; }
  if (row.EventType === 'DB_UPSERT') {
    primaryDatabaseRequest_('/api/kebersihan/db/upsert', { method: 'post', payload: payload });
    invalidatePrimaryRows_(payload.table);
    return;
  }
  if (row.EventType === 'DB_BATCH') {
    primaryDatabaseRequest_('/api/kebersihan/db/batch', { method: 'post', payload: payload });
    invalidatePrimaryRows_(payload.table);
    return;
  }
  if (row.EventType === 'DB_TRANSACTION') {
    primaryDatabaseRequest_('/api/kebersihan/db/transaction', { method: 'post', payload: payload });
    (payload.mutations || []).forEach(function(mutation) { invalidatePrimaryRows_(mutation.table); });
    return;
  }
  if (row.EventType === 'DB_UPDATE') {
    primaryDatabaseRequest_('/api/kebersihan/db/update', { method: 'post', payload: payload });
    invalidatePrimaryRows_(payload.table);
    return;
  }
  if (row.EventType === 'DB_DELETE') {
    primaryDatabaseRequest_('/api/kebersihan/db/delete', { method: 'post', payload: payload });
    invalidatePrimaryRows_(payload.table);
    return;
  }
  if (row.EventType === 'EVIDENCE_UPLOAD') {
    syncTemporaryEvidence_(payload);
    return;
  }
  throw appError_('UNKNOWN_QUEUE_EVENT', 'Jenis antrean tidak dikenali: ' + row.EventType);
}

function syncTemporaryEvidence_(payload) {
  var driveId = String(payload.driveFileId || '');
  assert_(driveId, 'INVALID_QUEUE', 'ID evidence sementara tidak tersedia.');
  var temporaryReference = 'DRIVE:' + driveId;
  var file = DriveApp.getFileById(driveId);
  var storedPath = uploadEvidenceBlobToNas_(file.getBlob(), payload.fileName || file.getName());
  var updated = 0;

  rowsAsSheetObjects_('INSPECTIONS').filter(function(row) {
    return String(row.EvidenceFileId) === temporaryReference;
  }).forEach(function(row) {
    primaryDatabaseRequest_('/api/kebersihan/db/update', {
      method: 'post',
      payload: {
        table: 'INSPECTIONS', key: row.InspectionId,
        updates: { EvidenceFileId: storedPath, BackupStatus: 'SYNCED', BackupUpdatedAt: nowIso_() }
      }
    });
    sheetUpdateObject_('INSPECTIONS', row._row, {
      EvidenceFileId: storedPath, BackupStatus: 'SYNCED', BackupUpdatedAt: nowIso_()
    });
    updated++;
  });

  rowsAsSheetObjects_('INSPECTION_DETAILS').filter(function(row) {
    return String(row.PhotoFileId) === temporaryReference;
  }).forEach(function(row) {
    primaryDatabaseRequest_('/api/kebersihan/db/update', {
      method: 'post',
      payload: { table: 'INSPECTION_DETAILS', key: row.DetailId, updates: { PhotoFileId: storedPath } }
    });
    sheetUpdateObject_('INSPECTION_DETAILS', row._row, { PhotoFileId: storedPath });
    updated++;
  });

  assert_(updated > 0, 'EVIDENCE_REFERENCE_NOT_FOUND', 'Referensi evidence sementara belum ditemukan; antrean akan dicoba kembali.');
  invalidatePrimaryRows_('INSPECTIONS');
  invalidatePrimaryRows_('INSPECTION_DETAILS');
  file.setTrashed(true);
}

function markOutboxRow_(row, status, errorMessage) {
  sheetUpdateObject_('BACKUP_QUEUE', row._row, {
    Status: status,
    AttemptCount: Number(row.AttemptCount || 0) + 1,
    LastError: safeCellText_(errorMessage || ''),
    UpdatedAt: nowIso_()
  });
}

function ensureBackupTrigger_() {
  var handlers = ScriptApp.getProjectTriggers().map(function(trigger) { return trigger.getHandlerFunction(); });
  if (handlers.indexOf('runFrequentNasQueue') === -1) {
    ScriptApp.newTrigger('runFrequentNasQueue').timeBased().everyMinutes(5).create();
  }
  if (handlers.indexOf('runScheduledNasBackup') === -1) {
    ScriptApp.newTrigger('runScheduledNasBackup').timeBased().everyDays(1).atHour(1).create();
  }
}

function runFrequentNasQueue() {
  return processPendingNasBackups('');
}

function runScheduledNasBackup() {
  processPendingNasBackups('');
  cleanupSyncedOutbox_();
  return processNasSpreadsheetSnapshot_();
}

function cleanupSyncedOutbox_() {
  var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  var rows = rowsAsSheetObjects_('BACKUP_QUEUE').filter(function(row) {
    return row.Status === 'SYNCED' && new Date(row.UpdatedAt || row.CreatedAt).getTime() < cutoff;
  }).sort(function(a, b) { return Number(b._row) - Number(a._row); });
  var sheet = getSheet_('BACKUP_QUEUE');
  rows.forEach(function(row) { sheet.deleteRow(Number(row._row)); });
  return { removed: rows.length };
}

function backupSpreadsheetNow_(payload) {
  requireAdmin_(payload);
  return processNasSpreadsheetSnapshot_();
}

function processNasSpreadsheetSnapshot_() {
  if (!primaryDatabaseConfigured_()) return { skipped: true, reason: 'NAS_NOT_CONFIGURED' };
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  var url = 'https://www.googleapis.com/drive/v3/files/' + spreadsheetId +
    '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var exported = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  var result = primaryDatabaseRequest_('/api/kebersihan/snapshot', {
    method: 'post',
    payload: {
      createdAt: nowIso_(),
      fileName: 'Monitoring Kebersihan Fallback Cache ' + todayKey_() + '.xlsx',
      base64: Utilities.base64Encode(exported.getBytes())
    }
  });
  return { synced: true, bytes: exported.getBytes().length, sha256: result.sha256 || '' };
}
