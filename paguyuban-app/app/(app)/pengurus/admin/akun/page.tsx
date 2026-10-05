import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { User, ShieldCheck } from 'lucide-react'
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
        <div className="t"><User size={16} /> Kelola Akun ({list.length})</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <Link href="/pengurus/admin/akun/menu-akses" style={{ textDecoration: 'none' }}>
        <div className="peng-item" style={{ marginBottom: 16, cursor: 'pointer' }}>
          <div className="pi-ico" style={{ background: 'var(--g50)' }}><ShieldCheck size={18} color="var(--g600)" /></div>
          <div className="pi-body">
            <div className="pi-t">Akses Menu per Role</div>
            <div className="pi-d">Atur menu apa saja yang bisa diakses tiap role pengurus</div>
          </div>
          <div style={{ color: 'var(--gray400)', fontSize: 18 }}>›</div>
        </div>
      </Link>
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
