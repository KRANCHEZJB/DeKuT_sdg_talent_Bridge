import React, { useState } from 'react'
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
  showToast
} from '../api/api'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import type { AdminDashboardStats, StudentProfile, NgoProfile, Project, PersonalProject, AuditLog } from '../types/index'

const TAB_CONFIG = [
  { key: 'overview',      label: 'Overview',      icon: '📊' },
  { key: 'students',      label: 'Student Queue',  icon: '🎓' },
  { key: 'organizations', label: 'Org Queue',      icon: '🏢' },
  { key: 'projects',      label: 'Project Queue',  icon: '📁' },
  { key: 'ip',            label: 'IP Queue',       icon: '💡' },
  { key: 'all_students',  label: 'All Students',   icon: '👥' },
  { key: 'all_orgs',      label: 'All Orgs',       icon: '🌍' },
  { key: 'audit',         label: 'Audit Log',      icon: '📋' },
]

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const { unreadCount, refresh: refreshNotifs } = useNotifications()
  useInactivityLogout(30)

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; onConfirm: () => void; danger?: boolean
  } | null>(null)

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

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleVerifyStudent = async (studentId: string) => {
    try {
      await verifyStudent(studentId)
      showToast('Student verified successfully', 'success')
      refetchSQ()
      refetchStats()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not verify student', 'error')
    }
  }

  const handleBulkVerify = async () => {
    try {
      await bulkVerifyStudents(selectedStudents)
      showToast(`${selectedStudents.length} students verified`, 'success')
      setSelectedStudents([])
      refetchSQ()
      refetchStats()
    } catch {
      showToast('Bulk verify failed', 'error')
    }
  }

  const handleOrgAction = async (orgId: string, action: string, reason?: string) => {
    try {
      await approveOrganization(orgId, { action, rejection_reason: reason })
      showToast(`Organisation ${action}d successfully`, 'success')
      refetchOQ()
      refetchStats()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Action failed', 'error')
    }
  }

  const handleProjectAction = async (projectId: string, action: string, reason?: string) => {
    try {
      await approveProject(projectId, { action, rejection_reason: reason })
      showToast(`Project ${action}d successfully`, 'success')
      refetchPQ()
      refetchStats()
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

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card = {
    background:   '#0D1628',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding:      '20px',
  }

  const actionBtn = (color: string, bg: string) => ({
    background:   bg,
    border:       `1px solid ${color}40`,
    color:        color,
    padding:      '6px 14px',
    borderRadius: '8px',
    cursor:       'pointer',
    fontSize:     '12px',
    fontWeight:   700 as const,
    fontFamily:   'Inter, sans-serif',
    transition:   'all 0.15s ease',
  })

  // ── Render tabs ───────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#F1F5F9' }}>
        System Overview
      </h2>
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
              <div style={{ fontSize: '36px', fontWeight: 800, color: s.color, marginBottom: '6px' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderStudentQueue = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>
          Student Verification Queue {studentQueue && `(${studentQueue.length})`}
        </h2>
        {selectedStudents.length > 0 && (
          <button
            onClick={() => setConfirmModal({
              title:     `Bulk Verify ${selectedStudents.length} Students`,
              message:   `Verify all ${selectedStudents.length} selected students at once?`,
              onConfirm: handleBulkVerify,
            })}
            style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}
          >
            ✓ Verify Selected ({selectedStudents.length})
          </button>
        )}
      </div>
      {sqLoading ? <LoadingSpinner /> : !studentQueue?.length ? (
        <EmptyState icon="🎓" title="Queue is empty" description="All students have been verified" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {studentQueue.map(s => (
            <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '3px' }}>
                    {s.display_name}
                    {s.is_verified && (
                      <span style={{ marginLeft: '8px', background: 'rgba(0,166,81,0.15)', color: '#4ADE80', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>
                        ✓ Auto-verified
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {s.registration_number} · {s.course} · {s.school}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusBadge status={s.engagement_status} size="sm" />
                <button
                  onClick={() => setConfirmModal({
                    title:     'Verify Student',
                    message:   `Verify ${s.display_name}? They will be able to apply to projects.`,
                    onConfirm: () => handleVerifyStudent(s.id),
                  })}
                  style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}
                >
                  ✓ Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderOrgQueue = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
        Organisation Approval Queue {orgQueue && `(${orgQueue.length})`}
      </h2>
      {oqLoading ? <LoadingSpinner /> : !orgQueue?.length ? (
        <EmptyState icon="🏢" title="Queue is empty" description="All organisations have been reviewed" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {orgQueue.map(org => (
            <div key={org.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#F1F5F9', marginBottom: '4px' }}>
                    {org.organization_name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {org.organization_type} · {org.country} · {org.primary_email}
                  </p>
                </div>
                <StatusBadge status={org.approval_status} size="sm" />
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '14px' }}>
                {org.mission_statement}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setConfirmModal({
                  title:     'Approve Organisation',
                  message:   `Approve ${org.organization_name}? They will be able to post projects.`,
                  onConfirm: () => handleOrgAction(org.id, 'approve'),
                })} style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>
                  ✓ Approve
                </button>
                <button onClick={() => handleOrgAction(org.id, 'more_info')}
                  style={actionBtn('#FDB913', 'rgba(253,185,19,0.15)')}>
                  ? More Info
                </button>
                <button onClick={() => setConfirmModal({
                  title:     'Reject Organisation',
                  message:   `Reject ${org.organization_name}?`,
                  danger:    true,
                  onConfirm: () => handleOrgAction(org.id, 'reject', 'Does not meet requirements'),
                })} style={actionBtn('#FC8181', 'rgba(229,62,62,0.15)')}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderProjectQueue = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
        Project Approval Queue {projectQueue && `(${projectQueue.length})`}
      </h2>
      {pqLoading ? <LoadingSpinner /> : !projectQueue?.length ? (
        <EmptyState icon="📁" title="Queue is empty" description="All projects have been reviewed" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {projectQueue.map(p => (
            <div key={p.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#F1F5F9', marginBottom: '4px' }}>
                    {p.project_name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {p.sdg_focus} · {p.location} · {p.duration_weeks} weeks ·{' '}
                    {p.participation_type === 'team'
                      ? `Team ${p.team_size_min}–${p.team_size_max}`
                      : 'Individual'}
                  </p>
                </div>
                <StatusBadge status={p.project_status} size="sm" />
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '14px' }}>
                {p.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setConfirmModal({
                  title:     'Approve Project',
                  message:   `Approve "${p.project_name}"? It will be visible to students.`,
                  onConfirm: () => handleProjectAction(p.id, 'approve'),
                })} style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>
                  ✓ Approve
                </button>
                <button onClick={() => setConfirmModal({
                  title:     'Reject Project',
                  message:   `Reject "${p.project_name}"?`,
                  danger:    true,
                  onConfirm: () => handleProjectAction(p.id, 'reject', 'Does not meet requirements'),
                })} style={actionBtn('#FC8181', 'rgba(229,62,62,0.15)')}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

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
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#F1F5F9', marginBottom: '4px' }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {p.sdg_focus}
                    {p.ip_reference && ` · IP: ${p.ip_reference}`}
                    {p.is_commercially_sensitive && ' · 🔒 Commercially Sensitive'}
                  </p>
                </div>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '14px' }}>
                {p.problem_statement}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {p.status === 'submitted' && (
                  <button onClick={() => setConfirmModal({
                    title:     'Record IP',
                    message:   `Record IP reference for "${p.title}"?`,
                    onConfirm: () => handleRecordIp(p.id),
                  })} style={actionBtn('#A78BFA', 'rgba(167,139,250,0.15)')}>
                    📝 Record IP
                  </button>
                )}
                {(p.status === 'ip_recorded' || p.status === 'submitted') && (
                  <button onClick={() => setConfirmModal({
                    title:     'Approve for Showcase',
                    message:   `Add "${p.title}" to the public showcase?`,
                    onConfirm: () => handleApproveShowcase(p.id),
                  })} style={actionBtn('#4ADE80', 'rgba(0,166,81,0.15)')}>
                    🌟 Approve Showcase
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAllStudents = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
        All Students {allStudents && `(${allStudents.length})`}
      </h2>
      {asLoading ? <LoadingSpinner /> : !allStudents?.length ? (
        <EmptyState icon="👥" title="No students yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allStudents.map(s => (
            <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '2px' }}>
                  {s.display_name}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                  {s.registration_number} · {s.course} · {s.school}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {s.is_verified && (
                  <span style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 600 }}>✓ Verified</span>
                )}
                <StatusBadge status={s.engagement_status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAllOrgs = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
        All Organisations {allOrgs && `(${allOrgs.length})`}
      </h2>
      {aoLoading ? <LoadingSpinner /> : !allOrgs?.length ? (
        <EmptyState icon="🌍" title="No organisations yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allOrgs.map(org => (
            <div key={org.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '2px' }}>
                  {org.organization_name}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                  {org.organization_type} · {org.country}
                </p>
              </div>
              <StatusBadge status={org.approval_status} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAuditLog = () => (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
        Audit Log
      </h2>
      {auditLoading ? <LoadingSpinner /> : !auditData?.logs?.length ? (
        <EmptyState icon="📋" title="No audit entries yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditData.logs.map(log => (
            <div key={log.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9', marginBottom: '3px' }}>
                  <span style={{ color: '#60B4F0' }}>{log.admin_name}</span>
                  {' → '}
                  <span style={{ color: '#FDB913' }}>{log.action.replace(/_/g, ' ')}</span>
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                  {log.target_type} · {log.target_id.slice(0, 8)}...
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
      )}
    </div>
  )

  const TAB_RENDER: Record<string, () => React.ReactElement> = {
    overview:      renderOverview,
    students:      renderStudentQueue,
    organizations: renderOrgQueue,
    projects:      renderProjectQueue,
    ip:            renderIpQueue,
    all_students:  renderAllStudents,
    all_orgs:      renderAllOrgs,
    audit:         renderAuditLog,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060D1F', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* TOP NAVBAR */}
      <nav style={{
        position:       'fixed',
        top: 0, left: 0, right: 0,
        height:         '60px',
        background:     '#0D1628',
        borderBottom:   '1px solid rgba(255,255,255,0.08)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        zIndex:         100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#0A6EBD,#00A651)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
            🌍
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>DeKUT SDG</span>
          <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FC8181', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
            ADMIN
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={refreshNotifs} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', position: 'relative', padding: '4px' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: '#E53E3E', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount}
              </span>
            )}
          </button>
          <span style={{ fontSize: '13px', color: '#94A3B8' }}>
            {user?.first_name} {user?.last_name}
          </span>
          <button
            onClick={logout}
            style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)', color: '#FC8181', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside style={{
        position:    'fixed',
        top:         '60px',
        left:        0,
        bottom:      0,
        width:       '220px',
        background:  '#0D1628',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding:     '20px 12px',
        overflowY:   'auto',
        zIndex:      90,
      }}>
        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: '12px' }}>
          Admin Panel
        </div>
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.key
          const queueCounts: Record<string, number> = {
            students:      studentQueue?.length || 0,
            organizations: orgQueue?.length || 0,
            projects:      projectQueue?.length || 0,
            ip:            ipQueue?.length || 0,
          }
          const count = queueCounts[tab.key]

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                width:        '100%',
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
                padding:      '10px 12px',
                borderRadius: '10px',
                border:       'none',
                cursor:       'pointer',
                fontSize:     '13px',
                fontWeight:   isActive ? 600 : 400,
                color:        isActive ? '#F1F5F9' : '#94A3B8',
                background:   isActive ? '#132038' : 'transparent',
                borderLeft:   isActive ? '3px solid #0A6EBD' : '3px solid transparent',
                textAlign:    'left',
                transition:   'all 0.15s ease',
                marginBottom: '2px',
                fontFamily:   'Inter, sans-serif',
              }}
            >
              <span>{tab.icon}</span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {count > 0 && (
                <span style={{ background: 'rgba(253,185,19,0.2)', color: '#FDB913', padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        marginLeft: '220px',
        marginTop:  '60px',
        padding:    '32px',
        minHeight:  'calc(100vh - 60px)',
      }}>
        {TAB_RENDER[activeTab]?.()}
      </main>
    </div>
  )
}
