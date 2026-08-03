function generateMonthlyPdf_(payload) {
  var session = requireAdmin_(payload);
  var month = String(payload.month || monthKey_());
  assert_(/^\d{4}-\d{2}$/.test(month), 'INVALID_MONTH', 'Format bulan tidak valid.');
  var dashboard = buildDashboard_(month);
  var title = 'Laporan Kebersihan ' + APP.INSTITUTION + ' - ' + month;
  var doc = DocumentApp.create(title);
  var body = doc.getBody();

  body.appendParagraph(APP.INSTITUTION)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setForegroundColor(APP.COLORS.blue);
  body.appendParagraph('MONITORING KEBERSIHAN LINGKUNGAN')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Periode: ' + month + ' | Zona waktu: ' + APP.TIMEZONE);
  body.appendHorizontalRule();

  body.appendParagraph('Ringkasan').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var summaryTable = body.appendTable([
    ['Jumlah Ruangan', String(dashboard.summary.totalRooms)],
    ['Total Pemeriksaan', String(dashboard.summary.inspectionsThisMonth)],
    ['Temuan Tidak Bersih', String(dashboard.dirtyFindings.length)]
  ]);
  styleDocTable_(summaryTable);

  body.appendParagraph('Rekap Pemeriksaan').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var inspectionRows = [['Tanggal', 'Ruangan', 'Petugas', 'Hasil', 'Temuan']];
  dashboard.inspections.slice().reverse().forEach(function(item) {
    inspectionRows.push([
      item.dateKey,
      item.roomName,
      item.officerName,
      item.overallStatus === 'BERSIH' ? 'Bersih' : 'Ada Temuan',
      String(item.dirtyCount)
    ]);
  });
  if (inspectionRows.length === 1) inspectionRows.push(['-', 'Belum ada data', '-', '-', '-']);
  styleDocTable_(body.appendTable(inspectionRows));

  body.appendParagraph('Daftar Temuan').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var findingRows = [['Tanggal', 'Ruangan', 'Kegiatan', 'Masalah', 'Catatan', 'Petugas']];
  dashboard.dirtyFindings.slice().reverse().forEach(function(item) {
    var issues = [];
    if (item.status === 'TIDAK_BERSIH') issues.push('Tidak bersih');
    if (item.funcStatus === 'TIDAK_BERFUNGSI') issues.push('Tidak berfungsi');
    findingRows.push([
      item.dateKey,
      item.roomName,
      item.activityName,
      issues.join(', '),
      item.note,
      item.officerName
    ]);
  });
  if (findingRows.length === 1) findingRows.push(['-', 'Tidak ada temuan', '-', '-', '-', '-']);
  styleDocTable_(body.appendTable(findingRows));

  body.appendParagraph('Dibuat otomatis pada ' + displayDateTime_(nowIso_()) + ' WIB.');
  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs(MimeType.PDF).setName(title + '.pdf');
  var reportFolderId = PropertiesService.getScriptProperties().getProperty('REPORT_FOLDER_ID');
  var pdfFile = DriveApp.getFolderById(reportFolderId).createFile(pdfBlob);
  var dataUrl = 'data:application/pdf;base64,' + Utilities.base64Encode(pdfBlob.getBytes());
  docFile.setTrashed(true);
  logAudit_(session.user.UserId, 'GENERATE_PDF', 'REPORT', pdfFile.getId(), { month: month });

  return {
    fileId: pdfFile.getId(),
    name: pdfFile.getName(),
    url: pdfFile.getUrl(),
    dataUrl: dataUrl,
    month: month
  };
}

function styleDocTable_(table) {
  if (!table || table.getNumRows() === 0) return;
  var header = table.getRow(0);
  for (var i = 0; i < header.getNumCells(); i++) {
    header.getCell(i).setBackgroundColor(APP.COLORS.blue);
    header.getCell(i).editAsText().setForegroundColor('#ffffff').setBold(true);
  }
}
