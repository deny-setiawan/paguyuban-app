import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import TokenRefresher from '@/components/auth/TokenRefresher'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator', 'admin']

export default async function PengurusLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/login')

  // Cek DB role (bukan JWT) agar perubahan role oleh admin langsung berlaku
  // tanpa harus logout — mencegah redirect loop saat JWT role dan DB role tidak sinkron
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, payload.sub))
    .limit(1)

  // Redirect ke /beranda (bukan /) agar tidak terjadi loop /pengurus ↔ /
  if (!profile || !PENGURUS_ROLES.includes(profile.role)) redirect('/beranda')

  // Jika JWT role berbeda dengan DB role, refresh token di background
  // agar API calls selanjutnya menggunakan role yang benar
  const jwtStale = profile.role !== payload.role

  return (
    <>
      {jwtStale && <TokenRefresher />}
      {children}
    </>
  )
}
