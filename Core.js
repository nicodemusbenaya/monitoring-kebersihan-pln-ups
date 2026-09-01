var APP_SPREADSHEET_HANDLE_ = null;
var APP_SPREADSHEET_HANDLE_ID_ = '';

function isApplicationReady_() {
  return Boolean(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw appError_('NOT_CONFIGURED', 'Aplikasi belum disiapkan.');
  }
  if (!APP_SPREADSHEET_HANDLE_ || APP_SPREADSHEET_HANDLE_ID_ !== id) {
    APP_SPREADSHEET_HANDLE_ = SpreadsheetApp.openById(id);
    APP_SPREADSHEET_HANDLE_ID_ = id;
  }
  return APP_SPREADSHEET_HANDLE_;
}

function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw appError_('SHEET_NOT_FOUND', 'Sheet ' + name + ' tidak ditemukan.');
  }
  return sheet;
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var width = Math.max(sheet.getLastColumn(), 1);
    var current = sheet.getRange(1, 1, 1, width).getValues()[0];
    headers.forEach(function(header, index) {
      if (current.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      }
    });
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureDriveFolders_(properties) {
  var rootId = properties.getProperty('ROOT_FOLDER_ID');
  var root = rootId ? DriveApp.getFolderById(rootId) : DriveApp.createFolder(APP.NAME);
  properties.setProperty('ROOT_FOLDER_ID', root.getId());

  var photoId = properties.getProperty('PHOTO_FOLDER_ID');
  if (!photoId) {
    properties.setProperty('PHOTO_FOLDER_ID', root.createFolder('Evidence Pemeriksaan').getId());
  }
  var reportId = properties.getProperty('REPORT_FOLDER_ID');
  if (!reportId) {
    properties.setProperty('REPORT_FOLDER_ID', root.createFolder('Laporan Export').getId());
  }
}

function ensurePepper_(properties) {
  if (!properties.getProperty('PASSWORD_PEPPER')) {
    properties.setProperty('PASSWORD_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  }
}

function rowsAsSheetObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.some(function(value) { return value !== ''; });
  }).map(function(row, rowIndex) {
    var object = { _row: rowIndex + 2 };
    headers.forEach(function(header, index) {
      object[header] = serializeCell_(row[index], header);
    });
    return object;
  });
}

function primaryDatabaseConfigured_() {
  // MariaDB tidak lagi menjadi sumber data aplikasi. Fungsi ini dipertahankan
  // hanya agar deployment lama gagal secara aman alih-alih kembali memakai NAS
  // sebagai database ketika endpoint evidence dikonfigurasi.
  return false;
}

function applicationDatabaseMode_() {
  var properties = PropertiesService.getScriptProperties();
  return String(properties.getProperty('DATABASE_MODE') ||
    properties.getProperty('PRIMARY_STORAGE_MODE') || 'SPREADSHEET').toUpperCase();
}

function propertyFlag_(name, defaultValue) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (value === null || value === '') return Boolean(defaultValue);
  return truthy_(value);
}

function nasGatewayConfigured_() {
  var properties = PropertiesService.getScriptProperties();
  return Boolean(properties.getProperty('NAS_GATEWAY_URL') && properties.getProperty('NAS_GATEWAY_TOKEN'));
}

function isNasCircuitOpen_() {
  if (PRIMARY_DATABASE_CIRCUIT_OPEN_) return true;
  try {
    var cached = CacheService.getScriptCache().get(PRIMARY_DATABASE_CIRCUIT_KEY_);
    if (cached === '1') {
      PRIMARY_DATABASE_CIRCUIT_OPEN_ = true;
      return true;
    }
  } catch (e) {}
  return false;
}

function tripNasCircuit_() {
  PRIMARY_DATABASE_CIRCUIT_OPEN_ = true;
  try {
    CacheService.getScriptCache().put(PRIMARY_DATABASE_CIRCUIT_KEY_, '1', PRIMARY_DATABASE_CIRCUIT_SECONDS_);
  } catch (e) {}
}

function resetNasCircuit_() {
  PRIMARY_DATABASE_CIRCUIT_OPEN_ = false;
  try {
    CacheService.getScriptCache().remove(PRIMARY_DATABASE_CIRCUIT_KEY_);
  } catch (e) {}
}

function nasEvidenceEnabled_() {
  if (isNasCircuitOpen_()) return false;
  return propertyFlag_('NAS_EVIDENCE_ENABLED', true) && nasGatewayConfigured_();
}

function nasSheetBackupEnabled_() {
  if (isNasCircuitOpen_()) return false;
  return propertyFlag_('NAS_SHEET_BACKUP_ENABLED', true) && nasGatewayConfigured_();
}

function driveEvidenceFallbackEnabled_() {
  return propertyFlag_('DRIVE_EVIDENCE_FALLBACK_ENABLED', true);
}

var PRIMARY_ROWS_MEMORY_ = {};
var LOCAL_ROWS_MEMORY_ = {};
var PRIMARY_DATABASE_CIRCUIT_OPEN_ = false;
var PRIMARY_DATABASE_CIRCUIT_KEY_ = 'MONITORING_NAS_CIRCUIT_OPEN';
var PRIMARY_DATABASE_CIRCUIT_SECONDS_ = 300;
var LOCAL_STATIC_ROWS_CACHE_SECONDS_ = 120;
var LOCAL_STATIC_ROWS_CACHE_SHEETS_ = {
  ROOMS: true,
  ROOM_TYPES: true,
  SLOTS: true,
  ACTIVITIES: true,
  EVALUATION_ASPECTS: true,
  SETTINGS: true
};

function localRowsCacheKey_(sheetName) {
  return 'MONITORING_LOCAL_ROWS_' + String(sheetName || '').toUpperCase();
}

function readLocalStaticRowsCache_(sheetName) {
  if (!LOCAL_STATIC_ROWS_CACHE_SHEETS_[sheetName]) return null;
  try {
    var cached = CacheService.getScriptCache().get(localRowsCacheKey_(sheetName));
    if (!cached) return null;
    var parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writeLocalStaticRowsCache_(sheetName, rows) {
  if (!LOCAL_STATIC_ROWS_CACHE_SHEETS_[sheetName]) return;
  try {
    var serialized = JSON.stringify(rows || []);
    if (serialized.length < 95000) {
      CacheService.getScriptCache().put(localRowsCacheKey_(sheetName), serialized, LOCAL_STATIC_ROWS_CACHE_SECONDS_);
    }
  } catch (error) {}
}

function rowsAsLocalObjects_(sheetName) {
  var memory = LOCAL_ROWS_MEMORY_[sheetName];
  if (memory && Date.now() - memory.at < 5000) return memory.rows;
  var cached = readLocalStaticRowsCache_(sheetName);
  if (cached) {
    LOCAL_ROWS_MEMORY_[sheetName] = { at: Date.now(), rows: cached };
    return cached;
  }
  var rows = rowsAsSheetObjects_(sheetName);
  LOCAL_ROWS_MEMORY_[sheetName] = { at: Date.now(), rows: rows };
  writeLocalStaticRowsCache_(sheetName, rows);
  return rows;
}

function rowsAsLocalObjectsBatch_(sheetNames) {
  var result = {};
  (sheetNames || []).filter(function(name, index, list) {
    return name && list.indexOf(name) === index;
  }).forEach(function(name) {
    result[name] = rowsAsLocalObjects_(name);
  });
  return result;
}

function rowsAsLocalObjectsBatchDirect_(sheetNames) {
  var result = {};
  (sheetNames || []).filter(function(name, index, list) {
    return name && list.indexOf(name) === index;
  }).forEach(function(name) {
    result[name] = rowsAsSheetObjects_(name);
  });
  return result;
}

function primaryDatabaseCircuitOpen_() {
  if (PRIMARY_DATABASE_CIRCUIT_OPEN_) return true;
  try {
    PRIMARY_DATABASE_CIRCUIT_OPEN_ = CacheService.getScriptCache().get(PRIMARY_DATABASE_CIRCUIT_KEY_) === '1';
  } catch (error) {}
  return PRIMARY_DATABASE_CIRCUIT_OPEN_;
}

function openPrimaryDatabaseCircuit_() {
  PRIMARY_DATABASE_CIRCUIT_OPEN_ = true;
  try { CacheService.getScriptCache().put(PRIMARY_DATABASE_CIRCUIT_KEY_, '1', PRIMARY_DATABASE_CIRCUIT_SECONDS_); } catch (error) {}
}

function resetPrimaryDatabaseCircuit_() {
  PRIMARY_DATABASE_CIRCUIT_OPEN_ = false;
  try { CacheService.getScriptCache().remove(PRIMARY_DATABASE_CIRCUIT_KEY_); } catch (error) {}
}

function invalidatePrimaryRows_(sheetName) {
  delete PRIMARY_ROWS_MEMORY_[sheetName];
  delete LOCAL_ROWS_MEMORY_[sheetName];
  if (LOCAL_STATIC_ROWS_CACHE_SHEETS_[sheetName]) {
    try { CacheService.getScriptCache().remove(localRowsCacheKey_(sheetName)); } catch (error) {}
  }
}

function primaryDatabaseRequest_(path, options) {
  throw appError_('MARIADB_DISABLED', 'MariaDB dinonaktifkan. Database aplikasi menggunakan Google Spreadsheet.');
}

function nasGatewayRequest_(path, options) {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = String(properties.getProperty('NAS_GATEWAY_URL') || '').replace(/\/+$/, '');
  var token = String(properties.getProperty('NAS_GATEWAY_TOKEN') || '');
  assert_(endpoint && token, 'NAS_NOT_CONFIGURED', 'Gateway NAS belum dikonfigurasi.');
  options = options || {};
  var request = {
    method: options.method || 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  };
  if (options.payload !== undefined) {
    request.contentType = 'application/json';
    request.payload = JSON.stringify(options.payload);
  }
  var response;
  try {
    response = UrlFetchApp.fetch(endpoint + path, request);
  } catch (error) {
    throw appError_('NAS_UNAVAILABLE', 'Gateway NAS tidak dapat dijangkau: ' + error.message);
  }
  var status = response.getResponseCode();
  var text = response.getContentText();
  var parsed;
  try { parsed = JSON.parse(text); } catch (error) { parsed = {}; }
  if (status < 200 || status >= 300 || parsed.ok === false) {
    throw appError_('NAS_UNAVAILABLE', parsed.message || ('Gateway NAS merespons HTTP ' + status + '.'));
  }
  return parsed;
}

function rowsAsObjects_(sheetName) {
  return sheetName === 'BACKUP_QUEUE' ? rowsAsSheetObjects_(sheetName) : rowsAsLocalObjects_(sheetName);
}

function rowsAsObjectsBatch_(sheetNames) {
  var names = (sheetNames || []).filter(function(name, index, list) {
    return name && list.indexOf(name) === index;
  });
  var result = {};
  names.forEach(function(name) {
    result[name] = name === 'BACKUP_QUEUE' ? rowsAsSheetObjects_(name) : rowsAsLocalObjects_(name);
  });
  return result;
}

function sheetAppendObject_(sheetName, object) {
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(header) {
    return object[header] === undefined ? '' : object[header];
  }));
}

function sheetAppendObjects_(sheetName, objects) {
  if (!objects || !objects.length) return;
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = objects.map(function(object) {
    return headers.map(function(header) {
      return object[header] === undefined ? '' : object[header];
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function resolveSheetRow_(sheetName, rowReference) {
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (typeof rowReference === 'number' && rowReference >= 2) return rowReference;
  var key = APP.PRIMARY_KEYS[sheetName];
  var keyIndex = headers.indexOf(key);
  if (keyIndex === -1) return 0;
  var values = sheet.getDataRange().getValues();
  for (var index = 1; index < values.length; index++) {
    if (String(values[index][keyIndex]) === String(rowReference)) return index + 1;
  }
  return 0;
}

function sheetUpdateObject_(sheetName, rowReference, updates) {
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowNumber = resolveSheetRow_(sheetName, rowReference);
  if (!rowNumber) return false;
  var values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach(function(header, index) {
    if (updates[header] !== undefined) values[index] = updates[header];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  return true;
}

function mirrorUpsert_(sheetName, object) {
  var key = APP.PRIMARY_KEYS[sheetName];
  var keyValue = key ? object[key] : '';
  var rowNumber = keyValue === undefined ? 0 : resolveSheetRow_(sheetName, String(keyValue));
  if (rowNumber) sheetUpdateObject_(sheetName, rowNumber, object);
  else sheetAppendObject_(sheetName, object);
}

function localQueueMutation_(eventType, payload, inspectionId) {
  if (!getSpreadsheet_().getSheetByName('BACKUP_QUEUE')) return;
  sheetAppendObject_('BACKUP_QUEUE', {
    QueueId: id_('QUEUE'), InspectionId: inspectionId || '', EventType: eventType,
    PayloadJson: JSON.stringify(payload || {}), Status: 'PENDING', AttemptCount: 0,
    LastError: '', CreatedAt: nowIso_(), UpdatedAt: nowIso_()
  });
}

function appendObject_(sheetName, object) {
  sheetAppendObject_(sheetName, object);
  invalidatePrimaryRows_(sheetName);
}

function appendObjectDeferredPrimary_(sheetName, object) {
  // Nama fungsi dipertahankan untuk kompatibilitas. Spreadsheet adalah satu-
  // satunya database dan menerima data secara langsung.
  sheetAppendObject_(sheetName, object);
  invalidatePrimaryRows_(sheetName);
}

function appendObjects_(sheetName, objects) {
  if (!objects || !objects.length) return;
  sheetAppendObjects_(sheetName, objects);
  invalidatePrimaryRows_(sheetName);
}

function appendTransaction_(mutations) {
  mutations = Array.isArray(mutations) ? mutations : [];
  mutations.forEach(function(mutation) {
    sheetAppendObjects_(mutation.table, mutation.rows || []);
    invalidatePrimaryRows_(mutation.table);
  });
}

function updateObjectRow_(sheetName, rowReference, updates) {
  var keyValue = rowReference;
  if (typeof rowReference === 'number' && sheetName !== 'BACKUP_QUEUE') {
    var keyName = APP.PRIMARY_KEYS[sheetName];
    var sheet = getSheet_(sheetName);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var keyIndex = headers.indexOf(keyName);
    if (keyIndex >= 0 && rowReference <= sheet.getLastRow()) keyValue = sheet.getRange(rowReference, keyIndex + 1).getValue();
  }
  invalidatePrimaryRows_(sheetName);
  sheetUpdateObject_(sheetName, sheetName === 'BACKUP_QUEUE' ? rowReference : String(keyValue), updates);
}

function deleteObject_(sheetName, rowReference) {
  var rowNumber = resolveSheetRow_(sheetName, rowReference);
  invalidatePrimaryRows_(sheetName);
  if (rowNumber) getSheet_(sheetName).deleteRow(rowNumber);
}

function findBy_(sheetName, key, value) {
  var target = String(value);
  return rowsAsObjects_(sheetName).find(function(item) {
    return String(item[key]) === target;
  }) || null;
}

function findActiveRoomByToken_(token) {
  return rowsAsObjects_('ROOMS').find(function(room) {
    return String(room.QrToken) === String(token) && truthy_(room.Active);
  }) || null;
}

function findActiveRoomById_(roomId) {
  return rowsAsObjects_('ROOMS').find(function(room) {
    return String(room.RoomId) === String(roomId) && truthy_(room.Active);
  }) || null;
}

function getRoomActivities_(roomId) {
  var maps = rowsAsObjects_('ROOM_ACTIVITIES').filter(function(map) {
    return String(map.RoomId) === String(roomId) && truthy_(map.Active);
  });
  var activities = rowsAsObjects_('ACTIVITIES').filter(function(activity) {
    return truthy_(activity.Active);
  });
  var activityMap = {};
  activities.forEach(function(activity) { activityMap[activity.ActivityId] = activity; });
  return maps.map(function(map) {
    var activity = activityMap[map.ActivityId];
    if (!activity) return null;
    var seededStandard = monitoringStandardFor_(activity.RoomTypeId, activity.Name);
    return {
      activityId: activity.ActivityId,
      name: activity.Name,
      standardCategory: activity.StandardCategory || seededStandard.category,
      standardText: activity.StandardText || seededStandard.text,
      sortOrder: Number(map.SortOrder || activity.SortOrder || 0)
    };
  }).filter(Boolean).sort(sortByOrder_);
}

function seedSettings_() {
  var defaults = {
    APP_NAME: APP.NAME,
    INSTITUTION: APP.INSTITUTION,
    TIMEZONE: APP.TIMEZONE,
    LOGO_URL: APP.LOGO_URL
  };
  var existing = rowsAsObjects_('SETTINGS');
  Object.keys(defaults).forEach(function(key) {
    if (!existing.some(function(item) { return item.Key === key; })) {
      appendObject_('SETTINGS', { Key: key, Value: defaults[key], UpdatedAt: nowIso_() });
    }
  });
}

function seedRoomsAndActivities_() {
  throw appError_('LEGACY_SEED_DISABLED',
    'Seed ruangan legacy dinonaktifkan agar tidak membuat token pengganti untuk QR lama.');
  var rooms = rowsAsObjects_('ROOMS');
  var activities = rowsAsObjects_('ACTIVITIES');
  var now = nowIso_();

  [
    ['UPS', 'Ruangan UPS'],
    ['ARSIP', 'Ruang Arsip'],
    ['RAPAT', 'Ruang Rapat']
  ].forEach(function(item, index) {
    if (!rooms.some(function(room) { return room.Code === item[0]; })) {
      appendObject_('ROOMS', {
        RoomId: id_('ROOM'),
        Code: item[0],
        Name: item[1],
        QrToken: secureToken_(),
        Active: true,
        SortOrder: index + 1,
        CreatedAt: now,
        UpdatedAt: now
      });
    }
  });
  rooms = rowsAsObjects_('ROOMS');

  [
    'Membersihkan langit-langit',
    'Menyapu lantai',
    'Memilah dan membuang sampah',
    'Mengepel lantai dan membersihkan kaca',
    'Membersihkan kamar mandi, wastafel, menguras bak, dan membersihkan dinding',
    'Menyemprot pewangi ruangan',
    'Membersihkan kursi, meja, dan peralatan lain'
  ].forEach(function(name, index) {
    if (!activities.some(function(activity) { return activity.Name === name; })) {
      appendObject_('ACTIVITIES', {
        ActivityId: id_('ACT'),
        Name: name,
        Active: true,
        SortOrder: index + 1,
        CreatedAt: now,
        UpdatedAt: now
      });
    }
  });
  activities = rowsAsObjects_('ACTIVITIES');

  var maps = rowsAsObjects_('ROOM_ACTIVITIES');
  rooms.forEach(function(room) {
    activities.forEach(function(activity, index) {
      if (!maps.some(function(map) { return map.RoomId === room.RoomId && map.ActivityId === activity.ActivityId; })) {
        appendObject_('ROOM_ACTIVITIES', {
          MapId: id_('MAP'),
          RoomId: room.RoomId,
          ActivityId: activity.ActivityId,
          Active: true,
          SortOrder: index + 1,
          CreatedAt: now,
          UpdatedAt: now
        });
      }
    });
  });
}

function formatDatabase_() {
  var ss = getSpreadsheet_();
  Object.keys(APP.SHEETS).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    var lastColumn = Math.max(sheet.getLastColumn(), APP.SHEETS[name].length);
    sheet.getRange(1, 1, 1, lastColumn)
      .setBackground(APP.COLORS.blue)
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.autoResizeColumns(1, lastColumn);
  });
}

function logAudit_(userId, action, entityType, entityId, detail) {
  appendObject_('AUDIT_LOG', {
    AuditId: id_('AUD'),
    UserId: userId || '',
    Action: action,
    EntityType: entityType || '',
    EntityId: entityId || '',
    Detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}),
    CreatedAt: nowIso_()
  });
}

function getSetting_(key, fallback) {
  var item = rowsAsLocalObjects_('SETTINGS').find(function(row) { return row.Key === key; });
  return item ? item.Value : fallback;
}

function id_(prefix) {
  return prefix + '-' + Utilities.getUuid();
}

function secureToken_() {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Utilities.getUuid() + new Date().getTime(),
    Utilities.Charset.UTF_8
  )).replace(/=+$/g, '');
}

function hash_(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte) {
    var normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function nowIso_() {
  return new Date().toISOString();
}

function todayKey_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd');
}

function monthKey_() {
  return Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM');
}

function displayDateTime_(value) {
  if (!value) return '';
  return Utilities.formatDate(new Date(value), APP.TIMEZONE, 'dd MMM yyyy, HH:mm');
}

function serializeCell_(value, header) {
  if (value instanceof Date) {
    if (header === 'DateKey') {
      return Utilities.formatDate(value, APP.TIMEZONE, 'yyyy-MM-dd');
    }
    return value.toISOString();
  }
  return value;
}

function truthy_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
}

function sortByOrder_(a, b) {
  return Number(a.sortOrder || a.SortOrder || 0) - Number(b.sortOrder || b.SortOrder || 0);
}

function appError_(code, message) {
  var error = new Error(message);
  error.code = code;
  return error;
}

function assert_(condition, code, message) {
  if (!condition) throw appError_(code, message);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeCellText_(value) {
  var text = String(value === undefined || value === null ? '' : value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
