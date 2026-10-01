import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'

export default async function PengurusPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/login')
  return (
    <div>
      <div className="sec-h" style={{marginBottom:16}}>
        <div className="t"><span className="em">🛡️</span> Dashboard Pengurus</div>
      </div>
      <div className="ib green"><span>👋</span><div>Selamat datang, <strong>{payload.role}</strong>! Dashboard fitur pengurus sedang dikembangkan.</div></div>
    </div>
  )
}
