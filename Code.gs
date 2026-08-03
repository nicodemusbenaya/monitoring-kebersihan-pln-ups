var APP = {
  NAME: 'Monitoring Kebersihan PLN UPS',
  INSTITUTION: 'PLN UPS',
  TIMEZONE: 'Asia/Jakarta',
  // Sesi dibuat sangat panjang dan hanya dinonaktifkan saat pengguna menekan Keluar.
  SESSION_HOURS: 24 * 365 * 20,
  MAX_PHOTO_BYTES: 5 * 1024 * 1024,
  LOGO_URL: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg',
  COLORS: {
    blue: '#0076A8',
    yellow: '#FFD100',
    red: '#E42313'
  },
  SHEETS: {
    SETTINGS: ['Key', 'Value', 'UpdatedAt'],
    USERS: ['UserId', 'Username', 'FullName', 'Role', 'PasswordHash', 'Salt', 'Active', 'MustChangePassword', 'CreatedAt', 'UpdatedAt'],
    ROOM_TYPES: ['RoomTypeId', 'Name', 'TemplateSheet', 'WorkDays', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    ROOMS: ['RoomId', 'Code', 'Name', 'RoomTypeId', 'QrToken', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    ACTIVITIES: ['ActivityId', 'RoomTypeId', 'Name', 'QualityApplicable', 'QualityPositive', 'QualityNegative', 'FunctionApplicable', 'FunctionPositive', 'FunctionNegative', 'ExportRow', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    ROOM_ACTIVITIES: ['MapId', 'RoomId', 'ActivityId', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    SLOTS: ['SlotId', 'RoomTypeId', 'Code', 'Name', 'Role', 'SortOrder', 'Active', 'CreatedAt', 'UpdatedAt'],
    SCAN_EVENTS: ['ScanId', 'RoomId', 'UserId', 'ScannedAt', 'UserAgent', 'QrPayload'],
    INSPECTIONS: ['InspectionId', 'DateKey', 'WeekStart', 'DayNumber', 'RoomId', 'RoomTypeId', 'SlotId', 'SlotCode', 'UserId', 'ScanId', 'ScannedAt', 'SubmittedAt', 'OverallStatus', 'DirtyCount', 'EvidenceFileId', 'EvidenceName', 'State', 'BackupStatus', 'BackupUpdatedAt', 'ReopenedAt', 'ReopenedBy'],
    INSPECTION_DETAILS: ['DetailId', 'InspectionId', 'ActivityId', 'QualityResult', 'QualityLabel', 'FunctionResult', 'FunctionLabel', 'Note', 'CorrectedAt', 'CorrectedBy'],
    BACKUP_QUEUE: ['QueueId', 'InspectionId', 'EventType', 'PayloadJson', 'Status', 'AttemptCount', 'LastError', 'CreatedAt', 'UpdatedAt'],
    SESSIONS: ['SessionHash', 'UserId', 'ExpiresAt', 'CreatedAt'],
    AUDIT_LOG: ['AuditId', 'UserId', 'Action', 'EntityType', 'EntityId', 'Detail', 'CreatedAt']
  }
};

function doGet(e) {
  var params = (e && e.parameter) || {};

  if (!isApplicationReady_()) {
    return simplePage_(
      'Aplikasi belum disiapkan',
      'Jalankan fungsi setupApplication terlebih dahulu dari editor Google Apps Script.'
    );
  }

  var template = HtmlService.createTemplateFromFile('Index');
  template.initialContext = JSON.stringify({
    adminMode: String(params.admin || '') === '1',
    roomToken: String(params.room || '').trim(),
    appName: APP.NAME,
    institution: APP.INSTITUTION,
    logoUrl: APP.LOGO_URL
  });
  return template.evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Jalankan satu kali dari editor Apps Script.
 * Fungsi ini membuat Spreadsheet, folder Drive, semua sheet, dan data awal.
 */
function setupApplication() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var properties = PropertiesService.getScriptProperties();
    var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    var ss;

    if (spreadsheetId) {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } else {
      ss = SpreadsheetApp.create(APP.NAME + ' - Database');
      properties.setProperty('SPREADSHEET_ID', ss.getId());
    }
    ss.setSpreadsheetTimeZone(APP.TIMEZONE);

    Object.keys(APP.SHEETS).forEach(function(name) {
      ensureSheet_(ss, name, APP.SHEETS[name]);
    });

    ensureDriveFolders_(properties);
    ensurePepper_(properties);
    ensureBackupTrigger_();
    seedSettings_();
    seedMonitoringConfiguration_();
    seedMonitoringUsers_();
    formatDatabase_();

    var result = {
      ok: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      rootFolderId: properties.getProperty('ROOT_FOLDER_ID'),
      message: 'Aplikasi berhasil disiapkan.'
    };
    console.log('Spreadsheet database: ' + result.spreadsheetUrl);
    console.log('ID Spreadsheet: ' + result.spreadsheetId);
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fungsi publik untuk dropdown Run di editor Apps Script.
 * Mengubah akun bawaan menjadi username + "123".
 */
function resetAllUserPasswords() {
  var result = resetSimpleUserPasswords();
  console.log('Password berhasil direset untuk: ' + result.updatedUsers.join(', '));
  return result;
}

/**
 * Jalankan fungsi ini kapan saja untuk menampilkan tautan database dan folder aplikasi.
 */
function showApplicationLinks() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  assert_(spreadsheetId, 'NOT_CONFIGURED', 'Jalankan setupApplication terlebih dahulu.');
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var rootFolderId = properties.getProperty('ROOT_FOLDER_ID');
  var result = {
    spreadsheetUrl: spreadsheet.getUrl(),
    spreadsheetId: spreadsheetId,
    driveFolderUrl: rootFolderId ? 'https://drive.google.com/drive/folders/' + rootFolderId : ''
  };
  console.log('Spreadsheet database: ' + result.spreadsheetUrl);
  console.log('Folder Drive aplikasi: ' + result.driveFolderUrl);
  return result;
}

/**
 * Satu-satunya pintu API untuk antarmuka HTML.
 */
function api(action, payload) {
  try {
    payload = payload || {};
    var publicActions = {
      login: login_,
      logout: logout_
    };
    var protectedActions = {
      bootstrap: monitoringBootstrap_,
      scanRoom: monitoringScanRoom_,
      submitInspection: monitoringSubmitInspection_,
      getInspection: monitoringGetInspection_,
      changePassword: changePassword_,
      getPhoto: getPhoto_,
      getDashboard: getDashboard_,
      getAdminData: getAdminData_,
      saveRoom: saveRoom_,
      saveActivity: saveActivity_,
      setRoomActivities: setRoomActivities_,
      saveUser: saveUser_,
      resetUserPassword: resetUserPassword_,
      reopenInspection: reopenInspection_,
      correctInspectionDetail: correctInspectionDetail_,
      generateMonthlyPdf: generateMonthlyPdf_,
      exportWorkbook: exportMonitoringWorkbook_,
      getQrData: monitoringGetQrData_,
      retryNasBackup: retryNasBackup_,
      backupSpreadsheetNow: backupSpreadsheetNow_,
      testNasConnection: testNasConnection_,
      setNasConfiguration: setNasConfiguration_,
      setReportTemplate: setReportTemplate_
    };

    if (publicActions[action]) {
      return { ok: true, data: publicActions[action](payload) };
    }
    if (!protectedActions[action]) {
      throw appError_('ACTION_NOT_FOUND', 'Perintah tidak dikenali.');
    }

    var session = requireSession_(payload.sessionToken);
    payload._session = session;
    if (session.publicUser.mustChangePassword &&
        ['bootstrap', 'changePassword'].indexOf(action) === -1) {
      throw appError_('PASSWORD_CHANGE_REQUIRED', 'Ganti password awal sebelum menggunakan fitur lain.');
    }
    return { ok: true, data: protectedActions[action](payload) };
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return {
      ok: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message || 'Terjadi kesalahan pada server.'
      }
    };
  }
}

function simplePage_(title, message) {
  var safeTitle = escapeHtml_(title);
  var safeMessage = escapeHtml_(message);
  var html = '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + safeTitle + '</title><style>' +
    'body{margin:0;background:#f4f7f9;color:#16313d;font:16px Arial,sans-serif;display:grid;min-height:100dvh;place-items:center;padding:24px;box-sizing:border-box}' +
    'main{max-width:520px;background:#fff;border-top:6px solid #ffd100;padding:32px;border-radius:14px;box-shadow:0 18px 50px rgba(0,74,104,.12)}' +
    'h1{margin:0 0 12px;color:#0076a8;font-size:26px}p{margin:0;line-height:1.6}' +
    '</style></head><body><main><h1>' + safeTitle + '</h1><p>' + safeMessage + '</p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}
