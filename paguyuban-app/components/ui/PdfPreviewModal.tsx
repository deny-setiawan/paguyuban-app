'use client'

import { X, Download } from 'lucide-react'

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
        style={{ background: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gray800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 120px)' }}>
          {filename}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => { onDownload(); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--g600)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Download size={14} /> Unduh
          </button>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray100)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div
        style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={previewUrl}
          title="Preview PDF"
          style={{ width: '100%', height: '100%', border: 'none', background: '#525659' }}
        />
      </div>
    </div>
  )
}
