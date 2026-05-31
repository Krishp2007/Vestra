import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems <= itemsPerPage) return null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', marginTop: '16px', background: 'var(--bg-card)', gap: '16px' }}>
      <button 
        className="btn btn-secondary btn-sm btn-icon" 
        disabled={currentPage === 1} 
        onClick={() => onPageChange(currentPage - 1)} 
        style={{ padding: '6px' }}
      >
        <ChevronLeft size={16} />
      </button>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center', flex: 1 }}>
        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
      </span>
      <button 
        className="btn btn-secondary btn-sm btn-icon" 
        disabled={currentPage === totalPages} 
        onClick={() => onPageChange(currentPage + 1)} 
        style={{ padding: '6px' }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
