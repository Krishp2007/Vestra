import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusColor, SIP_CATEGORIES } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import SearchSelect from '../components/SearchSelect';

export default function SIPPage() {
  const [sips, setSips] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [viewingAsset, setViewingAsset] = useState(null);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({ fundName: '', schemeCode: '', memberId: '', amountPerMonth: '', sipDate: 1, startDate: '', category: 'Equity', status: 'active', totalInvested: '', totalUnits: '', notes: '' });
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { 
    load(); 
    const interval = setInterval(load, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const [s, m] = await Promise.all([api.get('/sips'), api.get('/members')]);
      setSips(s.data.data); setMembers(m.data.data);
    } catch (e) { 
      console.error('Error loading SIPs:', e);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitForm = { ...form, memberId: form.memberId || (members.length > 0 ? members[0]._id : '') };
      if (editId) {
        await api.put(`/sips/${editId}`, submitForm);
        toast.success('SIP updated!');
      } else {
        await api.post('/sips', submitForm);
        toast.success('SIP added!');
      }
      setShowForm(false); setEditId(null);
      setForm({ fundName: '', schemeCode: '', memberId: '', amountPerMonth: '', sipDate: 1, startDate: '', category: 'Equity', status: 'active', totalInvested: '', totalUnits: '', notes: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving SIP'); }
  };

  const handleEdit = (sip) => {
    setForm({
      fundName: sip.fundName, schemeCode: sip.schemeCode || '', memberId: sip.memberId?._id || sip.memberId,
      amountPerMonth: sip.amountPerMonth, sipDate: sip.sipDate, startDate: sip.startDate?.slice(0, 10),
      category: sip.category, status: sip.status, totalInvested: sip.totalInvested || '', totalUnits: sip.totalUnits || '', notes: sip.notes || ''
    });
    setEditId(sip._id); setShowForm(true);
  };

  const handleFundSearch = async (query) => {
    setForm({...form, fundName: query});
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${query}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 15));
    } catch (e) {
      // ignore
    }
  };

  const handleFundSelect = (e) => {
    const val = e.target.value;
    const selected = suggestions.find(s => s.schemeName === val);
    if (selected) {
      setForm({...form, fundName: selected.schemeName, schemeCode: selected.schemeCode});
    } else {
      setForm({...form, fundName: val});
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try { 
      await api.delete(`/sips/${deleteModal.id}`); 
      toast.success('SIP deleted'); 
      setDeleteModal({ show: false, id: null });
      load(); 
    }
    catch (e) { toast.error('Error deleting SIP'); }
  };

  if (loading) return (<><Topbar title="SIP Management" /><div className="page-content"><div className="page-loading"><div className="spinner" /></div></div></>);

  return (
    <>
      <Topbar title="SIP Management" />
      <div className="page-content animate-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h2 style={{ fontSize: 16, fontWeight: 600 }}>All SIPs ({sips.length})</h2></div>
          <button className="btn btn-primary" onClick={() => { if (members.length === 0) { toast.error('Add family members first!'); navigate('/members'); return; } setShowForm(true); setEditId(null); setForm({ fundName: '', schemeCode: '', memberId: members[0]?._id || '', amountPerMonth: '', sipDate: 1, startDate: '', category: 'Equity', status: 'active', totalInvested: '', totalUnits: '', notes: '' }); }}>
            <Plus size={16} /> Add SIP
          </button>
        </div>

        {sips.length > 0 ? (
          <div className="card table-responsive" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr>
                <th>Fund Name</th><th>Member</th><th>Monthly</th><th>Invested</th><th>Current Value</th><th>Returns</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {sips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(sip => {
                  const ret = sip.totalInvested > 0 ? ((sip.currentValue - sip.totalInvested) / sip.totalInvested * 100) : 0;
                  return (
                    <tr key={sip._id} onClick={() => setViewingAsset(sip)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sip.fundName}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sip.category}</span></td>
                      <td>{sip.memberId?.avatar} {sip.memberId?.name || '-'}</td>
                      <td>{formatCurrency(sip.amountPerMonth)}</td>
                      <td>{formatCurrency(sip.totalInvested)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(sip.currentValue)}</td>
                      <td style={{ color: ret >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                      </td>
                      <td><span className={`badge ${getStatusColor(sip.status)}`}>{sip.status}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(sip)}><Edit size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteModal({show: true, id: sip._id})}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {sips.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sips.length)} of {sips.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={currentPage === Math.ceil(sips.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">📈</div><div className="empty-state-title">No SIPs yet</div><div className="empty-state-text">Start by adding your first Systematic Investment Plan</div><button className="btn btn-primary" onClick={() => setShowForm(true)}>Add SIP</button></div></div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editId ? 'Edit SIP' : 'Add New SIP'}</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Fund Name *</label>
                  <input className="form-input" list="mf-suggestions" value={form.fundName} onChange={handleFundSelect} onInput={e => handleFundSearch(e.target.value)} required placeholder="Search for Indian Mutual Funds (e.g. Parag Parikh Flexi)" autoComplete="off" />
                  <datalist id="mf-suggestions">
                    {suggestions.map((s) => <option key={s.schemeCode} value={s.schemeName}>{s.schemeName}</option>)}
                  </datalist>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Family Member *</label><SearchSelect options={members.map(m => ({ value: m._id, label: `${m.avatar} ${m.name}`, searchLabel: m.name }))} value={form.memberId} onChange={val => setForm({...form, memberId: val})} placeholder="Select member..." searchKey="searchLabel" required /></div>
                  <div className="form-group"><label className="form-label">Category</label><SearchSelect options={SIP_CATEGORIES} value={form.category} onChange={val => setForm({...form, category: val})} placeholder="Category" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Monthly Amount (₹) *</label><input className="form-input" type="number" value={form.amountPerMonth} onChange={e => setForm({ ...form, amountPerMonth: e.target.value })} required min="100" placeholder="5000" /></div>
                  <div className="form-group"><label className="form-label">SIP Date (day)</label><input className="form-input" type="number" value={form.sipDate} onChange={e => setForm({ ...form, sipDate: e.target.value })} min="1" max="28" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Total Invested Value (₹) *</label><input className="form-input" type="number" value={form.totalInvested} onChange={e => setForm({ ...form, totalInvested: e.target.value })} required placeholder="50000" /></div>
                  <div className="form-group"><label className="form-label">Total Units</label><input className="form-input" type="number" step="0.001" value={form.totalUnits} onChange={e => setForm({ ...form, totalUnits: e.target.value })} placeholder="150.5" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Status</label><SearchSelect options={[{value:'active',label:'Active'},{value:'paused',label:'Paused'},{value:'completed',label:'Completed'}]} value={form.status} onChange={val => setForm({...form, status: val})} placeholder="Status" /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add'} SIP</button></div>
              </form>
            </div>
          </div>
        )}

        {deleteModal.show && (
          <DeleteConfirmModal 
            title="Delete SIP" 
            message="Are you sure you want to permanently delete this SIP? This action cannot be undone." 
            onConfirm={handleDelete} 
            onCancel={() => setDeleteModal({ show: false, id: null })} 
          />
        )}

        {/* View Details Modal */}
        <AssetDetailsModal asset={viewingAsset} type="sip" onClose={() => setViewingAsset(null)} />
      </div>
    </>
  );
}
