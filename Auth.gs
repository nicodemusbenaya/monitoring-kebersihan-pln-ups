function seedUsers_() {
  // Alias kompatibilitas untuk instalasi versi lama.
  // Seluruh akun awal resmi dikelola oleh seedMonitoringUsers_.
  seedMonitoringUsers_();
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

  var token = secureToken_();
  var expiresAt = new Date(Date.now() + APP.SESSION_HOURS * 60 * 60 * 1000).toISOString();
  appendObject_('SESSIONS', {
    SessionHash: hash_(token),
    UserId: user.UserId,
    ExpiresAt: expiresAt,
    CreatedAt: nowIso_()
  });
  logAudit_(user.UserId, 'LOGIN', 'USER', user.UserId, {});

  return {
    sessionToken: token,
    expiresAt: expiresAt,
    user: publicUser_(user)
  };
}

function logout_(payload) {
  var tokenHash = hash_(String(payload.sessionToken || ''));
  var session = findBy_('SESSIONS', 'SessionHash', tokenHash);
  if (session) {
    updateObjectRow_('SESSIONS', session._row, { ExpiresAt: nowIso_() });
    logAudit_(session.UserId, 'LOGOUT', 'USER', session.UserId, {});
  }
  return { loggedOut: true };
}

function requireSession_(token) {
  assert_(token, 'SESSION_REQUIRED', 'Silakan login terlebih dahulu.');
  var session = findBy_('SESSIONS', 'SessionHash', hash_(String(token)));
  assert_(session, 'SESSION_INVALID', 'Sesi tidak valid. Silakan login kembali.');
  assert_(new Date(session.ExpiresAt).getTime() > Date.now(), 'SESSION_EXPIRED', 'Sesi telah berakhir. Silakan login kembali.');
  var user = findBy_('USERS', 'UserId', session.UserId);
  assert_(user && truthy_(user.Active), 'USER_INACTIVE', 'Akun sudah tidak aktif.');
  return {
    tokenHash: session.SessionHash,
    user: user,
    publicUser: publicUser_(user)
  };
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
    }
  });
  return { ok: true, updatedUsers: updated };
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
