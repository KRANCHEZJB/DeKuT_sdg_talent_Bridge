import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode
} from 'react'
import { getMe, setToken, getToken } from '../api/api'
import type { User } from '../types/index'

interface AuthContextType {
  user:    User | null
  loading: boolean
  login:   (token: string) => Promise<void>
  logout:  () => void
}

const defaultAuth: AuthContextType = {
  user:    null,
  loading: true,
  login:   async (_token: string) => {},
  logout:  () => {},
}

const AuthContext = createContext<AuthContextType>(defaultAuth)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    window.location.href = '/auth'
  }, [])

  const login = useCallback(async (token: string) => {
    setToken(token)
    const res = await getMe()
    setUser(res.data)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(res => setUser(res.data))
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
