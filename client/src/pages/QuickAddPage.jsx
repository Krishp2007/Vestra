import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { TrendingUp, Landmark, BarChart3, Info } from 'lucide-react';
import SipForm from '../components/forms/SipForm';
import FdForm from '../components/forms/FdForm';
import StockForm from '../components/forms/StockForm';

export default function QuickAddPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('sip');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [preselectedMemberId, setPreselectedMemberId] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    if (tab && ['sip', 'fd', 'stock'].includes(tab)) {
      setActiveTab(tab);
    }
    const mId = query.get('memberId');
    if (mId) {
      setPreselectedMemberId(mId);
    }
  }, [location.search]);

  useEffect(() => {
    api.get('/members').then(res => {
      setMembers(res.data.data);
    });
  }, []);

  const formInitialData = useMemo(() => {
    return preselectedMemberId ? { memberId: preselectedMemberId } : undefined;
  }, [preselectedMemberId]);

  const handleSipSubmit = async (formData) => {
    setSaving(true);
    try {
      const submitForm = { ...formData, memberId: formData.memberId || (members.length > 0 ? members[0]._id : '') };
      await api.post('/sips', submitForm);
      toast.success('SIP Added!');
      // Trigger a clean reset of SipForm by passing a new empty object or forcing initialData update
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add SIP');
    }
    setSaving(false);
  };

  const handleFdSubmit = async (formData) => {
    if (parseFloat(formData.interestRate) > 20) {
      toast.error('Invalid Interest Rate: Cannot exceed 20%');
      return;
    }
    setSaving(true);
    try {
      const submitForm = { ...formData, memberId: formData.memberId || (members.length > 0 ? members[0]._id : '') };
      await api.post('/fds', submitForm);
      toast.success('Fixed Deposit Added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add FD');
    }
    setSaving(false);
  };

  const handleStockSubmit = async (formData) => {
    setSaving(true);
    try {
      const sym = formData.symbol.toUpperCase();
      const selectedMemberId = formData.memberId || (members.length > 0 ? members[0]._id : '');
      await api.post('/stocks', {
        symbol: sym,
        memberId: selectedMemberId,
        exchange: formData.exchange,
        transactions: [{
          type: formData.type,
          date: formData.date,
          quantity: Number(formData.quantity),
          pricePerUnit: Number(formData.pricePerUnit),
          brokerage: Number(formData.brokerage || 0)
        }]
      });
      toast.success('Stock Transaction Added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add stock transaction');
    }
    setSaving(false);
  };

  const tabs = [
    { id: 'sip', label: 'Mutual Fund / SIP', icon: <TrendingUp size={18} />, color: '#6366f1' },
    { id: 'fd', label: 'Fixed Deposit', icon: <Landmark size={18} />, color: '#f59e0b' },
    { id: 'stock', label: 'Stock', icon: <BarChart3 size={18} />, color: '#10b981' },
  ];

  return (
    <>
      <Topbar title="Quick Add" />
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
          
          {activeTab === 'sip' && (
            <SipForm
              initialData={formInitialData}
              members={members}
              saving={saving}
              onSubmit={handleSipSubmit}
              submitLabel="Add SIP"
            />
          )}

          {activeTab === 'fd' && (
            <FdForm
              initialData={formInitialData}
              members={members}
              saving={saving}
              onSubmit={handleFdSubmit}
              submitLabel="Add Fixed Deposit"
            />
          )}

          {activeTab === 'stock' && (
            <StockForm
              initialData={formInitialData}
              members={members}
              saving={saving}
              onSubmit={handleStockSubmit}
              submitLabel="Add Transaction"
            />
          )}

          {/* Tip */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: 0, marginTop: 24 }}>
            <Info size={14} color="var(--info)" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {activeTab === 'sip' && 'Current value will be auto-fetched via the MFAPI if a scheme code is matched.'}
              {activeTab === 'fd' && 'Maturity date and amount are auto-calculated based on principal, rate, and duration.'}
              {activeTab === 'stock' && 'Current market price will be auto-fetched from Yahoo Finance every 30 seconds.'}
            </span>
          </div>

        </div>
      </div>
    </>
  );
}
