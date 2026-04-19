import { COLORS, FONTS } from '../styles/theme'

interface LoadingSpinnerProps {
  message?: string
  size?:    'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md'
}: LoadingSpinnerProps) {
  const dim = size === 'sm' ? 20 : size === 'md' ? 32 : 48

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '12px',
      padding:        '40px 20px',
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        width:        `${dim}px`,
        height:       `${dim}px`,
        borderRadius: '50%',
        border:       `3px solid ${COLORS.BORDER}`,
        borderTop:    `3px solid ${COLORS.PRIMARY}`,
        animation:    'spin 0.8s linear infinite',
      }} />
      {message && (
        <p style={{
          color:    COLORS.TEXT_SECONDARY,
          fontSize: FONTS.MD,
        }}>
          {message}
        </p>
      )}
    </div>
  )
}
