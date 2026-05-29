import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Menu, X, Shield, Bell, Zap, PieChart, Gem, Send } from 'lucide-react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../styles/homepage.css';

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const { token } = useStore();
  const navigate = useNavigate();

  useEffect(() => { if (token) navigate('/', { replace: true }); }, [token, navigate]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleContact = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post('/contact', contactForm);
      toast.success(res.data.message || 'Message sent!');
      setContactForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    }
    setSending(false);
  };

  const features = [
    { icon: '💰', title: 'Mutual Fund SIPs', desc: 'Auto-track NAV, units, and returns. SIP payments auto-recorded with Monday rollover for weekends.', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { icon: '🏦', title: 'Fixed Deposits', desc: 'Compound interest auto-calculated. Maturity alerts at 30, 15, 7, 3 & 1 day. Auto-renewal with compounding.', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { icon: '📈', title: 'Stock Portfolio', desc: 'Real-time price tracking every 30s during market hours. Target price and stop-loss alerts built-in.', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { icon: '👨‍👩‍👧‍👦', title: 'Family Management', desc: 'Track investments for every family member independently with individual and combined dashboards.', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
    { icon: '🔔', title: 'Smart Alerts', desc: 'Automated notifications and transactional emails for maturity events, price targets, and milestones.', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
    { icon: '📊', title: 'Portfolio Insights', desc: 'Bi-weekly digest emails with allocation breakdowns, top performers, and aggregated returns.', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ];

  return (
    <div className="homepage">
      {/* Nav */}
      <nav className={`hp-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="#hero" className="hp-nav-logo">
          <div className="hp-nav-logo-icon"><Gem size={22} color="#fff" /></div>
          Vestra
        </a>
        <div className={`hp-nav-links ${mobileMenu ? 'mobile-open' : ''}`}>
          <a href="#features" className="hp-nav-link" onClick={() => setMobileMenu(false)}>Features</a>
          <a href="#how-it-works" className="hp-nav-link" onClick={() => setMobileMenu(false)}>How It Works</a>
          <a href="#about" className="hp-nav-link" onClick={() => setMobileMenu(false)}>About</a>
          <a href="#contact" className="hp-nav-link" onClick={() => setMobileMenu(false)}>Contact Us</a>
          <div className="hp-nav-mobile-actions">
            <Link to="/login" className="hp-btn-ghost" onClick={() => setMobileMenu(false)}>Sign In</Link>
            <Link to="/signup" className="hp-btn-primary" onClick={() => setMobileMenu(false)}>Get Started <ArrowRight size={16} /></Link>
          </div>
        </div>
        <div className="hp-nav-actions hp-nav-desktop-only">
          <Link to="/login" className="hp-btn-ghost">Sign In</Link>
          <Link to="/signup" className="hp-btn-primary">Get Started <ArrowRight size={16} /></Link>
        </div>
        <button className="hp-nav-hamburger" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Hero */}
      <section className="hp-hero" id="hero">
        <div className="hp-hero-bg">
          <div className="hp-hero-orb hp-hero-orb--1" />
          <div className="hp-hero-orb hp-hero-orb--2" />
          <div className="hp-hero-orb hp-hero-orb--3" />
          <div className="hp-hero-grid" />
        </div>
        <div className="hp-hero-content">
          <div className="hp-hero-badge"><span className="hp-hero-badge-dot" /> Intelligent Wealth Management</div>
          <h1>Track Your Family's<br /><span className="gradient-text">Complete Wealth</span></h1>
          <p className="hp-hero-sub">One unified platform to manage Mutual Funds, Fixed Deposits, and Stocks for your entire family — with real-time tracking, smart automation, and actionable insights.</p>
          <div className="hp-hero-cta">
            <Link to="/signup" className="hp-btn-hero">Start Free <ArrowRight size={18} /></Link>
            <a href="#features" className="hp-btn-hero-outline">Explore Features <ChevronRight size={18} /></a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="hp-stats">
        <div className="hp-stat"><div className="hp-stat-value">3+</div><div className="hp-stat-label">Asset Classes</div></div>
        <div className="hp-stat"><div className="hp-stat-value">24/7</div><div className="hp-stat-label">Automated Tracking</div></div>
        <div className="hp-stat"><div className="hp-stat-value">30s</div><div className="hp-stat-label">Stock Price Refresh</div></div>
        <div className="hp-stat"><div className="hp-stat-value">100%</div><div className="hp-stat-label">Free & Secure</div></div>
      </div>

      {/* Features */}
      <section className="hp-features" id="features">
        <div className="hp-section-header">
          <div className="hp-section-tag"><Zap size={14} /> Core Features</div>
          <h2 className="hp-section-title">Everything You Need to<br />Manage Family Investments</h2>
          <p className="hp-section-subtitle">From automated SIP tracking to real-time stock alerts — Vestra handles the complexity so you can focus on building wealth.</p>
        </div>
        <div className="hp-features-grid">
          {features.map((f, i) => (
            <div className="hp-feature-card" key={i}>
              <div className="hp-feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
              <div className="hp-feature-title">{f.title}</div>
              <div className="hp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="hp-how" id="how-it-works">
        <div className="hp-section-header">
          <div className="hp-section-tag"><PieChart size={14} /> How It Works</div>
          <h2 className="hp-section-title">Get Started in 3 Steps</h2>
          <p className="hp-section-subtitle">From sign-up to full portfolio visibility in under 5 minutes.</p>
        </div>
        <div className="hp-steps">
          <div className="hp-step"><div className="hp-step-number">1</div><div className="hp-step-title">Create Account</div><div className="hp-step-desc">Sign up with email or Google in seconds. Your data is encrypted and secure.</div></div>
          <div className="hp-step"><div className="hp-step-number">2</div><div className="hp-step-title">Add Family & Assets</div><div className="hp-step-desc">Add family members and start logging SIPs, FDs, and stocks with smart auto-fill.</div></div>
          <div className="hp-step"><div className="hp-step-number">3</div><div className="hp-step-title">Track & Grow</div><div className="hp-step-desc">Watch your wealth grow with real-time dashboards, automated alerts, and insights.</div></div>
        </div>
      </section>

      {/* About */}
      <section className="hp-about" id="about">
        <div className="hp-about-content">
          <div className="hp-about-text">
            <div className="hp-section-tag"><Shield size={14} /> About Vestra</div>
            <h3>Built for Indian Families<br />Who Take Wealth Seriously</h3>
            <p>Vestra was born from a simple problem: Indian families hold investments across dozens of banks, brokers, and mutual fund houses — but there's no single place to see the complete picture.</p>
            <p>We built Vestra to be that single source of truth. Track every rupee across SIPs, Fixed Deposits, and Direct Equity — for yourself, your spouse, your parents, and your children — all from one beautiful, intelligent dashboard.</p>
            <p style={{ color: '#818cf8', fontWeight: 600 }}>No ads. No data selling. Just pure, premium wealth intelligence.</p>
          </div>
          <div className="hp-about-visual">
            <div className="hp-about-orbit">
              <div className="hp-about-orbit-item"><div className="hp-about-planet" style={{ background: 'rgba(16,185,129,0.15)' }}>💰</div></div>
              <div className="hp-about-orbit-item"><div className="hp-about-planet" style={{ background: 'rgba(245,158,11,0.15)' }}>🏦</div></div>
              <div className="hp-about-orbit-item"><div className="hp-about-planet" style={{ background: 'rgba(99,102,241,0.15)' }}>📈</div></div>
              <div className="hp-about-orbit-item"><div className="hp-about-planet" style={{ background: 'rgba(236,72,153,0.15)' }}>👨‍👩‍👧‍👦</div></div>
            </div>
            <div className="hp-about-center"><Gem size={36} color="#fff" /></div>
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section className="hp-contact" id="contact">
        <div className="hp-section-header">
          <div className="hp-section-tag"><Bell size={14} /> Contact Us</div>
          <h2 className="hp-section-title">Have a Question?</h2>
          <p className="hp-section-subtitle">Drop us a message and we'll get back to you as soon as possible.</p>
        </div>
        <div className="hp-contact-wrap">
          <form className="hp-contact-form" onSubmit={handleContact}>
            <div className="hp-contact-row">
              <input className="hp-contact-input" placeholder="Your Name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} required />
              <input className="hp-contact-input" type="email" placeholder="Your Email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required />
            </div>
            <textarea className="hp-contact-textarea" placeholder="Your message..." value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} required />
            <button type="submit" className="hp-contact-submit" disabled={sending}>
              {sending ? 'Sending...' : <><Send size={18} /> Send Message</>}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <div className="hp-footer-top">
          <div className="hp-footer-brand">
            <div className="hp-footer-brand-name">
              <div className="hp-nav-logo-icon" style={{ width: 32, height: 32, borderRadius: 10 }}><Gem size={16} color="#fff" /></div>
              Vestra
            </div>
            <p>Intelligent family wealth management. Track SIPs, FDs, and Stocks with real-time automation and smart insights.</p>
          </div>
          <div className="hp-footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
          </div>
          <div className="hp-footer-col">
            <h4>Assets</h4>
            <a href="#features">Mutual Funds</a>
            <a href="#features">Fixed Deposits</a>
            <a href="#features">Stocks</a>
          </div>
          <div className="hp-footer-col">
            <h4>Account</h4>
            <Link to="/login">Sign In</Link>
            <Link to="/signup">Create Account</Link>
            <a href="#contact">Contact Us</a>
          </div>
        </div>
        <div className="hp-footer-bottom">
          © {new Date().getFullYear()} <a href="#hero">Vestra</a>. All rights reserved. Built with ❤️ for Indian families.
        </div>
      </footer>
    </div>
  );
}
