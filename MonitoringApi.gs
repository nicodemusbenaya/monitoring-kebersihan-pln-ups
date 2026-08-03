function monitoringBootstrap_(payload) {
  var session = payload._session;
  var role = session.user.Role;
  return {
    mode: role === 'ADMIN' ? 'ADMIN' : 'SCANNER',
    user: session.publicUser,
    app: appPublicConfig_(),
    today: todayKey_(),
    rooms: role === 'ADMIN' ? monitoringPublicRooms_() : [],
    dashboard: role === 'ADMIN' ? monitoringDashboard_(payload.month || monthKey_(), payload.roomId || '') : null
  };
}

function monitoringScanRoom_(payload) {
  var session = payload._session;
  assert_(['PETUGAS', 'SUPERVISOR'].indexOf(session.user.Role) !== -1, 'FORBIDDEN', 'Akun ini tidak dapat mengisi checklist.');
  var token = parseRoomQrToken_(payload.qrPayload);
  var room = findActiveRoomByToken_(token);
  assert_(room, 'INVALID_ROOM', 'QR Code ruangan tidak valid atau sudah tidak aktif.');
  var roomType = findBy_('ROOM_TYPES', 'RoomTypeId', room.RoomTypeId);
  assert_(roomType && truthy_(roomType.Active), 'INVALID_ROOM_TYPE', 'Template ruangan tidak aktif.');
  assert_(isWorkday_(Number(roomType.WorkDays || 6)), 'OUTSIDE_SCHEDULE', 'Hari ini tidak termasuk jadwal pemeriksaan untuk ruangan ini.');

  var scan = {
    ScanId: id_('SCAN'), RoomId: room.RoomId, UserId: session.user.UserId,
    ScannedAt: nowIso_(), UserAgent: safeCellText_(String(payload.userAgent || '').slice(0, 500)),
    QrPayload: safeCellText_(String(payload.qrPayload || '').slice(0, 500))
  };
  appendObject_('SCAN_EVENTS', scan);

  var slots = monitoringSlotsFor_(room.RoomTypeId).filter(function(slot) {
    return slot.Role === session.user.Role;
  });
  var allToday = rowsAsObjects_('INSPECTIONS').filter(function(row) {
    return row.RoomId === room.RoomId && row.DateKey === todayKey_() && row.State === 'SUBMITTED';
  });
  var completedMap = {};
  allToday.forEach(function(row) { completedMap[row.SlotId] = monitoringInspectionSummary_(row); });

  return {
    room: monitoringPublicRoom_(room),
    roomType: { id: roomType.RoomTypeId, name: roomType.Name, templateSheet: roomType.TemplateSheet },
    scan: { scanId: scan.ScanId, scannedAt: scan.ScannedAt, displayTime: displayDateTime_(scan.ScannedAt) },
    dateKey: todayKey_(),
    slots: slots.map(function(slot) {
      return {
        slotId: slot.SlotId, code: slot.Code, name: slot.Name, role: slot.Role,
        completed: completedMap[slot.SlotId] || null
      };
    }),
    activities: monitoringActivitiesFor_(room.RoomTypeId),
    petugasResults: session.user.Role === 'SUPERVISOR' ? allToday.filter(function(row) {
      var slot = findBy_('SLOTS', 'SlotId', row.SlotId);
      return slot && slot.Role === 'PETUGAS';
    }).map(monitoringInspectionSummary_) : []
  };
}

function monitoringSubmitInspection_(payload) {
  var session = payload._session;
  var scan = findBy_('SCAN_EVENTS', 'ScanId', payload.scanId);
  assert_(scan && scan.UserId === session.user.UserId, 'INVALID_SCAN', 'Sesi pemindaian tidak valid. Pindai ulang QR Code.');
  var room = findActiveRoomById_(scan.RoomId);
  assert_(room, 'ROOM_INACTIVE', 'Ruangan sudah tidak aktif.');
  var slot = findBy_('SLOTS', 'SlotId', String(payload.slotId || ''));
  assert_(slot && slot.RoomTypeId === room.RoomTypeId && truthy_(slot.Active), 'INVALID_SLOT', 'Slot pemeriksaan tidak valid.');
  assert_(slot.Role === session.user.Role, 'FORBIDDEN', 'Slot ini tidak sesuai dengan peran akun.');
  var roomType = findBy_('ROOM_TYPES', 'RoomTypeId', room.RoomTypeId);
  assert_(isWorkday_(Number(roomType.WorkDays || 6)), 'OUTSIDE_SCHEDULE', 'Hari ini tidak termasuk jadwal pemeriksaan.');

  var evidenceData = String(payload.evidenceData || '');
  assert_(evidenceData.indexOf('data:image/') === 0, 'EVIDENCE_REQUIRED', 'Satu foto evidence yang diambil langsung wajib dilampirkan.');
  validatePhotoData_(evidenceData);

  var activities = monitoringActivitiesFor_(room.RoomTypeId);
  var answers = Array.isArray(payload.answers) ? payload.answers : [];
  var answerMap = {};
  answers.forEach(function(answer) { answerMap[String(answer.activityId)] = answer; });
  var dirtyCount = 0;
  activities.forEach(function(activity) {
    var answer = answerMap[activity.activityId];
    assert_(answer, 'INCOMPLETE', 'Semua indikator wajib diisi.');
    if (activity.qualityApplicable) assert_(['POSITIVE', 'NEGATIVE'].indexOf(answer.qualityResult) !== -1, 'INCOMPLETE', 'Indikator kualitas belum lengkap.');
    if (activity.functionApplicable) assert_(['POSITIVE', 'NEGATIVE'].indexOf(answer.functionResult) !== -1, 'INCOMPLETE', 'Indikator fungsi belum lengkap.');
    var issue = answer.qualityResult === 'NEGATIVE' || answer.functionResult === 'NEGATIVE';
    if (issue) {
      dirtyCount++;
      assert_(String(answer.note || '').trim(), 'NOTE_REQUIRED', 'Catatan wajib diisi pada indikator yang memiliki temuan.');
    }
  });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var duplicate = rowsAsObjects_('INSPECTIONS').some(function(row) {
      return row.RoomId === room.RoomId && row.DateKey === todayKey_() &&
        row.SlotId === slot.SlotId && row.State === 'SUBMITTED';
    });
    assert_(!duplicate, 'ALREADY_SUBMITTED', 'Slot ini sudah diisi untuk ruangan tersebut hari ini.');

    var inspectionId = id_('INSP');
    var submittedAt = nowIso_();
    var evidenceName = room.Code + '-' + todayKey_() + '-' + slot.Code + '-' + inspectionId;
    var evidenceFileId = savePhoto_(evidenceData, evidenceName);
    var evidencePending = String(evidenceFileId).indexOf('DRIVE:') === 0;
    var week = monitoringWeekInfo_(new Date());
    var inspectionRow = {
      InspectionId: inspectionId, DateKey: todayKey_(), WeekStart: week.weekStart, DayNumber: week.dayNumber,
      RoomId: room.RoomId, RoomTypeId: room.RoomTypeId, SlotId: slot.SlotId, SlotCode: slot.Code,
      UserId: session.user.UserId, ScanId: scan.ScanId, ScannedAt: scan.ScannedAt, SubmittedAt: submittedAt,
      OverallStatus: dirtyCount ? 'ADA_TEMUAN' : 'BERSIH', DirtyCount: dirtyCount,
      EvidenceFileId: evidenceFileId, EvidenceName: evidenceName, State: 'SUBMITTED',
      BackupStatus: evidencePending ? 'PENDING' : 'SYNCED', BackupUpdatedAt: submittedAt, ReopenedAt: '', ReopenedBy: ''
    };
    var detailRows = activities.map(function(activity) {
      var answer = answerMap[activity.activityId];
      return {
        DetailId: id_('DET'), InspectionId: inspectionId, ActivityId: activity.activityId,
        QualityResult: activity.qualityApplicable ? answer.qualityResult : 'NA',
        QualityLabel: activity.qualityApplicable ? (answer.qualityResult === 'POSITIVE' ? activity.qualityPositive : activity.qualityNegative) : 'N/A',
        FunctionResult: activity.functionApplicable ? answer.functionResult : 'NA',
        FunctionLabel: activity.functionApplicable ? (answer.functionResult === 'POSITIVE' ? activity.functionPositive : activity.functionNegative) : 'N/A',
        Note: safeCellText_(answer.note || ''), CorrectedAt: '', CorrectedBy: ''
      };
    });
    appendTransaction_([
      { table: 'INSPECTIONS', rows: [inspectionRow] },
      { table: 'INSPECTION_DETAILS', rows: detailRows }
    ]);
    logAudit_(session.user.UserId, 'SUBMIT_INSPECTION', 'INSPECTION', inspectionId, {
      roomId: room.RoomId, slotId: slot.SlotId, dirtyCount: dirtyCount
    });
    return {
      inspectionId: inspectionId, roomName: room.Name, slotName: slot.Name,
      submittedAt: submittedAt, displayTime: displayDateTime_(submittedAt),
      overallStatus: dirtyCount ? 'ADA_TEMUAN' : 'BERSIH', dirtyCount: dirtyCount
    };
  } finally {
    lock.releaseLock();
  }
}

function monitoringGetInspection_(payload) {
  var inspection = findBy_('INSPECTIONS', 'InspectionId', payload.inspectionId);
  assert_(inspection, 'NOT_FOUND', 'Pemeriksaan tidak ditemukan.');
  var room = findBy_('ROOMS', 'RoomId', inspection.RoomId);
  var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
  return {
    summary: monitoringInspectionSummary_(inspection),
    room: room ? monitoringPublicRoom_(room) : null,
    slot: slot ? { name: slot.Name, code: slot.Code } : null,
    details: rowsAsObjects_('INSPECTION_DETAILS').filter(function(row) {
      return row.InspectionId === inspection.InspectionId;
    }),
    evidenceFileId: inspection.EvidenceFileId
  };
}

function monitoringGetQrData_(payload) {
  requireAdmin_(payload);
  var baseUrl = ScriptApp.getService().getUrl();
  assert_(baseUrl, 'WEBAPP_NOT_DEPLOYED', 'Deploy aplikasi sebagai Web App sebelum membuat QR Code.');
  return monitoringPublicRooms_().map(function(room) {
    var source = findBy_('ROOMS', 'RoomId', room.roomId);
    return {
      roomId: room.roomId, code: room.code, name: room.name,
      url: baseUrl + '?room=' + encodeURIComponent(source.QrToken)
    };
  });
}

function monitoringDashboard_(month, roomId) {
  month = /^\d{4}-\d{2}$/.test(String(month || '')) ? String(month) : monthKey_();
  var rooms = monitoringPublicRooms_();
  var inspections = rowsAsObjects_('INSPECTIONS').filter(function(row) {
    return String(row.DateKey).slice(0, 7) === month && row.State === 'SUBMITTED' &&
      (!roomId || row.RoomId === roomId);
  });
  var findings = inspections.filter(function(row) { return row.OverallStatus === 'ADA_TEMUAN'; });
  return {
    month: month, roomId: roomId || '', rooms: rooms,
    totals: {
      submissions: inspections.length,
      clean: inspections.length - findings.length,
      findings: findings.length,
      pendingBackup: inspections.filter(function(row) { return row.BackupStatus !== 'SYNCED'; }).length
    },
    recent: inspections.sort(function(a, b) {
      return new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime();
    }).slice(0, 100).map(monitoringInspectionSummary_)
  };
}

function monitoringActivitiesFor_(roomTypeId) {
  var configured = monitoringItems_().filter(function(item) {
    return item.type === roomTypeId;
  });
  return rowsAsObjects_('ACTIVITIES').filter(function(row) {
    return row.RoomTypeId === roomTypeId && truthy_(row.Active);
  }).sort(sortByOrder_).map(function(row) {
    var fallback = configured.find(function(item) {
      return normalizeExportName_(item.name) === normalizeExportName_(row.Name);
    });
    return {
      activityId: row.ActivityId, name: row.Name,
      qualityApplicable: truthy_(row.QualityApplicable) || Boolean(fallback && fallback.qa),
      qualityPositive: row.QualityPositive || (fallback && fallback.qp) || '',
      qualityNegative: row.QualityNegative || (fallback && fallback.qn) || '',
      functionApplicable: truthy_(row.FunctionApplicable) || Boolean(fallback && fallback.fa),
      functionPositive: row.FunctionPositive || (fallback && fallback.fp) || '',
      functionNegative: row.FunctionNegative || (fallback && fallback.fn) || '',
      exportRow: Number(row.ExportRow || (fallback && fallback.row) || 0),
      sortOrder: Number(row.SortOrder || 0)
    };
  });
}

function monitoringSlotsFor_(roomTypeId) {
  return rowsAsObjects_('SLOTS').filter(function(row) {
    return row.RoomTypeId === roomTypeId && truthy_(row.Active);
  }).sort(sortByOrder_);
}

function monitoringPublicRooms_() {
  return rowsAsObjects_('ROOMS').filter(function(room) {
    return truthy_(room.Active) && room.RoomTypeId;
  }).sort(sortByOrder_).map(monitoringPublicRoom_);
}

function monitoringPublicRoom_(room) {
  return {
    roomId: room.RoomId, code: room.Code, name: room.Name,
    roomTypeId: room.RoomTypeId, active: truthy_(room.Active), sortOrder: Number(room.SortOrder || 0)
  };
}

function monitoringInspectionSummary_(inspection) {
  var room = findBy_('ROOMS', 'RoomId', inspection.RoomId);
  var user = findBy_('USERS', 'UserId', inspection.UserId);
  var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
  return {
    inspectionId: inspection.InspectionId, dateKey: inspection.DateKey,
    roomId: inspection.RoomId, roomName: room ? room.Name : '',
    slotId: inspection.SlotId, slotName: slot ? slot.Name : inspection.SlotCode,
    officerName: user ? user.FullName : '', role: user ? user.Role : '',
    scannedAt: inspection.ScannedAt, submittedAt: inspection.SubmittedAt,
    displayTime: displayDateTime_(inspection.SubmittedAt),
    overallStatus: inspection.OverallStatus, dirtyCount: Number(inspection.DirtyCount || 0),
    backupStatus: inspection.BackupStatus || 'PENDING'
  };
}

function parseRoomQrToken_(payload) {
  var value = String(payload || '').trim();
  var directMatch = value.match(/^PLNUPS:ROOM:([A-Za-z0-9_-]+)$/);
  if (directMatch) return directMatch[1];

  // QR yang dicetak aplikasi berisi URL Web App agar tetap kompatibel dengan
  // Google Lens. Pemindai internal membaca URL utuh, jadi ambil token room-nya.
  var urlMatch = value.match(/[?&]room=([^&#]+)/i);
  if (urlMatch) {
    var token = '';
    try {
      token = decodeURIComponent(urlMatch[1].replace(/\+/g, '%20'));
    } catch (error) {
      token = '';
    }
    if (/^[A-Za-z0-9_-]+$/.test(token)) return token;
  }

  throw appError_('INVALID_QR', 'QR Code bukan QR ruangan aplikasi ini.');
}

function isWorkday_(workDays) {
  var day = Number(Utilities.formatDate(new Date(), APP.TIMEZONE, 'u'));
  return day >= 1 && day <= workDays;
}

function monitoringWeekInfo_(date) {
  var weekday = Number(Utilities.formatDate(date, APP.TIMEZONE, 'u'));
  var local = new Date(date.getTime() - (weekday - 1) * 24 * 60 * 60 * 1000);
  return {
    weekStart: Utilities.formatDate(local, APP.TIMEZONE, 'yyyy-MM-dd'),
    dayNumber: weekday
  };
}
