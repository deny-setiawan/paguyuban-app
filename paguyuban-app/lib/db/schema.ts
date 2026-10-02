import { pgTable, text, integer, boolean, timestamp, uuid, pgEnum, varchar, jsonb } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['tamu', 'warga', 'ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin'])
export const statusVerifEnum = pgEnum('status_verif', ['pending', 'disetujui', 'ditolak'])
export const statusInvoiceEnum = pgEnum('status_invoice', ['belum_bayar', 'lunas', 'dibebaskan'])
export const statusSuratEnum = pgEnum('status_surat', ['diajukan', 'diproses', 'selesai', 'ditolak'])
export const statusLaporanEnum = pgEnum('status_laporan', ['menunggu', 'diproses', 'selesai', 'ditolak'])
export const jenisTransaksiEnum = pgEnum('jenis_transaksi', ['pemasukan', 'pengeluaran'])
export const jenisKendaraanEnum = pgEnum('jenis_kendaraan', ['motor', 'mobil', 'truk', 'lainnya'])
export const statusSewaEnum = pgEnum('status_sewa', ['disewa', 'dikembalikan'])

export const otpSessions = pgTable('otp_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull(),
  otpCode: varchar('otp_code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  fullName: text('full_name'),
  role: roleEnum('role').default('warga').notNull(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id),
  isActive: boolean('is_active').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  noRumah: varchar('no_rumah', { length: 20 }),
  email: text('email'),
  statusSosial: varchar('status_sosial', { length: 30 }),
  fotoUrl: text('foto_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const rtGroups = pgTable('rt_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  namaRt: text('nama_rt').notNull(),
  rtNumber: varchar('rt_number', { length: 10 }),
  rwNumber: varchar('rw_number', { length: 10 }),
  kelurahan: text('kelurahan'),
  kecamatan: text('kecamatan'),
  kota: text('kota'),
  provinsi: text('provinsi'),
  kodePos: varchar('kode_pos', { length: 10 }),
  namaJalan: text('nama_jalan'),
  jumlahKk: integer('jumlah_kk').default(0),
  verificationStatus: varchar('verification_status', { length: 20 }).default('pending'),
  noRekening: varchar('no_rekening', { length: 30 }),
  bankNama: varchar('bank_nama', { length: 50 }),
  bankAtasNama: text('bank_atas_nama'),
  ketuaNama: text('ketua_nama'),
  ketuaId: uuid('ketua_id'),
  logoUrl: text('logo_url'),
  temaWarna: varchar('tema_warna', { length: 10 }).default('#1d4ed8'),
  level: varchar('level', { length: 10 }).default('rt'),
  pemutakhiranActive: boolean('pemutakhiran_active').default(false),
  pemutakhiranTahun: integer('pemutakhiran_tahun'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const warga = pgTable('warga', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').references(() => profiles.id),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  namaLengkap: text('nama_lengkap').notNull(),
  nik: varchar('nik', { length: 16 }),
  noKk: varchar('no_kk', { length: 16 }),
  noRumah: varchar('no_rumah', { length: 20 }),
  rtNumber: varchar('rt_number', { length: 10 }),
  rwNumber: varchar('rw_number', { length: 10 }),
  kelurahan: text('kelurahan'),
  kecamatan: text('kecamatan'),
  kota: text('kota'),
  alamatLengkap: text('alamat_lengkap'),
  kkStatus: varchar('kk_status', { length: 20 }).default('anggota'),
  hubunganKeluarga: text('hubungan_keluarga'),
  statusPerkawinan: varchar('status_perkawinan', { length: 30 }),
  statusHunian: varchar('status_hunian', { length: 30 }),
  tanggalMenempati: text('tanggal_menempati'),
  tanggalLahir: text('tanggal_lahir'),
  jenisKelamin: varchar('jenis_kelamin', { length: 1 }),
  agama: varchar('agama', { length: 20 }),
  pekerjaan: text('pekerjaan'),
  statusSosial: varchar('status_sosial', { length: 30 }),
  jumlahJiwa: integer('jumlah_jiwa').default(1),
  status: varchar('status', { length: 20 }).default('aktif'),
  dansosKelahiranTerpakai: integer('dansos_kelahiran_terpakai').default(0),
  dansosSakitTerpakai: integer('dansos_sakit_terpakai').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const wargaInvites = pgTable('warga_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  nama: text('nama').notNull(),
  noRumah: varchar('no_rumah', { length: 20 }),
  status: varchar('status', { length: 20 }).default('pending'),
  jenis: varchar('jenis', { length: 20 }).default('warga_baru'),
  profileId: uuid('profile_id'),
  fotoFiles: jsonb('foto_files'),
  dataKk: jsonb('data_kk'),
  anggota: jsonb('anggota'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const iuranSettings = pgTable('iuran_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  nominalBulanan: integer('nominal_bulanan').notNull(),
  alokasiSosial: integer('alokasi_sosial').default(0),
  isActive: boolean('is_active').default(true),
  effectiveFrom: text('effective_from'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const iuranInvoices = pgTable('iuran_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  wargaId: uuid('warga_id').references(() => profiles.id).notNull(),
  periode: varchar('periode', { length: 7 }).notNull(),
  periodeBulan: integer('periode_bulan').notNull(),
  periodeTahun: integer('periode_tahun').notNull(),
  nominal: integer('nominal').notNull(),
  status: statusInvoiceEnum('status').default('belum_bayar').notNull(),
  jatuhTempo: text('jatuh_tempo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const iuranPayments = pgTable('iuran_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  wargaId: uuid('warga_id').references(() => profiles.id).notNull(),
  invoiceId: uuid('invoice_id').references(() => iuranInvoices.id).notNull(),
  nominalBayar: integer('nominal_bayar').notNull(),
  metode: varchar('metode', { length: 20 }).default('transfer'),
  statusVerif: statusVerifEnum('status_verif').default('pending').notNull(),
  verifiedBy: uuid('verified_by'),
  buktiUrl: text('bukti_url'),
  paidAt: timestamp('paid_at'),
  verifiedAt: timestamp('verified_at'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const surat = pgTable('surat', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  pemohonId: uuid('pemohon_id').references(() => profiles.id).notNull(),
  jenis: text('jenis').notNull(),
  namaPemohon: text('nama_pemohon'),
  nikPemohon: varchar('nik_pemohon', { length: 16 }),
  noRumah: varchar('no_rumah', { length: 20 }),
  keperluan: text('keperluan'),
  dataTambahan: jsonb('data_tambahan'),
  status: statusSuratEnum('status').default('diajukan').notNull(),
  nomorSurat: text('nomor_surat'),
  dibuatOleh: uuid('dibuat_oleh'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const laporanWarga = pgTable('laporan_warga', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  pelaporId: uuid('pelapor_id').references(() => profiles.id).notNull(),
  kategori: text('kategori').notNull(),
  judul: text('judul').notNull(),
  isi: text('isi'),
  fotoUrl: text('foto_url'),
  status: statusLaporanEnum('status').default('menunggu').notNull(),
  tanggapan: text('tanggapan'),
  tanggapiOleh: uuid('tanggapi_oleh'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const pengumuman = pgTable('pengumuman', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  judul: text('judul').notNull(),
  isi: text('isi'),
  kategori: varchar('kategori', { length: 30 }),
  prioritas: varchar('prioritas', { length: 20 }).default('normal'),
  isPublished: boolean('is_published').default(true),
  dibuatOleh: uuid('dibuat_oleh').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const kendaraan = pgTable('kendaraan', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  profileId: uuid('profile_id').references(() => profiles.id).notNull(),
  jenis: jenisKendaraanEnum('jenis').default('motor').notNull(),
  platNomor: varchar('plat_nomor', { length: 20 }).notNull(),
  merk: text('merk'),
  warna: text('warna'),
  tahun: varchar('tahun', { length: 4 }),
  namaPemilik: text('nama_pemilik'),
  noRangka: text('no_rangka'),
  noMesin: text('no_mesin'),
  noStnk: text('no_stnk'),
  pajakBerlakuSampai: text('pajak_berlaku_sampai'),
  stnkPhotoUrl: text('stnk_photo_url'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const transaksi = pgTable('transaksi', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  jenis: jenisTransaksiEnum('jenis').notNull(),
  kategori: varchar('kategori', { length: 30 }),
  judul: text('judul').notNull(),
  keterangan: text('keterangan'),
  nominal: integer('nominal').notNull(),
  saldoSetelah: integer('saldo_setelah'),
  status: varchar('status', { length: 20 }).default('disetujui'),
  tanggal: text('tanggal').notNull(),
  buktiUrl: text('bukti_url'),
  dibuatOleh: uuid('dibuat_oleh').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const inventaris = pgTable('inventaris', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtGroupId: uuid('rt_group_id').references(() => rtGroups.id).notNull(),
  nama: text('nama').notNull(),
  hargaSewa: integer('harga_sewa').default(0),
  stokTotal: integer('stok_total').default(1),
  stok: integer('stok').default(1),
  fotoUrl: text('foto_url'),
  deskripsi: text('deskripsi'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const inventarisSewa = pgTable('inventaris_sewa', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventarisId: uuid('inventaris_id').references(() => inventaris.id).notNull(),
  inventarisNama: text('inventaris_nama'),
  penyewaId: uuid('penyewa_id'),
  penyewaNama: text('penyewa_nama').notNull(),
  penyewaHp: varchar('penyewa_hp', { length: 20 }),
  penyewaTipe: text('penyewa_tipe').default('Warga'),
  jumlah: integer('jumlah').default(1),
  tglSewa: text('tgl_sewa').notNull(),
  tglKembaliRencana: text('tgl_kembali_rencana'),
  tglKembali: text('tgl_kembali'),
  hargaSatuan: integer('harga_satuan'),
  total: integer('total'),
  status: statusSewaEnum('status').default('disewa').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notifikasi = pgTable('notifikasi', {
  id: uuid('id').primaryKey().defaultRandom(),
  rtId: uuid('rt_id').references(() => rtGroups.id),
  userId: uuid('user_id').references(() => profiles.id).notNull(),
  judul: text('judul').notNull(),
  isi: text('isi'),
  kategori: varchar('kategori', { length: 30 }),
  prioritas: varchar('prioritas', { length: 20 }).default('normal'),
  isRead: boolean('is_read').default(false),
  dibuatOleh: uuid('dibuat_oleh'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh'),
  auth: text('auth'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Profile = typeof profiles.$inferSelect
export type RtGroup = typeof rtGroups.$inferSelect
export type Warga = typeof warga.$inferSelect
export type IuranInvoice = typeof iuranInvoices.$inferSelect
export type IuranPayment = typeof iuranPayments.$inferSelect
export type Surat = typeof surat.$inferSelect
export type LaporanWarga = typeof laporanWarga.$inferSelect
export type Pengumuman = typeof pengumuman.$inferSelect
export type Kendaraan = typeof kendaraan.$inferSelect
export type Transaksi = typeof transaksi.$inferSelect
export type Inventaris = typeof inventaris.$inferSelect
export type InventarisSewa = typeof inventarisSewa.$inferSelect
export type Notifikasi = typeof notifikasi.$inferSelect
