import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export default function SearchSelect({ options, value, onChange, placeholder, renderOption, searchKey, required }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(opt => {
    if (!search) return true;
    const label = searchKey ? (typeof opt === 'string' ? opt : opt[searchKey]) : (typeof opt === 'string' ? opt : opt.label || '');
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayLabel = () => {
    if (!value) return '';
    const found = options.find(opt => {
      if (typeof opt === 'string') return opt === value;
      return opt.value === value;
    });
    if (!found) return value;
    if (renderOption) return renderOption(found);
    return typeof found === 'string' ? found : found.label || '';
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 8,
          background: '#1e293b', border: '1px solid var(--border-color)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: 14, minHeight: 42,
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {getDisplayLabel() || placeholder || 'Select...'}
        </span>
        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {required && <input tabIndex={-1} autoComplete="off" style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }} value={value || ''} required onChange={() => {}} />}

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#1e293b', border: '1px solid var(--border-color)',
          borderRadius: 10, zIndex: 1000,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          maxHeight: 280,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Search bar — only for large lists */}
          {options.length > 5 && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 13, width: '100%',
                }}
              />
              {search && <X size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
            </div>
          )}

          {/* Options list */}
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            {filtered.length > 0 ? filtered.map((opt, i) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const isSelected = optValue === value;
              return (
                <div
                  key={i}
                  onClick={() => { onChange(optValue); setIsOpen(false); setSearch(''); }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {renderOption ? renderOption(opt) : (typeof opt === 'string' ? opt : opt.label)}
                </div>
              );
            }) : (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
