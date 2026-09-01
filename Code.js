var APP_FAVICON_DATA_URL = 'data:image/png;base64,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';

var APP = {
  NAME: 'Monitoring Kebersihan PLN UPS',
  INSTITUTION: 'PLN UPS',
  TIMEZONE: 'Asia/Jakarta',
  // Sesi dibuat sangat panjang dan hanya dinonaktifkan saat pengguna menekan Keluar.
  SESSION_HOURS: 24 * 365 * 20,
  MAX_PHOTO_BYTES: 5 * 1024 * 1024,
  MAX_PHOTOS_PER_INSPECTION: 8,
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
    ACTIVITIES: ['ActivityId', 'RoomTypeId', 'Name', 'StandardCategory', 'StandardText', 'QualityApplicable', 'QualityPositive', 'QualityNegative', 'FunctionApplicable', 'FunctionPositive', 'FunctionNegative', 'ExportRow', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    ROOM_ACTIVITIES: ['MapId', 'RoomId', 'ActivityId', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    SLOTS: ['SlotId', 'RoomTypeId', 'Code', 'Name', 'Role', 'SortOrder', 'Active', 'CreatedAt', 'UpdatedAt'],
    SCAN_EVENTS: ['ScanId', 'RoomId', 'UserId', 'ScannedAt', 'UserAgent', 'QrPayload'],
    INSPECTIONS: ['InspectionId', 'DateKey', 'WeekStart', 'DayNumber', 'RoomId', 'RoomTypeId', 'SlotId', 'SlotCode', 'UserId', 'ScanId', 'ScannedAt', 'SubmittedAt', 'OverallStatus', 'DirtyCount', 'EvidenceFileId', 'EvidenceName', 'State', 'BackupStatus', 'BackupUpdatedAt', 'ReopenedAt', 'ReopenedBy'],
    INSPECTION_DETAILS: ['DetailId', 'InspectionId', 'ActivityId', 'QualityResult', 'QualityLabel', 'FunctionResult', 'FunctionLabel', 'Status', 'FuncStatus', 'Note', 'PhotoFileId', 'CorrectedAt', 'CorrectedBy'],
    INSPECTION_PHOTOS: ['PhotoId', 'InspectionId', 'FileId', 'FileName', 'CapturedAt', 'SortOrder'],
    EVALUATION_ASPECTS: ['AspectId', 'RoomTypeId', 'Code', 'Label', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
    EVALUATIONS: ['EvaluationId', 'RoomId', 'RoomTypeId', 'Rating', 'RatingLabel', 'AspectCodes', 'Comment', 'DateKey', 'WeekStart', 'MonthKey', 'SubmittedAt', 'Source', 'UserAgent'],
    BACKUP_QUEUE: ['QueueId', 'InspectionId', 'EventType', 'PayloadJson', 'Status', 'AttemptCount', 'LastError', 'CreatedAt', 'UpdatedAt'],
    SESSIONS: ['SessionHash', 'UserId', 'ExpiresAt', 'CreatedAt'],
    AUDIT_LOG: ['AuditId', 'UserId', 'Action', 'EntityType', 'EntityId', 'Detail', 'CreatedAt']
  },
  PRIMARY_KEYS: {
    SETTINGS: 'Key', USERS: 'UserId', ROOM_TYPES: 'RoomTypeId', ROOMS: 'RoomId',
    ACTIVITIES: 'ActivityId', ROOM_ACTIVITIES: 'MapId', SLOTS: 'SlotId',
    SCAN_EVENTS: 'ScanId', INSPECTIONS: 'InspectionId', INSPECTION_DETAILS: 'DetailId',
    INSPECTION_PHOTOS: 'PhotoId', EVALUATION_ASPECTS: 'AspectId', EVALUATIONS: 'EvaluationId',
    BACKUP_QUEUE: 'QueueId', SESSIONS: 'SessionHash', AUDIT_LOG: 'AuditId'
  }
};

function doGet(e) {
  var params = (e && e.parameter) || {};

  // 1. Redirect QR Evaluasi Pengunjung ke Next.js Vercel
  if (params.evaluate || params.evaluation) {
    var evalToken = String(params.evaluate || params.evaluation || '').trim();
    var evalUrl = 'https://monitoring-kebersihan-pln-ups.vercel.app/evaluate/' + encodeURIComponent(evalToken);
    return createRedirectOutput_(evalUrl, 'Mengarahkan ke Formulir Penilaian Kebersihan...');
  }

  // 2. Redirect QR Checklist Petugas ke Next.js Vercel
  if (params.room || params.checklist) {
    var roomToken = String(params.room || params.checklist || '').trim();
    var scanUrl = 'https://monitoring-kebersihan-pln-ups.vercel.app/scanner/room/' + encodeURIComponent(roomToken);
    return createRedirectOutput_(scanUrl, 'Mengarahkan ke Checklist Kebersihan Ruangan...');
  }

  // 3. Redirect Admin / Akses Umum langsung ke Portal Admin Vercel
  if (params.admin === '1' || (!params.room && !params.evaluate && !params.checklist && !params.evaluation)) {
    return createRedirectOutput_('https://monitoring-kebersihan-pln-ups.vercel.app/admin', 'Mengarahkan ke Portal Monitoring Kebersihan...');
  }

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
    evaluationToken: String(params.evaluate || '').trim(),
    appName: APP.NAME,
    institution: APP.INSTITUTION,
    logoUrl: APP.LOGO_URL
  });
  return template.evaluate()
    .setTitle(APP.NAME)
    .setFaviconUrl('https://lh3.googleusercontent.com/d/1XmRrIFaxK_WKS70WhB7o49R80-LM9QO4=w64?favicon.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function createRedirectOutput_(targetUrl, message) {
  var html = '<!DOCTYPE html>' +
    '<html><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<title>PLN UPS Monitoring Kebersihan</title>' +
    '<meta http-equiv="refresh" content="0;url=' + targetUrl + '">' +
    '<script>window.location.replace("' + targetUrl + '");</script>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #072d3f; color: #ffffff; text-align: center; padding: 20px; box-sizing: border-box; }' +
    '.card { background: #0c364d; border: 1px solid #144b67; border-radius: 24px; padding: 36px 24px; max-width: 380px; width: 100%; box-shadow: 0 12px 30px rgba(0,0,0,0.35); }' +
    '.spinner { width: 38px; height: 38px; border: 3px solid rgba(255,209,0,0.2); border-top-color: #ffd100; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }' +
    '@keyframes spin { to { transform: rotate(360deg); } }' +
    'h3 { margin: 0 0 8px; font-size: 17px; font-weight: 800; color: #ffd100; letter-spacing: 0.5px; }' +
    'p { margin: 0 0 20px; font-size: 13px; color: #97b7c8; line-height: 1.5; }' +
    'a { display: inline-block; padding: 12px 24px; background: #0076a8; color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 12px; font-weight: bold; }' +
    '</style>' +
    '</head><body>' +
    '<div class="card">' +
    '<div class="spinner"></div>' +
    '<h3>PLN UPS MONITORING</h3>' +
    '<p>' + (message || 'Mengarahkan...') + '</p>' +
    '<a href="' + targetUrl + '">Buka Halaman Langsung &rarr;</a>' +
    '</div>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('Mengarahkan ke PLN UPS...')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
    properties.setProperty('DATABASE_MODE', 'SPREADSHEET');
    properties.setProperty('PRIMARY_STORAGE_MODE', 'SPREADSHEET');
    if (properties.getProperty('NAS_EVIDENCE_ENABLED') === null) {
      properties.setProperty('NAS_EVIDENCE_ENABLED', 'true');
    }
    if (properties.getProperty('NAS_SHEET_BACKUP_ENABLED') === null) {
      properties.setProperty('NAS_SHEET_BACKUP_ENABLED', 'true');
    }
    properties.setProperty('DRIVE_EVIDENCE_FALLBACK_ENABLED', 'true');
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

/** @deprecated MariaDB tidak lagi didukung sebagai database aplikasi. */
function initializeMariaDbPrimary() {
  throw appError_('MARIADB_DISABLED',
    'Fungsi ini dinonaktifkan. Google Spreadsheet adalah database utama aplikasi.');
}

function rebuildFallbackCacheFromMariaDb_() {
  throw appError_('MARIADB_DISABLED',
    'Rebuild dari MariaDB dinonaktifkan untuk melindungi database Spreadsheet.');
}

/** Jalankan satu kali setelah deployment untuk menetapkan Sheet sebagai database utama. */
function activateSpreadsheetPrimaryMode() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    assert_(isApplicationReady_(), 'NOT_CONFIGURED', 'SPREADSHEET_ID belum tersedia.');
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty('DATABASE_MODE', 'SPREADSHEET');
    properties.setProperty('PRIMARY_STORAGE_MODE', 'SPREADSHEET');
    properties.setProperty('NAS_EVIDENCE_ENABLED', 'true');
    properties.setProperty('NAS_SHEET_BACKUP_ENABLED', 'true');
    properties.setProperty('DRIVE_EVIDENCE_FALLBACK_ENABLED', 'true');
    Object.keys(APP.SHEETS).forEach(invalidatePrimaryRows_);
    ensureBackupTrigger_();
    var qrAudit = buildRoomQrIntegrityAudit_();
    assert_(qrAudit.ok, 'QR_RECONCILIATION_FAILED',
      'Audit ROOMS belum lolos. Periksa hasil runRoomQrReconciliationCheck().');
    var baselineTokenCount = captureRoomQrTokenBaseline_();
    logAudit_('SYSTEM', 'ACTIVATE_SPREADSHEET_PRIMARY', 'SYSTEM', 'DATABASE', {
      databaseMode: 'SPREADSHEET', roomCount: qrAudit.roomCount, qrTokensChanged: false
    });
    return {
      ok: true,
      databaseMode: 'SPREADSHEET',
      nasEvidenceEnabled: true,
      nasSheetBackupEnabled: true,
      driveEvidenceFallbackEnabled: true,
      baselineTokenCount: baselineTokenCount,
      qrAudit: qrAudit
    };
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
      logout: logout_,
      getEvaluationContext: getEvaluationContext_,
      submitEvaluation: submitEvaluation_
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
      saveRoomType: saveRoomType_,
      auditRoomQrIntegrity: auditRoomQrIntegrity_,
      softDeleteRoom: softDeleteRoom_,
      setRoomVisibility: setRoomVisibility_,
      normalizeRoomOrder: normalizeRoomOrder_,
      saveActivity: saveActivity_,
      setRoomActivities: setRoomActivities_,
      saveUser: saveUser_,
      resetUserPassword: resetUserPassword_,
      reopenInspection: reopenInspection_,
      correctInspectionDetail: correctInspectionDetail_,
      generateMonthlyPdf: generateMonthlyPdf_,
      getEvaluationReport: getEvaluationReport_,
      exportEvaluationExcel: exportEvaluationExcel_,
      generateEvaluationPdf: generateEvaluationPdf_,
      previewWorkbook: previewMonitoringWorkbook_,
      exportWorkbook: exportMonitoringWorkbook_,
      previewMonthlyWorkbook: previewMonthlyMonitoringWorkbook_,
      exportMonthlyWorkbook: exportMonthlyMonitoringWorkbook_,
      getQrData: monitoringGetQrData_,
      retryNasBackup: retryNasBackup_,
      backupSpreadsheetNow: backupSpreadsheetNow_,
      testNasConnection: testNasConnection_,
      setNasConfiguration: setNasConfiguration_,
      setReportTemplate: setReportTemplate_,
      setMonthlyReportTemplate: setMonthlyReportTemplate_,
      getOfficerPerformanceReport: getOfficerPerformanceReport_
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
