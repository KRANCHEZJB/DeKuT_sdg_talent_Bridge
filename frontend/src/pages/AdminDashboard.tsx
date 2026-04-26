import React, { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useFetch } from '../hooks/useFetch'
import { useInactivityLogout } from '../hooks/useInactivityLogout'
import {
  getAdminDashboard, getStudentQueue, getOrgQueue,
  getProjectQueue, getIpQueue, getAuditLog,
  listStudents, listOrganizations,
  verifyStudent, approveOrganization, approveProject,
  recordIp, approveShowcase, rejectPersonalProject, bulkVerifyStudents,
  getAdminImpact,
  showToast,
  getAllDisputes, resolveDispute,
  getAllLetterRequests, reviewLetterRequest,
  getAllBootcamps, verifyBootcamp,
  getAwardCategories, createAwardCategory, issueAward, getAwards,
  getPendingCertificates, issueCertificate,
  getAdminAdoptionRequests, createAdoptionAgreement, signAgreement,
  getAdminReceipts, verifyReceipt, createReimbursementObligation, getAdminReimbursements,
  suspendUser, banUser, reactivateUser, adminCloseProject,
  scoreApplication, scorePersonalProject, getAllScores, getUnscoredApplications,
  getUserAuditLog, cancelDeletion, purgeUser, processScheduledDeletions,
} from '../api/api'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import type { AdminDashboardStats, StudentProfile, NgoProfile, Project, PersonalProject, AuditLog } from '../types/index'

const TAB_CONFIG = [
  { key: 'overview',      label: 'Overview',        icon: '📊' },
  { key: 'students',      label: 'Student Queue',    icon: '🎓' },
  { key: 'organizations', label: 'Org Queue',        icon: '🏢' },
  { key: 'projects',      label: 'Project Queue',    icon: '📁' },
  { key: 'ip',            label: 'IP Queue',         icon: '💡' },
  { key: 'all_students',  label: 'All Students',     icon: '👥' },
  { key: 'all_orgs',      label: 'All Orgs',         icon: '🌍' },
  { key: 'user_mgmt',     label: 'User Management',  icon: '🛡️' },
  { key: 'disputes',      label: 'Disputes',         icon: '⚖️' },
  { key: 'certificates',  label: 'Certificates',     icon: '🏆' },
  { key: 'adoptions',     label: 'Adoptions',        icon: '🤝' },
  { key: 'reimbursements', label: 'Reimbursements',   icon: '💰' },
  { key: 'letters',       label: 'Rec. Letters',     icon: '📄' },
  { key: 'bootcamps',     label: 'Bootcamps',        icon: '🎓' },
  { key: 'awards',        label: 'Awards',           icon: '🏅' },
  { key: 'scoring',       label: 'Scoring',          icon: '⭐' },
  { key: 'impact',        label: 'Impact Dashboard', icon: '📈' },
  { key: 'audit',         label: 'Audit Log',        icon: '📋' },
]

const ITEMS_PER_PAGE = 10

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const { unreadCount, refresh: refreshNotifs } = useNotifications()
  useInactivityLogout(30)

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; onConfirm: () => void; danger?: boolean
  } | null>(null)

  // ── Rejection reason modal state ──────────────────────────────────────────
  const [rejectModal, setRejectModal] = useState<{
    title: string;
    onConfirm: (reason: string) => void;
  } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Detail view state ─────────────────────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<NgoProfile | null>(null)

  // ── Search state ──────────────────────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState('')
  const [orgSearch, setOrgSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [allStudentSearch, setAllStudentSearch] = useState('')
  const [allOrgSearch, setAllOrgSearch] = useState('')
  const [allStudentStatusFilter, setAllStudentStatusFilter] = useState('all')
  const [allStudentVerifiedFilter, setAllStudentVerifiedFilter] = useState('all')
  const [allOrgStatusFilter, setAllOrgStatusFilter] = useState('all')
  const [allOrgApprovalFilter, setAllOrgApprovalFilter] = useState('all')
  const [userMgmtSearch, setUserMgmtSearch] = useState('')
  const [userMgmtRole, setUserMgmtRole] = useState('all')
  const [userMgmtStatus, setUserMgmtStatus] = useState('all')
  const [userMgmtPage, setUserMgmtPage] = useState(1)
  const [userMgmtLoading, setUserMgmtLoading] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')

  // ── Pagination state ──────────────────────────────────────────────────────
  const [studentPage, setStudentPage] = useState(1)
  const [orgPage, setOrgPage] = useState(1)
  const [projectPage, setProjectPage] = useState(1)
  const [allStudentPage, setAllStudentPage] = useState(1)
  const [allOrgPage, setAllOrgPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: stats, loading: statsLoading, refetch: refetchStats } =
    useFetch<AdminDashboardStats>(s => getAdminDashboard(s), [activeTab === 'overview'])
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date())
  React.useEffect(() => {
    if (activeTab !== 'overview') return
    const interval = setInterval(() => {
      refetchStats()
      setLastRefreshed(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [activeTab])

  const { data: studentQueue, loading: sqLoading, refetch: refetchSQ } =
    useFetch<StudentProfile[]>(s => getStudentQueue(s), [activeTab === 'students'])

  const { data: orgQueue, loading: oqLoading, refetch: refetchOQ } =
    useFetch<NgoProfile[]>(s => getOrgQueue(s), [activeTab === 'organizations'])

  const { data: projectQueue, loading: pqLoading, refetch: refetchPQ } =
    useFetch<Project[]>(s => getProjectQueue(s), [activeTab === 'projects'])

  const { data: ipQueue, loading: ipLoading, refetch: refetchIP } =
    useFetch<PersonalProject[]>(s => getIpQueue(s), [activeTab === 'ip'])

  const { data: allStudents, loading: asLoading } =
    useFetch<StudentProfile[]>(s => listStudents(s), [activeTab === 'all_students'])

  const { data: allOrgs, loading: aoLoading } =
    useFetch<NgoProfile[]>(s => listOrganizations(s), [activeTab === 'all_orgs'])

  const { data: auditData, loading: auditLoading } =
    useFetch<{ logs: AuditLog[] }>(s => getAuditLog(s), [activeTab === 'audit'])

  const { data: impactData, loading: impactLoading } =
    useFetch<any>(s => getAdminImpact(s), [activeTab === 'impact'])
  const { data: scores, loading: scoresLoading, refetch: refetchScores } = useFetch<any[]>(s => getAllScores(s), [activeTab === 'scoring'])
  const { data: unscored, loading: unscoredLoading, refetch: refetchUnscored } = useFetch<any[]>(s => getUnscoredApplications(s), [activeTab === 'scoring'])

  // ── Filtered + paginated data ─────────────────────────────────────────────
  const filteredStudentQueue = useMemo(() =>
    (studentQueue || []).filter(s =>
      `${s.display_name} ${s.registration_number} ${s.course} ${s.school}`
        .toLowerCase().includes(studentSearch.toLowerCase())
    ), [studentQueue, studentSearch])

  const filteredOrgQueue = useMemo(() =>
    (orgQueue || []).filter(o =>
      `${o.organization_name} ${o.organization_type} ${o.country}`
        .toLowerCase().includes(orgSearch.toLowerCase())
    ), [orgQueue, orgSearch])

  const filteredProjectQueue = useMemo(() =>
    (projectQueue || []).filter(p =>
      `${p.project_name} ${p.sdg_focus} ${p.location}`
        .toLowerCase().includes(projectSearch.toLowerCase())
    ), [projectQueue, projectSearch])

  const filteredAllStudents = useMemo(() =>
    (allStudents || []).filter(s =>
      `${s.display_name} ${s.registration_number} ${s.course} ${s.school}`.toLowerCase().includes(allStudentSearch.toLowerCase()) &&
      (allStudentStatusFilter === 'all' || (s as any).status === allStudentStatusFilter || (!(s as any).status && allStudentStatusFilter === 'active')) &&
      (allStudentVerifiedFilter === 'all' || (allStudentVerifiedFilter === 'verified' ? s.is_verified : !s.is_verified))
    ), [allStudents, allStudentSearch, allStudentStatusFilter, allStudentVerifiedFilter])

  const filteredAllOrgs = useMemo(() =>
    (allOrgs || []).filter(o =>
      `${o.organization_name} ${o.organization_type} ${o.country}`.toLowerCase().includes(allOrgSearch.toLowerCase()) &&
      (allOrgStatusFilter === 'all' || (o as any).status === allOrgStatusFilter || (!(o as any).status && allOrgStatusFilter === 'active')) &&
      (allOrgApprovalFilter === 'all' || o.approval_status === allOrgApprovalFilter)
    ), [allOrgs, allOrgSearch, allOrgStatusFilter, allOrgApprovalFilter])

  const filteredAudit = useMemo(() =>
    (auditData?.logs || []).filter(l =>
      `${l.admin_name} ${l.action} ${l.target_type}`
        .toLowerCase().includes(auditSearch.toLowerCase())
    ), [auditData, auditSearch])

  const paginate = <T,>(arr: T[], page: number) =>
    arr.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const totalPages = (arr: any[]) => Math.ceil(arr.length / ITEMS_PER_PAGE)

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleVerifyStudent = async (studentId: string) => {
    try {
      await verifyStudent(studentId)
      showToast('Student verified successfully', 'success')
      refetchSQ(); refetchStats()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not verify student', 'error')
    }
  }

  const handleBulkVerify = async () => {
    try {
      await bulkVerifyStudents(selectedStudents)
      showToast(`${selectedStudents.length} students verified`, 'success')
      setSelectedStudents([])
      refetchSQ(); refetchStats()
    } catch {
      showToast('Bulk verify failed', 'error')
    }
  }

  const handleOrgAction = async (orgId: string, action: string, reason?: string) => {
    try {
      await approveOrganization(orgId, { action, rejection_reason: reason })
      showToast(`Organisation ${action}d successfully`, 'success')
      refetchOQ(); refetchStats()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Action failed', 'error')
    }
  }

  const handleProjectAction = async (projectId: string, action: string, reason?: string) => {
    try {
      await approveProject(projectId, { action, rejection_reason: reason })
      showToast(`Project ${action}d successfully`, 'success')
      refetchPQ(); refetchStats()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Action failed', 'error')
    }
  }

  const handleRecordIp = async (projectId: string) => {
    try {
      await recordIp(projectId)
      showToast('IP reference recorded', 'success')
      refetchIP()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not record IP', 'error')
    }
  }

  const handleApproveShowcase = async (projectId: string) => {
    try {
      await approveShowcase(projectId)
      showToast('Project approved for showcase', 'success')
      refetchIP()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not approve showcase', 'error')
    }
  }
  const handleRejectPersonalProject = async (projectId: string, reason: string) => {
    try {
      await rejectPersonalProject(projectId, reason)
      showToast('Project rejected', 'success')
      refetchIP()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not reject project', 'error')
    }
  }

  const toggleStudent = (id: string) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#0D1628',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '20px',
  }

  const actionBtn = (color: string, bg: string): React.CSSProperties => ({
    background: bg,
    border: `1px solid ${color}40`,
    color,
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s ease',
  })

  const searchInput: React.CSSProperties = {
    background: '#0D1628',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#F1F5F9',
    padding: '10px 16px',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    width: '100%',
    maxWidth: '360px',
    outline: 'none',
    marginBottom: '16px',
  }

  // ── Pagination component ──────────────────────────────────────────────────
  const Pagination = ({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) => {
    if (total <= 1) return null
    return (
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          style={{ ...actionBtn('#94A3B8', 'rgba(148,163,184,0.1)'), opacity: page === 1 ? 0.4 : 1 }}>
          ← Prev
        </button>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>Page {page} of {total}</span>
        <button onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total}
          style={{ ...actionBtn('#94A3B8', 'rgba(148,163,184,0.1)'), opacity: page === total ? 0.4 : 1 }}>
          Next →
        </button>
      </div>
    )
  }

  // ── Detail Modal ──────────────────────────────────────────────────────────
  const StudentDetailModal = ({ student }: { student: StudentProfile }) => {
    const [auditLogs, setAuditLogs] = React.useState<any[]>([])
    const [auditLoading, setAuditLoading] = React.useState(true)
    React.useEffect(() => {
      getUserAuditLog((student as any).user_id).then(r => setAuditLogs(r.data?.logs || [])).catch(() => {}).finally(() => setAuditLoading(false))
    }, [student])
    const status = (student as any).status || 'active'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...card, maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>{student.display_name}</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#60B4F0', background: 'rgba(96,180,240,0.1)', border: '1px solid rgba(96,180,240,0.3)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>🎓 Student</span>
                {status === 'active' && <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 700, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '2px 8px', borderRadius: '999px' }}>✓ Active</span>}
                {status === 'suspended' && <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '999px' }}>⏸ Suspended</span>}
                {status === 'banned' && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '999px' }}>🚫 Banned</span>}
              </div>
            </div>
            <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              ['Registration No.', student.registration_number],
              ['School', student.school],
              ['Course', student.course],
              ['Year of Study', student.year_of_study],
              ['Graduation Year', student.expected_graduation_year],
              ['Supervisor', student.supervisor_name],
              ['Engagement', student.engagement_status],
              ['Verified', student.is_verified ? '✅ Yes' : '❌ No'],
            ].map(([label, value]) => (
              <div key={label as string} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '13px', color: '#F1F5F9' }}>{value ?? '—'}</div>
              </div>
            ))}
          </div>
          {student.skills?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {student.skills.map(sk => <span key={sk} style={{ background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.2)', color: '#4ADE80', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{sk}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {status !== 'suspended' && status !== 'banned' && (
              <button onClick={async () => { if (!window.confirm(`Suspend ${student.display_name}?`)) return; try { await suspendUser((student as any).user_id); showToast('User suspended', 'warning'); setSelectedStudent(null); } catch { showToast('Failed', 'error') } }} style={actionBtn('#F59E0B', 'rgba(245,158,11,0.1)')}>⏸ Suspend</button>
            )}
            {status !== 'banned' && (
              <button onClick={async () => { if (!window.confirm(`Permanently ban ${student.display_name}?`)) return; try { await banUser((student as any).user_id); showToast('User banned', 'error'); setSelectedStudent(null); } catch { showToast('Failed', 'error') } }} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🚫 Ban</button>
            )}
            {(status === 'suspended' || status === 'banned') && (
              <button onClick={async () => { if (!window.confirm(`Reactivate ${student.display_name}?`)) return; try { await reactivateUser((student as any).user_id); showToast('User reactivated', 'success'); setSelectedStudent(null); } catch { showToast('Failed', 'error') } }} style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}>✅ Reactivate</button>
            )}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>Audit Trail</div>
            {auditLoading ? <div style={{ color: '#94A3B8', fontSize: '13px' }}>Loading...</div> : !auditLogs.length ? (
              <div style={{ color: '#64748B', fontSize: '13px' }}>No admin actions recorded for this user.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {auditLogs.map((log: any) => (
                  <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9', textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ')}</span>
                      {log.old_status && <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '8px' }}>{log.old_status} → {log.new_status}</span>}
                      {log.notes && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{log.notes}</div>}
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>by {log.admin_name}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const OrgDetailModal = ({ org }: { org: NgoProfile }) => {
    const [auditLogs, setAuditLogs] = React.useState<any[]>([])
    const [auditLoading, setAuditLoading] = React.useState(true)
    React.useEffect(() => {
      getUserAuditLog((org as any).user_id).then(r => setAuditLogs(r.data?.logs || [])).catch(() => {}).finally(() => setAuditLoading(false))
    }, [org])
    const status = (org as any).status || 'active'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...card, maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>{org.organization_name}</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#FDB913', background: 'rgba(253,185,19,0.1)', border: '1px solid rgba(253,185,19,0.3)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>🏢 NGO</span>
                {status === 'active' && <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 700, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '2px 8px', borderRadius: '999px' }}>✓ Active</span>}
                {status === 'suspended' && <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '999px' }}>⏸ Suspended</span>}
                {status === 'banned' && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '999px' }}>🚫 Banned</span>}
              </div>
            </div>
            <button onClick={() => setSelectedOrg(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              ['Type', org.organization_type],
              ['Country', org.country],
              ['Email', org.primary_email],
              ['Website', org.website || '—'],
              ['Phone', org.contact_phone || '—'],
              ['Approval Status', org.approval_status],
            ].map(([label, value]) => (
              <div key={label as string} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '13px', color: '#F1F5F9' }}>{value ?? '—'}</div>
              </div>
            ))}
          </div>
          {org.mission_statement && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Mission</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>{org.mission_statement}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {status !== 'suspended' && status !== 'banned' && (
              <button onClick={async () => { if (!window.confirm(`Suspend ${org.organization_name}?`)) return; try { await suspendUser((org as any).user_id); showToast('User suspended', 'warning'); setSelectedOrg(null); } catch { showToast('Failed', 'error') } }} style={actionBtn('#F59E0B', 'rgba(245,158,11,0.1)')}>⏸ Suspend</button>
            )}
            {status !== 'banned' && (
              <button onClick={async () => { if (!window.confirm(`Permanently ban ${org.organization_name}?`)) return; try { await banUser((org as any).user_id); showToast('User banned', 'error'); setSelectedOrg(null); } catch { showToast('Failed', 'error') } }} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🚫 Ban</button>
            )}
            {(status === 'suspended' || status === 'banned') && (
              <button onClick={async () => { if (!window.confirm(`Reactivate ${org.organization_name}?`)) return; try { await reactivateUser((org as any).user_id); showToast('User reactivated', 'success'); setSelectedOrg(null); } catch { showToast('Failed', 'error') } }} style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}>✅ Reactivate</button>
            )}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>Audit Trail</div>
            {auditLoading ? <div style={{ color: '#94A3B8', fontSize: '13px' }}>Loading...</div> : !auditLogs.length ? (
              <div style={{ color: '#64748B', fontSize: '13px' }}>No admin actions recorded for this organisation.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {auditLogs.map((log: any) => (
                  <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9', textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ')}</span>
                      {log.old_status && <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '8px' }}>{log.old_status} → {log.new_status}</span>}
                      {log.notes && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{log.notes}</div>}
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>by {log.admin_name}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Reject reason modal ───────────────────────────────────────────────────
  const RejectModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ ...card, maxWidth: '460px', width: '100%' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#FC8181', marginBottom: '12px' }}>{rejectModal?.title}</h3>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>Please provide a reason for rejection:</p>
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="Enter rejection reason..."
          rows={4}
          style={{ width: '100%', background: '#060D1F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#F1F5F9', padding: '12px', fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button onClick={() => { setRejectModal(null); setRejectReason('') }}
            style={actionBtn('#94A3B8', 'rgba(148,163,184,0.1)')}>Cancel</button>
          <button
            onClick={() => {
              if (!rejectReason.trim()) { showToast('Please enter a reason', 'error'); return }
              rejectModal?.onConfirm(rejectReason.trim())
              setRejectModal(null); setRejectReason('')
            }}
            style={actionBtn('#FC8181', 'rgba(229,62,62,0.15)')}>
            ✗ Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  )

  // ── Render tabs ───────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>System Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => { refetchStats(); setLastRefreshed(new Date()) }}
            disabled={statsLoading}
            style={{ fontSize: '12px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: statsLoading ? '#64748B' : '#94A3B8', cursor: statsLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {statsLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
      {statsLoading ? <LoadingSpinner /> : !stats ? (
        <EmptyState icon="📊" title="No stats available" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px' }}>
          {[
            { label: 'Total Students',       value: stats.total_students,       color: '#60B4F0' },
            { label: 'Pending Verification', value: stats.pending_verification, color: '#FDB913' },
            { label: 'Total Organizations',  value: stats.total_organizations,  color: '#4ADE80' },
            { label: 'Pending Approval',     value: stats.pending_approval,     color: '#FDB913' },
            { label: 'Total Projects',       value: stats.total_projects,       color: '#60B4F0' },
            { label: 'Open Projects',        value: stats.open_projects,        color: '#4ADE80' },
            { label: 'Total Applications',   value: stats.total_applications,   color: '#A78BFA' },
            { label: 'Open Disputes',        value: stats.open_disputes,        color: '#FC8181' },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: s.color, marginBottom: '6px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderStudentQueue = () => {
    const filtered = filteredStudentQueue
    const paged = paginate(filtered, studentPage)
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>
            Student Verification Queue {studentQueue && `(${filtered.length})`}
          </h2>
          {selectedStudents.length > 0 && (
            <button onClick={() => setConfirmModal({ title: `Bulk Verify ${selectedStudents.length} Students`, message: `Verify all ${selectedStudents.length} selected students?`, onConfirm: handleBulkVerify })}
              style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>
              ✓ Verify Selected ({selectedStudents.length})
            </button>
          )}
        </div>
        <input style={searchInput} placeholder="🔍 Search by name, reg no, course..." value={studentSearch}
          onChange={e => { setStudentSearch(e.target.value); setStudentPage(1) }} />
        {sqLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="🎓" title="No results" description={studentSearch ? 'Try a different search' : 'Queue is empty'} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paged.map(s => (
                <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '3px' }}>
                        {s.display_name}
                        {s.is_verified && <span style={{ marginLeft: '8px', background: 'rgba(0,166,81,0.15)', color: '#4ADE80', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>✓ Auto-verified</span>}
                      </p>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>{s.registration_number} · {s.course} · {s.school}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge status={s.engagement_status} size="sm" />
                    <button onClick={() => setSelectedStudent(s)} style={actionBtn('#60B4F0', 'rgba(96,180,240,0.1)')}>👁 View</button>
                    {s.status !== 'suspended' && s.status !== 'banned' && (
                      <button onClick={async () => { if (!window.confirm('Suspend this user?')) return; try { await suspendUser(s.user_id); showToast('User suspended', 'warning'); } catch { showToast('Failed to suspend', 'error') } }} style={actionBtn('#F59E0B', 'rgba(245,158,11,0.1)')}>⏸ Suspend</button>
                    )}
                    {s.status !== 'banned' && (
                      <button onClick={async () => { if (!window.confirm('Permanently ban this user?')) return; try { await banUser(s.user_id); showToast('User banned', 'error'); } catch { showToast('Failed to ban', 'error') } }} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🚫 Ban</button>
                    )}
                    {(s.status === 'suspended' || s.status === 'banned') && (
                      <button onClick={async () => { if (!window.confirm('Reactivate this user?')) return; try { await reactivateUser(s.user_id); showToast('User reactivated', 'success'); } catch { showToast('Failed to reactivate', 'error') } }} style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}>✅ Reactivate</button>
                    )}
                    <button onClick={() => setConfirmModal({ title: 'Verify Student', message: `Verify ${s.display_name}? They will be able to apply to projects.`, onConfirm: () => handleVerifyStudent(s.id) })}
                      style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>✓ Verify</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={studentPage} total={totalPages(filtered)} onPage={setStudentPage} />
          </>
        )}
      </div>
    )
  }

  const renderOrgQueue = () => {
    const filtered = filteredOrgQueue
    const paged = paginate(filtered, orgPage)
    return (
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px' }}>
          Organisation Approval Queue {orgQueue && `(${filtered.length})`}
        </h2>
        <input style={searchInput} placeholder="🔍 Search by name, type, country..." value={orgSearch}
          onChange={e => { setOrgSearch(e.target.value); setOrgPage(1) }} />
        {oqLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="🏢" title="No results" description={orgSearch ? 'Try a different search' : 'Queue is empty'} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paged.map(org => (
                <div key={org.id} style={{ ...card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', color: '#F1F5F9', marginBottom: '4px' }}>{org.organization_name}</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>{org.organization_type} · {org.country} · {org.primary_email}</p>
                    </div>
                    <StatusBadge status={org.approval_status} size="sm" />
                  </div>
                  <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '14px' }}>{org.mission_statement}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => setSelectedOrg(org)} style={actionBtn('#60B4F0', 'rgba(96,180,240,0.1)')}>👁 View Details</button>
                    <button onClick={() => setConfirmModal({ title: 'Approve Organisation', message: `Approve ${org.organization_name}?`, onConfirm: () => handleOrgAction(org.id, 'approve') })}
                      style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>✓ Approve</button>
                    <button onClick={() => handleOrgAction(org.id, 'more_info')}
                      style={actionBtn('#FDB913', 'rgba(253,185,19,0.15)')}>? More Info</button>
                    <button onClick={() => setRejectModal({ title: `Reject ${org.organization_name}`, onConfirm: (reason) => handleOrgAction(org.id, 'reject', reason) })}
                      style={actionBtn('#FC8181', 'rgba(229,62,62,0.15)')}>✗ Reject</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={orgPage} total={totalPages(filtered)} onPage={setOrgPage} />
          </>
        )}
      </div>
    )
  }

  const renderProjectQueue = () => {
    const filtered = filteredProjectQueue
    const paged = paginate(filtered, projectPage)
    return (
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px' }}>
          Project Approval Queue {projectQueue && `(${filtered.length})`}
        </h2>
        <input style={searchInput} placeholder="🔍 Search by name, SDG, location..." value={projectSearch}
          onChange={e => { setProjectSearch(e.target.value); setProjectPage(1) }} />
        {pqLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="📁" title="No results" description={projectSearch ? 'Try a different search' : 'Queue is empty'} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paged.map(p => (
                <div key={p.id} style={{ ...card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', color: '#F1F5F9', marginBottom: '4px' }}>{p.project_name}</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>{p.sdg_focus} · {p.location} · {p.duration_weeks} weeks · {p.participation_type === 'team' ? `Team ${p.team_size_min}–${p.team_size_max}` : 'Individual'}</p>
                    </div>
                    <StatusBadge status={p.project_status} size="sm" />
                  </div>
                  <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '14px' }}>{p.description}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => setConfirmModal({ title: 'Approve Project', message: `Approve "${p.project_name}"? It will be visible to students.`, onConfirm: () => handleProjectAction(p.id, 'approve') })}
                      style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>✓ Approve</button>
                    <button onClick={() => setRejectModal({ title: `Reject "${p.project_name}"`, onConfirm: (reason) => handleProjectAction(p.id, 'reject', reason) })}
                      style={actionBtn('#FC8181', 'rgba(229,62,62,0.15)')}>✗ Reject</button>
                    {p.project_status !== 'closed' && (
                      <button onClick={async () => { if (!window.confirm(`Close "${p.project_name}"?`)) return; try { const res = await adminCloseProject(p.id); const n = res.data?.applications_withdrawn || 0; showToast(n > 0 ? `Project closed. ${n} application(s) withdrawn.` : 'Project closed.', 'warning'); refetchPQ() } catch { showToast('Failed to close project', 'error') } }} style={actionBtn('#F59E0B', 'rgba(245,158,11,0.1)')}>🔒 Close</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={projectPage} total={totalPages(filtered)} onPage={setProjectPage} />
          </>
        )}
      </div>
    )
  }

  const renderIpQueue = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
        IP & Showcase Queue {ipQueue && `(${ipQueue.length})`}
      </h2>
      {ipLoading ? <LoadingSpinner /> : !ipQueue?.length ? (
        <EmptyState icon="💡" title="Queue is empty" description="No personal projects awaiting review" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ipQueue.map(p => (
            <div key={p.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#F1F5F9', marginBottom: '4px' }}>{p.title}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {p.sdg_focus}{p.ip_reference && ` · IP: ${p.ip_reference}`}{p.is_commercially_sensitive && ' · 🔒 Commercially Sensitive'}
                  </p>
                </div>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '8px' }}>{p.problem_statement}</p>
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '8px' }}><span style={{ color: '#60B4F0', fontWeight: 600 }}>Solution: </span>{p.solution_description}</p>
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '10px' }}><span style={{ color: '#4ADE80', fontWeight: 600 }}>Outcome: </span>{p.outcome}</p>
              {p.technologies?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                  {p.technologies.map((t: string) => (
                    <span key={t} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
              {p.evidence_urls?.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  {p.evidence_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: '#4ADE80', fontSize: '12px', display: 'block', marginBottom: '4px', wordBreak: 'break-all' }}>🔗 {url}</a>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {p.status === 'submitted' && (
                  <button onClick={() => setConfirmModal({ title: 'Record IP', message: `Record IP reference for "${p.title}"?`, onConfirm: () => handleRecordIp(p.id) })}
                    style={actionBtn('#A78BFA', 'rgba(167,139,250,0.15)')}>📝 Record IP</button>
                )}
                {(p.status === 'ip_recorded' || p.status === 'submitted') && (
                  <button onClick={() => setConfirmModal({ title: 'Approve for Showcase', message: `Add "${p.title}" to the public showcase?`, onConfirm: () => handleApproveShowcase(p.id) })}
                    style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>🌟 Approve Showcase</button>
                )}
                {(p.status === 'submitted' || p.status === 'ip_recorded') && (
                  <button onClick={() => setRejectModal({ title: `Reject "${p.title}"`, onConfirm: (reason) => handleRejectPersonalProject(p.id, reason) })}
                    style={actionBtn('#FC8181', 'rgba(229,62,62,0.15)')}>❌ Reject</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAllStudents = () => {
    const filtered = filteredAllStudents
    const paged = paginate(filtered, allStudentPage)
    return (
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px' }}>
          All Students {allStudents && `(${filtered.length})`}
        </h2>
        <input style={searchInput} placeholder="🔍 Search students..." value={allStudentSearch}
          onChange={e => { setAllStudentSearch(e.target.value); setAllStudentPage(1) }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
          {[['all','All Status'],['active','Active'],['suspended','Suspended'],['banned','Banned']].map(([val,lbl]) => (
            <button key={val} onClick={() => { setAllStudentStatusFilter(val); setAllStudentPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${allStudentStatusFilter===val?'rgba(96,180,240,0.4)':'rgba(255,255,255,0.1)'}`, background: allStudentStatusFilter===val?'rgba(96,180,240,0.15)':'rgba(255,255,255,0.03)', color: allStudentStatusFilter===val?'#60B4F0':'#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lbl}</button>
          ))}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {[['all','All'],['verified','Verified'],['unverified','Unverified']].map(([val,lbl]) => (
            <button key={val} onClick={() => { setAllStudentVerifiedFilter(val); setAllStudentPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${allStudentVerifiedFilter===val?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.1)'}`, background: allStudentVerifiedFilter===val?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.03)', color: allStudentVerifiedFilter===val?'#4ADE80':'#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lbl}</button>
          ))}
          {(allStudentStatusFilter !== 'all' || allStudentVerifiedFilter !== 'all') && (
            <button onClick={() => { setAllStudentStatusFilter('all'); setAllStudentVerifiedFilter('all'); setAllStudentPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>✕ Clear filters</button>
          )}
        </div>
        {asLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="👥" title="No students found" />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {paged.map(s => (
                <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '2px' }}>{s.display_name}</p>
                    <p style={{ fontSize: '12px', color: '#94A3B8' }}>{s.registration_number} · {s.course} · {s.school}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {s.is_verified && <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 600 }}>✓ Verified</span>}
                    <StatusBadge status={s.engagement_status} size="sm" />
                    {s.status === 'suspended' && <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '999px' }}>⏸ Suspended</span>}
                    {s.status === 'banned' && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '999px' }}>🚫 Banned</span>}
                    <button onClick={() => setSelectedStudent(s)} style={actionBtn('#60B4F0', 'rgba(96,180,240,0.1)')}>👁 View</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={allStudentPage} total={totalPages(filtered)} onPage={setAllStudentPage} />
          </>
        )}
      </div>
    )
  }

  const renderAllOrgs = () => {
    const filtered = filteredAllOrgs
    const paged = paginate(filtered, allOrgPage)
    return (
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px' }}>
          All Organisations {allOrgs && `(${filtered.length})`}
        </h2>
        <input style={searchInput} placeholder="🔍 Search organisations..." value={allOrgSearch}
          onChange={e => { setAllOrgSearch(e.target.value); setAllOrgPage(1) }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
          {[['all','All Status'],['active','Active'],['suspended','Suspended'],['banned','Banned']].map(([val,lbl]) => (
            <button key={val} onClick={() => { setAllOrgStatusFilter(val); setAllOrgPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${allOrgStatusFilter===val?'rgba(96,180,240,0.4)':'rgba(255,255,255,0.1)'}`, background: allOrgStatusFilter===val?'rgba(96,180,240,0.15)':'rgba(255,255,255,0.03)', color: allOrgStatusFilter===val?'#60B4F0':'#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lbl}</button>
          ))}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {[['all','All Approval'],['approved','Approved'],['pending','Pending'],['rejected','Rejected']].map(([val,lbl]) => (
            <button key={val} onClick={() => { setAllOrgApprovalFilter(val); setAllOrgPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${allOrgApprovalFilter===val?'rgba(253,185,19,0.4)':'rgba(255,255,255,0.1)'}`, background: allOrgApprovalFilter===val?'rgba(253,185,19,0.15)':'rgba(255,255,255,0.03)', color: allOrgApprovalFilter===val?'#FDB913':'#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lbl}</button>
          ))}
          {(allOrgStatusFilter !== 'all' || allOrgApprovalFilter !== 'all') && (
            <button onClick={() => { setAllOrgStatusFilter('all'); setAllOrgApprovalFilter('all'); setAllOrgPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>✕ Clear filters</button>
          )}
        </div>
        {aoLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="🌍" title="No organisations found" />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {paged.map(org => (
                <div key={org.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '2px' }}>{org.organization_name}</p>
                    <p style={{ fontSize: '12px', color: '#94A3B8' }}>{org.organization_type} · {org.country}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge status={org.approval_status} size="sm" />
                    <button onClick={() => setSelectedOrg(org)} style={actionBtn('#60B4F0', 'rgba(96,180,240,0.1)')}>👁 View</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={allOrgPage} total={totalPages(filtered)} onPage={setAllOrgPage} />
          </>
        )}
      </div>
    )
  }

const [disputes, setDisputes] = useState<any[]>([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [resolutionInputs, setResolutionInputs] = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const loadDisputes = async () => {
    setDisputesLoading(true)
    try { const res = await getAllDisputes(); setDisputes(res.data || []) }
    catch { /* ignore */ }
    finally { setDisputesLoading(false) }
  }
  const handleResolve = async (disputeId: string) => {
    const notes = resolutionInputs[disputeId]
    if (!notes?.trim()) return alert('Please enter resolution notes.')
    setResolvingId(disputeId)
    try { await resolveDispute(disputeId, notes); await loadDisputes(); setResolutionInputs(p => ({ ...p, [disputeId]: '' })) }
    catch { alert('Failed to resolve dispute.') }
    finally { setResolvingId(null) }
  }
  React.useEffect(() => { loadDisputes() }, [])

  const loadAllUsers = async () => {
    setUserMgmtLoading(true)
    try {
      const [studentsRes, orgsRes] = await Promise.allSettled([listStudents(), listOrganizations()])
      const students = studentsRes.status === 'fulfilled' ? (studentsRes.value.data || []).map((s: any) => ({ ...s, _role: 'student', _name: s.display_name, _email: s.user?.email || '', _sub: `${s.registration_number} · ${s.school}` })) : []
      const orgs = orgsRes.status === 'fulfilled' ? (orgsRes.value.data || []).map((o: any) => ({ ...o, _role: 'ngo', _name: o.organization_name, _email: o.primary_email, _sub: `${o.organization_type} · ${o.country}` })) : []
      setAllUsers([...students, ...orgs])
    } catch { showToast('Failed to load users', 'error') }
    finally { setUserMgmtLoading(false) }
  }
  React.useEffect(() => { if (activeTab === 'user_mgmt') loadAllUsers() }, [activeTab])
  const renderDisputes = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>⚖️ Disputes</h2>
        <button onClick={loadDisputes} style={{ fontSize: '12px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>🔄 Refresh</button>
      </div>
      {disputesLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>Loading disputes...</div>
      ) : disputes.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
          <p style={{ color: '#94A3B8' }}>No disputes found</p>
        </div>
      ) : disputes.map(d => (
        <div key={d.id} style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '15px' }}>{d.dispute_type}</span>
              <span style={{ marginLeft: '10px', fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: d.status === 'resolved' ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', color: d.status === 'resolved' ? '#4ADE80' : '#FBBF24' }}>{d.status}</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748B' }}>{new Date(d.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '12px' }}>{d.description}</p>
          {d.resolution_notes && (
            <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#4ADE80', marginBottom: '12px' }}>
              <strong>Resolution:</strong> {d.resolution_notes}
            </div>
          )}
          {d.status === 'open' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input value={resolutionInputs[d.id] || ''} onChange={e => setResolutionInputs(p => ({ ...p, [d.id]: e.target.value }))}
                placeholder="Enter resolution notes..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', outline: 'none' }} />
              <button onClick={() => handleResolve(d.id)} disabled={resolvingId === d.id}
                style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#4ADE80,#22C55E)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '13px', opacity: resolvingId === d.id ? 0.6 : 1 }}>
                {resolvingId === d.id ? '⏳' : '✅ Resolve'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderImpact = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '24px' }}>📈 Impact Dashboard</h2>
      {impactLoading ? <LoadingSpinner /> : !impactData ? (
        <EmptyState icon="📈" title="No impact data available" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px' }}>
          {[
            { label: 'Total Students',          value: impactData.total_students,         color: '#60B4F0' },
            { label: 'Verified Students',        value: impactData.verified_students,      color: '#4ADE80' },
            { label: 'Total Organizations',      value: impactData.total_organizations,    color: '#60B4F0' },
            { label: 'Approved Organizations',   value: impactData.approved_organizations, color: '#4ADE80' },
            { label: 'Total Projects',           value: impactData.total_projects,         color: '#A78BFA' },
            { label: 'Completed Projects',       value: impactData.completed_projects,     color: '#4ADE80' },
            { label: 'Total Applications',       value: impactData.total_applications,     color: '#FDB913' },
            { label: 'Officially Complete',      value: impactData.officially_complete,    color: '#4ADE80' },
            { label: 'Personal Projects',        value: impactData.personal_projects,      color: '#A78BFA' },
            { label: 'IP Recorded',              value: impactData.ip_recorded,            color: '#60B4F0' },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: s.color, marginBottom: '6px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAuditLog = () => {
    const filtered = filteredAudit
    const paged = paginate(filtered, auditPage)
    return (
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px' }}>Audit Log</h2>
        <input style={searchInput} placeholder="🔍 Search by admin, action..." value={auditSearch}
          onChange={e => { setAuditSearch(e.target.value); setAuditPage(1) }} />
        {auditLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="📋" title="No audit entries found" />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {paged.map(log => (
                <div key={log.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9', marginBottom: '3px' }}>
                      <span style={{ color: '#60B4F0' }}>{log.admin_name}</span>{' → '}
                      <span style={{ color: '#FDB913' }}>{log.action.replace(/_/g, ' ')}</span>
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {log.target_type} · {log.target_id?.slice(0, 8)}...
                      {log.old_status && ` · ${log.old_status} → ${log.new_status}`}
                      {log.notes && ` · "${log.notes}"`}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <Pagination page={auditPage} total={totalPages(filtered)} onPage={setAuditPage} />
          </>
        )}
      </div>
    )
  }
const [letters, setLetters] = useState<any[]>([])
  const [lettersLoading, setLettersLoading] = useState(false)
  const [pdfInputs, setPdfInputs] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const loadLetters = async () => {
    setLettersLoading(true)
    try { const res = await getAllLetterRequests(); setLetters(res.data || []) }
    catch { /* ignore */ }
    finally { setLettersLoading(false) }
  }
  const handleReviewLetter = async (letterId: string, action: string) => {
    setReviewingId(letterId)
    try {
      await reviewLetterRequest(letterId, action, pdfInputs[letterId])
      await loadLetters()
    } catch { alert('Failed to review letter.') }
    finally { setReviewingId(null) }
  }
  React.useEffect(() => { loadLetters() }, [])
  const renderLetters = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>📄 Recommendation Letters</h2>
        <button onClick={loadLetters} style={{ fontSize: '12px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>🔄 Refresh</button>
      </div>
      {lettersLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>Loading...</div>
      ) : letters.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <p style={{ color: '#94A3B8' }}>No letter requests found</p>
        </div>
      ) : letters.map(l => (
        <div key={l.id} style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '14px' }}>📄 Letter Request</span>
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
              background: l.status === 'approved' ? 'rgba(74,222,128,0.1)' : l.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
              color: l.status === 'approved' ? '#4ADE80' : l.status === 'rejected' ? '#EF4444' : '#FBBF24' }}>
              {l.status}
            </span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '12px' }}><strong>Purpose:</strong> {l.purpose}</p>
          <p style={{ color: '#64748B', fontSize: '11px', marginBottom: '12px' }}>{new Date(l.created_at).toLocaleDateString()}</p>
          {l.pdf_url && (
            <a href={l.pdf_url} target="_blank" rel="noreferrer"
              style={{ fontSize: '13px', color: '#60B4F0', display: 'block', marginBottom: '12px' }}>
              📎 View PDF
            </a>
          )}
          {l.status === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input value={pdfInputs[l.id] || ''} onChange={e => setPdfInputs(p => ({ ...p, [l.id]: e.target.value }))}
                placeholder="PDF URL (optional)"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleReviewLetter(l.id, 'approved')} disabled={reviewingId === l.id}
                  style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg,#4ADE80,#22C55E)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '13px', opacity: reviewingId === l.id ? 0.6 : 1 }}>
                  ✅ Approve
                </button>
                <button onClick={() => handleReviewLetter(l.id, 'rejected')} disabled={reviewingId === l.id}
                  style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', fontWeight: 600, cursor: 'pointer', fontSize: '13px', opacity: reviewingId === l.id ? 0.6 : 1 }}>
                  ❌ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
const [allBootcamps, setAllBootcamps] = useState<any[]>([])
  const [bootcampsLoading, setBootcampsLoading] = useState(false)
  const [allAwards, setAllAwards] = useState<any[]>([])
  const [awardCategories, setAwardCategories] = useState<any[]>([])
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [adminReceipts, setAdminReceipts] = React.useState<any[]>([])
  const [adminReimbursements, setAdminReimbursements] = React.useState<any[]>([])
  const [receiptFilter, setReceiptFilter] = React.useState('pending')
  const [disputeReason, setDisputeReason] = React.useState<{[id:string]:string}>({})
  const [dueDateMap, setDueDateMap] = React.useState<{[appId:string]:string}>({})
  const [processingReceipt, setProcessingReceipt] = React.useState<string|null>(null)
  const [creatingObligation, setCreatingObligation] = React.useState<string|null>(null)
  const loadReimbursements = async () => {
    try {
      const [rRes, oRes] = await Promise.all([getAdminReceipts(receiptFilter), getAdminReimbursements()])
      setAdminReceipts(rRes.data || [])
      setAdminReimbursements(oRes.data || [])
    } catch {}
  }
  const handleVerifyReceipt = async (id: string, action: string) => {
    const reason = disputeReason[id] || ''
    if (action === 'dispute' && !reason.trim()) { showToast('Enter dispute reason','error'); return }
    setProcessingReceipt(id)
    try {
      await verifyReceipt(id, action, action==='dispute'?reason:undefined)
      showToast(action==='approve'?'Receipt verified!':'Receipt disputed','success')
      loadReimbursements()
    } catch (err:any) { showToast(err.response?.data?.detail||'Error','error') }
    finally { setProcessingReceipt(null) }
  }
  const handleCreateObligation = async (appId: string) => {
    const due = dueDateMap[appId]
    if (!due) { showToast('Select a due date','error'); return }
    setCreatingObligation(appId)
    try {
      const res = await createReimbursementObligation(appId, due)
      showToast(`Obligation created: ${res.data.total} total`,'success')
      loadReimbursements()
    } catch (err:any) { showToast(err.response?.data?.detail||'Error','error') }
    finally { setCreatingObligation(null) }
  }
  const [adoptionRequests, setAdoptionRequests] = React.useState<any[]>([])
  const [agreeFormId, setAgreeFormId] = React.useState<string | null>(null)
  const [agreeForm, setAgreeForm] = React.useState({ rights_granted_text: '', rights_excluded_text: '', credit_requirement: '', compensation_amount: '', payment_deadline: '' })
  const [submittingAgree, setSubmittingAgree] = React.useState(false)
  const loadAdoptions = async () => {
    try { const res = await getAdminAdoptionRequests(); setAdoptionRequests(res.data) } catch {}
  }
  const handleCreateAgreement = async () => {
    if (!agreeFormId) return
    if (!agreeForm.rights_granted_text.trim() || !agreeForm.rights_excluded_text.trim() || !agreeForm.credit_requirement.trim() || !agreeForm.compensation_amount) {
      showToast('Please fill all required fields', 'error'); return
    }
    setSubmittingAgree(true)
    try {
      await createAdoptionAgreement(agreeFormId, {
        rights_granted_text: agreeForm.rights_granted_text,
        rights_excluded_text: agreeForm.rights_excluded_text,
        credit_requirement: agreeForm.credit_requirement,
        compensation_amount: parseFloat(agreeForm.compensation_amount),
        payment_deadline: agreeForm.payment_deadline || null
      })
      showToast('Agreement created and parties notified!', 'success')
      setAgreeFormId(null)
      setAgreeForm({ rights_granted_text: '', rights_excluded_text: '', credit_requirement: '', compensation_amount: '', payment_deadline: '' })
      loadAdoptions()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not create agreement', 'error')
    } finally { setSubmittingAgree(false) }
  }
  const handleAdminSign = async (agreementId: string) => {
    try {
      await signAgreement(agreementId)
      showToast('Agreement signed!', 'success')
      loadAdoptions()
    } catch (err: any) { showToast(err.response?.data?.detail || 'Could not sign', 'error') }
  }
  const [awardForm, setAwardForm] = useState({ category_id: '', winner_student_id: '', award_period: '', cash_amount: '', certificate_url: '' })
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', track: 'personal', frequency: 'semester' })
  const [submittingAward, setSubmittingAward] = useState(false)
  const [submittingCategory, setSubmittingCategory] = useState(false)

  const loadBootcamps = async () => {
    setBootcampsLoading(true)
    try { const res = await getAllBootcamps(); setAllBootcamps(res.data || []) }
    catch { /* ignore */ } finally { setBootcampsLoading(false) }
  }
  const loadAwards = async () => {
    try {
      const [awardsRes, catsRes] = await Promise.all([getAwards(), getAwardCategories()])
      setAllAwards(awardsRes.data || [])
      setAwardCategories(catsRes.data || [])
    } catch { /* ignore */ }
  }
  const handleVerifyBootcamp = async (id: string) => {
    try { await verifyBootcamp(id); await loadBootcamps() }
    catch { alert('Failed to verify bootcamp.') }
  }
  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return alert('Name required.')
    setSubmittingCategory(true)
    try { await createAwardCategory(categoryForm); await loadAwards(); setCategoryForm({ name: '', description: '', track: 'individual', frequency: 'monthly' }) }
    catch { alert('Failed to create category.') } finally { setSubmittingCategory(false) }
  }
  const handleIssueAward = async () => {
    if (!awardForm.category_id || !awardForm.winner_student_id || !awardForm.award_period) return alert('Please fill required fields.')
    setSubmittingAward(true)
    try {
      await issueAward({ ...awardForm, cash_amount: awardForm.cash_amount ? parseFloat(awardForm.cash_amount) : 0 })
      await loadAwards()
      setAwardForm({ category_id: '', winner_student_id: '', award_period: '', cash_amount: '', certificate_url: '' })
    } catch { alert('Failed to issue award.') } finally { setSubmittingAward(false) }
  }
  React.useEffect(() => { loadBootcamps(); loadAwards() }, [])

  const renderBootcamps = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>🎓 Bootcamps</h2>
        <button onClick={loadBootcamps} style={{ fontSize: '12px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>🔄 Refresh</button>
      </div>
      {bootcampsLoading ? <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>Loading...</div>
      : allBootcamps.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '40px' }}>🎓</p>
          <p style={{ color: '#94A3B8' }}>No bootcamps submitted yet</p>
        </div>
      ) : allBootcamps.map(b => (
        <div key={b.id} style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{b.title}</span>
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: b.admin_verified ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', color: b.admin_verified ? '#4ADE80' : '#FBBF24' }}>
              {b.admin_verified ? '✅ Verified' : '⏳ Pending'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>🏢 {b.ngo_name || 'Unknown NGO'} · 📁 {b.project_name || 'Unknown Project'}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>📅 {b.scheduled_date} · 👥 {b.max_attendees} max · {b.delivery_mode}</div>
          {!b.admin_verified && (
            <button onClick={() => handleVerifyBootcamp(b.id)}
              style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#4ADE80,#22C55E)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
              ✅ Verify
            </button>
          )}
        </div>
      ))}
    </div>
  )
  const renderAwards = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>🏅 Awards</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowIssueForm(p => !p)} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#FDB913,#F59E0B)", border: "none", borderRadius: "8px", color: "#000", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>+ Issue Award</button>
          <button onClick={() => setShowCategoryForm(p => !p)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#F1F5F9", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>+ Create Category</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "6px" }}>🏆 Total Awards</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#F1F5F9" }}>{allAwards.length}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "6px" }}>📋 Categories</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#F1F5F9" }}>{awardCategories.length}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "6px" }}>💰 Total Cash Given</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#4ADE80" }}>KES {allAwards.reduce((s: number, a: any) => s + (a.cash_amount || 0), 0).toLocaleString()}</div>
        </div>
      </div>
      {showIssueForm && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9", marginBottom: "14px" }}>Issue Award</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <select value={awardForm.category_id} onChange={e => setAwardForm(p => ({...p, category_id: e.target.value}))} style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }}>
              <option value="">Select Category *</option>
              {awardCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={awardForm.winner_student_id} onChange={e => setAwardForm(p => ({...p, winner_student_id: e.target.value}))} style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }}>
              <option value="">Select Winner Student *</option>
              {(allStudents || []).map((s: any) => (<option key={s.id} value={s.id}>{s.display_name || s.id}</option>))}
            </select>
            <input value={awardForm.award_period} onChange={e => setAwardForm(p => ({...p, award_period: e.target.value}))} placeholder="Award Period * (e.g. SEM 2.3)" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }} />
            <input value={awardForm.cash_amount} onChange={e => setAwardForm(p => ({...p, cash_amount: e.target.value}))} placeholder="Cash Amount (KES)" type="number" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }} />
          </div>
          <button onClick={handleIssueAward} disabled={submittingAward} style={{ marginTop: "12px", padding: "8px 16px", background: "linear-gradient(135deg,#FDB913,#F59E0B)", border: "none", borderRadius: "8px", color: "#000", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>{submittingAward ? "⏳" : "🏅 Issue Award"}</button>
        </div>
      )}
      {showCategoryForm && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9", marginBottom: "14px" }}>Create Award Category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input value={categoryForm.name} onChange={e => setCategoryForm(p => ({...p, name: e.target.value}))} placeholder="Category name *" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }} />
            <input value={categoryForm.description} onChange={e => setCategoryForm(p => ({...p, description: e.target.value}))} placeholder="Description" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }} />
            <select value={categoryForm.track} onChange={e => setCategoryForm(p => ({...p, track: e.target.value}))} style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }}><option value="personal">Personal</option><option value="team">Team</option><option value="ngo">NGO</option><option value="both">Both</option></select>
            <select value={categoryForm.frequency} onChange={e => setCategoryForm(p => ({...p, frequency: e.target.value}))} style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "13px", outline: "none" }}><option value="semester">Semester</option><option value="annual">Annual</option><option value="special">Special</option></select>
          </div>
          <button onClick={handleCreateCategory} disabled={submittingCategory} style={{ marginTop: "12px", padding: "8px 16px", background: "linear-gradient(135deg,#A78BFA,#7C3AED)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>{submittingCategory ? "⏳" : "➕ Create Category"}</button>
        </div>
      )}
      <div>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9", marginBottom: "16px" }}>All Awards ({allAwards.length})</h3>
        {allAwards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "#94A3B8" }}><p style={{ fontSize: "40px" }}>🏅</p><p>No awards issued yet</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {allAwards.map((a: any) => (
              <div key={a.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg,#FDB913,transparent)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(253,185,19,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏆</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: "14px" }}>{a.category_name || "Award"}</div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>{a.student_name || "Unknown"}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "999px", background: "rgba(74,222,128,0.1)", color: "#4ADE80" }}>✓ Active</span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "10px" }}>🗓 {a.award_period}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(167,139,250,0.15)", color: "#A78BFA" }}>🏅 All</span>
                  {a.cash_amount > 0 && <span style={{ fontSize: "13px", fontWeight: 700, color: "#4ADE80" }}>KES {a.cash_amount.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
  const [pendingCerts, setPendingCerts] = React.useState<any[]>([])
  const [loadingCerts, setLoadingCerts] = React.useState(false)
  const [issuingCert, setIssuingCert] = React.useState<string | null>(null)
  const loadPendingCerts = async () => {
    setLoadingCerts(true)
    try {
      const res = await getPendingCertificates()
      setPendingCerts(res.data)
    } catch {}
    finally { setLoadingCerts(false) }
  }

  const handleIssueCertificate = async (appId: string) => {
    setIssuingCert(appId)
    try {
      await issueCertificate(appId)
      setPendingCerts(p => p.filter(c => c.application_id !== appId))
    } catch {}
    finally { setIssuingCert(null) }
  }

  React.useEffect(() => { if (activeTab === 'certificates') loadPendingCerts() }, [activeTab])
  React.useEffect(() => { if (activeTab === 'adoptions') loadAdoptions() }, [activeTab])
  React.useEffect(() => { if (activeTab === 'reimbursements') loadReimbursements() }, [activeTab, receiptFilter])
  const renderCertificates = () => {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>🏆 Pending Certificates</h1>
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>Completions approved by NGOs awaiting certificate issuance</p>
          </div>
          <button onClick={loadPendingCerts} style={{ background: 'rgba(96,180,240,0.1)', border: '1px solid rgba(96,180,240,0.2)', color: '#60B4F0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>🔄 Refresh</button>
        </div>
        {loadingCerts ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>⏳ Loading...</div>
        ) : pendingCerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <p style={{ fontWeight: 600 }}>No pending certificates</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>All completions have been processed</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingCerts.map(cert => (
              <div key={cert.application_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{cert.student_name}</h3>
                    <p style={{ color: '#94A3B8', fontSize: '13px' }}>{cert.student_reg} · {cert.project_name}</p>
                    <p style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>NGO: {cert.ngo_name}</p>
                  </div>
                  <button onClick={() => handleIssueCertificate(cert.application_id)} disabled={issuingCert === cert.application_id}
                    style={{ background: 'linear-gradient(135deg,#A78BFA,#7C3AED)', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', opacity: issuingCert === cert.application_id ? 0.6 : 1 }}>
                    {issuingCert === cert.application_id ? '⏳ Issuing...' : '🏆 Issue Certificate'}
                  </button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#94A3B8', marginBottom: '10px' }}>
                  <p style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: '4px' }}>Work Description:</p>
                  <p>{cert.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#64748B' }}>
                  {cert.hours_worked && <span>⏱ {cert.hours_worked} hours</span>}
                  {cert.deliverable_url && <a href={cert.deliverable_url} target="_blank" rel="noreferrer" style={{ color: '#60B4F0' }}>🔗 View Deliverable</a>}
                  {cert.submitted_at && <span>📅 {new Date(cert.submitted_at).toLocaleDateString()}</span>}
                  {cert.ngo_feedback && <span style={{ color: '#4ADE80' }}>💬 NGO: {cert.ngo_feedback}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  const renderUserMgmt = () => {
    const filtered = allUsers.filter(u => {
      const matchSearch = !userMgmtSearch || u._name?.toLowerCase().includes(userMgmtSearch.toLowerCase()) || u._email?.toLowerCase().includes(userMgmtSearch.toLowerCase())
      const matchRole = userMgmtRole === 'all' || u._role === userMgmtRole
      const matchStatus = userMgmtStatus === 'all' || u.status === userMgmtStatus
      return matchSearch && matchRole && matchStatus
    })
    const paged = paginate(filtered, userMgmtPage)
    const allPageSelected = paged.length > 0 && paged.every((u: any) => bulkSelected.includes(u.user_id))
    const toggleAll = () => {
      const pageIds = paged.map((u: any) => u.user_id)
      if (allPageSelected) setBulkSelected(prev => prev.filter(id => !pageIds.includes(id)))
      else setBulkSelected(prev => [...new Set([...prev, ...pageIds])])
    }
    const toggleOne = (uid: string) => setBulkSelected(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
    const handleBulkAction = async (action: 'suspend' | 'ban' | 'reactivate') => {
      if (!bulkSelected.length) return
      const labels = { suspend: 'suspend', ban: 'permanently ban', reactivate: 'reactivate' }
      if (!window.confirm(`${labels[action].charAt(0).toUpperCase() + labels[action].slice(1)} ${bulkSelected.length} selected user(s)?`)) return
      setBulkLoading(true)
      const fn = action === 'suspend' ? suspendUser : action === 'ban' ? banUser : reactivateUser
      const results = await Promise.allSettled(bulkSelected.map(id => fn(id)))
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      if (succeeded) showToast(`${succeeded} user(s) ${action === 'suspend' ? 'suspended' : action === 'ban' ? 'banned' : 'reactivated'}${failed ? `, ${failed} failed` : ''}`, action === 'reactivate' ? 'success' : 'warning')
      else showToast('All actions failed', 'error')
      setBulkSelected([])
      setBulkLoading(false)
      loadAllUsers()
    }
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>User Management ({filtered.length})</h2>
          <button onClick={loadAllUsers} style={{ fontSize: '12px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>
        <input style={searchInput} placeholder="🔍 Search by name or email..." value={userMgmtSearch} onChange={e => { setUserMgmtSearch(e.target.value); setUserMgmtPage(1) }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
          {[['all','All Roles'],['student','Students'],['ngo','NGOs']].map(([val,lbl]) => (
            <button key={val} onClick={() => { setUserMgmtRole(val); setUserMgmtPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${userMgmtRole===val?'rgba(96,180,240,0.4)':'rgba(255,255,255,0.1)'}`, background: userMgmtRole===val?'rgba(96,180,240,0.15)':'rgba(255,255,255,0.03)', color: userMgmtRole===val?'#60B4F0':'#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lbl}</button>
          ))}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {[['all','All Status'],['active','Active'],['suspended','Suspended'],['banned','Banned']].map(([val,lbl]) => (
            <button key={val} onClick={() => { setUserMgmtStatus(val); setUserMgmtPage(1) }}
              style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${userMgmtStatus===val?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.1)'}`, background: userMgmtStatus===val?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.03)', color: userMgmtStatus===val?'#4ADE80':'#94A3B8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lbl}</button>
          ))}
        </div>
        {bulkSelected.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(96,180,240,0.07)', border: '1px solid rgba(96,180,240,0.2)', borderRadius: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#60B4F0', fontWeight: 600 }}>{bulkSelected.length} user(s) selected</span>
            <button onClick={() => handleBulkAction('suspend')} disabled={bulkLoading} style={actionBtn('#F59E0B', 'rgba(245,158,11,0.1)')}>⏸ Bulk Suspend</button>
            <button onClick={() => handleBulkAction('ban')} disabled={bulkLoading} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🚫 Bulk Ban</button>
            <button onClick={() => handleBulkAction('reactivate')} disabled={bulkLoading} style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}>✅ Bulk Reactivate</button>
            <button onClick={() => setBulkSelected([])} style={{ fontSize: '12px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
            {bulkLoading && <span style={{ fontSize: '12px', color: '#94A3B8' }}>Processing...</span>}
          </div>
        )}
        {userMgmtLoading ? <LoadingSpinner /> : !paged.length ? (
          <EmptyState icon="🛡️" title="No users found" />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '6px' }}>
              <input type="checkbox" checked={allPageSelected} onChange={toggleAll} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#60B4F0' }} />
              <span style={{ fontSize: '12px', color: '#64748B' }}>Select all on this page</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {paged.map((u: any) => (
                <div key={u.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', border: bulkSelected.includes(u.user_id) ? '1px solid rgba(96,180,240,0.4)' : '1px solid rgba(255,255,255,0.06)', background: bulkSelected.includes(u.user_id) ? 'rgba(96,180,240,0.05)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={bulkSelected.includes(u.user_id)} onChange={() => toggleOne(u.user_id)} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#60B4F0' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9' }}>{u._name}</p>
                        <span style={{ fontSize: '11px', color: u._role==='student'?'#60B4F0':'#FDB913', background: u._role==='student'?'rgba(96,180,240,0.1)':'rgba(253,185,19,0.1)', border: `1px solid ${u._role==='student'?'rgba(96,180,240,0.3)':'rgba(253,185,19,0.3)'}`, padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>{u._role === 'student' ? '🎓 Student' : '🏢 NGO'}</span>
                        {(!u.status || u.status === 'active') && <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 700, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '2px 8px', borderRadius: '999px' }}>✓ Active</span>}
                        {u.status === 'suspended' && <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: '999px' }}>⏸ Suspended</span>}
                        {u.status === 'banned' && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '999px' }}>🚫 Banned</span>}
                        {u.deletion_scheduled_at && (() => {
                          const days = Math.max(0, Math.ceil((new Date(u.deletion_scheduled_at).getTime() - Date.now()) / 86400000))
                          return <span style={{ fontSize: '11px', color: '#FC8181', fontWeight: 700, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '2px 8px', borderRadius: '999px' }}>🗑 Deletes in {days}d</span>
                        })()}
                      </div>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>{u._sub}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(!u.status || u.status === 'active') && (
                      <>
                        <button onClick={async () => { if (!window.confirm(`Suspend ${u._name}?`)) return; try { await suspendUser(u.user_id); showToast('User suspended', 'warning'); loadAllUsers() } catch { showToast('Failed to suspend', 'error') } }} style={actionBtn('#F59E0B', 'rgba(245,158,11,0.1)')}>⏸ Suspend</button>
                        <button onClick={async () => { if (!window.confirm(`Permanently ban ${u._name}?`)) return; try { await banUser(u.user_id); showToast('User banned', 'error'); loadAllUsers() } catch { showToast('Failed to ban', 'error') } }} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🚫 Ban</button>
                      </>
                    )}
                    {u.status === 'suspended' && (
                      <>
                        <button onClick={async () => { if (!window.confirm(`Reactivate ${u._name}?`)) return; try { await reactivateUser(u.user_id); showToast('User reactivated', 'success'); loadAllUsers() } catch { showToast('Failed to reactivate', 'error') } }} style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}>✅ Reactivate</button>
                        <button onClick={async () => { if (!window.confirm(`Permanently ban ${u._name}?`)) return; try { await banUser(u.user_id); showToast('User banned', 'error'); loadAllUsers() } catch { showToast('Failed to ban', 'error') } }} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🚫 Ban</button>
                      </>
                    )}
                    {u.status === 'banned' && (
                      <>
                        <button onClick={async () => { if (!window.confirm(`Reactivate ${u._name}?`)) return; try { await reactivateUser(u.user_id); showToast('User reactivated', 'success'); loadAllUsers() } catch { showToast('Failed to reactivate', 'error') } }} style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}>✅ Reactivate</button>
                        {u.deletion_scheduled_at && (
                          <button onClick={async () => { if (!window.confirm(`Cancel scheduled deletion for ${u._name}?`)) return; try { await cancelDeletion(u.user_id); showToast('Deletion cancelled', 'success'); loadAllUsers() } catch { showToast('Failed', 'error') } }} style={actionBtn('#60B4F0', 'rgba(96,180,240,0.1)')}>↩ Cancel Deletion</button>
                        )}
                        <button onClick={async () => { if (!window.confirm(`PERMANENTLY DELETE all data for ${u._name}? This cannot be undone.`)) return; try { await purgeUser(u.user_id); showToast('User permanently deleted', 'error'); loadAllUsers() } catch { showToast('Failed to purge', 'error') } }} style={actionBtn('#EF4444', 'rgba(239,68,68,0.1)')}>🗑 Purge Now</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={async () => { try { const res = await processScheduledDeletions(); showToast(`Processed: ${res.data.deleted_count} user(s) deleted`, res.data.deleted_count > 0 ? 'warning' : 'success'); loadAllUsers() } catch { showToast('Failed to process deletions', 'error') } }} style={{ fontSize: '12px', padding: '6px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#FC8181', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>🗑 Process Expired Deletions</button>
            </div>
            <Pagination page={userMgmtPage} total={totalPages(filtered)} onPage={setUserMgmtPage} />
          </>
        )}
      </div>
    )
  }


  const renderReimbursements = () => {
    const statusColor = (s: string) => ({ pending:'#FDB913', verified:'#4ADE80', disputed:'#FC8181' }[s]||'#94A3B8')
    const oStatusColor = (s: string) => ({ pending:'#FDB913', paid_pending_confirmation:'#60B4F0', settled:'#4ADE80' }[s]||'#94A3B8')
    // Group receipts by application_id to show "Create Obligation" per app
    const appGroups: Record<string, any[]> = {}
    adminReceipts.forEach((r:any) => {
      if (!appGroups[r.application_id]) appGroups[r.application_id] = []
      appGroups[r.application_id].push(r)
    })
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Funding & Reimbursements</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>Verify receipts and manage reimbursement obligations</p>
        </div>
        {/* Receipt filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['pending','verified','disputed'].map(f => (
            <button key={f} onClick={() => setReceiptFilter(f)}
              style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${receiptFilter===f?'#0A6EBD':'rgba(255,255,255,0.1)'}`, background: receiptFilter===f?'rgba(10,110,189,0.2)':'transparent', color: receiptFilter===f?'#60B4F0':'#94A3B8', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
        {/* Receipts */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Receipts</h3>
        {adminReceipts.length === 0 ? <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>No {receiptFilter} receipts.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {adminReceipts.map((r: any) => (
              <div key={r.id} style={{ background: '#132038', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{r.purpose}</p>
                    <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>{r.student_name} · {r.project_name} · {r.ngo_name} · {r.supplier_name} · {r.receipt_date}</p>
                    {r.receipt_image_url && <a href={r.receipt_image_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#A78BFA' }}>🔗 View</a>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>{r.currency} {Number(r.amount).toLocaleString()}</p>
                    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: `${statusColor(r.status)}22`, border: `1px solid ${statusColor(r.status)}44`, color: statusColor(r.status) }}>{r.status}</span>
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                    <button onClick={() => handleVerifyReceipt(r.id, 'approve')} disabled={processingReceipt===r.id}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#00A651', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>✅ Approve</button>
                    <input value={disputeReason[r.id]||''} onChange={e => setDisputeReason(p=>({...p,[r.id]:e.target.value}))} placeholder="Dispute reason..."
                      style={{ flex: 1, minWidth: '160px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: '#F1F5F9', fontSize: '12px', outline: 'none' }} />
                    <button onClick={() => handleVerifyReceipt(r.id, 'dispute')} disabled={processingReceipt===r.id}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'rgba(229,62,62,0.2)', color: '#FC8181', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>⚠️ Dispute</button>
                  </div>
                )}
                {r.dispute_reason && <p style={{ color: '#FC8181', fontSize: '12px', marginTop: '6px' }}>Reason: {r.dispute_reason}</p>}
              </div>
            ))}
          </div>
        )}
        {/* Create Obligations */}
        {receiptFilter === 'verified' && Object.keys(appGroups).length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Create Reimbursement Obligations</h3>
            {Object.entries(appGroups).map(([appId, receipts]) => {
              const total = receipts.reduce((s:number,r:any)=>s+Number(r.amount),0)
              const first = receipts[0]
              const hasObligation = adminReimbursements.some((o:any)=>o.application_id===appId)
              if (hasObligation) return null
              return (
                <div key={appId} style={{ background: '#132038', border: '1px solid rgba(253,185,19,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{first.project_name}</p>
                    <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>{first.student_name} · {receipts.length} receipt(s) · Total: {first.currency} {total.toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="date" value={dueDateMap[appId]||''} onChange={e => setDueDateMap(p=>({...p,[appId]:e.target.value}))}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: '#F1F5F9', fontSize: '12px', outline: 'none' }} />
                    <button onClick={() => handleCreateObligation(appId)} disabled={creatingObligation===appId}
                      style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#0A6EBD', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {creatingObligation===appId ? '⏳...' : '💰 Create Obligation'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* All Obligations */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>All Obligations</h3>
        {adminReimbursements.length === 0 ? <p style={{ color: '#94A3B8', fontSize: '13px' }}>No obligations yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {adminReimbursements.map((o:any) => (
              <div key={o.id} style={{ background: '#132038', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{o.project_name}</p>
                  <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>{o.student_name} ← {o.ngo_name} · due {o.due_date}</p>
                  {o.payment_reference && <p style={{ color: '#94A3B8', fontSize: '12px', margin: '2px 0 0' }}>ref: {o.payment_reference} via {o.payment_method}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>{o.currency} {Number(o.total_verified_amount).toLocaleString()}</p>
                  <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: `${oStatusColor(o.status)}22`, border: `1px solid ${oStatusColor(o.status)}44`, color: oStatusColor(o.status) }}>
                    {o.status === 'paid_pending_confirmation' ? '⏳ Awaiting Confirmation' : o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAdoptions = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Adoption Requests</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Review NGO adoption requests and create legal agreements</p>
      </div>
      {adoptionRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>No adoption requests yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {adoptionRequests.map((req: any) => (
            <div key={req.id} style={{ background: '#132038', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 4px' }}>{req.project_title}</h3>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>by {req.student_name} ({req.student_reg}) · {req.ngo_name}</p>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                  background: req.status === 'fully_executed' ? 'rgba(74,222,128,0.1)' : req.status === 'approved' ? 'rgba(96,180,240,0.1)' : 'rgba(253,185,19,0.1)',
                  border: `1px solid ${req.status === 'fully_executed' ? 'rgba(74,222,128,0.2)' : req.status === 'approved' ? 'rgba(96,180,240,0.2)' : 'rgba(253,185,19,0.2)'}`,
                  color: req.status === 'fully_executed' ? '#4ADE80' : req.status === 'approved' ? '#60B4F0' : '#FDB913' }}>
                  {req.status === 'fully_executed' ? '✅ Executed' : req.status === 'approved' ? '📋 Agreement Active' : '⏳ Pending'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '6px' }}><span style={{ color: '#60B4F0', fontWeight: 600 }}>Intended use: </span>{req.intended_use}</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '6px' }}>Level {req.adoption_level} · {req.deployment_scale} · Offered: {req.compensation_offered}</p>
              {req.has_agreement && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {[['Student', req.student_signed], ['NGO', req.ngo_signed], ['Admin', req.admin_signed]].map(([label, signed]) => (
                      <span key={label as string} style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: signed ? 'rgba(74,222,128,0.1)' : 'rgba(148,163,184,0.1)', border: `1px solid ${signed ? 'rgba(74,222,128,0.2)' : 'rgba(148,163,184,0.1)'}`, color: signed ? '#4ADE80' : '#94A3B8' }}>
                        {signed ? '✅' : '⏳'} {label as string}
                      </span>
                    ))}
                  </div>
                  {!req.admin_signed && (
                    <button onClick={() => handleAdminSign(req.agreement_id)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#00A651', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>✍️ Admin Sign</button>
                  )}
                </div>
              )}
              {!req.has_agreement && req.status === 'pending' && (
                <button onClick={() => setAgreeFormId(req.id)} style={{ marginTop: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0A6EBD', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700 }}>📋 Create Agreement</button>
              )}
            </div>
          ))}
        </div>
      )}
      {agreeFormId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#F1F5F9', fontWeight: 700, marginBottom: '20px', fontSize: '18px' }}>📋 Create Adoption Agreement</h3>
            {([['Rights Granted', 'rights_granted_text', 'What rights is the NGO granted?'], ['Rights Excluded', 'rights_excluded_text', 'What rights are explicitly excluded?'], ['Credit Requirement', 'credit_requirement', 'How must the student be credited?']] as [string,string,string][]).map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: '14px' }}>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>{label} *</label>
                <textarea rows={3} value={(agreeForm as any)[key]} onChange={e => setAgreeForm(p => ({...p, [key]: e.target.value}))} placeholder={ph}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#F1F5F9', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Compensation (KES) *</label>
                <input type="number" value={agreeForm.compensation_amount} onChange={e => setAgreeForm(p => ({...p, compensation_amount: e.target.value}))} placeholder="50000"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Payment Deadline</label>
                <input type="date" value={agreeForm.payment_deadline} onChange={e => setAgreeForm(p => ({...p, payment_deadline: e.target.value}))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setAgreeFormId(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleCreateAgreement} disabled={submittingAgree} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0A6EBD', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, opacity: submittingAgree ? 0.6 : 1 }}>
                {submittingAgree ? '⏳ Creating...' : '📋 Create Agreement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )



  // ── Scoring Tab ─────────────────────────────────────────────────────────────
  const [scoreForm, setScoreForm] = React.useState<Record<string, any>>({})
  const [scoreSubmitting, setScoreSubmitting] = React.useState<string | null>(null)

  const handleScoreSubmit = async (itemKey: string, item: any) => {
    const form = scoreForm[itemKey] || {}
    if (!form.admin_quality_score || !form.sdg_impact_score) {
      showToast('Admin quality score and SDG impact score are required', 'error'); return
    }
    setScoreSubmitting(itemKey)
    const payload = {
      admin_quality_score: Number(form.admin_quality_score),
      sdg_impact_score: Number(form.sdg_impact_score),
      peer_score: form.peer_score ? Number(form.peer_score) : undefined,
    }
    try {
      if (item.type === 'personal_project') {
        await scorePersonalProject(item.personal_project_id, payload)
      } else {
        await scoreApplication(item.application_id, payload)
      }
      showToast('Project scored successfully!', 'success')
      setScoreForm(prev => { const n = {...prev}; delete n[itemKey]; return n })
      refetchUnscored()
      refetchScores()
    } catch { showToast('Failed to score project', 'error') }
    finally { setScoreSubmitting(null) }
  }

  const renderScoring = (): React.ReactElement => {
    const cardStyle: React.CSSProperties = { background: '#0D1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
    const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
    const inputStyle: React.CSSProperties = { width: '72px', background: '#060D1F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F1F5F9', padding: '6px 10px', fontSize: '14px', fontFamily: 'Inter, sans-serif' }
    const btnStyle: React.CSSProperties = { background: 'linear-gradient(135deg,#0A6EBD,#00A651)', border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

    return (
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>⭐ Scoring</h2>

        {/* Unscored Applications */}
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#94A3B8', marginBottom: '16px' }}>
          Pending Score ({unscored?.length ?? 0})
        </h3>
        {unscoredLoading && <LoadingSpinner />}
        {!unscoredLoading && (!unscored || unscored.length === 0) && (
          <EmptyState icon="✅" message="All completed projects have been scored" />
        )}
        {(unscored || []).map((item: any) => {
          const fk = item.type === 'personal_project' ? item.personal_project_id : item.application_id
          const form = scoreForm[fk] || {}
          return (
            <div key={fk} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.project_name}</div>
                  <div style={{ color: '#94A3B8', fontSize: '13px', marginTop: '2px' }}>{item.student_name} · {item.student_reg}</div>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {item.type === 'personal_project' && <span style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>💡 Personal Project</span>}
                    {item.quality_rating && <span style={{ background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.2)', color: '#00A651', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>NGO Quality: {item.quality_rating}/10</span>}
                    <span style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#94A3B8', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>{item.status}</span>
                  </div>
                </div>
              </div>
              {item.outcome_summary && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#CBD5E1', marginBottom: '14px', lineHeight: 1.5 }}>
                  {item.outcome_summary}
                </div>
              )}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <div style={labelStyle}>Admin Quality (1–10) *</div>
                  <input type="number" min={1} max={10} style={inputStyle}
                    value={form.admin_quality_score || ''}
                    onChange={e => setScoreForm(prev => ({ ...prev, [fk]: { ...prev[fk], admin_quality_score: e.target.value } }))} />
                </div>
                <div>
                  <div style={labelStyle}>SDG Impact (1–10) *</div>
                  <input type="number" min={1} max={10} style={inputStyle}
                    value={form.sdg_impact_score || ''}
                    onChange={e => setScoreForm(prev => ({ ...prev, [fk]: { ...prev[fk], sdg_impact_score: e.target.value } }))} />
                </div>
                <div>
                  <div style={labelStyle}>Peer Score (1–10)</div>
                  <input type="number" min={1} max={10} style={inputStyle}
                    value={form.peer_score || ''}
                    onChange={e => setScoreForm(prev => ({ ...prev, [fk]: { ...prev[fk], peer_score: e.target.value } }))} />
                </div>
                <button style={btnStyle} disabled={scoreSubmitting === fk}
                  onClick={() => handleScoreSubmit(fk, item)}>
                  {scoreSubmitting === fk ? 'Saving...' : 'Submit Score'}
                </button>
              </div>
            </div>
          )
        })}

        {/* Scored Projects */}
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#94A3B8', margin: '32px 0 16px' }}>
          Scored Projects ({scores?.length ?? 0})
        </h3>
        {scoresLoading && <LoadingSpinner />}
        {!scoresLoading && (!scores || scores.length === 0) && (
          <EmptyState icon="📊" message="No scored projects yet" />
        )}
        {(scores || []).map((s: any) => (
          <div key={s.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.project_name}</div>
              <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>{s.student_name} · {s.type === 'personal_project' ? 'Personal Project' : 'Application'}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[
                  { label: 'NGO', val: s.ngo_rating_score },
                  { label: 'Outcome', val: s.outcome_score },
                  { label: 'Admin', val: s.admin_quality_score },
                  { label: 'SDG', val: s.sdg_impact_score },
                  { label: 'Peer', val: s.peer_score },
                ].map(({ label, val }) => val != null && (
                  <span key={label} style={{ background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.2)', color: '#60A5FA', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>
                    {label}: {val}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#00A651' }}>{s.total_score}<span style={{ fontSize: '14px', color: '#64748B' }}>/{s.max_score ?? 50}</span></div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{new Date(s.scored_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const TAB_RENDER: Record<string, () => React.ReactElement> = {
    overview:      renderOverview,
    students:      renderStudentQueue,
    organizations: renderOrgQueue,
    projects:      renderProjectQueue,
    ip:            renderIpQueue,
    all_students:  renderAllStudents,
    all_orgs:      renderAllOrgs,
    user_mgmt:     renderUserMgmt,
    disputes:      renderDisputes,

    certificates:  renderCertificates,
    adoptions:     renderAdoptions,
    reimbursements: renderReimbursements,
    letters:       renderLetters,
    bootcamps:     renderBootcamps,
    awards:        renderAwards,
    scoring:       renderScoring,
    impact:        renderImpact,
    audit:         renderAuditLog,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060D1F', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {rejectModal && <RejectModal />}
      {selectedStudent && <StudentDetailModal student={selectedStudent} />}
      {selectedOrg && <OrgDetailModal org={selectedOrg} />}

      {/* TOP NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', background: '#0D1628', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#0A6EBD,#00A651)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌍</div>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>DeKUT SDG</span>
          <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FC8181', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={refreshNotifs} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', position: 'relative', padding: '4px' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: '#E53E3E', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>
            )}
          </button>
          <span style={{ fontSize: '13px', color: '#94A3B8' }}>{user?.first_name} {user?.last_name}</span>
          <button onClick={logout} style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)', color: '#FC8181', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Logout</button>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside style={{ position: 'fixed', top: '60px', left: 0, bottom: 0, width: '220px', background: '#0D1628', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 12px', overflowY: 'auto', zIndex: 90 }}>
        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: '12px' }}>Admin Panel</div>
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.key
          const queueCounts: Record<string, number> = {
            students:      studentQueue?.length || 0,
            organizations: orgQueue?.length || 0,
            projects:      projectQueue?.length || 0,
            ip:            ipQueue?.length || 0,
            disputes:      stats?.open_disputes || 0,
          }
          const count = queueCounts[tab.key]
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#F1F5F9' : '#94A3B8', background: isActive ? '#132038' : 'transparent', borderLeft: isActive ? '3px solid #0A6EBD' : '3px solid transparent', textAlign: 'left', transition: 'all 0.15s ease', marginBottom: '2px', fontFamily: 'Inter, sans-serif' }}>
              <span>{tab.icon}</span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {count > 0 && <span style={{ background: 'rgba(253,185,19,0.2)', color: '#FDB913', padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>{count}</span>}
            </button>
          )
        })}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ marginLeft: '220px', marginTop: '60px', padding: '32px', minHeight: 'calc(100vh - 60px)' }}>
        {TAB_RENDER[activeTab]?.()}
      </main>
    </div>
  )
}
