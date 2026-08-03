/**
 * Jalankan setelah setupApplication untuk memeriksa konfigurasi inti.
 */
function runSelfCheck() {
  assert_(isApplicationReady_(), 'NOT_CONFIGURED', 'Jalankan setupApplication terlebih dahulu.');
  var checks = [];

  Object.keys(APP.SHEETS).forEach(function(name) {
    var sheet = getSpreadsheet_().getSheetByName(name);
    var expected = APP.SHEETS[name];
    var actual = sheet ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    checks.push({
      name: 'Sheet ' + name,
      passed: Boolean(sheet) && expected.every(function(header) { return actual.indexOf(header) !== -1; })
    });
  });

  var rooms = rowsAsObjects_('ROOMS').filter(function(item) { return truthy_(item.Active); });
  var activities = rowsAsObjects_('ACTIVITIES').filter(function(item) { return truthy_(item.Active); });
  var users = rowsAsObjects_('USERS').filter(function(item) { return truthy_(item.Active); });
  var types = rowsAsObjects_('ROOM_TYPES').filter(function(item) { return truthy_(item.Active); });
  var slots = rowsAsObjects_('SLOTS').filter(function(item) { return truthy_(item.Active); });

  checks.push({ name: 'Enam ruangan placeholder aktif', passed: rooms.length >= 6 });
  checks.push({ name: 'Empat template ruangan aktif', passed: types.length >= 4 });
  checks.push({ name: 'Indikator workbook tersedia', passed: activities.filter(function(item) { return item.RoomTypeId; }).length >= 62 });
  checks.push({ name: 'Slot pagi/sore/inspeksi tersedia', passed: slots.length >= 15 });
  checks.push({ name: 'Admin, supervisor, dan 2 petugas tersedia', passed:
    users.filter(function(user) { return user.Role === 'ADMIN'; }).length >= 1 &&
    users.filter(function(user) { return user.Role === 'SUPERVISOR'; }).length >= 1 &&
    users.filter(function(user) { return user.Role === 'PETUGAS'; }).length >= 2 });
  checks.push({ name: 'Setiap ruangan memiliki template', passed: rooms.every(function(room) {
    return types.some(function(type) { return type.RoomTypeId === room.RoomTypeId; });
  })});

  var properties = PropertiesService.getScriptProperties();
  checks.push({ name: 'Folder foto tersedia', passed: Boolean(properties.getProperty('PHOTO_FOLDER_ID')) });
  checks.push({ name: 'Folder laporan tersedia', passed: Boolean(properties.getProperty('REPORT_FOLDER_ID')) });

  var failed = checks.filter(function(check) { return !check.passed; });
  return {
    ok: failed.length === 0,
    checks: checks,
    message: failed.length ? failed.length + ' pemeriksaan belum lolos.' : 'Semua pemeriksaan berhasil.'
  };
}

/**
 * Opsional: pasang sebagai time-driven trigger mingguan untuk membersihkan sesi lama.
 */
function cleanupExpiredSessions() {
  var sheet = getSheet_('SESSIONS');
  var rows = rowsAsObjects_('SESSIONS').filter(function(session) {
    return new Date(session.ExpiresAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).sort(function(a, b) { return b._row - a._row; });
  rows.forEach(function(session) { sheet.deleteRow(session._row); });
  return { removed: rows.length };
}
