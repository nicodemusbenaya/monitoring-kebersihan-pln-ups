/**
 * Spreadsheet adalah database utama. NAS hanya menyimpan evidence dan
 * snapshot Excel; Drive menahan evidence sementara ketika NAS tidak aktif.
 */
function configurePrimaryStorage(endpoint, token, options) {
  endpoint = String(endpoint || '').trim().replace(/\/+$/, '');
  token = String(token || '').trim();
  options = options || {};
  assert_(/^https?:\/\//i.test(endpoint), 'INVALID_NAS_URL', 'Alamat gateway NAS wajib diawali http:// atau https://.');
  assert_(token.length >= 32, 'INVALID_NAS_TOKEN', 'Token NAS minimal 32 karakter.');
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('DATABASE_MODE', 'SPREADSHEET');
  properties.setProperty('PRIMARY_STORAGE_MODE', 'SPREADSHEET');
  properties.setProperty('NAS_GATEWAY_URL', endpoint);
  properties.setProperty('NAS_GATEWAY_TOKEN', token);
  properties.setProperty('NAS_EVIDENCE_ENABLED', String(options.evidenceEnabled !== false));
  properties.setProperty('NAS_SHEET_BACKUP_ENABLED', String(options.sheetBackupEnabled !== false));
  properties.setProperty('DRIVE_EVIDENCE_FALLBACK_ENABLED', 'true');
  return testMonitoringNasConnection();
}

function setNasConfiguration_(payload) {
  requireAdmin_(payload);
  var result = configurePrimaryStorage(payload.endpoint, payload.token, {
    evidenceEnabled: payload.evidenceEnabled !== false,
    sheetBackupEnabled: payload.sheetBackupEnabled !== false
  });
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
  assert_(parsed.storageWritable !== false, 'NAS_STORAGE_NOT_WRITABLE',
    parsed.message || 'Gateway aktif, tetapi folder NAS tidak dapat ditulis.');
  resetNasCircuit_();
  return {
    configured: true,
    connected: true,
    endpoint: endpoint,
    storageRoot: parsed.storageRoot || '',
    availableBytes: Number(parsed.availableBytes || 0),
    storageWritable: parsed.storageWritable !== false,
    evidenceEnabled: propertyFlag_('NAS_EVIDENCE_ENABLED', true),
    sheetBackupEnabled: propertyFlag_('NAS_SHEET_BACKUP_ENABLED', true),
    databaseMode: applicationDatabaseMode_(),
    gatewayVersion: String(parsed.version || ''),
    gatewayDatabaseMode: String(parsed.databaseMode || ''),
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
  assert_(nasEvidenceEnabled_(), 'NAS_EVIDENCE_DISABLED', 'Penyimpanan evidence NAS belum diaktifkan.');
  var result = nasGatewayRequest_('/api/kebersihan/evidence', {
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

function storeReportBlobInDrive_(blob, fileName) {
  var folderId = PropertiesService.getScriptProperties().getProperty('REPORT_FOLDER_ID');
  assert_(folderId, 'REPORT_FOLDER_MISSING', 'Folder laporan belum tersedia.');
  return 'DRIVE:' + DriveApp.getFolderById(folderId).createFile(blob.setName(fileName || blob.getName())).getId();
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
  var priority = { EVIDENCE_UPLOAD: 1 };
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
  if (/^DB_(UPSERT|BATCH|TRANSACTION|UPDATE|DELETE)$/.test(String(row.EventType || ''))) {
    // Antrean replikasi MariaDB dari deployment lama dianggap selesai. Data
    // kanoniknya sudah berada di Spreadsheet dan tidak dikirim ke database lain.
    return;
  }
  if (row.EventType === 'EVIDENCE_UPLOAD') {
    syncTemporaryEvidence_(payload);
    return;
  }
  throw appError_('UNKNOWN_QUEUE_EVENT', 'Jenis antrean tidak dikenali: ' + row.EventType);
}

function syncTemporaryEvidence_(payload) {
  assert_(nasEvidenceEnabled_(), 'NAS_EVIDENCE_DISABLED', 'Pengiriman evidence ke NAS belum diaktifkan.');
  var driveId = String(payload.driveFileId || '');
  assert_(driveId, 'INVALID_QUEUE', 'ID evidence sementara tidak tersedia.');
  var temporaryReference = 'DRIVE:' + driveId;
  var file = DriveApp.getFileById(driveId);
  var storedPath = uploadEvidenceBlobToNas_(file.getBlob(), payload.fileName || file.getName());
  var updated = 0;

  rowsAsSheetObjects_('INSPECTIONS').filter(function(row) {
    return String(row.EvidenceFileId) === temporaryReference;
  }).forEach(function(row) {
    sheetUpdateObject_('INSPECTIONS', row._row, {
      EvidenceFileId: storedPath, BackupStatus: 'SYNCED', BackupUpdatedAt: nowIso_()
    });
    updated++;
  });

  rowsAsSheetObjects_('INSPECTION_DETAILS').filter(function(row) {
    return String(row.PhotoFileId) === temporaryReference;
  }).forEach(function(row) {
    sheetUpdateObject_('INSPECTION_DETAILS', row._row, { PhotoFileId: storedPath });
    updated++;
  });

  try {
    rowsAsSheetObjects_('INSPECTION_PHOTOS').filter(function(row) {
      return String(row.FileId) === temporaryReference;
    }).forEach(function(row) {
      sheetUpdateObject_('INSPECTION_PHOTOS', row._row, { FileId: storedPath });
      updated++;
    });
  } catch (error) {
    // Deployment lama belum memiliki sheet multi-foto; evidence tunggal tetap diproses.
  }

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
  var result = processPendingNasBackups('');
  result.snapshotRetry = retryPendingSpreadsheetSnapshot_();
  return result;
}

function runScheduledNasBackup() {
  processPendingNasBackups('');
  cleanupSyncedOutbox_();
  try {
    return processNasSpreadsheetSnapshot_();
  } catch (error) {
    PropertiesService.getScriptProperties().setProperty('NAS_SNAPSHOT_RETRY_PENDING', 'true');
    throw error;
  }
}

/** Uji snapshot manual dari editor tanpa membersihkan histori atau antrean. */
function runManualNasSnapshotTest() {
  var result = processNasSpreadsheetSnapshot_();
  console.log(JSON.stringify(result));
  return result;
}

function retryPendingSpreadsheetSnapshot_() {
  var properties = PropertiesService.getScriptProperties();
  if (!truthy_(properties.getProperty('NAS_SNAPSHOT_RETRY_PENDING'))) return { skipped: true, reason: 'NO_PENDING_SNAPSHOT' };
  var lastAttempt = new Date(properties.getProperty('NAS_SNAPSHOT_LAST_RETRY_AT') || 0).getTime();
  if (Date.now() - lastAttempt < 60 * 60 * 1000) return { skipped: true, reason: 'RETRY_INTERVAL' };
  properties.setProperty('NAS_SNAPSHOT_LAST_RETRY_AT', nowIso_());
  try {
    var result = processNasSpreadsheetSnapshot_();
    if (result.synced) {
      properties.deleteProperty('NAS_SNAPSHOT_RETRY_PENDING');
      properties.deleteProperty('NAS_SNAPSHOT_LAST_RETRY_AT');
    }
    return result;
  } catch (error) {
    return { synced: false, error: String(error.message || error).slice(0, 500) };
  }
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
  var session = requireAdmin_(payload);
  var result = processNasSpreadsheetSnapshot_();
  logAudit_(session.user.UserId, 'BACKUP_SPREADSHEET_NOW', 'SYSTEM', 'NAS', result);
  return result;
}

function processNasSpreadsheetSnapshot_() {
  if (!propertyFlag_('NAS_SHEET_BACKUP_ENABLED', true)) return { skipped: true, reason: 'NAS_SHEET_BACKUP_DISABLED' };
  if (!nasGatewayConfigured_()) return { skipped: true, reason: 'NAS_NOT_CONFIGURED' };
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  var url = 'https://www.googleapis.com/drive/v3/files/' + spreadsheetId +
    '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var exported = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  try {
    var createdAt = nowIso_();
    var result = nasGatewayRequest_('/api/kebersihan/snapshot', {
      method: 'post',
      payload: {
        createdAt: createdAt,
        fileName: 'Monitoring Kebersihan Database ' + todayKey_() + '.xlsx',
        base64: Utilities.base64Encode(exported.getBytes())
      }
    });
    properties.setProperty('LAST_NAS_SNAPSHOT_AT', createdAt);
    properties.setProperty('LAST_NAS_SNAPSHOT_SHA256', result.sha256 || '');
    properties.deleteProperty('LAST_NAS_SNAPSHOT_ERROR');
    properties.deleteProperty('NAS_SNAPSHOT_RETRY_PENDING');
    return { synced: true, createdAt: createdAt, bytes: exported.getBytes().length, sha256: result.sha256 || '' };
  } catch (error) {
    properties.setProperty('LAST_NAS_SNAPSHOT_ERROR', String(error.message || error).slice(0, 1000));
    throw error;
  }
}
