import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Shell from '@/components/layout/Shell'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  let rt = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData
  }

  return (
    <Shell>
      <TopBar
        name={profile.fullName || profile.phone}
        rtName={rt?.namaRt || 'Paguyuban PKR-Pepe'}
        noRumah={profile.noRumah}
        logoUrl={rt?.logoUrl}
      />
      <div className="body">
        {children}
      </div>
      <BottomNav />
    </Shell>
  )
}
