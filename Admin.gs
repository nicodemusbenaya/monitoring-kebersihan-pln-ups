function getDashboard_(payload) {
  requireAdmin_(payload);
  return buildDashboard_(String(payload.month || monthKey_()));
}

function buildDashboard_(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) month = monthKey_();
  var allRooms = rowsAsObjects_('ROOMS');
  var rooms = allRooms.filter(function(room) { return truthy_(room.Active); }).sort(sortByOrder_);
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
  var rooms = rowsAsObjects_('ROOMS').map(monitoringPublicRoom_).sort(sortByOrder_);
  var activities = rowsAsObjects_('ACTIVITIES').map(function(activity) {
    return {
      activityId: activity.ActivityId,
      roomTypeId: activity.RoomTypeId,
      name: activity.Name,
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
  var maps = rowsAsObjects_('ROOM_ACTIVITIES').filter(function(map) {
    return truthy_(map.Active);
  }).map(function(map) {
    return {
      roomId: map.RoomId,
      activityId: map.ActivityId,
      sortOrder: Number(map.SortOrder || 0)
    };
  });
  var users = rowsAsObjects_('USERS').map(publicUser_);
  var roomTypes = rowsAsObjects_('ROOM_TYPES').filter(function(item) { return truthy_(item.Active); }).map(function(item) {
    return { roomTypeId: item.RoomTypeId, name: item.Name, templateSheet: item.TemplateSheet };
  });
  return { rooms: rooms, activities: activities, roomActivities: maps, users: users, roomTypes: roomTypes };
}

function saveRoom_(payload) {
  var session = requireAdmin_(payload);
  var data = payload.room || {};
  var name = safeCellText_(data.name);
  var code = String(data.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  var roomTypeId = String(data.roomTypeId || '');
  assert_(name && code, 'ROOM_REQUIRED', 'Kode dan nama ruangan wajib diisi.');
  assert_(findBy_('ROOM_TYPES', 'RoomTypeId', roomTypeId), 'ROOM_TYPE_REQUIRED', 'Pilih template ruangan.');
  assert_(/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(code), 'INVALID_ROOM_CODE', 'Kode ruangan harus diawali huruf atau angka dan maksimal 30 karakter.');
  var duplicate = rowsAsObjects_('ROOMS').find(function(room) {
    return String(room.Code).toUpperCase() === code && String(room.RoomId) !== String(data.roomId || '');
  });
  assert_(!duplicate, 'DUPLICATE_ROOM', 'Kode ruangan sudah digunakan.');

  var roomId = String(data.roomId || '');
  if (roomId) {
    var room = findBy_('ROOMS', 'RoomId', roomId);
    assert_(room, 'ROOM_NOT_FOUND', 'Ruangan tidak ditemukan.');
    updateObjectRow_('ROOMS', room._row, {
      Code: code,
      Name: name,
      RoomTypeId: roomTypeId,
      Active: data.active !== false,
      SortOrder: Number(data.sortOrder || 0),
      QrToken: data.regenerateQr ? secureToken_() : room.QrToken,
      UpdatedAt: nowIso_()
    });
  } else {
    roomId = id_('ROOM');
    appendObject_('ROOMS', {
      RoomId: roomId,
      Code: code,
      Name: name,
      RoomTypeId: roomTypeId,
      QrToken: secureToken_(),
      Active: data.active !== false,
      SortOrder: Number(data.sortOrder || 0),
      CreatedAt: nowIso_(),
      UpdatedAt: nowIso_()
    });
  }
  logAudit_(session.user.UserId, 'SAVE_ROOM', 'ROOM', roomId, { code: code, name: name });
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
