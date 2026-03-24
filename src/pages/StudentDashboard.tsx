import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProjects, applyToProject, getStudentProfile, createStudentProfile, getStudentApplications } from '../api/api'

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
  project_id: string
  status: string
}

interface StudentProfile {
  id: string
  display_name: string
  profile_slug: string
  bio: string
  skills: string[]
  engagement_status: string
}

const StudentDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'projects' | 'applications' | 'profile'>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'team'>('all')
  const [skillsInput, setSkillsInput] = useState('')
  const [profileForm, setProfileForm] = useState({
    display_name: '', profile_slug: '', bio: '', skills: [] as string[]
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projRes, appRes, profileRes] = await Promise.allSettled([
        getProjects(), getStudentApplications(), getStudentProfile()
      ])
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data)
      if (appRes.status === 'fulfilled') setApplications(appRes.value.data)
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data
        setProfile(p)
        setProfileForm({ display_name: p.display_name || '', profile_slug: p.profile_slug || '', bio: p.bio || '', skills: p.skills || [] })
        setSkillsInput((p.skills || []).join(', '))
      }
    } finally { setLoading(false) }
  }

  const handleApply = async (projectId: string) => {
    setApplying(projectId)
    try {
      await applyToProject(projectId)
      showToast('✅ Application submitted successfully!')
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
      showToast('✅ Profile saved successfully!')
      setProfileSaved(true)
      await loadData()
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Could not save profile', 'error')
    } finally { setSavingProfile(false) }
  }

  const hasApplied = (projectId: string) => applications.some(a => a.project_id === projectId)

  const filteredProjects = projects.filter(p => {
    const matchSearch = !searchTerm || p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sdg_focus?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = filterType === 'all' || p.participation_type === filterType
    return matchSearch && matchType
  })

  const statusColor = (s: string) => ({ applied: '#60B4F0', shortlisted: '#FDB913', selected: '#4ADE80', rejected: '#FC8181', completed: '#A78BFA' }[s] || '#94A3B8')
  const statusBg = (s: string) => ({ applied: 'rgba(10,110,189,0.15)', shortlisted: 'rgba(253,185,19,0.15)', selected: 'rgba(0,166,81,0.15)', rejected: 'rgba(229,62,62,0.15)', completed: 'rgba(167,139,250,0.15)' }[s] || 'rgba(148,163,184,0.1)')

  return (
    <div style={{ backgroundColor: '#060D1F', minHeight: '100vh', color: '#F1F5F9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px);} to { opacity:1; transform:translateY(0);} }
        @keyframes toastIn { from { opacity:0; transform:translateY(20px) translateX(-50%);} to { opacity:1; transform:translateY(0) translateX(-50%);} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        .dash-card { background:rgba(255,255,255,0.04); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); border-radius:16px; transition:all 0.3s ease; animation:fadeUp 0.5s ease forwards; }
        .dash-card:hover { border-color:rgba(10,110,189,0.3); transform:translateY(-2px); box-shadow:0 12px 40px rgba(0,0,0,0.3); }
        .apply-btn { background:linear-gradient(135deg,#0A6EBD,#0891D4); border:none; color:white; cursor:pointer; font-weight:600; font-size:13px; padding:10px 20px; border-radius:10px; transition:all 0.3s ease; font-family:'DM Sans',sans-serif; width:100%; }
        .apply-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(10,110,189,0.4); }
        .apply-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .apply-btn.applied { background:rgba(0,166,81,0.1); border:1px solid rgba(0,166,81,0.25); color:#4ADE80; }
        .profile-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 16px; color:#F1F5F9; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:all 0.2s ease; }
        .profile-input:focus { border-color:rgba(10,110,189,0.6); background:rgba(10,110,189,0.06); box-shadow:0 0 0 3px rgba(10,110,189,0.08); }
        .profile-input::placeholder { color:#475569; }
        .save-btn { background:linear-gradient(135deg,#0A6EBD,#0891D4); border:none; color:white; cursor:pointer; font-weight:700; padding:13px 28px; border-radius:12px; font-family:'DM Sans',sans-serif; font-size:14px; transition:all 0.3s ease; }
        .save-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(10,110,189,0.4); }
        .save-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .search-input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:11px 16px 11px 42px; color:#F1F5F9; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:all 0.2s ease; }
        .search-input:focus { border-color:rgba(10,110,189,0.5); }
        .search-input::placeholder { color:#475569; }
        .filter-btn { padding:7px 14px; border-radius:999px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:#94A3B8; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; transition:all 0.2s ease; }
        .filter-btn.fa { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); color:#F1F5F9; }
        .filter-btn.fi { background:rgba(10,110,189,0.15); border-color:rgba(10,110,189,0.4); color:#60B4F0; }
        .filter-btn.ft { background:rgba(253,185,19,0.15); border-color:rgba(253,185,19,0.4); color:#FDB913; }
        .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); backdrop-filter:blur(20px); padding:13px 22px; border-radius:12px; font-size:13px; font-weight:600; z-index:9999; animation:toastIn 0.3s ease forwards; white-space:nowrap; }
        .toast.success { background:rgba(0,166,81,0.15); border:1px solid rgba(0,166,81,0.3); color:#4ADE80; }
        .toast.error { background:rgba(229,62,62,0.12); border:1px solid rgba(229,62,62,0.3); color:#FC8181; }
        .nav-glass { background:rgba(6,13,31,0.88); backdrop-filter:blur(24px); border-bottom:1px solid rgba(255,255,255,0.06); }
        .skill-tag { background:rgba(10,110,189,0.1); border:1px solid rgba(10,110,189,0.2); color:#60B4F0; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:600; }
        .profile-complete-badge { background:rgba(0,166,81,0.12); border:1px solid rgba(0,166,81,0.25); color:#4ADE80; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; }
        .profile-incomplete-badge { background:rgba(253,185,19,0.12); border:1px solid rgba(253,185,19,0.25); color:#FDB913; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; animation:pulse 2s infinite; }
        @media (max-width:768px) {
          .dash-layout { flex-direction:column !important; }
          .dash-sidebar { width:100% !important; flex-direction:row !important; overflow-x:auto; padding:10px !important; gap:6px !important; border-right:none !important; border-bottom:1px solid rgba(255,255,255,0.05) !important; }
          .sidebar-tab { white-space:nowrap; padding:8px 12px !important; font-size:12px !important; }
          .main-content { padding:16px !important; }
          .projects-grid { grid-template-columns:1fr !important; }
          .stats-row { grid-template-columns:repeat(2,1fr) !important; }
        }
      `}</style>

      {toast && <div className={`toast ${toastType}`}>{toast}</div>}

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'10%', right:'10%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(10,110,189,0.06) 0%, transparent 70%)', filter:'blur(40px)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize:'60px 60px' }} />
      </div>

      {/* Navbar */}
      <nav className="nav-glass" style={{ position:'sticky', top:0, zIndex:100, padding:'0 24px', height:'64px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <svg width="28" height="28" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="19" fill="url(#sn1)"/>
            <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
            <circle cx="19" cy="19" r="3.5" fill="white"/>
            <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
            <defs><linearGradient id="sn1" x1="0" y1="0" x2="38" y2="38"><stop offset="0%" stopColor="#0A6EBD"/><stop offset="100%" stopColor="#0891D4"/></linearGradient></defs>
          </svg>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'16px' }}>SDG Talent Bridge</span>
          <span style={{ background:'rgba(10,110,189,0.15)', border:'1px solid rgba(10,110,189,0.3)', color:'#60B4F0', padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>Student</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {!profile && (
            <button onClick={() => setTab('profile')} style={{ background:'rgba(253,185,19,0.12)', border:'1px solid rgba(253,185,19,0.3)', color:'#FDB913', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              ⚠️ Complete Profile
            </button>
          )}
          <span style={{ color:'#94A3B8', fontSize:'13px' }}>👋 {user?.first_name}</span>
          <button onClick={() => { logout(); navigate('/') }} style={{ background:'rgba(229,62,62,0.1)', border:'1px solid rgba(229,62,62,0.2)', color:'#FC8181', padding:'7px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dash-layout" style={{ display:'flex', position:'relative', zIndex:1, minHeight:'calc(100vh - 64px)' }}>

        {/* Sidebar */}
        <div className="dash-sidebar" style={{ width:'220px', flexShrink:0, padding:'20px 14px', display:'flex', flexDirection:'column', gap:'4px', borderRight:'1px solid rgba(255,255,255,0.05)' }}>
          {[
            { key:'projects', icon:'🔍', label:'Browse Projects', count:projects.length },
            { key:'applications', icon:'📋', label:'My Applications', count:applications.length },
            { key:'profile', icon:'👤', label:'My Profile', badge: !profile ? '!' : null },
          ].map((item) => (
            <button key={item.key} className="sidebar-tab" onClick={() => setTab(item.key as any)}
              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', borderRadius:'12px', border:'none', background:tab === item.key ? 'rgba(10,110,189,0.15)' : 'transparent', color:tab === item.key ? '#60B4F0' : '#94A3B8', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'14px', fontWeight:600, textAlign:'left', transition:'all 0.2s ease', width:'100%' }}>
              <span style={{ fontSize:'16px' }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.count !== undefined && item.count !== null && <span style={{ background:'rgba(255,255,255,0.08)', padding:'2px 8px', borderRadius:'999px', fontSize:'11px' }}>{item.count}</span>}
              {item.badge && <span style={{ background:'rgba(253,185,19,0.2)', color:'#FDB913', width:'18px', height:'18px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700 }}>{item.badge}</span>}
            </button>
          ))}

          {/* Profile preview in sidebar */}
          {profile && (
            <div style={{ marginTop:'auto', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ background:'rgba(10,110,189,0.08)', border:'1px solid rgba(10,110,189,0.15)', borderRadius:'12px', padding:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#0A6EBD,#0891D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, flexShrink:0 }}>
                    {profile.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.display_name}</p>
                    <span className="profile-complete-badge">✓ Profile Active</span>
                  </div>
                </div>
                {profile.skills?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                    {profile.skills.slice(0,3).map(s => <span key={s} style={{ background:'rgba(10,110,189,0.1)', color:'#60B4F0', padding:'2px 7px', borderRadius:'999px', fontSize:'10px', fontWeight:600 }}>{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="main-content" style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px', color:'#94A3B8' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div>
                <p>Loading your dashboard...</p>
              </div>
            </div>
          ) : (
            <>
              {/* PROJECTS TAB */}
              {tab === 'projects' && (
                <div style={{ animation:'fadeUp 0.4s ease' }}>
                  <div style={{ marginBottom:'20px' }}>
                    <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>Browse Projects</h1>
                    <p style={{ color:'#94A3B8', fontSize:'14px' }}>{filteredProjects.length} of {projects.length} open opportunities</p>
                  </div>

                  {!profile && (
                    <div style={{ background:'rgba(253,185,19,0.08)', border:'1px solid rgba(253,185,19,0.2)', borderRadius:'14px', padding:'16px 20px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:'14px', color:'#FDB913', marginBottom:'3px' }}>⚠️ Complete your profile first</p>
                        <p style={{ color:'#94A3B8', fontSize:'13px' }}>You need a profile before you can apply to projects</p>
                      </div>
                      <button onClick={() => setTab('profile')} style={{ background:'rgba(253,185,19,0.15)', border:'1px solid rgba(253,185,19,0.3)', color:'#FDB913', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'13px', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                        Set Up Profile →
                      </button>
                    </div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px' }}>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#475569', fontSize:'15px' }}>🔍</span>
                      <input className="search-input" placeholder="Search by title, description or SDG..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                      <button className={`filter-btn ${filterType === 'all' ? 'fa' : ''}`} onClick={() => setFilterType('all')}>All</button>
                      <button className={`filter-btn ${filterType === 'individual' ? 'fi' : ''}`} onClick={() => setFilterType('individual')}>👤 Individual</button>
                      <button className={`filter-btn ${filterType === 'team' ? 'ft' : ''}`} onClick={() => setFilterType('team')}>👥 Team</button>
                    </div>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
                      <div style={{ fontSize:'48px', marginBottom:'16px' }}>🌍</div>
                      <p style={{ fontSize:'16px', fontWeight:600, color:'#F1F5F9', marginBottom:'8px' }}>{searchTerm || filterType !== 'all' ? 'No matches found' : 'No projects yet'}</p>
                      <p>{searchTerm || filterType !== 'all' ? 'Try adjusting your filters' : 'Check back soon — NGOs are adding projects'}</p>
                    </div>
                  ) : (
                    <div className="projects-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:'16px' }}>
                      {filteredProjects.map((project, i) => (
                        <div key={project.id} className="dash-card" style={{ padding:'24px', animationDelay:`${i*0.05}s` }}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'12px' }}>
                            {project.sdg_focus && <span style={{ background:'rgba(0,166,81,0.15)', border:'1px solid rgba(0,166,81,0.3)', color:'#4ADE80', padding:'4px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>🎯 {project.sdg_focus}</span>}
                            <span style={{ background:project.participation_type === 'team' ? 'rgba(253,185,19,0.15)' : 'rgba(10,110,189,0.15)', border:`1px solid ${project.participation_type === 'team' ? 'rgba(253,185,19,0.3)' : 'rgba(10,110,189,0.3)'}`, color:project.participation_type === 'team' ? '#FDB913' : '#60B4F0', padding:'4px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:600 }}>
                              {project.participation_type === 'team' ? `👥 Team ${project.team_size_min}–${project.team_size_max}` : '👤 Individual'}
                            </span>
                          </div>
                          <h3 style={{ fontSize:'16px', fontWeight:700, marginBottom:'8px', lineHeight:1.4 }}>{project.project_name}</h3>
                          <p style={{ color:'#94A3B8', fontSize:'13px', lineHeight:1.6, marginBottom:'12px', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{project.description}</p>
                          {project.skills_required?.length > 0 && (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'12px' }}>
                              {project.skills_required.slice(0,4).map(s => <span key={s} className="skill-tag">{s}</span>)}
                            </div>
                          )}
                          <div style={{ display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
                            {project.location && <span style={{ color:'#94A3B8', fontSize:'12px' }}>📍 {project.location}</span>}
                            {project.duration_weeks && <span style={{ color:'#94A3B8', fontSize:'12px' }}>⏱ {project.duration_weeks} weeks</span>}
                          </div>
                          <button className={`apply-btn ${hasApplied(project.id) ? 'applied' : ''}`} onClick={() => !hasApplied(project.id) && !profile ? (showToast('Complete your profile first!', 'error'), setTab('profile')) : handleApply(project.id)} disabled={applying === project.id || hasApplied(project.id)}>
                            {applying === project.id ? '⏳ Applying...' : hasApplied(project.id) ? '✓ Applied' : 'Apply Now →'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* APPLICATIONS TAB */}
              {tab === 'applications' && (
                <div style={{ animation:'fadeUp 0.4s ease' }}>
                  <div style={{ marginBottom:'24px' }}>
                    <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>My Applications</h1>
                    <p style={{ color:'#94A3B8', fontSize:'14px' }}>Track the status of your project applications</p>
                  </div>
                  <div className="stats-row" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
                    {[
                      { label:'Total', value:applications.length, color:'#60B4F0' },
                      { label:'Shortlisted', value:applications.filter(a=>a.status==='shortlisted').length, color:'#FDB913' },
                      { label:'Selected', value:applications.filter(a=>a.status==='selected').length, color:'#4ADE80' },
                      { label:'Completed', value:applications.filter(a=>a.status==='completed').length, color:'#A78BFA' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', textAlign:'center' }}>
                        <div style={{ fontSize:'26px', fontWeight:800, color:stat.color, fontFamily:"'Syne',sans-serif" }}>{stat.value}</div>
                        <div style={{ color:'#94A3B8', fontSize:'12px', fontWeight:500, marginTop:'3px' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  {applications.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
                      <div style={{ fontSize:'48px', marginBottom:'16px' }}>📋</div>
                      <p style={{ fontSize:'16px', fontWeight:600, color:'#F1F5F9', marginBottom:'8px' }}>No applications yet</p>
                      <button onClick={() => setTab('projects')} style={{ background:'rgba(10,110,189,0.15)', border:'1px solid rgba(10,110,189,0.3)', color:'#60B4F0', padding:'10px 20px', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'14px', fontFamily:"'DM Sans',sans-serif" }}>Browse Projects →</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {applications.map((app, i) => {
                        const project = projects.find(p => p.id === app.project_id)
                        return (
                          <div key={app.application_id} className="dash-card" style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', animationDelay:`${i*0.05}s` }}>
                            <div>
                              <h3 style={{ fontSize:'15px', fontWeight:600, marginBottom:'5px' }}>{project?.project_name || 'Project'}</h3>
                              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                                {project?.sdg_focus && <span style={{ color:'#94A3B8', fontSize:'12px' }}>🎯 {project.sdg_focus}</span>}
                                {project?.location && <span style={{ color:'#94A3B8', fontSize:'12px' }}>📍 {project.location}</span>}
                                {project?.participation_type && <span style={{ color:project.participation_type==='team'?'#FDB913':'#60B4F0', fontSize:'12px', fontWeight:600 }}>{project.participation_type==='team'?`👥 Team ${project.team_size_min}–${project.team_size_max}`:'👤 Individual'}</span>}
                              </div>
                            </div>
                            <span style={{ background:statusBg(app.status), border:`1px solid ${statusColor(app.status)}40`, color:statusColor(app.status), padding:'6px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:600, textTransform:'capitalize' }}>{app.status}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PROFILE TAB */}
              {tab === 'profile' && (
                <div style={{ animation:'fadeUp 0.4s ease', maxWidth:'580px' }}>
                  <div style={{ marginBottom:'24px' }}>
                    <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:800, marginBottom:'4px' }}>My Profile</h1>
                    <p style={{ color:'#94A3B8', fontSize:'14px' }}>{profile ? 'Your profile is visible to NGOs' : 'Complete your profile to start applying to projects'}</p>
                  </div>

                  {/* Account card */}
                  <div style={{ background:'rgba(10,110,189,0.06)', border:'1px solid rgba(10,110,189,0.15)', borderRadius:'16px', padding:'20px', marginBottom:'20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'linear-gradient(135deg,#0A6EBD,#0891D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:700, flexShrink:0 }}>
                        {user?.first_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px', flexWrap:'wrap' }}>
                          <p style={{ fontWeight:700, fontSize:'16px' }}>{user?.first_name} {user?.last_name}</p>
                          {profile ? <span className="profile-complete-badge">✓ Profile Complete</span> : <span className="profile-incomplete-badge">⚠ Incomplete</span>}
                        </div>
                        <p style={{ color:'#94A3B8', fontSize:'13px' }}>{user?.email}</p>
                        {profile && <p style={{ color:'#94A3B8', fontSize:'12px', marginTop:'2px' }}>@{profile.profile_slug}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Profile preview — shown if profile exists */}
                  {profile && (
                    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'20px' }}>
                      <p style={{ fontSize:'12px', fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'14px' }}>Profile Preview — visible to NGOs</p>
                      <h3 style={{ fontSize:'18px', fontWeight:700, marginBottom:'8px' }}>{profile.display_name}</h3>
                      {profile.bio && <p style={{ color:'#94A3B8', fontSize:'14px', lineHeight:1.6, marginBottom:'12px' }}>{profile.bio}</p>}
                      {profile.skills?.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {profile.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                        </div>
                      )}
                      {!profile.bio && !profile.skills?.length && (
                        <p style={{ color:'#475569', fontSize:'13px' }}>Add a bio and skills below to make your profile stronger.</p>
                      )}
                    </div>
                  )}

                  {/* Form */}
                  <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'24px' }}>
                    <p style={{ fontSize:'13px', fontWeight:700, color:'#F1F5F9', marginBottom:'16px' }}>{profile ? '✏️ Edit Profile' : '🚀 Create Your Profile'}</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                      <div>
                        <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Display Name *</label>
                        <input className="profile-input" placeholder="How NGOs will see you e.g. Alex Kimani" value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Profile Slug * <span style={{ color:'#475569', textTransform:'none', fontWeight:400 }}>(unique URL identifier)</span></label>
                        <input className="profile-input" placeholder="alex-kimani" value={profileForm.profile_slug} onChange={e => setProfileForm({...profileForm, profile_slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})} />
                      </div>
                      <div>
                        <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Bio</label>
                        <textarea className="profile-input" placeholder="Tell NGOs about yourself — your background, passion for SDGs, and what you can bring to their projects..." value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} rows={4} style={{ resize:'vertical' }} />
                      </div>
                      <div>
                        <label style={{ color:'#94A3B8', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'5px' }}>Skills <span style={{ color:'#475569', textTransform:'none', fontWeight:400 }}>(comma separated)</span></label>
                        <input className="profile-input" placeholder="Python, Data Analysis, Research, Communication..." value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
                        {skillsInput && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'8px' }}>
                            {skillsInput.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                              <span key={s} className="skill-tag">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="save-btn" onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile ? '⏳ Saving...' : profile ? '💾 Update Profile' : '🚀 Create Profile'}
                      </button>
                    </div>
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

export default StudentDashboard
