function seedUsers_() {
  // Alias kompatibilitas untuk instalasi versi lama.
  // Seluruh akun awal resmi dikelola oleh seedMonitoringUsers_.
  seedMonitoringUsers_();
}

var SESSION_CONTEXT_CACHE_SECONDS_ = 60;

function sessionContextCacheKey_(tokenHash) {
  return 'MONITORING_SESSION_' + String(tokenHash || '').slice(0, 160);
}

function readSessionContextCache_(tokenHash) {
  try {
    var cached = CacheService.getScriptCache().get(sessionContextCacheKey_(tokenHash));
    if (!cached) return null;
    var context = JSON.parse(cached);
    if (!context || new Date(context.expiresAt).getTime() <= Date.now() ||
        !context.user || !truthy_(context.user.Active)) {
      CacheService.getScriptCache().remove(sessionContextCacheKey_(tokenHash));
      return null;
    }
    return {
      tokenHash: tokenHash,
      user: context.user,
      publicUser: publicUser_(context.user)
    };
  } catch (error) {
    return null;
  }
}

function writeSessionContextCache_(tokenHash, expiresAt, user) {
  try {
    var remainingSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    if (remainingSeconds <= 0) return;
    CacheService.getScriptCache().put(sessionContextCacheKey_(tokenHash), JSON.stringify({
      expiresAt: expiresAt,
      user: user
    }), Math.max(1, Math.min(SESSION_CONTEXT_CACHE_SECONDS_, remainingSeconds)));
  } catch (error) {}
}

function clearSessionContextCache_(tokenHash) {
  try { CacheService.getScriptCache().remove(sessionContextCacheKey_(tokenHash)); } catch (error) {}
}

function clearSessionContextCachesForUser_(userId) {
  rowsAsLocalObjects_('SESSIONS').forEach(function(session) {
    if (String(session.UserId) === String(userId)) {
      clearSessionContextCache_(session.SessionHash);
    }
  });
}

function ensureInspectorUserRecord_() {
  var username = 'ipal';
  var users = rowsAsObjects_('USERS');
  var existing = users.find(function(user) {
    return String(user.Username || '').toLowerCase() === username;
  });
  if (existing) return { userId: existing.UserId, created: false };

  var userId = createUserRecord_(username, 'Ipal Hapidz', 'SUPERVISOR', 'ipal123', false);
  logAudit_('SYSTEM', 'ENSURE_INSPECTOR_USER', 'USER', userId, {
    username: username, role: 'SUPERVISOR', action: 'created-on-admin-login'
  });
  return { userId: userId, created: true };
}

function login_(payload) {
  var username = String(payload.username || '').trim().toLowerCase();
  var password = String(payload.password || '');
  assert_(username && password, 'LOGIN_REQUIRED', 'Username dan password wajib diisi.');

  var user = rowsAsObjects_('USERS').find(function(item) {
    return String(item.Username).toLowerCase() === username && truthy_(item.Active);
  });
  assert_(user, 'INVALID_LOGIN', 'Username atau password salah.');
  assert_(verifyPassword_(password, user.Salt, user.PasswordHash), 'INVALID_LOGIN', 'Username atau password salah.');
  if (String(user.Role || '').toUpperCase() === 'ADMIN') {
    try { ensureInspectorUserRecord_(); } catch (error) {
      console.warn('Akun inspektor belum dapat dibuat otomatis: ' + error.message);
    }
  }

  var token = secureToken_();
  var expiresAt = new Date(Date.now() + APP.SESSION_HOURS * 60 * 60 * 1000).toISOString();
  appendObject_('SESSIONS', {
    SessionHash: hash_(token),
    UserId: user.UserId,
    ExpiresAt: expiresAt,
    CreatedAt: nowIso_()
  });
  writeSessionContextCache_(hash_(token), expiresAt, user);
  logAudit_(user.UserId, 'LOGIN', 'USER', user.UserId, {});

  return {
    sessionToken: token,
    expiresAt: expiresAt,
    user: publicUser_(user)
  };
}

function logout_(payload) {
  var tokenHash = hash_(String(payload.sessionToken || ''));
  clearSessionContextCache_(tokenHash);
  var session = findBy_('SESSIONS', 'SessionHash', tokenHash);
  if (session) {
    updateObjectRow_('SESSIONS', session._row, { ExpiresAt: nowIso_() });
    logAudit_(session.UserId, 'LOGOUT', 'USER', session.UserId, {});
  }
  return { loggedOut: true };
}

function requireSession_(token) {
  assert_(token, 'SESSION_REQUIRED', 'Silakan login terlebih dahulu.');
  var tokenHash = hash_(String(token));
  var cachedContext = readSessionContextCache_(tokenHash);
  if (cachedContext) return cachedContext;
  // Sesi selalu dicerminkan ke Spreadsheet. Membaca mirror lokal menghindari
  // autentikasi setiap aksi menunggu gateway NAS yang sedang offline.
  var source = rowsAsLocalObjectsBatch_(['SESSIONS', 'USERS']);
  var session = source.SESSIONS.find(function(item) {
    return String(item.SessionHash) === tokenHash;
  }) || null;
  var user = source.USERS.find(function(item) {
    return session && String(item.UserId) === String(session.UserId);
  }) || null;

  // Mirror lokal dapat tertinggal ketika gateway baru pulih atau ketika
  // migrasi membuat Spreadsheet fallback baru. Coba sumber utama hanya jika
  // sesi/user lokal tidak ditemukan atau terlihat nonaktif.
  if ((!session || !user || !truthy_(user.Active)) && primaryDatabaseConfigured_() && !primaryDatabaseCircuitOpen_()) {
    var primarySource = rowsAsObjectsBatch_(['SESSIONS', 'USERS']);
    var primarySession = primarySource.SESSIONS.find(function(item) {
      return String(item.SessionHash) === tokenHash;
    }) || null;
    var primaryUser = primarySource.USERS.find(function(item) {
      return primarySession && String(item.UserId) === String(primarySession.UserId);
    }) || null;
    if (primarySession) {
      session = primarySession;
      user = primaryUser;
      if (primaryUser) mirrorUpsert_('USERS', primaryUser);
      mirrorUpsert_('SESSIONS', primarySession);
    }
  }

  assert_(session, 'SESSION_INVALID', 'Sesi tidak valid. Silakan login kembali.');
  assert_(new Date(session.ExpiresAt).getTime() > Date.now(), 'SESSION_EXPIRED', 'Sesi telah berakhir. Silakan login kembali.');
  assert_(user && truthy_(user.Active), 'USER_INACTIVE', 'Akun sudah tidak aktif.');
  var context = {
    tokenHash: session.SessionHash,
    user: user,
    publicUser: publicUser_(user)
  };
  writeSessionContextCache_(session.SessionHash, session.ExpiresAt, user);
  return context;
}

function requireAdmin_(payload) {
  var session = payload._session;
  assert_(session && session.user.Role === 'ADMIN', 'FORBIDDEN', 'Tindakan ini hanya dapat dilakukan admin.');
  return session;
}

function changePassword_(payload) {
  var session = payload._session;
  var currentPassword = String(payload.currentPassword || '');
  var newPassword = String(payload.newPassword || '');
  assert_(verifyPassword_(currentPassword, session.user.Salt, session.user.PasswordHash), 'INVALID_PASSWORD', 'Password saat ini salah.');
  validatePassword_(newPassword);

  var salt = secureToken_().slice(0, 24);
  updateObjectRow_('USERS', session.user._row, {
    Salt: salt,
    PasswordHash: passwordHash_(newPassword, salt),
    MustChangePassword: false,
    UpdatedAt: nowIso_()
  });
  clearSessionContextCache_(session.tokenHash);
  logAudit_(session.user.UserId, 'CHANGE_PASSWORD', 'USER', session.user.UserId, {});
  return { changed: true };
}

function createUserRecord_(username, fullName, role, password, mustChange) {
  validatePassword_(password);
  var salt = secureToken_().slice(0, 24);
  var now = nowIso_();
  var userId = id_('USR');
  appendObject_('USERS', {
    UserId: userId,
    Username: String(username).trim().toLowerCase(),
    FullName: safeCellText_(fullName),
    Role: role,
    PasswordHash: passwordHash_(password, salt),
    Salt: salt,
    Active: true,
    MustChangePassword: Boolean(mustChange),
    CreatedAt: now,
    UpdatedAt: now
  });
  return userId;
}

function passwordHash_(password, salt) {
  var pepper = PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER') || '';
  var value = String(password) + '|' + salt + '|' + pepper;
  for (var i = 0; i < 2500; i++) value = hash_(value);
  return value;
}

function verifyPassword_(password, salt, expected) {
  var actual = passwordHash_(password, salt);
  if (actual.length !== String(expected).length) return false;
  var mismatch = 0;
  for (var i = 0; i < actual.length; i++) {
    mismatch |= actual.charCodeAt(i) ^ String(expected).charCodeAt(i);
  }
  return mismatch === 0;
}

function validatePassword_(password) {
  assert_(password.length >= 6, 'WEAK_PASSWORD', 'Password minimal 6 karakter.');
  assert_(/[A-Za-z]/.test(password) && /\d/.test(password), 'WEAK_PASSWORD', 'Password harus memuat huruf dan angka.');
}

/**
 * Jalankan sekali dari editor Apps Script untuk menerapkan password sederhana
 * pada empat akun bawaan. Semua sesi lama akun tersebut akan diakhiri.
 */
function resetSimpleUserPasswords() {
  var credentials = {
    arif: 'arif123',
    sulaiman: 'sulaiman123',
    ipal: 'ipal123',
    dwi: 'dwi123'
  };
  var users = rowsAsObjects_('USERS');
  var updatedUserIds = {};
  var updated = [];
  Object.keys(credentials).forEach(function(username) {
    var user = users.find(function(item) {
      return String(item.Username || '').toLowerCase() === username;
    });
    if (!user) return;
    var salt = secureToken_().slice(0, 24);
    updateObjectRow_('USERS', user._row, {
      Salt: salt,
      PasswordHash: passwordHash_(credentials[username], salt),
      MustChangePassword: false,
      Active: true,
      UpdatedAt: nowIso_()
    });
    updatedUserIds[String(user.UserId)] = true;
    updated.push(username);
  });
  rowsAsObjects_('SESSIONS').forEach(function(session) {
    if (updatedUserIds[String(session.UserId)] &&
        new Date(session.ExpiresAt).getTime() > Date.now()) {
      updateObjectRow_('SESSIONS', session._row, { ExpiresAt: nowIso_() });
      clearSessionContextCache_(session.SessionHash);
    }
  });
  return { ok: true, updatedUsers: updated };
}

/**
 * Menjamin akun inspektor bawaan tersedia tanpa membuat duplikat username.
 * Jalankan sekali dari editor Apps Script setelah deployment jika akun belum
 * ada. Role SUPERVISOR adalah role inspektor pada aplikasi ini.
 */
function ensureInspectorUserIpal() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    assert_(isApplicationReady_(), 'NOT_CONFIGURED', 'Jalankan setupApplication terlebih dahulu.');
    var username = 'ipal';
    var fullName = 'Ipal Hapidz';
    var role = 'SUPERVISOR';
    var password = 'ipal123';
    var users = rowsAsObjects_('USERS');
    var user = users.find(function(item) {
      return String(item.Username || '').toLowerCase() === username;
    });
    var now = nowIso_();
    var userId;
    var action;

    if (user) {
      var salt = secureToken_().slice(0, 24);
      updateObjectRow_('USERS', user._row, {
        FullName: fullName,
        Role: role,
        Salt: salt,
        PasswordHash: passwordHash_(password, salt),
        Active: true,
        MustChangePassword: false,
        UpdatedAt: now
      });
      userId = user.UserId;
      action = 'updated';
    } else {
      userId = createUserRecord_(username, fullName, role, password, false);
      action = 'created';
    }

    rowsAsObjects_('SESSIONS').forEach(function(session) {
      if (String(session.UserId) === String(userId)) {
        updateObjectRow_('SESSIONS', session._row, { ExpiresAt: now });
        clearSessionContextCache_(session.SessionHash);
      }
    });
    clearSessionContextCachesForUser_(userId);
    logAudit_('SYSTEM', 'ENSURE_INSPECTOR_USER', 'USER', userId, {
      username: username, role: role, action: action
    });
    return { ok: true, action: action, userId: userId, username: username, role: role };
  } finally {
    lock.releaseLock();
  }
}

function publicUser_(user) {
  return {
    userId: user.UserId,
    username: user.Username,
    fullName: user.FullName,
    role: user.Role,
    active: truthy_(user.Active),
    mustChangePassword: truthy_(user.MustChangePassword)
  };
}
