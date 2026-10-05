'use client'

import { useState } from 'react'
import { Save, RotateCcw, CheckCircle } from 'lucide-react'
import {
  MENU_ITEMS, CONFIGURABLE_ROLES, ROLE_LABEL,
  DEFAULT_MENU_CONFIG, type MenuConfig, type MenuKey,
} from '@/lib/menu-config'

export default function MenuAksesClient({ initialConfig }: { initialConfig: MenuConfig | null }) {
  const [config, setConfig] = useState<Record<MenuKey, string[]>>(() => {
    const base = { ...DEFAULT_MENU_CONFIG }
    if (initialConfig) {
      for (const key of Object.keys(initialConfig) as MenuKey[]) {
        if (initialConfig[key]) base[key] = initialConfig[key]!
      }
    }
    return base
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(menuKey: MenuKey, role: string) {
    setConfig(prev => {
      const current = prev[menuKey] ?? []
      return {
        ...prev,
        [menuKey]: current.includes(role)
          ? current.filter(r => r !== role)
          : [...current, role],
      }
    })
    setSaved(false)
  }

  function resetToDefault() {
    setConfig({ ...DEFAULT_MENU_CONFIG })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/rt-group/menu-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuConfig: config }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="ib blue" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, lineHeight: 1.55 }}>
          Centang menu yang boleh diakses oleh masing-masing role.
          Role <b>Admin</b> selalu mendapat semua akses dan tidak dapat dikonfigurasi.
        </div>
      </div>

      {/* Tabel matrix */}
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 800, color: 'var(--gray600)', borderBottom: '2px solid var(--gray200)', whiteSpace: 'nowrap', minWidth: 110 }}>
                Menu
              </th>
              {CONFIGURABLE_ROLES.map(role => (
                <th key={role} style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: 'var(--gray600)', borderBottom: '2px solid var(--gray200)', whiteSpace: 'nowrap', minWidth: 60 }}>
                  {ROLE_LABEL[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MENU_ITEMS.map((item, i) => (
              <tr key={item.key} style={{ background: i % 2 === 0 ? 'white' : 'var(--gray50)' }}>
                <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--gray800)', borderBottom: '1px solid var(--gray100)' }}>
                  {item.label}
                </td>
                {CONFIGURABLE_ROLES.map(role => {
                  const checked = (config[item.key] ?? []).includes(role)
                  return (
                    <td key={role} style={{ textAlign: 'center', padding: '10px 6px', borderBottom: '1px solid var(--gray100)' }}>
                      <button
                        type="button"
                        onClick={() => toggle(item.key, role)}
                        style={{
                          width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: checked ? 'var(--g600)' : 'var(--gray200)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background .15s',
                        }}
                        title={checked ? 'Klik untuk cabut akses' : 'Klik untuk beri akses'}
                      >
                        {checked && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5 9.5L11 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-ghost" style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onClick={resetToDefault} disabled={saving}>
          <RotateCcw size={14} /> Reset Default
        </button>
        <button className="btn-p" style={{ flex: 2, height: 44 }}
          onClick={save} disabled={saving}>
          {saving ? 'Menyimpan…' : saved ? <><CheckCircle size={14} /> Tersimpan</> : <><Save size={14} /> Simpan</>}
        </button>
      </div>
    </>
  )
}
