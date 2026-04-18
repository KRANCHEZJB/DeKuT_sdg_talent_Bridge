/**
 * PART 1 — UI Components (Unit Testing) — 35 Tests
 * Tools: Vitest + React Testing Library
 * Goal: Validate each component in isolation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

// ─── IMPORTS ──────────────────────────────────────────────────────────────────
import LoadingSpinner       from '../components/LoadingSpinner'
import StatusBadge          from '../components/StatusBadge'
import EmptyState           from '../components/EmptyState'
import SkillTag             from '../components/SkillTag'
import ConfirmModal         from '../components/ConfirmModal'
import ProjectCard          from '../components/ProjectCard'
import ProjectCardSkeleton  from '../components/ProjectCardSkeleton'

// ─── MOCK PROJECT ─────────────────────────────────────────────────────────────
const mockProject = {
  id: 'proj-1',
  ngo_id: 'ngo-1',
  project_name: 'Clean Water Initiative',
  project_slug: 'clean-water',
  description: 'Provide clean water to rural communities using technology.',
  sdg_focus: 'SDG 6',
  skills_required: ['Python', 'React', 'GIS', 'Data Analysis', 'SQL'],
  location: 'Nairobi',
  is_remote: true,
  duration_weeks: 8,
  participation_type: 'individual' as const,
  team_size_min: 1,
  team_size_max: 1,
  technology_level: 'intermediate',
  requires_funding: false,
  project_status: 'open',
  rejection_reason: null,
  created_at: '2024-01-01T00:00:00Z',
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADINGSPINNER TESTS (7 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('LoadingSpinner', () => {
  it('renders with default message', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeTruthy()
  })

  it('renders without message when empty string passed', () => {
    render(<LoadingSpinner message="" />)
    expect(screen.queryByText('Loading...')).toBeNull()
  })

  it('renders small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    const spinner = container.querySelector('div > div')
    expect(spinner).toBeTruthy()
  })

  it('renders medium size by default', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('div > div')
    expect(spinner).toBeTruthy()
  })

  it('renders large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    const spinner = container.querySelector('div > div')
    expect(spinner).toBeTruthy()
  })

  it('renders spin animation style', () => {
    const { container } = render(<LoadingSpinner />)
    const style = container.querySelector('style')
    expect(style?.textContent).toContain('spin')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// STATUSBADGE TESTS (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('StatusBadge', () => {
  it('renders "Applied" for applied status', () => {
    render(<StatusBadge status="applied" />)
    expect(screen.getByText('Applied')).toBeTruthy()
  })

  it('renders "Open" for open status', () => {
    render(<StatusBadge status="open" />)
    expect(screen.getByText('Open')).toBeTruthy()
  })

  it('renders "Pending" for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeTruthy()
  })

  it('renders "Approved" for approved status', () => {
    render(<StatusBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeTruthy()
  })

  it('renders unknown status as formatted text', () => {
    render(<StatusBadge status="custom_status" />)
    expect(screen.getByText('custom status')).toBeTruthy()
  })

  it('renders small size variant', () => {
    const { container } = render(<StatusBadge status="open" size="sm" />)
    expect(container.firstChild).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTYSTATE TESTS (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('EmptyState', () => {
  it('renders icon and title', () => {
    render(<EmptyState icon="📭" title="No items found" />)
    expect(screen.getByText('📭')).toBeTruthy()
    expect(screen.getByText('No items found')).toBeTruthy()
  })

  it('renders description when provided', () => {
    render(<EmptyState icon="📭" title="Empty" description="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeTruthy()
  })

  it('does not render description when omitted', () => {
    render(<EmptyState icon="📭" title="Empty" />)
    expect(screen.queryByText('Nothing here yet')).toBeNull()
  })

  it('renders action button when actionLabel and onAction provided', () => {
    render(<EmptyState icon="📭" title="Empty" actionLabel="Add Item" onAction={() => {}} />)
    expect(screen.getByText('Add Item')).toBeTruthy()
  })

  it('does not render button when actionLabel is missing', () => {
    render(<EmptyState icon="📭" title="Empty" onAction={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls onAction when button is clicked', () => {
    const onAction = vi.fn()
    render(<EmptyState icon="📭" title="Empty" actionLabel="Click Me" onAction={onAction} />)
    fireEvent.click(screen.getByText('Click Me'))
    expect(onAction).toHaveBeenCalledOnce()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SKILLTAG TESTS (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('SkillTag', () => {
  it('renders skill name', () => {
    render(<SkillTag skill="Python" />)
    expect(screen.getByText('Python')).toBeTruthy()
  })

  it('renders remove button when onRemove provided', () => {
    render(<SkillTag skill="React" onRemove={() => {}} />)
    expect(screen.getByText('×')).toBeTruthy()
  })

  it('does not render remove button when onRemove omitted', () => {
    render(<SkillTag skill="React" />)
    expect(screen.queryByText('×')).toBeNull()
  })

  it('calls onRemove when × is clicked', () => {
    const onRemove = vi.fn()
    render(<SkillTag skill="React" onRemove={onRemove} />)
    fireEvent.click(screen.getByText('×'))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRMMODAL TESTS (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ConfirmModal', () => {
  const defaultProps = {
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title and message', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByText('Delete Item')).toBeTruthy()
    expect(screen.getByText('Are you sure you want to delete this?')).toBeTruthy()
  })

  it('renders default button labels', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByText('Confirm')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })

  it('renders custom button labels', () => {
    render(<ConfirmModal {...defaultProps} confirmLabel="Yes, Delete" cancelLabel="No, Keep" />)
    expect(screen.getByText('Yes, Delete')).toBeTruthy()
    expect(screen.getByText('No, Keep')).toBeTruthy()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(container.firstChild as Element)
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTCARD TESTS (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ProjectCard', () => {
  const defaultProps = {
    project: mockProject,
    hasApplied: false,
    onApply: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders project name', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText('Clean Water Initiative')).toBeTruthy()
  })

  it('renders project description', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText(/clean water to rural/i)).toBeTruthy()
  })

  it('renders Apply Now button when not applied', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText('Apply Now →')).toBeTruthy()
  })

  it('renders Applied state when hasApplied is true', () => {
    render(<ProjectCard {...defaultProps} hasApplied={true} />)
    expect(screen.getByText('✓ Applied')).toBeTruthy()
  })

  it('calls onApply when Apply Now clicked', () => {
    const onApply = vi.fn()
    render(<ProjectCard {...defaultProps} onApply={onApply} />)
    fireEvent.click(screen.getByText('Apply Now →'))
    expect(onApply).toHaveBeenCalledOnce()
  })

  it('shows +N more when skills exceed 4', () => {
    render(<ProjectCard {...defaultProps} />)
    expect(screen.getByText('+1 more')).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTCARDSKELETON TESTS (based on component existence)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ProjectCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProjectCardSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders multiple skeleton elements', () => {
    const { container } = render(<ProjectCardSkeleton />)
    const children = container.querySelectorAll('div')
    expect(children.length).toBeGreaterThan(2)
  })
})
