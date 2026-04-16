import { useState } from 'react'
import { COLORS, FONTS, RADII, SHADOWS } from '../styles/theme'
import { useNotifications } from '../context/NotificationContext'
import { markNotificationRead } from '../api/api'
import type { Notification } from '../types/index'

export default function NotificationBell() {
  const { notifications, unreadCount, refresh, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)

  const handleMarkRead = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id)
      refresh()
    }
    if (n.link) window.location.href = n.link
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background:   'none',
          border:       'none',
          cursor:       'pointer',
          fontSize:     '20px',
          position:     'relative',
          padding:      '6px',
          borderRadius: RADII.MD,
          display:      'flex',
          alignItems:   'center',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position:     'absolute',
            top:          '0',
            right:        '0',
            background:   COLORS.RED,
            color:        '#fff',
            borderRadius: RADII.FULL,
            fontSize:     FONTS.XS,
            fontWeight:   700,
            minWidth:     '18px',
            height:       '18px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            padding:      '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div style={{
            position:     'absolute',
            top:          '44px',
            right:        '0',
            width:        '340px',
            background:   COLORS.BG_ELEVATED,
            border:       `1px solid ${COLORS.BORDER}`,
            borderRadius: RADII.XL,
            boxShadow:    SHADOWS.ELEVATED,
            zIndex:       200,
            overflow:     'hidden',
            maxHeight:    '480px',
            display:      'flex',
            flexDirection:'column',
          }}>
            {/* Header */}
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              padding:        '14px 16px',
              borderBottom:   `1px solid ${COLORS.BORDER}`,
            }}>
              <span style={{ fontSize: FONTS.MD, fontWeight: 700, color: COLORS.TEXT_PRIMARY }}>
                Notifications {unreadCount > 0 && (
                  <span style={{ color: COLORS.RED, fontSize: FONTS.XS }}>({unreadCount} new)</span>
                )}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background:   'none',
                      border:       'none',
                      color:        COLORS.PRIMARY,
                      fontSize:     FONTS.XS,
                      cursor:       'pointer',
                      fontWeight:   600,
                      fontFamily:   'Inter, sans-serif',
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={refresh}
                  style={{
                    background:   'none',
                    border:       'none',
                    color:        COLORS.TEXT_MUTED,
                    fontSize:     '14px',
                    cursor:       'pointer',
                    padding:      '0',
                  }}
                  title="Refresh"
                >
                  ↻
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding:   '32px 16px',
                  textAlign: 'center',
                  color:     COLORS.TEXT_MUTED,
                  fontSize:  FONTS.SM,
                }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    style={{
                      padding:         '12px 16px',
                      borderBottom:    `1px solid ${COLORS.BORDER}`,
                      cursor:          n.link ? 'pointer' : 'default',
                      background:      n.is_read ? 'transparent' : COLORS.PRIMARY_GLOW,
                      transition:      'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{
                        fontSize:   FONTS.SM,
                        fontWeight: n.is_read ? 400 : 600,
                        color:      COLORS.TEXT_PRIMARY,
                        marginBottom: '3px',
                      }}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <div style={{
                          width:        '8px',
                          height:       '8px',
                          borderRadius: RADII.FULL,
                          background:   COLORS.PRIMARY,
                          flexShrink:   0,
                          marginTop:    '4px',
                        }} />
                      )}
                    </div>
                    <p style={{
                      fontSize: FONTS.XS,
                      color:    COLORS.TEXT_SECONDARY,
                      lineHeight: 1.5,
                    }}>
                      {n.message}
                    </p>
                    <p style={{
                      fontSize:  FONTS.XS,
                      color:     COLORS.TEXT_MUTED,
                      marginTop: '4px',
                    }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
