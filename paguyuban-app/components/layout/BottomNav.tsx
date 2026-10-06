'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, CreditCard, Megaphone, Bell, User, Phone, ClipboardList, X, ShieldAlert } from 'lucide-react'

interface Tab {
  path: string | null
  icon: React.ReactNode
  fabIcon?: React.ReactNode
  label: string
  fab?: boolean
}

const tabs: Tab[] = [
  { path: '/beranda', icon: <Home size={21} />, label: 'Beranda' },
  { path: '/iuran', icon: <CreditCard size={21} />, label: 'Iuran' },
  { path: null, icon: null, fabIcon: <Megaphone size={23} />, label: 'Lapor', fab: true },
  { path: '/pengumuman', icon: <Bell size={21} />, label: 'Info' },
  { path: '/profil', icon: <User size={21} />, label: 'Profil' },
]

interface BottomNavProps {
  onLapor?: () => void
}

export default function BottomNav({ onLapor: _onLapor }: BottomNavProps) {
  const [showModal, setShowModal] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  return (
    <>
      <div className="botnav">
        {tabs.map((tab) => {
          if (tab.fab) {
            return (
              <div key="fab" className="bn bn-fab" onClick={() => setShowModal(true)}>
                <div className="fab">{tab.fabIcon}</div>
                <div className="fab-l">{tab.label}</div>
              </div>
            )
          }
          const isOn = pathname.startsWith(tab.path!)
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

      {/* Lapor & Darurat Modal */}
      {showModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000 }}
            onClick={() => setShowModal(false)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430, background: 'white',
            borderRadius: '20px 20px 0 0', padding: '20px 16px 36px', zIndex: 9001,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--gray900)' }}>Lapor & Darurat</div>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="var(--gray500)" />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray500)', marginBottom: 18 }}>
              Hubungi layanan darurat atau buat laporan warga
            </div>

            {/* Opsi 1: Darurat */}
            <div style={{
              border: '1.5px solid #fca5a5', borderRadius: 14, padding: '14px 16px',
              marginBottom: 12, background: '#fff5f5',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldAlert size={18} color="#dc2626" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#7f1d1d' }}>Panggilan Darurat</div>
                  <div style={{ fontSize: 12, color: '#991b1b' }}>Hubungi layanan cepat bebas pulsa 24 jam</div>
                </div>
              </div>
              <a href="tel:110"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '11px 0', borderRadius: 10,
                  background: '#dc2626', color: 'white', textDecoration: 'none',
                  fontWeight: 800, fontSize: 15,
                }}>
                <Phone size={16} /> Polisi: 110 (Bebas Pulsa)
              </a>
            </div>

            {/* Opsi 2: Laporan Warga */}
            <button
              onClick={() => { setShowModal(false); router.push('/laporan') }}
              style={{
                width: '100%', border: '1.5px solid var(--g600)', borderRadius: 14,
                padding: '14px 16px', background: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                fontFamily: 'var(--f)',
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardList size={18} color="var(--g600)" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gray900)' }}>Layanan Laporan Warga</div>
                <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>Laporkan masalah, saran, atau aduan ke pengurus RT</div>
              </div>
            </button>
          </div>
        </>
      )}
    </>
  )
}
