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
  var required = monitoringRoomTypes_().map(function(type) { return type.sheet; });
  var missing = required.filter(function(name) { return !ss.getSheetByName(name); });
  assert_(!missing.length, 'INVALID_TEMPLATE', 'Sheet template tidak ditemukan: ' + missing.join(', '));
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
  var template = SpreadsheetApp.openById(templateId);
  var sourceSheet = template.getSheetByName(roomType.TemplateSheet);
  assert_(sourceSheet, 'INVALID_TEMPLATE', 'Sheet template untuk ruangan ini tidak tersedia.');

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
  var report = sourceSheet.copyTo(temp).setName(roomType.TemplateSheet);
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
  evidence.getRange('A1:H1').setValues([['Tanggal', 'Slot', 'Ruangan', 'Petugas', 'Waktu Scan', 'Waktu Kirim', 'Hasil', 'Evidence']])
    .setBackground(APP.COLORS.blue).setFontColor('#ffffff').setFontWeight('bold');
  evidence.setFrozenRows(1);
  inspections.sort(function(a, b) { return new Date(a.SubmittedAt) - new Date(b.SubmittedAt); }).forEach(function(inspection, index) {
    var row = index + 2;
    var slot = findBy_('SLOTS', 'SlotId', inspection.SlotId);
    var user = findBy_('USERS', 'UserId', inspection.UserId);
    evidence.getRange(row, 1, 1, 7).setValues([[
      inspection.DateKey, slot ? slot.Name : inspection.SlotCode, room.Name,
      user ? user.FullName : '', inspection.ScannedAt, inspection.SubmittedAt, inspection.OverallStatus
    ]]);
    evidence.setRowHeight(row, 135);
    try {
      var blob = DriveApp.getFileById(inspection.EvidenceFileId).getBlob();
      evidence.insertImage(blob, 8, row).setWidth(180).setHeight(125);
    } catch (error) {
      evidence.getRange(row, 8).setValue('Evidence tidak dapat dimuat');
    }
  });
  evidence.setColumnWidths(1, 7, 145);
  evidence.setColumnWidth(8, 200);

  SpreadsheetApp.flush();
  var url = 'https://www.googleapis.com/drive/v3/files/' + temp.getId() +
    '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  var name = 'Laporan Kebersihan - ' + room.Name + ' - ' + start + '.xlsx';
  var blob = response.getBlob().setName(name);
  var folderId = PropertiesService.getScriptProperties().getProperty('REPORT_FOLDER_ID');
  if (folderId) DriveApp.getFolderById(folderId).createFile(blob);
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return {
    name: name,
    inspectionsExported: inspections.length,
    marksWritten: markRanges.length,
    shiftMarksWritten: shiftMarksWritten,
    dataUrl: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' +
      Utilities.base64Encode(blob.getBytes())
  };
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
