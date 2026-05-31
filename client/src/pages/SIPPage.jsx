import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import SipForm from '../components/forms/SipForm';
import Pagination from '../components/shared/Pagination';
import EmptyState from '../components/shared/EmptyState';

export default function SIPPage() {
  const [sips, setSips] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [viewingAsset, setViewingAsset] = useState(null);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [form, setForm] = useState({ fundName: '', schemeCode: '', memberId: '', amountPerMonth: '', sipDate: 1, startDate: '', category: 'Equity', status: 'active', totalInvested: '', totalUnits: '', notes: '' });
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

  const handleSipSubmit = async (formData) => {
    try {
      const submitForm = { ...formData, memberId: formData.memberId || (members.length > 0 ? members[0]._id : '') };
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
          <>
            {/* Desktop Table Layout */}
            <div className="card table-responsive desktop-table-container" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr>
                  <th>Fund Name</th><th>Member</th><th>Invested</th><th>Current Value</th><th>Returns</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {sips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(sip => {
                    const ret = sip.totalInvested > 0 ? ((sip.currentValue - sip.totalInvested) / sip.totalInvested * 100) : 0;
                    return (
                      <tr key={sip._id} onClick={() => setViewingAsset(sip)} style={{ cursor: 'pointer' }} className="hover-row">
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sip.fundName}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sip.category}</span></td>
                        <td>{sip.memberId?.avatar} {sip.memberId?.name || '-'}</td>
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
            </div>

            {/* Mobile Cards Layout */}
            <div className="mobile-asset-cards">
              {sips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(sip => {
                const ret = sip.totalInvested > 0 ? ((sip.currentValue - sip.totalInvested) / sip.totalInvested * 100) : 0;
                return (
                  <div key={sip._id} className="mobile-asset-card" onClick={() => setViewingAsset(sip)}>
                    <div className="mobile-asset-card-header">
                      <div>
                        <h4 className="mobile-asset-card-title">{sip.fundName}</h4>
                        <span className="mobile-asset-card-subtitle">{sip.category}</span>
                      </div>
                      <span className={`badge ${getStatusColor(sip.status)}`}>{sip.status}</span>
                    </div>
                    <div className="mobile-asset-card-body">
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Member</span>
                        <span className="mobile-asset-card-value">{sip.memberId?.avatar} {sip.memberId?.name || '-'}</span>
                      </div>
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Invested</span>
                        <span className="mobile-asset-card-value">{formatCurrency(sip.totalInvested)}</span>
                      </div>
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Current Value</span>
                        <span className="mobile-asset-card-value" style={{ fontWeight: 700 }}>{formatCurrency(sip.currentValue)}</span>
                      </div>
                      <div className="mobile-asset-card-field">
                        <span className="mobile-asset-card-label">Returns</span>
                        <span className="mobile-asset-card-value" style={{ color: ret >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                          {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="mobile-asset-card-footer">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap to view details</span>
                      <div className="mobile-asset-card-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(sip)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteModal({show: true, id: sip._id})}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={sips.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <EmptyState
            icon="📈"
            title="No SIPs yet"
            text="Start by adding your first Systematic Investment Plan"
            buttonText="Add SIP"
            onButtonClick={() => setShowForm(true)}
          />
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editId ? 'Edit SIP' : 'Add New SIP'}</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}><X size={16} /></button>
              </div>
              <SipForm
                initialData={form}
                members={members}
                saving={false}
                onSubmit={handleSipSubmit}
                onCancel={() => setShowForm(false)}
                submitLabel={editId ? 'Update SIP' : 'Add SIP'}
              />
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
