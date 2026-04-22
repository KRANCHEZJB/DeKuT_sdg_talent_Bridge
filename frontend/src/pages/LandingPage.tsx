import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Stats {
  total_students: number
  verified_students: number
  total_organizations: number
  approved_orgs: number
  total_projects: number
  open_projects: number
  total_applications: number
}

interface Project {
  id: string
  title: string
  description: string
  skills_required: string[]
  duration_weeks: number
  location: string
  project_type: string
  sdg_tags: string[]
  organization?: { organization_name: string }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────
const useCountUp = (target: number, duration = 2000, start = false) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || target === 0) return
    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

const useFadeIn = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

// ─── STATIC CONTENT ───────────────────────────────────────────────────────────
const STUDENT_FEATURES = [
  { icon: '🗂️', title: 'Build a Real Portfolio', desc: 'Work on verified NGO projects you can proudly show employers.' },
  { icon: '🌍', title: 'Work on Live Projects', desc: 'Real impact, not simulations. Your work changes lives.' },
  { icon: '✅', title: 'Get Verified Experience', desc: 'Earn certificates and recommendation letters from DeKUT.' },
  { icon: '🔍', title: 'Get Discovered', desc: 'NGOs browse student profiles and reach out directly.' },
]

const NGO_FEATURES = [
  { icon: '⚡', title: 'Access Skilled Students', desc: 'Tap into a verified pool of talented students ready to contribute.' },
  { icon: '📋', title: 'Post Projects in Minutes', desc: 'Simple form, fast approval. Your project goes live quickly.' },
  { icon: '📊', title: 'Track Progress Easily', desc: 'Manage applications and select the best candidates effortlessly.' },
  { icon: '💡', title: 'Scale Impact Affordably', desc: 'Extend your team with passionate student talent at no cost.' },
]

const SDG_ICONS: Record<string, string> = {
  'SDG 1': '🏚️', 'SDG 2': '🌾', 'SDG 3': '🏥', 'SDG 4': '📚',
  'SDG 5': '♀️', 'SDG 6': '💧', 'SDG 7': '☀️', 'SDG 8': '💼',
  'SDG 9': '🏗️', 'SDG 10': '⚖️', 'SDG 11': '🏙️', 'SDG 12': '♻️',
  'SDG 13': '🌱', 'SDG 14': '🐟', 'SDG 15': '🌳', 'SDG 16': '🕊️', 'SDG 17': '🤝',
}

const getProjectIcon = (sdgTags: string[]) => {
  if (!sdgTags?.length) return '📁'
  const first = sdgTags[0]
  for (const key of Object.keys(SDG_ICONS)) {
    if (first.toUpperCase().includes(key)) return SDG_ICONS[key]
  }
  return '📁'
}

// ─── SKELETON COMPONENTS ──────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: '14px', width: '70%', borderRadius: '6px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '11px', width: '45%', borderRadius: '6px' }} />
      </div>
    </div>
    <div className="skeleton" style={{ height: '11px', width: '40%', borderRadius: '6px', marginBottom: '10px' }} />
    <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '22px', width: '55px', borderRadius: '999px' }} />)}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div className="skeleton" style={{ height: '11px', width: '30%', borderRadius: '6px' }} />
      <div className="skeleton" style={{ height: '11px', width: '25%', borderRadius: '6px' }} />
    </div>
  </div>
)

const SkeletonStat = () => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
    <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 12px' }} />
    <div className="skeleton" style={{ height: '48px', width: '80px', borderRadius: '8px', margin: '0 auto 10px' }} />
    <div className="skeleton" style={{ height: '14px', width: '120px', borderRadius: '6px', margin: '0 auto' }} />
  </div>
)

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate()
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [userType, setUserType] = useState<'student' | 'ngo'>('student')
  const [hoveredProject, setHoveredProject] = useState<number | null>(null)

  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Fetch real stats
  useEffect(() => {
    axios.get('http://localhost:8000/stats')
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [])

  // Fetch real projects
  useEffect(() => {
    axios.get('http://localhost:8000/projects', { params: { limit: 6 } })
      .then(res => {
        const data = res.data
        setProjects(Array.isArray(data) ? data.slice(0, 6) : (data.projects || data.items || []).slice(0, 6))
      })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [])

  // Stats count-up
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.2 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const studentCount = useCountUp(stats?.total_students ?? 0, 2000, statsVisible)
  const orgCount = useCountUp(stats?.approved_orgs ?? 0, 2000, statsVisible)
  const projectCount = useCountUp(stats?.total_projects ?? 0, 2000, statsVisible)
  const appCount = useCountUp(stats?.total_applications ?? 0, 2000, statsVisible)

  const featuresRef = useFadeIn()
  const projectsRef = useFadeIn()
  const howRef = useFadeIn()
  const statsSection = useFadeIn()
  const ctaRef = useFadeIn()

  const features = userType === 'student' ? STUDENT_FEATURES : NGO_FEATURES
  const ctaText = userType === 'student' ? 'Find Your First Project →' : 'Post a Project →'

  return (
    <div style={{ backgroundColor: '#060D1F', color: '#F1F5F9', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(10,110,189,0.3); } 50% { box-shadow: 0 0 60px rgba(10,110,189,0.6); } }
        @keyframes orb1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-50px) scale(1.08); } }
        @keyframes orb2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-40px,30px) scale(0.95); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

        .fade-section { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .fade-section.visible { opacity: 1; transform: translateY(0); }

        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
        }

        .btn-primary {
          background: linear-gradient(135deg, #0A6EBD, #0891D4);
          border: none; color: white; cursor: pointer; font-weight: 700;
          transition: all 0.25s ease; position: relative; overflow: hidden;
          font-family: Inter, sans-serif; letter-spacing: 0.01em;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(10,110,189,0.5); }

        .btn-secondary {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
          color: white; cursor: pointer; font-weight: 600;
          transition: all 0.25s ease; font-family: Inter, sans-serif;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(10,110,189,0.5); transform: translateY(-2px); }

        .glass-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          background: rgba(255,255,255,0.07); border-color: rgba(10,110,189,0.35);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        .project-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 22px; cursor: pointer;
          transition: all 0.3s ease; position: relative; overflow: hidden;
        }
        .project-card:hover {
          background: rgba(255,255,255,0.07); border-color: rgba(0,166,81,0.35);
          transform: translateY(-5px); box-shadow: 0 20px 50px rgba(0,0,0,0.4);
        }
        .project-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,166,81,0.05), transparent);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .project-card:hover::before { opacity: 1; }

        .type-btn {
          flex: 1; padding: 18px 24px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); color: #94A3B8; cursor: pointer;
          font-family: Inter, sans-serif; font-size: 15px; font-weight: 600;
          transition: all 0.25s ease; text-align: center;
        }
        .type-btn.active-student {
          background: rgba(10,110,189,0.15); border-color: rgba(10,110,189,0.5);
          color: #60B4F0; box-shadow: 0 0 30px rgba(10,110,189,0.15);
        }
        .type-btn.active-ngo {
          background: rgba(0,166,81,0.15); border-color: rgba(0,166,81,0.5);
          color: #4ADE80; box-shadow: 0 0 30px rgba(0,166,81,0.15);
        }
        .type-btn:hover { transform: translateY(-2px); }

        .feature-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 24px; transition: all 0.3s ease;
          animation: slideIn 0.4s ease forwards;
        }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.3); }

        .stat-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 32px; text-align: center;
          transition: all 0.4s ease;
        }
        .stat-card:hover { border-color: rgba(10,110,189,0.4); box-shadow: 0 0 40px rgba(10,110,189,0.1); }

        .sdg-tag {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px; padding: 7px 14px; font-size: 12px; color: #94A3B8;
          font-weight: 500; transition: all 0.2s ease; cursor: default;
        }
        .sdg-tag:hover { background: rgba(10,110,189,0.15); border-color: rgba(10,110,189,0.4); color: #60B4F0; }

        .gradient-text {
          background: linear-gradient(135deg, #60B4F0, #00D4AA);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .nav-glass {
          background: rgba(6,13,31,0.88); backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .orb1 { animation: orb1 12s ease-in-out infinite; }
        .orb2 { animation: orb2 15s ease-in-out infinite; }
        .globe-float { animation: float 6s ease-in-out infinite; }
        .cta-glow { animation: pulse-glow 3s ease-in-out infinite; }

        @media (max-width: 900px) {
          .hero-h1 { font-size: 38px !important; }
          .hero-p { font-size: 15px !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }

        @media (max-width: 600px) {
          .hero-h1 { font-size: 30px !important; letter-spacing: -0.5px !important; }
          .hero-p { font-size: 14px !important; }
          .cta-row { flex-direction: column !important; }
          .globe-container { display: none !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .projects-grid { grid-template-columns: 1fr !important; }
          .type-selector { flex-direction: column !important; }
          .section-pad { padding: 48px 16px !important; }
          .hero-section { padding: 60px 16px 40px !important; }
          .nav-inner { padding: 0 16px !important; }
          .footer-grid { flex-direction: column !important; gap: 20px !important; }
          .footer-links { flex-direction: column !important; gap: 24px !important; }
          .section-inner { padding: 0 16px !important; }
          .cta-box { padding: 36px 20px !important; }
          .final-h2 { font-size: 28px !important; }
          .section-h2 { font-size: 26px !important; }
        }
      `}</style>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb1" style={{ position: 'absolute', top: '8%', left: '8%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,110,189,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="orb2" style={{ position: 'absolute', top: '45%', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,81,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="nav-glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="nav-inner" style={{ padding: '0 48px', height: '68px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <svg width="32" height="32" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="19" fill="url(#ng1)"/>
              <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
              <ellipse cx="19" cy="19" rx="8" ry="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
              <circle cx="19" cy="19" r="3.5" fill="white"/>
              <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
              <line x1="19" y1="0" x2="19" y2="38" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
              <defs><linearGradient id="ng1" x1="0" y1="0" x2="38" y2="38"><stop offset="0%" stopColor="#0A6EBD"/><stop offset="100%" stopColor="#00A651"/></linearGradient></defs>
            </svg>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>DeKUT SDG Talent Bridge</div>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>Dedan Kimathi University of Technology</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '14px' }}>Login</button>
            <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '14px' }}>Get Started →</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={{ position: 'relative', zIndex: 1, padding: '100px 48px 60px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.3)', color: '#60B4F0', padding: '7px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, marginBottom: '28px', animation: 'fadeIn 0.6s ease forwards' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0A6EBD', display: 'inline-block', boxShadow: '0 0 8px #0A6EBD' }} />
          DeKUT's official SDG student-NGO platform
        </div>

        <h1 className="hero-h1" style={{ fontSize: '58px', fontWeight: 800, lineHeight: 1.08, marginBottom: '22px', letterSpacing: '-1.5px', animation: 'fadeUp 0.7s ease forwards' }}>
          Turn Your Skills Into<br />
          <span className="gradient-text">Real-World Impact</span>
        </h1>

        <p className="hero-p" style={{ color: '#94A3B8', fontSize: '18px', lineHeight: 1.7, maxWidth: '540px', marginBottom: '40px', animation: 'fadeUp 0.7s 0.1s ease forwards', opacity: 0, animationFillMode: 'forwards' }}>
          DeKUT students work with verified NGOs on real projects — building portfolios, earning certificates, and advancing the UN SDGs.
        </p>

        <div className="cta-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', animation: 'fadeUp 0.7s 0.2s ease forwards', opacity: 0, animationFillMode: 'forwards' }}>
          <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '15px 32px', borderRadius: '14px', fontSize: '16px' }}>
            Find Opportunities →
          </button>
          <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '15px 32px', borderRadius: '14px', fontSize: '16px' }}>
            Post a Project
          </button>
        </div>

        <div className="globe-container globe-float" style={{ marginTop: '52px', display: 'flex' }}>
          <div className="cta-glow" style={{ width: '130px', height: '130px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #0A6EBD, #060D1F)', border: '1px solid rgba(10,110,189,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
              <ellipse cx="50" cy="50" rx="46" ry="18" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none"/>
              <ellipse cx="50" cy="50" rx="22" ry="46" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none"/>
              <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <circle cx="50" cy="50" r="6" fill="white" opacity="0.9"/>
              <circle cx="28" cy="35" r="3" fill="#FDB913" opacity="0.8"/>
              <circle cx="68" cy="42" r="3" fill="#00A651" opacity="0.8"/>
              <circle cx="42" cy="65" r="3" fill="#0A6EBD" opacity="0.8"/>
              <line x1="28" y1="35" x2="50" y2="50" stroke="rgba(253,185,19,0.4)" strokeWidth="1"/>
              <line x1="68" y1="42" x2="50" y2="50" stroke="rgba(0,166,81,0.4)" strokeWidth="1"/>
              <line x1="42" y1="65" x2="50" y2="50" stroke="rgba(10,110,189,0.4)" strokeWidth="1"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── WHO ARE YOU ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 48px 80px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <p style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '20px' }}>Who are you?</p>
          <div className="type-selector" style={{ display: 'flex', gap: '14px', maxWidth: '480px' }}>
            <button className={`type-btn ${userType === 'student' ? 'active-student' : ''}`} onClick={() => setUserType('student')}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎓</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>I'm a Student</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '3px' }}>Looking for projects</div>
            </button>
            <button className={`type-btn ${userType === 'ngo' ? 'active-ngo' : ''}`} onClick={() => setUserType('ngo')}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🌍</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>I'm an NGO</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '3px' }}>Seeking skilled talent</div>
            </button>
          </div>
        </div>

        <div ref={featuresRef.ref} className={`fade-section ${featuresRef.visible ? 'visible' : ''}`}>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '14px', marginTop: '20px' }}>
            {features.map((f, i) => (
              <div key={`${userType}-${i}`} className="feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#F1F5F9' }}>{f.title}</h3>
                <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '28px' }}>
            <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '15px' }}>
              {ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ── LIVE PROJECTS ── */}
      <section ref={projectsRef.ref} className={`fade-section ${projectsRef.visible ? 'visible' : ''}`} style={{ position: 'relative', zIndex: 1, padding: '80px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 className="section-h2" style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.5px' }}>Open Projects</h2>
              {!projectsLoading && (
                <span style={{ background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                  {projects.length} Live
                </span>
              )}
            </div>
            <p style={{ color: '#94A3B8', fontSize: '15px' }}>Real opportunities from verified NGOs — apply and make an impact</p>
          </div>

          {projectsLoading ? (
            <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '16px' }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>First projects launching soon</h3>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>We're an early-stage platform growing fast. Be among the first to post or apply.</p>
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px' }}>
                Join the Early Community →
              </button>
            </div>
          ) : (
            <>
              <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '16px' }}>
                {projects.map((p, i) => (
                  <div key={p.id} className="project-card"
                    onMouseEnter={() => setHoveredProject(i)}
                    onMouseLeave={() => setHoveredProject(null)}
                    onClick={() => navigate('/auth')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '26px', flexShrink: 0 }}>{getProjectIcon(p.sdg_tags)}</span>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</h3>
                        {p.sdg_tags?.length > 0 && (
                          <p style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 600 }}>{p.sdg_tags[0]}</p>
                        )}
                      </div>
                    </div>
                    {p.organization?.organization_name && (
                      <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>by {p.organization.organization_name}</p>
                    )}
                    {p.skills_required?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                        {p.skills_required.slice(0, 3).map(s => (
                          <span key={s} style={{ background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.2)', color: '#60B4F0', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                        ))}
                        {p.skills_required.length > 3 && (
                          <span style={{ color: '#64748B', fontSize: '11px', padding: '3px 4px' }}>+{p.skills_required.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        {p.duration_weeks ? `⏱ ${p.duration_weeks} weeks` : p.location ? `📍 ${p.location}` : ''}
                      </span>
                      <span style={{ fontSize: '12px', color: hoveredProject === i ? '#4ADE80' : '#64748B', fontWeight: 600, transition: 'color 0.2s ease' }}>
                        {hoveredProject === i ? 'Apply Now →' : 'View Details'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '32px' }}>
                <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px' }}>
                  View All Projects →
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={howRef.ref} className={`fade-section ${howRef.visible ? 'visible' : ''} section-pad`} style={{ position: 'relative', zIndex: 1, padding: '80px 48px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '44px' }}>
          <h2 className="section-h2" style={{ fontSize: '34px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.5px' }}>How It Works</h2>
          <p style={{ color: '#94A3B8', fontSize: '15px' }}>Three steps to real impact.</p>
        </div>
        <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
          {[
            { step: '01', title: 'Create Your Profile', desc: 'Set up in minutes. Students showcase skills; NGOs describe their mission.', color: '#60B4F0' },
            { step: '02', title: 'Match with Projects', desc: 'Browse curated opportunities aligned with your skills and the UN SDGs.', color: '#4ADE80' },
            { step: '03', title: 'Deliver Real Impact', desc: 'Collaborate, deliver results, and earn verified certificates from DeKUT.', color: '#FDB913' },
          ].map(item => (
            <div key={item.step} className="glass-card" style={{ padding: '32px', borderRadius: '20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${item.color}40, ${item.color}, ${item.color}40)` }} />
              <div style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, marginBottom: '14px', opacity: 0.2, color: item.color }}>{item.step}</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ color: '#94A3B8', lineHeight: 1.65, fontSize: '14px' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section ref={statsSection.ref} className={`fade-section ${statsSection.visible ? 'visible' : ''}`} style={{ position: 'relative', zIndex: 1, padding: '80px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
        <div ref={statsRef} style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 className="section-h2" style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.5px' }}>Growing Community</h2>
              <span style={{ background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.25)', color: '#60B4F0', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>LIVE DATA</span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '15px' }}>Real numbers from our platform — updated in real time</p>
          </div>

          {statsLoading ? (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px' }}>
              {[1, 2, 3, 4].map(i => <SkeletonStat key={i} />)}
            </div>
          ) : stats ? (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px' }}>
              {[
                { value: studentCount, label: 'Students', sublabel: `${stats.verified_students} verified`, color: '#60B4F0', icon: '🎓' },
                { value: orgCount,     label: 'NGO Partners', sublabel: `${stats.total_organizations} registered`, color: '#4ADE80', icon: '🌱' },
                { value: projectCount, label: 'Projects', sublabel: `${stats.open_projects} open now`, color: '#FDB913', icon: '📁' },
                { value: appCount,     label: 'Applications', sublabel: 'submitted', color: '#C084FC', icon: '📨' },
              ].map(stat => (
                <div key={stat.label} className="stat-card">
                  <div style={{ fontSize: '26px', marginBottom: '10px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '44px', fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: '6px' }}>{stat.value}</div>
                  <div style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>{stat.sublabel}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <p style={{ color: '#64748B', fontSize: '14px' }}>Stats unavailable — backend may be offline.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── SDG TAGS ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>Aligned with all 17 UN Sustainable Development Goals</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['No Poverty','Zero Hunger','Good Health','Quality Education','Gender Equality','Clean Water','Clean Energy','Decent Work','Innovation','Reduced Inequalities','Sustainable Cities','Responsible Consumption','Climate Action','Life Below Water','Life on Land','Peace & Justice','Partnerships'].map(sdg => (
              <span key={sdg} className="sdg-tag">{sdg}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section ref={ctaRef.ref} className={`fade-section ${ctaRef.visible ? 'visible' : ''}`} style={{ position: 'relative', zIndex: 1, padding: '80px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="cta-box" style={{ background: 'rgba(10,110,189,0.06)', border: '1px solid rgba(10,110,189,0.15)', borderRadius: '24px', padding: '60px 48px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,110,189,0.15), transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,81,0.1), transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
            <h2 className="final-h2" style={{ fontSize: '38px', fontWeight: 800, marginBottom: '12px', position: 'relative', zIndex: 1, letterSpacing: '-0.5px' }}>Ready to Make an Impact?</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '12px', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>Join a growing community of DeKUT students and NGOs advancing the UN SDGs.</p>
            <p style={{ color: '#60B4F0', fontSize: '13px', fontWeight: 600, marginBottom: '32px', position: 'relative', zIndex: 1 }}>⚡ Get started in under 2 minutes</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '15px 28px', borderRadius: '12px', fontSize: '15px' }}>🎓 Join as Student</button>
              <button onClick={() => navigate('/auth')} style={{ padding: '15px 28px', borderRadius: '12px', fontSize: '15px', background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', cursor: 'pointer', fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all 0.25s ease' }}>
                🌍 Partner as NGO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 48px' }}>
        <div className="footer-grid" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <svg width="22" height="22" viewBox="0 0 38 38" fill="none">
                <circle cx="19" cy="19" r="19" fill="#0A6EBD"/>
                <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
                <circle cx="19" cy="19" r="3" fill="white"/>
                <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
              </svg>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>DeKUT SDG Talent Bridge</span>
            </div>
            <p style={{ color: '#475569', fontSize: '13px', maxWidth: '220px', lineHeight: 1.6 }}>Connecting DeKUT student talent with NGOs advancing the UN SDGs.</p>
          </div>
          <div className="footer-links" style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: '#F1F5F9' }}>Platform</p>
              {['Browse Projects', 'For Students', 'For NGOs', 'How It Works'].map(l => (
                <p key={l} onClick={() => navigate('/auth')} style={{ color: '#64748B', fontSize: '13px', marginBottom: '8px', cursor: 'pointer', transition: 'color 0.2s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>{l}</p>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: '#F1F5F9' }}>Institution</p>
              <a href="https://www.dkut.ac.ke/index.php/about-dekut/s5-accordion-menu/our-profile"
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', color: '#64748B', fontSize: '13px', marginBottom: '8px', textDecoration: 'none', transition: 'color 0.2s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>About DeKUT ↗</a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1280px', margin: '24px auto 0', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: '#475569', fontSize: '12px' }}>© 2026 DeKUT SDG Talent Bridge — Advancing the UN SDGs</p>
          <p style={{ color: '#475569', fontSize: '12px' }}>Built at Dedan Kimathi University of Technology 🇰🇪</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
