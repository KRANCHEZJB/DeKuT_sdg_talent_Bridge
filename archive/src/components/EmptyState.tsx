import { COLORS, FONTS, RADII } from '../styles/theme'

interface EmptyStateProps {
  icon:        string
  title:       string
  description?: string
  actionLabel?: string
  onAction?:   () => void
}

export default function EmptyState({
  icon, title, description, actionLabel, onAction
}: EmptyStateProps) {
  return (
    <div style={{
      textAlign:      'center',
      padding:        '60px 20px',
      color:          COLORS.TEXT_MUTED,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            '12px',
    }}>
      <div style={{ fontSize: '48px', lineHeight: 1 }}>{icon}</div>
      <p style={{
        fontSize:   FONTS.LG,
        fontWeight: 600,
        color:      COLORS.TEXT_PRIMARY,
      }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: FONTS.MD, color: COLORS.TEXT_SECONDARY, maxWidth: '320px' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop:    '8px',
            background:   COLORS.PRIMARY_GLOW,
            border:       `1px solid ${COLORS.PRIMARY}`,
            color:        '#60B4F0',
            padding:      '10px 24px',
            borderRadius: RADII.MD,
            cursor:       'pointer',
            fontWeight:   600,
            fontSize:     FONTS.MD,
            fontFamily:   'Inter, sans-serif',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
