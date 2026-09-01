var EVALUATION_RATING_LABELS_ = {
  1: 'Sangat perlu ditingkatkan',
  2: 'Perlu ditingkatkan',
  3: 'Baik',
  4: 'Sangat baik'
};

function evaluationAspectsFor_(roomTypeId) {
  var configuredRows = [];
  try { configuredRows = rowsAsObjects_('EVALUATION_ASPECTS'); } catch (error) { configuredRows = []; }
  var configured = configuredRows.filter(function(row) {
    return String(row.RoomTypeId) === String(roomTypeId) && truthy_(row.Active);
  }).sort(sortByOrder_);
  if (configured.length) {
    return configured.map(function(row) {
      return { code: String(row.Code), label: String(row.Label), sortOrder: Number(row.SortOrder || 0) };
    });
  }
  return monitoringEvaluationAspectSeeds_().filter(function(row) {
    return String(row[0]) === String(roomTypeId);
  }).map(function(row) {
    return { code: row[1], label: row[2], sortOrder: Number(row[3] || 0) };
  });
}

function evaluationRoomByToken_(token) {
  var value = String(token || '').trim();
  var room = rowsAsObjects_('ROOMS').find(function(item) {
    return String(item.QrToken) === value && truthy_(item.Active) && item.RoomTypeId;
  });
  assert_(room, 'INVALID_EVALUATION_ROOM', 'Tautan evaluasi tidak valid atau ruangan sudah tidak aktif.');
  var roomType = findBy_('ROOM_TYPES', 'RoomTypeId', room.RoomTypeId);
  assert_(roomType && truthy_(roomType.Active), 'INVALID_ROOM_TYPE', 'Template ruangan tidak aktif.');
  return { room: room, roomType: roomType };
}

function getEvaluationContext_(payload) {
  var target = evaluationRoomByToken_(payload.roomToken);
  return {
    app: appPublicConfig_(),
    room: monitoringPublicRoom_(target.room),
    roomType: { id: target.roomType.RoomTypeId, name: target.roomType.Name },
    aspects: evaluationAspectsFor_(target.roomType.RoomTypeId),
    ratingLabels: EVALUATION_RATING_LABELS_
  };
}

function submitEvaluation_(payload) {
  var target = evaluationRoomByToken_(payload.roomToken);
  var rating = Number(payload.rating);
  assert_([1, 2, 3, 4].indexOf(rating) !== -1, 'INVALID_RATING', 'Pilih rating 1 sampai 4.');

  var aspects = evaluationAspectsFor_(target.roomType.RoomTypeId);
  var allowed = {};
  aspects.forEach(function(aspect) { allowed[aspect.code] = aspect; });
  var selected = Array.isArray(payload.aspectCodes) ? payload.aspectCodes.map(function(code) {
    return String(code || '').trim();
  }).filter(function(code, index, list) {
    return code && list.indexOf(code) === index && allowed[code];
  }) : [];
  var comment = String(payload.comment || '').trim().slice(0, 2000);
  if (rating <= 2) {
    assert_(selected.length, 'EVALUATION_ASPECT_REQUIRED', 'Pilih setidaknya satu aspek yang perlu ditingkatkan.');
    assert_(comment, 'EVALUATION_COMMENT_REQUIRED', 'Jelaskan alasan rating agar dapat ditindaklanjuti.');
  }

  var submittedAt = nowIso_();
  var week = monitoringWeekInfo_(new Date(submittedAt));
  var row = {
    EvaluationId: id_('EVAL'), RoomId: target.room.RoomId, RoomTypeId: target.roomType.RoomTypeId,
    Rating: rating, RatingLabel: EVALUATION_RATING_LABELS_[rating],
    AspectCodes: JSON.stringify(selected), Comment: safeCellText_(comment),
    DateKey: Utilities.formatDate(new Date(submittedAt), APP.TIMEZONE, 'yyyy-MM-dd'),
    WeekStart: week.weekStart,
    MonthKey: Utilities.formatDate(new Date(submittedAt), APP.TIMEZONE, 'yyyy-MM'),
    SubmittedAt: submittedAt, Source: 'QR_ANONYMOUS',
    UserAgent: safeCellText_(String(payload.userAgent || '').slice(0, 500))
  };
  appendObject_('EVALUATIONS', row);
  logAudit_('', 'SUBMIT_EVALUATION', 'EVALUATION', row.EvaluationId, {
    roomId: row.RoomId, rating: rating, aspectCount: selected.length, anonymous: true
  });
  return {
    evaluationId: row.EvaluationId,
    roomName: target.room.Name,
    rating: rating,
    ratingLabel: row.RatingLabel,
    submittedAt: submittedAt,
    displayTime: displayDateTime_(submittedAt)
  };
}

function evaluationPeriod_(payload) {
  var start = String(payload.startDate || '').trim();
  var end = String(payload.endDate || '').trim();
  if (!start && /^\d{4}-\d{2}$/.test(String(payload.month || ''))) {
    start = String(payload.month) + '-01';
    var monthDate = new Date(start + 'T00:00:00+07:00');
    monthDate.setMonth(monthDate.getMonth() + 1);
    monthDate.setDate(0);
    end = Utilities.formatDate(monthDate, APP.TIMEZONE, 'yyyy-MM-dd');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) start = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-01');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    end = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyy-MM-dd');
  }
  assert_(start <= end, 'INVALID_PERIOD', 'Tanggal mulai harus sebelum tanggal akhir.');
  return { start: start, end: end };
}

function parseEvaluationAspects_(value) {
  try {
    var parsed = JSON.parse(String(value || '[]'));
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch (error) {}
  return String(value || '').split(',').map(function(item) { return item.trim(); }).filter(Boolean);
}

function buildEvaluationReport_(payload) {
  var period = evaluationPeriod_(payload || {});
  var roomId = String((payload && payload.roomId) || '');
  var hiddenRoomMap = {};
  try { hiddenRoomMap = sharedHiddenRoomMap_(); } catch (e) { hiddenRoomMap = {}; }

  var source = {};
  ['EVALUATIONS', 'ROOMS', 'ROOM_TYPES', 'EVALUATION_ASPECTS'].forEach(function(name) {
    try { source[name] = rowsAsObjects_(name); } catch (error) { source[name] = []; }
  });
  var rooms = (source.ROOMS || []).filter(function(room) {
    return truthy_(room.Active) && !hiddenRoomMap[String(room.RoomId)];
  });
  var roomMap = {};
  rooms.forEach(function(room) { roomMap[String(room.RoomId)] = room; });
  var typeMap = {};
  (source.ROOM_TYPES || []).forEach(function(type) { typeMap[String(type.RoomTypeId)] = type; });
  var aspectMap = {};
  (source.EVALUATION_ASPECTS || []).forEach(function(aspect) {
    aspectMap[String(aspect.RoomTypeId) + '|' + String(aspect.Code)] = aspect.Label;
  });

  // Muat semua inspeksi untuk mencari penanggung jawab evaluasi
  var allInspections = [];
  try {
    allInspections = rowsAsObjects_('INSPECTIONS').filter(function(item) {
      return String(item.State) === 'SUBMITTED' && !hiddenRoomMap[String(item.RoomId)];
    });
  } catch (e) { allInspections = []; }

  // Muat peta user
  var userMap = {};
  try {
    rowsAsObjects_('USERS').forEach(function(user) {
      userMap[String(user.UserId)] = user;
    });
  } catch (e) {}

  var rows = (source.EVALUATIONS || []).filter(function(row) {
    return String(row.DateKey) >= period.start && String(row.DateKey) <= period.end &&
      (!roomId || String(row.RoomId) === roomId) &&
      !hiddenRoomMap[String(row.RoomId)];
  });
  rows.sort(function(a, b) { return new Date(b.SubmittedAt).getTime() - new Date(a.SubmittedAt).getTime(); });

  var distribution = [1, 2, 3, 4].map(function(rating) {
    var count = rows.filter(function(row) { return Number(row.Rating) === rating; }).length;
    return { rating: rating, label: EVALUATION_RATING_LABELS_[rating], count: count,
      percentage: rows.length ? Math.round(count / rows.length * 1000) / 10 : 0 };
  });
  var aspectCounts = {};
  rows.forEach(function(row) {
    parseEvaluationAspects_(row.AspectCodes).forEach(function(code) {
      var key = String(row.RoomTypeId) + '|' + code;
      if (!aspectCounts[key]) aspectCounts[key] = { code: code, label: aspectMap[key] || code, count: 0 };
      aspectCounts[key].count++;
    });
  });
  var lowRows = rows.filter(function(row) { return Number(row.Rating) <= 2; });
  var aspects = Object.keys(aspectCounts).map(function(key) {
    var item = aspectCounts[key];
    return {
      code: item.code, label: item.label, count: item.count,
      percentage: rows.length ? Math.round(item.count / rows.length * 1000) / 10 : 0,
      percentageOfLowRatings: lowRows.length ? Math.round(item.count / lowRows.length * 1000) / 10 : 0
    };
  }).sort(function(a, b) { return b.count - a.count || a.label.localeCompare(b.label); });

  var byRoom = {};
  rows.forEach(function(row) {
    var key = String(row.RoomId);
    if (!byRoom[key]) byRoom[key] = { roomId: row.RoomId, roomName: roomMap[key] ? roomMap[key].Name : 'Ruangan', count: 0, total: 0 };
    byRoom[key].count++;
    byRoom[key].total += Number(row.Rating || 0);
  });
  var roomSummary = Object.keys(byRoom).map(function(key) {
    var item = byRoom[key];
    return { roomId: item.roomId, roomName: item.roomName, count: item.count,
      averageRating: item.count ? Math.round(item.total / item.count * 100) / 100 : 0 };
  }).sort(function(a, b) { return b.count - a.count || a.roomName.localeCompare(b.roomName); });

  var totalRating = rows.reduce(function(total, row) { return total + Number(row.Rating || 0); }, 0);
  var satisfied = rows.filter(function(row) { return Number(row.Rating) >= 3; }).length;
  return {
    period: period, roomId: roomId,
    roomName: roomId && roomMap[roomId] ? roomMap[roomId].Name : 'Semua ruangan',
    total: rows.length,
    averageRating: rows.length ? Math.round(totalRating / rows.length * 100) / 100 : 0,
    satisfied: satisfied,
    satisfactionRate: rows.length ? Math.round(satisfied / rows.length * 1000) / 10 : 0,
    lowRatingCount: lowRows.length,
    distribution: distribution,
    aspects: aspects,
    rooms: roomSummary,
    history: rows.slice(0, 100).map(function(row) {
      var room = roomMap[String(row.RoomId)];
      // Cari penanggung jawab: inspection terakhir di ruangan ini sebelum evaluasi dikirim
      var evalTime = new Date(row.SubmittedAt).getTime();
      var responsibleInspection = null;
      var responsibleTime = 0;
      allInspections.forEach(function(insp) {
        if (String(insp.RoomId) !== String(row.RoomId)) return;
        var inspTime = new Date(insp.SubmittedAt).getTime();
        if (inspTime <= evalTime && inspTime > responsibleTime) {
          responsibleTime = inspTime;
          responsibleInspection = insp;
        }
      });
      var lastOfficerName = '';
      var lastOfficerTime = '';
      if (responsibleInspection && userMap[String(responsibleInspection.UserId)]) {
        lastOfficerName = userMap[String(responsibleInspection.UserId)].FullName || '';
        lastOfficerTime = displayDateTime_(responsibleInspection.SubmittedAt);
      }
      return {
        evaluationId: row.EvaluationId, dateKey: row.DateKey, submittedAt: row.SubmittedAt,
        displayTime: displayDateTime_(row.SubmittedAt), roomName: room ? room.Name : 'Ruangan',
        roomTypeName: typeMap[String(row.RoomTypeId)] ? typeMap[String(row.RoomTypeId)].Name : '',
        rating: Number(row.Rating), ratingLabel: row.RatingLabel || EVALUATION_RATING_LABELS_[Number(row.Rating)],
        aspects: parseEvaluationAspects_(row.AspectCodes).map(function(code) {
          return aspectMap[String(row.RoomTypeId) + '|' + code] || code;
        }), comment: String(row.Comment || ''),
        lastOfficerName: lastOfficerName,
        lastOfficerTime: lastOfficerTime
      };
    })
  };
}

function getEvaluationReport_(payload) {
  requireAdmin_(payload);
  return buildEvaluationReport_(payload);
}

function storeEvaluationReportBlob_(blob, name) {
  return storeReportBlobInDrive_(blob, name);
}

function exportEvaluationExcel_(payload) {
  var session = requireAdmin_(payload);
  var report = buildEvaluationReport_(payload);
  var title = 'Rekap Kepuasan Pengguna - ' + report.period.start + ' s.d. ' + report.period.end;
  var spreadsheet = SpreadsheetApp.create(title);
  var summary = spreadsheet.getSheets()[0];
  summary.setName('RINGKASAN');
  summary.getRange(1, 1, 1, 2).setValues([['Metrik', 'Nilai']]).setFontWeight('bold').setBackground(APP.COLORS.blue).setFontColor('#ffffff');
  var summaryRows = [
    ['Periode', report.period.start + ' s.d. ' + report.period.end],
    ['Ruangan', report.roomName],
    ['Jumlah rating', report.total],
    ['Rata-rata rating', report.averageRating],
    ['Tingkat kepuasan (rating 3-4)', report.satisfactionRate + '%'],
    ['Rating rendah (1-2)', report.lowRatingCount]
  ];
  summary.getRange(2, 1, summaryRows.length, 2).setValues(summaryRows);
  summary.getRange(9, 1, 1, 4).setValues([['Rating', 'Keterangan', 'Jumlah', 'Persentase']]).setFontWeight('bold').setBackground(APP.COLORS.blue).setFontColor('#ffffff');
  summary.getRange(10, 1, report.distribution.length, 4).setValues(report.distribution.map(function(item) {
    return [item.rating, item.label, item.count, item.percentage + '%'];
  }));
  var aspectsSheet = spreadsheet.insertSheet('ASPEK');
  aspectsSheet.getRange(1, 1, 1, 5).setValues([['Aspek', 'Jumlah dipilih', '% seluruh rating', '% rating rendah', 'Catatan']]).setFontWeight('bold').setBackground(APP.COLORS.blue).setFontColor('#ffffff');
  aspectsSheet.getRange(2, 1, Math.max(1, report.aspects.length), 5).setValues(report.aspects.length ? report.aspects.map(function(item) {
    return [item.label, item.count, item.percentage + '%', item.percentageOfLowRatings + '%', 'Alasan rating 1-2'];
  }) : [['Belum ada aspek', 0, '0%', '0%', '']]);
  var historySheet = spreadsheet.insertSheet('HISTORI');
  historySheet.getRange(1, 1, 1, 8).setValues([['Tanggal', 'Waktu', 'Ruangan', 'Rating', 'Keterangan', 'Aspek yang dipilih', 'Komentar', 'Petugas terakhir monitoring']]).setFontWeight('bold').setBackground(APP.COLORS.blue).setFontColor('#ffffff');
  var historyRows = report.history.map(function(item) {
    return [item.dateKey, item.displayTime, item.roomName, item.rating, item.ratingLabel, item.aspects.join(', '), item.comment, item.lastOfficerName || '-'];
  });
  if (historyRows.length) historySheet.getRange(2, 1, historyRows.length, 8).setValues(historyRows);
  [summary, aspectsSheet, historySheet].forEach(function(sheet) { sheet.autoResizeColumns(1, sheet.getLastColumn()); sheet.setFrozenRows(1); });
  SpreadsheetApp.flush();
  var url = 'https://www.googleapis.com/drive/v3/files/' + spreadsheet.getId() + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  var name = title + '.xlsx';
  var blob = response.getBlob().setName(name);
  var storedPath = storeEvaluationReportBlob_(blob, name);
  DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
  logAudit_(session.user.UserId, 'EXPORT_EVALUATION_EXCEL', 'REPORT', storedPath, { start: report.period.start, end: report.period.end, total: report.total });
  return { name: name, fileId: storedPath, dataUrl: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + Utilities.base64Encode(blob.getBytes()), total: report.total };
}

function generateEvaluationPdf_(payload) {
  var session = requireAdmin_(payload);
  var report = buildEvaluationReport_(payload);
  var title = 'Rekap Kepuasan Pengguna - ' + report.period.start + ' s.d. ' + report.period.end;
  var doc = DocumentApp.create(title);
  var body = doc.getBody();
  body.appendParagraph(APP.INSTITUTION).setHeading(DocumentApp.ParagraphHeading.HEADING2).setForegroundColor(APP.COLORS.blue);
  body.appendParagraph('REKAP EVALUASI KEPUASAN PENGGUNA').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Periode: ' + report.period.start + ' s.d. ' + report.period.end + ' | ' + report.roomName);
  body.appendHorizontalRule();
  body.appendParagraph('Ringkasan').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  styleDocTable_(body.appendTable([
    ['Jumlah rating', String(report.total)], ['Rata-rata rating', String(report.averageRating) + ' dari 4'],
    ['Tingkat kepuasan', String(report.satisfactionRate) + '%'], ['Rating rendah', String(report.lowRatingCount)]
  ]));
  body.appendParagraph('Distribusi rating').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var ratingRows = [['Rating', 'Keterangan', 'Jumlah', 'Persentase']];
  report.distribution.forEach(function(item) { ratingRows.push([String(item.rating), item.label, String(item.count), item.percentage + '%']); });
  styleDocTable_(body.appendTable(ratingRows));
  body.appendParagraph('Aspek yang perlu ditingkatkan').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var aspectRows = [['Aspek', 'Jumlah', '% seluruh rating', '% rating rendah']];
  report.aspects.forEach(function(item) { aspectRows.push([item.label, String(item.count), item.percentage + '%', item.percentageOfLowRatings + '%']); });
  if (aspectRows.length === 1) aspectRows.push(['Belum ada data', '0', '0%', '0%']);
  styleDocTable_(body.appendTable(aspectRows));
  body.appendParagraph('Histori rating').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var historyRows = [['Tanggal', 'Waktu', 'Ruangan', 'Rating', 'Aspek', 'Komentar', 'Petugas terakhir']];
  report.history.forEach(function(item) {
    historyRows.push([item.dateKey, item.displayTime, item.roomName, String(item.rating), item.aspects.join(', '), item.comment || '-', item.lastOfficerName || '-']);
  });
  if (historyRows.length === 1) historyRows.push(['-', 'Belum ada data', '-', '-', '-', '-', '-']);
  styleDocTable_(body.appendTable(historyRows));
  body.appendParagraph('Dibuat otomatis pada ' + displayDateTime_(nowIso_()) + ' WIB. Nama pengisi tidak dicatat.');
  doc.saveAndClose();
  var pdfBlob = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(title + '.pdf');
  var storedPath = storeEvaluationReportBlob_(pdfBlob, title + '.pdf');
  var dataUrl = 'data:application/pdf;base64,' + Utilities.base64Encode(pdfBlob.getBytes());
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  logAudit_(session.user.UserId, 'EXPORT_EVALUATION_PDF', 'REPORT', storedPath, { start: report.period.start, end: report.period.end, total: report.total });
  return { name: title + '.pdf', fileId: storedPath, dataUrl: dataUrl, total: report.total };
}

/**
 * Membangun laporan performa petugas secara komprehensif:
 * — Statistik per petugas (total, clean/dirty, coverage, pola waktu, rata-rata rating dari evaluasi anonim)
 * — Detail per ruangan untuk tiap petugas
 * — Ruangan yang tidak tercover per petugas (mengecualikan ruangan yang di-hidden)
 * — Coverage matrix (ruangan × petugas)
 * — Ruangan yang tidak ada inspeksi sama sekali di periode ini (kecualikan hidden)
 */
function buildOfficerPerformanceReport_(payload) {
  var period = evaluationPeriod_(payload || {});
  var hiddenRoomMap = {};
  try { hiddenRoomMap = sharedHiddenRoomMap_(); } catch (e) { hiddenRoomMap = {}; }

  // Hanya ruangan aktif dan TIDAK di-hidden
  var activeRooms = [];
  try {
    activeRooms = rowsAsObjects_('ROOMS').filter(function(room) {
      return truthy_(room.Active) && !hiddenRoomMap[String(room.RoomId)];
    }).sort(sortByOrder_);
  } catch (e) { activeRooms = []; }

  var roomMap = {};
  activeRooms.forEach(function(room) { roomMap[String(room.RoomId)] = room; });

  var allActiveRoomIds = activeRooms.map(function(r) { return String(r.RoomId); });
  var totalActiveRooms = activeRooms.length;

  // Hitung total hari dalam periode (untuk daily coverage rate dan target sesi)
  var periodStart = new Date(period.start + 'T00:00:00+07:00');
  var periodEnd = new Date(period.end + 'T00:00:00+07:00');
  var totalPeriodDays = Math.max(1, Math.round((periodEnd - periodStart) / 86400000) + 1);

  // Ambil hanya inspeksi untuk ruangan aktif & tidak di-hidden pada periode ini
  var allInspections = [];
  try {
    allInspections = rowsAsObjects_('INSPECTIONS').filter(function(item) {
      return String(item.State) === 'SUBMITTED' &&
        String(item.DateKey) >= period.start &&
        String(item.DateKey) <= period.end &&
        !hiddenRoomMap[String(item.RoomId)] &&
        roomMap[String(item.RoomId)];
    });
  } catch (e) { allInspections = []; }

  // Seluruh inspeksi yang pernah tersubmit (untuk pencarian penanggung jawab evaluasi)
  var allHistoricalInspections = [];
  try {
    allHistoricalInspections = rowsAsObjects_('INSPECTIONS').filter(function(item) {
      return String(item.State) === 'SUBMITTED' &&
        !hiddenRoomMap[String(item.RoomId)] &&
        roomMap[String(item.RoomId)];
    });
  } catch (e) { allHistoricalInspections = []; }

  // Seluruh evaluasi anonim pada periode ini (mengecualikan hidden & non-active rooms)
  var allEvaluations = [];
  try {
    allEvaluations = rowsAsObjects_('EVALUATIONS').filter(function(item) {
      return String(item.DateKey) >= period.start &&
        String(item.DateKey) <= period.end &&
        !hiddenRoomMap[String(item.RoomId)] &&
        roomMap[String(item.RoomId)];
    });
  } catch (e) { allEvaluations = []; }

  var userMap = {};
  try {
    rowsAsObjects_('USERS').forEach(function(user) {
      userMap[String(user.UserId)] = user;
    });
  } catch (e) {}

  // Hubungkan evaluasi anonim ke petugas penanggung jawab
  var officerEvaluations = {}; // userId -> array of evaluation objects
  allEvaluations.forEach(function(ev) {
    var evalTime = new Date(ev.SubmittedAt).getTime();
    var responsibleInspection = null;
    var responsibleTime = 0;
    allHistoricalInspections.forEach(function(insp) {
      if (String(insp.RoomId) !== String(ev.RoomId)) return;
      var inspTime = new Date(insp.SubmittedAt).getTime();
      if (inspTime <= evalTime && inspTime > responsibleTime) {
        responsibleTime = inspTime;
        responsibleInspection = insp;
      }
    });
    if (responsibleInspection && responsibleInspection.UserId) {
      var rUid = String(responsibleInspection.UserId);
      if (!officerEvaluations[rUid]) officerEvaluations[rUid] = [];
      officerEvaluations[rUid].push({
        evaluationId: ev.EvaluationId,
        dateKey: ev.DateKey,
        submittedAt: ev.SubmittedAt,
        displayTime: displayDateTime_(ev.SubmittedAt),
        roomId: ev.RoomId,
        roomName: roomMap[String(ev.RoomId)] ? roomMap[String(ev.RoomId)].Name : 'Ruangan',
        rating: Number(ev.Rating || 0),
        ratingLabel: ev.RatingLabel || EVALUATION_RATING_LABELS_[Number(ev.Rating)],
        aspects: parseEvaluationAspects_(ev.AspectCodes),
        comment: String(ev.Comment || '')
      });
    }
  });

  // Group by UserId → detail per ruangan dan per hari
  var byOfficer = {};
  var roomInspectionCounts = {};
  var roomSlotBreakdown = {};
  allActiveRoomIds.forEach(function(rid) {
    roomInspectionCounts[rid] = 0;
    roomSlotBreakdown[rid] = { pagi: 0, siang: 0, sore: 0, lainnya: 0 };
  });

  allInspections.forEach(function(insp) {
    var uid = String(insp.UserId || '');
    var rid = String(insp.RoomId || '');
    if (!uid || !rid || !roomMap[rid]) return;

    if (!byOfficer[uid]) {
      byOfficer[uid] = {
        userId: uid,
        officerName: userMap[uid] ? (userMap[uid].FullName || userMap[uid].Username || uid) : uid,
        total: 0, clean: 0, findings: 0,
        rooms: {},       // roomId → {total, clean, findings, dates[]}
        days: {},        // dateKey → {roomIds: Set}
        morningCount: 0, // jam < 12 (Pagi)
        noonCount: 0,    // 12 <= jam < 15 (Siang)
        afternoonCount: 0 // jam >= 15 (Sore)
      };
    }
    var entry = byOfficer[uid];
    entry.total++;
    var status = String(insp.OverallStatus) === 'BERSIH';
    if (status) entry.clean++; else entry.findings++;

    // Detail per ruangan untuk petugas
    if (!entry.rooms[rid]) entry.rooms[rid] = { total: 0, clean: 0, findings: 0, dates: {} };
    entry.rooms[rid].total++;
    if (status) entry.rooms[rid].clean++; else entry.rooms[rid].findings++;
    entry.rooms[rid].dates[String(insp.DateKey)] = true;

    // Total sesi per ruangan
    roomInspectionCounts[rid] = (roomInspectionCounts[rid] || 0) + 1;

    // Hari aktif + ruangan per hari
    if (!entry.days[String(insp.DateKey)]) entry.days[String(insp.DateKey)] = {};
    entry.days[String(insp.DateKey)][rid] = true;

    // Pola waktu & slot
    var slotCode = String(insp.SlotCode || '').toUpperCase();
    try {
      var submittedDate = new Date(insp.SubmittedAt);
      var hourWib = (submittedDate.getUTCHours() + 7) % 24;
      if (slotCode === 'PAGI' || hourWib < 12) {
        entry.morningCount++;
        roomSlotBreakdown[rid].pagi++;
      } else if (slotCode === 'SIANG' || (hourWib >= 12 && hourWib < 15)) {
        entry.noonCount++;
        roomSlotBreakdown[rid].siang++;
      } else {
        entry.afternoonCount++;
        roomSlotBreakdown[rid].sore++;
      }
    } catch (e) {
      entry.morningCount++;
      roomSlotBreakdown[rid].lainnya++;
    }
  });

  // Pastikan petugas yang menerima evaluasi juga masuk
  Object.keys(officerEvaluations).forEach(function(uid) {
    if (!byOfficer[uid]) {
      byOfficer[uid] = {
        userId: uid,
        officerName: userMap[uid] ? (userMap[uid].FullName || userMap[uid].Username || uid) : uid,
        total: 0, clean: 0, findings: 0,
        rooms: {}, days: {},
        morningCount: 0, noonCount: 0, afternoonCount: 0
      };
    }
  });

  // Hitung coverage matrix: roomId → userId → count
  var coverageMatrix = {};
  allActiveRoomIds.forEach(function(rid) { coverageMatrix[rid] = {}; });

  var totalAllEvalRatings = 0;
  var totalAllEvalCount = 0;

  var officers = Object.keys(byOfficer).map(function(uid) {
    var entry = byOfficer[uid];
    var activeDays = Object.keys(entry.days).length;

    // Hitung HANYA ruangan aktif yang valid dikerjakan oleh petugas ini
    var validWorkedRoomIds = allActiveRoomIds.filter(function(rid) {
      return entry.rooms[rid] && entry.rooms[rid].total > 0;
    });
    var roomsWorked = validWorkedRoomIds.length;
    var coverageRate = totalActiveRooms
      ? Math.min(100, Math.round((roomsWorked / totalActiveRooms) * 1000) / 10)
      : 0;

    // Evaluasi anonim untuk petugas ini
    var evals = officerEvaluations[uid] || [];
    evals.sort(function(a, b) { return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(); });
    var evalCount = evals.length;
    var evalTotalRating = evals.reduce(function(sum, item) { return sum + item.rating; }, 0);
    var evalAvgRating = evalCount ? Math.round((evalTotalRating / evalCount) * 100) / 100 : 0;
    var evalSatisfied = evals.filter(function(item) { return item.rating >= 3; }).length;
    var evalSatisfactionRate = evalCount ? Math.round((evalSatisfied / evalCount) * 1000) / 10 : 0;

    totalAllEvalRatings += evalTotalRating;
    totalAllEvalCount += evalCount;

    // Isi coverage matrix
    validWorkedRoomIds.forEach(function(rid) {
      if (coverageMatrix[rid]) coverageMatrix[rid][uid] = entry.rooms[rid].total;
    });

    // Ruangan yang dikerjakan (dengan detail)
    var roomDetails = validWorkedRoomIds.map(function(rid) {
      var rd = entry.rooms[rid];
      var roomName = roomMap[rid] ? roomMap[rid].Name : rid;
      var daysVisited = Object.keys(rd.dates).length;
      return {
        roomId: rid,
        roomName: roomName,
        inspections: rd.total,
        clean: rd.clean,
        findings: rd.findings,
        cleanRate: rd.total ? Math.round(rd.clean / rd.total * 1000) / 10 : 0,
        daysVisited: daysVisited,
        visitFrequency: activeDays ? Math.round(daysVisited / activeDays * 1000) / 10 : 0
      };
    }).sort(function(a, b) { return b.inspections - a.inspections || a.roomName.localeCompare(b.roomName); });

    // Ruangan aktif (non-hidden) yang TIDAK pernah dicover petugas ini
    var coveredMap = {};
    validWorkedRoomIds.forEach(function(rid) { coveredMap[rid] = true; });
    var roomsNotCovered = allActiveRoomIds.filter(function(rid) {
      return !coveredMap[rid];
    }).map(function(rid) {
      return { roomId: rid, roomName: roomMap[rid] ? roomMap[rid].Name : rid };
    }).sort(function(a, b) { return a.roomName.localeCompare(b.roomName); });

    // Rata-rata ruangan unik per hari aktif
    var totalUniqueRoomsPerDay = Object.keys(entry.days).reduce(function(sum, dk) {
      return sum + Object.keys(entry.days[dk]).length;
    }, 0);
    var avgRoomsPerActiveDay = activeDays ? Math.round(totalUniqueRoomsPerDay / activeDays * 10) / 10 : 0;

    // Persentase hari aktif dari total periode
    var activeDayRate = Math.min(100, Math.round(activeDays / totalPeriodDays * 1000) / 10);

    // Tingkat cakupan harian rata-rata (ruangan unik per hari / total ruangan aktif)
    var dailyCoverageRate = totalActiveRooms
      ? Math.min(100, Math.round(avgRoomsPerActiveDay / totalActiveRooms * 1000) / 10)
      : 0;

    return {
      userId: entry.userId,
      officerName: entry.officerName,
      total: entry.total,
      clean: entry.clean,
      findings: entry.findings,
      cleanRate: entry.total ? Math.round(entry.clean / entry.total * 1000) / 10 : 0,
      roomsWorked: roomsWorked,
      coverageRate: coverageRate,
      roomDetails: roomDetails,
      roomsNotCovered: roomsNotCovered,
      activeDays: activeDays,
      activeDayRate: activeDayRate,
      avgPerDay: activeDays ? Math.round(entry.total / activeDays * 10) / 10 : 0,
      avgRoomsPerActiveDay: avgRoomsPerActiveDay,
      dailyCoverageRate: dailyCoverageRate,
      morningCount: entry.morningCount,
      noonCount: entry.noonCount || 0,
      afternoonCount: entry.afternoonCount,
      morningRate: entry.total ? Math.round((entry.morningCount + (entry.noonCount || 0)) / entry.total * 1000) / 10 : 0,
      evalCount: evalCount,
      evalAvgRating: evalAvgRating,
      evalSatisfied: evalSatisfied,
      evalSatisfactionRate: evalSatisfactionRate,
      evaluations: evals
    };
  }).sort(function(a, b) { return b.total - a.total || a.officerName.localeCompare(b.officerName); });

  // Ruangan yang tidak ada satu pun inspeksi di periode ini (dari siapapun, non-hidden)
  var inspectedRoomIds = {};
  allInspections.forEach(function(insp) { inspectedRoomIds[String(insp.RoomId)] = true; });
  var uncoveredRooms = allActiveRoomIds.filter(function(rid) {
    return !inspectedRoomIds[rid];
  }).map(function(rid) {
    return { roomId: rid, roomName: roomMap[rid] ? roomMap[rid].Name : rid };
  }).sort(function(a, b) { return a.roomName.localeCompare(b.roomName); });

  // ── Cakupan Frekuensi/Sesi Monitoring per Ruangan (Multi-time monitoring coverage) ──
  var totalTargetSessionsAllRooms = 0;
  var roomSessionCoverage = activeRooms.map(function(room) {
    var rid = String(room.RoomId);
    var slotsPerDay = (String(room.RoomTypeId) === 'TOILET') ? 3 : 2; // Toilet: Pagi/Siang/Sore (3x), Lainnya: Pagi/Sore (2x)
    var targetSessions = totalPeriodDays * slotsPerDay;
    totalTargetSessionsAllRooms += targetSessions;
    var actualSessions = Number(roomInspectionCounts[rid] || 0);
    var sessionRate = targetSessions
      ? Math.min(100, Math.round((actualSessions / targetSessions) * 1000) / 10)
      : 0;
    return {
      roomId: rid,
      roomName: room.Name,
      roomTypeId: room.RoomTypeId,
      slotsPerDay: slotsPerDay,
      targetSessions: targetSessions,
      actualSessions: actualSessions,
      sessionRate: sessionRate,
      slotBreakdown: roomSlotBreakdown[rid] || { pagi: 0, siang: 0, sore: 0 }
    };
  }).sort(function(a, b) { return a.sessionRate - b.sessionRate || b.actualSessions - a.actualSessions; });

  var totalActualSessions = allInspections.length;
  var overallSessionCoverageRate = totalTargetSessionsAllRooms
    ? Math.min(100, Math.round((totalActualSessions / totalTargetSessionsAllRooms) * 1000) / 10)
    : 0;

  // Coverage matrix untuk tabel heatmap
  var officerIds = officers.map(function(o) { return o.userId; });
  var matrixRooms = activeRooms.map(function(room) {
    var rid = String(room.RoomId);
    var counts = {};
    officerIds.forEach(function(uid) { counts[uid] = coverageMatrix[rid][uid] || 0; });
    var totalInRoom = officerIds.reduce(function(s, uid) { return s + counts[uid]; }, 0);
    return {
      roomId: rid,
      roomName: room.Name,
      counts: counts,
      total: totalInRoom
    };
  }).sort(function(a, b) { return b.total - a.total || a.roomName.localeCompare(b.roomName); });

  var overallOfficerAvgRating = totalAllEvalCount
    ? Math.round((totalAllEvalRatings / totalAllEvalCount) * 100) / 100
    : 0;

  return {
    period: period,
    totalActiveRooms: totalActiveRooms,
    totalPeriodDays: totalPeriodDays,
    officers: officers,
    officerIds: officerIds,
    totalInspections: allInspections.length,
    totalEvaluations: totalAllEvalCount,
    overallOfficerAvgRating: overallOfficerAvgRating,
    uncoveredRooms: uncoveredRooms,
    matrixRooms: matrixRooms,
    sessionCoverage: {
      totalTargetSessions: totalTargetSessionsAllRooms,
      totalActualSessions: totalActualSessions,
      fulfillmentRate: overallSessionCoverageRate,
      rooms: roomSessionCoverage
    }
  };
}

function getOfficerPerformanceReport_(payload) {
  requireAdmin_(payload);
  return buildOfficerPerformanceReport_(payload);
}

