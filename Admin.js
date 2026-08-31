function getDashboard_(payload) {
  requireAdmin_(payload);
  return buildDashboard_(String(payload.month || monthKey_()));
}

function buildDashboard_(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) month = monthKey_();
  var allRooms = rowsAsObjects_('ROOMS');
  var hiddenRoomMap = sharedHiddenRoomMap_();
  var rooms = allRooms.filter(function(room) {
    return truthy_(room.Active) && !hiddenRoomMap[String(room.RoomId)];
  }).sort(sortByOrder_);
  var users = rowsAsObjects_('USERS');
  var userMap = {};
  users.forEach(function(user) { userMap[user.UserId] = user; });
  var roomMap = {};
  allRooms.forEach(function(room) { roomMap[room.RoomId] = room; });
  var activities = rowsAsObjects_('ACTIVITIES');
  var activityMap = {};
  activities.forEach(function(activity) { activityMap[activity.ActivityId] = activity; });

  var allSubmitted = rowsAsObjects_('INSPECTIONS').filter(function(item) {
    return String(item.State) === 'SUBMITTED';
  });
  var inspections = allSubmitted.filter(function(item) {
    return String(item.DateKey).indexOf(month) === 0;
  }).sort(function(a, b) {
    return new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime();
  });
  var details = rowsAsObjects_('INSPECTION_DETAILS');
  var detailMap = {};
  details.forEach(function(detail) {
    if (!detailMap[detail.InspectionId]) detailMap[detail.InspectionId] = [];
    detailMap[detail.InspectionId].push(detail);
  });

  var todayInspections = allSubmitted.filter(function(item) { return item.DateKey === todayKey_(); });
  var todayByRoom = {};
  todayInspections.forEach(function(item) {
    if (!todayByRoom[item.RoomId]) todayByRoom[item.RoomId] = item;
  });
  var todayRooms = rooms.map(function(room) {
    var inspection = todayByRoom[room.RoomId];
    return {
      roomId: room.RoomId,
      roomName: room.Name,
      status: inspection ? inspection.OverallStatus : 'BELUM_DIPERIKSA',
      inspectionId: inspection ? inspection.InspectionId : '',
      submittedAt: inspection ? inspection.SubmittedAt : '',
      displayTime: inspection ? displayDateTime_(inspection.SubmittedAt) : '',
      officerName: inspection && userMap[inspection.UserId] ? userMap[inspection.UserId].FullName : ''
    };
  });

  var dirtyFindings = [];
  inspections.forEach(function(inspection) {
    (detailMap[inspection.InspectionId] || []).forEach(function(detail) {
      var isDirty = detail.Status === 'TIDAK_BERSIH' || detail.FuncStatus === 'TIDAK_BERFUNGSI';
      if (!isDirty) return;
      dirtyFindings.push({
        detailId: detail.DetailId,
        inspectionId: inspection.InspectionId,
        dateKey: inspection.DateKey,
        roomName: roomMap[inspection.RoomId] ? roomMap[inspection.RoomId].Name : 'Ruangan',
        activityName: activityMap[detail.ActivityId] ? activityMap[detail.ActivityId].Name : 'Kegiatan',
        note: detail.Note,
        photoFileId: detail.PhotoFileId,
        officerName: userMap[inspection.UserId] ? userMap[inspection.UserId].FullName : 'Petugas',
        correctedAt: detail.CorrectedAt || '',
        status: detail.Status,
        funcStatus: detail.FuncStatus || 'BERFUNGSI'
      });
    });
  });

  var daily = {};
  inspections.forEach(function(item) {
    if (!daily[item.DateKey]) daily[item.DateKey] = { dateKey: item.DateKey, total: 0, clean: 0, dirty: 0 };
    daily[item.DateKey].total++;
    if (item.OverallStatus === 'BERSIH') daily[item.DateKey].clean++;
    else daily[item.DateKey].dirty++;
  });

  return {
    month: month,
    today: todayKey_(),
    summary: {
      totalRooms: rooms.length,
      checkedToday: todayInspections.length,
      pendingToday: Math.max(0, rooms.length - todayInspections.length),
      dirtyToday: todayInspections.filter(function(item) { return item.OverallStatus === 'ADA_TEMUAN'; }).length,
      inspectionsThisMonth: inspections.length
    },
    todayRooms: todayRooms,
    dirtyFindings: dirtyFindings,
    daily: Object.keys(daily).sort().map(function(key) { return daily[key]; }),
    inspections: inspections.map(function(item) {
      return {
        inspectionId: item.InspectionId,
        dateKey: item.DateKey,
        roomName: roomMap[item.RoomId] ? roomMap[item.RoomId].Name : 'Ruangan',
        officerName: userMap[item.UserId] ? userMap[item.UserId].FullName : 'Petugas',
        scannedAt: item.ScannedAt,
        submittedAt: item.SubmittedAt,
        displayTime: displayDateTime_(item.SubmittedAt),
        overallStatus: item.OverallStatus,
        dirtyCount: Number(item.DirtyCount || 0)
      };
    })
  };
}

function getAdminData_(payload) {
  requireAdmin_(payload);
  var source = rowsAsObjectsBatch_(['ROOMS', 'ACTIVITIES', 'ROOM_ACTIVITIES', 'USERS', 'ROOM_TYPES']);
  var activeRooms = source.ROOMS.filter(function(room) { return truthy_(room.Active); });
  var hiddenRoomMap = sharedHiddenRoomMap_();
  var rooms = activeRooms.map(function(room) {
    return monitoringPublicRoom_(room, hiddenRoomMap);
  }).sort(sortByOrder_);
  var activities = source.ACTIVITIES.map(function(activity) {
    var seededStandard = monitoringStandardFor_(activity.RoomTypeId, activity.Name);
    return {
      activityId: activity.ActivityId,
      roomTypeId: activity.RoomTypeId,
      name: activity.Name,
      standardCategory: activity.StandardCategory || seededStandard.category,
      standardText: activity.StandardText || seededStandard.text,
      qualityApplicable: truthy_(activity.QualityApplicable),
      qualityPositive: activity.QualityPositive,
      qualityNegative: activity.QualityNegative,
      functionApplicable: truthy_(activity.FunctionApplicable),
      functionPositive: activity.FunctionPositive,
      functionNegative: activity.FunctionNegative,
      exportRow: Number(activity.ExportRow || 0),
      active: truthy_(activity.Active),
      sortOrder: Number(activity.SortOrder || 0)
    };
  }).sort(sortByOrder_);
  var maps = source.ROOM_ACTIVITIES.filter(function(map) {
    return truthy_(map.Active);
  }).map(function(map) {
    return {
      roomId: map.RoomId,
      activityId: map.ActivityId,
      sortOrder: Number(map.SortOrder || 0)
    };
  });
  var users = source.USERS.map(publicUser_);
  var roomTypes = source.ROOM_TYPES.filter(function(item) { return truthy_(item.Active); }).map(function(item) {
    return {
      roomTypeId: item.RoomTypeId,
      name: item.Name,
      templateSheet: item.TemplateSheet,
      workDays: item.WorkDays || 'Senin-Jumat',
      sortOrder: Number(item.SortOrder || 0),
      active: truthy_(item.Active)
    };
  }).sort(sortByOrder_);
  return { rooms: rooms, activities: activities, roomActivities: maps, users: users, roomTypes: roomTypes };
}

function saveRoom_(payload) {
  var session = requireAdmin_(payload);
  var data = payload.room || {};
  var name = safeCellText_(data.name);
  var code = String(data.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  var roomTypeId = String(data.roomTypeId || '');
  var sortOrder = Number(data.sortOrder);
  assert_(name && code, 'ROOM_REQUIRED', 'Kode dan nama ruangan wajib diisi.');
  assert_(findBy_('ROOM_TYPES', 'RoomTypeId', roomTypeId), 'ROOM_TYPE_REQUIRED', 'Pilih template ruangan.');
  assert_(/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(code), 'INVALID_ROOM_CODE', 'Kode ruangan harus diawali huruf atau angka dan maksimal 30 karakter.');
  assert_(Number.isInteger(sortOrder) && sortOrder > 0, 'INVALID_ROOM_ORDER', 'Nomor urut harus berupa bilangan bulat mulai dari 1.');
  var roomRows = rowsAsObjects_('ROOMS');
  var duplicate = roomRows.find(function(room) {
    return String(room.Code).toUpperCase() === code && String(room.RoomId) !== String(data.roomId || '');
  });
  assert_(!duplicate, 'DUPLICATE_ROOM', 'Kode ruangan sudah digunakan.');
  var duplicateOrder = roomRows.find(function(room) {
    return truthy_(room.Active) && data.active !== false && Number(room.SortOrder) === sortOrder &&
      String(room.RoomId) !== String(data.roomId || '');
  });
  assert_(!duplicateOrder, 'DUPLICATE_ROOM_ORDER', duplicateOrder ?
    'Nomor urut ' + sortOrder + ' sudah digunakan oleh ' + duplicateOrder.Name + '. Gunakan nomor lain atau pilih Rapikan urutan.' : 'Nomor urut sudah digunakan.');

  var roomId = String(data.roomId || '');
  if (roomId) {
    var room = findBy_('ROOMS', 'RoomId', roomId);
    assert_(room, 'ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.');
    assert_(!data.regenerateQr, 'QR_TOKEN_IMMUTABLE',
      'Token QR ruangan yang sudah ada tidak dapat dibuat ulang.');
    updateObjectRow_('ROOMS', room._row, {
      Code: code,
      Name: name,
      RoomTypeId: roomTypeId,
      Active: data.active !== false,
      SortOrder: sortOrder,
      UpdatedAt: nowIso_()
    });
  } else {
    roomId = id_('ROOM');
    var newQrToken = secureToken_();
    appendObject_('ROOMS', {
      RoomId: roomId,
      Code: code,
      Name: name,
      RoomTypeId: roomTypeId,
      QrToken: newQrToken,
      Active: data.active !== false,
      SortOrder: sortOrder,
      CreatedAt: nowIso_(),
      UpdatedAt: nowIso_()
    });
    registerRoomQrTokenBaseline_(roomId, newQrToken);
  }
  logAudit_(session.user.UserId, 'SAVE_ROOM', 'ROOM', roomId, { code: code, name: name });
  if (data.active === false) normalizeActiveRoomOrderRows_();
  return getAdminData_(payload);
}

function auditRoomQrIntegrity_(payload) {
  requireAdmin_(payload);
  return buildRoomQrIntegrityAudit_();
}

function runRoomQrReconciliationCheck() {
  var result = buildRoomQrIntegrityAudit_();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function buildRoomQrIntegrityAudit_(source) {
  source = source || {};
  var rooms = Array.isArray(source.ROOMS) ? source.ROOMS : rowsAsSheetObjects_('ROOMS');
  var roomTypes = Array.isArray(source.ROOM_TYPES) ? source.ROOM_TYPES : rowsAsSheetObjects_('ROOM_TYPES');
  var typeMap = {};
  roomTypes.forEach(function(type) { typeMap[String(type.RoomTypeId)] = type; });
  var tokenMap = {};
  var roomIdMap = {};
  var codeMap = {};
  var issues = [];

  rooms.forEach(function(room) {
    var token = String(room.QrToken || '').trim();
    var roomId = String(room.RoomId || '').trim();
    var code = String(room.Code || '').trim().toUpperCase();
    if (!token) issues.push({ severity: 'ERROR', code: 'QR_TOKEN_EMPTY', roomId: roomId, roomCode: code });
    else if (!/^[A-Za-z0-9_-]+$/.test(token)) {
      issues.push({ severity: 'ERROR', code: 'QR_TOKEN_FORMAT', roomId: roomId, roomCode: code });
    }
    if (!roomId) issues.push({ severity: 'ERROR', code: 'ROOM_ID_EMPTY', roomCode: code });
    if (!code) issues.push({ severity: 'ERROR', code: 'ROOM_CODE_EMPTY', roomId: roomId });
    if (!typeMap[String(room.RoomTypeId)]) {
      issues.push({ severity: 'ERROR', code: 'ROOM_TYPE_NOT_FOUND', roomId: roomId, roomCode: code });
    }
    if (token) (tokenMap[token] = tokenMap[token] || []).push(room);
    if (roomId) (roomIdMap[roomId] = roomIdMap[roomId] || []).push(room);
    if (code) (codeMap[code] = codeMap[code] || []).push(room);
  });

  [
    { map: tokenMap, issue: 'QR_TOKEN_DUPLICATE' },
    { map: roomIdMap, issue: 'ROOM_ID_DUPLICATE' },
    { map: codeMap, issue: 'ROOM_CODE_DUPLICATE' }
  ].forEach(function(check) {
    Object.keys(check.map).forEach(function(value) {
      if (check.map[value].length > 1) {
        issues.push({
          severity: 'ERROR', code: check.issue, value: value,
          roomIds: check.map[value].map(function(room) { return String(room.RoomId || ''); })
        });
      }
    });
  });

  var baseline = readRoomQrTokenBaseline_();
  Object.keys(baseline).forEach(function(roomId) {
    var current = rooms.find(function(room) { return String(room.RoomId) === String(roomId); });
    if (!current) {
      issues.push({ severity: 'ERROR', code: 'BASELINE_ROOM_MISSING', roomId: roomId });
    } else if (String(current.QrToken || '') !== String(baseline[roomId] || '')) {
      issues.push({
        severity: 'ERROR', code: 'QR_TOKEN_CHANGED', roomId: roomId,
        roomCode: String(current.Code || '')
      });
    }
  });

  return {
    ok: issues.filter(function(issue) { return issue.severity === 'ERROR'; }).length === 0,
    databaseMode: applicationDatabaseMode_(),
    roomCount: rooms.length,
    activeRoomCount: rooms.filter(function(room) { return truthy_(room.Active); }).length,
    uniqueTokenCount: Object.keys(tokenMap).length,
    baselineTokenCount: Object.keys(baseline).length,
    qrTokensChanged: false,
    issues: issues,
    checkedAt: nowIso_()
  };
}

var ROOM_QR_TOKEN_BASELINE_PROPERTY_ = 'ROOM_QR_TOKEN_BASELINE_V1';

function readRoomQrTokenBaseline_() {
  var value = PropertiesService.getScriptProperties().getProperty(ROOM_QR_TOKEN_BASELINE_PROPERTY_);
  if (!value) return {};
  try {
    var parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function captureRoomQrTokenBaseline_() {
  var baseline = {};
  rowsAsSheetObjects_('ROOMS').forEach(function(room) {
    if (room.RoomId && room.QrToken) baseline[String(room.RoomId)] = String(room.QrToken);
  });
  PropertiesService.getScriptProperties().setProperty(
    ROOM_QR_TOKEN_BASELINE_PROPERTY_, JSON.stringify(baseline));
  return Object.keys(baseline).length;
}

function registerRoomQrTokenBaseline_(roomId, token) {
  var properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty(ROOM_QR_TOKEN_BASELINE_PROPERTY_)) return;
  var baseline = readRoomQrTokenBaseline_();
  baseline[String(roomId)] = String(token);
  properties.setProperty(ROOM_QR_TOKEN_BASELINE_PROPERTY_, JSON.stringify(baseline));
}

function softDeleteRoom_(payload) {
  var session = requireAdmin_(payload);
  var roomId = String(payload.roomId || '');
  var room = findBy_('ROOMS', 'RoomId', roomId);
  assert_(room, 'ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.');
  assert_(truthy_(room.Active), 'ROOM_ALREADY_INACTIVE', 'Ruangan sudah dinonaktifkan.');
  updateObjectRow_('ROOMS', room._row, { Active: false, UpdatedAt: nowIso_() });
  normalizeActiveRoomOrderRows_();
  logAudit_(session.user.UserId, 'SOFT_DELETE_ROOM', 'ROOM', roomId, {
    code: room.Code,
    name: room.Name,
    qrTokenChanged: false
  });
  return getAdminData_(payload);
}

function normalizeActiveRoomOrderRows_() {
  var now = nowIso_();
  var rooms = rowsAsObjects_('ROOMS').sort(function(a, b) {
    var activeA = truthy_(a.Active) ? 0 : 1;
    var activeB = truthy_(b.Active) ? 0 : 1;
    if (activeA !== activeB) return activeA - activeB;
    var orderA = Number(a.SortOrder || 0);
    var orderB = Number(b.SortOrder || 0);
    if (orderA !== orderB) return orderA - orderB;
    return Number(a._row || 0) - Number(b._row || 0);
  });
  rooms.forEach(function(room, index) {
    updateObjectRow_('ROOMS', room._row, { SortOrder: index + 1, UpdatedAt: now });
  });
  return rooms.filter(function(room) { return truthy_(room.Active); }).length;
}

function restoreAllRoomsOnce_() {
  var properties = PropertiesService.getScriptProperties();
  var key = 'RESTORE_ALL_ROOMS_V2';
  if (properties.getProperty(key)) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (properties.getProperty(key)) return;
    ensureSheet_(getSpreadsheet_(), 'ROOMS', APP.SHEETS.ROOMS);
    var rooms = rowsAsObjects_('ROOMS');
    var restored = [];
    rooms.forEach(function(room) {
      var wasInactive = !truthy_(room.Active);
      if (!wasInactive) return;
      updateObjectRow_('ROOMS', room.RoomId, { Active: true, UpdatedAt: nowIso_() });
      restored.push({ roomId: room.RoomId, code: room.Code, name: room.Name });
    });
    normalizeActiveRoomOrderRows_();
    logAudit_('SYSTEM', 'RESTORE_ALL_ROOMS', 'ROOMS', 'ALL', {
      restoredCount: restored.length,
      qrTokensChanged: false
    });
    properties.setProperty(key, JSON.stringify({
      appliedAt: nowIso_(), restoredCount: restored.length, qrTokensChanged: false
    }));
  } finally {
    lock.releaseLock();
  }
}

function setRoomVisibility_(payload) {
  var session = requireAdmin_(payload);
  var roomId = String(payload.roomId || '');
  var hidden = Boolean(payload.hidden);
  var room = findBy_('ROOMS', 'RoomId', roomId);
  assert_(room, 'ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.');
  assert_(truthy_(room.Active), 'ROOM_INACTIVE', 'Ruangan tidak aktif dan tidak dapat diubah tampilannya.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var hiddenIds = sharedHiddenRoomIds_();
    var existingIndex = hiddenIds.indexOf(roomId);
    if (hidden && existingIndex === -1) hiddenIds.push(roomId);
    if (!hidden && existingIndex !== -1) hiddenIds.splice(existingIndex, 1);
    saveSharedHiddenRoomIds_(hiddenIds);
  } finally {
    lock.releaseLock();
  }
  logAudit_(session.user.UserId, hidden ? 'HIDE_ROOM' : 'UNHIDE_ROOM', 'ROOM', roomId, {
    code: room.Code, name: room.Name, qrTokenChanged: false
  });
  return getAdminData_(payload);
}

var SHARED_HIDDEN_ROOMS_SETTING_KEY_ = 'UI_HIDDEN_ROOM_IDS';

function sharedHiddenRoomIds_() {
  var setting = findBy_('SETTINGS', 'Key', SHARED_HIDDEN_ROOMS_SETTING_KEY_);
  if (!setting || !setting.Value) return [];
  try {
    var parsed = JSON.parse(String(setting.Value));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(function(item) { return String(item); }).filter(function(item, index, list) {
      return item && list.indexOf(item) === index;
    });
  } catch (error) {
    return [];
  }
}

function sharedHiddenRoomMap_() {
  var map = {};
  sharedHiddenRoomIds_().forEach(function(roomId) { map[String(roomId)] = true; });
  return map;
}

function saveSharedHiddenRoomIds_(roomIds) {
  var ids = (roomIds || []).map(function(item) { return String(item); }).filter(function(item, index, list) {
    return item && list.indexOf(item) === index;
  });
  var value = JSON.stringify(ids);
  var now = nowIso_();
  var setting = findBy_('SETTINGS', 'Key', SHARED_HIDDEN_ROOMS_SETTING_KEY_);
  if (setting) {
    updateObjectRow_('SETTINGS', setting._row, { Value: value, UpdatedAt: now });
  } else {
    appendObject_('SETTINGS', { Key: SHARED_HIDDEN_ROOMS_SETTING_KEY_, Value: value, UpdatedAt: now });
  }
}

function approvedOperationalRoomCodes_() {
  return [
    'SENIOR_MANAGER', 'TOILET_SENIOR_MANAGER', 'LOBBY', 'RAPAT',
    'TOILET_WANITA_GEDUNG_UTAMA', 'TOILET_PRIA_GEDUNG_UTAMA',
    'ATK_FAST_MOVING', 'ASET_SLOW_MOVING', 'WELLBEING', 'PMKU', 'PSA', 'PMA', 'PKSM',
    'PANTRY', 'LOBBY_TUK', 'TUK', 'ADMIN', 'PJT', 'RAPAT_KECIL_TUK',
    'TOILET_WANITA_TUK', 'TOILET_PRIA_TUK', 'RAPAT_DIGITAL_ZOOM',
    'ARSIP_AKTIF', 'ARSIP_UTAMA_INAKTIF'
  ];
}

/** Migrasi satu kali dari editor/clasp: nonaktifkan ruangan di luar daftar yang disetujui. */
function applyApprovedRoomListMigration() {
  throw appError_('ROOM_LIST_MIGRATION_DISABLED',
    'Migrasi daftar ruangan dinonaktifkan karena dapat membuat QR yang sudah dicetak menjadi tidak aktif.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var approved = {};
    approvedOperationalRoomCodes_().forEach(function(code) { approved[code] = true; });
    var rows = rowsAsObjects_('ROOMS').sort(sortByOrder_);
    var keeperByCode = {};
    rows.forEach(function(room) {
      var code = String(room.Code || '').toUpperCase();
      if (!approved[code]) return;
      if (!keeperByCode[code] || (!truthy_(keeperByCode[code].Active) && truthy_(room.Active))) keeperByCode[code] = room;
    });
    var deactivated = [];
    var activated = [];
    rows.forEach(function(room) {
      var code = String(room.Code || '').toUpperCase();
      var keep = approved[code] && keeperByCode[code] && String(keeperByCode[code].RoomId) === String(room.RoomId);
      if (keep && !truthy_(room.Active)) {
        updateObjectRow_('ROOMS', room._row, { Active: true, UpdatedAt: nowIso_() });
        activated.push({ roomId: room.RoomId, code: room.Code, name: room.Name });
      }
      if (!keep && truthy_(room.Active)) {
        updateObjectRow_('ROOMS', room._row, { Active: false, UpdatedAt: nowIso_() });
        deactivated.push({ roomId: room.RoomId, code: room.Code, name: room.Name });
      }
    });
    var activeCount = normalizeActiveRoomOrderRows_();
    logAudit_('SYSTEM', 'APPLY_APPROVED_ROOM_LIST', 'ROOMS', 'ALL', {
      activeCount: activeCount,
      activated: activated,
      deactivated: deactivated,
      qrTokensChanged: false
    });
    return { activeCount: activeCount, activated: activated, deactivated: deactivated, qrTokensChanged: false };
  } finally {
    lock.releaseLock();
  }
}

function applyApprovedRoomListOnce_() {
  throw appError_('ROOM_LIST_MIGRATION_DISABLED',
    'Migrasi daftar ruangan otomatis dinonaktifkan untuk mempertahankan seluruh QR aktif.');
  var properties = PropertiesService.getScriptProperties();
  var key = 'APPROVED_ROOM_LIST_MIGRATION_V1';
  if (properties.getProperty(key)) return;
  var result = applyApprovedRoomListMigration();
  if (Number(result.activeCount) === approvedOperationalRoomCodes_().length) {
    properties.setProperty(key, JSON.stringify({
      appliedAt: nowIso_(),
      activeCount: result.activeCount,
      deactivatedCount: result.deactivated.length,
      qrTokensChanged: false
    }));
  }
}

function normalizeRoomOrder_(payload) {
  var session = requireAdmin_(payload);
  var activeCount = normalizeActiveRoomOrderRows_();
  logAudit_(session.user.UserId, 'NORMALIZE_ROOM_ORDER', 'ROOMS', 'ALL', {
    count: activeCount,
    qrTokensChanged: false
  });
  return getAdminData_(payload);
}

function saveRoomType_(payload) {
  var session = requireAdmin_(payload);
  var data = payload.roomType || {};
  var name = safeCellText_(data.name);
  var templateSheet = safeCellText_(data.templateSheet || 'Ceklis Ruangan New');
  var workDays = String(data.workDays || 'Senin-Jumat');
  var sortOrder = Number(data.sortOrder || 0);
  assert_(name, 'ROOM_TYPE_REQUIRED', 'Nama template ruangan wajib diisi.');
  
  var typeId = String(data.roomTypeId || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!typeId) {
    typeId = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);
    if (!typeId) typeId = id_('TYPE');
  }
  
  var existing = findBy_('ROOM_TYPES', 'RoomTypeId', typeId);
  var now = nowIso_();
  if (existing) {
    updateObjectRow_('ROOM_TYPES', existing._row, {
      Name: name,
      TemplateSheet: templateSheet,
      WorkDays: workDays,
      Active: data.active !== false,
      SortOrder: sortOrder || existing.SortOrder || 1,
      UpdatedAt: now
    });
  } else {
    appendObject_('ROOM_TYPES', {
      RoomTypeId: typeId,
      Name: name,
      TemplateSheet: templateSheet,
      WorkDays: workDays,
      Active: true,
      SortOrder: sortOrder || (rowsAsObjects_('ROOM_TYPES').length + 1),
      CreatedAt: now,
      UpdatedAt: now
    });
  }
  invalidatePrimaryRows_('ROOM_TYPES');
  logAudit_(session.user.UserId, 'SAVE_ROOM_TYPE', 'ROOM_TYPES', typeId, { name: name });
  return getAdminData_(payload);
}

function saveActivity_(payload) {
  var session = requireAdmin_(payload);
  var data = payload.activity || {};
  var name = safeCellText_(data.name);
  var roomTypeId = String(data.roomTypeId || '');
  assert_(name, 'ACTIVITY_REQUIRED', 'Nama kegiatan wajib diisi.');
  assert_(findBy_('ROOM_TYPES', 'RoomTypeId', roomTypeId), 'ROOM_TYPE_REQUIRED', 'Pilih template ruangan.');
  var values = {
    RoomTypeId: roomTypeId,
    Name: name,
    StandardCategory: safeCellText_(data.standardCategory || ''),
    StandardText: safeCellText_(data.standardText || ''),
    QualityApplicable: Boolean(data.qualityApplicable),
    QualityPositive: safeCellText_(data.qualityPositive || ''),
    QualityNegative: safeCellText_(data.qualityNegative || ''),
    FunctionApplicable: Boolean(data.functionApplicable),
    FunctionPositive: safeCellText_(data.functionPositive || ''),
    FunctionNegative: safeCellText_(data.functionNegative || ''),
    ExportRow: Number(data.exportRow || 0),
    Active: data.active !== false,
    SortOrder: Number(data.sortOrder || 0),
    UpdatedAt: nowIso_()
  };
  assert_(!values.QualityApplicable || (values.QualityPositive && values.QualityNegative), 'CRITERIA_REQUIRED', 'Dua pilihan kualitas wajib diisi.');
  assert_(!values.FunctionApplicable || (values.FunctionPositive && values.FunctionNegative), 'CRITERIA_REQUIRED', 'Dua pilihan fungsi wajib diisi.');
  var activityId = String(data.activityId || '');
  if (activityId) {
    var activity = findBy_('ACTIVITIES', 'ActivityId', activityId);
    assert_(activity, 'ACTIVITY_NOT_FOUND', 'Kegiatan tidak ditemukan.');
    updateObjectRow_('ACTIVITIES', activity._row, values);
  } else {
    activityId = id_('ACT');
    values.ActivityId = activityId;
    values.CreatedAt = nowIso_();
    appendObject_('ACTIVITIES', values);
  }
  logAudit_(session.user.UserId, 'SAVE_ACTIVITY', 'ACTIVITY', activityId, { name: name });
  return getAdminData_(payload);
}

function setRoomActivities_(payload) {
  var session = requireAdmin_(payload);
  var roomId = String(payload.roomId || '');
  assert_(findBy_('ROOMS', 'RoomId', roomId), 'ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.');
  var activityIds = Array.isArray(payload.activityIds) ? payload.activityIds.map(String) : [];
  assert_(activityIds.length, 'ACTIVITY_REQUIRED', 'Pilih minimal satu kegiatan.');

  var maps = rowsAsObjects_('ROOM_ACTIVITIES').filter(function(map) {
    return String(map.RoomId) === roomId;
  });
  var byActivity = {};
  maps.forEach(function(map) { byActivity[String(map.ActivityId)] = map; });

  maps.forEach(function(map) {
    updateObjectRow_('ROOM_ACTIVITIES', map._row, { Active: false, UpdatedAt: nowIso_() });
  });
  activityIds.forEach(function(activityId, index) {
    var existing = byActivity[activityId];
    if (existing) {
      updateObjectRow_('ROOM_ACTIVITIES', existing._row, {
        Active: true,
        SortOrder: index + 1,
        UpdatedAt: nowIso_()
      });
    } else {
      appendObject_('ROOM_ACTIVITIES', {
        MapId: id_('MAP'),
        RoomId: roomId,
        ActivityId: activityId,
        Active: true,
        SortOrder: index + 1,
        CreatedAt: nowIso_(),
        UpdatedAt: nowIso_()
      });
    }
  });
  logAudit_(session.user.UserId, 'SET_ROOM_ACTIVITIES', 'ROOM', roomId, { activityIds: activityIds });
  return getAdminData_(payload);
}

function saveUser_(payload) {
  var session = requireAdmin_(payload);
  var data = payload.user || {};
  var username = String(data.username || '').trim().toLowerCase();
  var fullName = safeCellText_(data.fullName);
  var role = String(data.role || 'PETUGAS');
  assert_(username && fullName, 'USER_REQUIRED', 'Username dan nama lengkap wajib diisi.');
  assert_(/^[a-z0-9._-]{3,40}$/.test(username), 'INVALID_USERNAME', 'Username minimal 3 karakter dan hanya boleh memuat huruf, angka, titik, garis bawah, atau tanda minus.');
  assert_(['ADMIN', 'PETUGAS', 'SUPERVISOR'].indexOf(role) !== -1, 'INVALID_ROLE', 'Peran pengguna tidak valid.');
  var duplicate = rowsAsObjects_('USERS').find(function(user) {
    return String(user.Username).toLowerCase() === username && String(user.UserId) !== String(data.userId || '');
  });
  assert_(!duplicate, 'DUPLICATE_USER', 'Username sudah digunakan.');

  var userId = String(data.userId || '');
  if (userId) {
    var user = findBy_('USERS', 'UserId', userId);
    assert_(user, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    var activeAdmins = rowsAsObjects_('USERS').filter(function(item) {
      return item.Role === 'ADMIN' && truthy_(item.Active);
    }).length;
    if (user.Role === 'ADMIN' && truthy_(user.Active) && (role !== 'ADMIN' || data.active === false)) {
      assert_(activeAdmins > 1, 'LAST_ADMIN', 'Admin aktif terakhir tidak dapat dinonaktifkan atau diubah menjadi petugas.');
    }
    if (user.UserId === session.user.UserId) {
      assert_(role === 'ADMIN' && data.active !== false, 'SELF_LOCKOUT', 'Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri.');
    }
    updateObjectRow_('USERS', user._row, {
      Username: username,
      FullName: fullName,
      Role: role,
      Active: data.active !== false,
      UpdatedAt: nowIso_()
    });
    clearSessionContextCachesForUser_(userId);
  } else {
    var password = String(data.password || '');
    validatePassword_(password);
    userId = createUserRecord_(username, fullName, role, password, true);
  }
  logAudit_(session.user.UserId, 'SAVE_USER', 'USER', userId, { username: username, role: role });
  return getAdminData_(payload);
}

function resetUserPassword_(payload) {
  var session = requireAdmin_(payload);
  var user = findBy_('USERS', 'UserId', payload.userId);
  assert_(user, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
  var newPassword = String(payload.newPassword || '');
  validatePassword_(newPassword);
  var salt = secureToken_().slice(0, 24);
  updateObjectRow_('USERS', user._row, {
    Salt: salt,
    PasswordHash: passwordHash_(newPassword, salt),
    MustChangePassword: true,
    UpdatedAt: nowIso_()
  });
  clearSessionContextCachesForUser_(user.UserId);
  logAudit_(session.user.UserId, 'RESET_PASSWORD', 'USER', user.UserId, {});
  return { reset: true };
}

function reopenInspection_(payload) {
  var session = requireAdmin_(payload);
  var inspection = findBy_('INSPECTIONS', 'InspectionId', payload.inspectionId);
  assert_(inspection && inspection.State === 'SUBMITTED', 'INSPECTION_NOT_FOUND', 'Pemeriksaan aktif tidak ditemukan.');
  assert_(inspection.DateKey === todayKey_(), 'REOPEN_TODAY_ONLY', 'Hanya pemeriksaan hari ini yang dapat dibuka kembali. Gunakan koreksi untuk data lama.');
  updateObjectRow_('INSPECTIONS', inspection._row, {
    State: 'REOPENED',
    ReopenedAt: nowIso_(),
    ReopenedBy: session.user.UserId
  });
  logAudit_(session.user.UserId, 'REOPEN_INSPECTION', 'INSPECTION', inspection.InspectionId, {});
  return buildDashboard_(String(payload.month || monthKey_()));
}

function correctInspectionDetail_(payload) {
  var session = requireAdmin_(payload);
  var detail = findBy_('INSPECTION_DETAILS', 'DetailId', payload.detailId);
  assert_(detail, 'DETAIL_NOT_FOUND', 'Detail pemeriksaan tidak ditemukan.');
  var status = String(payload.status || '');
  assert_(['BERSIH', 'TIDAK_BERSIH'].indexOf(status) !== -1, 'INVALID_STATUS', 'Status tidak valid.');
  var funcStatus = String(payload.funcStatus || '');
  assert_(['BERFUNGSI', 'TIDAK_BERFUNGSI'].indexOf(funcStatus) !== -1, 'INVALID_FUNC_STATUS', 'Status fungsi tidak valid.');

  var hasIssue = status === 'TIDAK_BERSIH' || funcStatus === 'TIDAK_BERFUNGSI';
  var note = hasIssue ? safeCellText_(payload.note) : '';
  assert_(!hasIssue || note, 'DIRTY_NOTE_REQUIRED', 'Catatan wajib jika ada temuan tidak bersih atau tidak berfungsi.');
  var photoFileId = detail.PhotoFileId || '';
  if (payload.photoData) photoFileId = savePhoto_(payload.photoData, 'KOREKSI-' + detail.DetailId);
  assert_(!hasIssue || photoFileId, 'DIRTY_PHOTO_REQUIRED', 'Foto wajib jika ada temuan tidak bersih atau tidak berfungsi.');

  updateObjectRow_('INSPECTION_DETAILS', detail._row, {
    Status: status,
    FuncStatus: funcStatus,
    Note: note,
    PhotoFileId: hasIssue ? photoFileId : '',
    CorrectedAt: nowIso_(),
    CorrectedBy: session.user.UserId
  });
  recalculateInspection_(detail.InspectionId);
  logAudit_(session.user.UserId, 'CORRECT_DETAIL', 'INSPECTION_DETAIL', detail.DetailId, { status: status, funcStatus: funcStatus });
  return buildDashboard_(String(payload.month || monthKey_()));
}

function recalculateInspection_(inspectionId) {
  var inspection = findBy_('INSPECTIONS', 'InspectionId', inspectionId);
  if (!inspection) return;
  var dirtyCount = rowsAsObjects_('INSPECTION_DETAILS').filter(function(detail) {
    return detail.InspectionId === inspectionId && (detail.Status === 'TIDAK_BERSIH' || detail.FuncStatus === 'TIDAK_BERFUNGSI');
  }).length;
  updateObjectRow_('INSPECTIONS', inspection._row, {
    DirtyCount: dirtyCount,
    OverallStatus: dirtyCount ? 'ADA_TEMUAN' : 'BERSIH'
  });
}

function getQrData_(payload) {
  requireAdmin_(payload);
  var baseUrl = ScriptApp.getService().getUrl() || getSetting_('WEB_APP_URL', '');
  assert_(baseUrl, 'DEPLOYMENT_REQUIRED', 'Deploy aplikasi sebagai Web App terlebih dahulu untuk membuat QR Code.');
  return rowsAsObjects_('ROOMS').filter(function(room) {
    return truthy_(room.Active);
  }).sort(sortByOrder_).map(function(room) {
    return {
      roomId: room.RoomId,
      code: room.Code,
      name: room.Name,
      url: baseUrl + '?room=' + encodeURIComponent(room.QrToken)
    };
  });
}
