import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { AVATARS, RELATIONS } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, Edit, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [form, setForm] = useState({ name: '', relation: 'Self', avatar: '👤' });
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const { data } = await api.get('/members'); setMembers(data.data); } catch(e) { toast.error('Error'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/members/${editId}`, form); toast.success('Updated!'); }
      else { await api.post('/members', form); toast.success('Member added!'); }
      setShowForm(false); setEditId(null); load();
    } catch(e) { toast.error('Error'); }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try { 
      await api.delete(`/members/${deleteModal.id}`); 
      toast.success('Member removed'); 
      setDeleteModal({ show: false, id: null });
      load(); 
    } catch(e) { toast.error('Error'); }
  };

  if (loading) return (<><Topbar title="Family Members"/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);

  return (
    <><Topbar title="Family Members"/>
      <div className="page-content animate-fade">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:16,fontWeight:600}}>Family Members ({members.length})</h2>
          <button className="btn btn-primary" onClick={()=>{setShowForm(true);setEditId(null);setForm({name:'',relation:'Self',avatar:'👤'});}}><Plus size={16}/> Add Member</button>
        </div>

        {members.length > 0 ? (
          <div className="members-grid">
            {members.map(m => (
              <div key={m._id} className="member-card" style={{position:'relative', cursor:'pointer'}} onClick={() => navigate(`/member/${m._id}`)}>
                <div style={{position:'absolute',top:12,right:12,display:'flex',gap:4}}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={(e)=>{e.stopPropagation();setForm({name:m.name,relation:m.relation,avatar:m.avatar});setEditId(m._id);setShowForm(true);}}><Edit size={14}/></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={(e)=>{e.stopPropagation();setDeleteModal({show:true, id:m._id});}}><Trash2 size={14}/></button>
                </div>
                <div className="member-avatar">{m.avatar}</div>
                <div className="member-name">{m.name}</div>
                <div className="member-relation">{m.relation}</div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>View Dashboard <ChevronRight size={12}/></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">👨‍👩‍👧‍👦</div><div className="empty-state-title">No family members</div><div className="empty-state-text">Add family members to track their investments</div><button className="btn btn-primary" onClick={()=>setShowForm(true)}>Add First Member</button></div></div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={()=>setShowForm(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">{editId?'Edit':'Add'} Member</h2><button className="modal-close" onClick={()=>setShowForm(false)}><X size={16}/></button></div>
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Full name"/></div>
                <div className="form-group"><label className="form-label">Relation</label><select className="form-select" value={form.relation} onChange={e=>setForm({...form,relation:e.target.value})}>{RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Avatar</label><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{AVATARS.map(a=>(
                  <button type="button" key={a} onClick={()=>setForm({...form,avatar:a})} style={{fontSize:28,padding:8,borderRadius:8,border:form.avatar===a?'2px solid var(--accent)':'2px solid transparent',background:form.avatar===a?'var(--accent-glow)':'var(--bg-card)',cursor:'pointer'}}>{a}</button>
                ))}</div></div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editId?'Update':'Add'}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>

      {deleteModal.show && (
        <DeleteConfirmModal 
          title="Remove Family Member" 
          message="Are you sure you want to remove this family member? This will NOT delete their existing investments, but they will no longer appear in the members list." 
          onConfirm={handleDelete} 
          onCancel={() => setDeleteModal({ show: false, id: null })} 
        />
      )}
    </>
  );
}
