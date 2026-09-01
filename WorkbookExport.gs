function setReportTemplate_(payload) {
  requireAdmin_(payload);
  var spreadsheetId = extractSpreadsheetId_(payload.spreadsheetId);
  assert_(spreadsheetId, 'INVALID_TEMPLATE_ID',
    'ID Spreadsheet tidak valid. Salin bagian URL di antara /d/ dan /edit, bukan angka gid setelah #gid=.');
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw appError_('TEMPLATE_NOT_ACCESSIBLE',
      'Spreadsheet template tidak ditemukan atau tidak dapat diakses. Pastikan memakai ID di antara /d/ dan /edit serta file dimiliki/dapat diakses akun pemilik Apps Script.');
  }
  var missing = monitoringRoomTypes_().filter(function(type) {
    return !findReportTemplateSheet_(ss, type);
  });
  assert_(!missing.length, 'INVALID_TEMPLATE',
    'Template belum lengkap. Sheet yang tidak ditemukan: ' + missing.map(function(type) {
      return type.name + ' (' + reportTemplateAliases_(type.id, type.sheet).join(' / ') + ')';
    }).join(', ') + '. Sheet yang tersedia: ' + ss.getSheets().map(function(sheet) {
      return sheet.getName();
    }).join(', '));
  PropertiesService.getScriptProperties().setProperty('REPORT_TEMPLATE_SPREADSHEET_ID', spreadsheetId);
  logAudit_(payload._session.user.UserId, 'SET_REPORT_TEMPLATE', 'SYSTEM', spreadsheetId, {});
  return { configured: true, spreadsheetId: spreadsheetId, spreadsheetUrl: ss.getUrl() };
}

function extractSpreadsheetId_(value) {
  var text = String(value || '').trim();
  var urlMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
  if (urlMatch) return urlMatch[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(text) ? text : '';
}

function exportMonitoringWorkbook_(payload) {
  requireAdmin_(payload);
  var room = findActiveRoomById_(String(payload.roomId || ''));
  assert_(room, 'ROOM_REQUIRED', 'Pilih ruangan yang akan diekspor.');
  var start = String(payload.weekStart || '');
  assert_(/^\d{4}-\d{2}-\d{2}$/.test(start), 'PERIOD_REQUIRED', 'Tanggal awal minggu wajib dipilih.');
  var templateId = PropertiesService.getScriptProperties().getProperty('REPORT_TEMPLATE_SPREADSHEET_ID');
  assert_(templateId, 'TEMPLATE_NOT_CONFIGURED', 'Template laporan belum dipasang. Konversikan workbook acuan menjadi Google Sheets lalu simpan ID-nya di menu konfigurasi.');

  var roomType = findBy_('ROOM_TYPES', 'RoomTypeId', room.RoomTypeId);
  assert_(roomType, 'INVALID_ROOM_TYPE', 'Template ruangan tidak ditemukan pada konfigurasi aplikasi.');
  var template = SpreadsheetApp.openById(templateId);
  var sourceSheet = findReportTemplateSheet_(template, roomType);
  assert_(sourceSheet, 'INVALID_TEMPLATE',
    'Sheet template untuk ' + room.Name + ' tidak tersedia. Nama yang diterima: ' +
    reportTemplateAliases_(room.RoomTypeId, roomType.TemplateSheet).join(' / ') +
    '. Sheet yang tersedia: ' + template.getSheets().map(function(sheet) { return sheet.getName(); }).join(', ') +
    '. Untuk Ruang Arsip gunakan workbook terbaru yang memiliki sheet Ceklis Ruang Arsip.');

  var endDate = new Date(start + 'T00:00:00+07:00');
  endDate.setDate(endDate.getDate() + Number(roomType.WorkDays || 6) - 1);
  var endKey = Utilities.formatDate(endDate, APP.TIMEZONE, 'yyyy-MM-dd');
  var inspections = rowsAsObjects_('INSPECTIONS').filter(function(row) {
    return String(row.RoomId) === String(room.RoomId) &&
      String(row.State).toUpperCase() === 'SUBMITTED' &&
      String(row.DateKey) >= start && String(row.DateKey) <= endKey;
  });
  assert_(inspections.length, 'NO_EXPORT_DATA',
    'Tidak ada pemeriksaan tersimpan untuk ' + room.Name + ' pada periode ' + start + ' s.d. ' + endKey + '. Pilih tanggal Hari ke-1 yang mencakup tanggal pemeriksaan.');

  var details = rowsAsObjects_('INSPECTION_DETAILS');
  var inspectionIds = {};
  inspections.forEach(function(row) { inspectionIds[String(row.InspectionId)] = true; });
  var periodDetails = details.filter(function(row) { return inspectionIds[String(row.InspectionId)]; });
  assert_(periodDetails.length, 'NO_EXPORT_DETAILS',
    'Pemeriksaan ditemukan, tetapi detail indikatornya tidak tersedia. Periksa sheet INSPECTION_DETAILS.');

  var temp = SpreadsheetApp.create('TEMP - Laporan Kebersihan ' + room.Name + ' ' + start);
  temp.setSpreadsheetTimeZone(APP.TIMEZONE);
  var report = sourceSheet.copyTo(temp).setName(sourceSheet.getName());
  var blank = temp.getSheets().filter(function(sheet) { return sheet.getSheetId() !== report.getSheetId(); });
  blank.forEach(function(sheet) { temp.deleteSheet(sheet); });
  clearReportChecklist_(report, roomType);

  report.getRange('C3').setValue(room.Name);
  var names = {
    Arif: findUserName_('arif', 'Arif Budi Hartono'),
    Sulaiman: findUserName_('sulaiman', 'Sulaiman'),
    Ipal: findUserName_('ipal', 'Ipal Hapidz')
  };
  report.getRange('C5').setValue(names.Arif);
  report.getRange('C6').setValue(names.Sulaiman);
  report.getRange('C7').setValue(names.Ipal);
  var shiftMarksWritten = fillOfficerShiftMarks_(report, inspections);

  report.getRange('C4').setValue(start + ' s.d. ' + endKey);
  var activities = rowsAsObjects_('ACTIVITIES');
  var configuredItems = monitoringItems_();
  var periodStartDate = new Date(start + 'T00:00:00+07:00');
  var marks = {};
  inspections.forEach(function(inspection) {
    var inspectionDate = new Date(String(inspection.DateKey) + 'T00:00:00+07:00');
    var day = Math.floor((inspectionDate.getTime() - periodStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (day < 1 || day > Number(roomType.WorkDays || 6)) return;
    var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
    var slotOrder = slot ? Number(slot.SortOrder || 0) : exportSlotOrder_(room.RoomTypeId, inspection.SlotCode);
    if (!slotOrder) return;
    var slotsPerDay = room.RoomTypeId === 'TOILET' ? 6 : 3;
    var baseColumn = 4 + (day - 1) * slotsPerDay * 4 + (slotOrder - 1) * 4;
    periodDetails.filter(function(detail) {
      return String(detail.InspectionId) === String(inspection.InspectionId);
    }).forEach(function(detail) {
      var activity = activities.find(function(item) { return String(item.ActivityId) === String(detail.ActivityId); });
      if (!activity) return;
      var fallback = configuredItems.find(function(item) {
        return item.type === room.RoomTypeId && normalizeExportName_(item.name) === normalizeExportName_(activity.Name);
      });
      var exportRow = Number(activity.ExportRow || (fallback && fallback.row) || 0);
      if (!exportRow) return;
      var qualityApplicable = truthy_(activity.QualityApplicable) || Boolean(fallback && fallback.qa);
      var functionApplicable = truthy_(activity.FunctionApplicable) || Boolean(fallback && fallback.fa);
      var qualityResult = resolveExportResult_(
        detail.QualityResult, detail.Status, detail.QualityLabel,
        activity.QualityPositive || (fallback && fallback.qp),
        activity.QualityNegative || (fallback && fallback.qn)
      );
      // Data lama WiFi/P3K disimpan sebagai NA karena bagian aktivitas belum diaktifkan.
      // Adanya detail pemeriksaan berarti indikator tersebut sudah diperiksa.
      if (qualityApplicable && !qualityResult && String(detail.QualityResult).toUpperCase() === 'NA' &&
          fallback && fallback.qa) {
        qualityResult = 'POSITIVE';
      }
      var functionResult = resolveExportResult_(
        detail.FunctionResult, detail.FuncStatus, detail.FunctionLabel,
        activity.FunctionPositive || (fallback && fallback.fp),
        activity.FunctionNegative || (fallback && fallback.fn)
      );
      if (functionApplicable && !functionResult && String(detail.FunctionResult).toUpperCase() === 'NA' &&
          fallback && fallback.fa) {
        functionResult = 'POSITIVE';
      }
      if (qualityApplicable && qualityResult) {
        marks[exportCellA1_(exportRow, baseColumn + (qualityResult === 'NEGATIVE' ? 1 : 0))] = true;
      }
      if (functionApplicable && functionResult) {
        var functionColumn = exportFunctionColumn_(room.RoomTypeId, exportRow, baseColumn, functionResult);
        marks[exportCellA1_(exportRow, functionColumn)] = true;
      }
    });
  });
  var markRanges = Object.keys(marks);
  if (!markRanges.length) {
    DriveApp.getFileById(temp.getId()).setTrashed(true);
    throw appError_('NO_EXPORT_MARKS',
      'Data pemeriksaan ditemukan, tetapi tidak ada hasil yang dapat dipetakan ke template. Jalankan setupApplication sekali lagi agar konfigurasi indikator diperbarui.');
  }
  report.getRangeList(markRanges).setValue('✓');

  var evidence = temp.insertSheet('EVIDENCE');
  evidence.getRange('A1:I1').setValues([['Tanggal', 'Slot', 'Ruangan', 'Petugas', 'Waktu Scan', 'Waktu Kirim', 'Hasil', 'Evidence', 'Foto ke']])
    .setBackground(APP.COLORS.blue).setFontColor('#ffffff').setFontWeight('bold');
  evidence.setFrozenRows(1);
  var evidenceRow = 2;
  inspections.sort(function(a, b) { return new Date(a.SubmittedAt) - new Date(b.SubmittedAt); }).forEach(function(inspection) {
    var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
    var user = findBy_('USERS', 'UserId', inspection.UserId);
    var photos = inspectionPhotosFor_(inspection.InspectionId, inspection);
    if (!photos.length) photos = [{ fileId: inspection.EvidenceFileId, sortOrder: 1 }];
    photos.forEach(function(photo, photoIndex) {
      var row = evidenceRow++;
      evidence.getRange(row, 1, 1, 7).setValues([[
        inspection.DateKey, slot ? slot.Name : inspection.SlotCode, room.Name,
        user ? user.FullName : '', inspection.ScannedAt, inspection.SubmittedAt, inspection.OverallStatus
      ]]);
      evidence.getRange(row, 9).setValue(photoIndex + 1);
      evidence.setRowHeight(row, 135);
      try {
        var blob = loadStoredPhotoBlob_(photo.fileId);
        evidence.insertImage(blob, 8, row).setWidth(180).setHeight(125);
      } catch (error) {
        evidence.getRange(row, 8).setValue('Evidence tidak dapat dimuat');
      }
    });
  });
  evidence.setColumnWidths(1, 7, 145);
  evidence.setColumnWidth(8, 200);
  evidence.setColumnWidth(9, 70);

  SpreadsheetApp.flush();
  var url = 'https://www.googleapis.com/drive/v3/files/' + temp.getId() +
    '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  var name = 'Laporan Kebersihan - ' + room.Name + ' - ' + start + '.xlsx';
  var blob = response.getBlob().setName(name);
  var storedPath = uploadReportBlobToNas_(blob, name);
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return {
    name: name,
    storedPath: storedPath,
    inspectionsExported: inspections.length,
    marksWritten: markRanges.length,
    shiftMarksWritten: shiftMarksWritten,
    dataUrl: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' +
      Utilities.base64Encode(blob.getBytes())
  };
}

/**
 * Menyusun preview ringan dari data yang sama dengan ekspor workbook.
 * Preview tidak menyalin template atau memuat blob foto agar tetap responsif.
 */
function previewMonitoringWorkbook_(payload) {
  requireAdmin_(payload);
  var room = findActiveRoomById_(String(payload.roomId || ''));
  assert_(room, 'ROOM_REQUIRED', 'Pilih ruangan yang akan ditampilkan.');
  var start = String(payload.weekStart || '');
  assert_(/^\d{4}-\d{2}-\d{2}$/.test(start), 'PERIOD_REQUIRED', 'Tanggal Hari ke-1 wajib dipilih.');

  var roomType = findBy_('ROOM_TYPES', 'RoomTypeId', room.RoomTypeId);
  assert_(roomType, 'INVALID_ROOM_TYPE', 'Template ruangan tidak ditemukan pada konfigurasi aplikasi.');
  var templateId = PropertiesService.getScriptProperties().getProperty('REPORT_TEMPLATE_SPREADSHEET_ID');
  assert_(templateId, 'TEMPLATE_NOT_CONFIGURED',
    'Template laporan belum dipasang. Simpan ID Google Sheets template di menu konfigurasi.');

  var workDays = Number(roomType.WorkDays || 6);
  var endDate = new Date(start + 'T00:00:00+07:00');
  endDate.setDate(endDate.getDate() + workDays - 1);
  var endKey = Utilities.formatDate(endDate, APP.TIMEZONE, 'yyyy-MM-dd');
  var data = rowsAsObjectsBatch_(['INSPECTIONS', 'INSPECTION_DETAILS', 'ACTIVITIES', 'SLOTS', 'USERS']);
  var inspections = (data.INSPECTIONS || []).filter(function(row) {
    return String(row.RoomId) === String(room.RoomId) &&
      String(row.State).toUpperCase() === 'SUBMITTED' &&
      String(row.DateKey) >= start && String(row.DateKey) <= endKey;
  });
  inspections.sort(function(a, b) {
    return String(a.DateKey).localeCompare(String(b.DateKey)) ||
      Number(new Date(a.SubmittedAt || 0)) - Number(new Date(b.SubmittedAt || 0));
  });

  var inspectionIds = {};
  var detailsByInspection = {};
  inspections.forEach(function(row) {
    var id = String(row.InspectionId);
    inspectionIds[id] = true;
    detailsByInspection[id] = [];
  });
  (data.INSPECTION_DETAILS || []).forEach(function(row) {
    var id = String(row.InspectionId);
    if (inspectionIds[id]) detailsByInspection[id].push(row);
  });

  var activities = data.ACTIVITIES || [];
  var activitiesById = {};
  activities.forEach(function(row) { activitiesById[String(row.ActivityId)] = row; });
  var slots = (data.SLOTS || []).filter(function(row) {
    return String(row.RoomTypeId) === String(room.RoomTypeId) && truthy_(row.Active);
  }).sort(function(a, b) { return Number(a.SortOrder || 0) - Number(b.SortOrder || 0); });
  if (!slots.length) {
    slots = monitoringSlots_().filter(function(row) { return row[0] === room.RoomTypeId; }).map(function(row) {
      return { SlotId: row[0] + '-' + row[1], RoomTypeId: row[0], Code: row[1], Name: row[2], SortOrder: row[4] };
    });
  }
  var slotsById = {};
  slots.forEach(function(row) { slotsById[String(row.SlotId)] = row; });

  var configuredItems = monitoringItems_().filter(function(item) { return item.type === room.RoomTypeId; });
  var configuredActivities = activities.filter(function(row) {
    return String(row.RoomTypeId) === String(room.RoomTypeId) && truthy_(row.Active);
  });
  var previewRows = configuredItems.map(function(item, index) {
    var activity = configuredActivities.find(function(row) {
      return Number(row.ExportRow || 0) === Number(item.row) ||
        normalizeExportName_(row.Name) === normalizeExportName_(item.name);
    });
    return {
      exportRow: Number((activity && activity.ExportRow) || item.row),
      sortOrder: Number((activity && activity.SortOrder) || index + 1),
      name: String((activity && activity.Name) || item.name),
      qualityApplicable: truthy_(activity && activity.QualityApplicable) || Boolean(item.qa),
      functionApplicable: truthy_(activity && activity.FunctionApplicable) || Boolean(item.fa),
      qualityPositive: String((activity && activity.QualityPositive) || item.qp || ''),
      qualityNegative: String((activity && activity.QualityNegative) || item.qn || ''),
      functionPositive: String((activity && activity.FunctionPositive) || item.fp || ''),
      functionNegative: String((activity && activity.FunctionNegative) || item.fn || ''),
      cells: {}
    };
  }).sort(function(a, b) { return a.exportRow - b.exportRow || a.sortOrder - b.sortOrder; });
  var rowsByExportRow = {};
  previewRows.forEach(function(row) { rowsByExportRow[String(row.exportRow)] = row; });

  var periodStartDate = new Date(start + 'T00:00:00+07:00');
  inspections.forEach(function(inspection) {
    var inspectionDate = new Date(String(inspection.DateKey) + 'T00:00:00+07:00');
    var day = Math.floor((inspectionDate.getTime() - periodStartDate.getTime()) / 86400000) + 1;
    if (day < 1 || day > workDays) return;
    var slot = slotsById[String(inspection.SlotId)] || slots.find(function(item) {
      return String(item.Code) === String(inspection.SlotCode);
    });
    var slotOrder = slot ? Number(slot.SortOrder || 0) : exportSlotOrder_(room.RoomTypeId, inspection.SlotCode);
    if (!slotOrder) return;

    (detailsByInspection[String(inspection.InspectionId)] || []).forEach(function(detail) {
      var activity = activitiesById[String(detail.ActivityId)];
      if (!activity) return;
      var fallback = configuredItems.find(function(item) {
        return normalizeExportName_(item.name) === normalizeExportName_(activity.Name);
      });
      var exportRow = Number(activity.ExportRow || (fallback && fallback.row) || 0);
      var previewRow = rowsByExportRow[String(exportRow)];
      if (!previewRow) return;
      var quality = resolveExportResult_(
        detail.QualityResult, detail.Status, detail.QualityLabel,
        activity.QualityPositive || (fallback && fallback.qp),
        activity.QualityNegative || (fallback && fallback.qn)
      );
      if (previewRow.qualityApplicable && !quality && String(detail.QualityResult).toUpperCase() === 'NA' && fallback && fallback.qa) {
        quality = 'POSITIVE';
      }
      var func = resolveExportResult_(
        detail.FunctionResult, detail.FuncStatus, detail.FunctionLabel,
        activity.FunctionPositive || (fallback && fallback.fp),
        activity.FunctionNegative || (fallback && fallback.fn)
      );
      if (previewRow.functionApplicable && !func && String(detail.FunctionResult).toUpperCase() === 'NA' && fallback && fallback.fa) {
        func = 'POSITIVE';
      }
      previewRow.cells[day + ':' + slotOrder] = {
        quality: previewRow.qualityApplicable ? quality : '',
        functionResult: previewRow.functionApplicable ? func : ''
      };
    });
  });

  var users = data.USERS || [];
  var usersById = {};
  users.forEach(function(row) { usersById[String(row.UserId)] = row; });
  function userName(username, fallback) {
    var found = users.find(function(row) { return String(row.Username).toLowerCase() === username; });
    return found ? found.FullName : fallback;
  }
  function officerShift(username) {
    var user = users.find(function(row) { return String(row.Username).toLowerCase() === username; });
    var result = { PAGI: false, SORE: false };
    if (!user) return result;
    inspections.forEach(function(inspection) {
      if (String(inspection.UserId) !== String(user.UserId)) return;
      var slot = slotsById[String(inspection.SlotId)];
      var code = String((slot && slot.Code) || inspection.SlotCode || '').toUpperCase();
      if (Object.prototype.hasOwnProperty.call(result, code)) result[code] = true;
    });
    return result;
  }

  var days = [];
  for (var dayNumber = 1; dayNumber <= workDays; dayNumber++) {
    var date = new Date(start + 'T00:00:00+07:00');
    date.setDate(date.getDate() + dayNumber - 1);
    days.push({ number: dayNumber, dateKey: Utilities.formatDate(date, APP.TIMEZONE, 'yyyy-MM-dd') });
  }
  var detailsCount = Object.keys(detailsByInspection).reduce(function(total, id) {
    return total + detailsByInspection[id].length;
  }, 0);
  return {
    room: { roomId: room.RoomId, name: room.Name, roomTypeId: room.RoomTypeId },
    templateSheet: String(roomType.TemplateSheet || ''),
    period: { start: start, end: endKey, workDays: workDays },
    officers: {
      first: { name: userName('arif', 'Arif Budi Hartono'), shifts: officerShift('arif') },
      second: { name: userName('sulaiman', 'Sulaiman'), shifts: officerShift('sulaiman') },
      supervisor: userName('ipal', 'Ipal Hapidz')
    },
    days: days,
    slots: slots.map(function(row) {
      return { code: row.Code, name: row.Name, order: Number(row.SortOrder || 0) };
    }),
    rows: previewRows,
    evidence: inspections.map(function(inspection) {
      var slot = slotsById[String(inspection.SlotId)];
      var user = usersById[String(inspection.UserId)];
      return {
        dateKey: inspection.DateKey,
        slot: slot ? slot.Name : inspection.SlotCode,
        officer: user ? user.FullName : '',
        scannedAt: inspection.ScannedAt,
        submittedAt: inspection.SubmittedAt,
        status: inspection.OverallStatus,
        hasPhoto: Boolean(inspection.EvidenceFileId),
        photoCount: inspectionPhotosFor_(inspection.InspectionId, inspection).length
      };
    }),
    inspectionsCount: inspections.length,
    detailsCount: detailsCount,
    canExport: inspections.length > 0 && detailsCount > 0
  };
}

function reportTemplateAliases_(roomTypeId, configuredName) {
  var aliases = {
    GENERAL: ['Ceklis Ruangan New', 'Ceklis Ruang kerja'],
    ARCHIVE: ['Ceklis Ruang Arsip'],
    TOILET: ['Ceklis Toilet New'],
    PANTRY: ['Ceklis Pantry'],
    CLASS: ['Ceklis Ruang Kelas', 'Ceklis TUK']
  };
  var result = [];
  [configuredName].concat(aliases[String(roomTypeId || '').toUpperCase()] || []).forEach(function(name) {
    name = String(name || '').trim();
    if (name && result.indexOf(name) === -1) result.push(name);
  });
  return result;
}

function normalizeReportSheetName_(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function findReportTemplateSheet_(spreadsheet, roomType) {
  var roomTypeId = roomType.RoomTypeId || roomType.id || '';
  var configuredName = roomType.TemplateSheet || roomType.sheet || '';
  var aliases = reportTemplateAliases_(roomTypeId, configuredName);
  for (var index = 0; index < aliases.length; index++) {
    var exact = spreadsheet.getSheetByName(aliases[index]);
    if (exact) return exact;
  }
  var normalizedAliases = aliases.map(normalizeReportSheetName_);
  return spreadsheet.getSheets().find(function(sheet) {
    return normalizedAliases.indexOf(normalizeReportSheetName_(sheet.getName())) !== -1;
  }) || null;
}

function clearReportChecklist_(report, roomType) {
  var items = monitoringItems_().filter(function(item) {
    return item.type === roomType.RoomTypeId;
  });
  var rows = items.map(function(item) { return Number(item.row || 0); }).filter(Boolean);
  if (!rows.length) return;
  var slotsPerDay = roomType.RoomTypeId === 'TOILET' ? 6 : 3;
  var resultColumns = Number(roomType.WorkDays || 6) * slotsPerDay * 4;
  var cleared = {};
  rows.forEach(function(row) {
    if (cleared[row]) return;
    cleared[row] = true;
    // Per baris agar header tabel kedua Toilet (baris 25-27) tidak ikut terhapus.
    report.getRange(row, 4, 1, resultColumns).clearContent();
  });
}

function isToiletSupplyRow_(roomTypeId, exportRow) {
  return roomTypeId === 'TOILET' && (Number(exportRow) === 28 || Number(exportRow) === 29);
}

function exportFunctionColumn_(roomTypeId, exportRow, baseColumn, functionResult) {
  if (isToiletSupplyRow_(roomTypeId, exportRow)) {
    return baseColumn + (functionResult === 'NEGATIVE' ? 2 : 0);
  }
  return baseColumn + 2 + (functionResult === 'NEGATIVE' ? 1 : 0);
}

function fillOfficerShiftMarks_(report, inspections) {
  var users = rowsAsObjects_('USERS');
  var officers = [
    { username: 'arif', row: 5 },
    { username: 'sulaiman', row: 6 }
  ];
  var written = 0;
  officers.forEach(function(officer) {
    var user = users.find(function(item) {
      return String(item.Username || '').toLowerCase() === officer.username;
    });
    var completed = { PAGI: false, SORE: false };
    if (user) {
      inspections.forEach(function(inspection) {
        if (String(inspection.UserId) !== String(user.UserId)) return;
        var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
        var code = String((slot && slot.Code) || inspection.SlotCode || '').toUpperCase();
        if (Object.prototype.hasOwnProperty.call(completed, code)) completed[code] = true;
      });
    }
    report.getRange('D' + officer.row).setValue(completed.PAGI ? '[✓]' : '[   ]');
    report.getRange('H' + officer.row).setValue(completed.SORE ? '[✓]' : '[   ]');
    if (completed.PAGI) written++;
    if (completed.SORE) written++;
  });
  return written;
}

function resolveExportResult_(result, legacyResult, label, positiveLabel, negativeLabel) {
  var direct = String(result || '').toUpperCase();
  if (direct === 'POSITIVE' || direct === 'NEGATIVE') return direct;
  var legacy = String(legacyResult || '').toUpperCase();
  if (['BERSIH', 'BERFUNGSI', 'SUDAH', 'YA', 'NORMAL', 'ADA'].indexOf(legacy) !== -1) return 'POSITIVE';
  if (['TIDAK_BERSIH', 'TIDAK_BERFUNGSI', 'BELUM', 'TIDAK', 'RUSAK', 'TIDAK_ADA'].indexOf(legacy) !== -1) return 'NEGATIVE';
  var normalizedLabel = normalizeExportName_(label);
  if (normalizedLabel && normalizedLabel === normalizeExportName_(positiveLabel)) return 'POSITIVE';
  if (normalizedLabel && normalizedLabel === normalizeExportName_(negativeLabel)) return 'NEGATIVE';
  return '';
}

function normalizeExportName_(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function exportCellA1_(row, column) {
  var letters = '';
  var value = Number(column);
  while (value > 0) {
    var remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters + Number(row);
}

function exportSlotOrder_(roomTypeId, slotCode) {
  var code = String(slotCode || '').toUpperCase();
  var general = { PAGI: 1, SORE: 2, INSPEKSI: 3 };
  var toilet = { PAGI: 1, INSPEKSI_1: 2, SIANG: 3, INSPEKSI_2: 4, SORE: 5, INSPEKSI_3: 6 };
  return Number((roomTypeId === 'TOILET' ? toilet : general)[code] || 0);
}

function findUserName_(username, fallback) {
  var user = rowsAsObjects_('USERS').find(function(row) { return row.Username === username; });
  return user ? user.FullName : fallback;
}
