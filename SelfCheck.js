/**
 * Jalankan setelah setupApplication untuk memeriksa konfigurasi inti.
 */
function runSelfCheck() {
  assert_(isApplicationReady_(), 'NOT_CONFIGURED', 'Jalankan setupApplication terlebih dahulu.');
  var checks = [];

  var availableSheets = {};
  getSpreadsheet_().getSheets().forEach(function(sheet) { availableSheets[sheet.getName()] = true; });
  Object.keys(APP.SHEETS).forEach(function(name) {
    checks.push({ name: 'Sheet ' + name, passed: Boolean(availableSheets[name]) });
  });

  var source = rowsAsObjectsBatch_([
    'ROOMS', 'ACTIVITIES', 'USERS', 'ROOM_TYPES', 'SLOTS', 'EVALUATION_ASPECTS'
  ]);
  var rooms = source.ROOMS.filter(function(item) { return truthy_(item.Active); });
  var activities = source.ACTIVITIES.filter(function(item) { return truthy_(item.Active); });
  var users = source.USERS.filter(function(item) { return truthy_(item.Active); });
  var types = source.ROOM_TYPES.filter(function(item) { return truthy_(item.Active); });
  var slots = source.SLOTS.filter(function(item) { return truthy_(item.Active); });

  checks.push({ name: 'Daftar ruangan operasional tersedia', passed: rooms.length >= 6 });
  checks.push({ name: 'Lima template ruangan aktif', passed: types.length >= 5 });
  checks.push({ name: 'Indikator workbook tersedia', passed: activities.filter(function(item) { return item.RoomTypeId; }).length >= 72 });
  checks.push({ name: 'Standar 5S workbook tersedia', passed: activities.filter(function(item) {
    return item.RoomTypeId && String(item.StandardText || '').trim();
  }).length >= 69 });
  checks.push({ name: 'Slot pagi/sore/inspeksi tersedia', passed: slots.length >= 15 });
  var evaluationAspects = source.EVALUATION_ASPECTS.filter(function(item) { return truthy_(item.Active); });
  checks.push({ name: 'Aspek evaluasi per jenis ruangan tersedia', passed: evaluationAspects.length >= 16 });
  checks.push({ name: 'Penyimpanan histori evaluasi tersedia', passed: Boolean(getSheet_('EVALUATIONS')) && Boolean(getSheet_('INSPECTION_PHOTOS')) });
  checks.push({ name: 'Admin, supervisor, dan 2 petugas tersedia', passed:
    users.filter(function(user) { return user.Role === 'ADMIN'; }).length >= 1 &&
    users.filter(function(user) { return user.Role === 'SUPERVISOR'; }).length >= 1 &&
    users.filter(function(user) { return user.Role === 'PETUGAS'; }).length >= 2 });
  checks.push({ name: 'Setiap ruangan memiliki template', passed: rooms.every(function(room) {
    return types.some(function(type) { return type.RoomTypeId === room.RoomTypeId; });
  })});

  var properties = PropertiesService.getScriptProperties();
  checks.push({ name: 'Folder evidence sementara tersedia', passed: Boolean(properties.getProperty('PHOTO_FOLDER_ID')) });
  checks.push({ name: 'Database utama Google Spreadsheet', passed: applicationDatabaseMode_() === 'SPREADSHEET' });
  checks.push({ name: 'Fallback evidence Google Drive aktif', passed: driveEvidenceFallbackEnabled_() });
  checks.push({ name: 'Konfigurasi gateway NAS tersedia', passed: nasGatewayConfigured_() });
  checks.push({ name: 'Evidence NAS diaktifkan', passed: propertyFlag_('NAS_EVIDENCE_ENABLED', true) });
  checks.push({ name: 'Backup Sheet ke NAS diaktifkan', passed: propertyFlag_('NAS_SHEET_BACKUP_ENABLED', true) });
  var qrAudit = buildRoomQrIntegrityAudit_(source);
  checks.push({ name: 'Integritas RoomId dan QrToken', passed: qrAudit.ok, detail: qrAudit.issues });

  var warnings = [];
  if (nasGatewayConfigured_()) {
    try {
      var status = nasGatewayRequest_('/api/kebersihan/status');
      if (status.storageWritable === false) warnings.push('Folder NAS tidak dapat ditulis.');
    } catch (error) {
      // NAS boleh mati tanpa menggagalkan kesiapan aplikasi. Evidence akan
      // ditahan di Drive dan data operasional tetap masuk ke Spreadsheet.
      warnings.push('NAS sedang tidak tersedia: ' + error.message);
    }
  }

  var failed = checks.filter(function(check) { return !check.passed; });
  var result = {
    ok: failed.length === 0,
    checks: checks,
    warnings: warnings,
    databaseMode: applicationDatabaseMode_(),
    message: failed.length ? failed.length + ' pemeriksaan belum lolos.' :
      (warnings.length ? 'Pemeriksaan inti lolos dengan ' + warnings.length + ' peringatan.' : 'Semua pemeriksaan berhasil.')
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Opsional: pasang sebagai time-driven trigger mingguan untuk membersihkan sesi lama.
 */
function cleanupExpiredSessions() {
  var rows = rowsAsObjects_('SESSIONS').filter(function(session) {
    return new Date(session.ExpiresAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).sort(function(a, b) {
    return typeof a._row === 'number' && typeof b._row === 'number' ? b._row - a._row : 0;
  });
  rows.forEach(function(session) { deleteObject_('SESSIONS', session._row); });
  return { removed: rows.length };
}
