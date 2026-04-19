import { type ReactNode } from 'react'
import { COLORS, FONTS, RADII } from '../styles/theme'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.BG_BASE,
      color: COLORS.TEXT_PRIMARY,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* PUBLIC NAVBAR */}
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '60px',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${COLORS.BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.BLUE})`,
            borderRadius: RADII.MD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>🌍</div>
          <span style={{
            fontSize: FONTS.LG,
            fontWeight: 700,
            color: COLORS.TEXT_PRIMARY,
          }}>
            DeKUT SDG Talent Bridge
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a href="/" style={{
            color: COLORS.TEXT_SECONDARY,
            textDecoration: 'none',
            fontSize: FONTS.MD,
            padding: '6px 12px',
            borderRadius: RADII.MD,
          }}>
            Home
          </a>
          <a href="/auth" style={{
            background: COLORS.PRIMARY,
            color: '#fff',
            textDecoration: 'none',
            fontSize: FONTS.MD,
            fontWeight: 600,
            padding: '8px 20px',
            borderRadius: RADII.MD,
          }}>
            Sign In
          </a>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <div style={{ paddingTop: '60px' }}>
        {children}
      </div>
    </div>
  )
}
