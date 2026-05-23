import Topbar from '../components/layout/Topbar';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Download, Upload, Trash2, FileText, Image as ImageIcon, Lock, Shield, AlertTriangle, User, Mail, Key, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const renderAvatar = (avatarStr, size = 56) => {
  if (avatarStr?.startsWith('http') || avatarStr?.startsWith('data:')) {
    return <img src={avatarStr} alt="Avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />;
  }
  return <div style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size/2,boxShadow:'0 4px 12px rgba(99,102,241,0.2)'}}>{avatarStr||'👤'}</div>;
};

export default function SettingsPage() {
  const { user, setUser, logout } = useStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', email: user?.email || '', username: user?.username || '', avatar: user?.avatar || '👤' });
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Max 1MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setEditForm({ ...editForm, avatar: ev.target.result });
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try { const res = await api.put('/auth/profile', editForm); setUser(res.data.user); toast.success('Profile updated'); setIsEditing(false); }
    catch (e) { toast.error('Update failed'); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    const { newPassword, confirmPassword } = passwordForm;
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[0-9]/.test(newPassword)) { toast.error('Password must contain at least one number'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>_]/.test(newPassword)) { toast.error('Password must contain at least one special character'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPassword(true);
    try { await api.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }); toast.success('Password changed'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { toast.error('Enter password'); return; }
    setDeleting(true);
    try { await api.delete('/auth/delete-account', { data: { password: deletePassword } }); toast.success('Account deleted'); logout(); navigate('/login'); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    setDeleting(false);
  };

  const exportData = async () => {
    try {
      const [sips, fds, stocks, members, alerts] = await Promise.all([api.get('/sips'), api.get('/fds'), api.get('/stocks'), api.get('/members'), api.get('/alerts')]);
      const data = { exportDate: new Date().toISOString(), sips: sips.data.data, fds: fds.data.data, stocks: stocks.data.data, members: members.data.data, alerts: alerts.data.data };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `assets_view_backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success('Exported!');
    } catch(e) { toast.error('Export failed'); }
  };

  // PDF uses EXACT same formula as dashboard controller
  const exportPdf = async () => {
    try {
      toast.success('Preparing PDF...');
      const [sips, fds, stocks, members] = await Promise.all([api.get('/sips'), api.get('/fds'), api.get('/stocks'), api.get('/members')]);
      const sData = sips.data.data, fData = fds.data.data, stData = stocks.data.data, mData = members.data.data;
      const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

      // MATCHING DASHBOARD FORMULA EXACTLY:
      // totalInvested = sipTotalInvested + fdPrincipal + stockTotalInvested
      // totalCurrentValue = sipCurrentValue + fdPrincipal + stockCurrentValue
      const sipInv = sData.reduce((s, x) => s + (x.totalInvested || 0), 0);
      const sipVal = sData.reduce((s, x) => s + (x.currentValue || 0), 0);
      const fdPrin = fData.reduce((s, x) => s + (x.principalAmount || 0), 0);
      const stInv = stData.reduce((s, x) => s + (x.totalInvested || 0), 0);
      const stVal = stData.reduce((s, x) => s + (x.currentValue || 0), 0);

      const totalInvested = sipInv + fdPrin + stInv;
      const totalCurrentValue = sipVal + fdPrin + stVal;
      const totalReturns = totalCurrentValue - totalInvested;
      const returnPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
      const rc = totalReturns >= 0 ? '#059669' : '#dc2626';

      const pw = window.open('', '_blank');
      pw.document.write(`<html><head><title>Investment Report</title><style>@page{margin:15mm}body{font-family:Inter,sans-serif;color:#1e293b;line-height:1.5;margin:0;padding:0}h1{font-size:28px;font-weight:800;margin:0}.hdr{border-bottom:3px solid #6366f1;padding-bottom:15px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end}.dm{color:#64748b;font-size:13px}h2{color:#334155;font-size:18px;margin:35px 0 15px;text-transform:uppercase;letter-spacing:.5px}.ov{display:flex;background:linear-gradient(135deg,#f8fafc,#f1f5f9);padding:25px;border-radius:12px;margin-bottom:30px;border:1px solid #e2e8f0;flex-wrap:wrap;gap:20px}.ov p{color:#64748b;margin:0 0 5px;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600}.ov h2{color:#0f172a;font-size:32px;margin:0;text-transform:none}table{width:100%;border-collapse:collapse;margin-bottom:25px;font-size:13px}th,td{border:1px solid #e2e8f0;padding:10px 14px;text-align:left}th{background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;font-size:11px}.v{text-align:right;font-family:monospace}.ft{margin-top:50px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:20px}</style></head><body>
      <div class="hdr"><div><h1>Family Investment Report</h1><div class="dm">Vestra</div></div><div class="dm">${new Date().toLocaleString('en-IN')}</div></div>
      <div class="ov"><div style="flex:1;min-width:200px"><p>Net Worth</p><h2>${fmt(totalCurrentValue)}</h2></div><div style="display:flex;gap:40px;border-left:2px solid #cbd5e1;padding-left:30px;flex-wrap:wrap"><div><p>Invested</p><h3 style="margin:0;font-size:20px">${fmt(totalInvested)}</h3></div><div><p>Returns</p><h3 style="margin:0;font-size:20px;color:${rc}">${totalReturns >= 0 ? '+' : ''}${fmt(totalReturns)} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)</h3></div></div></div>
      <h2>Mutual Funds (${sData.length})</h2>${sData.length ? `<table><tr><th>Fund</th><th class="v">Monthly</th><th class="v">Invested</th><th class="v">Value</th><th class="v">Return</th></tr>${sData.map(s => { const r = s.totalInvested > 0 ? ((s.currentValue - s.totalInvested) / s.totalInvested * 100) : 0; return `<tr><td>${s.fundName}</td><td class="v">${fmt(s.amountPerMonth)}</td><td class="v">${fmt(s.totalInvested)}</td><td class="v" style="font-weight:600">${fmt(s.currentValue)}</td><td class="v" style="color:${r >= 0 ? '#059669' : '#dc2626'};font-weight:600">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</td></tr>`; }).join('')}</table>` : '<p class="dm">None</p>'}
      <h2>Fixed Deposits (${fData.length})</h2>${fData.length ? `<table><tr><th>Bank</th><th class="v">Principal</th><th class="v">Rate</th><th class="v">Maturity</th></tr>${fData.map(f => `<tr><td>${f.bankName}</td><td class="v">${fmt(f.principalAmount)}</td><td class="v">${f.interestRate}%</td><td class="v" style="color:#059669;font-weight:600">${fmt(f.maturityAmount)}</td></tr>`).join('')}</table>` : '<p class="dm">None</p>'}
      <h2>Stocks (${stData.length})</h2>${stData.length ? `<table><tr><th>Symbol</th><th class="v">Qty</th><th class="v">Avg Buy</th><th class="v">CMP</th><th class="v">Value</th></tr>${stData.map(s => `<tr><td>${s.symbol}</td><td class="v">${s.holdingQuantity || 0}</td><td class="v">${fmt(s.avgBuyPrice)}</td><td class="v">${fmt(s.currentPrice)}</td><td class="v" style="font-weight:600">${fmt(s.currentValue)}</td></tr>`).join('')}</table>` : '<p class="dm">None</p>'}
      <div class="ft">Vestra Family Office</div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.close()},500)}</script></body></html>`);
      pw.document.close();
    } catch(e) { toast.error('PDF failed'); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.json')) { toast.error('Select a JSON file'); return; }
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try { const d = JSON.parse(ev.target.result); if (!d.members) throw new Error('Invalid'); const res = await api.post('/dashboard/import', d); if (res.data.success) { toast.success('Imported!'); setTimeout(() => window.location.reload(), 1500); } }
      catch (err) { toast.error(err.message || 'Failed'); }
      finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsText(file);
  };

  const hasMinLength = passwordForm.newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(passwordForm.newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_]/.test(passwordForm.newPassword);
  const isMatched = passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword;
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial && isMatched;

  const labelStyle = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block' };
  const inputStyle = { fontSize: 14, padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', width: '100%' };

  return (
    <><Topbar title="Settings"/>
      <div className="page-content animate-fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          {/* ── Left Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* ── Profile ── */}
            <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><User size={16}/></div>
              <div className="card-title">Profile</div>
            </div>
            {!isEditing && <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>Edit</button>}
          </div>

          {isEditing ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {renderAvatar(editForm.avatar, 72)}
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('av-up').click()}><ImageIcon size={14}/> Upload</button>
                    <input type="file" id="av-up" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditForm({...editForm, avatar: '👤'})}><Trash2 size={14}/></button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Max 1MB</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}><label style={labelStyle}>Full Name</label><input className="form-input" style={inputStyle} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
              <div style={{ marginBottom: 14 }}><label style={labelStyle}>Username</label><input className="form-input" style={inputStyle} value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} /></div>
              <div style={{ marginBottom: 20 }}><label style={labelStyle}>Email</label><input className="form-input" style={inputStyle} type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setEditForm({ name: user?.name, email: user?.email, username: user?.username, avatar: user?.avatar }); }}>Cancel</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleSaveProfile}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              {renderAvatar(user?.avatar, 56)}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
                {user?.username && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>@{user.username}</div>}
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Change Password ── */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><Key size={16}/></div>
              <div className="card-title">Change Password</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="form-input" 
                  style={{ ...inputStyle, paddingRight: 40 }} 
                  type={showCurrent ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={passwordForm.currentPassword} 
                  onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrent(!showCurrent)} 
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="form-input" 
                  style={{ ...inputStyle, paddingRight: 40 }} 
                  type={showNew ? "text" : "password"} 
                  placeholder="Min 8 characters" 
                  value={passwordForm.newPassword} 
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowNew(!showNew)} 
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="form-input" 
                  style={{ ...inputStyle, paddingRight: 40 }} 
                  type={showConfirm ? "text" : "password"} 
                  placeholder="Re-enter" 
                  value={passwordForm.confirmPassword} 
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)} 
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            {/* Real-time Validation Hints */}
            {(passwordForm.newPassword) && (
              <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: hasMinLength ? 'var(--success)' : 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: hasMinLength ? 'rgba(5, 150, 105, 0.15)' : 'rgba(148, 163, 184, 0.1)', fontWeight: 'bold', fontSize: 10 }}>
                    {hasMinLength ? '✓' : '•'}
                  </span>
                  Must be at least 8 characters
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: hasNumber ? 'var(--success)' : 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: hasNumber ? 'rgba(5, 150, 105, 0.15)' : 'rgba(148, 163, 184, 0.1)', fontWeight: 'bold', fontSize: 10 }}>
                    {hasNumber ? '✓' : '•'}
                  </span>
                  Must contain at least one number (0-9)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: hasSpecial ? 'var(--success)' : 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: hasSpecial ? 'rgba(5, 150, 105, 0.15)' : 'rgba(148, 163, 184, 0.1)', fontWeight: 'bold', fontSize: 10 }}>
                    {hasSpecial ? '✓' : '•'}
                  </span>
                  Must contain at least one special character (!@#$%^&*)
                </div>
              </div>
            )}

            <button className="btn btn-primary" disabled={changingPassword || !passwordForm.currentPassword || !isPasswordValid} onClick={handleChangePassword}>{changingPassword ? 'Changing...' : 'Update Password'}</button>
          </div>
        </div>
      </div>

      {/* ── Right Column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ── Data Management ── */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><Download size={16}/></div>
              <div className="card-title">Data Management</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={exportData} style={{ justifyContent: 'flex-start', padding: '14px 16px' }}><Download size={16}/> Export All Data (JSON)</button>
            <button className="btn btn-secondary" onClick={exportPdf} style={{ justifyContent: 'flex-start', padding: '14px 16px' }}><FileText size={16}/> Export as PDF Report</button>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ justifyContent: 'flex-start', padding: '14px 16px' }}><Upload size={16}/> {importing ? 'Importing...' : 'Import Data (JSON)'}</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{display:'none'}} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>JSON backup includes all data. PDF generates a printable portfolio summary.</p>
        </div>

        {/* ── Danger Zone ── */}
        <div className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}><AlertTriangle size={16}/></div>
              <div className="card-title" style={{ color: 'var(--danger)' }}>Danger Zone</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(239,68,68,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Delete Account Permanently</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
              This will permanently delete your account, all family members, SIPs, FDs, stocks, and alerts. <strong>This cannot be undone.</strong>
            </p>
            <button className="btn" onClick={() => setDeleteConfirm(true)} style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}><Trash2 size={14}/> Delete My Account</button>
          </div>
        </div>
      </div>

        </div>
      </div>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => { setDeleteConfirm(false); setDeletePassword(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: '50%' }}>
                <AlertTriangle size={32} color="var(--danger)" />
              </div>
            </div>
            <h2 className="modal-title" style={{ justifyContent: 'center', marginBottom: 10 }}>Delete Account?</h2>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>
              This will permanently delete your account, family members, SIPs, FDs, stocks, and alerts. <strong>This action cannot be undone.</strong>
            </div>
            
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              <label style={labelStyle}>Enter Password to Confirm</label>
              <input 
                className="form-input" 
                style={inputStyle} 
                type="password" 
                placeholder="Confirm your password" 
                value={deletePassword} 
                onChange={e => setDeletePassword(e.target.value)} 
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => { setDeleteConfirm(false); setDeletePassword(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={deleting || !deletePassword} onClick={handleDeleteAccount}>
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
