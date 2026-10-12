import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, wargaInvites } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { appendFotoUrls } = await req.json()

  if (!Array.isArray(appendFotoUrls) || appendFotoUrls.length === 0) {
    return NextResponse.json({ error: 'appendFotoUrls wajib diisi' }, { status: 400 })
  }

  const [wargaRow] = await db.select().from(warga)
    .where(and(eq(warga.id, id), eq(warga.rtGroupId, payload.rtGroupId!)))
    .limit(1)

  if (!wargaRow) return NextResponse.json({ error: 'Data warga tidak ditemukan' }, { status: 404 })

  if (!wargaRow.profileId) {
    return NextResponse.json({ error: 'Warga ini belum memiliki akun terdaftar' }, { status: 404 })
  }

  const [latestInvite] = await db.select()
    .from(wargaInvites)
    .where(eq(wargaInvites.profileId, wargaRow.profileId))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(1)

  if (!latestInvite) {
    return NextResponse.json({ error: 'Data pendaftaran warga tidak ditemukan' }, { status: 404 })
  }

  const existing = Array.isArray(latestInvite.fotoFiles) ? (latestInvite.fotoFiles as string[]) : []
  const updated = [...existing, ...appendFotoUrls]

  await db.update(wargaInvites)
    .set({ fotoFiles: updated })
    .where(eq(wargaInvites.id, latestInvite.id))

  return NextResponse.json({ ok: true, fotoFiles: updated })
}
