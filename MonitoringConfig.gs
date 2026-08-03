/**
 * Konfigurasi operasional berdasarkan workbook "Ceklis Ruangan UPS.xlsx".
 * Indikator dapat diubah melalui sheet ACTIVITIES tanpa mengubah kode aplikasi.
 */
function monitoringRoomTypes_() {
  return [
    { id: 'GENERAL', name: 'Ruangan', sheet: 'Ceklis Ruangan New', days: 6, order: 1 },
    { id: 'TOILET', name: 'Toilet', sheet: 'Ceklis Toilet New', days: 5, order: 2 },
    { id: 'PANTRY', name: 'Pantry', sheet: 'Ceklis Pantry', days: 6, order: 3 },
    { id: 'CLASS', name: 'Ruang Kelas / TUK', sheet: 'Ceklis Ruang Kelas', days: 6, order: 4 }
  ];
}

function monitoringRooms_() {
  return [
    ['UPS', 'Ruangan UPS', 'GENERAL'],
    ['ARSIP', 'Ruang Arsip', 'GENERAL'],
    ['RAPAT', 'Ruang Rapat', 'GENERAL'],
    ['TOILET', 'Toilet', 'TOILET'],
    ['PANTRY', 'Pantry', 'PANTRY'],
    ['TUK', 'Ruang Kelas / TUK', 'CLASS']
  ];
}

function monitoringItems_() {
  function item(type, name, row, quality, func) {
    quality = quality || null;
    func = func || null;
    return {
      type: type, name: name, row: row,
      qa: Boolean(quality), qp: quality ? quality[0] : '', qn: quality ? quality[1] : '',
      fa: Boolean(func), fp: func ? func[0] : '', fn: func ? func[1] : ''
    };
  }
  var clean = ['Bersih', 'Kotor'];
  var normal = ['Normal', 'Rusak'];
  var trash = ['Sampah sudah diangkut', 'Sampah belum diangkut'];
  var odor = ['Tidak bau', 'Bau tidak sedap'];
  var inspected = ['Sudah diperiksa', 'Belum diperiksa'];
  return [
    item('GENERAL', 'LANTAI', 12, clean, normal),
    item('GENERAL', 'LANGIT-LANGIT / PLAFON', 13, clean, normal),
    item('GENERAL', 'DINDING', 14, clean, normal),
    item('GENERAL', 'TEMPAT SAMPAH', 15, trash, normal),
    item('GENERAL', 'BAU RUANGAN', 16, odor, normal),
    item('GENERAL', 'SELASAR', 17, clean, normal),
    item('GENERAL', 'VENTILASI / JENDELA', 18, clean, normal),
    item('GENERAL', 'AC (AIR CONDITIONER)', 19, clean, normal),
    item('GENERAL', 'LAMPU', 20, inspected, normal),
    item('GENERAL', 'STOP KONTAK', 21, inspected, normal),
    item('GENERAL', 'LEMARI', 22, clean, normal),
    item('GENERAL', 'MEJA', 23, clean, normal),
    item('GENERAL', 'KURSI', 24, clean, normal),
    item('GENERAL', 'PAPAN TULIS / WHITEBOARD', 25, clean, normal),
    item('GENERAL', 'DISPENSER', 26, clean, ['Galon terisi', 'Galon habis']),
    item('GENERAL', 'JARINGAN WIFI / INTERNET', 27, inspected, normal),
    item('GENERAL', 'KOTAK P3K DAN ISINYA', 28, inspected, ['Lengkap', 'Tidak lengkap']),
    item('GENERAL', 'MEDIA DISPLAY (PROYEKTOR / VIDEOTRON, DLL)', 29, clean, normal),

    item('TOILET', 'LANTAI', 12, clean, normal),
    item('TOILET', 'DINDING', 13, clean, normal),
    item('TOILET', 'VENTILASI', 14, clean, normal),
    item('TOILET', 'CLOSET', 15, clean, normal),
    item('TOILET', 'JET SHOWER / BIDET', 16, clean, normal),
    item('TOILET', 'URINOIR', 17, clean, normal),
    item('TOILET', 'PENGHARUM TOILET', 18, odor, ['Ada', 'Tidak ada']),
    item('TOILET', 'WASTAFEL & KRAN AIR', 19, clean, normal),
    item('TOILET', 'CERMIN', 20, clean, normal),
    item('TOILET', 'TEMPAT SAMPAH', 21, trash, normal),
    item('TOILET', 'PINTU', 22, inspected, normal),
    item('TOILET', 'LAMPU', 23, inspected, normal),
    item('TOILET', 'HANDRAIL (DISABILITAS)', 24, clean, normal),
    item('TOILET', 'SABUN', 28, null, ['Ada', 'Tidak ada']),
    item('TOILET', 'DRYER / TISU', 29, null, ['Ada', 'Tidak ada']),

    item('PANTRY', 'LANTAI', 12, clean, normal),
    item('PANTRY', 'DINDING', 13, clean, normal),
    item('PANTRY', 'LAMPU', 14, inspected, normal),
    item('PANTRY', 'VENTILASI', 15, clean, normal),
    item('PANTRY', 'TEMPAT SAMPAH', 16, trash, normal),
    item('PANTRY', 'MEJA', 17, clean, normal),
    item('PANTRY', 'KURSI', 18, clean, normal),
    item('PANTRY', 'TEMPAT CUCI PIRING', 19, clean, normal),
    item('PANTRY', 'PERALATAN MAKAN', 20, clean, normal),
    item('PANTRY', 'PERALATAN PANTRY', 21, clean, normal),

    item('CLASS', 'LANTAI', 12, clean, normal),
    item('CLASS', 'LANGIT-LANGIT / PLAFON', 13, clean, normal),
    item('CLASS', 'DINDING', 14, clean, normal),
    item('CLASS', 'TEMPAT SAMPAH', 15, trash, normal),
    item('CLASS', 'BAU RUANGAN', 16, odor, normal),
    item('CLASS', 'VENTILASI / JENDELA', 17, clean, normal),
    item('CLASS', 'AC (AIR CONDITIONER)', 18, clean, normal),
    item('CLASS', 'LAMPU', 19, inspected, normal),
    item('CLASS', 'STOP KONTAK', 20, inspected, normal),
    item('CLASS', 'LEMARI', 21, clean, normal),
    item('CLASS', 'MEJA', 22, clean, normal),
    item('CLASS', 'KURSI', 23, clean, normal),
    item('CLASS', 'PAPAN TULIS / WHITEBOARD', 24, clean, normal),
    item('CLASS', 'DISPENSER', 25, clean, ['Galon terisi', 'Galon habis']),
    item('CLASS', 'JARINGAN WIFI / INTERNET', 26, inspected, normal),
    item('CLASS', 'KOTAK P3K DAN ISINYA', 27, inspected, ['Lengkap', 'Tidak lengkap']),
    item('CLASS', 'MEDIA DISPLAY (PROYEKTOR / VIDEOTRON, DLL)', 28, clean, normal),
    item('CLASS', 'TRANSMITTER / KABEL HDMI', 29, clean, normal),
    item('CLASS', 'SOUND SYSTEM', 30, clean, normal)
  ];
}

function monitoringSlots_() {
  var rows = [];
  ['GENERAL', 'PANTRY', 'CLASS'].forEach(function(type) {
    rows.push([type, 'PAGI', 'Pagi', 'PETUGAS', 1]);
    rows.push([type, 'SORE', 'Sore', 'PETUGAS', 2]);
    rows.push([type, 'INSPEKSI', 'Inspeksi', 'SUPERVISOR', 3]);
  });
  rows.push(['TOILET', 'PAGI', 'Pagi', 'PETUGAS', 1]);
  rows.push(['TOILET', 'INSPEKSI_1', 'Inspeksi 1', 'SUPERVISOR', 2]);
  rows.push(['TOILET', 'SIANG', 'Siang', 'PETUGAS', 3]);
  rows.push(['TOILET', 'INSPEKSI_2', 'Inspeksi 2', 'SUPERVISOR', 4]);
  rows.push(['TOILET', 'SORE', 'Sore', 'PETUGAS', 5]);
  rows.push(['TOILET', 'INSPEKSI_3', 'Inspeksi 3', 'SUPERVISOR', 6]);
  return rows;
}

function seedMonitoringConfiguration_() {
  var now = nowIso_();
  var types = rowsAsObjects_('ROOM_TYPES');
  monitoringRoomTypes_().forEach(function(type) {
    if (!types.some(function(row) { return row.RoomTypeId === type.id; })) {
      appendObject_('ROOM_TYPES', {
        RoomTypeId: type.id, Name: type.name, TemplateSheet: type.sheet,
        WorkDays: type.days, Active: true, SortOrder: type.order, CreatedAt: now, UpdatedAt: now
      });
    }
  });

  var rooms = rowsAsObjects_('ROOMS');
  monitoringRooms_().forEach(function(room, index) {
    var existing = rooms.find(function(row) { return row.Code === room[0]; });
    if (existing) {
      updateObjectRow_('ROOMS', existing._row, { RoomTypeId: room[2], UpdatedAt: now });
    } else {
      appendObject_('ROOMS', {
        RoomId: id_('ROOM'), Code: room[0], Name: room[1], RoomTypeId: room[2],
        QrToken: secureToken_(), Active: true, SortOrder: index + 1, CreatedAt: now, UpdatedAt: now
      });
    }
  });

  var activities = rowsAsObjects_('ACTIVITIES');
  activities.filter(function(row) { return !row.RoomTypeId; }).forEach(function(row) {
    updateObjectRow_('ACTIVITIES', row._row, { Active: false, UpdatedAt: now });
  });
  monitoringItems_().forEach(function(item, index) {
    var existing = activities.find(function(row) {
      return row.RoomTypeId === item.type && String(row.Name).toUpperCase() === item.name;
    });
    if (existing) {
      // setupApplication juga berfungsi sebagai migrasi konfigurasi workbook.
      // Identitas/nama/urutan yang dikelola admin tetap dipertahankan.
      updateObjectRow_('ACTIVITIES', existing._row, {
        QualityApplicable: item.qa,
        QualityPositive: item.qp,
        QualityNegative: item.qn,
        FunctionApplicable: item.fa,
        FunctionPositive: item.fp,
        FunctionNegative: item.fn,
        ExportRow: item.row,
        UpdatedAt: now
      });
    } else {
      appendObject_('ACTIVITIES', {
        ActivityId: id_('ACT'), RoomTypeId: item.type, Name: item.name,
        QualityApplicable: item.qa, QualityPositive: item.qp, QualityNegative: item.qn,
        FunctionApplicable: item.fa, FunctionPositive: item.fp, FunctionNegative: item.fn,
        ExportRow: item.row, Active: true, SortOrder: index + 1, CreatedAt: now, UpdatedAt: now
      });
    }
  });

  var slots = rowsAsObjects_('SLOTS');
  monitoringSlots_().forEach(function(slot) {
    if (!slots.some(function(row) { return row.RoomTypeId === slot[0] && row.Code === slot[1]; })) {
      appendObject_('SLOTS', {
        SlotId: slot[0] + '-' + slot[1], RoomTypeId: slot[0], Code: slot[1],
        Name: slot[2], Role: slot[3], SortOrder: slot[4], Active: true,
        CreatedAt: now, UpdatedAt: now
      });
    }
  });
}

function seedMonitoringUsers_() {
  var users = rowsAsObjects_('USERS');
  var legacyUsernames = ['admin', 'petugas1', 'petugas2'];
  users.filter(function(user) {
    return legacyUsernames.indexOf(String(user.Username).toLowerCase()) !== -1;
  }).forEach(function(user) {
    updateObjectRow_('USERS', user._row, {
      Active: false,
      UpdatedAt: nowIso_()
    });
  });

  [
    ['arif', 'Arif Budi Hartono', 'PETUGAS', 'arif123'],
    ['sulaiman', 'Sulaiman', 'PETUGAS', 'sulaiman123'],
    ['ipal', 'Ipal Hapidz', 'SUPERVISOR', 'ipal123'],
    ['dwi', 'Dwi Meyrizka Prativi', 'ADMIN', 'dwi123']
  ].forEach(function(item) {
    if (!users.some(function(user) { return String(user.Username).toLowerCase() === item[0]; })) {
      createUserRecord_(item[0], item[1], item[2], item[3], false);
    }
  });
}
