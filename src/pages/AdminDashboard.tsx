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
  recordIp, approveShowcase, bulkVerifyStudents,
  getAdminImpact,
  showToast,
  getAllDisputes, resolveDispute,
  getAllLetterRequests, reviewLetterRequest,
  getAllBootcamps, verifyBootcamp,
  getAwardCategories, createAwardCategory, issueAward, getAwards,
  getPendingCertificates, issueCertificate,
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
  { key: 'disputes',      label: 'Disputes',         icon: '⚖️' },
  { key: 'certificates',  label: 'Certificates',     icon: '🏆' },
  { key: 'letters',       label: 'Rec. Letters',     icon: '📄' },
  { key: 'bootcamps',     label: 'Bootcamps',        icon: '🎓' },
  { key: 'awards',        label: 'Awards',           icon: '🏅' },
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
      `${s.display_name} ${s.registration_number} ${s.course} ${s.school}`
        .toLowerCase().includes(allStudentSearch.toLowerCase())
    ), [allStudents, allStudentSearch])

  const filteredAllOrgs = useMemo(() =>
    (allOrgs || []).filter(o =>
      `${o.organization_name} ${o.organization_type} ${o.country}`
        .toLowerCase().includes(allOrgSearch.toLowerCase())
    ), [allOrgs, allOrgSearch])

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
  const StudentDetailModal = ({ student }: { student: StudentProfile }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ ...card, maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>{student.display_name}</h3>
          <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        {[
          ['Registration No.', student.registration_number],
          ['School', student.school],
          ['Course', student.course],
          ['Year of Study', student.year_of_study],
          ['Graduation Year', student.expected_graduation_year],
          ['Supervisor', student.supervisor_name],
          ['Status', student.engagement_status],
          ['Verified', student.is_verified ? '✅ Yes' : '❌ No'],
          ['Skills', (student.skills || []).join(', ') || 'None listed'],
          ['Bio', student.bio || 'No bio'],
        ].map(([label, value]) => (
          <div key={label as string} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '14px', color: '#F1F5F9' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )

  const OrgDetailModal = ({ org }: { org: NgoProfile }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ ...card, maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>{org.organization_name}</h3>
          <button onClick={() => setSelectedOrg(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        {[
          ['Type', org.organization_type],
          ['Country', org.country],
          ['Email', org.primary_email],
          ['Website', org.website || 'N/A'],
          ['Phone', org.contact_phone || 'N/A'],
          ['Status', org.approval_status],
          ['Mission', org.mission_statement],
        ].map(([label, value]) => (
          <div key={label as string} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '14px', color: '#F1F5F9' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )

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
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#F1F5F9' }}>System Overview</h2>
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
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '14px' }}>{p.problem_statement}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {p.status === 'submitted' && (
                  <button onClick={() => setConfirmModal({ title: 'Record IP', message: `Record IP reference for "${p.title}"?`, onConfirm: () => handleRecordIp(p.id) })}
                    style={actionBtn('#A78BFA', 'rgba(167,139,250,0.15)')}>📝 Record IP</button>
                )}
                {(p.status === 'ip_recorded' || p.status === 'submitted') && (
                  <button onClick={() => setConfirmModal({ title: 'Approve for Showcase', message: `Add "${p.title}" to the public showcase?`, onConfirm: () => handleApproveShowcase(p.id) })}
                    style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>🌟 Approve Showcase</button>
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

  const renderCertificates = () => {
    if (!loadingCerts && pendingCerts.length === 0) loadPendingCerts()
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
  const TAB_RENDER: Record<string, () => React.ReactElement> = {
    overview:      renderOverview,
    students:      renderStudentQueue,
    organizations: renderOrgQueue,
    projects:      renderProjectQueue,
    ip:            renderIpQueue,
    all_students:  renderAllStudents,
    all_orgs:      renderAllOrgs,
    disputes:      renderDisputes,
    certificates:  renderCertificates,
    letters:       renderLetters,
    bootcamps:     renderBootcamps,
    awards:        renderAwards,
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
