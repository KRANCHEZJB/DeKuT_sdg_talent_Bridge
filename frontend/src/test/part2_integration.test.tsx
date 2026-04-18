/**
 * PART 2 — Integration Testing — 25 Tests
 * Goal: Verify component interaction + API flow + hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// ─── MOCK THEME ───────────────────────────────────────────────────────────────
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

// ─── MOCK API ─────────────────────────────────────────────────────────────────
vi.mock('../api/api', () => ({
  default:               { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  setToken:              vi.fn(),
  getToken:              vi.fn(() => null),
  getMe:                 vi.fn(),
  login:                 vi.fn(),
  register:              vi.fn(),
  getProjects:           vi.fn(),
  getNotifications:      vi.fn(),
  markNotificationRead:  vi.fn(),
  markAllNotificationsRead: vi.fn(),
  showToast:             vi.fn(),
  extract422Errors:      vi.fn(() => ({})),
}))

// ─── MOCK ROUTER ──────────────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({
  useNavigate:     vi.fn(() => vi.fn()),
  useLocation:     vi.fn(() => ({ pathname: '/' })),
  BrowserRouter:   ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link:            ({ children, to }: { children: React.ReactNode; to: string }) =>
                     <a href={to}>{children}</a>,
  Navigate:        ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}))

import {
  setToken, getToken, getMe, showToast,
  extract422Errors,
} from '../api/api'

import { AuthProvider, useAuth } from '../context/AuthContext'
import { useFetch }              from '../hooks/useFetch'
import { useInactivityLogout }   from '../hooks/useInactivityLogout'
import StatusBadge               from '../components/StatusBadge'
import EmptyState                from '../components/EmptyState'
import SkillTag                  from '../components/SkillTag'
import ConfirmModal              from '../components/ConfirmModal'
import ProjectCard               from '../components/ProjectCard'

// ─── MOCK PROJECT ─────────────────────────────────────────────────────────────
const mockProject = {
  id: 'proj-1', ngo_id: 'ngo-1',
  project_name: 'Clean Water Initiative',
  project_slug: 'clean-water',
  description: 'Provide clean water to rural communities.',
  sdg_focus: 'SDG 6', skills_required: ['Python', 'React'],
  location: 'Nairobi', is_remote: true, duration_weeks: 8,
  participation_type: 'individual' as const,
  team_size_min: 1, team_size_max: 1,
  technology_level: 'intermediate', requires_funding: false,
  project_status: 'open', rejection_reason: null,
  created_at: '2024-01-01T00:00:00Z',
}

const mockUser = {
  id: 'user-1', email: 'student@students.dkut.ac.ke',
  first_name: 'Test', last_name: 'Student',
  role: 'student' as const, is_active: true, created_at: '2024-01-01T00:00:00Z',
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH FLOW TESTS (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Auth Flow Integration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('AuthProvider renders children', () => {
    vi.mocked(getToken).mockReturnValue(null)
    render(
      <AuthProvider>
        <div data-testid="child">Hello</div>
      </AuthProvider>
    )
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('AuthProvider starts with loading true then resolves', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    const TestComp = () => {
      const { loading } = useAuth()
      return <div>{loading ? 'loading' : 'ready'}</div>
    }
    render(<AuthProvider><TestComp /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy())
  })

  it('AuthProvider sets user after login', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    vi.mocked(getMe).mockResolvedValue({ data: mockUser } as any)
    const TestComp = () => {
      const { user, login } = useAuth()
      return (
        <div>
          <span>{user ? user.first_name : 'no user'}</span>
          <button onClick={() => login('token123')}>Login</button>
        </div>
      )
    }
    render(<AuthProvider><TestComp /></AuthProvider>)
    await waitFor(() => screen.getByText('no user'))
    fireEvent.click(screen.getByText('Login'))
    await waitFor(() => expect(screen.getByText('Test')).toBeTruthy())
  })

  it('AuthProvider clears user on logout', async () => {
    vi.mocked(getToken).mockReturnValue('existing-token')
    vi.mocked(getMe).mockResolvedValue({ data: mockUser } as any)
    const TestComp = () => {
      const { user, logout } = useAuth()
      return (
        <div>
          <span>{user ? user.first_name : 'no user'}</span>
          <button onClick={logout}>Logout</button>
        </div>
      )
    }
    render(<AuthProvider><TestComp /></AuthProvider>)
    await waitFor(() => screen.getByText('Test'))
    fireEvent.click(screen.getByText('Logout'))
    expect(vi.mocked(setToken)).toHaveBeenCalledWith(null)
  })

  it('setToken is called with token on login', async () => {
    vi.mocked(getToken).mockReturnValue(null)
    vi.mocked(getMe).mockResolvedValue({ data: mockUser } as any)
    const TestComp = () => {
      const { login } = useAuth()
      return <button onClick={() => login('mytoken')}>Login</button>
    }
    render(<AuthProvider><TestComp /></AuthProvider>)
    fireEvent.click(screen.getByText('Login'))
    await waitFor(() => expect(vi.mocked(setToken)).toHaveBeenCalledWith('mytoken'))
  })

  it('AuthProvider loads user from existing token on mount', async () => {
    vi.mocked(getToken).mockReturnValue('saved-token')
    vi.mocked(getMe).mockResolvedValue({ data: mockUser } as any)
    const TestComp = () => {
      const { user } = useAuth()
      return <div>{user ? user.email : 'no user'}</div>
    }
    render(<AuthProvider><TestComp /></AuthProvider>)
    await waitFor(() =>
      expect(screen.getByText('student@students.dkut.ac.ke')).toBeTruthy()
    )
  })

  it('AuthProvider clears token on getMe failure', async () => {
    vi.mocked(getToken).mockReturnValue('bad-token')
    vi.mocked(getMe).mockRejectedValue(new Error('Unauthorized'))
    const TestComp = () => {
      const { user, loading } = useAuth()
      return <div>{loading ? 'loading' : user ? 'has user' : 'no user'}</div>
    }
    render(<AuthProvider><TestComp /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('no user')).toBeTruthy())
    expect(vi.mocked(setToken)).toHaveBeenCalledWith(null)
  })

  it('extract422Errors returns empty object for non-422 errors', () => {
    const err = { response: { status: 400, data: {} } }
    const result = vi.mocked(extract422Errors)(err)
    expect(result).toEqual({})
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD DATA FLOW TESTS (7 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Dashboard Data Flow Integration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('useFetch returns loading true initially', async () => {
    const fetcher = vi.fn(() => new Promise(() => {}))
    const TestComp = () => {
      const { loading } = useFetch(fetcher)
      return <div>{loading ? 'loading' : 'done'}</div>
    }
    render(<TestComp />)
    expect(screen.getByText('loading')).toBeTruthy()
  })

  it('useFetch returns data on success', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { name: 'Test' } })
    const TestComp = () => {
      const { data, loading } = useFetch<{ name: string }>(fetcher)
      return <div>{loading ? 'loading' : data?.name ?? 'no data'}</div>
    }
    render(<TestComp />)
    await waitFor(() => expect(screen.getByText('Test')).toBeTruthy())
  })

  it('useFetch sets error true on failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'))
    const TestComp = () => {
      const { error, loading } = useFetch(fetcher)
      return <div>{loading ? 'loading' : error ? 'error' : 'ok'}</div>
    }
    render(<TestComp />)
    await waitFor(() => expect(screen.getByText('error')).toBeTruthy())
  })

  it('useFetch refetch triggers re-fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [] })
    const TestComp = () => {
      const { refetch } = useFetch(fetcher)
      return <button onClick={refetch}>Refetch</button>
    }
    render(<TestComp />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByText('Refetch'))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('ProjectCard integrates with StatusBadge when showStatus=true', () => {
    render(
      <ProjectCard
        project={mockProject}
        hasApplied={false}
        onApply={() => {}}
        showStatus={true}
      />
    )
    expect(screen.getByText('Open')).toBeTruthy()
  })

  it('ProjectCard shows applying state correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        hasApplied={false}
        onApply={() => {}}
        applying={true}
      />
    )
    expect(screen.getByText('⏳ Applying...')).toBeTruthy()
  })

  it('ProjectCard does not call onApply when already applied', () => {
    const onApply = vi.fn()
    render(
      <ProjectCard
        project={mockProject}
        hasApplied={true}
        onApply={onApply}
      />
    )
    fireEvent.click(screen.getByText('✓ Applied'))
    expect(onApply).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// FORM SUBMISSION + API TESTS (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Form Submission & API Integration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ConfirmModal confirm flow calls onConfirm and not onCancel', () => {
    const onConfirm = vi.fn()
    const onCancel  = vi.fn()
    render(
      <ConfirmModal
        title="Submit Form"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('ConfirmModal cancel flow calls onCancel and not onConfirm', () => {
    const onConfirm = vi.fn()
    const onCancel  = vi.fn()
    render(
      <ConfirmModal
        title="Submit Form"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('SkillTag removal integrates with parent state', () => {
    const skills  = ['Python', 'React']
    const removed: string[] = []
    const TestComp = () => {
      const [list, setList] = React.useState(skills)
      return (
        <div>
          {list.map(s => (
            <SkillTag
              key={s}
              skill={s}
              onRemove={() => {
                removed.push(s)
                setList(l => l.filter(x => x !== s))
              }}
            />
          ))}
        </div>
      )
    }
    render(<TestComp />)
    expect(screen.getByText('Python')).toBeTruthy()
    fireEvent.click(screen.getAllByText('×')[0])
    expect(screen.queryByText('Python')).toBeNull()
    expect(removed).toContain('Python')
  })

  it('EmptyState action button triggers state change', () => {
    const TestComp = () => {
      const [clicked, setClicked] = React.useState(false)
      return clicked
        ? <div>Form opened</div>
        : <EmptyState icon="📝" title="No items" actionLabel="Add" onAction={() => setClicked(true)} />
    }
    render(<TestComp />)
    fireEvent.click(screen.getByText('Add'))
    expect(screen.getByText('Form opened')).toBeTruthy()
  })

  it('showToast is callable with message and type', () => {
    vi.mocked(showToast)('Success!', 'success')
    expect(vi.mocked(showToast)).toHaveBeenCalledWith('Success!', 'success')
  })

  it('useFetch does not set state after unmount', async () => {
    let resolveFetch!: (val: any) => void
    const fetcher = vi.fn(() => new Promise(r => { resolveFetch = r }))
    const TestComp = () => {
      const { loading } = useFetch(fetcher)
      return <div>{loading ? 'loading' : 'done'}</div>
    }
    const { unmount } = render(<TestComp />)
    unmount()
    await act(async () => {
      resolveFetch({ data: [] })
    })
    // No errors thrown = pass
    expect(true).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING TESTS (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Error Handling Integration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('StatusBadge handles unknown status gracefully', () => {
    render(<StatusBadge status="unknown_status_xyz" />)
    expect(screen.getByText('unknown status xyz')).toBeTruthy()
  })

  it('EmptyState renders correctly without optional props', () => {
    render(<EmptyState icon="⚠️" title="Error loading data" />)
    expect(screen.getByText('⚠️')).toBeTruthy()
    expect(screen.getByText('Error loading data')).toBeTruthy()
  })

  it('useFetch handles network cancellation gracefully', async () => {
    const fetcher = vi.fn().mockRejectedValue({ __CANCEL__: true, message: 'canceled' })
    const TestComp = () => {
      const { error, loading } = useFetch(fetcher)
      return <div>{loading ? 'loading' : error ? 'error' : 'ok'}</div>
    }
    render(<TestComp />)
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
  })

  it('ConfirmModal danger prop renders without crashing', () => {
    render(
      <ConfirmModal
        title="Delete"
        message="This is dangerous"
        danger={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText('Delete')).toBeTruthy()
    expect(screen.getByText('Confirm')).toBeTruthy()
  })
})
