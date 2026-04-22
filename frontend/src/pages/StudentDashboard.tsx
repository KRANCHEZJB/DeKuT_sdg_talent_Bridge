import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import {
  getProjects, applyToProject, getStudentProfile, createStudentProfile,
  getMyApplications, getMyPersonalProjects, submitPersonalProject,
  getMyCertificates, getMyLetterRequests, requestLetter,
  getNotifications, markNotificationRead, markAllNotificationsRead,
showToast as apiToast,
  getMyThreads, getThread, sendMessage, closeThread, createThread,
  raiseDispute, getMyDisputes, submitNgoReview, submitWork,
  withdrawApplication
} from '../api/api'

interface Project {
  id: string; project_name: string; description: string; sdg_focus: string
  skills_required: string[]; project_status: string; location: string
  duration_weeks: number; participation_type: string; team_size_min: number; team_size_max: number
  ngo_id?: string
}
interface Application {
  application_id: string; project_id: string; status: string; applied_at: string
}
interface StudentProfile {
  id: string; display_name: string; profile_slug: string; bio: string
  skills: string[]; engagement_status: string; is_verified: boolean
  registration_number: string; school: string; course: string
  year_of_study: number; expected_graduation_year: number; supervisor_name: string
}
interface PersonalProject {
  id: string; title: string; problem_statement: string; solution_description: string
  sdg_focus: string; technologies: string[]; outcome: string; status: string
  ip_reference?: string; created_at: string
}
interface Certificate {
  id: string; title: string; issued_at: string; project_name?: string
}
interface LetterRequest {
  id: string; purpose: string; status: string; created_at: string
}
interface Notification {
  id: string; title: string; message: string; is_read: boolean; created_at: string; notification_type: string; type?: string
}

const TABS = [
  { key: 'overview',       icon: '📊', label: 'Overview' },
  { key: 'projects',       icon: '🔍', label: 'Browse Projects' },
  { key: 'applications',   icon: '📋', label: 'My Applications' },
  { key: 'personal',       icon: '💡', label: 'Personal Projects' },
  { key: 'certificates',   icon: '🏆', label: 'Certificates' },
  { key: 'letters',        icon: '📄', label: 'Rec. Letters' },
  { key: 'messages',       icon: '💬', label: 'Messages' },
  { key: 'disputes',       icon: '⚖️', label: 'Disputes' },
  { key: 'notifications',  icon: '🔔', label: 'Notifications' },
  { key: 'profile',        icon: '👤', label: 'My Profile' },
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

const statusColor = (s: string) => ({ applied:'#60B4F0', shortlisted:'#FDB913', selected:'#4ADE80', rejected:'#FC8181', completed:'#A78BFA', pending:'#94A3B8', approved:'#4ADE80', submitted:'#60B4F0', ip_recorded:'#A78BFA', showcase_approved:'#4ADE80' }[s] || '#94A3B8')
const statusBg = (s: string) => ({ applied:'rgba(10,110,189,0.15)', shortlisted:'rgba(253,185,19,0.15)', selected:'rgba(0,166,81,0.15)', rejected:'rgba(229,62,62,0.15)', completed:'rgba(167,139,250,0.15)', pending:'rgba(148,163,184,0.1)', approved:'rgba(0,166,81,0.15)', submitted:'rgba(10,110,189,0.15)', ip_recorded:'rgba(167,139,250,0.15)', showcase_approved:'rgba(0,166,81,0.15)' }[s] || 'rgba(148,163,184,0.1)')

const StudentDashboard = () => {
  const { user, logout } = useAuth()
  const { refresh: refreshNotifs } = useNotifications()
  const navigate = useNavigate()

  const [tab, setTab] = useState<string>('overview')
  const [projects, setProjects] = useState<Project[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [personalProjects, setPersonalProjects] = useState<PersonalProject[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [letterRequests, setLetterRequests] = useState<LetterRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all'|'individual'|'team'>('all')
  const [skillsInput, setSkillsInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [_showNotifPanel, _setShowNotifPanel] = useState(false)

  const [profileForm, setProfileForm] = useState({
    display_name: '', profile_slug: '', bio: '', skills: [] as string[],
    registration_number: '', school: '', course: '',
    year_of_study: '' as any, expected_graduation_year: '' as any, supervisor_name: ''
  })

  const [ppForm, setPpForm] = useState({
    title: '', problem_statement: '', solution_description: '',
    sdg_focus: '', technologies: '', outcome: '', is_commercially_sensitive: false
  })
  const [submittingPp, setSubmittingPp] = useState(false)
  const [showPpForm, setShowPpForm] = useState(false)

  const [letterPurpose, setLetterPurpose] = useState('')
  const [requestingLetter, setRequestingLetter] = useState(false)

  const showToast = (msg: string, type: 'success'|'error' = 'success') => apiToast(msg, type)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projRes, appRes, profileRes, ppRes, certRes, letterRes, notifRes] = await Promise.allSettled([
        getProjects(), getMyApplications(), getStudentProfile(),
        getMyPersonalProjects(), getMyCertificates(), getMyLetterRequests(), getNotifications()
      ])
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data)
      if (appRes.status === 'fulfilled') setApplications(appRes.value.data)
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data
        setProfile(p)
        setProfileForm({
          display_name: p.display_name || '', profile_slug: p.profile_slug || '',
          bio: p.bio || '', skills: p.skills || [],
          registration_number: p.registration_number || '', school: p.school || '',
          course: p.course || '', year_of_study: p.year_of_study || '',
          expected_graduation_year: p.expected_graduation_year || '', supervisor_name: p.supervisor_name || ''
        })
        setSkillsInput((p.skills || []).join(', '))
      }
      if (ppRes.status === 'fulfilled') setPersonalProjects(ppRes.value.data)
      if (certRes.status === 'fulfilled') setCertificates(certRes.value.data)
      if (letterRes.status === 'fulfilled') setLetterRequests(letterRes.value.data)
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data?.notifications || [])
    } finally { setLoading(false) }
  }

  const handleApply = async (projectId: string) => {
    setApplying(projectId)
    try {
      await applyToProject(projectId)
      showToast('Application submitted successfully!', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not apply', 'error')
    } finally { setApplying(null) }
  }

  const handleSaveProfile = async () => {
    if (!profileForm.display_name || !profileForm.profile_slug) {
      showToast('Display name and slug are required', 'error'); return
    }
    setSavingProfile(true)
    try {
      const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
      await createStudentProfile({ ...profileForm, skills })
      showToast('Profile saved successfully!', 'success')
      await loadData()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        showToast(detail.map((e: any) => `${e.loc[e.loc.length-1]}: ${e.msg}`).join(', '), 'error')
      } else {
        showToast(typeof detail === 'string' ? detail : 'Could not save profile', 'error')
      }
    } finally { setSavingProfile(false) }
  }

  const handleSubmitPersonalProject = async () => {
    if (!ppForm.title || !ppForm.problem_statement || !ppForm.solution_description || !ppForm.sdg_focus || !ppForm.outcome) {
      showToast('Please fill all required fields', 'error'); return
    }
    setSubmittingPp(true)
    try {
      await submitPersonalProject({
        ...ppForm,
        technologies: ppForm.technologies.split(',').map(t => t.trim()).filter(Boolean)
      })
      showToast('Personal project submitted!', 'success')
      setShowPpForm(false)
      setPpForm({ title:'', problem_statement:'', solution_description:'', sdg_focus:'', technologies:'', outcome:'', is_commercially_sensitive: false })
      await loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not submit project', 'error')
    } finally { setSubmittingPp(false) }
  }

  const handleRequestLetter = async () => {
    if (!letterPurpose.trim()) { showToast('Please enter a purpose', 'error'); return }
    setRequestingLetter(true)
    try {
      await requestLetter({ purpose: letterPurpose })
      showToast('Letter request submitted!', 'success')
      setLetterPurpose('')
      await loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not request letter', 'error')
    } finally { setRequestingLetter(false) }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n))
      refreshNotifs()
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({...n, is_read: true})))
      refreshNotifs()
    } catch {}
  }

  const hasApplied = (projectId: string) => applications.some(a => a.project_id === projectId)

  const filteredProjects = projects.filter(p => {
    const matchSearch = !searchTerm ||
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sdg_focus?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = filterType === 'all' || p.participation_type === filterType
    return matchSearch && matchType
  })

  const unreadNotifs = notifications.filter(n => !n.is_read).length

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px 24px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    padding: '12px 16px', color: '#F1F5F9', fontSize: '14px',
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box'
  }

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg,#0A6EBD,#0891D4)', border: 'none',
    color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
    padding: '12px 24px', borderRadius: '12px', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease'
  }

  const label: React.CSSProperties = {
    color: '#94A3B8', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px'
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
        Welcome back, {user?.first_name}! 👋
      </h1>
      <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '28px' }}>
        {profile?.is_verified ? '✅ Your profile is verified — you can apply to projects' : '⚠️ Complete and verify your profile to start applying'}
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Projects Available',  value: projects.length,                                     color: '#60B4F0', icon: '🔍' },
          { label: 'Applications Sent',   value: applications.length,                                 color: '#A78BFA', icon: '📋' },
          { label: 'Shortlisted',         value: applications.filter(a=>a.status==='shortlisted').length, color: '#FDB913', icon: '⭐' },
          { label: 'Selected',            value: applications.filter(a=>a.status==='selected').length,    color: '#4ADE80', icon: '🏆' },
          { label: 'Personal Projects',   value: personalProjects.length,                             color: '#A78BFA', icon: '💡' },
          { label: 'Certificates',        value: certificates.length,                                 color: '#4ADE80', icon: '🎓' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center', cursor: 'default' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Profile status */}
      {!profile && (
        <div style={{ background: 'rgba(253,185,19,0.08)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontWeight: 700, color: '#FDB913', marginBottom: '4px' }}>⚠️ Profile not set up</p>
            <p style={{ color: '#94A3B8', fontSize: '13px' }}>You need a profile before you can apply to projects</p>
          </div>
          <button onClick={() => setTab('profile')} style={{ ...btnPrimary, background: 'rgba(253,185,19,0.15)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '8px 16px', fontSize: '13px' }}>
            Set Up Profile →
          </button>
        </div>
      )}

      {/* Recent applications */}
      {applications.length > 0 && (
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '14px', color: '#F1F5F9' }}>Recent Applications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {applications.slice(0, 3).map(app => {
              const project = projects.find(p => p.id === app.project_id)
              return (
                <div key={app.application_id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '3px' }}>{project?.project_name || 'Project'}</p>
                    <p style={{ fontSize: '12px', color: '#94A3B8' }}>{project?.sdg_focus}</p>
                  </div>
                  <span style={{ background: statusBg(app.status), border: `1px solid ${statusColor(app.status)}40`, color: statusColor(app.status), padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{app.status}</span>
                </div>
              )
            })}
          </div>
          {applications.length > 3 && (
            <button onClick={() => setTab('applications')} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#60B4F0', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              View all {applications.length} applications →
            </button>
          )}
        </div>
      )}
    </div>
  )

  const renderProjects = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Browse Projects</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>{filteredProjects.length} of {projects.length} open opportunities</p>
      </div>
      {!profile && (
        <div style={{ background: 'rgba(253,185,19,0.08)', border: '1px solid rgba(253,185,19,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: '#FDB913', fontWeight: 600, fontSize: '13px' }}>⚠️ Complete your profile before applying</p>
          <button onClick={() => setTab('profile')} style={{ background: 'rgba(253,185,19,0.15)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Set Up Profile →</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input style={{ ...inputStyle, paddingLeft: '42px' }} placeholder="🔍 Search by title, description or SDG..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[['all','All'],['individual','👤 Individual'],['team','👥 Team']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterType(val as any)}
              style={{ padding: '7px 14px', borderRadius: '999px', border: `1px solid ${filterType===val?'rgba(10,110,189,0.4)':'rgba(255,255,255,0.1)'}`, background: filterType===val?'rgba(10,110,189,0.15)':'rgba(255,255,255,0.03)', color: filterType===val?'#60B4F0':'#94A3B8', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600 }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      {filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>
            {searchTerm || filterType !== 'all' ? 'No matches found' : 'No projects yet'}
          </p>
          <p>{searchTerm || filterType !== 'all' ? 'Try adjusting your filters' : 'Check back soon'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '16px' }}>
          {filteredProjects.map(project => (
            <div key={project.id} style={{ ...card, transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {project.sdg_focus && (
                  <span style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>🎯 {project.sdg_focus}</span>
                )}
                <span style={{ background: project.participation_type==='team'?'rgba(253,185,19,0.15)':'rgba(10,110,189,0.15)', border: `1px solid ${project.participation_type==='team'?'rgba(253,185,19,0.3)':'rgba(10,110,189,0.3)'}`, color: project.participation_type==='team'?'#FDB913':'#60B4F0', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                  {project.participation_type==='team'?`👥 Team ${project.team_size_min}–${project.team_size_max}`:'👤 Individual'}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 }}>{project.project_name}</h3>
              <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
              {project.skills_required?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                  {project.skills_required.slice(0,4).map(s => (
                    <span key={s} style={{ background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.2)', color: '#60B4F0', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {project.location && <span style={{ color: '#94A3B8', fontSize: '12px' }}>📍 {project.location}</span>}
                {project.duration_weeks && <span style={{ color: '#94A3B8', fontSize: '12px' }}>⏱ {project.duration_weeks} weeks</span>}
              </div>
              <button
                onClick={() => {
                  if (!profile) { showToast('Complete your profile first!', 'error'); setTab('profile'); return }
                  if (!hasApplied(project.id)) handleApply(project.id)
                }}
                disabled={applying === project.id || hasApplied(project.id)}
                style={{ ...btnPrimary, width: '100%', opacity: hasApplied(project.id) ? 0.7 : 1, background: hasApplied(project.id) ? 'rgba(0,166,81,0.1)' : 'linear-gradient(135deg,#0A6EBD,#0891D4)', border: hasApplied(project.id) ? '1px solid rgba(0,166,81,0.25)' : 'none', color: hasApplied(project.id) ? '#4ADE80' : 'white' }}>
                {applying === project.id ? '⏳ Applying...' : hasApplied(project.id) ? '✓ Applied' : 'Apply Now →'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderApplications = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>My Applications</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Track the status of your project applications</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total',       value: applications.length,                                        color: '#60B4F0' },
          { label: 'Shortlisted', value: applications.filter(a=>a.status==='shortlisted').length,   color: '#FDB913' },
          { label: 'Selected',    value: applications.filter(a=>a.status==='selected').length,      color: '#4ADE80' },
          { label: 'Completed',   value: applications.filter(a=>a.status==='completed').length,     color: '#A78BFA' },
          { label: 'Rejected',    value: applications.filter(a=>a.status==='rejected').length,      color: '#FC8181' },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: stat.color, marginBottom: '3px' }}>{stat.value}</div>
            <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      {applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' }}>No applications yet</p>
          <button onClick={() => setTab('projects')} style={{ ...btnPrimary, fontSize: '13px', padding: '10px 20px' }}>Browse Projects →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.map(app => {
            const project = projects.find(p => p.id === app.project_id)
            return (
              <div key={app.application_id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '5px' }}>{project?.project_name || 'Project'}</h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {project?.sdg_focus && <span style={{ color: '#94A3B8', fontSize: '12px' }}>🎯 {project.sdg_focus}</span>}
                    {project?.location && <span style={{ color: '#94A3B8', fontSize: '12px' }}>📍 {project.location}</span>}
                    <span style={{ color: '#64748B', fontSize: '12px' }}>Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: statusBg(app.status), border: `1px solid ${statusColor(app.status)}40`, color: statusColor(app.status), padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{app.status}</span>
                  {project?.ngo_id && profile && (
                    <button onClick={async () => {
                      try {
                        await createThread({ project_id: app.project_id, student_id: profile.id, ngo_id: project.ngo_id, purpose: 'project' })
                        setTab('messages')
                        loadData()
                      } catch {}
                    }} style={{ background: 'rgba(96,180,240,0.1)', border: '1px solid rgba(96,180,240,0.2)', color: '#60B4F0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                      💬 Message NGO
                    </button>
                  )}
                  {(app.status === 'selected' || app.status === 'revision_requested') && (
                    <button onClick={() => { setSubmitWorkAppId(app.application_id); setSubmitWorkForm({ description: "", deliverable_url: "", hours_worked: "" }) }}
                      style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                      📤 Submit Work
                    </button>
                  )}
                  {app.status === 'work_submitted' && (
                    <span style={{ background: 'rgba(96,180,240,0.1)', border: '1px solid rgba(96,180,240,0.2)', color: '#60B4F0', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                      ⏳ Awaiting NGO Review
                    </span>
                  )}
                  {app.status === 'pending_certificate' && (
                    <span style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                      🎓 Certificate Pending
                    </span>
                  )}
                  {(app.status === 'officially_complete' || app.status === 'completed') && (
                    <button onClick={() => setReviewingNgoAppId(app.application_id)}
                      style={{ background: 'rgba(253,185,19,0.1)', border: '1px solid rgba(253,185,19,0.2)', color: '#FDB913', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                      ⭐ Review NGO
                    </button>
                  )}
                  {!['completed', 'withdrawn', 'officially_complete'].includes(app.status) && (
                    <button onClick={async () => { if (!window.confirm('Withdraw this application? This cannot be undone.')) return; try { await withdrawApplication(app.application_id); apiToast('Application withdrawn', 'warning'); loadData() } catch { apiToast('Failed to withdraw', 'error') } }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FC8181', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                      ✕ Withdraw
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderPersonalProjects = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Personal Projects</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>Submit your innovations for IP recording and showcase</p>
        </div>
        <button onClick={() => setShowPpForm(!showPpForm)} style={{ ...btnPrimary, fontSize: '13px', padding: '10px 20px' }}>
          {showPpForm ? '✕ Cancel' : '+ Submit Project'}
        </button>
      </div>

      {showPpForm && (
        <div style={{ ...card, marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: '#F1F5F9' }}>Submit Personal Project</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={label}>Project Title *</label>
              <input style={inputStyle} placeholder="e.g. Smart Irrigation System" value={ppForm.title} onChange={e => setPpForm({...ppForm, title: e.target.value})} />
            </div>
            <div>
              <label style={label}>SDG Focus *</label>
              <select style={{ ...inputStyle, background: '#1E293B' }} value={ppForm.sdg_focus} onChange={e => setPpForm({...ppForm, sdg_focus: e.target.value})}>
                <option value="">Select an SDG...</option>
                {SDGS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Problem Statement *</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="What problem does your project solve?" value={ppForm.problem_statement} onChange={e => setPpForm({...ppForm, problem_statement: e.target.value})} />
            </div>
            <div>
              <label style={label}>Solution Description *</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="How does your solution work?" value={ppForm.solution_description} onChange={e => setPpForm({...ppForm, solution_description: e.target.value})} />
            </div>
            <div>
              <label style={label}>Technologies Used (comma separated)</label>
              <input style={inputStyle} placeholder="e.g. Arduino, Python, React" value={ppForm.technologies} onChange={e => setPpForm({...ppForm, technologies: e.target.value})} />
            </div>
            <div>
              <label style={label}>Outcome / Results *</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="What was achieved?" value={ppForm.outcome} onChange={e => setPpForm({...ppForm, outcome: e.target.value})} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="sensitive" checked={ppForm.is_commercially_sensitive} onChange={e => setPpForm({...ppForm, is_commercially_sensitive: e.target.checked})} />
              <label htmlFor="sensitive" style={{ ...label, marginBottom: 0, textTransform: 'none', fontSize: '13px', color: '#F1F5F9' }}>🔒 Commercially Sensitive</label>
            </div>
            <button onClick={handleSubmitPersonalProject} disabled={submittingPp} style={{ ...btnPrimary, opacity: submittingPp ? 0.6 : 1 }}>
              {submittingPp ? '⏳ Submitting...' : '🚀 Submit Project'}
            </button>
          </div>
        </div>
      )}

      {personalProjects.length === 0 && !showPpForm ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>No personal projects yet</p>
          <p>Submit your innovations to get them IP recorded and showcased</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {personalProjects.map(p => (
            <div key={p.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{p.title}</h3>
                  <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {p.sdg_focus}
                    {p.ip_reference && <span style={{ marginLeft: '10px', color: '#A78BFA', fontWeight: 600 }}>IP: {p.ip_reference}</span>}
                  </p>
                </div>
                <span style={{ background: statusBg(p.status), border: `1px solid ${statusColor(p.status)}40`, color: statusColor(p.status), padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>{p.status.replace(/_/g,' ')}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '10px' }}>{p.problem_statement}</p>
              {p.technologies?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {p.technologies.map(t => (
                    <span key={t} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderCertificates = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Certificates</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Your earned certificates from completed projects</p>
      </div>
      {certificates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>No certificates yet</p>
          <p>Complete projects to earn certificates</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '16px' }}>
          {certificates.map(cert => (
            <div key={cert.id} style={{ ...card, textAlign: 'center', background: 'linear-gradient(135deg, rgba(253,185,19,0.08), rgba(167,139,250,0.08))', border: '1px solid rgba(253,185,19,0.2)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: '#FDB913' }}>{cert.title}</h3>
              {cert.project_name && <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px' }}>{cert.project_name}</p>}
              <p style={{ fontSize: '12px', color: '#64748B' }}>Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderLetters = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Recommendation Letters</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Request recommendation letters from DeKUT</p>
      </div>
      <div style={{ ...card, marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Request a Letter</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, flex: 1, minWidth: '200px' }} placeholder="Purpose (e.g. Job application at Google)" value={letterPurpose} onChange={e => setLetterPurpose(e.target.value)} />
          <button onClick={handleRequestLetter} disabled={requestingLetter} style={{ ...btnPrimary, padding: '12px 20px', fontSize: '13px', opacity: requestingLetter ? 0.6 : 1 }}>
            {requestingLetter ? '⏳...' : 'Request →'}
          </button>
        </div>
      </div>
      {letterRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', marginBottom: '6px' }}>No requests yet</p>
          <p style={{ fontSize: '13px' }}>Use the form above to request a recommendation letter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {letterRequests.map(req => (
            <div key={req.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '3px' }}>{req.purpose}</p>
                <p style={{ fontSize: '12px', color: '#64748B' }}>Requested: {new Date(req.created_at).toLocaleDateString()}</p>
              </div>
              <span style={{ background: statusBg(req.status), border: `1px solid ${statusColor(req.status)}40`, color: statusColor(req.status), padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{req.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderNotifications = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Notifications</h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>{unreadNotifs} unread</p>
        </div>
        {unreadNotifs > 0 && (
          <button onClick={handleMarkAllRead} style={{ background: 'rgba(96,180,240,0.1)', border: '1px solid rgba(96,180,240,0.2)', color: '#60B4F0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
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
              style={{ ...card, cursor: notif.is_read ? 'default' : 'pointer', opacity: notif.is_read ? 0.6 : 1, borderLeft: notif.is_read ? '1px solid rgba(255,255,255,0.08)' : '3px solid #0A6EBD' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: '#F1F5F9' }}>{notif.title}</p>
                  <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>{notif.message}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '11px', color: '#64748B' }}>{new Date(notif.created_at).toLocaleDateString()}</p>
                  {!notif.is_read && <span style={{ fontSize: '10px', color: '#60B4F0', fontWeight: 600 }}>● Unread</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderProfile = () => (
    <div style={{ maxWidth: '580px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>My Profile</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          {profile ? 'Your profile is visible to NGOs' : 'Complete your profile to start applying'}
        </p>
      </div>

      <div style={{ ...card, marginBottom: '20px', background: 'rgba(10,110,189,0.06)', border: '1px solid rgba(10,110,189,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,#0A6EBD,#0891D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
            {user?.first_name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 700, fontSize: '16px' }}>{user?.first_name} {user?.last_name}</p>
              {profile?.is_verified
                ? <span style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>✓ Verified</span>
                : <span style={{ background: 'rgba(253,185,19,0.15)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>⚠ Pending Verification</span>
              }
            </div>
            <p style={{ color: '#94A3B8', fontSize: '13px' }}>{user?.email}</p>
            {profile && <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>@{profile.profile_slug}</p>}
          </div>
        </div>
      </div>

      {profile && (() => {
        const checks = [
          { label: 'Display name',      done: !!profile.display_name },
          { label: 'Registration no.',  done: !!profile.registration_number },
          { label: 'School',            done: !!profile.school },
          { label: 'Course',            done: !!profile.course },
          { label: 'Year of study',     done: !!profile.year_of_study },
          { label: 'Graduation year',   done: !!profile.expected_graduation_year },
          { label: 'Supervisor name',   done: !!profile.supervisor_name },
          { label: 'Bio',               done: !!profile.bio && profile.bio.length >= 20 },
          { label: 'Skills (min 3)',    done: (profile.skills || []).length >= 3 },
        ]
        const pct = Math.round((checks.filter(c => c.done).length / checks.length) * 100)
        const color = pct === 100 ? '#4ADE80' : pct >= 60 ? '#FDB913' : '#FC8181'
        return (
          <div style={{ ...card, marginBottom: '20px', border: `1px solid ${color}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#F1F5F9' }}>Profile Completeness</p>
              <span style={{ fontSize: '20px', fontWeight: 800, color }}>{pct}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '999px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {checks.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: c.done ? '#4ADE80' : '#64748B' }}>{c.done ? '✓' : '○'}</span>
                  <span style={{ fontSize: '12px', color: c.done ? '#94A3B8' : '#64748B', textDecoration: c.done ? 'none' : 'none' }}>{c.label}</span>
                </div>
              ))}
            </div>
            {pct === 100 && <p style={{ fontSize: '12px', color: '#4ADE80', marginTop: '12px', fontWeight: 600 }}>🎉 Your profile is complete! NGOs can see everything they need.</p>}
            {pct < 100 && <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '12px' }}>Complete your profile to improve visibility with NGOs.</p>}
          </div>
        )
      })()}

      <div style={{ ...card }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '18px' }}>
          {profile ? '✏️ Edit Profile' : '🚀 Create Your Profile'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label}>Display Name *</label>
            <input style={inputStyle} placeholder="How NGOs will see you e.g. Alex Kimani" value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name: e.target.value})} />
          </div>
          <div>
            <label style={label}>Profile Slug *</label>
            <input style={inputStyle} placeholder="alex-kimani" value={profileForm.profile_slug} onChange={e => setProfileForm({...profileForm, profile_slug: e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')})} />
          </div>
          <div>
            <label style={label}>Registration Number *</label>
            <input style={inputStyle} placeholder="e.g. D400/071/2022" value={profileForm.registration_number} onChange={e => setProfileForm({...profileForm, registration_number: e.target.value})} />
          </div>
          <div>
            <label style={label}>School *</label>
            <input style={inputStyle} placeholder="e.g. School of Engineering" value={profileForm.school} onChange={e => setProfileForm({...profileForm, school: e.target.value})} />
          </div>
          <div>
            <label style={label}>Course *</label>
            <input style={inputStyle} placeholder="e.g. BSc Computer Science" value={profileForm.course} onChange={e => setProfileForm({...profileForm, course: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Year of Study *</label>
              <input style={inputStyle} type="number" min="1" max="6" placeholder="e.g. 2" value={profileForm.year_of_study} onChange={e => setProfileForm({...profileForm, year_of_study: parseInt(e.target.value)})} />
            </div>
            <div>
              <label style={label}>Graduation Year *</label>
              <input style={inputStyle} type="number" placeholder="e.g. 2026" value={profileForm.expected_graduation_year} onChange={e => setProfileForm({...profileForm, expected_graduation_year: parseInt(e.target.value)})} />
            </div>
          </div>
          <div>
            <label style={label}>Supervisor Name *</label>
            <input style={inputStyle} placeholder="e.g. Dr. Jane Mwangi" value={profileForm.supervisor_name} onChange={e => setProfileForm({...profileForm, supervisor_name: e.target.value})} />
          </div>
          <div>
            <label style={label}>Bio</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} placeholder="Tell NGOs about yourself..." value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
          </div>
          <div>
            <label style={label}>Skills (comma separated)</label>
            <input style={inputStyle} placeholder="Python, Data Analysis, Research..." value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
            {skillsInput && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                {skillsInput.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                  <span key={s} style={{ background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.2)', color: '#60B4F0', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile} style={{ ...btnPrimary, opacity: savingProfile ? 0.6 : 1 }}>
            {savingProfile ? '⏳ Saving...' : profile ? '💾 Update Profile' : '🚀 Create Profile'}
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
  const [loadingThreads] = useState(false)
  useEffect(() => { getMyThreads().then(r => setThreads(r.data || [])) }, [])
  const openThread = async (t: any) => {
    setActiveThread(t)
    const res = await getThread(t.id)
    setThreadMessages(res.data.messages || [])
    // Mark new_message notifications as read
    try {
      const unreadMsgNotifs = notifications.filter(n => !n.is_read && (n.notification_type === 'new_message' || (n as any).type === 'new_message'))
      await Promise.all(unreadMsgNotifs.map(n => markNotificationRead(n.id)))
      if (unreadMsgNotifs.length > 0) {
        setNotifications(prev => prev.map(n => (n.notification_type === 'new_message' || (n as any).type === 'new_message') ? {...n, is_read: true} : n))
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
          {loadingThreads ? <p style={{ padding: '16px', color: '#94A3B8', fontSize: '13px' }}>Loading...</p>
          : threads.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <p style={{ fontSize: '28px' }}>💬</p>
              <p>No conversations yet</p>
            </div>
          ) : threads.map(t => (
            <div key={t.id} onClick={() => openThread(t)}
              style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: activeThread?.id === t.id ? 'rgba(10,110,189,0.15)' : 'transparent' }}>
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
                  const isMe = m.sender_role === 'student'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'linear-gradient(135deg,#0A6EBD,#0891D4)' : 'rgba(255,255,255,0.07)', color: '#F1F5F9', fontSize: '14px' }}>
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
                  style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#0A6EBD,#0891D4)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: sendingMsg || !msgInput.trim() ? 0.5 : 1 }}>
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
  const [disputeForm, setDisputeForm] = useState({ against_id: '', application_id: '', dispute_type: 'completion', description: '' })
  const [submittingDispute, setSubmittingDispute] = useState(false)
  const [reviewingNgoAppId, setReviewingNgoAppId] = useState<string | null>(null)
  const [submitWorkAppId, setSubmitWorkAppId] = useState<string | null>(null)
  const [submitWorkForm, setSubmitWorkForm] = useState({ description: "", deliverable_url: "", hours_worked: "" })
  const [submittingWork, setSubmittingWork] = useState(false)
  const [ngoReviewForm, setNgoReviewForm] = useState({ overall_rating: 5, review_text: "" })
  const [submittingNgoReview, setSubmittingNgoReview] = useState(false)
  useEffect(() => { getMyDisputes().then(r => setMyDisputes(r.data || [])) }, [])
  useEffect(() => { if (tab === "notifications") handleMarkAllRead() }, [tab])

  const disputeApplicationOptions = applications.map(app => {
    const proj = projects.find(p => p.id === app.project_id)
    return { label: proj?.project_name || 'Unknown Project', application_id: app.application_id, ngo_id: proj?.ngo_id || '' }
  }).filter(o => o.ngo_id)

  const handleSelectDisputeApplication = (application_id: string) => {
    const opt = disputeApplicationOptions.find(o => o.application_id === application_id)
    if (opt) setDisputeForm(p => ({ ...p, application_id: opt.application_id, against_id: opt.ngo_id }))
    else setDisputeForm(p => ({ ...p, application_id: '', against_id: '' }))
  }

  const handleRaiseDispute = async () => {
    if (!disputeForm.against_id || !disputeForm.description.trim()) return
    setSubmittingDispute(true)
    try {
      await raiseDispute({
        against_id: disputeForm.against_id,
        application_id: disputeForm.application_id || undefined,
        dispute_type: disputeForm.dispute_type,
        description: disputeForm.description,
      })
      setDisputeForm({ against_id: '', application_id: '', dispute_type: 'completion', description: '' })
      const res = await getMyDisputes()
      setMyDisputes(res.data || [])
    } catch { alert('Failed to raise dispute. Please try again.') }
    finally { setSubmittingDispute(false) }
  }
  const handleSubmitWork = async () => {
    if (!submitWorkAppId || !submitWorkForm.description.trim()) return
    setSubmittingWork(true)
    try {
      await submitWork(submitWorkAppId, {
        description: submitWorkForm.description,
        deliverable_url: submitWorkForm.deliverable_url || null,
        hours_worked: submitWorkForm.hours_worked ? Number(submitWorkForm.hours_worked) : null
      })
      showToast("Work submitted successfully!", "success")
      setSubmitWorkAppId(null)
      setSubmitWorkForm({ description: "", deliverable_url: "", hours_worked: "" })
      loadData()
    } catch { showToast("Failed to submit work", "error") }
    finally { setSubmittingWork(false) }
  }
  const handleSubmitNgoReview = async () => {
    if (!reviewingNgoAppId || !ngoReviewForm.review_text.trim()) return
    setSubmittingNgoReview(true)
    try {
      await submitNgoReview(reviewingNgoAppId, ngoReviewForm)
      apiToast("Review submitted!", "success")
      setReviewingNgoAppId(null)
      setNgoReviewForm({ overall_rating: 5, review_text: "" })
    } catch { alert("Failed to submit review.") }
    finally { setSubmittingNgoReview(false) }
  }
  const renderDisputes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>⚖️ Disputes</h2>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>Raise and track disputes with NGOs</p>
      </div>
      {/* Raise Dispute Form */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', marginBottom: '16px' }}>Raise a New Dispute</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Related Project / NGO</label>
            <select value={disputeForm.application_id} onChange={e => handleSelectDisputeApplication(e.target.value)}
              style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}>
              <option value="">Select a project...</option>
              {disputeApplicationOptions.map(opt => (
                <option key={opt.application_id} value={opt.application_id}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Dispute Type</label>
            <select value={disputeForm.dispute_type} onChange={e => setDisputeForm(p => ({...p, dispute_type: e.target.value}))}
              style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none' }}>
              <option value="completion">Project Completion Issue</option>
              <option value="receipt">Receipt / Payment Issue</option>
              <option value="rating">Unfair Rating</option>
              <option value="adoption">Adoption Issue</option>
              <option value="admin_decision">Admin Decision</option>
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
      {/* My Disputes List */}
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
const TAB_RENDER: Record<string, () => React.ReactElement> = {
    overview:      renderOverview,
    projects:      renderProjects,
    applications:  renderApplications,
    personal:      renderPersonalProjects,
    certificates:  renderCertificates,
    letters:       renderLetters,
    messages:      renderMessages,
    disputes:      renderDisputes,
    notifications: renderNotifications,
    profile:       renderProfile,
  }

  return (<>
    <div style={{ minHeight: '100vh', background: '#060D1F', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: '64px', background: 'rgba(6,13,31,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#0A6EBD,#0891D4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌍</div>
          <span style={{ fontSize: '15px', fontWeight: 700 }}>SDG Talent Bridge</span>
          <span style={{ background: 'rgba(10,110,189,0.15)', border: '1px solid rgba(10,110,189,0.3)', color: '#60B4F0', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>Student</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!profile && (
            <button onClick={() => setTab('profile')} style={{ background: 'rgba(253,185,19,0.12)', border: '1px solid rgba(253,185,19,0.3)', color: '#FDB913', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              ⚠️ Complete Profile
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
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: '10px' }}>Student Panel</div>
          {TABS.map(t => {
            const isActive = tab === t.key
            const badgeCounts: Record<string, number> = {
              applications: applications.length,
              personal: personalProjects.length,
              certificates: certificates.length,
              notifications: unreadNotifs,
              letters: letterRequests.length,
            }
            const count = badgeCounts[t.key]
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#F1F5F9' : '#94A3B8', background: isActive ? '#132038' : 'transparent', borderLeft: isActive ? '3px solid #0A6EBD' : '3px solid transparent', textAlign: 'left', transition: 'all 0.15s ease', marginBottom: '2px', fontFamily: 'Inter, sans-serif' }}>
                <span>{t.icon}</span>
                <span style={{ flex: 1 }}>{t.label}</span>
                {count !== undefined && count > 0 && (
                  <span style={{ background: t.key === 'notifications' ? 'rgba(229,62,62,0.2)' : 'rgba(255,255,255,0.08)', color: t.key === 'notifications' ? '#FC8181' : '#94A3B8', padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>{count}</span>
                )}
              </button>
            )
          })}

          {profile && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ background: 'rgba(10,110,189,0.08)', border: '1px solid rgba(10,110,189,0.15)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#0A6EBD,#0891D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                    {profile.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.display_name}</p>
                    <p style={{ fontSize: '10px', color: profile.is_verified ? '#4ADE80' : '#FDB913', fontWeight: 600 }}>
                      {profile.is_verified ? '✓ Verified' : '⚠ Pending'}
                    </p>
                  </div>
                </div>
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
      </div>
    </div>
    {submitWorkAppId && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px", width: "440px", maxWidth: "90vw" }}>
          <h3 style={{ color: "#F1F5F9", fontWeight: 700, marginBottom: "16px" }}>📤 Submit Completion Report</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ color: "#94A3B8", fontSize: "12px", display: "block", marginBottom: "6px" }}>DESCRIPTION OF WORK DONE *</label>
              <textarea rows={4} value={submitWorkForm.description} onChange={e => setSubmitWorkForm(p => ({...p, description: e.target.value}))} placeholder="Describe what you accomplished, challenges overcome, and impact created..." style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div>
              <label style={{ color: "#94A3B8", fontSize: "12px", display: "block", marginBottom: "6px" }}>DELIVERABLE URL (optional)</label>
              <input value={submitWorkForm.deliverable_url} onChange={e => setSubmitWorkForm(p => ({...p, deliverable_url: e.target.value}))} placeholder="https://github.com/... or Google Drive link" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ color: "#94A3B8", fontSize: "12px", display: "block", marginBottom: "6px" }}>HOURS WORKED (optional)</label>
              <input type="number" min={1} value={submitWorkForm.hours_worked} onChange={e => setSubmitWorkForm(p => ({...p, hours_worked: e.target.value}))} placeholder="e.g. 40" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button onClick={handleSubmitWork} disabled={submittingWork || !submitWorkForm.description.trim()} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#4ADE80,#22C55E)", border: "none", borderRadius: "8px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "14px", opacity: submittingWork || !submitWorkForm.description.trim() ? 0.5 : 1 }}>{submittingWork ? "⏳ Submitting..." : "✅ Submit Report"}</button>
            <button onClick={() => setSubmitWorkAppId(null)} style={{ padding: "10px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#F1F5F9", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Cancel</button>
          </div>
        </div>
      </div>
    )}
    {reviewingNgoAppId && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "28px", width: "420px" }}>
          <h3 style={{ color: "#F1F5F9", fontWeight: 700, marginBottom: "16px" }}>⭐ Review NGO</h3>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ color: "#94A3B8", fontSize: "12px" }}>OVERALL RATING (1-5)</label>
            <input type="number" min={1} max={5} value={ngoReviewForm.overall_rating} onChange={e => setNgoReviewForm(p => ({...p, overall_rating: Number(e.target.value)}))} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "14px", outline: "none", marginTop: "6px", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: "#94A3B8", fontSize: "12px" }}>REVIEW</label>
            <textarea rows={4} value={ngoReviewForm.review_text} onChange={e => setNgoReviewForm(p => ({...p, review_text: e.target.value}))} placeholder="Describe your experience with this NGO..." style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", color: "#F1F5F9", fontSize: "14px", outline: "none", resize: "vertical", marginTop: "6px", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleSubmitNgoReview} disabled={submittingNgoReview} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#FDB913,#F59E0B)", border: "none", borderRadius: "8px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>{submittingNgoReview ? "⏳" : "✅ Submit Review"}</button>
            <button onClick={() => setReviewingNgoAppId(null)} style={{ padding: "10px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#F1F5F9", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Cancel</button>
          </div>
        </div>
      </div>
    )}
  </>)
}

export default StudentDashboard
