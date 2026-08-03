/**
 * Konfigurasi NAS disimpan di Script Properties, bukan di source code.
 * Endpoint dapat memakai pola gateway E-Arsip yang sudah berjalan.
 * HTTPS tetap disarankan jika reverse proxy tersedia.
 */
function setNasConfiguration_(payload) {
  requireAdmin_(payload);
  var endpoint = String(payload.endpoint || '').trim().replace(/\/+$/, '');
  var token = String(payload.token || '').trim();
  assert_(/^https?:\/\//i.test(endpoint), 'INVALID_NAS_URL', 'Alamat gateway NAS wajib diawali http:// atau https://.');
  assert_(token.length >= 32, 'INVALID_NAS_TOKEN', 'Token NAS minimal 32 karakter.');
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('NAS_GATEWAY_URL', endpoint);
  properties.setProperty('NAS_GATEWAY_TOKEN', token);
  logAudit_(payload._session.user.UserId, 'SET_NAS_CONFIGURATION', 'SYSTEM', 'NAS', { endpoint: endpoint });
  return { configured: true, endpoint: endpoint };
}

function testNasConnection_(payload) {
  requireAdmin_(payload);
  var properties = PropertiesService.getScriptProperties();
  var endpoint = String(payload.endpoint || properties.getProperty('NAS_GATEWAY_URL') || '').trim().replace(/\/+$/, '');
  var token = String(payload.token || properties.getProperty('NAS_GATEWAY_TOKEN') || '').trim();
  assert_(/^https?:\/\//i.test(endpoint), 'INVALID_NAS_URL', 'Isi alamat gateway NAS terlebih dahulu.');
  assert_(token, 'INVALID_NAS_TOKEN', 'Isi token gateway NAS terlebih dahulu.');
  var response = UrlFetchApp.fetch(endpoint + '/api/kebersihan/status', {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var text = response.getContentText();
  assert_(code >= 200 && code < 300, 'NAS_CONNECTION_FAILED',
    'Gateway NAS belum dapat dihubungi atau token ditolak (HTTP ' + code + '). Respons: ' + text.slice(0, 300));
  var parsed;
  try { parsed = JSON.parse(text); } catch (error) { parsed = {}; }
  return {
    connected: true,
    endpoint: endpoint,
    storageRoot: parsed.storageRoot || '',
    availableBytes: Number(parsed.availableBytes || 0)
  };
}

/**
 * Dapat dijalankan langsung dari editor Apps Script setelah konfigurasi disimpan.
 */
function testMonitoringNasConnection() {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = properties.getProperty('NAS_GATEWAY_URL');
  var token = properties.getProperty('NAS_GATEWAY_TOKEN');
  assert_(endpoint && token, 'NAS_NOT_CONFIGURED', 'Simpan konfigurasi NAS dari menu admin terlebih dahulu.');
  var response = UrlFetchApp.fetch(endpoint.replace(/\/+$/, '') + '/api/kebersihan/status', {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  console.log('NAS HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
  return response.getContentText();
}

function enqueueNasBackup_(inspectionId) {
  var inspection = findBy_('INSPECTIONS', 'InspectionId', inspectionId);
  if (!inspection) return;
  appendObject_('BACKUP_QUEUE', {
    QueueId: id_('QUEUE'), InspectionId: inspectionId, EventType: 'INSPECTION',
    PayloadJson: JSON.stringify({ inspectionId: inspectionId }), Status: 'PENDING',
    AttemptCount: 0, LastError: '', CreatedAt: nowIso_(), UpdatedAt: nowIso_()
  });
}

function retryNasBackup_(payload) {
  requireAdmin_(payload);
  var target = String(payload.inspectionId || '');
  var pending = rowsAsObjects_('BACKUP_QUEUE').filter(function(row) {
    return (!target || row.InspectionId === target) && row.Status !== 'SYNCED';
  });
  var result = { attempted: 0, synced: 0, failed: 0 };
  pending.forEach(function(row) {
    result.attempted++;
    try {
      processNasBackup_(row.InspectionId);
      result.synced++;
    } catch (error) {
      result.failed++;
    }
  });
  return result;
}

function processPendingNasBackups() {
  rowsAsObjects_('BACKUP_QUEUE').filter(function(row) {
    return row.Status !== 'SYNCED' && Number(row.AttemptCount || 0) < 12;
  }).slice(0, 10).forEach(function(row) {
    try { processNasBackup_(row.InspectionId); } catch (error) { console.warn(error); }
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
  processPendingNasBackups();
}

function runScheduledNasBackup() {
  processPendingNasBackups();
  processNasSpreadsheetSnapshot_();
}

function backupSpreadsheetNow_(payload) {
  requireAdmin_(payload);
  return processNasSpreadsheetSnapshot_();
}

function processNasSpreadsheetSnapshot_() {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = properties.getProperty('NAS_GATEWAY_URL');
  var token = properties.getProperty('NAS_GATEWAY_TOKEN');
  if (!endpoint || !token) return { skipped: true, reason: 'NAS_NOT_CONFIGURED' };
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  var url = 'https://www.googleapis.com/drive/v3/files/' + spreadsheetId +
    '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var exported = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
  var createdAt = nowIso_();
  var response = UrlFetchApp.fetch(endpoint + '/api/kebersihan/snapshot', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': 'SNAPSHOT-' + todayKey_() },
    payload: JSON.stringify({
      createdAt: createdAt,
      fileName: 'Monitoring Kebersihan Database ' + todayKey_() + '.xlsx',
      base64: Utilities.base64Encode(exported.getBytes())
    }),
    muteHttpExceptions: true
  });
  assert_(response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    'NAS_SNAPSHOT_FAILED', 'Snapshot database gagal dicadangkan (HTTP ' + response.getResponseCode() + ').');
  return { synced: true, createdAt: createdAt, bytes: exported.getBytes().length };
}

function processNasBackup_(inspectionId) {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = properties.getProperty('NAS_GATEWAY_URL');
  var token = properties.getProperty('NAS_GATEWAY_TOKEN');
  if (!endpoint || !token) return { skipped: true, reason: 'NAS_NOT_CONFIGURED' };

  var inspection = findBy_('INSPECTIONS', 'InspectionId', inspectionId);
  assert_(inspection, 'NOT_FOUND', 'Data pemeriksaan tidak ditemukan.');
  var room = findBy_('ROOMS', 'RoomId', inspection.RoomId);
  var user = findBy_('USERS', 'UserId', inspection.UserId);
  var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
  var details = rowsAsObjects_('INSPECTION_DETAILS').filter(function(row) {
    return row.InspectionId === inspectionId;
  }).map(function(row) {
    var activity = findBy_('ACTIVITIES', 'ActivityId', row.ActivityId);
    return {
      activityId: row.ActivityId, name: activity ? activity.Name : '',
      qualityResult: row.QualityResult, qualityLabel: row.QualityLabel,
      functionResult: row.FunctionResult, functionLabel: row.FunctionLabel, note: row.Note
    };
  });
  var evidenceBlob = DriveApp.getFileById(inspection.EvidenceFileId).getBlob();
  var body = {
    schemaVersion: 1,
    inspection: {
      inspectionId: inspection.InspectionId, dateKey: inspection.DateKey,
      weekStart: inspection.WeekStart, dayNumber: Number(inspection.DayNumber),
      room: { id: room.RoomId, code: room.Code, name: room.Name, type: room.RoomTypeId },
      slot: { id: slot.SlotId, code: slot.Code, name: slot.Name },
      officer: { id: user.UserId, username: user.Username, fullName: user.FullName, role: user.Role },
      scannedAt: inspection.ScannedAt, submittedAt: inspection.SubmittedAt,
      overallStatus: inspection.OverallStatus, dirtyCount: Number(inspection.DirtyCount || 0),
      details: details
    },
    evidence: {
      fileName: evidenceBlob.getName(), contentType: evidenceBlob.getContentType(),
      base64: Utilities.base64Encode(evidenceBlob.getBytes())
    }
  };

  var queue = rowsAsObjects_('BACKUP_QUEUE').filter(function(row) {
    return row.InspectionId === inspectionId && row.Status !== 'SYNCED';
  }).sort(function(a, b) { return new Date(b.CreatedAt) - new Date(a.CreatedAt); })[0];
  try {
    var response = UrlFetchApp.fetch(endpoint + '/api/kebersihan/inspection', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(body),
      headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': inspectionId },
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    assert_(code >= 200 && code < 300, 'NAS_BACKUP_FAILED', 'Gateway NAS merespons HTTP ' + code + '.');
    if (queue) updateObjectRow_('BACKUP_QUEUE', queue._row, {
      Status: 'SYNCED', AttemptCount: Number(queue.AttemptCount || 0) + 1,
      LastError: '', UpdatedAt: nowIso_()
    });
    updateObjectRow_('INSPECTIONS', inspection._row, { BackupStatus: 'SYNCED', BackupUpdatedAt: nowIso_() });
    return { synced: true };
  } catch (error) {
    if (queue) updateObjectRow_('BACKUP_QUEUE', queue._row, {
      Status: 'FAILED', AttemptCount: Number(queue.AttemptCount || 0) + 1,
      LastError: safeCellText_(String(error.message || error).slice(0, 1000)), UpdatedAt: nowIso_()
    });
    updateObjectRow_('INSPECTIONS', inspection._row, { BackupStatus: 'FAILED', BackupUpdatedAt: nowIso_() });
    throw error;
  }
}
