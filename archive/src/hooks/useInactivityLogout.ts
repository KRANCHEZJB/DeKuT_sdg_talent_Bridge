import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../api/api'

export function useInactivityLogout(timeoutMinutes = 30) {
  const auth = useAuth()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        showToast('You have been logged out due to inactivity.', 'warning')
        auth.logout()
      }, timeoutMinutes * 60 * 1000)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [auth, timeoutMinutes])
}
