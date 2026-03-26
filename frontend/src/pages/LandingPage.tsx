import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const useCountUp = (target: number, duration: number = 2000, start: boolean = false) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
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

const LandingPage = () => {
  const navigate = useNavigate()
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)

  const students = useCountUp(500, 2000, statsVisible)
  const ngos = useCountUp(120, 2000, statsVisible)
  const projects = useCountUp(300, 2000, statsVisible)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.2 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ backgroundColor: '#060D1F', color: '#F1F5F9', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(10,110,189,0.3); }
          50% { box-shadow: 0 0 60px rgba(10,110,189,0.6); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.1); }
        }
        @keyframes orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 40px) scale(0.95); }
        }

        .hero-title { animation: fadeUp 0.8s ease forwards; }
        .hero-sub { animation: fadeUp 0.8s 0.15s ease forwards; opacity: 0; animation-fill-mode: forwards; }
        .hero-cta { animation: fadeUp 0.8s 0.3s ease forwards; opacity: 0; animation-fill-mode: forwards; }
        .hero-badge { animation: fadeIn 0.6s ease forwards; }

        .glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(10,110,189,0.4);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        .btn-primary {
          background: linear-gradient(135deg, #0A6EBD, #0891D4);
          border: none; color: white; cursor: pointer;
          font-weight: 600; transition: all 0.3s ease;
          position: relative; overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%; animation: shimmer 2s infinite;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(10,110,189,0.5); }

        .btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: white; cursor: pointer; font-weight: 600;
          transition: all 0.3s ease; backdrop-filter: blur(10px);
          font-family: 'DM Sans', sans-serif;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(10,110,189,0.5); transform: translateY(-2px); }

        .nav-glass {
          background: rgba(6,13,31,0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .stat-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.07);
          transition: all 0.4s ease;
        }
        .stat-card:hover { border-color: rgba(10,110,189,0.5); box-shadow: 0 0 40px rgba(10,110,189,0.15); }

        .sdg-tag {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease; cursor: default;
        }
        .sdg-tag:hover { background: rgba(10,110,189,0.15); border-color: rgba(10,110,189,0.5); color: #60B4F0; }

        .gradient-text {
          background: linear-gradient(135deg, #60B4F0, #00D4AA);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .step-number {
          font-family: 'Syne', sans-serif;
          background: linear-gradient(135deg, rgba(10,110,189,0.7), rgba(0,166,81,0.5));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .orb-1 { animation: orb-1 12s ease-in-out infinite; }
        .orb-2 { animation: orb-2 15s ease-in-out infinite; }
        .globe-float { animation: float 6s ease-in-out infinite; }
        .cta-glow { animation: pulse-glow 3s ease-in-out infinite; }

        /* ── RESPONSIVE ── */
        .nav-inner { padding: 0 48px; height: 68px; display: flex; justify-content: space-between; align-items: center; }
        .hero-section { padding: 100px 48px 60px; text-align: center; max-width: 1000px; margin: 0 auto; }
        .hero-h1 { font-family: 'Syne', sans-serif; font-size: 62px; font-weight: 800; line-height: 1.1; margin-bottom: 24px; letter-spacing: -1.5px; }
        .hero-p { color: #94A3B8; font-size: 19px; line-height: 1.7; max-width: 560px; margin: 0 auto 44px; }
        .cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .stats-grid { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .stat-num { font-family: 'Syne', sans-serif; font-size: 52px; font-weight: 800; line-height: 1; margin-bottom: 10px; }
        .section-pad { padding: 80px 48px; max-width: 1000px; margin: 0 auto; }
        .footer-inner { padding: 32px 48px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }

        @media (max-width: 768px) {
          .nav-inner { padding: 0 20px; height: 60px; }
          .nav-brand-text { display: none; }
          .nav-buttons .btn-secondary { display: none; }
          .hero-section { padding: 60px 20px 40px; }
          .hero-h1 { font-size: 36px; letter-spacing: -0.5px; }
          .hero-p { font-size: 16px; }
          .cta-row { flex-direction: column; align-items: center; }
          .cta-row button { width: 100%; max-width: 320px; }
          .globe-container { display: none; }
          .stats-grid { grid-template-columns: 1fr; gap: 14px; padding: 0 20px; }
          .stat-num { font-size: 40px; }
          .steps-grid { grid-template-columns: 1fr; }
          .section-pad { padding: 48px 20px; }
          .cta-box { padding: 40px 24px !important; }
          .cta-h2 { font-size: 28px !important; }
          .footer-inner { padding: 24px 20px; flex-direction: column; text-align: center; }
          .sdg-section { padding: 40px 20px !important; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .hero-h1 { font-size: 48px; }
          .stats-grid { padding: 0 24px; }
          .section-pad { padding: 60px 32px; }
          .nav-inner { padding: 0 32px; }
        }
      `}</style>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb-1" style={{ position: 'absolute', top: '10%', left: '10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,110,189,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="orb-2" style={{ position: 'absolute', top: '50%', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,81,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Navbar */}
      <nav className="nav-glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="19" fill="url(#ng1)"/>
              <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
              <ellipse cx="19" cy="19" rx="8" ry="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
              <circle cx="19" cy="19" r="3.5" fill="white"/>
              <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
              <line x1="19" y1="0" x2="19" y2="38" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
              <defs><linearGradient id="ng1" x1="0" y1="0" x2="38" y2="38"><stop offset="0%" stopColor="#0A6EBD"/><stop offset="100%" stopColor="#0891D4"/></linearGradient></defs>
            </svg>
            <span className="nav-brand-text" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '17px' }}>SDG Talent Bridge</span>
          </div>
          <div className="nav-buttons" style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '14px' }}>Login</button>
            <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '14px' }}>Get Started →</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(10,110,189,0.1)', border: '1px solid rgba(10,110,189,0.3)', color: '#60B4F0', padding: '7px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, marginBottom: '28px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0A6EBD', display: 'inline-block', boxShadow: '0 0 8px #0A6EBD' }} />
          Connecting Talent with Purpose
        </div>

        <h1 className="hero-title hero-h1">
          Where Student Talent<br />
          Meets <span className="gradient-text">Global Impact</span>
        </h1>

        <p className="hero-sub hero-p">
          The platform connecting skilled students with NGOs advancing the UN Sustainable Development Goals. Real work. Real impact. Real experience.
        </p>

        <div className="hero-cta cta-row">
          <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '15px 32px', borderRadius: '14px', fontSize: '16px' }}>
            Find Opportunities →
          </button>
          <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '15px 32px', borderRadius: '14px', fontSize: '16px' }}>
            Post a Project
          </button>
        </div>

        <div className="globe-container globe-float" style={{ marginTop: '56px', display: 'flex', justifyContent: 'center' }}>
          <div className="cta-glow" style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #0A6EBD, #060D1F)', border: '1px solid rgba(10,110,189,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
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

      {/* Stats */}
      <section ref={statsRef} style={{ position: 'relative', zIndex: 1, padding: '48px 0' }}>
        <div className="stats-grid">
          {[
            { value: students, label: 'Active Students', color: '#60B4F0', icon: '🎓' },
            { value: ngos, label: 'NGO Partners', color: '#4ADE80', icon: '🌱' },
            { value: projects, label: 'Projects Completed', color: '#FDB913', icon: '✅' },
          ].map((stat) => (
            <div key={stat.label} className="stat-card" style={{ padding: '32px', borderRadius: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{stat.icon}</div>
              <div className="stat-num" style={{ color: stat.color }}>{stat.value}+</div>
              <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="section-pad" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>How It Works</h2>
          <p style={{ color: '#94A3B8', fontSize: '15px' }}>From signup to impact in three steps</p>
        </div>
        <div className="steps-grid">
          {[
            { step: '01', title: 'Build Your Profile', desc: 'Students showcase skills and interests. NGOs describe their mission, SDG focus, and open projects.', color: '#60B4F0' },
            { step: '02', title: 'Discover & Apply', desc: 'Browse curated SDG-aligned opportunities. Apply to projects that match your skills and passion.', color: '#4ADE80' },
            { step: '03', title: 'Create Impact', desc: 'Collaborate with NGOs on real projects advancing the UN Sustainable Development Goals.', color: '#FDB913' },
          ].map((item) => (
            <div key={item.step} className="glass-card" style={{ padding: '32px', borderRadius: '20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${item.color}40, ${item.color}, ${item.color}40)` }} />
              <div className="step-number" style={{ fontSize: '64px', fontWeight: 800, lineHeight: 1, marginBottom: '16px', opacity: 0.7 }}>{item.step}</div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '10px' }}>{item.title}</h3>
              <p style={{ color: '#94A3B8', lineHeight: 1.65, fontSize: '14px' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SDG Tags */}
      <section className="sdg-section" style={{ position: 'relative', zIndex: 1, padding: '60px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>Aligned with all 17 UN SDGs</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            {['No Poverty','Zero Hunger','Good Health','Quality Education','Gender Equality','Clean Water','Clean Energy','Decent Work','Innovation','Reduced Inequalities','Climate Action','Life on Land','Life Below Water','Peace & Justice','Partnerships'].map((sdg) => (
              <span key={sdg} className="sdg-tag" style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>{sdg}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="cta-box" style={{ background: 'rgba(10,110,189,0.06)', border: '1px solid rgba(10,110,189,0.15)', borderRadius: '24px', padding: '60px 48px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,110,189,0.15), transparent 70%)', filter: 'blur(20px)' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,81,0.1), transparent 70%)', filter: 'blur(20px)' }} />
            <h2 className="cta-h2" style={{ fontFamily: "'Syne', sans-serif", fontSize: '38px', fontWeight: 800, marginBottom: '14px', position: 'relative', zIndex: 1 }}>Ready to Make an Impact?</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '36px', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
              Join a growing community of changemakers advancing the UN SDGs.
            </p>
            <div className="cta-row" style={{ position: 'relative', zIndex: 1 }}>
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '15px 32px', borderRadius: '12px', fontSize: '15px' }}>Join as Student</button>
              <button onClick={() => navigate('/auth')} style={{ padding: '15px 32px', borderRadius: '12px', fontSize: '15px', background: 'rgba(0,166,81,0.15)', border: '1px solid rgba(0,166,81,0.3)', color: '#4ADE80', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s ease', fontFamily: "'DM Sans', sans-serif" }}>
                Register Your NGO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="19" fill="#0A6EBD"/>
              <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none"/>
              <circle cx="19" cy="19" r="3" fill="white"/>
              <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>SDG Talent Bridge</span>
          </div>
          <p style={{ color: '#475569', fontSize: '12px' }}>© 2026 SDG Talent Bridge — Advancing the UN SDGs</p>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
