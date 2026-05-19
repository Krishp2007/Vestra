import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Users, ArrowRight } from 'lucide-react';
import SearchSelect from '../components/SearchSelect';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', relation: 'Self' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(endpoint, payload);
      setAuth(data.user, data.token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential });
      setAuth(data.user, data.token);
      toast.success('Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    }
  };

  const inputStyle = {
    paddingLeft: '44px',
    height: '48px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    fontSize: '15px'
  };

  const iconStyle = {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    pointerEvents: 'none'
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      position: 'relative',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '20px',
      fontFamily: '"Inter", sans-serif'
    }}>
      {/* Background Ambient Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1,
        animation: 'slideUp 0.5s ease-out'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '18px', 
            background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '30px', margin: '0 auto 20px',
            boxShadow: '0 10px 25px rgba(99,102,241,0.4)'
          }}>📊</div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            {isLogin ? 'Sign in to access your portfolio' : 'Start tracking your family wealth'}
          </p>
        </div>

        {/* Google OAuth */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google sign-in failed')}
            theme="outline"
            shape="rectangular"
            size="large"
            width="100%"
            text={isLogin ? 'signin_with' : 'signup_with'}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <User size={18} style={iconStyle} />
                <input 
                  className="auth-input" 
                  style={inputStyle} 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  placeholder="Full Name" 
                  required 
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={18} style={iconStyle} />
              <input 
                className="auth-input" 
                style={inputStyle} 
                name="email" 
                type="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="Email Address" 
                required 
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={iconStyle} />
              <input 
                className="auth-input" 
                style={inputStyle} 
                name="password" 
                type="password" 
                value={form.password} 
                onChange={handleChange} 
                placeholder="Password" 
                required 
                minLength={6} 
              />
            </div>

            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <Users size={18} style={iconStyle} />
                <SearchSelect 
                  options={['Self', 'Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Other']}
                  value={form.relation} 
                  onChange={(val) => setForm({...form, relation: val})}
                  placeholder="Select Role"
                  style={{ ...inputStyle, width: '100%', paddingLeft: '44px' }}
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              style={{ 
                width: '100%', 
                height: '48px', 
                marginTop: '12px',
                background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)'; }}}
              onMouseLeave={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)'; }}}
            >
              {loading ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : (isLogin ? <>Sign In <ArrowRight size={18}/></> : <>Create Account <ArrowRight size={18}/></>)}
            </button>
          </div>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: '#94a3b8' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#a855f7', 
              fontWeight: 600, 
              cursor: 'pointer',
              padding: '0 5px',
              fontSize: '14px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#c084fc'}
            onMouseLeave={e => e.currentTarget.style.color = '#a855f7'}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>

      </div>
      
      <style>{`
        .auth-input { width: 100%; box-sizing: border-box; }
        .auth-input:focus {
          outline: none;
          background-color: rgba(30, 41, 59, 0.8) !important;
          border-color: #a855f7 !important;
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2) !important;
        }
        .auth-input::placeholder { color: #64748b !important; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
