import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyProjects, createProject, getNgoProfile, createNgoProfile, getProjectApplications, updateApplicationStatus } from '../api/api'

interface Project {
  id: string
  project_name: string
  description: string
  sdg_focus: string
  skills_required: string[]
  project_status: string
  location: string
  duration_weeks: number
  participation_type: string
  team_size_min: number
  team_size_max: number
}

interface Application {
  application_id: string
  student_id: string
  status: string
}

interface NgoProfile {
  id: string
  organization_name: string
  organization_slug: string
  mission_statement: string
  primary_email: string
  organization_type: string
  country: string
  contact_phone: string
  website: string
  is_approved: boolean
}

const ORG_TYPES = [
  { value: 'ngo', label: 'NGO', icon: '🌍', desc: 'Non-governmental organization' },
  { value: 'nonprofit', label: 'Non-Profit', icon: '❤️', desc: 'Registered non-profit' },
  { value: 'social_enterprise', label: 'Social Enterprise', icon: '💡', desc: 'Mission-driven business' },
  { value: 'foundation', label: 'Foundation', icon: '🏛️', desc: 'Philanthropic foundation' },
  { value: 'company', label: 'Company / Firm', icon: '🏢', desc: 'Corporate or consultancy' },
  { value: 'un_agency', label: 'UN Agency', icon: '🇺🇳', desc: 'United Nations body' },
]

const NgoDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'projects' | 'create' | 'applications' | 'profile'>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<NgoProfile | null>(null)
  const [applications, setApplications] = useState<{ [projectId: string]: Application[] }>({})
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [profileForm, setProfileForm] = useState({
    organization_name: '', organization_slug: '', mission_statement: '', primary_email: '',
    organization_type: 'ngo', country: '', contact_phone: '', website: ''
  })
  const [projectForm, setProjectForm] = useState({
    project_name: '', description: '', sdg_focus: '', skills_required: '',
    location: '', duration_weeks: '', project_slug: '',
    participation_type: 'individual', team_size_min: '2', team_size_max: '5',
    is_remote: true
  })

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projRes, profileRes] = await Promise.allSettled([getMyProjects(), getNgoProfile()])
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data)
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data
        setProfile(p)
        setProfileForm({
          organization_name: p.organization_name || '',
          organization_slug: p.organization_slug || '',
          mission_statement: p.mission_statement || '',
          primary_email: p.primary_email || '',
          organization_type: p.organization_type || 'ngo',
          country: p.country || '',
          contact_phone: p.contact_phone || '',
          website: p.website || '',
        })
      }
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
    if (projectForm.participation_type === 'team') {
      const min = parseInt(projectForm.team_size_min), max = parseInt(projectForm.team_size_max)
      if (min < 2 || max > 5 || min > max) { showToast('Team size must be between 2 and 5', 'error'); return }
    }
    setSaving(true)
    try {
      const slug = projectForm.project_slug || projectForm.project_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      await createProject({
        project_name: projectForm.project_name,
        project_slug: slug,
        description: projectForm.description,
        sdg_focus: projectForm.sdg_focus,
        skills_required: projectForm.skills_required.split(',').map(s => s.trim()).filter(Boolean),
        location: projectForm.location,
        is_remote: projectForm.is_remote,
        duration_weeks: projectForm.duration_weeks ? parseInt(projectForm.duration_weeks) : null,
        participation_type: projectForm.participation_type,
        team_size_min: projectForm.participation_type === 'team' ? parseInt(projectForm.team_size_min) : 1,
        team_size_max: projectForm.participation_type === 'team' ? parseInt(projectForm.team_size_max) : 1,
      })
      showToast('✅ Project submitted for admin approval!')
      setProjectForm({ project_name:'', description:'', sdg_focus:'', skills_required:'', location:'', duration_weeks:'', project_slug:'', participation_type:'individual', team_size_min:'2', team_size_max:'5', is_remote:true })
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
      profileForm.organization_slug = profileForm.organization_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }
    setSaving(true)
    try {
      await createNgoProfile(profileForm)
      showToast('✅ Organization profile saved!')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not save profile', 'error')
    } finally { setSaving(false) }
  }

  const handleUpdateApplication = async (applicationId: string, status: string) => {
    try {
      await updateApplicationStatus(applicationId, { status })
      showToast(`✅ Application marked as ${status}`)
      if (selectedProject) loadApplications(selectedProject.id)
    } catch { showToast('Could not update application', 'error') }
  }

  const statusColor = (s: string) => ({ applied:'#60B4F0', shortlisted:'#FDB913', selected:'#4ADE80', rejected:'#FC8181', completed:'#A78BFA' }[s] || '#94A3B8')
  const statusBg = (s: string) => ({ applied:'rgba(10,110,189,0.15)', shortlisted:'rgba(253,185,19,0.15)', selected:'rgba(0,166,81,0.15)', rejected:'rgba(229,62,62,0.15)', completed:'rgba(167,139,250,0.15)' }[s] || 'rgba(148,163,184,0.1)')
  const selectedOrgType = ORG_TYPES.find(t => t.value === profileForm.organization_type)

  return (
    <div style={{ backgroundColor:'#060D1F', minHeight:'100vh', color:'#F1F5F9', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(20px) translateX(-50%)}to{opacity:1;transform:translateY(0) translateX(-50%)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }

        .dash-card { background:rgba(255,255,255,0.04); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); border-radius:16px; transition:all 0.3s ease; animation:fadeUp 0.5s ease forwards; }
        .dash-card:hover { border-color:rgba(0,166,81,0.3); transform:translateY(-2px); box-shadow:0 12px 40px rgba(0,0,0,0.3); }
        .ngo-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 16px; color:#F1F5F9; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:all 0.2s ease; }
        .ngo-input:focus { border-color:rgba(0,166,81,0.6); background:rgba(0,166,81,0.05); box-shadow:0 0 0 3px rgba(0,166,81,0.08); }
        .ngo-input::placeholder { color:#475569; }
        .save-btn { background:linear-gradient(135deg,#00A651,#00C46A); border:none; color:white; cursor:pointer; font-weight:700; padding:13px 28px; border-radius:12px; font-family:'DM Sans',sans-serif; font-size:14px; transition:all 0.3s ease; }
        .save-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,166,81,0.4); }
        .save-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .nav-glass { background:rgba(6,13,31,0.88); backdrop-filter:blur(24px); border-bottom:1px solid rgba(255,255,255,0.06); }
        .skill-tag { background:rgba(0,166,81,0.1); border:1px solid rgba(0,166,81,0.2); color:#4ADE80; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:600; }
        .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); backdrop-filter:blur(20px); padding:13px 22px; border-radius:12px; font-size:13px; font-weight:600; z-index:9999; animation:toastIn 0.3s ease forwards; white-space:nowrap; }
        .toast.success { background:rgba(0,166,81,0.15); border:1px solid rgba(0,166,81,0.3); color:#4ADE80; }
        .toast.error { background:rgba(229,62,62,0.12); border:1px solid rgba(229,62,62,0.3); color:#FC8181; }
        .status-btn { border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:11px; font-weight:700; padding:5px 10px; border-radius:8px; transition:all 0.2s ease; }
        .status-btn:hover { transform:scale(1.05); }
        .part-btn { flex:1; padding:13px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:#94A3B8; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; transition:all 0.2s ease; text-align:center; }
        .part-btn.ai { background:rgba(10,110,189,0.15); border-color:rgba(10,110,189,0.5); color:#60B4F0; }
        .part-btn.at { background:rgba(253,185,19,0.15); border-color:rgba(253,185,19,0.5); color:#FDB913; }
        .org-btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#94A3B8; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; transition:all 0.2s ease; text-align:center; }
        .org-btn.active { background:rgba(0,166,81,0.15); border-color:rgba(0,166,81,0.4); color:#4ADE80; }
        .profile-complete { background:rgba(0,166,81,0.12); border:1px solid rgba(0,166,81,0.25); color:#4ADE80; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; }
        .profile-incomplete { background:rgba(253,185,19,0.12); border:1px solid rgba(253,185,19,0.25); color:#FDB913; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; animation:pulse 2s infinite; }
        @media (max-width:768px) {
          .dash-layout{flex-direction:column !important}
          .dash-sidebar{width:100% !important;flex-direction:row !important;overflow-x:auto;padding:10px !important;gap:6px !important;border-right:none !important;border-bottom:1px solid rgba(255,255,255,0.05) !important}
          .sidebar-tab{white-space:nowrap;padding:8px 12px !important;font-size:12px !important}
          .main-content{padding:16px !important}
          .projects-grid{grid-template-columns:1fr !important}
          .form-grid{grid-template-columns:1fr !important}
          .stats-row{grid-template-columns:repeat(2,1fr) !important}
          .org-grid{grid-template-columns:repeat(2,1fr) !important}
        }
      `}</style>

      {toast && <div className={`toast ${toastType}`}>{toast}</div>}

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'10%', right:'10%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(0,166,81,0.06) 0%, transparent 70%)', filter:'blur(40px)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize:'60px 60px' }} />
      </div>

      {/* Navbar */}
      <nav className="nav-glass" style={{ position:'sticky', top:0, zIndex:100, padding:'0 24px', height:'64px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <svg width="28" height="28" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="19" fill="url(#nn1)"/>
            <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
            <circle cx="19" cy="19" r="3.5" fill="white"/>
            <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
            <defs><linearGradient id="nn1" x1="0" y1="0" x2="38" y2="38"><stop offset="0%" stopColor="#00A651"/><stop offset="100%" stopColor="#0A6EBD"/></linearGradient></defs>
          </svg>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'16px' }}>SDG Talent Bridge</span>
          <span style={{ background:'rgba(0,166,81,0.15)', border:'1px solid rgba(0,166,81,0.3)', color:'#4ADE80', padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>
            {selectedOrgType ? `${selectedOrgType.icon} ${selectedOrgType.label}` : 'Organization'}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {!profile && (
            <button onClick={() => setTab('profile')} style={{ background:'rgba(253,185,19,0.12)', border:'1px solid rgba(253,185,19,0.3)', color:'#FDB913', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              ⚠️ Setup Profile
            </button>
          )}
          <span style={{ color:'#94A3B8', fontSize:'13px' }}>👋 {user?.first_name}</span>
          <button onClick={() => { logout(); navigate('/') }} style={{ background:'rgba(229,62,62,0.1)', border:'1px solid rgba(229,62,62,0.2)', color:'#FC8181', padding:'7px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Logout</button>
        </div>
      </nav>

      <div className="dash-layout" style={{ display:'flex', position:'relative', zIndex:1, minHeight:'calc(100vh - 64px)' }}>

        {/* Sidebar */}
        <div className="dash-sidebar" style={{ width:'220px', flexShrink:0, padding:'20px 14px', display:'flex', flexDirection:'column', gap:'4px', borderRight:'1px solid rgba(255,255,255,0.05)' }}>
          {[
            { key:'projects', icon:'📁', label:'My Projects', count:projects.length },
            { key:'create', icon:'➕', label:'Create Project', count:null },
            { key:'applications', icon:'👥', label:'Applications', count:null },
            { key:'profile', icon:'🏢', label:'Org Profile', badge:!profile?'!':null },
          ].map(item => (
            <button key={item.key} className="sidebar-tab" onClick={() => setTab(item.key as any)}
              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', borderRadius:'12px', border:'none', background:tab===item.key?'rgba(0,166,81,0.15)':'transparent', color:tab===item.key?'#4ADE80':'#94A3B8', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'14px', fontWeight:600, textAlign:'left', transition:'all 0.2s ease', width:'100%' }}>
              <span style={{ fontSize:'16px' }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.count !== null && item.count !== undefined && <span style={{ background:'rgba(255,255,255,0.08)', padding:'2px 8px', borderRadius:'999px', fontSize:'11px' }}>{item.count}</span>}
              {item.badge && <span style={{ background:'rgba(253,185,19,0.2)', color:'#FDB913', width:'18px', height:'18px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700 }}>{item.badge}</span>}
            </button>
          ))}

          {profile && (
            <div style={{ marginTop:'auto', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ background:'rgba(0,166,81,0.08)', border:'1px solid rgba(0,166,81,0.15)', borderRadius:'12px', padding:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#00A651,#0A6EBD)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                    {ORG_TYPES.find(t=>t.value===profile.organization_type)?.icon || '🏢'}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.organization_name}</p>
                    <span className="profile-complete">✓ Active</span>
                  </div>
                </div>
                {profile.country && <p style={{ color:'#94A3B8', fontSize:'11px' }}>📍 {profile.country}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="main-content" style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px', color:'#94A3B8' }}>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div><p>Loading your dashboard...</p></div>
            </div>
          ) : (
            <>
              {/* PROJECTS */}
              {tab === 'projects' && (
                <div style={{ animation:'fadeUp 0.4s ease' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
                    <div>
                      <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>My Projects</h1>
                      <p style={{ color:'#94A3B8', fontSize:'14px' }}>{projects.length} projects posted</p>
                    </div>
                    <button onClick={() => setTab('create')} style={{ background:'linear-gradient(135deg,#00A651,#00C46A)', border:'none', color:'white', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:700, fontSize:'14px', fontFamily:"'DM Sans',sans-serif" }}>+ New Project</button>
                  </div>

                  {!profile && (
                    <div style={{ background:'rgba(253,185,19,0.08)', border:'1px solid rgba(253,185,19,0.2)', borderRadius:'14px', padding:'16px 20px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:'14px', color:'#FDB913', marginBottom:'3px' }}>⚠️ Complete your organization profile</p>
                        <p style={{ color:'#94A3B8', fontSize:'13px' }}>You need a profile before posting projects</p>
                      </div>
                      <button onClick={() => setTab('profile')} style={{ background:'rgba(253,185,19,0.15)', border:'1px solid rgba(253,185,19,0.3)', color:'#FDB913', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'13px', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>Set Up Profile →</button>
                    </div>
                  )}

                  <div className="stats-row" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
                    {[
                      { label:'Total', value:projects.length, color:'#4ADE80' },
                      { label:'Open', value:projects.filter(p=>p.project_status==='open').length, color:'#60B4F0' },
                      { label:'Pending', value:projects.filter(p=>p.project_status==='pending_approval').length, color:'#FDB913' },
                      { label:'Completed', value:projects.filter(p=>p.project_status==='completed').length, color:'#A78BFA' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', textAlign:'center' }}>
                        <div style={{ fontSize:'26px', fontWeight:800, color:stat.color, fontFamily:"'Syne',sans-serif" }}>{stat.value}</div>
                        <div style={{ color:'#94A3B8', fontSize:'12px', fontWeight:500, marginTop:'3px' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {projects.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
                      <div style={{ fontSize:'48px', marginBottom:'16px' }}>📁</div>
                      <p style={{ fontSize:'16px', fontWeight:600, color:'#F1F5F9', marginBottom:'8px' }}>No projects yet</p>
                      <button onClick={() => setTab('create')} style={{ background:'rgba(0,166,81,0.15)', border:'1px solid rgba(0,166,81,0.3)', color:'#4ADE80', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'14px', fontFamily:"'DM Sans',sans-serif" }}>Create First Project →</button>
                    </div>
                  ) : (
                    <div className="projects-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'16px' }}>
                      {projects.map((project, i) => (
                        <div key={project.id} className="dash-card" style={{ padding:'24px', animationDelay:`${i*0.05}s` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px', flexWrap:'wrap', gap:'6px' }}>
                            <span style={{ background:'rgba(0,166,81,0.15)', border:'1px solid rgba(0,166,81,0.3)', color:'#4ADE80', padding:'4px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>{project.project_status}</span>
                            <span style={{ background:project.participation_type==='team'?'rgba(253,185,19,0.15)':'rgba(10,110,189,0.15)', border:`1px solid ${project.participation_type==='team'?'rgba(253,185,19,0.3)':'rgba(10,110,189,0.3)'}`, color:project.participation_type==='team'?'#FDB913':'#60B4F0', padding:'4px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>
                              {project.participation_type==='team'?`👥 Team ${project.team_size_min}–${project.team_size_max}`:'👤 Individual'}
                            </span>
                          </div>
                          <h3 style={{ fontSize:'16px', fontWeight:700, marginBottom:'8px' }}>{project.project_name}</h3>
                          <p style={{ color:'#94A3B8', fontSize:'13px', lineHeight:1.6, marginBottom:'14px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{project.description}</p>
                          {project.skills_required?.length > 0 && (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'14px' }}>
                              {project.skills_required.slice(0,3).map(s => <span key={s} className="skill-tag">{s}</span>)}
                            </div>
                          )}
                          <button onClick={() => handleSelectProject(project)} style={{ width:'100%', background:'rgba(0,166,81,0.1)', border:'1px solid rgba(0,166,81,0.25)', color:'#4ADE80', padding:'10px', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'13px', fontFamily:"'DM Sans',sans-serif" }}>
                            View Applications →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CREATE */}
              {tab === 'create' && (
                <div style={{ animation:'fadeUp 0.4s ease', maxWidth:'640px' }}>
                  <div style={{ marginBottom:'24px' }}>
                    <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>Create Project</h1>
                    <p style={{ color:'#94A3B8', fontSize:'14px' }}>Post a new opportunity for students to discover and apply</p>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'28px', display:'flex', flexDirection:'column', gap:'16px' }}>
                    <div>
                      <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Project Title *</label>
                      <input className="ngo-input" placeholder="e.g. Community Health Data Analyst" value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name:e.target.value})} />
                    </div>
                    <div>
                      <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Description *</label>
                      <textarea className="ngo-input" placeholder="Describe the project, what the student will do, and what impact it will have..." value={projectForm.description} onChange={e => setProjectForm({...projectForm, description:e.target.value})} rows={4} style={{ resize:'vertical' }} />
                    </div>

                    <div>
                      <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'8px' }}>Participation Type</label>
                      <div style={{ display:'flex', gap:'10px' }}>
                        <button className={`part-btn ${projectForm.participation_type==='individual'?'ai':''}`} onClick={() => setProjectForm({...projectForm, participation_type:'individual'})}>
                          <div style={{ fontSize:'20px', marginBottom:'3px' }}>👤</div>
                          <div>Individual</div>
                          <div style={{ fontSize:'11px', opacity:0.7, marginTop:'2px' }}>Solo applicant</div>
                        </button>
                        <button className={`part-btn ${projectForm.participation_type==='team'?'at':''}`} onClick={() => setProjectForm({...projectForm, participation_type:'team'})}>
                          <div style={{ fontSize:'20px', marginBottom:'3px' }}>👥</div>
                          <div>Team Project</div>
                          <div style={{ fontSize:'11px', opacity:0.7, marginTop:'2px' }}>2–5 members</div>
                        </button>
                      </div>
                    </div>

                    {projectForm.participation_type === 'team' && (
                      <div style={{ background:'rgba(253,185,19,0.06)', border:'1px solid rgba(253,185,19,0.2)', borderRadius:'12px', padding:'16px' }}>
                        <label style={{ color:'#FDB913', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'10px' }}>Team Size Requirements</label>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                          <div>
                            <label style={{ color:'#94A3B8', fontSize:'11px', display:'block', marginBottom:'4px' }}>Min members</label>
                            <input className="ngo-input" type="number" min="2" max="5" value={projectForm.team_size_min} onChange={e => setProjectForm({...projectForm, team_size_min:e.target.value})} />
                          </div>
                          <div>
                            <label style={{ color:'#94A3B8', fontSize:'11px', display:'block', marginBottom:'4px' }}>Max members</label>
                            <input className="ngo-input" type="number" min="2" max="5" value={projectForm.team_size_max} onChange={e => setProjectForm({...projectForm, team_size_max:e.target.value})} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                      {[
                        { key:'sdg_focus', label:'SDG Focus', placeholder:'e.g. SDG 3 — Good Health' },
                        { key:'location', label:'Location', placeholder:'Remote / Nairobi / etc.' },
                        { key:'duration_weeks', label:'Duration (weeks)', placeholder:'e.g. 8', type:'number' },
                        { key:'project_slug', label:'Project Slug', placeholder:'auto-generated' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>{f.label}</label>
                          <input className="ngo-input" type={f.type||'text'} placeholder={f.placeholder} value={(projectForm as any)[f.key]} onChange={e => setProjectForm({...projectForm, [f.key]:e.target.value})} />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Skills Required (comma separated)</label>
                      <input className="ngo-input" placeholder="Python, Data Analysis, Communication..." value={projectForm.skills_required} onChange={e => setProjectForm({...projectForm, skills_required:e.target.value})} />
                      {projectForm.skills_required && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'8px' }}>
                          {projectForm.skills_required.split(',').map(s=>s.trim()).filter(Boolean).map(s => <span key={s} className="skill-tag">{s}</span>)}
                        </div>
                      )}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <button onClick={() => setProjectForm({...projectForm, is_remote:!projectForm.is_remote})}
                        style={{ width:'44px', height:'24px', borderRadius:'999px', border:'none', background:projectForm.is_remote?'rgba(0,166,81,0.4)':'rgba(255,255,255,0.1)', cursor:'pointer', position:'relative', transition:'all 0.2s ease', flexShrink:0 }}>
                        <div style={{ position:'absolute', top:'3px', left:projectForm.is_remote?'22px':'3px', width:'18px', height:'18px', borderRadius:'50%', background:projectForm.is_remote?'#4ADE80':'#94A3B8', transition:'all 0.2s ease' }} />
                      </button>
                      <span style={{ color:projectForm.is_remote?'#4ADE80':'#94A3B8', fontSize:'13px', fontWeight:600 }}>Remote-friendly</span>
                    </div>

                    <button className="save-btn" onClick={handleCreateProject} disabled={saving} style={{ alignSelf:'flex-start' }}>
                      {saving ? '⏳ Creating...' : '🚀 Create Project →'}
                    </button>
                  </div>
                </div>
              )}

              {/* APPLICATIONS */}
              {tab === 'applications' && (
                <div style={{ animation:'fadeUp 0.4s ease' }}>
                  <div style={{ marginBottom:'24px' }}>
                    <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>
                      {selectedProject ? `Applications — ${selectedProject.project_name}` : 'Applications'}
                    </h1>
                    <p style={{ color:'#94A3B8', fontSize:'14px' }}>{selectedProject ? 'Review and manage applicants' : 'Select a project from My Projects'}</p>
                  </div>
                  {!selectedProject ? (
                    <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
                      <div style={{ fontSize:'48px', marginBottom:'16px' }}>👥</div>
                      <p style={{ fontSize:'16px', fontWeight:600, color:'#F1F5F9', marginBottom:'12px' }}>No project selected</p>
                      <button onClick={() => setTab('projects')} style={{ background:'rgba(0,166,81,0.15)', border:'1px solid rgba(0,166,81,0.3)', color:'#4ADE80', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'14px', fontFamily:"'DM Sans',sans-serif" }}>Go to My Projects →</button>
                    </div>
                  ) : (
                    (applications[selectedProject.id] || []).length === 0 ? (
                      <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
                        <div style={{ fontSize:'48px', marginBottom:'16px' }}>📭</div>
                        <p style={{ fontSize:'16px', fontWeight:600, color:'#F1F5F9' }}>No applications yet</p>
                        <p style={{ fontSize:'14px', marginTop:'8px' }}>Make sure the project status is set to "open"</p>
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                        {(applications[selectedProject.id] || []).map((app, i) => (
                          <div key={app.application_id} className="dash-card" style={{ padding:'20px 24px', animationDelay:`${i*0.05}s` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
                              <div>
                                <p style={{ fontWeight:600, fontSize:'15px', marginBottom:'4px' }}>Student Applicant</p>
                                <p style={{ color:'#94A3B8', fontSize:'12px' }}>ID: {app.student_id.slice(0,8)}...</p>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                                <span style={{ background:statusBg(app.status), border:`1px solid ${statusColor(app.status)}40`, color:statusColor(app.status), padding:'5px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:600, textTransform:'capitalize' }}>{app.status}</span>
                                <div style={{ display:'flex', gap:'5px' }}>
                                  {['shortlisted','selected','rejected'].map(s => (
                                    <button key={s} className="status-btn" onClick={() => handleUpdateApplication(app.application_id, s)}
                                      style={{ background:s==='selected'?'rgba(0,166,81,0.15)':s==='rejected'?'rgba(229,62,62,0.15)':'rgba(253,185,19,0.15)', color:s==='selected'?'#4ADE80':s==='rejected'?'#FC8181':'#FDB913', border:`1px solid ${s==='selected'?'rgba(0,166,81,0.3)':s==='rejected'?'rgba(229,62,62,0.3)':'rgba(253,185,19,0.3)'}` }}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* PROFILE */}
              {tab === 'profile' && (
                <div style={{ animation:'fadeUp 0.4s ease', maxWidth:'600px' }}>
                  <div style={{ marginBottom:'24px' }}>
                    <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>Organization Profile</h1>
                    <p style={{ color:'#94A3B8', fontSize:'14px' }}>{profile ? 'Your profile is live and visible to students' : 'Complete your profile to start posting projects'}</p>
                  </div>

                  <div style={{ background:'rgba(0,166,81,0.06)', border:'1px solid rgba(0,166,81,0.15)', borderRadius:'16px', padding:'20px', marginBottom:'20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'52px', height:'52px', borderRadius:'12px', background:'linear-gradient(135deg,#00A651,#0A6EBD)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', flexShrink:0 }}>
                        {ORG_TYPES.find(t=>t.value===profileForm.organization_type)?.icon || '🏢'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'3px' }}>
                          <p style={{ fontWeight:700, fontSize:'16px' }}>{profile?.organization_name || `${user?.first_name} ${user?.last_name}`}</p>
                          {profile ? <span className="profile-complete">✓ Profile Active</span> : <span className="profile-incomplete">⚠ Setup Required</span>}
                        </div>
                        <p style={{ color:'#94A3B8', fontSize:'13px' }}>{user?.email}</p>
                        {profile?.country && <p style={{ color:'#94A3B8', fontSize:'12px', marginTop:'2px' }}>📍 {profile.country}</p>}
                      </div>
                    </div>
                  </div>

                  <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
                    <p style={{ fontSize:'13px', fontWeight:700, color:'#F1F5F9' }}>{profile ? '✏️ Edit Organization' : '🏢 Setup Organization'}</p>

                    <div>
                      <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'8px' }}>Organization Type *</label>
                      <div className="org-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                        {ORG_TYPES.map(opt => (
                          <button key={opt.value} className={`org-btn ${profileForm.organization_type===opt.value?'active':''}`} onClick={() => setProfileForm({...profileForm, organization_type:opt.value})}>
                            <div style={{ fontSize:'18px', marginBottom:'3px' }}>{opt.icon}</div>
                            <div style={{ fontSize:'12px', fontWeight:700 }}>{opt.label}</div>
                            <div style={{ fontSize:'10px', opacity:0.6, marginTop:'1px' }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {[
                      { key:'organization_name', label:'Organization Name *', placeholder:`Your ${selectedOrgType?.label || 'organization'} name` },
                      { key:'organization_slug', label:'Slug', placeholder:'your-org-slug (auto-generated)' },
                      { key:'mission_statement', label:'Mission Statement *', placeholder:'What is your mission and how does it relate to the SDGs?' },
                      { key:'primary_email', label:'Primary Email *', placeholder:'contact@yourorganization.com' },
                      { key:'website', label:'Website', placeholder:'https://yourorganization.com' },
                      { key:'country', label:'Country / Region', placeholder:'e.g. Kenya, East Africa' },
                      { key:'contact_phone', label:'Contact Phone', placeholder:'+254 700 000 000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>{f.label}</label>
                        {f.key === 'mission_statement' ? (
                          <textarea className="ngo-input" placeholder={f.placeholder} value={(profileForm as any)[f.key]} onChange={e => setProfileForm({...profileForm, [f.key]:e.target.value})} rows={3} style={{ resize:'vertical' }} />
                        ) : (
                          <input className="ngo-input" placeholder={f.placeholder} value={(profileForm as any)[f.key]} onChange={e => setProfileForm({...profileForm, [f.key]:e.target.value})} />
                        )}
                      </div>
                    ))}

                    <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? '⏳ Saving...' : profile ? '💾 Update Profile' : '🚀 Create Organization Profile'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default NgoDashboard
