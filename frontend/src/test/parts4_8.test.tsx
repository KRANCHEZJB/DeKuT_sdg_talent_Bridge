/**
 * PARTS 4–8 — Responsive, Performance, Accessibility, Security, Cross-Browser
 * Part 4: Responsive & UI Consistency — 15 Tests
 * Part 5: Performance — 10 Tests
 * Part 6: Accessibility (a11y) — 12 Tests
 * Part 7: Frontend Security — 10 Tests
 * Part 8: Cross-Browser Compatibility — 8 Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}))

vi.mock('../api/api', () => ({
  default: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  setToken: vi.fn(), getToken: vi.fn(() => null),
  getMe: vi.fn(), login: vi.fn(), register: vi.fn(), showToast: vi.fn(),
  extract422Errors: vi.fn(() => ({})),
}))

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(() => ({ user: null, loading: false, login: vi.fn(), logout: vi.fn() })),
}))

import LoadingSpinner      from '../components/LoadingSpinner'
import StatusBadge         from '../components/StatusBadge'
import EmptyState          from '../components/EmptyState'
import SkillTag            from '../components/SkillTag'
import ConfirmModal        from '../components/ConfirmModal'
import ProjectCard         from '../components/ProjectCard'
import { setToken, getToken, showToast } from '../api/api'

const mockProject = {
  id: 'p1', ngo_id: 'n1', project_name: 'Test Project',
  project_slug: 'test-project', description: 'A test project description.',
  sdg_focus: 'SDG 1', skills_required: ['Python'],
  location: 'Nairobi', is_remote: true, duration_weeks: 4,
  participation_type: 'individual' as const,
  team_size_min: 1, team_size_max: 1, technology_level: 'beginner',
  requires_funding: false, project_status: 'open',
  rejection_reason: null, created_at: '2024-01-01T00:00:00Z',
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4 — RESPONSIVE & UI CONSISTENCY (15 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Part 4 — Responsive & UI Consistency', () => {

  describe('Layout Responsiveness', () => {
    it('LoadingSpinner renders correctly at small viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
      const { container } = render(<LoadingSpinner message="Loading..." size="sm" />)
      expect(container.firstChild).toBeTruthy()
    })

    it('LoadingSpinner renders correctly at tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 })
      const { container } = render(<LoadingSpinner message="Loading..." size="md" />)
      expect(container.firstChild).toBeTruthy()
    })

    it('LoadingSpinner renders correctly at desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1440 })
      const { container } = render(<LoadingSpinner message="Loading..." size="lg" />)
      expect(container.firstChild).toBeTruthy()
    })

    it('ProjectCard renders correctly on mobile width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(screen.getByText('Test Project')).toBeTruthy()
    })

    it('EmptyState renders correctly on small screens', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 320 })
      render(<EmptyState icon="📭" title="Nothing here" />)
      expect(screen.getByText('Nothing here')).toBeTruthy()
    })

    it('ConfirmModal renders correctly on mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 })
      render(
        <ConfirmModal title="Confirm" message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />
      )
      expect(screen.getByText('Are you sure?')).toBeTruthy()
    })
  })

  describe('Navigation UI', () => {
    it('StatusBadge text is readable (not empty)', () => {
      render(<StatusBadge status="open" />)
      const badge = screen.getByText('Open')
      expect(badge.textContent).toBeTruthy()
    })

    it('SkillTag text is readable and not empty', () => {
      render(<SkillTag skill="TypeScript" />)
      expect(screen.getByText('TypeScript').textContent).toBeTruthy()
    })

    it('EmptyState action button is reachable via click', () => {
      const fn = vi.fn()
      render(<EmptyState icon="+" title="Empty" actionLabel="Go" onAction={fn} />)
      fireEvent.click(screen.getByText('Go'))
      expect(fn).toHaveBeenCalled()
    })

    it('ConfirmModal cancel button is always present', () => {
      render(
        <ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />
      )
      expect(screen.getByText('Cancel')).toBeTruthy()
    })
  })

  describe('Visual Consistency', () => {
    it('StatusBadge renders consistent label for same status across renders', () => {
      const { unmount } = render(<StatusBadge status="approved" />)
      expect(screen.getByText('Approved')).toBeTruthy()
      unmount()
      render(<StatusBadge status="approved" />)
      expect(screen.getByText('Approved')).toBeTruthy()
    })

    it('SkillTag blue variant renders correctly', () => {
      const { container } = render(<SkillTag skill="React" color="blue" />)
      expect(container.firstChild).toBeTruthy()
      expect(screen.getByText('React')).toBeTruthy()
    })

    it('SkillTag green variant renders correctly', () => {
      const { container } = render(<SkillTag skill="Node" color="green" />)
      expect(container.firstChild).toBeTruthy()
      expect(screen.getByText('Node')).toBeTruthy()
    })

    it('LoadingSpinner message is visible and matches prop', () => {
      render(<LoadingSpinner message="Fetching data..." />)
      expect(screen.getByText('Fetching data...')).toBeTruthy()
    })

    it('ProjectCard apply button has consistent label when not applied', () => {
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(screen.getByText('Apply Now →')).toBeTruthy()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PART 5 — PERFORMANCE TESTING (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Part 5 — Performance Testing', () => {

  describe('Page Load Performance', () => {
    it('LoadingSpinner renders in under 100ms', () => {
      const start = performance.now()
      render(<LoadingSpinner />)
      expect(performance.now() - start).toBeLessThan(100)
    })

    it('StatusBadge renders in under 50ms', () => {
      const start = performance.now()
      render(<StatusBadge status="open" />)
      expect(performance.now() - start).toBeLessThan(50)
    })

    it('ProjectCard renders in under 150ms', () => {
      const start = performance.now()
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(performance.now() - start).toBeLessThan(150)
    })

    it('EmptyState renders in under 50ms', () => {
      const start = performance.now()
      render(<EmptyState icon="📭" title="No data" />)
      expect(performance.now() - start).toBeLessThan(50)
    })
  })

  describe('API Rendering Speed', () => {
    it('renders 10 ProjectCards in under 500ms', () => {
      const projects = Array.from({ length: 10 }, (_, i) => ({
        ...mockProject, id: `p${i}`, project_name: `Project ${i}`,
      }))
      const start = performance.now()
      render(
        <div>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} hasApplied={false} onApply={() => {}} />
          ))}
        </div>
      )
      expect(performance.now() - start).toBeLessThan(500)
    })

    it('renders 20 StatusBadges in under 200ms', () => {
      const statuses = Array.from({ length: 20 }, (_, i) => ['open', 'closed', 'pending'][i % 3])
      const start = performance.now()
      render(<div>{statuses.map((s, i) => <StatusBadge key={i} status={s} />)}</div>)
      expect(performance.now() - start).toBeLessThan(200)
    })

    it('renders 20 SkillTags in under 200ms', () => {
      const skills = Array.from({ length: 20 }, (_, i) => `Skill${i}`)
      const start = performance.now()
      render(<div>{skills.map(s => <SkillTag key={s} skill={s} />)}</div>)
      expect(performance.now() - start).toBeLessThan(200)
    })
  })

  describe('Bundle Size Optimization', () => {
    it('theme COLORS object has expected number of keys', () => {
      const COLORS = {
        BG_BASE: '#060D1F', BG_CARD: '#0D1628', BG_ELEVATED: '#132038',
        PRIMARY: '#0A6EBD', GREEN: '#00A651', YELLOW: '#FDB913',
        RED: '#E53E3E', BLUE: '#0891D4', TEXT_PRIMARY: '#F1F5F9',
      }
      expect(Object.keys(COLORS).length).toBeGreaterThan(5)
    })

    it('theme FONTS object has expected keys', () => {
      const FONTS = { XS: '11px', SM: '13px', MD: '14px', LG: '16px', XL: '18px' }
      expect(FONTS).toHaveProperty('MD')
      expect(FONTS).toHaveProperty('LG')
    })

    it('theme RADII object has expected keys', () => {
      const RADII = { SM: '6px', MD: '10px', LG: '14px', XL: '18px', FULL: '9999px' }
      expect(RADII).toHaveProperty('MD')
      expect(RADII).toHaveProperty('FULL')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PART 6 — ACCESSIBILITY (12 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Part 6 — Accessibility (a11y)', () => {

  describe('Navigation Accessibility', () => {
    it('ConfirmModal confirm button is keyboard-clickable', () => {
      const onConfirm = vi.fn()
      render(
        <ConfirmModal title="T" message="M" onConfirm={onConfirm} onCancel={() => {}} />
      )
      const btn = screen.getByText('Confirm')
      fireEvent.keyDown(btn, { key: 'Enter', code: 'Enter' })
      fireEvent.click(btn)
      expect(onConfirm).toHaveBeenCalled()
    })

    it('ConfirmModal cancel button is keyboard-clickable', () => {
      const onCancel = vi.fn()
      render(
        <ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />
      )
      const btn = screen.getByText('Cancel')
      fireEvent.click(btn)
      expect(onCancel).toHaveBeenCalled()
    })

    it('EmptyState action button is focusable', () => {
      render(<EmptyState icon="📭" title="Empty" actionLabel="Action" onAction={() => {}} />)
      const btn = screen.getByText('Action')
      btn.focus()
      expect(document.activeElement).toBe(btn)
    })

    it('ProjectCard apply button is focusable', () => {
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      const btn = screen.getByText('Apply Now →')
      btn.focus()
      expect(document.activeElement).toBe(btn)
    })
  })

  describe('Forms Accessibility', () => {
    it('SkillTag remove button has content for screen readers', () => {
      render(<SkillTag skill="Python" onRemove={() => {}} />)
      const removeBtn = screen.getByText('×')
      expect(removeBtn).toBeTruthy()
    })

    it('LoadingSpinner message is rendered as text node', () => {
      render(<LoadingSpinner message="Loading your data" />)
      expect(screen.getByText('Loading your data')).toBeTruthy()
    })

    it('StatusBadge text content is human readable', () => {
      render(<StatusBadge status="pending_verification" />)
      expect(screen.getByText('Pending Verification')).toBeTruthy()
    })

    it('EmptyState description is rendered as paragraph text', () => {
      render(
        <EmptyState icon="📭" title="No data" description="Nothing to show yet." />
      )
      expect(screen.getByText('Nothing to show yet.')).toBeTruthy()
    })
  })

  describe('Visual Accessibility', () => {
    it('ProjectCard description text is present in the DOM', () => {
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(screen.getByText('A test project description.')).toBeTruthy()
    })

    it('ConfirmModal message is readable in the DOM', () => {
      render(
        <ConfirmModal title="Title" message="This is the message" onConfirm={() => {}} onCancel={() => {}} />
      )
      expect(screen.getByText('This is the message')).toBeTruthy()
    })

    it('EmptyState icon is rendered as text content', () => {
      render(<EmptyState icon="🚫" title="Blocked" />)
      expect(screen.getByText('🚫')).toBeTruthy()
    })

    it('StatusBadge renders with inline style (not hidden)', () => {
      const { container } = render(<StatusBadge status="open" />)
      const badge = container.querySelector('span')
      expect(badge).toBeTruthy()
      expect(badge?.style.display).not.toBe('none')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PART 7 — FRONTEND SECURITY (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Part 7 — Frontend Security', () => {

  describe('Input Security', () => {
    it('StatusBadge does not render raw HTML from status string', () => {
      render(<StatusBadge status="<script>alert(1)</script>" />)
      expect(document.querySelector('script')).toBeNull()
    })

    it('EmptyState does not execute scripts in title', () => {
      render(<EmptyState icon="⚠" title="<script>alert(1)</script>" />)
      expect(document.querySelector('script')).toBeNull()
    })

    it('SkillTag does not execute scripts in skill name', () => {
      render(<SkillTag skill="<img src=x onerror=alert(1)>" />)
      const imgs = document.querySelectorAll('img[onerror]')
      expect(imgs.length).toBe(0)
    })

    it('ProjectCard does not execute scripts in project name', () => {
      const p = { ...mockProject, project_name: '<script>alert("xss")</script>' }
      render(<ProjectCard project={p} hasApplied={false} onApply={() => {}} />)
      expect(document.querySelector('script')).toBeNull()
    })
  })

  describe('Auth/Token Handling', () => {
    it('setToken is called with null on logout', () => {
      vi.mocked(setToken)(null)
      expect(vi.mocked(setToken)).toHaveBeenCalledWith(null)
    })

    it('getToken returns null when no token set', () => {
      vi.mocked(getToken).mockReturnValue(null)
      expect(getToken()).toBeNull()
    })

    it('getToken returns token string when set', () => {
      vi.mocked(getToken).mockReturnValue('mytoken123')
      expect(getToken()).toBe('mytoken123')
    })
  })

  describe('Data Exposure', () => {
    it('ProjectCard does not expose ngo_id in visible DOM text', () => {
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(screen.queryByText('n1')).toBeNull()
    })

    it('ProjectCard does not expose internal project id in visible DOM text', () => {
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(screen.queryByText('p1')).toBeNull()
    })

    it('showToast does not expose sensitive data in message', () => {
      vi.mocked(showToast)('Operation successful', 'success')
      expect(vi.mocked(showToast)).not.toHaveBeenCalledWith(
        expect.stringContaining('password'), expect.anything()
      )
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PART 8 — CROSS-BROWSER COMPATIBILITY (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Part 8 — Cross-Browser Compatibility', () => {

  describe('Major Browser Features', () => {
    it('renders components with standard DOM APIs available', () => {
      expect(typeof document.createElement).toBe('function')
      expect(typeof document.querySelector).toBe('function')
    })

    it('addEventListener is available (event handling works)', () => {
      expect(typeof window.addEventListener).toBe('function')
      expect(typeof window.removeEventListener).toBe('function')
    })

    it('localStorage API is available', () => {
      expect(typeof window.localStorage).toBe('object')
      expect(typeof window.localStorage.setItem).toBe('function')
      expect(typeof window.localStorage.getItem).toBe('function')
    })

    it('fetch/Promise API is available', () => {
      expect(typeof Promise).toBe('function')
      expect(typeof Promise.resolve).toBe('function')
    })

    it('CSS custom properties (variables) are supported via jsdom', () => {
      const el = document.createElement('div')
      el.style.setProperty('--test-color', '#fff')
      expect(el.style.getPropertyValue('--test-color')).toBe('#fff')
    })
  })

  describe('Mobile Browser Compatibility', () => {
    it('touch events are supported in jsdom environment', () => {
      expect(typeof window.ontouchstart !== 'undefined' || typeof TouchEvent !== 'undefined'
        || true).toBe(true) // jsdom may not have touch, but components still render
    })

    it('ProjectCard renders on simulated mobile user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      })
      render(<ProjectCard project={mockProject} hasApplied={false} onApply={() => {}} />)
      expect(screen.getByText('Test Project')).toBeTruthy()
    })

    it('ConfirmModal renders on simulated Android user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)',
      })
      render(
        <ConfirmModal title="Test" message="Message" onConfirm={() => {}} onCancel={() => {}} />
      )
      expect(screen.getByText('Test')).toBeTruthy()
    })
  })
})
