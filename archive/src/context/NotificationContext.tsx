import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, type ReactNode
} from 'react'
import { getNotifications, markAllNotificationsRead } from '../api/api'
import type { Notification } from '../types/index'
import { useAuth } from './AuthContext'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount:   number
  loading:       boolean
  refresh:       () => void
  markAllRead:   () => void
}

const NotificationContext = createContext<NotificationContextType>(
  {} as NotificationContextType
)

const POLL_INTERVAL = 30000

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(false)
  const seenIds = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await getNotifications()
      const incoming: Notification[] = res.data.notifications
      const deduped = incoming.filter(n => !seenIds.current.has(n.id))
      deduped.forEach(n => seenIds.current.add(n.id))
      setNotifications(incoming)
      setUnreadCount(res.data.unread_count)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user])

  const refresh = useCallback(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user, fetchNotifications])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      refresh,
      markAllRead,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
