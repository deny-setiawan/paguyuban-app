'use client'

import { useRouter } from 'next/navigation'
import { Bell, MapPin, Home } from 'lucide-react'
import { initials, greet } from '@/lib/utils'

interface TopBarProps {
  name: string
  rtName: string
  noRumah?: string | null
  logoUrl?: string | null
  hasUnread?: boolean
}

export default function TopBar({ name, rtName, noRumah, logoUrl, hasUnread }: TopBarProps) {
  const router = useRouter()

  return (
    <div className="topbar">
      <div className="tb-top">
        <div className="tb-av">{initials(name)}</div>
        <div className="tb-hi">
          <div className="g">{greet()}</div>
          <div className="n">{name}</div>
        </div>
        <div className="tb-bell" onClick={() => router.push('/notifikasi')}>
          <Bell size={18} />
          <span className={`dot${hasUnread ? ' on' : ''}`} />
        </div>
      </div>
      <div className="tb-rt">
        {logoUrl && (
          <img className="rt-logo tb-logo" src={logoUrl} alt="Logo RT" />
        )}
        <span className="tb-chip"><MapPin size={12} /> {rtName}</span>
        {noRumah && <span className="tb-chip"><Home size={12} /> No. {noRumah}</span>}
      </div>
    </div>
  )
}
