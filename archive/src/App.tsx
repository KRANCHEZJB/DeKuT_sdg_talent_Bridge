import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import StudentDashboard from './pages/StudentDashboard'
import NgoDashboard from './pages/NgoDashboard'
import AdminDashboard from './pages/AdminDashboard'

// ─── PROTECTED ROUTE ──────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactElement
  roles: string[]
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100vh',
      background:     '#060D1F',
      color:          '#F1F5F9',
      fontFamily:     'Inter, sans-serif',
      fontSize:       '16px',
    }}>
      Loading...
    </div>
  )

  if (!user) return <Navigate to="/auth" replace />
  if (!roles.includes(user.role)) return <Navigate to="/auth" replace />
  return children
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/auth"
        element={
          user
            ? <Navigate to={
                user.role === 'student'    ? '/student' :
                user.role === 'ngo'        ? '/ngo'     :
                user.role === 'admin' || user.role === 'super_admin'
                                           ? '/admin'   : '/auth'
              } replace />
            : <AuthPage />
        }
      />

      {/* Student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <NotificationProvider>
              <StudentDashboard />
            </NotificationProvider>
          </ProtectedRoute>
        }
      />

      {/* NGO */}
      <Route
        path="/ngo"
        element={
          <ProtectedRoute roles={['ngo']}>
            <NotificationProvider>
              <NgoDashboard />
            </NotificationProvider>
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <NotificationProvider>
              <AdminDashboard />
            </NotificationProvider>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
