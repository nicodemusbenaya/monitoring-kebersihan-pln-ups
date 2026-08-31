function monitoringBootstrap_(payload) {
  var session = payload._session;
  var role = session.user.Role;
  var openedRoom = null;
  if (role !== 'ADMIN' && !session.publicUser.mustChangePassword && payload.roomToken) {
    openedRoom = monitoringScanRoom_({
      _session: session,
      qrPayload: 'PLNUPS:ROOM:' + String(payload.roomToken),
      userAgent: payload.userAgent || ''
    });
  }
  return {
    mode: role === 'ADMIN' ? 'ADMIN' : 'SCANNER',
    user: session.publicUser,
    app: appPublicConfig_(),
    today: todayKey_(),
    rooms: role === 'ADMIN' ? monitoringPublicRooms_() : [],
    dashboard: role === 'ADMIN' ? monitoringDashboard_(payload.month || monthKey_(), payload.roomId || '') : null,
    openedRoom: openedRoom
  };
}

function monitoringScanRoom_(payload) {
  var session = payload._session;
  assert_(['PETUGAS', 'SUPERVISOR'].indexOf(session.user.Role) !== -1, 'FORBIDDEN', 'Akun ini tidak dapat mengisi checklist.');
  var token = parseRoomQrToken_(payload.qrPayload);
  // Jalur pemindaian membaca mirror Spreadsheet secara langsung agar UI tidak
  // ikut menunggu timeout gateway NAS. Setiap mutasi tetap dicerminkan ke sini.
  var source = rowsAsLocalObjectsBatch_(['ROOMS', 'ROOM_TYPES', 'SLOTS', 'INSPECTIONS', 'ACTIVITIES', 'USERS']);
  var room = source.ROOMS.find(function(item) {
    return String(item.QrToken) === String(token) && truthy_(item.Active);
  }) || null;
  var localRoomType = room ? source.ROOM_TYPES.find(function(item) {
    return String(item.RoomTypeId) === String(room.RoomTypeId) && truthy_(item.Active);
  }) : null;
  var hasLocalSlot = room ? source.SLOTS.some(function(item) {
    return String(item.RoomTypeId) === String(room.RoomTypeId) &&
      String(item.Role) === String(session.user.Role) && truthy_(item.Active);
  }) : false;
  if (!room || !localRoomType || !hasLocalSlot) {
    var recovered = recoverActiveRoomForScan_(token);
    if (recovered) {
      room = recovered.room;
      source.ROOMS = recovered.ROOMS;
      source.ROOM_TYPES = recovered.ROOM_TYPES;
      source.SLOTS = recovered.SLOTS;
      source.ACTIVITIES = recovered.ACTIVITIES;
    }
  }
  assert_(room, 'INVALID_ROOM', 'QR Code ruangan tidak valid atau sudah tidak aktif.');
  var roomType = source.ROOM_TYPES.find(function(item) {
    return String(item.RoomTypeId) === String(room.RoomTypeId);
  }) || null;
  assert_(roomType && truthy_(roomType.Active), 'INVALID_ROOM_TYPE', 'Template ruangan tidak aktif.');
  assert_(isWorkday_(Number(roomType.WorkDays || 6)), 'OUTSIDE_SCHEDULE', 'Hari ini tidak termasuk jadwal pemeriksaan untuk ruangan ini.');

  var scan = {
    ScanId: id_('SCAN'), RoomId: room.RoomId, UserId: session.user.UserId,
    ScannedAt: nowIso_(), UserAgent: safeCellText_(String(payload.userAgent || '').slice(0, 500)),
    QrPayload: safeCellText_(String(payload.qrPayload || '').slice(0, 500))
  };
  appendObjectDeferredPrimary_('SCAN_EVENTS', scan);

  var slots = source.SLOTS.filter(function(slot) {
    return slot.RoomTypeId === room.RoomTypeId && truthy_(slot.Active) && slot.Role === session.user.Role;
  }).sort(sortByOrder_);
  var allToday = source.INSPECTIONS.filter(function(row) {
    return row.RoomId === room.RoomId && row.DateKey === todayKey_() && row.State === 'SUBMITTED';
  });
  var completedMap = {};
  allToday.forEach(function(row) {
    completedMap[row.SlotId] = monitoringInspectionSummaryFromSource_(row, source);
  });

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
    }).map(function(row) { return monitoringInspectionSummaryFromSource_(row, source); }) : []
  };
}

function recoverActiveRoomForScan_(token) {
  if (!primaryDatabaseConfigured_()) return null;
  try {
    // QR yang tidak ada pada mirror diverifikasi ke sumber utama sebelum
    // dinyatakan tidak valid. Token disalin apa adanya; tidak pernah dibuat ulang.
    var source = rowsAsObjectsBatch_(['ROOMS', 'ROOM_TYPES', 'SLOTS', 'ACTIVITIES']);
    var room = source.ROOMS.find(function(item) {
      return String(item.QrToken) === String(token) && truthy_(item.Active);
    }) || null;
    if (!room) return null;

    mirrorUpsert_('ROOMS', room);
    source.ROOM_TYPES.filter(function(item) {
      return String(item.RoomTypeId) === String(room.RoomTypeId);
    }).forEach(function(item) { mirrorUpsert_('ROOM_TYPES', item); });
    source.SLOTS.filter(function(item) {
      return String(item.RoomTypeId) === String(room.RoomTypeId);
    }).forEach(function(item) { mirrorUpsert_('SLOTS', item); });
    return {
      room: room,
      ROOMS: source.ROOMS,
      ROOM_TYPES: source.ROOM_TYPES,
      SLOTS: source.SLOTS,
      ACTIVITIES: source.ACTIVITIES
    };
  } catch (error) {
    console.warn('Pemulihan mirror ROOMS saat scan gagal: ' + error.message);
    return null;
  }
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

  var evidenceDataList = Array.isArray(payload.evidenceDataList) ? payload.evidenceDataList.slice() : [];
  // Kompatibilitas dengan prototype: payload lama masih dapat mengirim satu foto.
  if (!evidenceDataList.length && payload.evidenceData) evidenceDataList = [payload.evidenceData];
  assert_(evidenceDataList.length, 'EVIDENCE_REQUIRED', 'Minimal satu foto evidence yang diambil langsung wajib dilampirkan.');
  assert_(evidenceDataList.length <= APP.MAX_PHOTOS_PER_INSPECTION, 'TOO_MANY_PHOTOS',
    'Jumlah foto evidence maksimal ' + APP.MAX_PHOTOS_PER_INSPECTION + ' foto per slot.');
  evidenceDataList.forEach(function(data) {
    assert_(String(data || '').indexOf('data:image/') === 0, 'INVALID_PHOTO', 'Format foto evidence tidak didukung.');
    validatePhotoData_(data);
  });

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
    var photoRows = evidenceDataList.map(function(data, index) {
      var photoName = evidenceName + '-' + (index + 1);
      var fileId = savePhoto_(data, photoName);
      return {
        PhotoId: id_('PHOTO'), InspectionId: inspectionId, FileId: fileId,
        FileName: photoName, CapturedAt: submittedAt, SortOrder: index + 1
      };
    });
    var evidenceFileId = photoRows[0].FileId;
    var evidencePending = photoRows.some(function(photo) { return String(photo.FileId).indexOf('DRIVE:') === 0; });
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
      { table: 'INSPECTION_DETAILS', rows: detailRows },
      { table: 'INSPECTION_PHOTOS', rows: photoRows }
    ]);
    logAudit_(session.user.UserId, 'SUBMIT_INSPECTION', 'INSPECTION', inspectionId, {
      roomId: room.RoomId, slotId: slot.SlotId, dirtyCount: dirtyCount
    });
    return {
      inspectionId: inspectionId, roomName: room.Name, slotName: slot.Name,
      submittedAt: submittedAt, displayTime: displayDateTime_(submittedAt),
      overallStatus: dirtyCount ? 'ADA_TEMUAN' : 'BERSIH', dirtyCount: dirtyCount,
      photoCount: photoRows.length
    };
  } finally {
    lock.releaseLock();
  }
}

function photoDataUrlForFileId_(fileId) {
  if (!fileId) return '';
  try {
    var blob;
    if (String(fileId).indexOf('DRIVE:') === 0) {
      blob = DriveApp.getFileById(String(fileId).slice(6)).getBlob();
    } else {
      blob = downloadEvidenceBlobFromNas_(fileId);
    }
    if (blob) {
      return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    }
  } catch (e) {
    // fallback if error
  }
  return '';
}

function monitoringGetInspection_(payload) {
  var inspection = findBy_('INSPECTIONS', 'InspectionId', payload.inspectionId);
  assert_(inspection, 'NOT_FOUND', 'Pemeriksaan tidak ditemukan.');
  var room = findBy_('ROOMS', 'RoomId', inspection.RoomId);
  var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
  var activityNames = {};
  rowsAsObjects_('ACTIVITIES').forEach(function(activity) {
    activityNames[String(activity.ActivityId)] = activity.Name || activity.ActivityId;
  });
  var rawPhotos = inspectionPhotosFor_(inspection.InspectionId, inspection);
  var photos = rawPhotos.map(function(item) {
    return {
      photoId: item.photoId,
      fileId: item.fileId,
      fileName: item.fileName,
      sortOrder: item.sortOrder,
      dataUrl: photoDataUrlForFileId_(item.fileId)
    };
  });
  return {
    summary: monitoringInspectionSummary_(inspection),
    room: room ? monitoringPublicRoom_(room) : null,
    slot: slot ? { name: slot.Name, code: slot.Code } : null,
    details: rowsAsObjects_('INSPECTION_DETAILS').filter(function(row) {
      return row.InspectionId === inspection.InspectionId;
    }).map(function(row) {
      return {
        detailId: row.DetailId,
        activityId: row.ActivityId,
        activityName: activityNames[String(row.ActivityId)] || row.ActivityId || 'Indikator kebersihan',
        qualityResult: row.QualityResult || row.Status || 'NA',
        qualityLabel: row.QualityLabel || row.Status || '',
        functionResult: row.FunctionResult || row.FuncStatus || 'NA',
        functionLabel: row.FunctionLabel || row.FuncStatus || '',
        note: row.Note || ''
      };
    }),
    evidenceFileId: inspection.EvidenceFileId,
    photos: photos
  };
}

function inspectionPhotosFor_(inspectionId, inspection) {
  var rows = rowsAsObjects_('INSPECTION_PHOTOS').filter(function(row) {
    return String(row.InspectionId) === String(inspectionId);
  }).sort(sortByOrder_);
  if (rows.length) return rows.map(function(row) {
    return { photoId: row.PhotoId, fileId: row.FileId, fileName: row.FileName, sortOrder: Number(row.SortOrder || 0) };
  });
  // Inspection lama hanya memiliki EvidenceFileId. Pertahankan agar histori
  // existing tetap dapat dilihat dan diekspor setelah migrasi.
  return inspection && inspection.EvidenceFileId ? [{
    photoId: 'LEGACY-' + String(inspection.InspectionId), fileId: inspection.EvidenceFileId,
    fileName: inspection.EvidenceName || 'evidence', sortOrder: 1
  }] : [];
}

function monitoringGetQrData_(payload) {
  requireAdmin_(payload);
  var baseUrl = ScriptApp.getService().getUrl();
  assert_(baseUrl, 'WEBAPP_NOT_DEPLOYED', 'Deploy aplikasi sebagai Web App sebelum membuat QR Code.');
  return rowsAsObjects_('ROOMS').filter(function(room) {
    return truthy_(room.Active) && room.RoomTypeId;
  }).sort(sortByOrder_).map(function(room) {
    return {
      roomId: room.RoomId,
      code: room.Code,
      name: room.Name,
      url: baseUrl + '?room=' + encodeURIComponent(room.QrToken),
      evaluationUrl: baseUrl + '?evaluate=' + encodeURIComponent(room.QrToken)
    };
  });
}

function monitoringDashboard_(month, roomId) {
  month = /^\d{4}-\d{2}$/.test(String(month || '')) ? String(month) : monthKey_();
  var rooms = monitoringPublicRooms_();
  var visibleRooms = rooms.filter(function(room) { return !roomId || room.roomId === roomId; });
  var slots = rowsAsObjects_('SLOTS').filter(function(row) { return truthy_(row.Active); });
  var users = rowsAsObjects_('USERS');
  var roomTypes = rowsAsObjects_('ROOM_TYPES');
  var allInspections = rowsAsObjects_('INSPECTIONS').filter(function(row) {
    return String(row.State).toUpperCase() === 'SUBMITTED';
  });
  var monthly = allInspections.filter(function(row) {
    return String(row.DateKey).slice(0, 7) === month && (!roomId || row.RoomId === roomId);
  });
  var dateKey = todayKey_();
  var today = allInspections.filter(function(row) {
    return String(row.DateKey) === dateKey && (!roomId || row.RoomId === roomId);
  });
  var maps = dashboardLookupMaps_(rooms, slots, users);
  var roomStatus = visibleRooms.map(function(room) {
    var type = roomTypes.find(function(item) { return item.RoomTypeId === room.roomTypeId; });
    var scheduled = !type || isWorkday_(Number(type.WorkDays || 6));
    var roomSlots = slots.filter(function(slot) { return slot.RoomTypeId === room.roomTypeId; });
    var roomInspections = today.filter(function(item) { return item.RoomId === room.roomId; });
    return dashboardRoomStatus_(room, roomSlots, roomInspections, scheduled);
  });

  var expectedSlots = 0;
  roomStatus.forEach(function(room) { expectedSlots += Number(room.expectedCount || 0); });
  var completedSlots = {};
  today.forEach(function(item) { completedSlots[String(item.RoomId) + '|' + String(item.SlotId)] = true; });
  var completedCount = Math.min(expectedSlots, Object.keys(completedSlots).length);
  var todayFindings = today.filter(function(row) { return row.OverallStatus === 'ADA_TEMUAN'; });
  var pendingRooms = roomStatus.filter(function(row) {
    return row.expectedCount > row.completedCount;
  }).length;

  var attention = todayFindings.slice().sort(function(a, b) {
    return new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime();
  }).map(function(item) {
    var summary = dashboardInspectionSummary_(item, maps);
    return {
      kind: 'FINDING', title: summary.roomName + ' - ' + summary.slotName,
      description: Number(item.DirtyCount || 0) + ' indikator memerlukan tindak lanjut.',
      time: dashboardTime_(item.SubmittedAt), inspectionId: item.InspectionId
    };
  });
  roomStatus.forEach(function(room) {
    if (!room.scheduled) return;
    room.missingSlots.forEach(function(slotName) {
      attention.push({
        kind: 'PENDING', title: room.roomName + ' - ' + slotName,
        description: 'Belum dilakukan pada hari ini.', time: '', inspectionId: ''
      });
    });
  });

  var monthlyFindings = monthly.filter(function(row) { return row.OverallStatus === 'ADA_TEMUAN'; });
  var satisfactionEnd = new Date(month + '-01T00:00:00+07:00');
  satisfactionEnd.setMonth(satisfactionEnd.getMonth() + 1);
  satisfactionEnd.setDate(0);
  var satisfaction = buildEvaluationReport_({
    startDate: month + '-01',
    endDate: Utilities.formatDate(satisfactionEnd, APP.TIMEZONE, 'yyyy-MM-dd'),
    roomId: roomId || ''
  });
  return {
    month: month, roomId: roomId || '', rooms: rooms, todayKey: dateKey,
    todayTotals: {
      completionRate: expectedSlots ? Math.round(completedCount / expectedSlots * 100) : 0,
      completed: completedCount,
      expected: expectedSlots,
      findings: todayFindings.length,
      pending: Math.max(0, expectedSlots - completedCount),
      pendingRooms: pendingRooms
    },
    totals: {
      submissions: monthly.length,
      clean: monthly.length - monthlyFindings.length,
      findings: monthlyFindings.length,
      pendingBackup: 0
    },
    roomStatus: roomStatus,
    attention: attention.slice(0, 8),
    recent: monthly.sort(function(a, b) {
      return new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime();
    }).slice(0, 12).map(function(item) { return dashboardInspectionSummary_(item, maps); }),
    satisfaction: satisfaction
  };
}

function dashboardLookupMaps_(rooms, slots, users) {
  var maps = { rooms: {}, slots: {}, users: {} };
  rooms.forEach(function(item) { maps.rooms[String(item.roomId)] = item; });
  slots.forEach(function(item) { maps.slots[String(item.SlotId)] = item; });
  users.forEach(function(item) { maps.users[String(item.UserId)] = item; });
  return maps;
}

function dashboardInspectionSummary_(inspection, maps) {
  var room = maps.rooms[String(inspection.RoomId)];
  var slot = maps.slots[String(inspection.SlotId)];
  var user = maps.users[String(inspection.UserId)];
  return {
    inspectionId: inspection.InspectionId, dateKey: inspection.DateKey,
    roomId: inspection.RoomId, roomName: room ? room.name : '',
    slotId: inspection.SlotId, slotName: slot ? slot.Name : inspection.SlotCode,
    officerName: user ? user.FullName : '', role: user ? user.Role : '',
    submittedAt: inspection.SubmittedAt, displayTime: displayDateTime_(inspection.SubmittedAt),
    shortTime: dashboardTime_(inspection.SubmittedAt), overallStatus: inspection.OverallStatus,
    dirtyCount: Number(inspection.DirtyCount || 0)
  };
}

function dashboardRoomStatus_(room, roomSlots, inspections, scheduled) {
  var completed = {};
  inspections.forEach(function(item) { completed[String(item.SlotId)] = item; });
  var groups = [
    { key: 'morning', label: 'Pagi', slots: roomSlots.filter(function(slot) { return slot.Code === 'PAGI'; }) },
    { key: 'afternoon', label: 'Sore', slots: roomSlots.filter(function(slot) { return slot.Code === 'SORE'; }) },
    { key: 'inspection', label: 'Inspeksi', slots: roomSlots.filter(function(slot) { return String(slot.Code).indexOf('INSPEKSI') === 0; }) }
  ];
  var missingSlots = roomSlots.filter(function(slot) { return !completed[String(slot.SlotId)]; })
    .map(function(slot) { return slot.Name; });
  return {
    roomId: room.roomId, roomName: room.name, roomTypeId: room.roomTypeId,
    scheduled: scheduled, expectedCount: scheduled ? roomSlots.length : 0,
    completedCount: scheduled ? roomSlots.length - missingSlots.length : 0,
    missingSlots: scheduled ? missingSlots : [],
    groups: groups.map(function(group) {
      return dashboardGroupStatus_(group.key, group.label, group.slots, completed, scheduled);
    })
  };
}

function dashboardGroupStatus_(key, label, slots, completed, scheduled) {
  if (!scheduled) return { key: key, label: label, status: 'NOT_SCHEDULED', text: 'Tidak dijadwalkan', inspectionId: '' };
  if (!slots.length) return { key: key, label: label, status: 'NA', text: '-', inspectionId: '' };
  var results = slots.map(function(slot) { return completed[String(slot.SlotId)] || null; });
  var completedItems = results.filter(Boolean);
  var completedCount = completedItems.length;
  var findingItem = results.find(function(item) { return item && item.OverallStatus === 'ADA_TEMUAN'; });
  var primaryItem = findingItem || completedItems[0];
  var inspId = primaryItem ? primaryItem.InspectionId : '';
  if (findingItem) return { key: key, label: label, status: 'FINDING', text: 'Ada temuan', inspectionId: inspId };
  if (completedCount === slots.length) return { key: key, label: label, status: 'DONE', text: 'Selesai', inspectionId: inspId };
  if (completedCount) return { key: key, label: label, status: 'PARTIAL', text: completedCount + '/' + slots.length + ' selesai', inspectionId: inspId };
  return { key: key, label: label, status: 'PENDING', text: 'Menunggu', inspectionId: '' };
}

function dashboardTime_(value) {
  return value ? Utilities.formatDate(new Date(value), APP.TIMEZONE, 'HH:mm') : '';
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
    var seededStandard = monitoringStandardFor_(roomTypeId, row.Name);
    return {
      activityId: row.ActivityId, name: row.Name,
      standardCategory: row.StandardCategory || seededStandard.category,
      standardText: row.StandardText || seededStandard.text,
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
    backupStatus: inspection.BackupStatus || 'PENDING',
    state: inspection.State || 'SUBMITTED'
  };
}

function monitoringInspectionSummaryFromSource_(inspection, source) {
  var room = source.ROOMS.find(function(item) { return String(item.RoomId) === String(inspection.RoomId); });
  var user = source.USERS.find(function(item) { return String(item.UserId) === String(inspection.UserId); });
  var slot = source.SLOTS.find(function(item) { return String(item.SlotId) === String(inspection.SlotId); });
  return {
    inspectionId: inspection.InspectionId, dateKey: inspection.DateKey,
    roomId: inspection.RoomId, roomName: room ? room.Name : '',
    slotId: inspection.SlotId, slotName: slot ? slot.Name : inspection.SlotCode,
    officerName: user ? user.FullName : '', role: user ? user.Role : '',
    scannedAt: inspection.ScannedAt, submittedAt: inspection.SubmittedAt,
    displayTime: displayDateTime_(inspection.SubmittedAt),
    overallStatus: inspection.OverallStatus, dirtyCount: Number(inspection.DirtyCount || 0),
    backupStatus: inspection.BackupStatus || 'PENDING',
    state: inspection.State || 'SUBMITTED'
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
