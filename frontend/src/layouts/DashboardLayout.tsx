import { type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useInactivityLogout } from '../hooks/useInactivityLogout'
import { useNotifications } from '../context/NotificationContext'
import { showToast } from '../api/api'
import { COLORS, FONTS, RADII, SHADOWS } from '../styles/theme'

interface DashboardLayoutProps {
  children:    ReactNode
  activeTab:   string
  onTabChange: (tab: string) => void
  tabs:        { key: string; label: string; icon: string }[]
  title:       string
}

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  tabs,
  title,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { unreadCount, refresh } = useNotifications()
  useInactivityLogout(30)

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.BG_BASE,
      color: COLORS.TEXT_PRIMARY,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* TOP NAVBAR */}
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '60px',
        background: COLORS.BG_CARD,
        borderBottom: `1px solid ${COLORS.BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
        boxShadow: SHADOWS.CARD,
      }}>
        {/* Left — logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.BLUE})`,
            borderRadius: RADII.MD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>🌍</div>
          <span style={{ fontSize: FONTS.LG, fontWeight: 700, color: COLORS.TEXT_PRIMARY }}>
            DeKUT SDG
          </span>
        </div>

        {/* Right — notifications + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={refresh}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '20px',
                position: 'relative', padding: '4px',
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px', right: '-2px',
                  background: COLORS.RED,
                  color: '#fff',
                  borderRadius: RADII.FULL,
                  fontSize: FONTS.XS,
                  fontWeight: 700,
                  minWidth: '18px', height: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px',
              background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.BLUE})`,
              borderRadius: RADII.FULL,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: FONTS.MD, fontWeight: 700, color: '#fff',
            }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: FONTS.SM, fontWeight: 600, color: COLORS.TEXT_PRIMARY }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: FONTS.XS, color: COLORS.TEXT_MUTED, textTransform: 'capitalize' }}>
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              showToast('Logged out successfully', 'info')
              logout()
            }}
            style={{
              background: COLORS.BG_ELEVATED,
              border: `1px solid ${COLORS.BORDER}`,
              color: COLORS.TEXT_SECONDARY,
              padding: '6px 14px',
              borderRadius: RADII.MD,
              fontSize: FONTS.SM,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside style={{
        position: 'fixed',
        top: '60px', left: 0, bottom: 0,
        width: '220px',
        background: COLORS.BG_CARD,
        borderRight: `1px solid ${COLORS.BORDER}`,
        padding: '20px 12px',
        overflowY: 'auto',
        zIndex: 90,
      }}>
        <div style={{
          fontSize: FONTS.XS,
          color: COLORS.TEXT_MUTED,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 8px',
          marginBottom: '12px',
        }}>
          {title}
        </div>

        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: RADII.MD,
                border: 'none',
                cursor: 'pointer',
                fontSize: FONTS.MD,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
                background: isActive ? COLORS.BG_ELEVATED : 'transparent',
                borderLeft: isActive ? `3px solid ${COLORS.PRIMARY}` : '3px solid transparent',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                marginBottom: '2px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        marginLeft: '220px',
        marginTop: '60px',
        padding: '32px',
        minHeight: 'calc(100vh - 60px)',
      }}>
        {children}
      </main>
    </div>
  )
}
