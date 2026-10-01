'use client'

import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { path: '/', icon: '🏠', label: 'Beranda' },
  { path: '/iuran', icon: '💳', label: 'Iuran' },
  { path: null, icon: '📢', label: 'Lapor', fab: true },
  { path: '/pengumuman', icon: '📣', label: 'Info' },
  { path: '/profil', icon: '👤', label: 'Profil' },
]

interface BottomNavProps {
  onLapor?: () => void
}

export default function BottomNav({ onLapor }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="botnav">
      {tabs.map((tab) => {
        if (tab.fab) {
          return (
            <div key="fab" className="bn bn-fab" onClick={onLapor}>
              <div className="fab">{tab.icon}</div>
              <div className="fab-l">{tab.label}</div>
            </div>
          )
        }
        const isOn = tab.path === '/' ? pathname === '/' : pathname.startsWith(tab.path!)
        return (
          <div
            key={tab.path}
            className={`bn${isOn ? ' on' : ''}`}
            onClick={() => tab.path && router.push(tab.path)}
          >
            <div className="bn-i">{tab.icon}</div>
            <div className="bn-l">{tab.label}</div>
          </div>
        )
      })}
    </div>
  )
}
