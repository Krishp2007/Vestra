import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Zap, TrendingUp, Landmark, BarChart3, Plus, CheckCircle2 } from 'lucide-react';

export default function QuickAddPage() {
  const [activeTab, setActiveTab] = useState('sip');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // Forms
  const [sipForm, setSipForm] = useState({ memberId: '', fundName: '', category: 'Equity', installmentAmount: '', frequency: 'Monthly', startDate: '', durationMonths: '', currentNav: '', units: '', currentValue: '' });
  const [fdForm, setFdForm] = useState({ memberId: '', bankName: '', fdNumber: '', principalAmount: '', interestRate: '', startDate: '', durationDays: '', maturityDate: '', maturityAmount: '', compoundingFrequency: 'Quarterly', status: 'Active' });
  const [stockForm, setStockForm] = useState({ memberId: '', symbol: '', companyName: '', avgBuyPrice: '', holdingQuantity: '', currentPrice: '', sector: '' });

  useEffect(() => {
    api.get('/members').then(res => {
      setMembers(res.data.data);
      if (res.data.data.length > 0) {
        setSipForm(s => ({ ...s, memberId: res.data.data[0]._id }));
        setFdForm(s => ({ ...s, memberId: res.data.data[0]._id }));
        setStockForm(s => ({ ...s, memberId: res.data.data[0]._id }));
      }
    });
  }, []);

  // FD Auto-calculator (Duration Days -> Maturity Date -> Maturity Amount)
  useEffect(() => {
    if (fdForm.startDate && fdForm.durationDays) {
      const start = new Date(fdForm.startDate);
      const days = parseInt(fdForm.durationDays, 10);
      if (!isNaN(days) && days > 0) {
        const maturity = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        // Format to YYYY-MM-DD for standard storage
        const yyyy = maturity.getFullYear();
        const mm = String(maturity.getMonth() + 1).padStart(2, '0');
        const dd = String(maturity.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        
        if (formattedDate !== fdForm.maturityDate) {
           setFdForm(prev => ({ ...prev, maturityDate: formattedDate }));
        }

        if (fdForm.principalAmount && fdForm.interestRate) {
            const p = parseFloat(fdForm.principalAmount);
            const r = parseFloat(fdForm.interestRate) / 100;
            const years = days / 365.25;
            let n = 4; // Quarterly
            if (fdForm.compoundingFrequency === 'Monthly') n = 12;
            if (fdForm.compoundingFrequency === 'Annually') n = 1;
            if (fdForm.compoundingFrequency === 'At Maturity') n = 1/years;
            
            const maturityAmt = p * Math.pow((1 + r/n), n * years);
            setFdForm(prev => ({ ...prev, maturityAmount: Math.round(maturityAmt).toString() }));
        }
      }
    }
  }, [fdForm.startDate, fdForm.durationDays, fdForm.principalAmount, fdForm.interestRate, fdForm.compoundingFrequency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // FD Validation 
    if (activeTab === 'fd' && parseFloat(fdForm.interestRate) > 20) {
      toast.error('Invalid Interest Rate: Cannot exceed 20%');
      return;
    }

    setSaving(true);
    try {
      if (activeTab === 'sip') {
        const payload = { ...sipForm, totalInvested: (parseFloat(sipForm.installmentAmount) * parseFloat(sipForm.durationMonths)) };
        await api.post('/sips', payload);
        toast.success('SIP Added!');
        setSipForm(prev => ({ ...prev, fundName: '', currentNav: '', units: '', currentValue: '' })); 
      } else if (activeTab === 'fd') {
        // Build final payload mapping durationDays to maturityDate if API needs it
        const payload = { ...fdForm };
        await api.post('/fds', payload);
        toast.success('Fixed Deposit Added!');
        setFdForm(prev => ({ ...prev, fdNumber: '', principalAmount: '', durationDays: '', maturityDate: '', maturityAmount: '' }));
      } else if (activeTab === 'stock') {
        await api.post('/stocks', stockForm);
        toast.success('Stock Added!');
        setStockForm(prev => ({ ...prev, symbol: '', companyName: '', avgBuyPrice: '', holdingQuantity: '', currentPrice: '' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add entry');
    }
    setSaving(false);
  };

  return (
    <><Topbar title="Quick Add" />
      <div className="page-content animate-fade">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Zap size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Smart Entry Hub</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Quickly add your investments using the smart wizard.</p>
          </div>
        </div>

        <div className="card animate-fade" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button className={`tab-btn ${activeTab === 'sip' ? 'active' : ''}`} onClick={() => setActiveTab('sip')} style={{ flex: 1, minWidth: 120, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: activeTab === 'sip' ? 'var(--bg-secondary)' : 'transparent', borderBottom: activeTab === 'sip' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'sip' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', transition: '0.2s' }}>
              <TrendingUp size={16} /> SIP
            </button>
            <button className={`tab-btn ${activeTab === 'fd' ? 'active' : ''}`} onClick={() => setActiveTab('fd')} style={{ flex: 1, minWidth: 120, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: activeTab === 'fd' ? 'var(--bg-secondary)' : 'transparent', borderBottom: activeTab === 'fd' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'fd' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', transition: '0.2s' }}>
              <Landmark size={16} /> FD
            </button>
            <button className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')} style={{ flex: 1, minWidth: 120, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: activeTab === 'stock' ? 'var(--bg-secondary)' : 'transparent', borderBottom: activeTab === 'stock' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'stock' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', transition: '0.2s' }}>
              <BarChart3 size={16} /> Stock
            </button>
          </div>

          <div style={{ padding: 24 }}>
            <form onSubmit={handleSubmit}>
              
              {/* MEMBER SELECT */}
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assign to Family Member</label>
                <select className="form-select" value={activeTab === 'sip' ? sipForm.memberId : activeTab === 'fd' ? fdForm.memberId : stockForm.memberId} onChange={(e) => {
                  const val = e.target.value;
                  if (activeTab === 'sip') setSipForm({...sipForm, memberId: val});
                  if (activeTab === 'fd') setFdForm({...fdForm, memberId: val});
                  if (activeTab === 'stock') setStockForm({...stockForm, memberId: val});
                }} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}>
                  {members.map(m => <option key={m._id} value={m._id}>{m.name} ({m.relation})</option>)}
                </select>
              </div>

              {/* SIP FORM */}
              {activeTab === 'sip' && (
                <div className="form-row animate-fade">
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Fund Name</label><input type="text" className="form-input" placeholder="e.g. Parag Parikh Flexi Cap" value={sipForm.fundName} onChange={e=>setSipForm({...sipForm, fundName: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Category</label><select className="form-select" value={sipForm.category} onChange={e=>setSipForm({...sipForm, category: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}><option>Equity</option><option>Debt</option><option>Hybrid</option><option>Index</option></select></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Installment Amount (₹)</label><input type="number" className="form-input" value={sipForm.installmentAmount} onChange={e=>setSipForm({...sipForm, installmentAmount: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Frequency</label><select className="form-select" value={sipForm.frequency} onChange={e=>setSipForm({...sipForm, frequency: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}><option>Monthly</option><option>Weekly</option><option>Quarterly</option></select></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Start Date</label><input type="date" className="form-input" value={sipForm.startDate} onChange={e=>setSipForm({...sipForm, startDate: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Duration (Months)</label><input type="number" className="form-input" value={sipForm.durationMonths} onChange={e=>setSipForm({...sipForm, durationMonths: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Current NAV (Optional)</label><input type="number" step="0.01" className="form-input" value={sipForm.currentNav} onChange={e=>setSipForm({...sipForm, currentNav: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Units (Optional)</label><input type="number" step="0.001" className="form-input" value={sipForm.units} onChange={e=>setSipForm({...sipForm, units: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  
                  {sipForm.installmentAmount && sipForm.durationMonths && (
                    <div style={{ gridColumn: '1 / -1', padding: 12, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} /> <strong>Auto-Calculated Total Invested:</strong> ₹{(parseFloat(sipForm.installmentAmount) * parseFloat(sipForm.durationMonths)).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              )}

              {/* FD FORM */}
              {activeTab === 'fd' && (
                <div className="form-row animate-fade">
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Bank Name</label><input type="text" className="form-input" placeholder="e.g. HDFC Bank" value={fdForm.bankName} onChange={e=>setFdForm({...fdForm, bankName: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>FD Number</label><input type="text" className="form-input" placeholder="XXXX-XXXX" value={fdForm.fdNumber} onChange={e=>setFdForm({...fdForm, fdNumber: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Principal Amount (₹)</label><input type="number" className="form-input" value={fdForm.principalAmount} onChange={e=>setFdForm({...fdForm, principalAmount: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Interest Rate (%)</label><input type="number" step="0.1" className="form-input" value={fdForm.interestRate} onChange={e=>setFdForm({...fdForm, interestRate: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Start Date</label><input type="date" className="form-input" value={fdForm.startDate} onChange={e=>setFdForm({...fdForm, startDate: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Duration (Days)</label><input type="number" className="form-input" placeholder="e.g. 444" value={fdForm.durationDays} onChange={e=>setFdForm({...fdForm, durationDays: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Compounding</label><select className="form-select" value={fdForm.compoundingFrequency} onChange={e=>setFdForm({...fdForm, compoundingFrequency: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}><option>Quarterly</option><option>Monthly</option><option>Annually</option><option>At Maturity</option></select></div>
                </div>
              )}

              {/* STOCK FORM */}
              {activeTab === 'stock' && (
                <div className="form-row animate-fade">
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Stock Symbol</label><input type="text" className="form-input" placeholder="e.g. RELIANCE.NS" value={stockForm.symbol} onChange={e=>setStockForm({...stockForm, symbol: e.target.value.toUpperCase()})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Company Name</label><input type="text" className="form-input" placeholder="e.g. Reliance Industries" value={stockForm.companyName} onChange={e=>setStockForm({...stockForm, companyName: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Sector</label><input type="text" className="form-input" placeholder="e.g. Energy" value={stockForm.sector} onChange={e=>setStockForm({...stockForm, sector: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Holding Quantity</label><input type="number" className="form-input" value={stockForm.holdingQuantity} onChange={e=>setStockForm({...stockForm, holdingQuantity: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Average Buy Price (₹)</label><input type="number" step="0.01" className="form-input" value={stockForm.avgBuyPrice} onChange={e=>setStockForm({...stockForm, avgBuyPrice: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  <div className="form-group"><label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Current Price (Optional)</label><input type="number" step="0.01" className="form-input" value={stockForm.currentPrice} onChange={e=>setStockForm({...stockForm, currentPrice: e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} /></div>
                  
                  {stockForm.holdingQuantity && stockForm.avgBuyPrice && (
                    <div style={{ gridColumn: '1 / -1', padding: 12, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} /> <strong>Total Investment Cost:</strong> ₹{(parseFloat(stockForm.holdingQuantity) * parseFloat(stockForm.avgBuyPrice)).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 24px', fontSize: 14 }}>
                  {saving ? 'Saving...' : <><Plus size={18}/> Save Data</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}
