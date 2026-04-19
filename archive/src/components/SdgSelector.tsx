import { useState, useEffect } from 'react'
import { COLORS, FONTS, RADII } from '../styles/theme'
import { getSdgs } from '../api/api'

interface SdgSelectorProps {
  value:    string
  onChange: (sdg: string) => void
}

export default function SdgSelector({ value, onChange }: SdgSelectorProps) {
  const [sdgs, setSdgs] = useState<string[]>([])

  useEffect(() => {
    getSdgs().then(res => setSdgs(res.data.sdgs)).catch(() => {})
  }, [])

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width:        '100%',
        background:   COLORS.BG_INPUT,
        border:       `1px solid ${COLORS.BORDER}`,
        borderRadius: RADII.MD,
        padding:      '11px 14px',
        color:        value ? COLORS.TEXT_PRIMARY : COLORS.TEXT_MUTED,
        fontSize:     FONTS.MD,
        fontFamily:   'Inter, sans-serif',
        outline:      'none',
        cursor:       'pointer',
        appearance:   'none',
      }}
    >
      <option value="">Select an SDG...</option>
      {sdgs.map(sdg => (
        <option key={sdg} value={sdg}>{sdg}</option>
      ))}
    </select>
  )
}
