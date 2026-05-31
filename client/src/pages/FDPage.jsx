import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, X, AlertTriangle } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import FdForm from '../components/forms/FdForm';
import Pagination from '../components/shared/Pagination';
import EmptyState from '../components/shared/EmptyState';

export default function FDPage() {
  const [fds, setFds] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [form, setForm] = useState({ bankName: '', memberId: '', principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', durationDays: '', maturityDate: '', isAutoRenew: false, nominee: '' });
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
        const effectiveN = comp.includes('maturity') ? (1 / years) : n;

        const amount = breakModal.fd.principalAmount * Math.pow(1 + (effectiveRate / 100) / effectiveN, effectiveN * years);
        setBreakModal(m => ({ ...m, calculatedAmount: Math.round(amount) }));
      } else {
        setBreakModal(m => ({ ...m, calculatedAmount: breakModal.fd.principalAmount }));
      }
    }
  }, [breakModal.penaltyPercentage, breakModal.breakDate, breakModal.show, breakModal.fd]);

  const handleFdSubmit = async (formData) => {
    if (parseFloat(formData.interestRate) > 20) {
      toast.error('Invalid Interest Rate: Cannot exceed 20%');
      return;
    }
    try {
      const submitForm = { ...formData, memberId: formData.memberId || (members.length > 0 ? members[0]._id : '') };
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
    setForm({
      bankName: fd.bankName,
      memberId: fd.memberId?._id || fd.memberId,
      principalAmount: fd.principalAmount,
      interestRate: fd.interestRate,
      compounding: fd.compounding,
      startDate: fd.startDate?.slice(0, 10),
      durationDays: days,
      maturityDate: fd.maturityDate?.slice(0, 10),
      isAutoRenew: fd.isAutoRenew,
      nominee: fd.nominee || ''
    });
    setEditId(fd._id);
    setShowForm(true);
  };

  const load = async () => {
    try {
      const [f, m] = await Promise.all([api.get('/fds'), api.get('/members')]);
      setFds(f.data.data); setMembers(m.data.data);
    } catch (e) { toast.error('Error loading FDs'); }
    finally { setLoading(false); }
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
      await api.put(`/fds/${fd._id}`, { status: 'premature-closed', closureReason: `Broken prematurely on ${formatDate(breakDate)}. Effective Rate: ${effectiveRate}% (after ${penaltyPercentage}% penalty). Final Payout: ₹${Math.round(calculatedAmount).toLocaleString('en-IN')}` });
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
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ bankName: '', memberId: members[0]?._id || '', principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', maturityDate: '', isAutoRenew: false, nominee: '' }); }}><Plus size={16} /> Add FD</button>
        </div>

        {fds.length > 0 ? (
          <>
            {/* Desktop Table Layout */}
            <div className="card table-responsive desktop-table-container" style={{ padding: 0 }}>
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
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => setDeleteModal({ show: true, id: fd._id })}><Trash2 size={14} /></button>
                      </div></td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>

            {/* Mobile Cards Layout */}
            <div className="mobile-asset-cards">
              {fds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(fd => {
                return (
                  <div key={fd._id} className="mobile-asset-card" onClick={() => setViewingAsset(fd)}>
                    <div className="mobile-asset-card-header">
                      <div>
                        <h4 className="mobile-asset-card-title">{fd.bankName}</h4>
                        <span className="mobile-asset-card-subtitle">{fd.compounding} compounding</span>
                      </div>
                      <div>{getStatusBadge(fd)}</div>
                    </div>
                    <div className="mobile-asset-card-body">
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Member</span>
                        <span className="mobile-asset-card-value">{fd.memberId?.avatar} {fd.memberId?.name || '-'}</span>
                      </div>
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Principal</span>
                        <span className="mobile-asset-card-value">{formatCurrency(fd.principalAmount)}</span>
                      </div>
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Interest Rate</span>
                        <span className="mobile-asset-card-value" style={{ color: 'var(--success)', fontWeight: 700 }}>{fd.interestRate}%</span>
                      </div>
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Maturity Amt</span>
                        <span className="mobile-asset-card-value" style={{ fontWeight: 700 }}>{formatCurrency(fd.maturityAmount)}</span>
                      </div>
                    </div>
                    <div className="mobile-asset-card-footer">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap to view details</span>
                      <div className="mobile-asset-card-actions" onClick={e => e.stopPropagation()}>
                        {fd.status === 'active' && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openBreakModal(fd)} title="Break FD"><AlertTriangle size={14} color="var(--danger)" /></button>}
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => handleEdit(fd)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => setDeleteModal({ show: true, id: fd._id })}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={fds.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>) : (
          <EmptyState
            icon="🏦"
            title="No Fixed Deposits yet"
            text={members.length === 0 ? 'Add family members first, then come back to add FDs' : 'Track your FDs with automatic maturity calculations'}
            buttonText={members.length === 0 ? 'Add Members' : 'Add FD'}
            onButtonClick={() => {
              if (members.length === 0) {
                toast.error('Add family members first!');
                navigate('/members');
                return;
              }
              setShowForm(true);
              setEditId(null);
              setForm({ bankName: '', memberId: members[0]._id, principalAmount: '', interestRate: '', compounding: 'quarterly', startDate: '', durationDays: '', maturityDate: '', isAutoRenew: false, nominee: '' });
            }}
          />
        )}

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">{editId ? 'Edit' : 'Add'} Fixed Deposit</h2><button className="modal-close" onClick={() => setShowForm(false)}><X size={16} /></button></div>
              <FdForm
                initialData={form}
                members={members}
                saving={false}
                onSubmit={handleFdSubmit}
                onCancel={() => setShowForm(false)}
                submitLabel={editId ? 'Update FD' : 'Add FD'}
              />
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
                  <div className="form-group"><label className="form-label">Penalty Percentage (%) *</label><input className="form-input" type="number" step="0.01" min="0.01" value={breakModal.penaltyPercentage} onChange={e => setBreakModal({ ...breakModal, penaltyPercentage: e.target.value })} required /></div>
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
