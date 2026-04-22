import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import {
  getMyProjects, createProject, getNgoProfile, createNgoProfile,
  getProjectApplications, updateApplicationStatus,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  showToast as apiToast,
  getMyThreads, getThread, sendMessage, closeThread,
  raiseDispute, getMyDisputes,
  createBootcamp, getBootcamps,
  submitStudentReview, reviewSubmission,
  ngoCloseProject, showToast
} from '../api/api'

interface Project {
  id: string; project_name: string; description: string; sdg_focus: string
  skills_required: string[]; project_status: string; location: string
  duration_weeks: number; participation_type: string; team_size_min: number; team_size_max: number
  students_applied?: number; created_at?: string
}
interface Application {
  application_id: string; student_id: string; status: string; applied_at?: string
  student?: { display_name: string; registration_number: string; course: string; school: string; skills: string[] }
}
interface NgoProfile {
  id: string; organization_name: string; organization_slug: string; mission_statement: string
  primary_email: string; organization_type: string; country: string; contact_phone: string
  website: string; is_approved: boolean; approval_status?: string
}
interface Notification {
  id: string; title: string; message: string; is_read: boolean; created_at: string; notification_type?: string; type?: string
}

const ORG_TYPES = [
  { value: 'ngo',              label: 'NGO',              icon: '🌍', desc: 'Non-governmental org' },
  { value: 'nonprofit',        label: 'Non-Profit',       icon: '❤️', desc: 'Registered non-profit' },
  { value: 'social_enterprise',label: 'Social Enterprise',icon: '💡', desc: 'Mission-driven business' },
  { value: 'foundation',       label: 'Foundation',       icon: '🏛️', desc: 'Philanthropic foundation' },
  { value: 'company',          label: 'Company / Firm',   icon: '🏢', desc: 'Corporate or consultancy' },
  { value: 'un_agency',        label: 'UN Agency',        icon: '🇺🇳', desc: 'United Nations body' },
]

const SDGS = [
  "SDG 1 — No Poverty","SDG 2 — Zero Hunger","SDG 3 — Good Health and Well-being",
  "SDG 4 — Quality Education","SDG 5 — Gender Equality","SDG 6 — Clean Water and Sanitation",
  "SDG 7 — Affordable and Clean Energy","SDG 8 — Decent Work and Economic Growth",
  "SDG 9 — Industry, Innovation and Infrastructure","SDG 10 — Reduced Inequalities",
  "SDG 11 — Sustainable Cities and Communities","SDG 12 — Responsible Consumption and Production",
  "SDG 13 — Climate Action","SDG 14 — Life Below Water","SDG 15 — Life on Land",
  "SDG 16 — Peace, Justice and Strong Institutions","SDG 17 — Partnerships for the Goals",
]

const TABS = [
  { key: 'overview',      icon: '📊', label: 'Overview' },
  { key: 'projects',      icon: '📁', label: 'My Projects' },
  { key: 'create',        icon: '➕', label: 'Create Project' },
  { key: 'applications',  icon: '👥', label: 'Applications' },
  { key: 'messages',      icon: '💬', label: 'Messages' },
  { key: 'disputes',      icon: '⚖️', label: 'Disputes' },
  { key: 'bootcamps',     icon: '🎓', label: 'Bootcamps' },
  { key: 'notifications', icon: '🔔', label: 'Notifications' },
  { key: 'profile',       icon: '🏢', label: 'Org Profile' },
]

const statusColor = (s: string) => ({ applied:'#60B4F0', shortlisted:'#FDB913', selected:'#4ADE80', rejected:'#FC8181', completed:'#A78BFA', officially_complete:'#A78BFA', open:'#4ADE80', pending_approval:'#FDB913', draft:'#94A3B8', cancelled:'#FC8181' }[s] || '#94A3B8')
const statusLabel = (s: string) => ({ officially_complete: 'Completed', pending_approval: 'Pending Approval' }[s] || s.replace(/_/g, ' ').replace(/\w/g, c => c.toUpperCase()))
const statusBg = (s: string) => ({ applied:'rgba(10,110,189,0.15)', shortlisted:'rgba(253,185,19,0.15)', selected:'rgba(0,166,81,0.15)', rejected:'rgba(229,62,62,0.15)', completed:'rgba(167,139,250,0.15)', open:'rgba(0,166,81,0.15)', pending_approval:'rgba(253,185,19,0.15)', draft:'rgba(148,163,184,0.1)', cancelled:'rgba(229,62,62,0.15)' }[s] || 'rgba(148,163,184,0.1)')

const NgoDashboard = () => {
  const { user, logout } = useAuth()
  const { refresh: refreshNotifs } = useNotifications()
  const navigate = useNavigate()

  const [tab, setTab] = useState('overview')
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<NgoProfile | null>(null)
  const [applications, setApplications] = useState<{ [projectId: string]: Application[] }>({})
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [reviewForm, setReviewForm] = useState({ overall_rating: 5, review_text: '' })
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewingSubmission, setReviewingSubmission] = useState<{ appId: string; action: string } | null>(null)
  const [submissionFeedback, setSubmissionFeedback] = useState("")
  const [submittingSubmissionReview, setSubmittingSubmissionReview] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')

  const [profileForm, setProfileForm] = useState({
    organization_name: '', organization_slug: '', mission_statement: '', primary_email: '',
    organization_type: 'ngo', country: '', contact_phone: '', website: ''
  })

  const [projectForm, setProjectForm] = useState({
    project_name: '', description: '', sdg_focus: '', skills_required: '',
    location: '', duration_weeks: '', project_slug: '',
    participation_type: 'individual', team_size_min: '2', team_size_max: '5', is_remote: true,
    submission_type: 'link', submission_instructions: '', physical_review_date: '', physical_review_location: ''
  })

  const showToast = (msg: string, type: 'success'|'error' = 'success') => apiToast(msg, type)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projRes, profileRes, notifRes] = await Promise.allSettled([
        getMyProjects(), getNgoProfile(), getNotifications()
      ])
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data)
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data
        setProfile(p)
        setProfileForm({
          organization_name: p.organization_name || '', organization_slug: p.organization_slug || '',
          mission_statement: p.mission_statement || '', primary_email: p.primary_email || '',
          organization_type: p.organization_type || 'ngo', country: p.country || '',
          contact_phone: p.contact_phone || '', website: p.website || '',
        })
      }
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data?.notifications || [])
    } finally { setLoading(false) }
  }

  const loadApplications = async (projectId: string) => {
    try {
      const res = await getProjectApplications(projectId)
      setApplications(prev => ({ ...prev, [projectId]: res.data }))
    } catch {}
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setTab('applications')
    loadApplications(project.id)
  }

  const handleCreateProject = async () => {
    if (!projectForm.project_name || !projectForm.description) { showToast('Title and description are required', 'error'); return }
    if (!profile) { showToast('Complete your organization profile first', 'error'); setTab('profile'); return }
    if (!projectForm.sdg_focus) { showToast('Please select an SDG focus', 'error'); return }
    if (projectForm.participation_type === 'team') {
      const min = parseInt(projectForm.team_size_min), max = parseInt(projectForm.team_size_max)
      if (min < 2 || max > 5 || min > max) { showToast('Team size must be between 2 and 5', 'error'); return }
    }
    setSaving(true)
    try {
      const slug = projectForm.project_slug || projectForm.project_name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      await createProject({
        project_name: projectForm.project_name, project_slug: slug,
        description: projectForm.description, sdg_focus: projectForm.sdg_focus,
        skills_required: projectForm.skills_required.split(',').map(s=>s.trim()).filter(Boolean),
        location: projectForm.location, is_remote: projectForm.is_remote,
        duration_weeks: projectForm.duration_weeks ? parseInt(projectForm.duration_weeks) : null,
        participation_type: projectForm.participation_type,
        team_size_min: projectForm.participation_type==='team' ? parseInt(projectForm.team_size_min) : 1,
        team_size_max: projectForm.participation_type==='team' ? parseInt(projectForm.team_size_max) : 1,
        submission_type: projectForm.submission_type,
        submission_instructions: projectForm.submission_instructions || null,
        physical_review_date: projectForm.submission_type === 'physical_review' && projectForm.physical_review_date ? projectForm.physical_review_date : null,
        physical_review_location: projectForm.submission_type === 'physical_review' ? projectForm.physical_review_location || null : null,
      })
      showToast('Project submitted for admin approval!', 'success')
      setProjectForm({ project_name:'', description:'', sdg_focus:'', skills_required:'', location:'', duration_weeks:'', project_slug:'', participation_type:'individual', team_size_min:'2', team_size_max:'5', is_remote:true, submission_type:'', submission_instructions:'', physical_review_date:'', physical_review_location:'' })
      setTab('projects')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not create project', 'error')
    } finally { setSaving(false) }
  }

  const handleSaveProfile = async () => {
    if (!profileForm.organization_name || !profileForm.mission_statement || !profileForm.primary_email) {
      showToast('Organization name, mission and email are required', 'error'); return
    }
    if (!profileForm.organization_slug) {
      profileForm.organization_slug = profileForm.organization_name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
    }
    setSaving(true)
    try {
      await createNgoProfile(profileForm)
      showToast('Organization profile saved!', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not save profile', 'error')
    } finally { setSaving(false) }
  }

  const handleReviewSubmission = async () => {
    if (!reviewingSubmission) return
    setSubmittingSubmissionReview(true)
    try {
      await reviewSubmission(reviewingSubmission.appId, reviewingSubmission.action, submissionFeedback)
      showToast(reviewingSubmission.action === "approve" ? "Marked complete! Awaiting admin certificate." : "Revision requested.", "success")
      setReviewingSubmission(null)
      setSubmissionFeedback("")
      loadData()
    } catch { showToast("Failed to update submission", "error") }
    finally { setSubmittingSubmissionReview(false) }
  }
  const handleUpdateApplication = async (applicationId: string, status: string) => {
    try {
      await updateApplicationStatus(applicationId, { status })
      showToast(`Application marked as ${status}`, 'success')
      if (selectedProject) loadApplications(selectedProject.id)
    } catch { showToast('Could not update application', 'error') }
  }

  const handleSubmitReview = async () => {
    if (!reviewingAppId || !reviewForm.review_text.trim()) return
    setSubmittingReview(true)
    try {
      await submitStudentReview(reviewingAppId, reviewForm)
      showToast('Review submitted!', 'success')
      setReviewingAppId(null)
      setReviewForm({ overall_rating: 5, review_text: '' })
    } catch { showToast('Failed to submit review', 'error') }
    finally { setSubmittingReview(false) }
  }
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id===id ? {...n, is_read:true} : n))
      refreshNotifs()
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({...n, is_read:true})))
      refreshNotifs()
    } catch {}
  }

  const filteredProjects = useMemo(() =>
    projects.filter(p => {
      const matchSearch = !projectSearch ||
        p.project_name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.sdg_focus?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.location?.toLowerCase().includes(projectSearch.toLowerCase())
      const matchFilter = projectFilter === 'all' || p.project_status === projectFilter
      return matchSearch && matchFilter
    }), [projects, projectSearch, projectFilter])

  const unreadNotifs = notifications.filter(n => !n.is_read).length
  const selectedOrgType = ORG_TYPES.find(t => t.value === profileForm.organization_type)

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '20px 24px',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    padding: '12px 16px', color: '#F1F5F9', fontSize: '14px',
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box'
  }
  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg,#00A651,#00C46A)', border: 'none',
    color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
    padding: '12px 24px', borderRadius: '12px', fontFamily: 'Inter, sans-serif'
  }
  const label: React.CSSProperties = {
    color: '#94A3B8', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px'
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
        Welcome, {profile?.organization_name || user?.first_name}! 👋
      </h1>
      <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '28px' }}>
        {profile?.is_approved
          ? '✅ Your organization is approved — you can post projects'
          : profile
            ? '⏳ Your organization is pending admin approval'
            : '⚠️ Set up your organization profile to start posting projects'}
      </p>

      {/* Approval status banner */}
      {profile && !profile.is_approved && (
        <div style={{ background: 'rgba(253,185,19,0.08)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px' }}>
          <p style={{ fontWeight: 700, color: '#FDB913', marginBottom: '4px' }}>⏳ Pending Admin Approval</p>
          <p style={{ color: '#94A3B8', fontSize: '13px' }}>Your organization is under review. You'll be notified once approved.</p>
        </div>
      )}

      {!profile && (
        <div style={{ background: 'rgba(253,185,19,0.08)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontWeight: 700, color: '#FDB913', marginBottom: '4px' }}>⚠️ Profile not set up</p>
            <p style={{ color: '#94A3B8', fontSize: '13px' }}>Complete your organization profile to post projects</p>
          </div>
          <button onClick={() => setTab('profile')} style={{ ...btnPrimary, background: 'rgba(253,185,19,0.15)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '8px 16px', fontSize: '13px' }}>Set Up Profile →</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Total Projects',    value: projects.length,                                             color: '#4ADE80', icon: '📁' },
          { label: 'Open Projects',     value: projects.filter(p=>p.project_status==='open').length,        color: '#60B4F0', icon: '🟢' },
          { label: 'Pending Approval',  value: projects.filter(p=>p.project_status==='pending_approval').length, color: '#FDB913', icon: '⏳' },
          { label: 'Completed',         value: projects.filter(p=>p.project_status==='completed').length,   color: '#A78BFA', icon: '✅' },
          { label: 'Total Applicants',  value: projects.reduce((sum,p)=>sum+(p.students_applied||0),0),     color: '#60B4F0', icon: '👥' },
          { label: 'Notifications',     value: unreadNotifs,                                                color: '#FC8181', icon: '🔔' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project Analytics */}
      {projects.length > 0 && (() => {
        const totalApps = projects.reduce((sum, p) => sum + (p.students_applied || 0), 0)
        const openProjects = projects.filter(p => p.project_status === 'open')
        const topProjects = [...projects].sort((a, b) => (b.students_applied || 0) - (a.students_applied || 0)).slice(0, 5)
        const statusCounts = projects.reduce((acc: any, p) => { acc[p.project_status] = (acc[p.project_status] || 0) + 1; return acc }, {})
        const statusColors: any = { open: '#4ADE80', pending_approval: '#FDB913', completed: '#A78BFA', closed: '#FC8181', rejected: '#64748B', draft: '#94A3B8' }
        const maxApps = Math.max(...topProjects.map(p => p.students_applied || 0), 1)
        return (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>📊 Project Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Avg. Applications', value: projects.length ? (totalApps / projects.length).toFixed(1) : '0', color: '#60B4F0', icon: '📈' },
                { label: 'Active Projects',   value: openProjects.length, color: '#4ADE80', icon: '🟢' },
                { label: 'Total Applications',value: totalApps, color: '#A78BFA', icon: '📋' },
                { label: 'Completion Rate',   value: projects.length ? `${Math.round((projects.filter(p=>p.project_status==='completed').length/projects.length)*100)}%` : '0%', color: '#FDB913', icon: '✅' },
              ].map(s => (
                <div key={s.label} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {topProjects.some(p => (p.students_applied || 0) > 0) && (
              <div style={{ ...card, marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', marginBottom: '14px' }}>Applications per Project</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topProjects.map(p => (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.project_name}</span>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, flexShrink: 0 }}>{p.students_applied || 0}</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${((p.students_applied || 0) / maxApps) * 100}%`, background: statusColors[p.project_status] || '#60B4F0', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ ...card }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9', marginBottom: '14px' }}>Project Status Breakdown</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {Object.entries(statusCounts).map(([status, count]: any) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px 12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[status] || '#94A3B8', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#94A3B8', textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: statusColors[status] || '#94A3B8' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Recent projects */}
      {projects.length > 0 && (
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '14px' }}>Recent Projects</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.slice(0,3).map(p => (
              <div key={p.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }} onClick={() => handleSelectProject(p)}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '3px' }}>{p.project_name}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>{p.sdg_focus} · {p.location}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ background: statusBg(p.project_status), border: `1px solid ${statusColor(p.project_status)}40`, color: statusColor(p.project_status), padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>{p.project_status.replace(/_/g,' ')}</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>View →</span>
                </div>
              </div>
            ))}
          </div>
          {projects.length > 3 && (
            <button onClick={() => setTab('projects')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#4ADE80', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              View all {projects.length} projects →
            </button>
          )}
        </div>
      )}
    </div>
  )

  const renderProjects = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>My Projects</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>{filteredProjects.length} of {projects.length} projects</p>
        </div>
        <button onClick={() => setTab('create')} style={{ ...btnPrimary, fontSize: '13px', padding: '10px 20px' }}>+ New Project</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total',    value: projects.length,                                             color: '#4ADE80' },
          { label: 'Open',     value: projects.filter(p=>p.project_status==='open').length,        color: '#60B4F0' },
          { label: 'Pending',  value: projects.filter(p=>p.project_status==='pending_approval').length, color: '#FDB913' },
          { label: 'Completed',value: projects.filter(p=>p.project_status==='completed').length,   color: '#A78BFA' },
          { label: 'Closed',    value: projects.filter(p=>p.project_status==='closed').length,       color: '#FC8181' },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: stat.color, marginBottom: '3px' }}>{stat.value}</div>
            <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input style={inputStyle} placeholder="🔍 Search by name, SDG, location..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[['all','All'],['open','Open'],['pending_approval','Pending'],['completed','Completed'],['draft','Draft'],['closed','Closed']].map(([val,lbl]) => (
            <button key={val} onClick={() => setProjectFilter(val)}
              style={{ padding: '7px 14px', borderRadius: '999px', border: `1px solid ${projectFilter===val?'rgba(0,166,81,0.4)':'rgba(255,255,255,0.1)'}`, background: projectFilter===val?'rgba(0,166,81,0.15)':'rgba(255,255,255,0.03)', color: projectFilter===val?'#4ADE80':'#94A3B8', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600 }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {!profile && (
        <div style={{ background: 'rgba(253,185,19,0.08)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: '#FDB913', fontWeight: 600, fontSize: '13px' }}>⚠️ Complete your organization profile before posting</p>
          <button onClick={() => setTab('profile')} style={{ background: 'rgba(253,185,19,0.15)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Set Up Profile →</button>
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>
            {projectSearch || projectFilter !== 'all' ? 'No matches found' : 'No projects yet'}
          </p>
          {!projectSearch && projectFilter === 'all' && (
            <button onClick={() => setTab('create')} style={{ ...btnPrimary, fontSize: '13px', padding: '10px 20px' }}>Create First Project →</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '16px' }}>
          {filteredProjects.map(project => (
            <div key={project.id} style={{ ...card, transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ background: statusBg(project.project_status), border: `1px solid ${statusColor(project.project_status)}40`, color: statusColor(project.project_status), padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                  {project.project_status.replace(/_/g,' ')}
                </span>
                <span style={{ background: project.participation_type==='team'?'rgba(253,185,19,0.15)':'rgba(10,110,189,0.15)', border: `1px solid ${project.participation_type==='team'?'rgba(253,185,19,0.3)':'rgba(10,110,189,0.3)'}`, color: project.participation_type==='team'?'#FDB913':'#60B4F0', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                  {project.participation_type==='team'?`👥 Team ${project.team_size_min}–${project.team_size_max}`:'👤 Individual'}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{project.project_name}</h3>
              {project.sdg_focus && <p style={{ fontSize: '12px', color: '#4ADE80', marginBottom: '8px', fontWeight: 600 }}>🎯 {project.sdg_focus}</p>}
              <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
              {project.skills_required?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                  {project.skills_required.slice(0,3).map(s => (
                    <span key={s} style={{ background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.2)', color: '#4ADE80', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {project.location && <span style={{ color: '#94A3B8', fontSize: '12px' }}>📍 {project.location}</span>}
                {project.duration_weeks && <span style={{ color: '#94A3B8', fontSize: '12px' }}>⏱ {project.duration_weeks} weeks</span>}
              </div>
              <button onClick={() => handleSelectProject(project)}
                style={{ width: '100%', background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.25)', color: '#4ADE80', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                👥 View Applications →
              </button>
              {project.project_status !== 'closed' && (
                <button onClick={async () => { if (!window.confirm(`Close "${project.project_name}"? This cannot be undone.`)) return; try { const res = await ngoCloseProject(project.id); const n = res.data?.applications_withdrawn || 0; showToast(n > 0 ? `Project closed. ${n} application(s) withdrawn.` : 'Project closed successfully.', 'warning'); loadData() } catch { showToast('Failed to close project', 'error') } }} style={{ width: '100%', marginTop: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                  🔒 Close Project
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderCreate = () => (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Create Project</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Post a new opportunity for students</p>
      </div>
      <div style={{ ...card }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={label}>Project Title *</label>
            <input style={inputStyle} placeholder="e.g. Community Health Data Analyst" value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name:e.target.value})} />
          </div>
          <div>
            <label style={label}>Description *</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} placeholder="Describe the project, what the student will do, and the impact..." value={projectForm.description} onChange={e => setProjectForm({...projectForm, description:e.target.value})} />
          </div>
          <div>
            <label style={label}>SDG Focus *</label>
            <select style={{ ...inputStyle, background: '#1E293B' }} value={projectForm.sdg_focus} onChange={e => setProjectForm({...projectForm, sdg_focus:e.target.value})}>
              <option value="">Select an SDG...</option>
              {SDGS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Participation Type</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[['individual','👤','Individual','Solo applicant'],['team','👥','Team Project','2–5 members']].map(([val,icon,lbl,desc]) => (
                <button key={val} onClick={() => setProjectForm({...projectForm, participation_type:val})}
                  style={{ flex: 1, padding: '13px 10px', borderRadius: '12px', border: `1px solid ${projectForm.participation_type===val?'rgba(0,166,81,0.5)':'rgba(255,255,255,0.1)'}`, background: projectForm.participation_type===val?'rgba(0,166,81,0.15)':'rgba(255,255,255,0.03)', color: projectForm.participation_type===val?'#4ADE80':'#94A3B8', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '3px' }}>{icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{lbl}</div>
                  <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
          {projectForm.participation_type === 'team' && (
            <div style={{ background: 'rgba(253,185,19,0.06)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '12px', padding: '16px' }}>
              <label style={{ ...label, color: '#FDB913' }}>Team Size Requirements</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ ...label, textTransform: 'none', fontSize: '12px' }}>Min members</label>
                  <input style={inputStyle} type="number" min="2" max="5" value={projectForm.team_size_min} onChange={e => setProjectForm({...projectForm, team_size_min:e.target.value})} />
                </div>
                <div>
                  <label style={{ ...label, textTransform: 'none', fontSize: '12px' }}>Max members</label>
                  <input style={inputStyle} type="number" min="2" max="5" value={projectForm.team_size_max} onChange={e => setProjectForm({...projectForm, team_size_max:e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={label}>Location</label>
              <input style={inputStyle} placeholder="Remote / Nairobi / etc." value={projectForm.location} onChange={e => setProjectForm({...projectForm, location:e.target.value})} />
            </div>
            <div>
              <label style={label}>Duration (weeks)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 8" value={projectForm.duration_weeks} onChange={e => setProjectForm({...projectForm, duration_weeks:e.target.value})} />
            </div>
          </div>
          <div>
            <label style={label}>Skills Required (comma separated)</label>
            <input style={inputStyle} placeholder="Python, Data Analysis, Communication..." value={projectForm.skills_required} onChange={e => setProjectForm({...projectForm, skills_required:e.target.value})} />
            {projectForm.skills_required && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                {projectForm.skills_required.split(',').map(s=>s.trim()).filter(Boolean).map(s => (
                  <span key={s} style={{ background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.2)', color: '#4ADE80', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setProjectForm({...projectForm, is_remote:!projectForm.is_remote})}
              style={{ width: '44px', height: '24px', borderRadius: '999px', border: 'none', background: projectForm.is_remote?'rgba(0,166,81,0.4)':'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '3px', left: projectForm.is_remote?'22px':'3px', width: '18px', height: '18px', borderRadius: '50%', background: projectForm.is_remote?'#4ADE80':'#94A3B8', transition: 'all 0.2s ease' }} />
            </button>
            <span style={{ color: projectForm.is_remote?'#4ADE80':'#94A3B8', fontSize: '13px', fontWeight: 600 }}>Remote-friendly</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px' }}>
            <h3 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>📋 Submission Requirements</h3>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '16px' }}>How should students prove they completed this project?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { value: 'link',            label: '🔗 Single Link',     desc: 'GitHub, deployed app, YouTube' },
                { value: 'multi_link',      label: '🔗 Multiple Links',  desc: 'Several URLs as evidence' },
                { value: 'written_report',  label: '📝 Written Report',  desc: 'Student types a detailed report' },
                { value: 'physical_review', label: '📅 Physical Review', desc: 'You visit to verify in person' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setProjectForm({...projectForm, submission_type: opt.value})}
                  style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${projectForm.submission_type === opt.value ? 'rgba(0,166,81,0.5)' : 'rgba(255,255,255,0.08)'}`, background: projectForm.submission_type === opt.value ? 'rgba(0,166,81,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ color: projectForm.submission_type === opt.value ? '#4ADE80' : '#F1F5F9', fontWeight: 700, fontSize: '13px' }}>{opt.label}</div>
                  <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '3px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreateProject} disabled={saving} style={{ ...btnPrimary, opacity: saving?0.6:1 }}>
            {saving ? '⏳ Creating...' : '🚀 Submit for Approval →'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderApplications = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
          {selectedProject ? `Applications — ${selectedProject.project_name}` : 'Applications'}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          {selectedProject ? 'Review and manage student applicants' : 'Select a project from My Projects to view applications'}
        </p>
      </div>

      {/* Project selector */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={label}>Select Project</label>
          <select style={{ ...inputStyle, background: '#1E293B' }} value={selectedProject?.id || ''} onChange={e => {
            const p = projects.find(p => p.id === e.target.value)
            if (p) { setSelectedProject(p); loadApplications(p.id) }
          }}>
            <option value="">Choose a project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name} ({p.project_status})</option>)}
          </select>
        </div>
      )}

      {!selectedProject ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>No project selected</p>
          <button onClick={() => setTab('projects')} style={{ ...btnPrimary, fontSize: '13px', padding: '10px 20px' }}>Go to My Projects →</button>
        </div>
      ) : (applications[selectedProject.id] || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9' }}>No applications yet</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Make sure the project is approved and open</p>
        </div>
      ) : (
        <div>
          {/* Application stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total',       value: (applications[selectedProject.id]||[]).length,                                          color: '#60B4F0' },
              { label: 'Applied',     value: (applications[selectedProject.id]||[]).filter(a=>a.status==='applied').length,         color: '#94A3B8' },
              { label: 'Shortlisted', value: (applications[selectedProject.id]||[]).filter(a=>a.status==='shortlisted').length,     color: '#FDB913' },
              { label: 'Selected',    value: (applications[selectedProject.id]||[]).filter(a=>a.status==='selected').length,        color: '#4ADE80' },
              { label: 'Rejected',    value: (applications[selectedProject.id]||[]).filter(a=>a.status==='rejected').length,        color: '#FC8181' },
            ].map(stat => (
              <div key={stat.label} style={{ ...card, textAlign: 'center', padding: '14px' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color, marginBottom: '3px' }}>{stat.value}</div>
                <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(applications[selectedProject.id] || []).map((app, i) => (
              <div key={app.application_id} style={{ ...card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                      {app.student?.display_name || `Applicant #${i+1}`}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {app.student?.registration_number && `${app.student.registration_number} · `}
                      {app.student?.course && `${app.student.course} · `}
                      {app.student?.school}
                    </p>
                    {app.student?.skills && app.student.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {app.student.skills.slice(0,4).map(s => (
                          <span key={s} style={{ background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.2)', color: '#4ADE80', padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 600 }}>{s}</span>
                        ))}
                      </div>
                    )}
                    {app.applied_at && <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Applied: {new Date(app.applied_at).toLocaleDateString()}</p>}
                  </div>
                  <span style={{ background: statusBg(app.status), border: `1px solid ${statusColor(app.status)}40`, color: statusColor(app.status), padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>{statusLabel(app.status)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {app.status === 'work_submitted' && (
                    <div style={{ width: '100%', background: 'rgba(96,180,240,0.07)', border: '1px solid rgba(96,180,240,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px' }}>
                      <p style={{ color: '#60B4F0', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>📋 Student Submitted Work</p>
                      <p style={{ color: '#94A3B8', fontSize: '12px' }}>Review the submission and approve or request revisions.</p>
                    </div>
                  )}
                  {app.status === 'work_submitted' && (
                    <>
                      <button onClick={() => setReviewingSubmission({ appId: app.application_id, action: 'approve' })}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.15)', color: '#4ADE80', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>✅ Mark Complete</button>
                      <button onClick={() => setReviewingSubmission({ appId: app.application_id, action: 'revision' })}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(253,185,19,0.3)', background: 'rgba(253,185,19,0.15)', color: '#FDB913', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>🔄 Request Revision</button>
                    </>
                  )}
                  {app.status === 'pending_certificate' && (
                    <span style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', fontSize: '12px', fontWeight: 700 }}>🎓 Awaiting Admin Certificate</span>
                  )}
                  {app.status === 'officially_complete' && (
                    <button onClick={() => setReviewingAppId(app.application_id)}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(253,185,19,0.3)', background: 'rgba(253,185,19,0.15)', color: '#FDB913', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>⭐ Write Review</button>
                  )}
                  {['shortlisted','selected','rejected'].map(s => (
                    <button key={s} onClick={() => handleUpdateApplication(app.application_id, s)}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${s==='selected'?'rgba(0,166,81,0.3)':s==='rejected'?'rgba(229,62,62,0.3)':'rgba(253,185,19,0.3)'}`, background: s==='selected'?'rgba(0,166,81,0.15)':s==='rejected'?'rgba(229,62,62,0.15)':'rgba(253,185,19,0.15)', color: s==='selected'?'#4ADE80':s==='rejected'?'#FC8181':'#FDB913', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700 }}>
                      {s==='selected'?'✓ Select':s==='rejected'?'✗ Reject':'⭐ Shortlist'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderReviewModal = () => reviewingAppId ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', width: '420px' }}>
        <h3 style={{ color: '#F1F5F9', fontWeight: 700, marginBottom: '16px' }}>⭐ Review Student</h3>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ color: '#94A3B8', fontSize: '12px' }}>OVERALL RATING (1-5)</label>
          <input type="number" min={1} max={5} value={reviewForm.overall_rating}
            onChange={e => setReviewForm(p => ({...p, overall_rating: Number(e.target.value)}))}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '14px', outline: 'none', marginTop: '6px', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94A3B8', fontSize: '12px' }}>REVIEW</label>
          <textarea rows={4} value={reviewForm.review_text}
            onChange={e => setReviewForm(p => ({...p, review_text: e.target.value}))}
            placeholder="Describe the student's performance..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '14px', outline: 'none', resize: 'vertical', marginTop: '6px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSubmitReview} disabled={submittingReview}
            style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#FDB913,#F59E0B)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
            {submittingReview ? '⏳' : '✅ Submit Review'}
          </button>
          <button onClick={() => setReviewingAppId(null)}
            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F1F5F9', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null

  const renderNotifications = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Notifications</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>{unreadNotifs} unread</p>
        </div>
        {unreadNotifs > 0 && (
          <button onClick={handleMarkAllRead} style={{ background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.2)', color: '#4ADE80', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
            ✓ Mark all read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>No notifications</p>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map(notif => (
            <div key={notif.id} onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              style={{ ...card, cursor: notif.is_read?'default':'pointer', opacity: notif.is_read?0.6:1, borderLeft: notif.is_read?'1px solid rgba(255,255,255,0.08)':'3px solid #00A651' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{notif.title}</p>
                  <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>{notif.message}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '11px', color: '#64748B' }}>{new Date(notif.created_at).toLocaleDateString()}</p>
                  {!notif.is_read && <span style={{ fontSize: '10px', color: '#4ADE80', fontWeight: 600 }}>● Unread</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderProfile = () => (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Organization Profile</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          {profile ? 'Your profile is live and visible to students' : 'Complete your profile to start posting projects'}
        </p>
      </div>

      <div style={{ ...card, marginBottom: '20px', background: 'rgba(0,166,81,0.06)', border: '1px solid rgba(0,166,81,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg,#00A651,#0A6EBD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            {ORG_TYPES.find(t=>t.value===profileForm.organization_type)?.icon || '🏢'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
              <p style={{ fontWeight: 700, fontSize: '16px' }}>{profile?.organization_name || `${user?.first_name}'s Organization`}</p>
              {profile?.is_approved
                ? <span style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>✓ Approved</span>
                : profile
                  ? <span style={{ background: 'rgba(253,185,19,0.15)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>⏳ Pending Approval</span>
                  : <span style={{ background: 'rgba(229,62,62,0.15)', border: '1px solid rgba(229,62,62,0.3)', color: '#FC8181', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>⚠ Not Set Up</span>
              }
            </div>
            <p style={{ color: '#94A3B8', fontSize: '13px' }}>{user?.email}</p>
            {profile?.country && <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>📍 {profile.country}</p>}
          </div>
        </div>
      </div>

      <div style={{ ...card }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '18px' }}>
          {profile ? '✏️ Edit Organization' : '🏢 Setup Organization'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label}>Organization Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {ORG_TYPES.map(opt => (
                <button key={opt.value} onClick={() => setProfileForm({...profileForm, organization_type:opt.value})}
                  style={{ padding: '10px 8px', borderRadius: '10px', border: `1px solid ${profileForm.organization_type===opt.value?'rgba(0,166,81,0.4)':'rgba(255,255,255,0.08)'}`, background: profileForm.organization_type===opt.value?'rgba(0,166,81,0.15)':'rgba(255,255,255,0.03)', color: profileForm.organization_type===opt.value?'#4ADE80':'#94A3B8', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '3px' }}>{opt.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '1px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {[
            { key:'organization_name', label:'Organization Name *', placeholder:'Your organization name' },
            { key:'organization_slug', label:'Slug', placeholder:'your-org-slug (auto-generated)' },
            { key:'primary_email', label:'Primary Email *', placeholder:'contact@yourorg.com' },
            { key:'website', label:'Website', placeholder:'https://yourorg.com' },
            { key:'country', label:'Country / Region', placeholder:'e.g. Kenya, East Africa' },
            { key:'contact_phone', label:'Contact Phone', placeholder:'+254 700 000 000' },
          ].map(f => (
            <div key={f.key}>
              <label style={label}>{f.label}</label>
              <input style={inputStyle} placeholder={f.placeholder} value={(profileForm as any)[f.key]} onChange={e => setProfileForm({...profileForm, [f.key]:e.target.value})} />
            </div>
          ))}
          <div>
            <label style={label}>Mission Statement *</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="What is your mission and how does it relate to the SDGs?" value={profileForm.mission_statement} onChange={e => setProfileForm({...profileForm, mission_statement:e.target.value})} />
          </div>
          <button onClick={handleSaveProfile} disabled={saving} style={{ ...btnPrimary, opacity: saving?0.6:1 }}>
            {saving ? '⏳ Saving...' : profile ? '💾 Update Profile' : '🚀 Create Organization Profile'}
          </button>
        </div>
      </div>
    </div>

  )
const [threads, setThreads] = useState<any[]>([])
  const [activeThread, setActiveThread] = useState<any | null>(null)
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  useEffect(() => { getMyThreads().then(r => setThreads(r.data || [])) }, [])
  const openThread = async (t: any) => {
    setActiveThread(t)
    const res = await getThread(t.id)
    setThreadMessages(res.data.messages || [])
    try {
      const unreadMsgNotifs = notifications.filter((n: any) => !n.is_read && (n.notification_type === 'new_message' || n.type === 'new_message'))
      await Promise.all(unreadMsgNotifs.map((n: any) => markNotificationRead(n.id)))
      if (unreadMsgNotifs.length > 0) {
        setNotifications((prev: any) => prev.map((n: any) => (n.notification_type === 'new_message' || n.type === 'new_message') ? {...n, is_read: true} : n))
        refreshNotifs()
      }
    } catch {}
  }
  const handleSend = async () => {
    if (!msgInput.trim() || !activeThread) return
    setSendingMsg(true)
    try {
      const res = await sendMessage(activeThread.id, { content: msgInput.trim() })
      setThreadMessages(prev => [...prev, res.data])
      setMsgInput('')
    } finally { setSendingMsg(false) }
  }
  const renderMessages = () => (
    <div style={{ display: 'flex', gap: '16px', height: '600px' }}>
      <div style={{ width: '280px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, fontSize: '13px', color: '#94A3B8' }}>💬 Conversations</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {threads.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <p style={{ fontSize: '28px' }}>💬</p>
              <p>No conversations yet</p>
            </div>
          ) : threads.map(t => (
            <div key={t.id} onClick={() => openThread(t)}
              style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: activeThread?.id === t.id ? 'rgba(0,166,81,0.15)' : 'transparent' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>{t.purpose}</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>{t.status === 'open' ? '🟢 Open' : '🔴 Closed'} · {new Date(t.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#64748B' }}>
            <span style={{ fontSize: '40px' }}>💬</span>
            <p>Select a conversation</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '14px' }}>{activeThread.purpose}</div>
              {activeThread.status === 'open' && (
                <button onClick={async () => { await closeThread(activeThread.id); setActiveThread((p: any) => ({...p, status: 'closed'})); getMyThreads().then(r => setThreads(r.data || [])) }}
                  style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }}>
                  Close
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {threadMessages.length === 0
                ? <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No messages yet</p>
                : threadMessages.map(m => {
                  const isMe = m.sender_role === 'ngo'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'linear-gradient(135deg,#00A651,#0A6EBD)' : 'rgba(255,255,255,0.07)', color: '#F1F5F9', fontSize: '14px' }}>
                        <div>{m.content}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textAlign: 'right' }}>{new Date(m.sent_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
            {activeThread.status === 'open' && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message... (Enter to send)"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none' }} />
                <button onClick={handleSend} disabled={sendingMsg || !msgInput.trim()}
                  style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#00A651,#0A6EBD)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: sendingMsg || !msgInput.trim() ? 0.5 : 1 }}>
                  {sendingMsg ? '...' : '➤'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
const [myDisputes, setMyDisputes] = useState<any[]>([])
  const [disputeForm, setDisputeForm] = useState({ against_id: '', dispute_type: 'misconduct', description: '' })
  const [submittingDispute, setSubmittingDispute] = useState(false)
  useEffect(() => { getMyDisputes().then(r => setMyDisputes(r.data || [])) }, [])
  const handleRaiseDispute = async () => {
    if (!disputeForm.against_id.trim() || !disputeForm.description.trim()) return
    setSubmittingDispute(true)
    try {
      await raiseDispute(disputeForm)
      setDisputeForm({ against_id: '', dispute_type: 'misconduct', description: '' })
      const res = await getMyDisputes()
      setMyDisputes(res.data || [])
      alert('Dispute raised successfully!')
    } catch { alert('Failed to raise dispute.') }
    finally { setSubmittingDispute(false) }
  }
  const renderDisputes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>⚖️ Disputes</h2>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Raise and track disputes with students</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', marginBottom: '16px' }}>Raise a New Dispute</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Against User ID</label>
            <input value={disputeForm.against_id} onChange={e => setDisputeForm(p => ({...p, against_id: e.target.value}))}
              placeholder="Paste the user ID of the student"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Dispute Type</label>
            <select value={disputeForm.dispute_type} onChange={e => setDisputeForm(p => ({...p, dispute_type: e.target.value}))}
              style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}>
              <option value="misconduct">Misconduct</option>
              <option value="no_show">No Show</option>
              <option value="poor_performance">Poor Performance</option>
              <option value="harassment">Harassment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Description</label>
            <textarea value={disputeForm.description} onChange={e => setDisputeForm(p => ({...p, description: e.target.value}))}
              placeholder="Describe the issue in detail..."
              rows={4}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleRaiseDispute} disabled={submittingDispute}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#EF4444,#DC2626)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: submittingDispute ? 0.6 : 1, alignSelf: 'flex-start' }}>
            {submittingDispute ? '⏳ Submitting...' : '⚖️ Raise Dispute'}
          </button>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>My Disputes ({myDisputes.length})</h3>
        {myDisputes.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '28px' }}>⚖️</p>
            <p>No disputes raised yet</p>
          </div>
        ) : myDisputes.map(d => (
          <div key={d.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '14px' }}>{d.dispute_type}</span>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: d.status === 'resolved' ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', color: d.status === 'resolved' ? '#4ADE80' : '#FBBF24' }}>
                {d.status}
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '8px' }}>{d.description}</p>
            {d.resolution_notes && (
              <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#4ADE80' }}>
                <strong>Resolution:</strong> {d.resolution_notes}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>{new Date(d.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
const [bootcamps, setBootcamps] = useState<any[]>([])
  const [bootcampForm, setBootcampForm] = useState({ project_id: '', title: '', description: '', delivery_mode: 'online', scheduled_date: '', duration_hours: '', max_attendees: '', skills_taught: '', prerequisites: '', materials_url: '' })
  const [submittingBootcamp, setSubmittingBootcamp] = useState(false)
  useEffect(() => { getBootcamps().then(r => setBootcamps(r.data || [])) }, [])
  const handleCreateBootcamp = async () => {
    if (!bootcampForm.project_id.trim() || !bootcampForm.title.trim() || !bootcampForm.scheduled_date || !bootcampForm.max_attendees) return alert('Please fill required fields.')
    setSubmittingBootcamp(true)
    try {
      await createBootcamp({
        ...bootcampForm,
        duration_hours: bootcampForm.duration_hours ? parseInt(bootcampForm.duration_hours) : null,
        max_attendees: parseInt(bootcampForm.max_attendees),
        skills_taught: bootcampForm.skills_taught ? bootcampForm.skills_taught.split(',').map(s => s.trim()) : []
      })
      setBootcampForm({ project_id: '', title: '', description: '', delivery_mode: 'online', scheduled_date: '', duration_hours: '', max_attendees: '', skills_taught: '', prerequisites: '', materials_url: '' })
      const res = await getBootcamps()
      setBootcamps(res.data || [])
      alert('Bootcamp submitted for admin approval!')
    } catch { alert('Failed to create bootcamp.') }
    finally { setSubmittingBootcamp(false) }
  }
  const renderBootcamps = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>🎓 Bootcamps</h2>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Create and manage training bootcamps for students</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', marginBottom: '16px' }}>Create New Bootcamp</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Project *</label>
            <select value={bootcampForm.project_id} onChange={e => setBootcampForm(p => ({...p, project_id: e.target.value}))}
              style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '13px', outline: 'none' }}>
              <option value="">Select a project...</option>
              {projects.map((proj: any) => (
                <option key={proj.id} value={proj.id}>{proj.project_name}</option>
              ))}
            </select>
          </div>
          {[
            { key: 'title', label: 'Title *', placeholder: 'Bootcamp title' },
            { key: 'scheduled_date', label: 'Scheduled Date *', placeholder: '', type: 'date' },
            { key: 'max_attendees', label: 'Max Attendees *', placeholder: '50', type: 'number' },
            { key: 'duration_hours', label: 'Duration (hours)', placeholder: '8', type: 'number' },
            { key: 'skills_taught', label: 'Skills (comma separated)', placeholder: 'Python, Data Analysis' },
            { key: 'facilitator_names', label: 'Facilitators', placeholder: 'John Doe, Jane Smith' },
            { key: 'materials_url', label: 'Materials URL', placeholder: 'https://...' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>{f.label}</label>
              <input type={f.type || 'text'} value={(bootcampForm as any)[f.key] || ''} onChange={e => setBootcampForm(p => ({...p, [f.key]: e.target.value}))}
                placeholder={f.placeholder}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Delivery Mode</label>
            <select value={bootcampForm.delivery_mode} onChange={e => setBootcampForm(p => ({...p, delivery_mode: e.target.value}))}
              style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '13px', outline: 'none' }}>
              <option value="online">Online</option>
              <option value="in_person">In Person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Description</label>
            <input value={bootcampForm.description} onChange={e => setBootcampForm(p => ({...p, description: e.target.value}))}
              placeholder="Brief description..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <button onClick={handleCreateBootcamp} disabled={submittingBootcamp}
          style={{ marginTop: '16px', padding: '10px 20px', background: 'linear-gradient(135deg,#00A651,#0A6EBD)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: submittingBootcamp ? 0.6 : 1 }}>
          {submittingBootcamp ? '⏳ Submitting...' : '🎓 Create Bootcamp'}
        </button>
      </div>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>My Bootcamps ({bootcamps.length})</h3>
        {bootcamps.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '28px' }}>🎓</p><p>No bootcamps yet</p>
          </div>
        ) : bootcamps.map(b => (
          <div key={b.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{b.title}</span>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: b.admin_verified ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', color: b.admin_verified ? '#4ADE80' : '#FBBF24' }}>
                {b.admin_verified ? '✅ Approved' : '⏳ Pending'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>📅 {b.scheduled_date} · 👥 {b.max_attendees} max · {b.delivery_mode}</div>
          </div>
        ))}
      </div>
    </div>
  )
  const TAB_RENDER: Record<string, () => React.ReactElement> = {
    overview: renderOverview, projects: renderProjects, create: renderCreate,
    applications: renderApplications, messages: renderMessages, disputes: renderDisputes, bootcamps: renderBootcamps, notifications: renderNotifications, profile: renderProfile,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060D1F', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: '64px', background: 'rgba(6,13,31,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#00A651,#0A6EBD)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌍</div>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>SDG Talent Bridge</span>
          <span style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
            {selectedOrgType ? `${selectedOrgType.icon} ${selectedOrgType.label}` : 'Organization'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!profile && (
            <button onClick={() => setTab('profile')} style={{ background: 'rgba(253,185,19,0.12)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              ⚠️ Setup Profile
            </button>
          )}
          <button onClick={() => setTab('notifications')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>
            🔔
            {unreadNotifs > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: '#E53E3E', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadNotifs}</span>
            )}
          </button>
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>👋 {user?.first_name}</span>
          <button onClick={() => { logout(); navigate('/') }} style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)', color: '#FC8181', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Logout</button>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {/* SIDEBAR */}
        <aside style={{ width: '220px', flexShrink: 0, background: '#0D1628', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '20px 12px', position: 'sticky', top: '64px', height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: '10px' }}>NGO Panel</div>
          {TABS.map(t => {
            const isActive = tab === t.key
            const badgeCounts: Record<string,number> = {
              projects: projects.length,
              notifications: unreadNotifs,
              profile: !profile ? 1 : 0,
            }
            const count = badgeCounts[t.key]
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: isActive?600:400, color: isActive?'#F1F5F9':'#94A3B8', background: isActive?'#132038':'transparent', borderLeft: isActive?'3px solid #00A651':'3px solid transparent', textAlign: 'left', transition: 'all 0.15s ease', marginBottom: '2px', fontFamily: 'Inter, sans-serif' }}>
                <span>{t.icon}</span>
                <span style={{ flex: 1 }}>{t.label}</span>
                {count !== undefined && count > 0 && (
                  <span style={{ background: t.key==='notifications'?'rgba(229,62,62,0.2)':t.key==='profile'?'rgba(253,185,19,0.2)':'rgba(255,255,255,0.08)', color: t.key==='notifications'?'#FC8181':t.key==='profile'?'#FDB913':'#94A3B8', padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>{t.key==='profile'?'!':count}</span>
                )}
              </button>
            )
          })}

          {profile && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ background: 'rgba(0,166,81,0.08)', border: '1px solid rgba(0,166,81,0.15)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#00A651,#0A6EBD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    {ORG_TYPES.find(t=>t.value===profile.organization_type)?.icon || '🏢'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.organization_name}</p>
                    <p style={{ fontSize: '10px', color: profile.is_approved?'#4ADE80':'#FDB913', fontWeight: 600 }}>
                      {profile.is_approved ? '✓ Approved' : '⏳ Pending'}
                    </p>
                  </div>
                </div>
                {profile.country && <p style={{ color: '#94A3B8', fontSize: '11px' }}>📍 {profile.country}</p>}
              </div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94A3B8' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <p>Loading your dashboard...</p>
              </div>
            </div>
          ) : (
            TAB_RENDER[tab]?.()
          )}
        </main>
      {renderReviewModal()}
      {reviewingSubmission && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ color: '#F1F5F9', fontWeight: 700, marginBottom: '8px' }}>
              {reviewingSubmission.action === 'approve' ? '✅ Approve Completion' : '🔄 Request Revision'}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '16px' }}>
              {reviewingSubmission.action === 'approve'
                ? 'Confirm the student has completed the project. An admin will issue the certificate.'
                : 'Describe what the student needs to revise or improve.'}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                {reviewingSubmission.action === 'approve' ? 'FEEDBACK (optional)' : 'REVISION NOTES *'}
              </label>
              <textarea rows={4} value={submissionFeedback} onChange={e => setSubmissionFeedback(e.target.value)}
                placeholder={reviewingSubmission.action === 'approve' ? 'Any comments for the student...' : 'What needs to be revised?'}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1F5F9', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleReviewSubmission} disabled={submittingSubmissionReview || (reviewingSubmission.action === 'revision' && !submissionFeedback.trim())}
                style={{ flex: 1, padding: '10px', background: reviewingSubmission.action === 'approve' ? 'linear-gradient(135deg,#4ADE80,#22C55E)' : 'linear-gradient(135deg,#FDB913,#F59E0B)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px', opacity: submittingSubmissionReview ? 0.5 : 1 }}>
                {submittingSubmissionReview ? '⏳...' : reviewingSubmission.action === 'approve' ? '✅ Confirm' : '🔄 Send Revision Request'}
              </button>
              <button onClick={() => { setReviewingSubmission(null); setSubmissionFeedback("") }}
                style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F1F5F9', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default NgoDashboard
