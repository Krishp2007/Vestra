import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import toast from 'react-hot-toast';
import SearchSelect from '../components/SearchSelect';
import { SIP_CATEGORIES, COMPOUNDING_OPTIONS, INDIAN_BANKS, EXCHANGES } from '../utils/helpers';
import { TrendingUp, Landmark, BarChart3, Plus, Info } from 'lucide-react';

export default function QuickAddPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('sip');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [mfSuggestions, setMfSuggestions] = useState([]);
  const [stockSuggestions, setStockSuggestions] = useState([]);
  
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    if (tab && ['sip', 'fd', 'stock'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);
  
  // SIP Form — identical to SIPPage
  const [sipForm, setSipForm] = useState({ fundName: '', schemeCode: '', memberId: '', amountPerMonth: '', sipDate: 1, startDate: '', category: 'Equity', status: 'active', totalInvested: '', totalUnits: '', notes: '' });
  // FD Form — identical to FDPage
  const [fdForm, setFdForm] = useState({ bankName: '', memberId: '', principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', durationDays: '', maturityDate: '', isAutoRenew: false, nominee: '', notes: '' });
  // Stock Form — identical to StockPage
  const [stockForm, setStockForm] = useState({ symbol: '', memberId: '', exchange: 'NSE', type: 'buy', date: '', quantity: '', pricePerUnit: '', brokerage: 0 });

  useEffect(() => {
    api.get('/members').then(res => {
      setMembers(res.data.data);
      if (res.data.data.length > 0) {
        const firstId = res.data.data[0]._id;
        setSipForm(s => ({ ...s, memberId: firstId }));
        setFdForm(s => ({ ...s, memberId: firstId }));
        setStockForm(s => ({ ...s, memberId: firstId }));
      }
    });
  }, []);

  // FD Auto-calculator: Duration Days → Maturity Date
  useEffect(() => {
    if (fdForm.startDate && fdForm.durationDays) {
      const start = new Date(fdForm.startDate);
      const days = parseInt(fdForm.durationDays, 10);
      if (!isNaN(days) && days > 0) {
        const maturity = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        const yyyy = maturity.getFullYear();
        const mm = String(maturity.getMonth() + 1).padStart(2, '0');
        const dd = String(maturity.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        if (formattedDate !== fdForm.maturityDate) {
          setFdForm(prev => ({ ...prev, maturityDate: formattedDate }));
        }
      }
    }
  }, [fdForm.startDate, fdForm.durationDays]);

  // ── SIP: MFAPI fund search (same as SIPPage) ──
  const handleFundSearch = async (query) => {
    setSipForm({...sipForm, fundName: query});
    if (query.length < 3) { setMfSuggestions([]); return; }
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${query}`);
      let data = await res.json();
      data.sort((a, b) => {
        const aD = a.schemeName.toLowerCase().includes('direct') ? 0 : 1;
        const bD = b.schemeName.toLowerCase().includes('direct') ? 0 : 1;
        if (aD !== bD) return aD - bD;
        const aG = a.schemeName.toLowerCase().includes('growth') ? 0 : 1;
        const bG = b.schemeName.toLowerCase().includes('growth') ? 0 : 1;
        return aG - bG;
      });
      setMfSuggestions(data.slice(0, 10));
    } catch { setMfSuggestions([]); }
  };

  const handleFundSelect = (e) => {
    const val = e.target.value;
    const selected = mfSuggestions.find(s => s.schemeName === val);
    if (selected) {
      setSipForm({...sipForm, fundName: selected.schemeName, schemeCode: selected.schemeCode});
    } else {
      setSipForm({...sipForm, fundName: val});
    }
  };

  // ── Stock: Symbol search via our backend API (same as StockPage) ──
  const handleSymbolSearch = async (query) => {
    setStockForm({...stockForm, symbol: query.toUpperCase()});
    if (query.length < 2) { setStockSuggestions([]); return; }
    try {
      const res = await api.get(`/stocks/search/${query}`);
      if (res.data.success && res.data.quotes) {
        setStockSuggestions(res.data.quotes);
      }
    } catch { setStockSuggestions([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (activeTab === 'fd' && parseFloat(fdForm.interestRate) > 20) {
      toast.error('Invalid Interest Rate: Cannot exceed 20%');
      return;
    }

    setSaving(true);
    try {
      if (activeTab === 'sip') {
        const submitForm = { ...sipForm, memberId: sipForm.memberId || (members.length > 0 ? members[0]._id : '') };
        await api.post('/sips', submitForm);
        toast.success('SIP Added!');
        setSipForm(prev => ({ ...prev, fundName: '', schemeCode: '', amountPerMonth: '', totalInvested: '', totalUnits: '', notes: '' })); 
      } else if (activeTab === 'fd') {
        const submitForm = { ...fdForm, memberId: fdForm.memberId || (members.length > 0 ? members[0]._id : '') };
        await api.post('/fds', submitForm);
        toast.success('Fixed Deposit Added!');
        setFdForm(prev => ({ ...prev, bankName: '', principalAmount: '', durationDays: '', maturityDate: '', nominee: '' }));
      } else if (activeTab === 'stock') {
        const sym = stockForm.symbol.toUpperCase();
        const selectedMemberId = stockForm.memberId || (members.length > 0 ? members[0]._id : '');
        await api.post('/stocks', {
          symbol: sym, memberId: selectedMemberId, exchange: stockForm.exchange,
          transactions: [{ type: stockForm.type, date: stockForm.date, quantity: Number(stockForm.quantity), pricePerUnit: Number(stockForm.pricePerUnit), brokerage: Number(stockForm.brokerage || 0) }]
        });
        toast.success('Stock Transaction Added!');
        setStockForm(prev => ({ ...prev, symbol: '', date: '', quantity: '', pricePerUnit: '', brokerage: 0 }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add entry');
    }
    setSaving(false);
  };

  const tabs = [
    { id: 'sip', label: 'Mutual Fund / SIP', icon: <TrendingUp size={18} />, color: '#6366f1' },
    { id: 'fd', label: 'Fixed Deposit', icon: <Landmark size={18} />, color: '#f59e0b' },
    { id: 'stock', label: 'Stock', icon: <BarChart3 size={18} />, color: '#10b981' },
  ];

  return (
    <><Topbar title="Quick Add" />
      <div className="page-content animate-fade">

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '18px 12px',
                background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                border: activeTab === tab.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: activeTab === tab.id ? 'var(--shadow-glow)' : 'none',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: activeTab === tab.id ? `${tab.color}20` : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
                transition: 'var(--transition)',
              }}>
                {tab.icon}
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'var(--transition)',
              }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Form Card */}
        <div className="card animate-fade" style={{ padding: '28px 24px' }}>
          <form onSubmit={handleSubmit}>

            {/* ═══════════════ SIP FORM (exact copy of SIPPage modal) ═══════════════ */}
            {activeTab === 'sip' && (
              <div className="animate-fade">
                <div className="form-group">
                  <label className="form-label">Fund Name *</label>
                  <input className="form-input" list="mf-suggestions-qa" value={sipForm.fundName} onChange={handleFundSelect} onInput={e => handleFundSearch(e.target.value)} required placeholder="Search for Indian Mutual Funds (e.g. Parag Parikh Flexi)" autoComplete="off" />
                  <datalist id="mf-suggestions-qa">
                    {mfSuggestions.map((s) => <option key={s.schemeCode} value={s.schemeName}>{s.schemeName}</option>)}
                  </datalist>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Family Member *</label><SearchSelect options={members.map(m => ({ value: m._id, label: `${m.avatar} ${m.name}`, searchLabel: m.name }))} value={sipForm.memberId} onChange={val => setSipForm({...sipForm, memberId: val})} placeholder="Select member..." searchKey="searchLabel" required /></div>
                  <div className="form-group"><label className="form-label">Category</label><SearchSelect options={SIP_CATEGORIES} value={sipForm.category} onChange={val => setSipForm({...sipForm, category: val})} placeholder="Category" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Monthly Amount (₹) *</label><input className="form-input" type="number" value={sipForm.amountPerMonth} onChange={e => setSipForm({ ...sipForm, amountPerMonth: e.target.value })} required min="100" placeholder="5000" /></div>
                  <div className="form-group"><label className="form-label">SIP Date (day)</label><input className="form-input" type="number" value={sipForm.sipDate} onChange={e => setSipForm({ ...sipForm, sipDate: e.target.value })} min="1" max="28" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Total Invested Value (₹) *</label><input className="form-input" type="number" value={sipForm.totalInvested} onChange={e => setSipForm({ ...sipForm, totalInvested: e.target.value })} required placeholder="50000" /></div>
                  <div className="form-group"><label className="form-label">Total Units</label><input className="form-input" type="number" step="0.001" value={sipForm.totalUnits} onChange={e => setSipForm({ ...sipForm, totalUnits: e.target.value })} placeholder="150.5" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={sipForm.startDate} onChange={e => setSipForm({ ...sipForm, startDate: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Status</label><SearchSelect options={[{value:'active',label:'Active'},{value:'paused',label:'Paused'},{value:'completed',label:'Completed'}]} value={sipForm.status} onChange={val => setSipForm({...sipForm, status: val})} placeholder="Status" /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={sipForm.notes} onChange={e => setSipForm({ ...sipForm, notes: e.target.value })} placeholder="Optional notes" /></div>
              </div>
            )}

            {/* ═══════════════ FD FORM (exact copy of FDPage modal) ═══════════════ */}
            {activeTab === 'fd' && (
              <div className="animate-fade">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name *</label>
                    <SearchSelect 
                      options={INDIAN_BANKS} 
                      value={fdForm.bankName} 
                      onChange={val => setFdForm({...fdForm, bankName: val})} 
                      placeholder="Search bank..." 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Family Member *</label>
                    <SearchSelect 
                      options={members.map(m => ({ value: m._id, label: `${m.avatar} ${m.name}`, searchLabel: m.name }))} 
                      value={fdForm.memberId} 
                      onChange={val => setFdForm({...fdForm, memberId: val})} 
                      placeholder="Select member..." 
                      searchKey="searchLabel"
                      required 
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Principal (₹) *</label><input className="form-input" type="number" value={fdForm.principalAmount} onChange={e => setFdForm({ ...fdForm, principalAmount: e.target.value })} required min="1000" /></div>
                  <div className="form-group"><label className="form-label">Interest Rate (%) *</label><input className="form-input" type="number" step="0.01" value={fdForm.interestRate} onChange={e => setFdForm({ ...fdForm, interestRate: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={fdForm.startDate} onChange={e => setFdForm({ ...fdForm, startDate: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Duration (Days) *</label><input className="form-input" type="number" placeholder="e.g. 444" value={fdForm.durationDays} onChange={e => setFdForm({ ...fdForm, durationDays: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Compounding</label><SearchSelect options={COMPOUNDING_OPTIONS} value={fdForm.compounding} onChange={val => setFdForm({...fdForm, compounding: val})} placeholder="Compounding" /></div>
                  <div className="form-group"><label className="form-label">Nominee</label><input className="form-input" value={fdForm.nominee} onChange={e => setFdForm({ ...fdForm, nominee: e.target.value })} /></div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={fdForm.isAutoRenew} onChange={e => setFdForm({ ...fdForm, isAutoRenew: e.target.checked })} />
                  <label className="form-label" style={{ margin: 0 }}>Auto-renew on maturity</label>
                </div>
              </div>
            )}

            {/* ═══════════════ STOCK FORM (exact copy of StockPage modal) ═══════════════ */}
            {activeTab === 'stock' && (
              <div className="animate-fade">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stock Symbol *</label>
                    <input className="form-input" list="stock-suggestions-qa" value={stockForm.symbol} onChange={e => handleSymbolSearch(e.target.value)} required placeholder="Search symbol or name..." autoComplete="off" />
                    <datalist id="stock-suggestions-qa">
                      {stockSuggestions.map((s, i) => <option key={i} value={s.symbol.replace('.NS', '').replace('.BO', '')}>{s.shortname} ({s.exchDisp})</option>)}
                    </datalist>
                  </div>
                  <div className="form-group"><label className="form-label">Exchange</label><SearchSelect options={EXCHANGES} value={stockForm.exchange} onChange={val => setStockForm({...stockForm, exchange: val})} placeholder="Exchange" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Member *</label><SearchSelect options={members.map(m => ({ value: m._id, label: `${m.avatar} ${m.name}`, searchLabel: m.name }))} value={stockForm.memberId} onChange={val => setStockForm({...stockForm, memberId: val})} placeholder="Select member..." searchKey="searchLabel" required /></div>
                  <div className="form-group"><label className="form-label">Type</label><SearchSelect options={[{value:'buy',label:'Buy'},{value:'sell',label:'Sell'}]} value={stockForm.type} onChange={val => setStockForm({...stockForm, type: val})} placeholder="Type" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={stockForm.date} onChange={e => setStockForm({...stockForm, date: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Quantity *</label><input className="form-input" type="number" value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} required min="1" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Price per Unit (₹) *</label><input className="form-input" type="number" step="0.01" value={stockForm.pricePerUnit} onChange={e => setStockForm({...stockForm, pricePerUnit: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Brokerage (₹)</label><input className="form-input" type="number" value={stockForm.brokerage} onChange={e => setStockForm({...stockForm, brokerage: e.target.value})} /></div>
                </div>
              </div>
            )}

            {/* Tip */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: 20, marginTop: 4 }}>
              <Info size={14} color="var(--info)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {activeTab === 'sip' && 'Current value will be auto-fetched via the MFAPI if a scheme code is matched.'}
                {activeTab === 'fd' && 'Maturity date and amount are auto-calculated based on principal, rate, and duration.'}
                {activeTab === 'stock' && 'Current market price will be auto-fetched from Yahoo Finance every 30 seconds.'}
              </span>
            </div>

            {/* Submit */}
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, marginTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => {
                if (activeTab === 'sip') setSipForm(prev => ({ ...prev, fundName: '', schemeCode: '', amountPerMonth: '', totalInvested: '', totalUnits: '', notes: '' }));
                if (activeTab === 'fd') setFdForm(prev => ({ ...prev, bankName: '', principalAmount: '', durationDays: '', maturityDate: '', nominee: '' }));
                if (activeTab === 'stock') setStockForm(prev => ({ ...prev, symbol: '', date: '', quantity: '', pricePerUnit: '', brokerage: 0 }));
              }}>Clear</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving ? 'Saving...' : <><Plus size={16} /> Add {activeTab === 'sip' ? 'SIP' : activeTab === 'fd' ? 'Fixed Deposit' : 'Transaction'}</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
