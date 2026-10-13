import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator', 'admin']

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const [target] = await db.select().from(warga)
    .where(and(eq(warga.id, id), eq(warga.rtGroupId, payload.rtGroupId!)))
    .limit(1)

  if (!target) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  if (target.kkStatus === 'kepala_kk') {
    return NextResponse.json({ error: 'Kepala KK tidak bisa dihapus dari sini. Gunakan fitur Hapus KK.' }, { status: 400 })
  }

  await db.delete(warga).where(eq(warga.id, id))
  return NextResponse.json({ ok: true })
}
