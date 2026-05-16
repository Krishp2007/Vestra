import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusColor, COMPOUNDING_OPTIONS, INDIAN_BANKS } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, X, Clock, XOctagon, RefreshCw, AlertTriangle } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import SearchSelect from '../components/SearchSelect';

export default function FDPage() {
  const [fds, setFds] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({ bankName: '', memberId: '', principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', durationDays: '', maturityDate: '', isAutoRenew: false, nominee: '', notes: '' });
  const [breakModal, setBreakModal] = useState({ show: false, fd: null, penaltyPercentage: 1, breakDate: new Date().toISOString().slice(0, 10), calculatedAmount: 0 });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (breakModal.show && breakModal.fd) {
      const penalty = parseFloat(breakModal.penaltyPercentage) || 0;
      const effectiveRate = Math.max(0, breakModal.fd.interestRate - penalty);

      const start = new Date(breakModal.fd.startDate);
      const bDate = new Date(breakModal.breakDate);
      if (bDate > start) {
        const days = (bDate - start) / (1000 * 60 * 60 * 24);
        const years = days / 365.25;
        let n = 4;
        const comp = (breakModal.fd.compounding || 'quarterly').toLowerCase();
        if (comp.includes('month')) n = 12;
        if (comp.includes('year') || comp.includes('annual')) n = 1;
        const effectiveN = comp.includes('maturity') ? (1/years) : n;

        const amount = breakModal.fd.principalAmount * Math.pow(1 + (effectiveRate / 100) / effectiveN, effectiveN * years);
        setBreakModal(m => ({ ...m, calculatedAmount: Math.round(amount) }));
      } else {
        setBreakModal(m => ({ ...m, calculatedAmount: breakModal.fd.principalAmount }));
      }
    }
  }, [breakModal.penaltyPercentage, breakModal.breakDate, breakModal.show, breakModal.fd]);

  useEffect(() => {
    if (form.startDate && form.durationDays) {
      const start = new Date(form.startDate);
      const days = parseInt(form.durationDays, 10);
      if (!isNaN(days) && days > 0) {
        const maturity = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        const yyyy = maturity.getFullYear();
        const mm = String(maturity.getMonth() + 1).padStart(2, '0');
        const dd = String(maturity.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        if (formattedDate !== form.maturityDate) {
          setForm(prev => ({ ...prev, maturityDate: formattedDate }));
        }
      }
    }
  }, [form.startDate, form.durationDays]);
  const load = async () => {
    try {
      const [f, m] = await Promise.all([api.get('/fds'), api.get('/members')]);
      setFds(f.data.data); setMembers(m.data.data);
    } catch (e) { toast.error('Error loading FDs'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(form.interestRate) > 20) {
      toast.error('Invalid Interest Rate: Cannot exceed 20%');
      return;
    }
    try {
      const submitForm = { ...form, memberId: form.memberId || (members.length > 0 ? members[0]._id : '') };
      if (editId) { await api.put(`/fds/${editId}`, submitForm); toast.success('FD updated!'); }
      else { await api.post('/fds', submitForm); toast.success('FD added!'); }
      setShowForm(false); setEditId(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving FD'); }
  };

  const handleEdit = (fd) => {
    let days = '';
    if (fd.startDate && fd.maturityDate) {
      const s = new Date(fd.startDate);
      const m = new Date(fd.maturityDate);
      days = Math.round((m - s) / (1000 * 60 * 60 * 24)).toString();
    }
    setForm({ bankName: fd.bankName, memberId: fd.memberId?._id || fd.memberId, principalAmount: fd.principalAmount, interestRate: fd.interestRate, compounding: fd.compounding, startDate: fd.startDate?.slice(0, 10), durationDays: days, maturityDate: fd.maturityDate?.slice(0, 10), isAutoRenew: fd.isAutoRenew, nominee: fd.nominee || '', notes: fd.notes || '' });
    setEditId(fd._id); setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try { 
      await api.delete(`/fds/${deleteModal.id}`); 
      toast.success('FD deleted'); 
      setDeleteModal({ show: false, id: null });
      load(); 
    }
    catch (e) { toast.error('Error'); }
  };

  const getStatusBadge = (fd) => {
    if (fd.status === 'matured') return <span className="badge badge-completed">Matured</span>;
    if (fd.status === 'premature-closed') return <span className="badge badge-danger" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>Broken</span>;

    const start = new Date(fd.startDate);
    const end = new Date(fd.maturityDate);
    const now = new Date();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

    if (days <= 0) return <span className="badge badge-completed">Matured</span>;
    if (days <= 7) return <span className="badge badge-danger">Active ({days}d left)</span>;
    if (days <= 30) return <span className="badge badge-paused" style={{ background: '#fffbeb', color: '#d97706' }}>Active ({days}d left)</span>;
    return <span className="badge badge-active" style={{ background: '#f0fdf4', color: '#16a34a' }}>Active ({days}d left)</span>;
  };

  const openBreakModal = (fd) => {
    if (fd.status !== 'active') {
      toast.error('Only active FDs can be broken');
      return;
    }
    setBreakModal({ show: true, fd, penaltyPercentage: 1, breakDate: new Date().toISOString().slice(0, 10), calculatedAmount: fd.principalAmount });
  };

  const confirmBreakFD = async (e) => {
    e.preventDefault();
    try {
      const { fd, calculatedAmount, breakDate, penaltyPercentage } = breakModal;
      const effectiveRate = Math.max(0, fd.interestRate - (parseFloat(penaltyPercentage) || 0));
      await api.put(`/fds/${fd._id}`, { status: 'premature-closed', notes: `Broken prematurely on ${formatDate(breakDate)}. Effective Rate: ${effectiveRate}% (after ${penaltyPercentage}% penalty). Final Payout: ₹${Math.round(calculatedAmount).toLocaleString('en-IN')}` });
      toast.success('FD marked as prematurely closed');
      setBreakModal({ ...breakModal, show: false });
      load();
    } catch (err) {
      toast.error('Failed to break FD');
    }
  };

  if (loading) return (<><Topbar title="Fixed Deposits" /><div className="page-content"><div className="page-loading"><div className="spinner" /></div></div></>);

  return (
    <><Topbar title="Fixed Deposits" />
      <div className="page-content animate-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>All FDs ({fds.length})</h2>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ bankName: '', memberId: members[0]?._id || '', principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', maturityDate: '', isAutoRenew: false, nominee: '', notes: '' }); }}><Plus size={16} /> Add FD</button>
        </div>

        {fds.length > 0 ? (
          <div className="card table-responsive" style={{ padding: 0 }}>
            <table className="data-table"><thead><tr><th>Bank</th><th>Member</th><th>Principal</th><th>Rate</th><th>Maturity Amt</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{fds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(fd => {
                return (
                  <tr key={fd._id} onClick={() => setViewingAsset(fd)} style={{ cursor: 'pointer' }} className="hover-row">
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fd.bankName}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fd.compounding} compounding</span></td>
                    <td>{fd.memberId?.avatar} {fd.memberId?.name || '-'}</td>
                    <td>{formatCurrency(fd.principalAmount)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fd.interestRate}%</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(fd.maturityAmount)}</td>
                    <td>{getStatusBadge(fd)}</td>
                    <td onClick={e => e.stopPropagation()}><div style={{ display: 'flex', gap: 4 }}>
                      {fd.status === 'active' && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openBreakModal(fd)} title="Break FD"><AlertTriangle size={14} color="var(--danger)" /></button>}
                      <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => handleEdit(fd)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => setDeleteModal({show:true, id:fd._id})}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                )
              })}</tbody>
            </table>

            {/* Pagination Controls */}
            {fds.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, fds.length)} of {fds.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={currentPage === Math.ceil(fds.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">🏦</div><div className="empty-state-title">No Fixed Deposits yet</div><div className="empty-state-text">{members.length === 0 ? 'Add family members first, then come back to add FDs' : 'Track your FDs with automatic maturity calculations'}</div><button className="btn btn-primary" onClick={() => { if (members.length === 0) { toast.error('Add family members first!'); navigate('/members'); return; } setShowForm(true); setEditId(null); setForm({ bankName: '', memberId: members[0]._id, principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', durationDays: '', maturityDate: '', isAutoRenew: false, nominee: '', notes: '' }); }}>{members.length === 0 ? 'Add Members' : 'Add FD'}</button></div></div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">{editId ? 'Edit' : 'Add'} Fixed Deposit</h2><button className="modal-close" onClick={() => setShowForm(false)}><X size={16} /></button></div>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name *</label>
                    <SearchSelect 
                      options={INDIAN_BANKS} 
                      value={form.bankName} 
                      onChange={val => setForm({...form, bankName: val})} 
                      placeholder="Search bank..." 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Family Member *</label>
                    <SearchSelect 
                      options={members.map(m => ({ value: m._id, label: `${m.avatar} ${m.name}`, searchLabel: m.name }))} 
                      value={form.memberId} 
                      onChange={val => setForm({...form, memberId: val})} 
                      placeholder="Select member..." 
                      searchKey="searchLabel"
                      required 
                    />
                  </div>
                </div>
                <div className="form-row"><div className="form-group"><label className="form-label">Principal (₹) *</label><input className="form-input" type="number" value={form.principalAmount} onChange={e => setForm({ ...form, principalAmount: e.target.value })} required min="1000" /></div><div className="form-group"><label className="form-label">Interest Rate (%) *</label><input className="form-input" type="number" step="0.01" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} required /></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required /></div><div className="form-group"><label className="form-label">Duration (Days) *</label><input className="form-input" type="number" placeholder="e.g. 444" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} required /></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Compounding</label><SearchSelect options={COMPOUNDING_OPTIONS} value={form.compounding} onChange={val => setForm({...form, compounding: val})} placeholder="Compounding" /></div><div className="form-group"><label className="form-label">Nominee</label><input className="form-input" value={form.nominee} onChange={e => setForm({ ...form, nominee: e.target.value })} /></div></div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.isAutoRenew} onChange={e => setForm({ ...form, isAutoRenew: e.target.checked })} /><label className="form-label" style={{ margin: 0 }}>Auto-renew on maturity</label></div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add'} FD</button></div>
              </form>
            </div>
          </div>
        )}

        {breakModal.show && (
          <div className="modal-overlay" onClick={() => setBreakModal({ ...breakModal, show: false })}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Break Fixed Deposit</h2><button className="modal-close" onClick={() => setBreakModal({ ...breakModal, show: false })}><X size={16} /></button></div>
              <form onSubmit={confirmBreakFD}>
                <div style={{ marginBottom: 15, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  Breaking <strong>{breakModal.fd?.bankName}</strong> FD started on <strong>{formatDate(breakModal.fd?.startDate)}</strong>.<br />
                  Original Interest Rate: <strong>{breakModal.fd?.interestRate}%</strong>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Break Date *</label><input className="form-input" type="date" value={breakModal.breakDate} onChange={e => setBreakModal({ ...breakModal, breakDate: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Penalty Percentage (%) *</label><input className="form-input" type="number" step="0.01" min="0.01" value={breakModal.penaltyPercentage} onChange={e => setBreakModal({...breakModal, penaltyPercentage: e.target.value})} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Calculated Payout Amount (₹)</label><input className="form-input" type="number" value={breakModal.calculatedAmount} readOnly style={{ background: 'var(--bg-secondary)', color: 'var(--success)', fontWeight: 600 }} /></div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setBreakModal({ ...breakModal, show: false })}>Cancel</button><button type="submit" className="btn btn-danger">Confirm Break FD</button></div>
              </form>
            </div>
          </div>
        )}

        {deleteModal.show && (
          <DeleteConfirmModal 
            title="Delete Fixed Deposit" 
            message="Are you sure you want to permanently delete this FD? This action cannot be undone." 
            onConfirm={handleDelete} 
            onCancel={() => setDeleteModal({ show: false, id: null })} 
          />
        )}

        <AssetDetailsModal asset={viewingAsset} type="fd" onClose={() => setViewingAsset(null)} />
      </div>
    </>
  );
}
