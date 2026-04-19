import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as loginApi, register as registerApi } from '../api/api'

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    )}
  </svg>
)

const EMPTY_FORM = { email: '', password: '', confirm_password: '', first_name: '', last_name: '' }

const AuthPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'student' | 'ngo'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
    setShowPassword(false)
    setShowConfirm(false)
    setRole('student')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const validate = () => {
    if (!form.email || !form.password) return 'Email and password are required'
    if (mode === 'register') {
      if (!form.first_name || !form.last_name) return 'First and last name are required'
      if (form.password.length < 6) return 'Password must be at least 6 characters'
      if (form.password !== form.confirm_password) return 'Passwords do not match'
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'register') {
        await registerApi({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          role
        })
        setSuccess('✅ Account created! Welcome to SDG Talent Bridge. Please login.')
        setForm(EMPTY_FORM)
        setMode('login')
        return
      }
      const res = await loginApi({ email: form.email, password: form.password })
      await login(res.data.access_token)
      const userRole = res.data.role
      if (userRole === 'student') navigate('/student')
      else if (userRole === 'ngo') navigate('/ngo')
      else if (userRole === 'admin' || userRole === 'super_admin') navigate('/admin')
      else navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 1) return { score, label: 'Weak', color: '#E53E3E' }
    if (score <= 3) return { score, label: 'Fair', color: '#FDB913' }
    return { score, label: 'Strong', color: '#00A651' }
  }

  const pwStr = passwordStrength(form.password)

  const studentPerks = ['Browse SDG-aligned projects', 'Apply individually or as a team', 'Track your applications', 'Build your impact portfolio']
  const ngoPerks = ['Post projects for students', 'Find skilled talent fast', 'Manage applications easily', 'Advance your SDG mission']
  const perks = role === 'student' ? studentPerks : ngoPerks

  return (
    <div style={{ backgroundColor: '#060D1F', minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#F1F5F9', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orb-float { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-40px); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }

        .auth-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          padding: 13px 16px; color: #F1F5F9; font-size: 14px;
          font-family: 'DM Sans', sans-serif; outline: none; transition: all 0.2s ease;
        }
        .auth-input:focus { border-color: rgba(10,110,189,0.6); background: rgba(10,110,189,0.05); box-shadow: 0 0 0 3px rgba(10,110,189,0.1); }
        .auth-input::placeholder { color: #475569; }
        .auth-input.ngo-focus:focus { border-color: rgba(0,166,81,0.6); background: rgba(0,166,81,0.05); box-shadow: 0 0 0 3px rgba(0,166,81,0.1); }

        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #475569; cursor: pointer; display: flex; align-items: center; padding: 0; transition: color 0.2s; }
        .eye-btn:hover { color: #F1F5F9; }

        .btn-student { background: linear-gradient(135deg, #0A6EBD, #0891D4); border: none; color: white; cursor: pointer; font-weight: 700; font-size: 15px; font-family: 'DM Sans', sans-serif; width: 100%; padding: 14px; border-radius: 12px; transition: all 0.3s ease; }
        .btn-student:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(10,110,189,0.45); }
        .btn-student:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-ngo { background: linear-gradient(135deg, #00A651, #00C46A); border: none; color: white; cursor: pointer; font-weight: 700; font-size: 15px; font-family: 'DM Sans', sans-serif; width: 100%; padding: 14px; border-radius: 12px; transition: all 0.3s ease; }
        .btn-ngo:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,166,81,0.45); }
        .btn-ngo:disabled { opacity: 0.6; cursor: not-allowed; }

        .role-btn { flex: 1; padding: 12px 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #94A3B8; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; transition: all 0.2s ease; text-align: center; }
        .role-btn.active-student { background: rgba(10,110,189,0.15); border-color: rgba(10,110,189,0.5); color: #60B4F0; }
        .role-btn.active-ngo { background: rgba(0,166,81,0.15); border-color: rgba(0,166,81,0.5); color: #4ADE80; }

        .tab-btn { flex: 1; padding: 10px; border: none; background: transparent; color: #94A3B8; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; border-radius: 8px; transition: all 0.2s ease; }
        .tab-btn.active-student { background: rgba(10,110,189,0.15); color: #60B4F0; }
        .tab-btn.active-ngo { background: rgba(0,166,81,0.15); color: #4ADE80; }

        .strength-bar { height: 3px; border-radius: 999px; transition: all 0.3s ease; }
        .perk-item { animation: slideRight 0.4s ease forwards; opacity: 0; }

        .left-panel { display: flex; flex-direction: column; justify-content: center; padding: 60px 48px; width: 420px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.05); }
        .right-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; overflow-y: auto; }

        @media (max-width: 900px) { .left-panel { display: none; } .right-panel { width: 100%; min-height: 100vh; } }
        @media (max-width: 480px) { .auth-card { padding: 24px 20px !important; } .name-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '15%', left: '15%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,110,189,0.08) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'orb-float 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,81,0.06) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'orb-float 18s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Left panel */}
      <div className="left-panel" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ cursor: 'pointer', marginBottom: '48px' }} onClick={() => navigate('/')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <svg width="36" height="36" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="19" fill="url(#lp1)"/>
              <ellipse cx="19" cy="19" rx="19" ry="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
              <ellipse cx="19" cy="19" rx="8" ry="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none"/>
              <circle cx="19" cy="19" r="3.5" fill="white"/>
              <line x1="0" y1="19" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
              <defs><linearGradient id="lp1" x1="0" y1="0" x2="38" y2="38"><stop offset="0%" stopColor="#0A6EBD"/><stop offset="100%" stopColor="#00A651"/></linearGradient></defs>
            </svg>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px' }}>SDG Talent Bridge</span>
          </div>
          <p style={{ color: '#475569', fontSize: '13px' }}>← Back to home</p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 800, marginBottom: '10px', lineHeight: 1.3 }}>
            {mode === 'register'
              ? role === 'student' ? 'Start your impact journey' : 'Find skilled talent for your mission'
              : 'Welcome back to the platform'}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7 }}>
            {mode === 'register'
              ? role === 'student' ? 'Join students working on real SDG projects worldwide.' : 'Connect with purpose-driven students ready to contribute.'
              : 'Sign in to continue your work on the SDGs.'}
          </p>
        </div>

        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {perks.map((perk, i) => (
              <div key={perk} className="perk-item" style={{ animationDelay: `${i * 0.1}s`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: role === 'student' ? 'rgba(10,110,189,0.15)' : 'rgba(0,166,81,0.15)', border: `1px solid ${role === 'student' ? 'rgba(10,110,189,0.3)' : 'rgba(0,166,81,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: role === 'student' ? '#60B4F0' : '#4ADE80', fontSize: '14px' }}>✓</span>
                </div>
                <span style={{ color: '#94A3B8', fontSize: '14px' }}>{perk}</span>
              </div>
            ))}
          </div>
        )}

        {mode === 'login' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '🌍', title: 'SDG-Aligned Projects', desc: 'Browse opportunities across all 17 UN SDGs' },
              { icon: '👥', title: 'Team or Individual', desc: 'Apply solo or with a team of 2-5 people' },
              { icon: '📊', title: 'Track Your Progress', desc: 'Monitor applications from one dashboard' },
            ].map((item) => (
              <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>{item.icon}</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{item.title}</p>
                  <p style={{ color: '#94A3B8', fontSize: '12px' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — form */}
      <div className="right-panel" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeUp 0.5s ease' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
            <button className={`tab-btn ${mode === 'login' ? (role === 'ngo' ? 'active-ngo' : 'active-student') : ''}`} onClick={() => switchMode('login')}>Sign In</button>
            <button className={`tab-btn ${mode === 'register' ? (role === 'ngo' ? 'active-ngo' : 'active-student') : ''}`} onClick={() => switchMode('register')}>Create Account</button>
          </div>

          {/* Role selector */}
          {mode === 'register' && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>I am registering as...</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`role-btn ${role === 'student' ? 'active-student' : ''}`} onClick={() => setRole('student')}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎓</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Student</div>
                  <div style={{ fontSize: '11px', color: role === 'student' ? '#60B4F0' : '#475569', marginTop: '2px' }}>Looking for projects</div>
                </button>
                <button className={`role-btn ${role === 'ngo' ? 'active-ngo' : ''}`} onClick={() => setRole('ngo')}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏢</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Organization</div>
                  <div style={{ fontSize: '11px', color: role === 'ngo' ? '#4ADE80' : '#475569', marginTop: '2px' }}>NGO, Firm or Company</div>
                </button>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="auth-card" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              {mode === 'login' ? 'Sign in to your account' : role === 'student' ? 'Create student account' : 'Register your organization'}
            </h3>
            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>
              {mode === 'login' ? 'Enter your credentials to continue' : role === 'student' ? 'Join and start applying to SDG projects' : 'Start posting projects and finding talent'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mode === 'register' && (
                <div className="name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                      {role === 'ngo' ? 'Contact First Name' : 'First Name'}
                    </label>
                    <input className={`auth-input ${role === 'ngo' ? 'ngo-focus' : ''}`} name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} />
                  </div>
                  <div>
                    <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                      {role === 'ngo' ? 'Contact Last Name' : 'Last Name'}
                    </label>
                    <input className={`auth-input ${role === 'ngo' ? 'ngo-focus' : ''}`} name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                  {mode === 'register' && role === 'ngo' ? 'Work Email' : 'Email Address'}
                </label>
                <input className={`auth-input ${role === 'ngo' && mode === 'register' ? 'ngo-focus' : ''}`} name="email" type="email" placeholder={role === 'ngo' && mode === 'register' ? 'contact@yourorganization.com' : 'you@example.com'} value={form.email} onChange={handleChange} />
              </div>

              <div>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className={`auth-input ${role === 'ngo' && mode === 'register' ? 'ngo-focus' : ''}`} name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={form.password} onChange={handleChange} style={{ paddingRight: '44px' }} onKeyDown={(e) => mode === 'login' && e.key === 'Enter' && handleSubmit()} />
                  <button className="eye-btn" type="button" onClick={() => setShowPassword(!showPassword)}><EyeIcon open={showPassword} /></button>
                </div>
              </div>

              {mode === 'register' && form.password && (
                <div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                    {[1,2,3,4,5].map(i => <div key={i} className="strength-bar" style={{ flex: 1, background: i <= pwStr.score ? pwStr.color : 'rgba(255,255,255,0.08)' }} />)}
                  </div>
                  <p style={{ color: pwStr.color, fontSize: '11px', fontWeight: 600 }}>{pwStr.label} password</p>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className={`auth-input ${role === 'ngo' ? 'ngo-focus' : ''}`} name="confirm_password" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirm_password} onChange={handleChange} style={{ paddingRight: '44px' }} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
                    <button className="eye-btn" type="button" onClick={() => setShowConfirm(!showConfirm)}><EyeIcon open={showConfirm} /></button>
                  </div>
                  {form.confirm_password && (
                    <p style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: form.password === form.confirm_password ? '#00A651' : '#E53E3E' }}>
                      {form.password === form.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginTop: '14px', background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: '10px', padding: '11px 14px', color: '#FC8181', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div style={{ marginTop: '14px', background: 'rgba(0,166,81,0.1)', border: '1px solid rgba(0,166,81,0.3)', borderRadius: '10px', padding: '11px 14px', color: '#4ADE80', fontSize: '13px' }}>
                {success}
              </div>
            )}

            <button
              className={role === 'ngo' ? 'btn-ngo' : 'btn-student'}
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginTop: '18px' }}
            >
              {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign In →' : role === 'student' ? 'Create Student Account →' : 'Register Organization →'}
            </button>

            <p style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '16px' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span style={{ color: role === 'ngo' ? '#4ADE80' : '#60B4F0', cursor: 'pointer', fontWeight: 600 }} onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
