'use client'

import { X, Download, ExternalLink } from 'lucide-react'

interface Props {
  previewUrl: string
  filename: string
  onDownload: () => void
  onClose: () => void
}

export default function PdfPreviewModal({ previewUrl, filename, onDownload, onClose }: Props) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9900, display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{ background: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,.1)', gap: 8 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--gray800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {filename}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => window.open(previewUrl, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <ExternalLink size={13} /> Buka
          </button>
          <button
            onClick={() => { onDownload(); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--g600)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Download size={13} /> Unduh
          </button>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray100)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={previewUrl}
          title="Preview PDF"
          style={{ width: '100%', height: '100%', border: 'none', background: '#525659' }}
        />
        {/* Fallback message visible on mobile where iframe PDF doesn't render */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.7)', color: 'white', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Jika PDF tidak tampil, klik <b>Buka</b> di atas
        </div>
      </div>
    </div>
  )
}
