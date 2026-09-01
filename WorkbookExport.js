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

function setMonthlyReportTemplate_(payload) {
  requireAdmin_(payload);
  var spreadsheetId = extractSpreadsheetId_(payload.spreadsheetId);
  assert_(spreadsheetId, 'INVALID_TEMPLATE_ID',
    'ID Spreadsheet tidak valid. Salin bagian URL di antara /d/ dan /edit, bukan angka gid setelah #gid=.');
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw appError_('TEMPLATE_NOT_ACCESSIBLE',
      'Spreadsheet template rekap bulanan tidak ditemukan atau tidak dapat diakses oleh akun pemilik Apps Script.');
  }
  var sheet = findMonthlyReportTemplateSheet_(ss);
  assert_(sheet, 'INVALID_MONTHLY_TEMPLATE',
    'Sheet rekap bulanan tidak ditemukan. Gunakan sheet bernama Ceklis Ruangan New pada template rekap semua ruangan.');
  PropertiesService.getScriptProperties().setProperty('MONTHLY_REPORT_TEMPLATE_SPREADSHEET_ID', spreadsheetId);
  logAudit_(payload._session.user.UserId, 'SET_MONTHLY_REPORT_TEMPLATE', 'SYSTEM', spreadsheetId, {
    sheet: sheet.getName()
  });
  return { configured: true, spreadsheetId: spreadsheetId, spreadsheetUrl: ss.getUrl(), sheet: sheet.getName() };
}

function findMonthlyReportTemplateSheet_(spreadsheet) {
  var aliases = [
    'Ceklis Ruangan New',
    'Rekap Monitoring Bulanan Semua Ruangan',
    'Rekap Monitoring Bulanan',
    'Rekap Bulanan'
  ];
  for (var index = 0; index < aliases.length; index++) {
    var exact = spreadsheet.getSheetByName(aliases[index]);
    if (exact) return exact;
  }
  return spreadsheet.getSheets().find(function(sheet) {
    var name = normalizeReportSheetName_(sheet.getName());
    return name.indexOf('REKAP') !== -1 && name.indexOf('RUANGAN') !== -1;
  }) || null;
}

function monthlyReportTemplateId_() {
  var properties = PropertiesService.getScriptProperties();
  return properties.getProperty('MONTHLY_REPORT_TEMPLATE_SPREADSHEET_ID') ||
    properties.getProperty('REPORT_TEMPLATE_SPREADSHEET_ID') || '';
}

function previewMonthlyMonitoringWorkbook_(payload) {
  requireAdmin_(payload);
  return buildMonthlyMonitoringSummary_(String(payload.month || monthKey_()));
}

function exportMonthlyMonitoringWorkbook_(payload) {
  var session = requireAdmin_(payload);
  var summary = buildMonthlyMonitoringSummary_(String(payload.month || monthKey_()));
  var templateId = monthlyReportTemplateId_();
  assert_(templateId, 'TEMPLATE_NOT_CONFIGURED',
    'Template rekap bulanan belum dipasang. Konversikan TEMPLATE REKAP MONITORING BULANAN SEMUA RUANGAN.xlsx menjadi Google Sheets lalu simpan ID-nya di menu konfigurasi.');

  var template = SpreadsheetApp.openById(templateId);
  var sourceSheet = findMonthlyReportTemplateSheet_(template);
  assert_(sourceSheet, 'INVALID_MONTHLY_TEMPLATE',
    'Sheet template rekap bulanan tidak tersedia. Gunakan sheet Ceklis Ruangan New atau sheet rekap semua ruangan.');

  var temp = SpreadsheetApp.create('TEMP - Rekap Monitoring Bulanan ' + summary.month);
  temp.setSpreadsheetTimeZone(APP.TIMEZONE);
  var report = sourceSheet.copyTo(temp).setName('Rekap Bulanan');
  temp.getSheets().filter(function(sheet) {
    return sheet.getSheetId() !== report.getSheetId();
  }).forEach(function(sheet) { temp.deleteSheet(sheet); });
  buildMonthlyReportSheet_(report, summary);
  var printSheets = buildMonthlyPrintSheets_(temp, summary);
  if (printSheets.length) {
    temp.setActiveSheet(printSheets[0]);
    temp.moveActiveSheet(1);
    if (printSheets.length > 1) {
      temp.setActiveSheet(printSheets[1]);
      temp.moveActiveSheet(2);
    }
  }
  var evidence = temp.insertSheet('EVIDENCE');
  buildMonthlyEvidenceSheet_(evidence, summary);

  SpreadsheetApp.flush();
  var url = 'https://www.googleapis.com/drive/v3/files/' + temp.getId() +
    '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  var response = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  var name = 'Rekap Monitoring Bulanan - ' + summary.month + '.xlsx';
  var blob = response.getBlob().setName(name);
  var storedPath = storeReportBlobInDrive_(blob, name);
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  logAudit_(session.user.UserId, 'GENERATE_MONTHLY_WORKBOOK', 'REPORT', storedPath, {
    month: summary.month,
    roomCount: summary.rooms.length,
    inspectionsExported: summary.inspectionsCount,
    qrTokensChanged: false
  });
  return {
    name: name,
    storedPath: storedPath,
    month: summary.month,
    roomsExported: summary.rooms.length,
    daysExported: summary.days.length,
    inspectionsExported: summary.inspectionsCount,
    printSheets: printSheets.map(function(sheet) { return sheet.getName(); }),
    dataUrl: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' +
      Utilities.base64Encode(blob.getBytes())
  };
}

function buildMonthlyMonitoringSummary_(month) {
  assert_(/^\d{4}-(0[1-9]|1[0-2])$/.test(month), 'INVALID_MONTH',
    'Format bulan tidak valid. Gunakan format YYYY-MM.');
  var source = exportRowsDirect_([
    'ROOMS', 'ROOM_TYPES', 'SLOTS', 'INSPECTIONS', 'USERS', 'INSPECTION_PHOTOS'
  ]);
  var hiddenRoomMap = sharedHiddenRoomMap_();
  var rooms = (source.ROOMS || []).filter(function(room) {
    return truthy_(room.Active) && room.RoomTypeId && !hiddenRoomMap[String(room.RoomId)];
  }).sort(sortByOrder_);
  assert_(rooms.length, 'NO_ACTIVE_ROOMS', 'Tidak ada ruangan aktif yang dapat dimasukkan ke rekap bulanan.');

  var roomTypes = {};
  (source.ROOM_TYPES || []).forEach(function(type) { roomTypes[String(type.RoomTypeId)] = type; });
  var roomById = {};
  rooms.forEach(function(room) { roomById[String(room.RoomId)] = room; });
  var slotsByType = {};
  (source.SLOTS || []).filter(function(slot) { return truthy_(slot.Active); }).forEach(function(slot) {
    var typeId = String(slot.RoomTypeId);
    if (!slotsByType[typeId]) slotsByType[typeId] = [];
    slotsByType[typeId].push(slot);
  });
  Object.keys(roomTypes).forEach(function(typeId) {
    if (slotsByType[typeId] && slotsByType[typeId].length) {
      slotsByType[typeId].sort(sortByOrder_);
      return;
    }
    slotsByType[typeId] = monitoringSlots_().filter(function(row) {
      return row[0] === typeId;
    }).map(function(row) {
      return { SlotId: row[0] + '-' + row[1], RoomTypeId: row[0], Code: row[1], Name: row[2], SortOrder: row[4] };
    });
  });

  var inspections = (source.INSPECTIONS || []).filter(function(item) {
    return String(item.State).toUpperCase() === 'SUBMITTED' &&
      String(item.DateKey || '').slice(0, 7) === month && roomById[String(item.RoomId)];
  });
  var slotsById = {};
  Object.keys(slotsByType).forEach(function(typeId) {
    slotsByType[typeId].forEach(function(slot) {
      slotsById[String(slot.SlotId)] = slot;
      slotsById[typeId + '|' + normalizeExportName_(slot.Code)] = slot;
    });
  });
  var completedByRoomDate = {};
  inspections.forEach(function(inspection) {
    var room = roomById[String(inspection.RoomId)];
    if (!room) return;
    var slot = slotsById[String(inspection.SlotId)] ||
      slotsById[String(room.RoomTypeId) + '|' + normalizeExportName_(inspection.SlotCode)];
    if (!slot) return;
    var key = String(room.RoomId) + '|' + String(inspection.DateKey);
    if (!completedByRoomDate[key]) completedByRoomDate[key] = {};
    completedByRoomDate[key][String(slot.SlotId)] = true;
  });

  var photoCountByInspection = {};
  (source.INSPECTION_PHOTOS || []).forEach(function(photo) {
    var id = String(photo.InspectionId);
    photoCountByInspection[id] = Number(photoCountByInspection[id] || 0) + 1;
  });
  inspections.forEach(function(inspection) {
    var id = String(inspection.InspectionId);
    if (!photoCountByInspection[id] && inspection.EvidenceFileId) photoCountByInspection[id] = 1;
  });
  var usersById = {};
  (source.USERS || []).forEach(function(user) { usersById[String(user.UserId)] = user; });

  var parts = month.split('-').map(Number);
  var year = parts[0];
  var monthNumber = parts[1];
  var daysInMonth = new Date(year, monthNumber, 0).getDate();
  var days = [];
  for (var day = 1; day <= daysInMonth; day++) {
    var dayKey = month + '-' + String(day).padStart(2, '0');
    days.push({ number: day, dateKey: dayKey, date: new Date(dayKey + 'T12:00:00+07:00') });
  }

  var roomRows = rooms.map(function(room) {
    var type = roomTypes[String(room.RoomTypeId)] || {};
    var expectedSlots = slotsByType[String(room.RoomTypeId)] || [];
    var statuses = days.map(function(day) {
      var weekday = Number(Utilities.formatDate(day.date, APP.TIMEZONE, 'u'));
      // Rekap bulanan memakai 5 hari kerja sebagai default. Konfigurasi WorkDays
      // tetap dipakai oleh alur operasional dan ekspor per ruangan yang lama.
      var completed = completedByRoomDate[String(room.RoomId) + '|' + day.dateKey] || {};
      var status = monthlyStatusForDay_(weekday, expectedSlots, completed);
      return {
        day: day.number, dateKey: day.dateKey, code: status.code, symbol: status.symbol,
        completed: status.completed, expected: status.expected,
        scheduled: status.scheduled, actualWeekend: status.actualWeekend,
        effectiveScheduled: status.effectiveScheduled,
        completedNonInspection: status.completedNonInspection,
        expectedNonInspection: status.expectedNonInspection,
        completedInspection: status.completedInspection,
        expectedInspection: status.expectedInspection
      };
    });
    return {
      roomId: room.RoomId, code: room.Code, name: room.Name,
      roomTypeId: room.RoomTypeId, roomTypeName: type.Name || room.RoomTypeId,
      sortOrder: Number(room.SortOrder || 0), hidden: Boolean(hiddenRoomMap[String(room.RoomId)]),
      statuses: statuses
    };
  });

  var evidence = inspections.slice().sort(function(a, b) {
    return String(a.DateKey).localeCompare(String(b.DateKey)) ||
      new Date(a.SubmittedAt || 0).getTime() - new Date(b.SubmittedAt || 0).getTime();
  }).map(function(inspection) {
    var room = roomById[String(inspection.RoomId)];
    var slot = slotsById[String(inspection.SlotId)] ||
      slotsById[String(room.RoomTypeId) + '|' + normalizeExportName_(inspection.SlotCode)];
    var user = usersById[String(inspection.UserId)];
    return {
      dateKey: inspection.DateKey, roomName: room ? room.Name : 'Ruangan',
      slotName: slot ? slot.Name : inspection.SlotCode,
      officerName: user ? user.FullName : '',
      overallStatus: inspection.OverallStatus, dirtyCount: Number(inspection.DirtyCount || 0),
      photoCount: Number(photoCountByInspection[String(inspection.InspectionId)] || 0),
      submittedAt: inspection.SubmittedAt || ''
    };
  });
  return {
    month: month, monthLabel: monthlyReportMonthLabel_(year, monthNumber),
    days: days.map(function(day) { return { number: day.number, dateKey: day.dateKey }; }),
    rooms: roomRows, evidence: evidence, inspectionsCount: inspections.length,
    hiddenRoomCount: (source.ROOMS || []).filter(function(room) {
      return truthy_(room.Active) && hiddenRoomMap[String(room.RoomId)];
    }).length,
    statusLegend: [
      { code: 'GREEN', symbol: '●', label: 'Semua sesi diperiksa' },
      { code: 'PURPLE', symbol: '●', label: 'Sesi non-inspeksi lengkap, inspeksi belum lengkap' },
      { code: 'ORANGE', symbol: '●', label: 'Sesi non-inspeksi belum lengkap' },
      { code: 'RED', symbol: '●', label: 'Tidak ada sesi diperiksa' },
      { code: 'NA', symbol: '—', label: 'Hari nonjadwal' }
    ]
  };
}

function monthlyReportMonthLabel_(year, monthNumber) {
  var names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return names[Number(monthNumber) - 1] + ' ' + year;
}

function monthlyDefaultWorkday_(weekday) {
  return Number(weekday) >= 1 && Number(weekday) <= 5;
}

function monthlyInspectionSlot_(slot) {
  var code = normalizeExportName_(slot && slot.Code);
  var role = String(slot && slot.Role || '').toUpperCase();
  return code.indexOf('INSPEKSI') === 0 || role === 'SUPERVISOR';
}

function monthlyStatusForDay_(weekday, expectedSlots, completed) {
  var slots = Array.isArray(expectedSlots) ? expectedSlots : [];
  var completedMap = completed || {};
  var scheduled = monthlyDefaultWorkday_(weekday);
  var completedCount = Object.keys(completedMap).length;
  // Data pemeriksaan weekend tetap dihormati apabila memang tersimpan.
  var actualWeekend = Number(weekday) >= 6 && completedCount > 0;
  var effectiveScheduled = scheduled || actualWeekend;
  var nonInspectionSlots = slots.filter(function(slot) { return !monthlyInspectionSlot_(slot); });
  var inspectionSlots = slots.filter(monthlyInspectionSlot_);
  var isCompleted = function(slot) { return Boolean(completedMap[String(slot.SlotId)]); };
  var completedNonInspection = nonInspectionSlots.filter(isCompleted).length;
  var completedInspection = inspectionSlots.filter(isCompleted).length;
  var code = 'NA';
  if (effectiveScheduled && slots.length) {
    if (!completedCount) code = 'RED';
    else if (completedNonInspection < nonInspectionSlots.length) code = 'ORANGE';
    else if (completedInspection < inspectionSlots.length) code = 'PURPLE';
    else code = 'GREEN';
  }
  return {
    code: code,
    symbol: code === 'NA' ? '—' : '●',
    completed: Math.min(completedCount, slots.length), expected: slots.length,
    scheduled: scheduled, actualWeekend: actualWeekend, effectiveScheduled: effectiveScheduled,
    completedNonInspection: completedNonInspection, expectedNonInspection: nonInspectionSlots.length,
    completedInspection: completedInspection, expectedInspection: inspectionSlots.length
  };
}

function buildMonthlyReportSheet_(sheet, summary) {
  var dayCount = summary.days.length;
  var dataStartRow = 9;
  var dataEndRow = dataStartRow + summary.rooms.length - 1;
  var legendStartRow = dataEndRow + 2;
  var signatureRow = legendStartRow;
  var signatureCol = Math.max(5, dayCount + 3 - 6);
  var totalRows = legendStartRow + 6;
  var totalColumns = dayCount + 3;

  if (sheet.getMaxRows() && sheet.getMaxColumns()) {
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).getMergedRanges().forEach(function(range) {
      range.breakApart();
    });
  }
  sheet.clear();
  if (sheet.getMaxColumns() < totalColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalColumns - sheet.getMaxColumns());
  } else if (sheet.getMaxColumns() > totalColumns) {
    sheet.deleteColumns(totalColumns + 1, sheet.getMaxColumns() - totalColumns);
  }
  if (sheet.getMaxRows() < totalRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), totalRows - sheet.getMaxRows());
  } else if (sheet.getMaxRows() > totalRows) {
    sheet.deleteRows(totalRows + 1, sheet.getMaxRows() - totalRows);
  }

  sheet.setHiddenGridlines(true);
  // Keep merged ranges entirely on one side of the frozen-column boundary.
  // Google Sheets rejects a merge that spans frozen and non-frozen columns.
  sheet.getRange(2, 1, 1, 3).merge();
  sheet.getRange(2, 4, 1, totalColumns - 3).merge();
  sheet.getRange(7, 2, 1, 2).merge();
  sheet.getRange(2, 1).setValue('REKAP BULANAN');
  sheet.getRange(2, 4).setValue('KEBERSIHAN DAN KESIAPAN SEMUA RUANGAN');
  sheet.getRange(3, 1, 4, 3).setValues([
    ['PERIODE', ':', summary.monthLabel],
    ['JUMLAH RUANGAN', ':', summary.rooms.length],
    ['TOTAL PEMERIKSAAN', ':', summary.inspectionsCount],
    ['ATURAN STATUS', ':', '● hijau = semua sesi · ● oranye = kurang sesi · ● merah = tidak ada sesi']
  ]);
  sheet.getRange(7, 1, 1, 3).setValues([['NO', 'RUANGAN YANG DIPERIKSA', '']]);
  sheet.getRange(8, 1, 1, 3).setValues([['', '', '']]);
  sheet.getRange(7, 4, 1, dayCount).setValues([summary.days.map(function(day) { return 'Hari ke-' + day.number; })]);
  sheet.getRange(8, 4, 1, dayCount).setValues([summary.days.map(function(day) {
    return new Date(day.dateKey + 'T12:00:00+07:00');
  })]);

  summary.rooms.forEach(function(room, index) {
    var row = dataStartRow + index;
    sheet.getRange(row, 2, 1, 2).merge();
    sheet.getRange(row, 1).setValue(index + 1);
    sheet.getRange(row, 2).setValue(room.name);
    sheet.getRange(row, 4, 1, dayCount).setValues([room.statuses.map(function(status) { return status.symbol; })]);
    if (index % 2 === 1) sheet.getRange(row, 1, 1, totalColumns).setBackground('#FFF4ED');
  });

  var legendValues = [['Keterangan', ''], ['●', 'Semua sesi diperiksa'],
    ['●', 'Sesi non-inspeksi lengkap, inspeksi belum lengkap'],
    ['●', 'Sesi non-inspeksi belum lengkap'], ['●', 'Tidak ada sesi diperiksa'], ['—', 'Hari nonjadwal']];
  sheet.getRange(legendStartRow, 2, legendValues.length, 2).setValues(legendValues);
  sheet.getRange(signatureRow, signatureCol, 1, 7).merge();
  sheet.getRange(signatureRow + 1, signatureCol, 1, 7).merge();
  sheet.getRange(signatureRow + 3, signatureCol, 1, 7).merge();
  sheet.getRange(signatureRow, signatureCol).setValue('Mengetahui');
  sheet.getRange(signatureRow + 1, signatureCol).setValue('ASMAN KEU DAN MUM');
  sheet.getRange(signatureRow + 3, signatureCol).setValue(findUserName_('dwi', 'DWI MEYRIZKA PRATIVI').toUpperCase());

  // Freeze only after all merges are complete. Google Sheets rejects a merge
  // that crosses the frozen/non-frozen column boundary.
  sheet.setFrozenRows(8);
  sheet.setFrozenColumns(3);

  sheet.getRange(2, 1, 1, totalColumns).setBackground(APP.COLORS.blue).setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(2, 30);
  sheet.getRange(3, 1, 4, 1).setFontWeight('bold').setFontColor(APP.COLORS.blue);
  sheet.getRange(3, 3, 4, 1).setFontColor('#243f4b');
  sheet.getRange(7, 1, 2, totalColumns).setBackground('#EAF4F8').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, '#78909C', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(8, 4, 1, dayCount).setNumberFormat('d').setFontColor(APP.COLORS.red);
  sheet.getRange(dataStartRow, 1, summary.rooms.length, totalColumns)
    .setBorder(true, true, true, true, true, true, '#B7C7CE', SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment('middle');
  sheet.getRange(dataStartRow, 1, summary.rooms.length, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sheet.getRange(dataStartRow, 2, summary.rooms.length, 2).setHorizontalAlignment('left').setWrap(true);
  sheet.getRange(dataStartRow, 4, summary.rooms.length, dayCount).setHorizontalAlignment('center')
    .setFontSize(16).setFontWeight('bold');
  sheet.getRange(legendStartRow, 2, legendValues.length, 2).setFontSize(10);
  sheet.getRange(legendStartRow, 2, 1, 2).setFontWeight('bold').setFontColor(APP.COLORS.blue);
  sheet.getRange(legendStartRow + 1, 2, 1, 1).setFontColor('#159447').setFontSize(16);
  sheet.getRange(legendStartRow + 2, 2, 1, 1).setFontColor('#6D4BD6').setFontSize(16);
  sheet.getRange(legendStartRow + 3, 2, 1, 1).setFontColor('#D98400').setFontSize(16);
  sheet.getRange(legendStartRow + 4, 2, 1, 1).setFontColor(APP.COLORS.red).setFontSize(16);
  sheet.getRange(legendStartRow + 5, 2, 1, 1).setFontColor('#82939B').setFontSize(16);
  sheet.getRange(signatureRow, signatureCol, 4, 7).setHorizontalAlignment('center').setFontColor('#304B57');
  sheet.getRange(signatureRow + 1, signatureCol, 1, 7).setFontWeight('bold');

  var greenCells = [], purpleCells = [], orangeCells = [], redCells = [], naCells = [];
  summary.rooms.forEach(function(room, roomIndex) {
    room.statuses.forEach(function(status, dayIndex) {
      var cell = exportCellA1_(dataStartRow + roomIndex, 4 + dayIndex);
       if (status.code === 'GREEN') greenCells.push(cell);
       else if (status.code === 'PURPLE') purpleCells.push(cell);
       else if (status.code === 'ORANGE') orangeCells.push(cell);
      else if (status.code === 'RED') redCells.push(cell);
      else naCells.push(cell);
    });
  });
  if (greenCells.length) sheet.getRangeList(greenCells).setFontColor('#159447').setBackground('#E6F5EC');
  if (purpleCells.length) sheet.getRangeList(purpleCells).setFontColor('#6D4BD6').setBackground('#F0EAFF');
  if (orangeCells.length) sheet.getRangeList(orangeCells).setFontColor('#D98400').setBackground('#FFF1D6');
  if (redCells.length) sheet.getRangeList(redCells).setFontColor(APP.COLORS.red).setBackground('#FDE9E7');
  if (naCells.length) sheet.getRangeList(naCells).setFontColor('#82939B').setBackground('#F2F5F6');

  sheet.setColumnWidth(1, 45);
  sheet.setColumnWidth(2, 20);
  sheet.setColumnWidth(3, 245);
  sheet.setColumnWidths(4, dayCount, 45);
  sheet.getRange(7, 4, 2, dayCount).setWrap(true);
  sheet.setRowHeights(dataStartRow, summary.rooms.length, 28);
}

function buildMonthlyPrintSheets_(spreadsheet, summary) {
  var dayCount = summary.days.length;
  var firstChunkSize = Math.ceil(dayCount / 2);
  var chunks = [
    { start: 0, end: firstChunkSize },
    { start: firstChunkSize, end: dayCount }
  ].filter(function(chunk) { return chunk.start < chunk.end; });

  return chunks.map(function(chunk) {
    var days = summary.days.slice(chunk.start, chunk.end);
    var printSummary = {
      month: summary.month,
      monthLabel: summary.monthLabel,
      inspectionsCount: summary.inspectionsCount,
      days: days,
      rooms: summary.rooms.map(function(room) {
        return {
          roomId: room.roomId,
          code: room.code,
          name: room.name,
          roomTypeId: room.roomTypeId,
          roomTypeName: room.roomTypeName,
          sortOrder: room.sortOrder,
          hidden: room.hidden,
          statuses: room.statuses.slice(chunk.start, chunk.end)
        };
      }),
      statusLegend: summary.statusLegend
    };
    var sheetName = 'CETAK A4 - Hari ' + days[0].number + '-' + days[days.length - 1].number;
    var sheet = spreadsheet.insertSheet(sheetName);
    buildMonthlyReportSheet_(sheet, printSummary);
    return sheet;
  });
}

function buildMonthlyEvidenceSheet_(sheet, summary) {
  sheet.clear();
  var headers = [['Tanggal', 'Ruangan', 'Slot', 'Petugas', 'Hasil', 'Temuan', 'Jumlah foto', 'Waktu kirim']];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers)
    .setBackground(APP.COLORS.blue).setFontColor('#ffffff').setFontWeight('bold');
  var values = summary.evidence.map(function(item) {
    return [item.dateKey, item.roomName, item.slotName, item.officerName,
      item.overallStatus === 'BERSIH' ? 'Bersih' : 'Ada Temuan', item.dirtyCount,
      item.photoCount, item.submittedAt];
  });
  if (values.length) sheet.getRange(2, 1, values.length, headers[0].length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 8, 145);
  sheet.setColumnWidth(2, 230);
  sheet.setColumnWidth(4, 190);
  sheet.setColumnWidth(8, 190);
  if (values.length) {
    sheet.getRange(2, 1, values.length, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(2, 1, values.length, 8)
      .setBorder(true, true, true, true, true, true, '#D9E3E7', SpreadsheetApp.BorderStyle.SOLID);
  }
}

function exportMonitoringWorkbook_(payload) {
  requireAdmin_(payload);
  // Ekspor harus membaca data kanonik terbaru dari Spreadsheet. Cache statis
  // dapat berisi konfigurasi indikator/slot lama selama beberapa detik dan
  // menyebabkan data evidence terbaca tetapi tidak ada sel template yang
  // ditemukan. Pembacaan langsung ini hanya membaca data; tidak menyentuh
  // RoomId, QrToken, atau URL QR.
  var exportData = exportRowsDirect_([
    'ROOMS', 'ROOM_TYPES', 'SLOTS', 'INSPECTIONS', 'INSPECTION_DETAILS', 'ACTIVITIES'
  ]);
  var room = exportData.ROOMS.find(function(row) {
    return String(row.RoomId) === String(payload.roomId || '') && truthy_(row.Active);
  }) || null;
  assert_(room, 'ROOM_REQUIRED', 'Pilih ruangan yang akan diekspor.');
  var start = String(payload.weekStart || '');
  assert_(/^\d{4}-\d{2}-\d{2}$/.test(start), 'PERIOD_REQUIRED', 'Tanggal awal minggu wajib dipilih.');
  var templateId = PropertiesService.getScriptProperties().getProperty('REPORT_TEMPLATE_SPREADSHEET_ID');
  assert_(templateId, 'TEMPLATE_NOT_CONFIGURED', 'Template laporan belum dipasang. Konversikan workbook acuan menjadi Google Sheets lalu simpan ID-nya di menu konfigurasi.');

  var roomType = exportData.ROOM_TYPES.find(function(row) {
    return String(row.RoomTypeId) === String(room.RoomTypeId);
  }) || null;
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
  var inspections = exportData.INSPECTIONS.filter(function(row) {
    return String(row.RoomId) === String(room.RoomId) &&
      String(row.State).toUpperCase() === 'SUBMITTED' &&
      String(row.DateKey) >= start && String(row.DateKey) <= endKey;
  });
  assert_(inspections.length, 'NO_EXPORT_DATA',
    'Tidak ada pemeriksaan tersimpan untuk ' + room.Name + ' pada periode ' + start + ' s.d. ' + endKey + '. Pilih tanggal Hari ke-1 yang mencakup tanggal pemeriksaan.');

  var details = exportData.INSPECTION_DETAILS;
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
  var templateRowMap = buildExportTemplateRowMap_(report);
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
  var legacyActivityMap = buildExportLegacyActivityMap_(room.RoomTypeId, inspections,
    periodDetails, exportData.ACTIVITIES);
  var markResult = buildExportMarks_(room, roomType, start, inspections, periodDetails,
    exportData.ACTIVITIES, exportData.SLOTS, templateRowMap, legacyActivityMap);
  var markRanges = Object.keys(markResult.marks);
  if (!markRanges.length) {
    DriveApp.getFileById(temp.getId()).setTrashed(true);
    throw appError_('NO_EXPORT_MARKS',
      'Data pemeriksaan ditemukan, tetapi tidak ada hasil yang dapat dipetakan ke template. ' +
      exportMappingDiagnosticText_(markResult.stats) +
      ' Periksa konfigurasi indikator dan template; QR ruangan tidak terkait dengan proses ini.');
  }
  report.getRangeList(markRanges).setValue('✓');

  var evidence = temp.insertSheet('EVIDENCE');
  evidence.getRange('A1:I1').setValues([['Tanggal', 'Slot', 'Ruangan', 'Petugas', 'Waktu Scan', 'Waktu Kirim', 'Hasil', 'Evidence', 'Foto ke']])
    .setBackground(APP.COLORS.blue).setFontColor('#ffffff').setFontWeight('bold');
  evidence.setFrozenRows(1);
  var evidenceRow = 2;
  inspections.sort(function(a, b) { return new Date(a.SubmittedAt) - new Date(b.SubmittedAt); }).forEach(function(inspection) {
    var slot = resolveExportSlot_(exportData.SLOTS, room.RoomTypeId, inspection);
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
  var storedPath = storeReportBlobInDrive_(blob, name);
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
  var exportData = exportRowsDirect_([
    'ROOMS', 'ROOM_TYPES', 'SLOTS', 'INSPECTIONS', 'INSPECTION_DETAILS', 'ACTIVITIES', 'USERS'
  ]);
  var room = exportData.ROOMS.find(function(row) {
    return String(row.RoomId) === String(payload.roomId || '') && truthy_(row.Active);
  }) || null;
  assert_(room, 'ROOM_REQUIRED', 'Pilih ruangan yang akan ditampilkan.');
  var start = String(payload.weekStart || '');
  assert_(/^\d{4}-\d{2}-\d{2}$/.test(start), 'PERIOD_REQUIRED', 'Tanggal Hari ke-1 wajib dipilih.');

  var roomType = exportData.ROOM_TYPES.find(function(row) {
    return String(row.RoomTypeId) === String(room.RoomTypeId);
  }) || null;
  assert_(roomType, 'INVALID_ROOM_TYPE', 'Template ruangan tidak ditemukan pada konfigurasi aplikasi.');
  var templateId = PropertiesService.getScriptProperties().getProperty('REPORT_TEMPLATE_SPREADSHEET_ID');
  assert_(templateId, 'TEMPLATE_NOT_CONFIGURED',
    'Template laporan belum dipasang. Simpan ID Google Sheets template di menu konfigurasi.');
  var template = SpreadsheetApp.openById(templateId);
  var sourceSheet = findReportTemplateSheet_(template, roomType);
  assert_(sourceSheet, 'INVALID_TEMPLATE',
    'Sheet template untuk ' + room.Name + ' tidak tersedia.');
  var templateRowMap = buildExportTemplateRowMap_(sourceSheet);

  var workDays = Number(roomType.WorkDays || 6);
  var endDate = new Date(start + 'T00:00:00+07:00');
  endDate.setDate(endDate.getDate() + workDays - 1);
  var endKey = Utilities.formatDate(endDate, APP.TIMEZONE, 'yyyy-MM-dd');
  var data = exportData;
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
  var configuredActivities = activities.filter(function(row) { return truthy_(row.Active); });
  var legacyActivityMap = buildExportLegacyActivityMap_(room.RoomTypeId, inspections,
    (data.INSPECTION_DETAILS || []).filter(function(row) {
      return inspectionIds[String(row.InspectionId)];
    }), activities);
  var previewRows = configuredItems.map(function(item, index) {
    var activity = findConfiguredExportActivity_(item, room.RoomTypeId, configuredActivities);
    return {
      exportRow: exportRowForActivity_(activity, item, room.RoomTypeId, templateRowMap),
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
    var slot = resolveExportSlot_(slots, room.RoomTypeId, inspection);
    var slotOrder = slot ? exportRowNumber_(slot.SortOrder) : 0;
    if (!slotOrder) slotOrder = exportSlotOrder_(room.RoomTypeId, (slot && slot.Code) || inspection.SlotCode);
    if (!slotOrder) return;

    (detailsByInspection[String(inspection.InspectionId)] || []).forEach(function(detail) {
      var mapping = resolveExportDetail_(detail, room.RoomTypeId, configuredItems, activities,
        templateRowMap, legacyActivityMap);
      var exportRow = mapping.exportRow;
      var previewRow = rowsByExportRow[String(exportRow)];
      if (!previewRow) return;
      previewRow.cells[day + ':' + slotOrder] = {
        quality: previewRow.qualityApplicable ? mapping.qualityResult : '',
        functionResult: previewRow.functionApplicable ? mapping.functionResult : ''
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
       var slot = resolveExportSlot_(slots, room.RoomTypeId, inspection);
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
       var slot = resolveExportSlot_(slots, room.RoomTypeId, inspection);
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

function exportRowsDirect_(sheetNames) {
  var result = {};
  (sheetNames || []).filter(function(name, index, list) {
    return name && list.indexOf(name) === index;
  }).forEach(function(name) {
    result[name] = rowsAsSheetObjects_(name);
  });
  return result;
}

function exportIdKey_(value) {
  return String(value || '').trim().toUpperCase();
}

function exportRowNumber_(value) {
  var number = Number(String(value || '').trim());
  return isFinite(number) && number > 0 ? number : 0;
}

function resolveExportSlot_(slots, roomTypeId, inspection) {
  var rows = Array.isArray(slots) ? slots : [];
  var slotId = exportIdKey_(inspection && inspection.SlotId);
  var slotCode = normalizeExportName_(inspection && inspection.SlotCode);
  var typeId = exportIdKey_(roomTypeId);
  var slot = slotId ? rows.find(function(row) {
    return exportIdKey_(row.SlotId) === slotId &&
      (!row.RoomTypeId || exportIdKey_(row.RoomTypeId) === typeId);
  }) : null;
  if (slot) return slot;
  return slotCode ? rows.find(function(row) {
    return (!row.RoomTypeId || exportIdKey_(row.RoomTypeId) === typeId) &&
      normalizeExportName_(row.Code) === slotCode;
  }) || null : null;
}

function findConfiguredExportActivity_(item, roomTypeId, activities) {
  var rows = (activities || []).filter(function(row) { return truthy_(row.Active); });
  var nameKey = normalizeExportName_(item && item.name);
  var rowNumber = exportRowNumber_(item && item.row);
  var sameType = rows.filter(function(row) {
    return exportIdKey_(row.RoomTypeId) === exportIdKey_(roomTypeId);
  });
  return sameType.find(function(row) {
    return exportRowNumber_(row.ExportRow) === rowNumber ||
      normalizeExportName_(row.Name) === nameKey;
  }) || rows.find(function(row) {
    // Kompatibilitas konfigurasi lama: RoomTypeId pada indikator lama dapat
    // kosong, tetapi nama indikator dan baris template masih sama.
    return normalizeExportName_(row.Name) === nameKey;
  }) || null;
}

/**
 * Rekonstruksi referensi indikator pada histori lama yang ActivityId-nya sudah
 * tidak ada di master ACTIVITIES. Versi lama menyimpan detail dalam urutan
 * indikator yang sama dengan urutan template. Pemetaan hanya dibuat jika satu
 * inspeksi memiliki jumlah detail lengkap dan hasilnya konsisten lintas histori.
 */
function buildExportLegacyActivityMap_(roomTypeId, inspections, details, activities) {
  var currentRows = (activities || []).filter(function(row) {
    return truthy_(row.Active) && exportIdKey_(row.RoomTypeId) === exportIdKey_(roomTypeId);
  }).sort(function(a, b) {
    return exportRowNumber_(a.ExportRow) - exportRowNumber_(b.ExportRow) ||
      Number(a.SortOrder || 0) - Number(b.SortOrder || 0);
  });
  if (!currentRows.length) return {};

  var currentById = {};
  currentRows.forEach(function(row) { currentById[exportIdKey_(row.ActivityId)] = true; });
  var detailsByInspection = {};
  (details || []).forEach(function(detail) {
    var inspectionId = String(detail.InspectionId || '');
    if (!detailsByInspection[inspectionId]) detailsByInspection[inspectionId] = [];
    detailsByInspection[inspectionId].push(detail);
  });

  var mapped = {};
  var conflicts = {};
  (inspections || []).forEach(function(inspection) {
    var inspectionDetails = detailsByInspection[String(inspection.InspectionId || '')] || [];
    if (inspectionDetails.length !== currentRows.length) return;
    inspectionDetails.forEach(function(detail, index) {
      var legacyId = exportIdKey_(detail.ActivityId);
      var candidate = currentRows[index];
      if (!legacyId || !candidate || currentById[legacyId] || conflicts[legacyId]) return;
      var existing = mapped[legacyId];
      if (existing && exportIdKey_(existing.ActivityId) !== exportIdKey_(candidate.ActivityId)) {
        delete mapped[legacyId];
        conflicts[legacyId] = true;
        return;
      }
      mapped[legacyId] = candidate;
    });
  });
  return mapped;
}

function buildExportTemplateRowMap_(sheet) {
  var map = { byName: {}, rows: {} };
  var lastRow = Math.max(Number(sheet.getLastRow() || 0), 1);
  var values = sheet.getRange(1, 1, lastRow, 3).getDisplayValues();
  values.forEach(function(row, index) {
    var rowNumber = index + 1;
    var label = String(row[2] || row[1] || '').trim();
    var key = normalizeExportName_(label);
    if (rowNumber >= 12 && key) {
      map.byName[key] = rowNumber;
      map.rows[String(rowNumber)] = true;
    }
  });
  return map;
}

function resolveExportDetail_(detail, roomTypeId, configuredItems, activities, templateRowMap,
  legacyActivityMap) {
  var rows = Array.isArray(activities) ? activities : [];
  var items = (configuredItems || []).filter(function(item) {
    return item.type === roomTypeId;
  });
  var activityId = exportIdKey_(detail && detail.ActivityId);
  var activity = activityId ? rows.find(function(row) {
    return exportIdKey_(row.ActivityId) === activityId;
  }) || null : null;
  var legacyMapped = false;
  if (!activity && activityId && legacyActivityMap && legacyActivityMap[activityId]) {
    activity = legacyActivityMap[activityId];
    legacyMapped = true;
  }
  var activityName = detail && (detail.ActivityName || detail.Activity || detail.Name);
  var activityNameKey = normalizeExportName_(activityName || (activity && activity.Name));
  var fallback = activityNameKey ? items.find(function(item) {
    return normalizeExportName_(item.name) === activityNameKey;
  }) || null : null;

  // Konfigurasi lama kadang hanya menyimpan ExportRow, sementara nama
  // indikator sudah diedit. ExportRow tetap merupakan identitas posisi pada
  // template dan aman digunakan sebagai fallback.
  if (!fallback && activity) {
    var configuredRow = exportRowNumber_(activity.ExportRow);
    if (configuredRow) {
      fallback = items.find(function(item) {
        return exportRowNumber_(item.row) === configuredRow;
      }) || null;
    }
  }

  var qualityPositive = (activity && activity.QualityPositive) || (fallback && fallback.qp) || '';
  var qualityNegative = (activity && activity.QualityNegative) || (fallback && fallback.qn) || '';
  var functionPositive = (activity && activity.FunctionPositive) || (fallback && fallback.fp) || '';
  var functionNegative = (activity && activity.FunctionNegative) || (fallback && fallback.fn) || '';
  var qualityResult = resolveExportResult_(
    detail && detail.QualityResult, detail && detail.Status, detail && detail.QualityLabel,
    qualityPositive, qualityNegative
  );
  var functionResult = resolveExportResult_(
    detail && detail.FunctionResult, detail && detail.FuncStatus, detail && detail.FunctionLabel,
    functionPositive, functionNegative
  );
  var qualityApplicable = Boolean(
    (activity && truthy_(activity.QualityApplicable)) || (fallback && fallback.qa)
  );
  var functionApplicable = Boolean(
    (activity && truthy_(activity.FunctionApplicable)) || (fallback && fallback.fa)
  );

  // Detail dari prototype lama hanya memiliki Status/FuncStatus dan belum
  // selalu membawa flag applicability pada ACTIVITIES. Jika hasilnya jelas,
  // izinkan hasil tersebut dipetakan agar histori lama tetap masuk Excel.
  if (!qualityApplicable && qualityResult) qualityApplicable = true;
  if (!functionApplicable && functionResult) functionApplicable = true;

  // WiFi/P3K dan indikator sejenis pada data lama dapat tersimpan sebagai NA.
  // Bila konfigurasi fallback menyatakan kolom tersebut berlaku, detail
  // pemeriksaan tetap berarti indikatornya sudah diperiksa.
  if (qualityApplicable && !qualityResult &&
      String(detail && detail.QualityResult || '').toUpperCase() === 'NA' && fallback && fallback.qa) {
    qualityResult = 'POSITIVE';
  }
  if (functionApplicable && !functionResult &&
      String(detail && detail.FunctionResult || '').toUpperCase() === 'NA' && fallback && fallback.fa) {
    functionResult = 'POSITIVE';
  }

  var exportRow = exportRowForActivity_(activity, fallback, roomTypeId, templateRowMap);
  var reason = '';
  if (!activity && !fallback) reason = 'ACTIVITY_NOT_FOUND';
  else if (!exportRow) reason = 'EXPORT_ROW_MISSING';
  else if (!qualityApplicable && !functionApplicable) reason = 'NO_APPLICABLE_RESULT';
  else if (!qualityResult && !functionResult) reason = 'NO_RESULT';

  return {
    activity: activity,
    fallback: fallback,
    exportRow: exportRow,
    qualityApplicable: qualityApplicable,
    functionApplicable: functionApplicable,
    qualityResult: qualityResult,
    functionResult: functionResult,
    legacyMapped: legacyMapped,
    reason: reason
  };
}

function exportRowForActivity_(activity, fallback, roomTypeId, templateRowMap) {
  var activityName = activity && activity.Name;
  var fallbackName = fallback && fallback.name;
  var nameCandidates = [activityName, fallbackName];
  if (templateRowMap && templateRowMap.byName) {
    for (var nameIndex = 0; nameIndex < nameCandidates.length; nameIndex++) {
      var nameKey = normalizeExportName_(nameCandidates[nameIndex]);
      if (nameKey && templateRowMap.byName[nameKey]) return templateRowMap.byName[nameKey];
    }
  }

  var configuredRow = exportRowNumber_(fallback && fallback.row);
  if (configuredRow && (!templateRowMap || templateRowMap.rows[String(configuredRow)])) {
    return configuredRow;
  }

  // Hanya gunakan ExportRow dari database bila baris tersebut memang salah
  // satu baris indikator pada template untuk jenis ruangan ini. Ini mencegah
  // konfigurasi lama (misalnya ExportRow 1..18) menulis tanda ke header.
  var validRows = monitoringItems_().filter(function(item) {
    return item.type === roomTypeId;
  }).map(function(item) {
    return exportRowNumber_(item.row);
  });
  var activityRow = exportRowNumber_(activity && activity.ExportRow);
  if (templateRowMap && templateRowMap.rows) {
    return templateRowMap.rows[String(activityRow)] ? activityRow : 0;
  }
  return validRows.indexOf(activityRow) !== -1 ? activityRow : 0;
}

function buildExportMarks_(room, roomType, start, inspections, details, activities, slots,
  templateRowMap, legacyActivityMap) {
  var marks = {};
  var detailsByInspection = {};
  var stats = {
    inspectionCount: inspections.length,
    detailCount: details.length,
    skippedDay: 0,
    missingSlot: 0,
    mappedDetailCount: 0,
    missingActivity: 0,
    missingExportRow: 0,
    noApplicableResult: 0,
    noResult: 0
  };
  details.forEach(function(detail) {
    var id = String(detail.InspectionId || '');
    if (!detailsByInspection[id]) detailsByInspection[id] = [];
    detailsByInspection[id].push(detail);
  });

  var configuredItems = monitoringItems_();
  var periodStartDate = new Date(start + 'T00:00:00+07:00');
  var workDays = Number(roomType.WorkDays || 6);
  var slotsPerDay = room.RoomTypeId === 'TOILET' ? 6 : 3;
  inspections.forEach(function(inspection) {
    var inspectionDate = new Date(String(inspection.DateKey) + 'T00:00:00+07:00');
    var day = Math.floor((inspectionDate.getTime() - periodStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (day < 1 || day > workDays) {
      stats.skippedDay++;
      return;
    }
    var slot = resolveExportSlot_(slots, room.RoomTypeId, inspection);
    var slotOrder = slot ? exportRowNumber_(slot.SortOrder) : 0;
    if (!slotOrder) slotOrder = exportSlotOrder_(room.RoomTypeId, (slot && slot.Code) || inspection.SlotCode);
    if (!slotOrder) {
      stats.missingSlot++;
      return;
    }
    var baseColumn = 4 + (day - 1) * slotsPerDay * 4 + (slotOrder - 1) * 4;
    (detailsByInspection[String(inspection.InspectionId)] || []).forEach(function(detail) {
      var mapping = resolveExportDetail_(detail, room.RoomTypeId, configuredItems, activities,
        templateRowMap, legacyActivityMap);
      if (mapping.reason === 'ACTIVITY_NOT_FOUND') stats.missingActivity++;
      else if (mapping.reason === 'EXPORT_ROW_MISSING') stats.missingExportRow++;
      else if (mapping.reason === 'NO_APPLICABLE_RESULT') stats.noApplicableResult++;
      else if (mapping.reason === 'NO_RESULT') stats.noResult++;
      if (mapping.legacyMapped) stats.legacyMappedDetailCount++;
      if (!mapping.exportRow) return;
      if (!mapping.qualityResult && !mapping.functionResult) return;
      stats.mappedDetailCount++;
      if (mapping.qualityApplicable && mapping.qualityResult) {
        marks[exportCellA1_(mapping.exportRow,
          baseColumn + (mapping.qualityResult === 'NEGATIVE' ? 1 : 0))] = true;
      }
      if (mapping.functionApplicable && mapping.functionResult) {
        var functionColumn = exportFunctionColumn_(room.RoomTypeId, mapping.exportRow,
          baseColumn, mapping.functionResult);
        marks[exportCellA1_(mapping.exportRow, functionColumn)] = true;
      }
    });
  });
  stats.markCount = Object.keys(marks).length;
  return { marks: marks, stats: stats };
}

function exportMappingDiagnosticText_(stats) {
  stats = stats || {};
  return 'Ringkasan pemetaan: ' + Number(stats.inspectionCount || 0) +
    ' pemeriksaan, ' + Number(stats.detailCount || 0) + ' detail, ' +
    Number(stats.mappedDetailCount || 0) + ' detail terpetakan, ' +
    Number(stats.missingActivity || 0) + ' indikator tidak ditemukan, ' +
    Number(stats.missingExportRow || 0) + ' tanpa baris template, ' +
    Number(stats.missingSlot || 0) + ' slot tidak cocok.';
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
  var code = normalizeExportName_(slotCode);
  var general = { PAGI: 1, SORE: 2, INSPEKSI: 3 };
  var toilet = { PAGI: 1, INSPEKSI1: 2, SIANG: 3, INSPEKSI2: 4, SORE: 5, INSPEKSI3: 6 };
  return Number((exportIdKey_(roomTypeId) === 'TOILET' ? toilet : general)[code] || 0);
}

function findUserName_(username, fallback) {
  var user = rowsAsObjects_('USERS').find(function(row) { return row.Username === username; });
  return user ? user.FullName : fallback;
}
