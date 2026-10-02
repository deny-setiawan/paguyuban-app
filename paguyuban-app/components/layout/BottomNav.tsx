'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, CreditCard, Megaphone, Bell, User } from 'lucide-react'

interface Tab {
  path: string | null
  icon: React.ReactNode
  fabIcon?: React.ReactNode
  label: string
  fab?: boolean
}

const tabs: Tab[] = [
  { path: '/', icon: <Home size={21} />, label: 'Beranda' },
  { path: '/iuran', icon: <CreditCard size={21} />, label: 'Iuran' },
  { path: null, icon: null, fabIcon: <Megaphone size={23} />, label: 'Lapor', fab: true },
  { path: '/pengumuman', icon: <Bell size={21} />, label: 'Info' },
  { path: '/profil', icon: <User size={21} />, label: 'Profil' },
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
              <div className="fab">{tab.fabIcon}</div>
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
