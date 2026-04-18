/**
 * PART 3 — End-to-End (E2E) User Journey Tests — 20 Tests
 * Tools: Vitest + React Testing Library
 * Goal: Simulate real user journeys through the app
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ─── MOCKS ────────────────────────────────────────────────────────────────────
vi.mock('../styles/theme', () => ({
  COLORS: {
    BG_BASE: '#060D1F', BG_CARD: '#0D1628', BG_ELEVATED: '#132038',
    BG_INPUT: '#0D1628', BORDER: 'rgba(255,255,255,0.08)',
    BORDER_FOCUS: '#0A6EBD', PRIMARY: '#0A6EBD', PRIMARY_DARK: '#085A9E',
    PRIMARY_GLOW: 'rgba(10,110,189,0.15)', GREEN: '#00A651',
    GREEN_DIM: 'rgba(0,166,81,0.15)', YELLOW: '#FDB913',
    YELLOW_DIM: 'rgba(253,185,19,0.15)', RED: '#E53E3E',
    RED_DIM: 'rgba(229,62,62,0.15)', BLUE: '#0891D4',
    BLUE_DIM: 'rgba(8,145,212,0.15)', TEXT_PRIMARY: '#F1F5F9',
    TEXT_SECONDARY: '#94A3B8', TEXT_MUTED: '#475569',
  },
  FONTS: { XS: '11px', SM: '13px', MD: '14px', LG: '16px', XL: '18px', XXL: '22px', H1: '32px' },
  RADII: { SM: '6px', MD: '10px', LG: '14px', XL: '18px', XXL: '24px', FULL: '9999px' },
  SHADOWS: { CARD: '0 4px 24px rgba(0,0,0,0.4)', ELEVATED: '0 8px 40px rgba(0,0,0,0.6)', GLOW: '0 0 20px rgba(10,110,189,0.3)' },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/auth' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}))

vi.mock('../api/api', () => ({
  default: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  setToken:    vi.fn(),
  getToken:    vi.fn(() => null),
  getMe:       vi.fn(),
  login:       vi.fn(),
  register:    vi.fn(),
  showToast:   vi.fn(),
  extract422Errors: vi.fn(() => ({})),
}))

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(() => ({
    user: null, loading: false,
    login: vi.fn(), logout: vi.fn(),
  })),
}))

import { login as loginApi, register as registerApi } from '../api/api'
import { useAuth } from '../context/AuthContext'
import AuthPage from '../pages/AuthPage'
import ProjectCard from '../components/ProjectCard'
import ConfirmModal from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'

const mockProject = {
  id: 'proj-1', ngo_id: 'ngo-1',
  project_name: 'SDG Water Project',
  project_slug: 'sdg-water',
  description: 'Clean water for rural Kenya.',
  sdg_focus: 'SDG 6', skills_required: ['Python', 'React'],
  location: 'Nairobi', is_remote: false, duration_weeks: 6,
  participation_type: 'individual' as const,
  team_size_min: 1, team_size_max: 1,
  technology_level: 'beginner', requires_funding: false,
  project_status: 'open', rejection_reason: null,
  created_at: '2024-01-01T00:00:00Z',
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION JOURNEYS (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Authentication Journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: false, login: vi.fn(), logout: vi.fn(),
    })
  })

  it('renders login form by default', () => {
    render(<AuthPage />)
    expect(screen.getByText('Sign In →')).toBeTruthy()
  })

  it('switches to register mode when Create Account tab clicked', () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Create Account'))
    expect(screen.getByText('Create Student Account →')).toBeTruthy()
  })

  it('shows validation error when submitting empty login form', async () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Sign In →'))
    await waitFor(() =>
      expect(screen.getByText(/Email and password are required/i)).toBeTruthy()
    )
  })

  it('shows error when passwords do not match on register', async () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Create Account'))
    fireEvent.change(screen.getByPlaceholderText('First name'),       { target: { name: 'first_name', value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Last name'),        { target: { name: 'last_name',  value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { name: 'email',      value: 'john@students.dkut.ac.ke' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),   { target: { name: 'password',   value: 'Pass@123' } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'),{ target: { name: 'confirm_password', value: 'Wrong@456' } })
    fireEvent.click(screen.getByText('Create Student Account →'))
    await waitFor(() =>
      expect(screen.getAllByText(/do not match/i).length).toBeGreaterThan(0)
    )
  })

  it('calls loginApi and navigates on successful login', async () => {
    const mockLogin = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: false, login: mockLogin, logout: vi.fn(),
    })
    vi.mocked(loginApi).mockResolvedValue({
      data: { access_token: 'tok123', role: 'student' }
    } as any)
    render(<AuthPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { name: 'email',    value: 'student@students.dkut.ac.ke' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),   { target: { name: 'password', value: 'Pass@123' } })
    fireEvent.click(screen.getByText('Sign In →'))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('tok123'))
    expect(mockNavigate).toHaveBeenCalledWith('/student')
  })

  it('shows API error message on failed login', async () => {
    vi.mocked(loginApi).mockRejectedValue({
      response: { data: { detail: 'Invalid email or password' } }
    })
    render(<AuthPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { name: 'email',    value: 'bad@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),   { target: { name: 'password', value: 'wrongpass' } })
    fireEvent.click(screen.getByText('Sign In →'))
    await waitFor(() =>
      expect(screen.getByText(/Invalid email or password/i)).toBeTruthy()
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SYSTEM FLOWS (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Core System Flows', () => {
  beforeEach(() => vi.clearAllMocks())

  it('student can view and apply to a project', () => {
    const onApply = vi.fn()
    render(<ProjectCard project={mockProject} hasApplied={false} onApply={onApply} />)
    expect(screen.getByText('SDG Water Project')).toBeTruthy()
    fireEvent.click(screen.getByText('Apply Now →'))
    expect(onApply).toHaveBeenCalledOnce()
  })

  it('applied student sees applied state and cannot re-apply', () => {
    const onApply = vi.fn()
    render(<ProjectCard project={mockProject} hasApplied={true} onApply={onApply} />)
    expect(screen.getByText('✓ Applied')).toBeTruthy()
    fireEvent.click(screen.getByText('✓ Applied'))
    expect(onApply).not.toHaveBeenCalled()
  })

  it('delete flow: confirm modal appears and calls confirm', () => {
    const onConfirm = vi.fn()
    const onCancel  = vi.fn()
    const TestFlow = () => {
      const [show, setShow] = React.useState(false)
      return (
        <div>
          <button onClick={() => setShow(true)}>Delete</button>
          {show && (
            <ConfirmModal
              title="Delete Record"
              message="This cannot be undone."
              danger={true}
              onConfirm={() => { onConfirm(); setShow(false) }}
              onCancel={() => { onCancel(); setShow(false) }}
            />
          )}
        </div>
      )
    }
    render(<TestFlow />)
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete Record')).toBeTruthy()
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.queryByText('Delete Record')).toBeNull()
  })

  it('delete flow: cancel closes modal without confirming', () => {
    const onConfirm = vi.fn()
    const TestFlow = () => {
      const [show, setShow] = React.useState(false)
      return (
        <div>
          <button onClick={() => setShow(true)}>Delete</button>
          {show && (
            <ConfirmModal
              title="Delete Record"
              message="This cannot be undone."
              onConfirm={onConfirm}
              onCancel={() => setShow(false)}
            />
          )}
        </div>
      )
    }
    render(<TestFlow />)
    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByText('Delete Record')).toBeNull()
  })

  it('empty list state renders with add action', () => {
    const onAdd = vi.fn()
    render(
      <EmptyState
        icon="📋"
        title="No projects yet"
        description="Create your first project to get started."
        actionLabel="Create Project"
        onAction={onAdd}
      />
    )
    expect(screen.getByText('No projects yet')).toBeTruthy()
    fireEvent.click(screen.getByText('Create Project'))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('NGO admin navigates to /admin on login', async () => {
    const mockLogin = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: false, login: mockLogin, logout: vi.fn(),
    })
    vi.mocked(loginApi).mockResolvedValue({
      data: { access_token: 'admintok', role: 'admin' }
    } as any)
    render(<AuthPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { name: 'email',    value: 'admin@dkut.ac.ke' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),   { target: { name: 'password', value: 'Admin@2025' } })
    fireEvent.click(screen.getByText('Sign In →'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })

  it('NGO user navigates to /ngo on login', async () => {
    const mockLogin = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: false, login: mockLogin, logout: vi.fn(),
    })
    vi.mocked(loginApi).mockResolvedValue({
      data: { access_token: 'ngotok', role: 'ngo' }
    } as any)
    render(<AuthPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { name: 'email',    value: 'ngo@org.ke' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),   { target: { name: 'password', value: 'Ngo@2025' } })
    fireEvent.click(screen.getByText('Sign In →'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/ngo'))
  })

  it('register flow shows success message and switches to login', async () => {
    vi.mocked(registerApi).mockResolvedValue({ data: {} } as any)
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Create Account'))
    fireEvent.change(screen.getByPlaceholderText('First name'),        { target: { name: 'first_name',       value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Last name'),         { target: { name: 'last_name',        value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i),  { target: { name: 'email',            value: 'jane@students.dkut.ac.ke' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),    { target: { name: 'password',         value: 'Pass@1234' } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { name: 'confirm_password', value: 'Pass@1234' } })
    fireEvent.click(screen.getByText('Create Student Account →'))
    await waitFor(() =>
      expect(screen.getByText(/Account created/i)).toBeTruthy()
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Edge Cases & Invalid Inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: false, login: vi.fn(), logout: vi.fn(),
    })
  })

  it('login form rejects when only email provided', async () => {
    render(<AuthPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { name: 'email', value: 'test@test.com' } })
    fireEvent.click(screen.getByText('Sign In →'))
    await waitFor(() =>
      expect(screen.getByText(/Email and password are required/i)).toBeTruthy()
    )
  })

  it('register rejects short password', async () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Create Account'))
    fireEvent.change(screen.getByPlaceholderText('First name'),        { target: { name: 'first_name',       value: 'A' } })
    fireEvent.change(screen.getByPlaceholderText('Last name'),         { target: { name: 'last_name',        value: 'B' } })
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i),  { target: { name: 'email',            value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'),    { target: { name: 'password',         value: '123' } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { name: 'confirm_password', value: '123' } })
    fireEvent.click(screen.getByText('Create Student Account →'))
    await waitFor(() =>
      expect(screen.getByText(/at least 6 characters/i)).toBeTruthy()
    )
  })

  it('ProjectCard handles project with no location gracefully', () => {
    const p = { ...mockProject, location: '' }
    render(<ProjectCard project={p} hasApplied={false} onApply={() => {}} />)
    expect(screen.getByText('SDG Water Project')).toBeTruthy()
    expect(screen.queryByText('📍')).toBeNull()
  })

  it('ProjectCard handles remote project display', () => {
    const p = { ...mockProject, is_remote: true }
    render(<ProjectCard project={p} hasApplied={false} onApply={() => {}} />)
    expect(screen.getByText('🌐 Remote')).toBeTruthy()
  })

  it('StatusBadge handles all major statuses without crashing', () => {
    const statuses = ['open', 'closed', 'pending', 'approved', 'rejected', 'applied', 'selected', 'completed']
    statuses.forEach(status => {
      const { unmount } = render(<StatusBadge status={status} />)
      unmount()
    })
    expect(true).toBe(true)
  })

  it('role switch in register changes button label to Organization', () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Create Account'))
    fireEvent.click(screen.getByText('Organization'))
    expect(screen.getByText('Register Organization →')).toBeTruthy()
  })
})
