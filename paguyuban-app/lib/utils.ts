export function rupiah(n: number | string | null | undefined): string {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID')
}

export function timeAgo(ts: string | null | undefined): string {
  if (!ts) return ''
  const d = (Date.now() - new Date(ts).getTime()) / 1000
  if (d < 60) return 'baru saja'
  if (d < 3600) return Math.floor(d / 60) + ' menit lalu'
  if (d < 86400) return Math.floor(d / 3600) + ' jam lalu'
  if (d < 604800) return Math.floor(d / 86400) + ' hari lalu'
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '62' + p.slice(1)
  if (!p.startsWith('62')) p = '62' + p
  return p
}

export function initials(name: string): string {
  return (name || 'W').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
}

export function greet(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi,'
  if (h < 15) return 'Selamat siang,'
  if (h < 18) return 'Selamat sore,'
  return 'Selamat malam,'
}

export const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
