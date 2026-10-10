export type MenuKey =
  'wargaBaru' | 'prosesSurat' | 'kasRt' | 'verifBayar' | 'tagihan' |
  'laporan' | 'dataWarga' | 'pengumuman' | 'inventaris' | 'danaSosial'

export type MenuConfig = Partial<Record<MenuKey, string[]>>

export const CONFIGURABLE_ROLES = [
  'ketua', 'wakil_ketua', 'sekretaris', 'bendahara',
  'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator',
] as const

export const ROLE_LABEL: Record<string, string> = {
  ketua: 'Ketua', wakil_ketua: 'Wakil Ketua', sekretaris: 'Sekretaris',
  bendahara: 'Bendahara', humas: 'Humas', lingkungan: 'Lingkungan',
  keamanan: 'Keamanan', peralatan: 'Peralatan', kordinator: 'Kordinator',
}

export const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: 'wargaBaru',   label: 'Warga Baru' },
  { key: 'prosesSurat', label: 'Proses Surat' },
  { key: 'kasRt',       label: 'Kas RT' },
  { key: 'verifBayar',  label: 'Verif. Bayar' },
  { key: 'tagihan',     label: 'Tagihan Iuran' },
  { key: 'laporan',     label: 'Laporan Warga' },
  { key: 'dataWarga',   label: 'Data Warga' },
  { key: 'pengumuman',  label: 'Pengumuman' },
  { key: 'inventaris',  label: 'Inventaris' },
  { key: 'danaSosial',  label: 'Dana Sosial' },
]

export const DEFAULT_MENU_CONFIG: Record<MenuKey, string[]> = {
  wargaBaru:   ['ketua', 'wakil_ketua', 'sekretaris', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator'],
  prosesSurat: ['ketua', 'wakil_ketua', 'sekretaris', 'kordinator'],
  kasRt:       ['ketua', 'wakil_ketua', 'bendahara'],
  verifBayar:  ['ketua', 'wakil_ketua', 'bendahara'],
  tagihan:     ['ketua', 'wakil_ketua', 'bendahara'],
  laporan:     ['ketua', 'wakil_ketua', 'sekretaris', 'kordinator'],
  dataWarga:   ['ketua', 'wakil_ketua', 'sekretaris', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator'],
  pengumuman:  ['ketua', 'wakil_ketua', 'sekretaris', 'kordinator'],
  inventaris:  ['ketua', 'wakil_ketua', 'kordinator'],
  danaSosial:  ['ketua', 'wakil_ketua', 'bendahara'],
}

export function canAccess(menuKey: MenuKey, role: string, menuConfig: MenuConfig | null | undefined): boolean {
  if (role === 'admin') return true
  const allowed = menuConfig?.[menuKey] ?? DEFAULT_MENU_CONFIG[menuKey]
  return allowed.includes(role)
}
