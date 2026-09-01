function getBootstrap_(payload) {
  var session = payload._session;
  var adminMode = Boolean(payload.adminMode);

  if (adminMode) {
    requireAdmin_(payload);
    return {
      mode: 'ADMIN',
      user: session.publicUser,
      app: appPublicConfig_(),
      dashboard: buildDashboard_(monthKey_())
    };
  }

  var room = findActiveRoomByToken_(String(payload.roomToken || ''));
  assert_(room, 'INVALID_ROOM', 'QR Code ruangan tidak valid atau sudah tidak aktif.');

  var scan = payload.entryScanId ? findBy_('SCAN_EVENTS', 'ScanId', payload.entryScanId) : null;
  if (scan) {
    assert_(String(scan.RoomId) === String(room.RoomId), 'INVALID_SCAN', 'Data pemindaian tidak sesuai dengan ruangan.');
    assert_(!scan.UserId || String(scan.UserId) === String(session.user.UserId), 'INVALID_SCAN', 'Data pemindaian sudah digunakan akun lain.');
    updateObjectRow_('SCAN_EVENTS', scan._row, {
      UserId: session.user.UserId,
      UserAgent: safeCellText_(String(payload.userAgent || '').slice(0, 500))
    });
  } else {
    scan = {
      ScanId: id_('SCAN'),
      RoomId: room.RoomId,
      UserId: session.user.UserId,
      ScannedAt: nowIso_(),
      UserAgent: safeCellText_(String(payload.userAgent || '').slice(0, 500))
    };
    appendObject_('SCAN_EVENTS', scan);
  }

  var existing = getSubmittedInspectionForDay_(room.RoomId, todayKey_());
  return {
    mode: 'INSPECTION',
    user: session.publicUser,
    app: appPublicConfig_(),
    room: publicRoom_(room),
    scan: {
      scanId: scan.ScanId,
      scannedAt: scan.ScannedAt,
      displayTime: displayDateTime_(scan.ScannedAt)
    },
    dateKey: todayKey_(),
    completed: existing ? inspectionSummary_(existing) : null,
    activities: existing ? [] : getRoomActivities_(room.RoomId)
  };
}

function submitInspection_(payload) {
  var session = payload._session;
  assert_(session.user.Role === 'PETUGAS', 'FORBIDDEN', 'Hanya petugas yang dapat mengirim pemeriksaan.');
  var scan = findBy_('SCAN_EVENTS', 'ScanId', payload.scanId);
  assert_(scan, 'INVALID_SCAN', 'Data pemindaian tidak ditemukan. Pindai ulang QR Code ruangan.');
  assert_(String(scan.UserId) === String(session.user.UserId), 'INVALID_SCAN', 'Pemindaian bukan milik akun ini.');

  var room = findActiveRoomById_(scan.RoomId);
  assert_(room, 'ROOM_INACTIVE', 'Ruangan sudah tidak aktif.');
  var required = getRoomActivities_(room.RoomId);
  assert_(required.length, 'NO_ACTIVITIES', 'Belum ada kegiatan aktif untuk ruangan ini.');

  var answers = Array.isArray(payload.answers) ? payload.answers : [];
  var answerMap = {};
  answers.forEach(function(answer) {
    answerMap[String(answer.activityId)] = answer;
  });

  required.forEach(function(activity) {
    var answer = answerMap[String(activity.activityId)];
    assert_(answer, 'INCOMPLETE', 'Semua kegiatan wajib diisi.');
    assert_(['BERSIH', 'TIDAK_BERSIH'].indexOf(answer.status) !== -1, 'INCOMPLETE', 'Pilih status kebersihan untuk semua kegiatan.');
    assert_(['BERFUNGSI', 'TIDAK_BERFUNGSI'].indexOf(answer.funcStatus) !== -1, 'INCOMPLETE', 'Pilih status fungsi untuk semua kegiatan.');
    var hasIssue = answer.status === 'TIDAK_BERSIH' || answer.funcStatus === 'TIDAK_BERFUNGSI';
    if (hasIssue) {
      assert_(String(answer.note || '').trim(), 'DIRTY_NOTE_REQUIRED', 'Catatan wajib diisi untuk setiap temuan tidak bersih atau tidak berfungsi.');
      assert_(String(answer.photoData || '').indexOf('data:image/') === 0, 'DIRTY_PHOTO_REQUIRED', 'Foto wajib diunggah untuk setiap temuan tidak bersih atau tidak berfungsi.');
      validatePhotoData_(answer.photoData);
    }
  });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    assert_(!getSubmittedInspectionForDay_(room.RoomId, todayKey_()), 'ALREADY_SUBMITTED', 'Ruangan ini sudah diperiksa hari ini.');

    var inspectionId = id_('INSP');
    var submittedAt = nowIso_();
    var dirtyCount = 0;
    var detailRows = required.map(function(activity) {
      var answer = answerMap[String(activity.activityId)];
      var photoFileId = '';
      var hasIssue = answer.status === 'TIDAK_BERSIH' || answer.funcStatus === 'TIDAK_BERFUNGSI';
      if (hasIssue) {
        dirtyCount++;
        photoFileId = savePhoto_(
          answer.photoData,
          room.Code + '-' + todayKey_() + '-' + activity.activityId
        );
      }
      return {
        DetailId: id_('DET'),
        InspectionId: inspectionId,
        ActivityId: activity.activityId,
        Status: answer.status,
        FuncStatus: answer.funcStatus,
        Note: hasIssue ? safeCellText_(answer.note) : '',
        PhotoFileId: photoFileId,
        CorrectedAt: '',
        CorrectedBy: ''
      };
    });

    appendObject_('INSPECTIONS', {
      InspectionId: inspectionId,
      DateKey: todayKey_(),
      RoomId: room.RoomId,
      UserId: session.user.UserId,
      ScanId: scan.ScanId,
      ScannedAt: scan.ScannedAt,
      SubmittedAt: submittedAt,
      OverallStatus: dirtyCount ? 'ADA_TEMUAN' : 'BERSIH',
      DirtyCount: dirtyCount,
      State: 'SUBMITTED',
      ReopenedAt: '',
      ReopenedBy: ''
    });
    detailRows.forEach(function(row) { appendObject_('INSPECTION_DETAILS', row); });
    logAudit_(session.user.UserId, 'SUBMIT_INSPECTION', 'INSPECTION', inspectionId, {
      roomId: room.RoomId,
      dirtyCount: dirtyCount
    });

    return {
      inspectionId: inspectionId,
      roomName: room.Name,
      submittedAt: submittedAt,
      displayTime: displayDateTime_(submittedAt),
      overallStatus: dirtyCount ? 'ADA_TEMUAN' : 'BERSIH',
      dirtyCount: dirtyCount
    };
  } finally {
    lock.releaseLock();
  }
}

function getSubmittedInspectionForDay_(roomId, dateKey) {
  var matches = rowsAsObjects_('INSPECTIONS').filter(function(item) {
    return String(item.RoomId) === String(roomId) &&
      String(item.DateKey) === String(dateKey) &&
      String(item.State) === 'SUBMITTED';
  });
  matches.sort(function(a, b) {
    return new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime();
  });
  return matches[0] || null;
}

function inspectionSummary_(inspection) {
  var user = findBy_('USERS', 'UserId', inspection.UserId);
  return {
    inspectionId: inspection.InspectionId,
    dateKey: inspection.DateKey,
    submittedAt: inspection.SubmittedAt,
    displayTime: displayDateTime_(inspection.SubmittedAt),
    overallStatus: inspection.OverallStatus,
    dirtyCount: Number(inspection.DirtyCount || 0),
    officerName: user ? user.FullName : 'Petugas'
  };
}

function validatePhotoData_(dataUrl) {
  var match = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  assert_(match, 'INVALID_PHOTO', 'Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.');
  var estimatedBytes = Math.floor(match[2].length * 3 / 4);
  assert_(estimatedBytes <= APP.MAX_PHOTO_BYTES, 'PHOTO_TOO_LARGE', 'Ukuran foto maksimal 4 MB setelah dikompres.');
  return match;
}

function savePhoto_(dataUrl, fileName) {
  var match = validatePhotoData_(dataUrl);
  var extension = match[1].split('/')[1].replace('jpeg', 'jpg');
  var bytes = Utilities.base64Decode(match[2]);
  var blob = Utilities.newBlob(bytes, match[1], fileName + '.' + extension);
  if (nasEvidenceEnabled_()) {
    try {
      return uploadEvidenceBlobToNas_(blob, fileName + '.' + extension);
    } catch (error) {
      tripNasCircuit_();
      console.warn('NAS tidak tersedia; evidence disimpan sementara di Drive: ' + error.message);
    }
  }
  assert_(driveEvidenceFallbackEnabled_(), 'EVIDENCE_STORAGE_UNAVAILABLE',
    'NAS tidak tersedia dan penyimpanan sementara Drive dinonaktifkan.');
  var folderId = PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');
  assert_(folderId, 'PHOTO_FOLDER_MISSING', 'Folder penyimpanan foto belum tersedia.');
  var driveId = DriveApp.getFolderById(folderId).createFile(blob).getId();
  return 'DRIVE:' + driveId;
}

function getPhoto_(payload) {
  var fileId = String(payload.fileId || '');
  var inspection = findBy_('INSPECTIONS', 'EvidenceFileId', fileId);
  var detail = findBy_('INSPECTION_DETAILS', 'PhotoFileId', fileId);
  var photo = findBy_('INSPECTION_PHOTOS', 'FileId', fileId);
  assert_(inspection || detail || photo, 'PHOTO_NOT_FOUND', 'Foto evidence tidak ditemukan.');
  var blob;
  if (fileId.indexOf('DRIVE:') === 0) {
    blob = DriveApp.getFileById(fileId.slice(6)).getBlob();
  } else {
    blob = downloadEvidenceBlobFromNas_(fileId);
  }
  assert_(blob.getBytes().length <= APP.MAX_PHOTO_BYTES * 2, 'PHOTO_TOO_LARGE', 'Foto terlalu besar untuk ditampilkan.');
  return {
    fileId: fileId,
    name: blob.getName(),
    dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes())
  };
}

function appPublicConfig_() {
  return {
    name: getSetting_('APP_NAME', APP.NAME),
    institution: getSetting_('INSTITUTION', APP.INSTITUTION),
    timezone: getSetting_('TIMEZONE', APP.TIMEZONE),
    logoUrl: getSetting_('LOGO_URL', APP.LOGO_URL),
    colors: APP.COLORS
  };
}

function publicRoom_(room) {
  return {
    roomId: room.RoomId,
    code: room.Code,
    name: room.Name,
    active: truthy_(room.Active),
    sortOrder: Number(room.SortOrder || 0)
  };
}
