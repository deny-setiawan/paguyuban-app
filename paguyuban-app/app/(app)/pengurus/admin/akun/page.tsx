import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import AdminAkunClient from './AdminAkunClient'
import Link from 'next/link'

export default async function AdminAkunPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') redirect('/pengurus')

  const list = await db.select({
    id: profiles.id,
    phone: profiles.phone,
    fullName: profiles.fullName,
    role: profiles.role,
    isActive: profiles.isActive,
    noRumah: profiles.noRumah,
    createdAt: profiles.createdAt,
  }).from(profiles).where(eq(profiles.rtGroupId, payload.rtGroupId!))

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><span className="em">👤</span> Kelola Akun ({list.length})</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <AdminAkunClient items={list.map(p => ({
        id: p.id,
        phone: p.phone,
        fullName: p.fullName,
        role: p.role,
        isActive: p.isActive,
        noRumah: p.noRumah,
        createdAt: p.createdAt.toISOString(),
      }))} currentUserId={payload.sub} />
    </>
  )
}
