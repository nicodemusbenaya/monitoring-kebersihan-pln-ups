function isApplicationReady_() {
  return Boolean(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw appError_('NOT_CONFIGURED', 'Aplikasi belum disiapkan.');
  }
  return SpreadsheetApp.openById(id);
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

function rowsAsObjects_(sheetName) {
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

function appendObject_(sheetName, object) {
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(header) {
    return object[header] === undefined ? '' : object[header];
  }));
}

function appendObjects_(sheetName, objects) {
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

function updateObjectRow_(sheetName, rowNumber, updates) {
  var sheet = getSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach(function(header, index) {
    if (updates[header] !== undefined) values[index] = updates[header];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
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
    return {
      activityId: activity.ActivityId,
      name: activity.Name,
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
  var item = rowsAsObjects_('SETTINGS').find(function(row) { return row.Key === key; });
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
