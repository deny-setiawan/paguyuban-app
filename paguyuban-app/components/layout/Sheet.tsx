'use client'

import { useEffect, useRef } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function Sheet({ open, onClose, children, title, subtitle }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div className={`sheet-mask${open ? ' show' : ''}`} onClick={onClose} />
      <div ref={sheetRef} className={`sheet${open ? ' show' : ''}`}>
        <div className="sheet-grip" />
        {title && <div className="sheet-h">{title}</div>}
        {subtitle && <div className="sheet-d">{subtitle}</div>}
        {children}
      </div>
    </>
  )
}
