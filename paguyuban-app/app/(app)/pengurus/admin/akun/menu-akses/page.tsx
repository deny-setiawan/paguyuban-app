import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import MenuAksesClient from './MenuAksesClient'
import type { MenuConfig } from '@/lib/menu-config'

export default async function MenuAksesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') redirect('/pengurus')

  // Auto-migrate: tambah kolom jika belum ada
  try {
    await db.execute(sql`ALTER TABLE rt_groups ADD COLUMN IF NOT EXISTS menu_config jsonb`)
  } catch { /* already exists */ }

  const [rt] = await db.select({ menuConfig: rtGroups.menuConfig })
    .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId!)).limit(1)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><ShieldCheck size={16} /> Akses Menu per Role</div>
        <Link href="/pengurus/admin/akun" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <MenuAksesClient initialConfig={(rt?.menuConfig as MenuConfig) ?? null} />
    </>
  )
}
