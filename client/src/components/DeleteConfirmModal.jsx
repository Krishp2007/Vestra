import { X, AlertTriangle } from 'lucide-react';

export default function DeleteConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: '50%' }}>
            <AlertTriangle size={32} color="var(--danger)" />
          </div>
        </div>
        <h2 className="modal-title" style={{ justifyContent: 'center', marginBottom: 10 }}>{title || 'Are you sure?'}</h2>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 25, fontSize: 14 }}>
          {message || 'This action cannot be undone. This will permanently delete this record.'}
        </div>
        <div className="modal-buttons">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete Permanently</button>
        </div>
      </div>
    </div>
  );
}
