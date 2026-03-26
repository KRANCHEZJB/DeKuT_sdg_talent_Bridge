import { FONTS, RADII } from '../styles/theme'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_MAP: Record<string, { color: string; bg: string; border: string; label: string }> = {
  // Application statuses
  applied:             { color: '#60B4F0', bg: 'rgba(10,110,189,0.15)',  border: 'rgba(10,110,189,0.3)',  label: 'Applied' },
  shortlisted:         { color: '#FDB913', bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', label: 'Shortlisted' },
  selected:            { color: '#4ADE80', bg: 'rgba(0,166,81,0.15)',   border: 'rgba(0,166,81,0.3)',   label: 'Selected' },
  rejected:            { color: '#FC8181', bg: 'rgba(229,62,62,0.15)',  border: 'rgba(229,62,62,0.3)',  label: 'Rejected' },
  completed:           { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', label: 'Completed' },
  officially_complete: { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', label: 'Complete' },

  // Project statuses
  open:               { color: '#4ADE80', bg: 'rgba(0,166,81,0.15)',   border: 'rgba(0,166,81,0.3)',   label: 'Open' },
  pending_approval:   { color: '#FDB913', bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', label: 'Pending Approval' },
  conditional:        { color: '#FDB913', bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', label: 'Conditional' },
  closed:             { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', label: 'Closed' },
  in_progress:        { color: '#60B4F0', bg: 'rgba(10,110,189,0.15)', border: 'rgba(10,110,189,0.3)',  label: 'In Progress' },

  // Org statuses
  approved:           { color: '#4ADE80', bg: 'rgba(0,166,81,0.15)',   border: 'rgba(0,166,81,0.3)',   label: 'Approved' },
  pending:            { color: '#FDB913', bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', label: 'Pending' },
  more_info_required: { color: '#FDB913', bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', label: 'More Info Needed' },

  // Profile statuses
  active:               { color: '#4ADE80', bg: 'rgba(0,166,81,0.15)',   border: 'rgba(0,166,81,0.3)',   label: 'Active' },
  pending_verification: { color: '#FDB913', bg: 'rgba(253,185,19,0.15)', border: 'rgba(253,185,19,0.3)', label: 'Pending Verification' },
  suspended:            { color: '#FC8181', bg: 'rgba(229,62,62,0.15)',  border: 'rgba(229,62,62,0.3)',  label: 'Suspended' },

  // IP statuses
  submitted:         { color: '#60B4F0', bg: 'rgba(10,110,189,0.15)',  border: 'rgba(10,110,189,0.3)',  label: 'Submitted' },
  ip_recorded:       { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', label: 'IP Recorded' },
  showcase_approved: { color: '#4ADE80', bg: 'rgba(0,166,81,0.15)',   border: 'rgba(0,166,81,0.3)',   label: 'On Showcase' },
}

const DEFAULT = { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', label: '' }

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const s = STATUS_MAP[status] || DEFAULT
  const label = s.label || status.replace(/_/g, ' ')

  return (
    <span style={{
      background:    s.bg,
      border:        `1px solid ${s.border}`,
      color:         s.color,
      padding:       size === 'sm' ? '3px 8px' : '5px 12px',
      borderRadius:  RADII.FULL,
      fontSize:      size === 'sm' ? FONTS.XS : FONTS.SM,
      fontWeight:    600,
      textTransform: 'capitalize',
      whiteSpace:    'nowrap',
      display:       'inline-flex',
      alignItems:    'center',
    }}>
      {label}
    </span>
  )
}
