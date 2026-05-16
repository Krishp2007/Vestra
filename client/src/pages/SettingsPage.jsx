import Topbar from '../components/layout/Topbar';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Download, Upload, Trash2, Database, FileText, Image as ImageIcon } from 'lucide-react';
import { useRef, useState } from 'react';

const renderAvatar = (avatarStr, size = 56) => {
  if (avatarStr?.startsWith('http') || avatarStr?.startsWith('data:')) {
    return <img src={avatarStr} alt="Avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />;
  }
  return <div style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size/2,boxShadow:'0 4px 12px rgba(99,102,241,0.2)'}}>{avatarStr||'👤'}</div>;
};

export default function SettingsPage() {
  const { user, setUser } = useStore();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', email: user?.email || '', avatar: user?.avatar || '👤' });
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { toast.error("Image must be smaller than 1MB"); return; }
      const reader = new FileReader();
      reader.onload = (event) => setEditForm({ ...editForm, avatar: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  const exportData = async () => {
    try {
      const [sips, fds, stocks, members, alerts] = await Promise.all([
        api.get('/sips'), api.get('/fds'), api.get('/stocks'), api.get('/members'), api.get('/alerts')
      ]);
      const data = { exportDate: new Date().toISOString(), sips: sips.data.data, fds: fds.data.data, stocks: stocks.data.data, members: members.data.data, alerts: alerts.data.data };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `assets_view_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Data exported as JSON!');
    } catch(e) { toast.error('Export failed'); }
  };

  const exportPdf = async () => {
    try {
      toast.success('Preparing PDF report...');
      const [sips, fds, stocks, members] = await Promise.all([
        api.get('/sips'), api.get('/fds'), api.get('/stocks'), api.get('/members')
      ]);
      
      const sData = sips.data.data;
      const fData = fds.data.data;
      const stData = stocks.data.data;
      const mData = members.data.data;

      const printWindow = window.open('', '_blank');
      
      const formatCurr = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

      // Calculations for informational summary
      let totalInvested = 0;
      let totalCurrentValue = 0;

      sData.forEach(s => { totalInvested += (s.totalInvested || 0); totalCurrentValue += (s.currentValue || s.totalInvested || 0); });
      fData.forEach(f => { totalInvested += (f.principalAmount || 0); totalCurrentValue += (f.maturityAmount || f.principalAmount || 0); });
      stData.forEach(s => { 
        totalInvested += ((s.holdingQuantity || 0) * (s.avgBuyPrice || 0)); 
        totalCurrentValue += ((s.holdingQuantity || 0) * (s.currentPrice || s.avgBuyPrice || 0)); 
      });

      const totalReturns = totalCurrentValue - totalInvested;
      const returnPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
      const returnColor = totalReturns >= 0 ? '#059669' : '#dc2626';

      const html = `
        <html>
          <head>
            <title>Family Investment Report - Assets View</title>
            <style>
              @page { margin: 15mm; size: A4 portrait; }
              body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }
              .header { border-bottom: 3px solid #6366f1; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
              h1 { color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
              .date-meta { color: #64748b; font-size: 13px; font-weight: 500; }
              h2 { color: #334155; margin: 35px 0 15px 0; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
              
              .portfolio-overview { display: flex; background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
              .overview-main { flex: 1; }
              .overview-main p { color: #64748b; margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
              .overview-main h2 { color: #0f172a; font-size: 36px; margin: 0; font-weight: 800; letter-spacing: -1px; text-transform: none; }
              .overview-stats { display: flex; gap: 40px; align-items: center; border-left: 2px solid #cbd5e1; padding-left: 40px; }
              .stat-block p { color: #64748b; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
              .stat-block h3 { margin: 0; font-size: 20px; font-weight: 700; color: #334155; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
              th, td { border: 1px solid #e2e8f0; padding: 12px 16px; text-align: left; }
              th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
              tr:nth-child(even) { background-color: #fbfbfc; }
              
              .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
              .summary-box { padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
              .summary-box h3 { margin: 0 0 5px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
              .summary-box p { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
              
              .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
              .val { font-family: monospace; font-size: 13px; text-align: right; }
              th.val { text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>Family Investment Report</h1>
                <div class="date-meta">Assets View Intelligence System</div>
              </div>
              <div class="date-meta">Generated: ${new Date().toLocaleString('en-IN')}</div>
            </div>
            
            <div class="portfolio-overview">
              <div class="overview-main">
                <p>Total Net Worth</p>
                <h2>${formatCurr(totalCurrentValue)}</h2>
              </div>
              <div class="overview-stats">
                <div class="stat-block">
                  <p>Total Invested</p>
                  <h3>${formatCurr(totalInvested)}</h3>
                </div>
                <div class="stat-block">
                  <p>Total Returns</p>
                  <h3 style="color: ${returnColor}">${totalReturns >= 0 ? '+' : ''}${formatCurr(totalReturns)} (${totalReturns >= 0 ? '+' : ''}${returnPercent.toFixed(2)}%)</h3>
                </div>
              </div>
            </div>

            <div class="summary">
              <div class="summary-box"><h3>Members</h3><p>${mData.length}</p></div>
              <div class="summary-box"><h3>Mutual Funds</h3><p>${sData.length}</p></div>
              <div class="summary-box"><h3>Fixed Deposits</h3><p>${fData.length}</p></div>
              <div class="summary-box"><h3>Direct Equities</h3><p>${stData.length}</p></div>
            </div>

            <h2>Mutual Funds (SIPs)</h2>
            ${sData.length > 0 ? `
            <table>
              <tr><th>Fund Name</th><th class="val">Monthly</th><th class="val">Invested</th><th class="val">Current Value</th><th class="val">Return</th></tr>
              ${sData.map(s => {
                const ret = s.currentValue ? ((s.currentValue - s.totalInvested) / s.totalInvested * 100) : 0;
                return `<tr>
                  <td style="font-weight:500">${s.fundName}</td>
                  <td class="val">${formatCurr(s.amountPerMonth)}</td>
                  <td class="val">${formatCurr(s.totalInvested)}</td>
                  <td class="val" style="font-weight:600">${formatCurr(s.currentValue)}</td>
                  <td class="val" style="color:${ret >= 0 ? '#059669' : '#dc2626'};font-weight:600">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%</td>
                </tr>`
              }).join('')}
            </table>` : '<p style="color:#64748b;font-style:italic">No Mutual Fund SIPs found.</p>'}

            <h2>Fixed Deposits</h2>
            ${fData.length > 0 ? `
            <table>
              <tr><th>Bank</th><th class="val">Principal</th><th class="val">Interest Rate</th><th class="val">Maturity Amount</th></tr>
              ${fData.map(f => `<tr><td style="font-weight:500">${f.bankName}</td><td class="val">${formatCurr(f.principalAmount)}</td><td class="val">${f.interestRate}%</td><td class="val" style="color:#059669;font-weight:600">${f.maturityAmount ? formatCurr(f.maturityAmount) : '-'}</td></tr>`).join('')}
            </table>` : '<p style="color:#64748b;font-style:italic">No Fixed Deposits found.</p>'}

            <h2>Direct Equities (Stocks)</h2>
            ${stData.length > 0 ? `
            <table>
              <tr><th>Symbol</th><th class="val">Quantity</th><th class="val">Avg Buy</th><th class="val">Current Price</th><th class="val">Total Value</th></tr>
              ${stData.map(s => {
                const totalVal = (s.holdingQuantity || 0) * (s.currentPrice || s.avgBuyPrice || 0);
                return `<tr>
                  <td style="font-weight:500">${s.symbol}</td>
                  <td class="val">${s.holdingQuantity || 0}</td>
                  <td class="val">${formatCurr(s.avgBuyPrice)}</td>
                  <td class="val" style="font-weight:600">${s.currentPrice ? formatCurr(s.currentPrice) : '-'}</td>
                  <td class="val" style="color:#059669;font-weight:600">${formatCurr(totalVal)}</td>
                </tr>`
              }).join('')}
            </table>` : '<p style="color:#64748b;font-style:italic">No Stocks found.</p>'}
            
            <div class="footer">
              End of Report &bull; Assets View Family Finance
            </div>

            <script>
              window.onload = function() { 
                setTimeout(function() { 
                  window.print(); 
                  window.close(); 
                }, 500); 
              }
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch(e) {
      toast.error('Failed to generate PDF report');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.error('Please select a valid JSON backup file');
      return;
    }

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        if (!jsonData.members || !Array.isArray(jsonData.members)) {
          throw new Error('Invalid backup format: missing members');
        }

        const res = await api.post('/dashboard/import', jsonData);
        if (res.data.success) {
          toast.success('Data imported successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        console.error(err);
        toast.error(err.message || 'Error parsing JSON file');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <><Topbar title="Settings"/>
      <div className="page-content animate-fade">
        <h2 style={{fontSize:16,fontWeight:600,marginBottom:20}}>⚙️ Settings</h2>

        <div className="card" style={{marginBottom:20}}>
          <div className="card-header">
            <div className="card-title">Account</div>
            {!isEditing && <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>Edit Details</button>}
          </div>
          
          {isEditing ? (
            <div style={{ padding: '20px 0', borderTop: '1px solid var(--border-color)', marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '10px 20px' }}>
                  {renderAvatar(editForm.avatar, 90)}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('avatar-upload').click()} type="button">
                       <ImageIcon size={14} /> Upload
                    </button>
                    <input type="file" id="avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditForm({...editForm, avatar: '👤'})} type="button" title="Reset to default emoji"><Trash2 size={14} /></button>
                  </div>
                  <div style={{fontSize: 11, color: 'var(--text-muted)'}}>Max size: 1MB</div>
                </div>

                <div style={{ flex: 1, minWidth: 280 }}>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, display: 'block' }}>Full Name</label>
                    <input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ fontSize: 14, padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid transparent' }} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='transparent'} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, display: 'block' }}>Email Address</label>
                    <input type="email" className="form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ fontSize: 14, padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid transparent' }} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='transparent'} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setEditForm({ name: user?.name, email: user?.email, avatar: user?.avatar }); }} style={{ padding: '10px 20px' }}>Cancel</button>
                    <button className="btn btn-primary" disabled={saving} onClick={async () => {
                      setSaving(true);
                      try {
                        const res = await api.put('/auth/profile', editForm);
                        setUser(res.data.user);
                        toast.success('Profile updated');
                        setIsEditing(false);
                      } catch (e) { toast.error('Update failed'); }
                      setSaving(false);
                    }} style={{ padding: '10px 24px' }}>
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:16,marginTop:16}}>
              {renderAvatar(user?.avatar, 56)}
              <div><div style={{fontSize:18,fontWeight:600}}>{user?.name}</div><div style={{fontSize:13,color:'var(--text-muted)'}}>{user?.email}</div><div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Role: <span className="badge badge-primary">{user?.role}</span></div></div>
            </div>
          )}
        </div>

        <div className="card" style={{marginBottom:20}}>
          <div className="card-title" style={{marginBottom:16}}>Data Management</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
            <button className="btn btn-secondary" onClick={exportData}><Download size={16}/> Export All Data (JSON)</button>
            <button className="btn btn-secondary" onClick={exportPdf}><FileText size={16}/> Export as PDF</button>
            <button className="btn btn-primary" onClick={handleImportClick} disabled={importing}>
              <Upload size={16}/> {importing ? 'Importing...' : 'Import Data (JSON)'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{display:'none'}} />
          </div>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:12}}>Export creates a JSON backup file or a printable PDF report. You can import a previously exported JSON backup to restore your data on a new account.</p>
        </div>

        <div className="card">
          <div className="card-title" style={{marginBottom:16}}>Security & Preferences</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Two-Factor Authentication</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}></div> Disabled
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Active Sessions</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--success)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div> 1 (This Device)
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Data Encryption</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}></div> Standard AES-256
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
