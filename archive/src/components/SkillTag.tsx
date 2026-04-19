import { FONTS, RADII } from '../styles/theme'

interface SkillTagProps {
  skill:    string
  color?:   'blue' | 'green'
  onRemove?: () => void
}

export default function SkillTag({ skill, color = 'blue', onRemove }: SkillTagProps) {
  const isBlue = color === 'blue'

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '5px',
      background:   isBlue ? 'rgba(10,110,189,0.1)'  : 'rgba(0,166,81,0.1)',
      border:       isBlue ? '1px solid rgba(10,110,189,0.25)' : '1px solid rgba(0,166,81,0.25)',
      color:        isBlue ? '#60B4F0' : '#4ADE80',
      padding:      '4px 10px',
      borderRadius: RADII.FULL,
      fontSize:     FONTS.XS,
      fontWeight:   600,
      whiteSpace:   'nowrap',
    }}>
      {skill}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            color:       'inherit',
            padding:     '0',
            fontSize:    '12px',
            lineHeight:  1,
            opacity:     0.7,
            display:     'flex',
            alignItems:  'center',
          }}
        >
          ×
        </button>
      )}
    </span>
  )
}
