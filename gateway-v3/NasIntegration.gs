/**
 * INTEGRASI NAS UNTUK UPS E-ARSIP
 * Tempelkan ke project Apps Script sebagai file baru NasIntegration.gs.
 * Kemudian GANTI fungsi uploadFilesArsipBantexByStruktur_ dan
 * uploadFileArsipByStruktur_ lama dengan fungsi pada file ini.
 */

var NAS_BASE_URL = 'http://nasups01.myqnapcloud.com:18080';
var NAS_TOKEN_PROPERTY = 'UPS_EARSIP_NAS_TOKEN';

function nasSetToken(token) {
  token = String(token || '').trim();
  if (token.length < 24) throw new Error('Token NAS minimal 24 karakter.');
  PropertiesService.getScriptProperties().setProperty(NAS_TOKEN_PROPERTY, token);
  return 'Token NAS berhasil disimpan.';
}

function nasGetToken_() {
  var token = PropertiesService.getScriptProperties().getProperty(NAS_TOKEN_PROPERTY);
  if (!token) throw new Error('Token NAS belum disimpan. Jalankan nasSetToken("TOKEN") sekali.');
  return token;
}

function nasRequest_(endpoint, method, payload) {
  var options = {
    method: method || 'get',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + nasGetToken_()
    }
  };
  if (payload !== undefined && payload !== null) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  var response = UrlFetchApp.fetch(NAS_BASE_URL + endpoint, options);
  var code = response.getResponseCode();
  var text = response.getContentText();
  var parsed;
  try { parsed = JSON.parse(text); } catch (e) { parsed = { success: false, message: text }; }
  if (code < 200 || code >= 300 || parsed.success === false) {
    throw new Error(parsed.message || ('NAS HTTP ' + code));
  }
  return parsed;
}

function nasHealthCheck() {
  var response = UrlFetchApp.fetch(NAS_BASE_URL + '/health', { muteHttpExceptions: true });
  return response.getContentText();
}

function uploadFilesArsipBantexByStruktur_(files, kodeArsip, divisi, tanggalArsip, namaItems, clearExistingFiles) {
  files = (files || []).filter(function(f) { return f && f.data; });
  namaItems = normalizeNamaArsipItems_(namaItems);
  if (!files.length) return { folderUrl:'', fileUrl:'', folderPath:'', fileDetails:[] };

  var response = nasRequest_('/api/arsip/upload', 'post', {
    kodeArsip: kodeArsip,
    divisi: divisi,
    tanggal: tanggalArsip,
    namaItems: namaItems,
    clearExistingFiles: clearExistingFiles === true,
    actor: Session.getActiveUser().getEmail() || 'Apps Script',
    files: files.map(function(f) {
      return { name: f.name || 'file', mimeType: f.mimeType || '', data: f.data };
    })
  });

  var data = response.data || {};
  return {
    folderUrl: data.folderUrl || data.fileUrl || '',
    fileUrl: data.fileUrl || data.folderUrl || '',
    folderPath: data.folderPath || '',
    fileDetails: data.fileDetails || []
  };
}

function uploadFileArsipByStruktur_(fileObj, kodeArsip, divisi, tanggalArsip) {
  if (!fileObj || !fileObj.data) return '';
  var result = uploadFilesArsipBantexByStruktur_([fileObj], kodeArsip, divisi, tanggalArsip, [String(fileObj.name || 'File 1').replace(/\.[^.]+$/, '')], false);
  return result.fileUrl || '';
}

function nasDeleteFolder_(folderPath) {
  if (!folderPath) return { attempted:false, success:true, message:'Tidak ada folder NAS.' };
  try {
    nasRequest_('/api/arsip', 'delete', { folderPath: folderPath, actor: Session.getActiveUser().getEmail() || 'Apps Script' });
    return { attempted:true, success:true, message:'Folder NAS berhasil dihapus.' };
  } catch (e) {
    return { attempted:true, success:false, message:e.message };
  }
}
