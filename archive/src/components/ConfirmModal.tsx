import { COLORS, FONTS, RADII, SHADOWS } from '../styles/theme'

interface ConfirmModalProps {
  title:       string
  message:     string
  confirmLabel?: string
  cancelLabel?:  string
  danger?:     boolean
  onConfirm:   () => void
  onCancel:    () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      background:      'rgba(0,0,0,0.7)',
      backdropFilter:  'blur(4px)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      zIndex:          1000,
      padding:         '20px',
    }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   COLORS.BG_ELEVATED,
          border:       `1px solid ${COLORS.BORDER}`,
          borderRadius: RADII.XL,
          padding:      '28px',
          maxWidth:     '400px',
          width:        '100%',
          boxShadow:    SHADOWS.ELEVATED,
        }}
      >
        <h3 style={{
          fontSize:   FONTS.XL,
          fontWeight: 700,
          color:      COLORS.TEXT_PRIMARY,
          marginBottom: '10px',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize:   FONTS.MD,
          color:      COLORS.TEXT_SECONDARY,
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background:   COLORS.BG_CARD,
              border:       `1px solid ${COLORS.BORDER}`,
              color:        COLORS.TEXT_SECONDARY,
              padding:      '10px 20px',
              borderRadius: RADII.MD,
              cursor:       'pointer',
              fontSize:     FONTS.MD,
              fontFamily:   'Inter, sans-serif',
              fontWeight:   600,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background:   danger
                ? 'rgba(229,62,62,0.15)'
                : COLORS.PRIMARY_GLOW,
              border:       `1px solid ${danger ? COLORS.RED : COLORS.PRIMARY}`,
              color:        danger ? COLORS.RED : '#60B4F0',
              padding:      '10px 20px',
              borderRadius: RADII.MD,
              cursor:       'pointer',
              fontSize:     FONTS.MD,
              fontFamily:   'Inter, sans-serif',
              fontWeight:   700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
