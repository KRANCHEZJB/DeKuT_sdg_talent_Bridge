import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import StudentDashboard from './pages/StudentDashboard'
import NgoDashboard from './pages/NgoDashboard'

const ProtectedRoute = ({ children, role }: { children: JSX.Element, role: string }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading...</div>
  if (!user) return <Navigate to="/auth" />
  if (user.role !== role) return <Navigate to="/auth" />
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/student" element={
        <ProtectedRoute role="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/ngo" element={
        <ProtectedRoute role="ngo">
          <NgoDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
