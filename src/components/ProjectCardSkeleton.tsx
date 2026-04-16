import { COLORS, RADII } from '../styles/theme'

export default function ProjectCardSkeleton() {
  const bar = (width: string, height: string, mb?: string) => (
    <div style={{
      width,
      height,
      background:   COLORS.BORDER,
      borderRadius: RADII.MD,
      marginBottom: mb || '0',
      animation:    'pulse 1.5s ease-in-out infinite',
    }} />
  )

  return (
    <div style={{
      background:    COLORS.BG_CARD,
      border:        `1px solid ${COLORS.BORDER}`,
      borderRadius:  RADII.XL,
      padding:       '22px',
      display:       'flex',
      flexDirection: 'column',
      gap:           '12px',
    }}>
      {/* Tags */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {bar('80px', '22px')}
        {bar('70px', '22px')}
      </div>
      {/* Title */}
      {bar('70%', '20px')}
      {/* Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {bar('100%', '14px')}
        {bar('100%', '14px')}
        {bar('60%',  '14px')}
      </div>
      {/* Skills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {bar('60px', '20px')}
        {bar('70px', '20px')}
        {bar('50px', '20px')}
      </div>
      {/* Button */}
      {bar('100%', '40px')}
    </div>
  )
}
