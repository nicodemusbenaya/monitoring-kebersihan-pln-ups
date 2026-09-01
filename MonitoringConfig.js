/**
 * Konfigurasi operasional berdasarkan workbook "Ceklis Ruangan UPS.xlsx".
 * Indikator dapat diubah melalui sheet ACTIVITIES tanpa mengubah kode aplikasi.
 */
function monitoringRoomTypes_() {
  return [
    { id: 'GENERAL', name: 'Ruangan', sheet: 'Ceklis Ruangan New', days: 6, order: 1 },
    { id: 'ARCHIVE', name: 'Ruang Arsip', sheet: 'Ceklis Ruang Arsip', days: 6, order: 2 },
    { id: 'TOILET', name: 'Toilet', sheet: 'Ceklis Toilet New', days: 5, order: 3 },
    { id: 'PANTRY', name: 'Pantry', sheet: 'Ceklis Pantry', days: 6, order: 4 },
    { id: 'CLASS', name: 'Ruang Kelas / TUK', sheet: 'Ceklis Ruang Kelas', days: 6, order: 5 }
  ];
}

function monitoringRooms_() {
  return [
    ['UPS', 'Ruangan UPS', 'GENERAL'],
    ['ARSIP', 'Ruang Arsip', 'ARCHIVE'],
    ['RAPAT', 'Ruang Rapat G. Utama', 'GENERAL'],
    ['TOILET', 'Toilet', 'TOILET'],
    ['PANTRY', 'Pantry', 'PANTRY'],
    ['TUK', 'Ruang TUK', 'CLASS'],

    // Ruangan operasional tambahan. Kode dibuat stabil agar QR dan histori
    // pemeriksaan tetap terikat pada ruangan yang sama setelah setup ulang.
    ['SENIOR_MANAGER', 'Ruang Senior Manager', 'GENERAL'],
    ['TOILET_SENIOR_MANAGER', 'Toilet Ruang Senior Manager', 'TOILET'],
    ['LOBBY', 'Ruang Lobby', 'GENERAL'],
    ['TOILET_WANITA_GEDUNG_UTAMA', 'Toilet Wanita Gedung Utama', 'TOILET'],
    ['TOILET_PRIA_GEDUNG_UTAMA', 'Toilet Pria Gedung Utama', 'TOILET'],
    ['ATK_FAST_MOVING', 'Ruang Penyimpanan ATK (Fast Moving)', 'GENERAL'],
    ['ASET_SLOW_MOVING', 'Ruang Penyimpanan Aset (Slow Moving)', 'ARCHIVE'],
    ['WELLBEING', 'Ruang Wellbeing', 'GENERAL'],
    ['PMKU', 'Ruang PMKU', 'GENERAL'],
    ['PSA', 'Ruang PSA', 'GENERAL'],
    ['PMA', 'Ruang PMA', 'GENERAL'],
    ['PKSM', 'Ruang PKSM', 'GENERAL'],
    ['LOBBY_TUK', 'Ruang Lobby Gedung TUK', 'GENERAL'],
    ['ADMIN', 'Ruang Admin', 'GENERAL'],
    ['PJT', 'Ruang PJT', 'GENERAL'],
    ['RAPAT_KECIL_TUK', 'Ruang Rapat Kecil Gedung TUK', 'CLASS'],
    ['TOILET_WANITA_TUK', 'Toilet Wanita Gedung TUK', 'TOILET'],
    ['TOILET_PRIA_TUK', 'Toilet Pria Gedung TUK', 'TOILET'],
    ['RAPAT_DIGITAL_ZOOM', 'Ruang Rapat Digital/Zoom', 'CLASS'],
    ['ARSIP_AKTIF', 'Ruang Arsip Aktif', 'ARCHIVE'],
    ['ARSIP_UTAMA_INAKTIF', 'Ruang Arsip Utama Inaktif', 'ARCHIVE']
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

    item('ARCHIVE', 'LANTAI', 12, clean, normal),
    item('ARCHIVE', 'LANGIT-LANGIT / PLAFON', 13, clean, normal),
    item('ARCHIVE', 'DINDING', 14, clean, normal),
    item('ARCHIVE', 'JALAN AKSES ANTAR RAK', 15, trash, normal),
    item('ARCHIVE', 'RAK / LEMARI', 16, odor, null),
    item('ARCHIVE', 'VENTILASI / JENDELA', 17, clean, normal),
    item('ARCHIVE', 'AC (AIR CONDITIONER)', 18, clean, normal),
    item('ARCHIVE', 'LAMPU', 19, clean, normal),
    item('ARCHIVE', 'STOP KONTAK', 20, null, normal),
    item('ARCHIVE', 'FOLDER BANTEX', 21, ['Rapi', 'Berantakan'], normal),

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

function monitoringStandards_() {
  function standard(category, text) {
    return { category: category || '', text: text || '' };
  }
  var roomClean = 'Menyapu dan mengepel lantai dan seluruh sudut ruangan serta membersihkan dinding dan plafon ruang kerja staf dan administrasi';
  var officeEquipment = 'Memastikan segala peralatan (Komputer, AC, Meja, dan Kursi) bersih dan bebas debu';
  var tidyOffice = 'Petugas kebersihan membersihkan dan merapikan ruang kerja staff dan administrasi setelah dan sebelum digunakan';
  var classEquipment = 'Memastikan segala peralatan (Komputer, Proyektor, AC, Meja, Kursi, Smart TV, dan Papan Tulis) bersih dan bebas debu';
  var classFunction = 'Memastikan Lampu, AC, Komputer, Proyektor, Laser Pointer, Smart TV dan Stop Kontak berfungsi dengan baik';
  var maps = {
    GENERAL: {
      'LANTAI': standard('Pembersihan Umum', roomClean),
      'LANGIT-LANGIT / PLAFON': standard('Pembersihan Umum', roomClean),
      'DINDING': standard('Pembersihan Umum', roomClean),
      'TEMPAT SAMPAH': standard('Pembersihan Umum', 'Membuang sampah dan mengganti kantong tempat sampah'),
      'BAU RUANGAN': standard('Pembersihan Umum', 'Memastikan ruangan bersih dan bebas dari bau tidak sedap'),
      'SELASAR': standard('Pembersihan Umum', tidyOffice),
      'VENTILASI / JENDELA': standard('Pembersihan Umum', 'Memastikan ventilasi udara, AC, atau exhaust fan berfungsi'),
      'AC (AIR CONDITIONER)': standard('Pembersihan Fasilitas', 'Memastikan ventilasi udara, AC, atau exhaust fan berfungsi\n' + officeEquipment),
      'LAMPU': standard('Pembersihan Fasilitas', 'Memastikan Lampu, AC, Komputer, dan Stop kontak berfungsi dengan baik\n\nMemastikan Lampu, AC, Dispenser, Komputer, dan Printer dalam keadaan off sebelum meninggalkan ruangan'),
      'STOP KONTAK': standard('Pembersihan Fasilitas', 'Memastikan Lampu, AC, Komputer, dan Stop kontak berfungsi dengan baik'),
      'LEMARI': standard('Pembersihan Fasilitas', 'Memastikan Lampu, AC, Komputer, dan Stop kontak berfungsi dengan baik'),
      'MEJA': standard('Pembersihan Fasilitas', officeEquipment + '\n\n' + tidyOffice + '\n\nMemeriksa dan mengisi ulang tisu jika habis'),
      'KURSI': standard('Pembersihan Fasilitas', officeEquipment + '\n\n' + tidyOffice),
      'PAPAN TULIS / WHITEBOARD': standard('Pembersihan Fasilitas', officeEquipment + '\n\n' + tidyOffice),
      'DISPENSER': standard('Pembersihan Fasilitas', 'Memastikan dispenser air minum berfungsi dengan baik'),
      'JARINGAN WIFI / INTERNET': standard('Pembersihan Fasilitas', ''),
      'KOTAK P3K DAN ISINYA': standard('Pembersihan Fasilitas', 'Mengecek persediaan isi kotak P3K secara rutin'),
      'MEDIA DISPLAY (PROYEKTOR / VIDEOTRON, DLL)': standard('Pembersihan Fasilitas', 'Memastikan Lampu, AC, Komputer, dan Stop kontak berfungsi dengan baik\n\nMemastikan Lampu, AC, Dispenser, Komputer, dan Printer dalam keadaan off sebelum meninggalkan ruangan')
    },
    ARCHIVE: {
      'LANTAI': standard('Pembersihan Umum', 'Lantai bersih dari debu, kertas, atau sampah lainnya'),
      'LANGIT-LANGIT / PLAFON': standard('Pembersihan Umum', 'Dinding, langit-langit, dan jendela bersih, bebas debu dan sarang laba-laba'),
      'DINDING': standard('Pembersihan Umum', 'Dinding, langit-langit, dan jendela bersih, bebas debu dan sarang laba-laba'),
      'JALAN AKSES ANTAR RAK': standard('Pembersihan Umum', 'Jalur keluar-masuk ruangan tidak terhalang dan akses mudah (minimal 60 cm atau 1 tegel lantai granit)'),
      'RAK / LEMARI': standard('Pembersihan Umum', 'Rak atau lemari arsip dalam kondisi baik, kokoh, dan stabil'),
      'VENTILASI / JENDELA': standard('Pembersihan Umum', 'Ventilasi/AC berfungsi baik, suhu ruangan terjaga agar arsip tidak lembap'),
      'AC (AIR CONDITIONER)': standard('Pembersihan Umum', 'Ventilasi/AC berfungsi baik, suhu ruangan terjaga agar arsip tidak lembap'),
      'LAMPU': standard('Pembersihan Umum', 'Pencahayaan cukup dan lampu berfungsi dengan baik'),
      'STOP KONTAK': standard('Pembersihan Umum', 'Kabel listrik tertata rapi, tidak berserakan atau melintang di lantai. Stop kontak berfungsi'),
      'FOLDER BANTEX': standard('Pembersihan Khusus', [
        'Arsip disusun sesuai kategori (tahun, jenis, abjad, dll.) dan mudah ditemukan',
        'Setiap map/dokumen berlabel jelas dan terbaca',
        'Arsip kadaluarsa/tidak terpakai diberi tanda dan dipisahkan untuk pemusnahan sesuai aturan',
        'Kotak atau wadah arsip tertutup rapat untuk melindungi dari debu dan serangga',
        'Tersedia pengendali hama (anti rayap, kapur barus, dll.) dengan aman dan tidak merusak arsip',
        'Dokumen penting disimpan di tempat khusus yang lebih aman (misalnya brankas)',
        'Tata letak rak dan dokumen memungkinkan akses cepat dan mudah',
        'Ruang bebas dari barang-barang yang tidak berhubungan dengan arsip',
        'Jadwal pengecekan/pemeliharaan arsip (fisik dan digital) dilakukan berkala'
      ].join('\n\n'))
    },
    TOILET: {
      'LANTAI': standard('Pembersihan Umum', 'Sapu dan pel lantai\nPastikan tidak ada genangan air di lantai'),
      'DINDING': standard('Pembersihan Umum', 'Bersihkan noda atau kotoran pada dinding dan pintu toilet'),
      'VENTILASI': standard('Pembersihan Umum', 'Pastikan ventilasi atau exhaust fan berfungsi'),
      'CLOSET': standard('Pembersihan Fasilitas', 'Bersihkan kloset (duduk/jongkok) dengan disinfektan\nPastikan flush toilet berfungsi dengan baik'),
      'JET SHOWER / BIDET': standard('Pembersihan Fasilitas', 'Bersihkan jet shower/bidet dan pastikan berfungsi'),
      'URINOIR': standard('Pembersihan Fasilitas', 'Bersihkan urinoir (jika ada) dan pastikan tidak tersumbat'),
      'PENGHARUM TOILET': standard('Pembersihan Fasilitas', 'Pastikan tidak ada bau tidak sedap'),
      'WASTAFEL & KRAN AIR': standard('Pembersihan Wastafel & Cermin', 'Bersihkan wastafel dan kran air dari noda atau kerak'),
      'CERMIN': standard('Pembersihan Wastafel & Cermin', 'Bersihkan cermin dari bercak air atau kotoran'),
      'SABUN': standard('Pembersihan Wastafel & Cermin', 'Pastikan sabun cuci tangan tersedia'),
      'DRYER / TISU': standard('Pembersihan Wastafel & Cermin', 'Pastikan hand dryer/tisu tersedia dan berfungsi'),
      'TEMPAT SAMPAH': standard('Ketersediaan Fasilitas', 'Buang sampah dan ganti kantong tempat sampah\n\nPastikan tempat sampah tersedia dan tertutup'),
      'PINTU': standard('Ketersediaan Fasilitas', 'Pastikan pintu toilet dapat dikunci dengan baik'),
      'LAMPU': standard('Ketersediaan Fasilitas', 'Pastikan lampu toilet menyala dengan baik'),
      'HANDRAIL (DISABILITAS)': standard('Ketersediaan Fasilitas', 'Bersihkan handrail\nPastikan handrail stabil dan kokoh')
    },
    PANTRY: {
      'LANTAI': standard('Pembersihan Umum', 'Lantai bersih dari sisa makanan, tumpahan air, minyak, atau sampah'),
      'DINDING': standard('Pembersihan Umum', 'Dinding, langit-langit, dan jendela bersih, bebas noda dan debu'),
      'LAMPU': standard('Pembersihan Umum', 'Pencahayaan cukup dan lampu berfungsi baik'),
      'VENTILASI': standard('Pembersihan Umum', 'Ventilasi/AC berfungsi baik agar udara segar dan tidak bau pengap'),
      'TEMPAT SAMPAH': standard('Pembersihan Umum', 'Tempat sampah tersedia, tertutup rapat, dan rutin dikosongkan'),
      'MEJA': standard('Pembersihan Umum', 'Meja dan kursi (jika ada) bersih dan tertata rapi'),
      'KURSI': standard('', ''),
      'TEMPAT CUCI PIRING': standard('Pembersihan Khusus', 'Area cuci piring bersih, saluran air lancar, dan sabun cuci tersedia'),
      'PERALATAN MAKAN': standard('Pembersihan Khusus', 'Peralatan makan (piring, gelas, sendok, dll.) bersih dan tertata rapi'),
      'PERALATAN PANTRY': standard('Pembersihan Khusus', 'Peralatan elektronik (microwave, kulkas, dispenser, dll.) bersih dan berfungsi baik')
    },
    CLASS: {
      'LANTAI': standard('Pembersihan Umum', 'Menyapu lantai'),
      'LANGIT-LANGIT / PLAFON': standard('Pembersihan Umum', 'Menyapu lantai'),
      'DINDING': standard('Pembersihan Umum', 'Menyapu lantai'),
      'TEMPAT SAMPAH': standard('Pembersihan Umum', 'Membuang sampah dan mengganti kantong tempat sampah'),
      'BAU RUANGAN': standard('Pembersihan Umum', 'Memastikan ruangan bersih dan bebas dari bau tidak sedap'),
      'VENTILASI / JENDELA': standard('Pembersihan Umum', 'Petugas kebersihan membersihkan dan merapikan ruang kelas dan pelatihan sebelum dan setelah sesi pelatihan'),
      'AC (AIR CONDITIONER)': standard('Pembersihan Umum', classEquipment + '\n\n' + classFunction),
      'LAMPU': standard('Pembersihan Umum', ''),
      'STOP KONTAK': standard('Pembersihan Umum', 'Memastikan dan menata kabel dan stop kontak tertata rapi'),
      'LEMARI': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction),
      'MEJA': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction),
      'KURSI': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction),
      'PAPAN TULIS / WHITEBOARD': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction),
      'DISPENSER': standard('Pembersihan Fasilitas', classEquipment + '\n\nMemastikan dispenser air minum berfungsi dan berisi air'),
      'JARINGAN WIFI / INTERNET': standard('Pembersihan Fasilitas', 'Memastikan jaringan WiFi dan Internet dalam kondisi optimal'),
      'KOTAK P3K DAN ISINYA': standard('Pembersihan Fasilitas', 'Mengecek ketersediaan kotak P3K'),
      'MEDIA DISPLAY (PROYEKTOR / VIDEOTRON, DLL)': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction),
      'TRANSMITTER / KABEL HDMI': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction),
      'SOUND SYSTEM': standard('Pembersihan Fasilitas', classEquipment + '\n\n' + classFunction)
    }
  };
  return maps;
}

function monitoringStandardFor_(roomTypeId, name) {
  var byType = monitoringStandards_()[roomTypeId] || {};
  var target = String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  var key = Object.keys(byType).find(function(itemName) {
    return String(itemName).toUpperCase().replace(/[^A-Z0-9]+/g, '') === target;
  });
  return key ? byType[key] : { category: '', text: '' };
}

function monitoringSlots_() {
  var rows = [];
  ['GENERAL', 'ARCHIVE', 'PANTRY', 'CLASS'].forEach(function(type) {
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

/**
 * Aspek evaluasi kepuasan yang tampil setelah pengguna memindai QR evaluasi.
 * Data ini disalin ke sheet EVALUATION_ASPECTS saat setup/migrasi pertama,
 * sehingga admin tetap dapat menyesuaikannya tanpa mengubah alur aplikasi.
 */
function monitoringEvaluationAspectSeeds_() {
  return [
    ['GENERAL', 'KEBERSIHAN', 'Kebersihan ruangan', 1],
    ['GENERAL', 'KERAPIAN', 'Kerapian ruangan', 2],
    ['GENERAL', 'KENYAMANAN', 'Kenyamanan ruangan', 3],
    ['GENERAL', 'KESIAPAN_FASILITAS', 'Kesiapan fasilitas', 4],
    ['ARCHIVE', 'KEBERSIHAN', 'Kebersihan ruang arsip', 1],
    ['ARCHIVE', 'KERAPIAN', 'Kerapian penataan arsip', 2],
    ['ARCHIVE', 'KENYAMANAN', 'Kenyamanan ruangan', 3],
    ['ARCHIVE', 'KESIAPAN_FASILITAS', 'Kesiapan fasilitas', 4],
    ['TOILET', 'KEBERSIHAN', 'Kebersihan toilet', 1],
    ['TOILET', 'KEHARUMAN', 'Keharuman dan kondisi bau', 2],
    ['TOILET', 'PERLENGKAPAN', 'Ketersediaan perlengkapan', 3],
    ['TOILET', 'FASILITAS', 'Kondisi fasilitas', 4],
    ['PANTRY', 'KEBERSIHAN', 'Kebersihan pantry', 1],
    ['PANTRY', 'KERAPIAN', 'Kerapian pantry', 2],
    ['PANTRY', 'KEHARUMAN', 'Keharuman ruangan', 3],
    ['PANTRY', 'KESIAPAN_FASILITAS', 'Kesiapan fasilitas', 4],
    ['CLASS', 'KEBERSIHAN', 'Kebersihan ruang TUK', 1],
    ['CLASS', 'KERAPIAN', 'Kerapian ruangan', 2],
    ['CLASS', 'KENYAMANAN', 'Kenyamanan ruangan', 3],
    ['CLASS', 'KESIAPAN_ALAT', 'Kesiapan alat', 4]
  ];
}

function seedMonitoringConfiguration_(options) {
  options = options || {};
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

  // ROOMS yang sudah ada adalah sumber kebenaran untuk QR cetak. Saat repair
  // referensi, jangan menambah ruangan atau membuat token baru. Seed ruangan
  // hanya diizinkan untuk instalasi baru yang tabel ROOMS-nya masih kosong.
  var rooms = rowsAsObjects_('ROOMS');
  if (!options.preserveExistingRooms && !rooms.length) {
    monitoringRooms_().forEach(function(room, index) {
      appendObject_('ROOMS', {
        RoomId: id_('ROOM'), Code: room[0], Name: room[1], RoomTypeId: room[2],
        QrToken: secureToken_(), Active: true, SortOrder: index + 1, CreatedAt: now, UpdatedAt: now
      });
    });
  }

  var activities = rowsAsObjects_('ACTIVITIES');
  activities.filter(function(row) { return !row.RoomTypeId; }).forEach(function(row) {
    updateObjectRow_('ACTIVITIES', row._row, { Active: false, UpdatedAt: now });
  });
  monitoringItems_().forEach(function(item, index) {
    var standard = monitoringStandardFor_(item.type, item.name);
    var existing = activities.find(function(row) {
      return row.RoomTypeId === item.type && String(row.Name).toUpperCase() === item.name;
    });
    if (existing) {
      // setupApplication juga berfungsi sebagai migrasi konfigurasi workbook.
      // Identitas/nama/urutan yang dikelola admin tetap dipertahankan.
      updateObjectRow_('ACTIVITIES', existing._row, {
        StandardCategory: standard.category,
        StandardText: standard.text,
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
        StandardCategory: standard.category, StandardText: standard.text,
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

  var aspects = rowsAsObjects_('EVALUATION_ASPECTS');
  monitoringEvaluationAspectSeeds_().forEach(function(aspect) {
    if (!aspects.some(function(row) {
      return String(row.RoomTypeId) === aspect[0] && String(row.Code) === aspect[1];
    })) {
      appendObject_('EVALUATION_ASPECTS', {
        AspectId: id_('ASPECT'), RoomTypeId: aspect[0], Code: aspect[1], Label: aspect[2],
        Active: true, SortOrder: aspect[3], CreatedAt: now, UpdatedAt: now
      });
    }
  });
}

/**
 * Memulihkan data referensi checklist tanpa menyentuh ROOMS/QrToken maupun
 * akun pengguna. Aman dijalankan berulang kali karena seed bersifat idempoten.
 */
function repairSpreadsheetReferenceData() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    assert_(isApplicationReady_(), 'NOT_CONFIGURED', 'SPREADSHEET_ID belum tersedia.');
    var before = buildRoomQrIntegrityAudit_();
    assert_(before.ok, 'QR_RECONCILIATION_FAILED', 'Audit QR sebelum repair tidak lolos.');

    seedMonitoringConfiguration_({ preserveExistingRooms: true });
    ['ROOM_TYPES', 'ACTIVITIES', 'SLOTS', 'EVALUATION_ASPECTS'].forEach(invalidatePrimaryRows_);

    var after = buildRoomQrIntegrityAudit_();
    assert_(after.ok && !after.qrTokensChanged,
      'QR_TOKEN_CHANGED', 'Repair dibatalkan karena audit token QR tidak lolos.');

    var result = {
      ok: true,
      databaseMode: applicationDatabaseMode_(),
      roomCount: after.roomCount,
      qrTokensChanged: after.qrTokensChanged,
      activityCount: rowsAsObjects_('ACTIVITIES').filter(function(row) { return truthy_(row.Active); }).length,
      evaluationAspectCount: rowsAsObjects_('EVALUATION_ASPECTS').filter(function(row) { return truthy_(row.Active); }).length
    };
    logAudit_('SYSTEM', 'REPAIR_SPREADSHEET_REFERENCE_DATA', 'SYSTEM', 'DATABASE', result);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
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
