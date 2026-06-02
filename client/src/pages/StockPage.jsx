import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Bell } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import StockForm from '../components/forms/StockForm';
import Pagination from '../components/shared/Pagination';
import EmptyState from '../components/shared/EmptyState';

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [form, setForm] = useState({ symbol:'', memberId:'', exchange:'NSE', type:'buy', date:'', quantity:'', pricePerUnit:'', brokerage:0 });
  const [priceLoading, setPriceLoading] = useState({});
  const [alertModal, setAlertModal] = useState({ show: false, stock: null, targetPrice: '', stopLossPrice: '', activeTab: 'target' });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  const handleSetAlert = async (e) => {
    e.preventDefault();
    const tp = alertModal.targetPrice ? Number(alertModal.targetPrice) : null;
    const sl = alertModal.stopLossPrice ? Number(alertModal.stopLossPrice) : null;
    const cmp = alertModal.stock.currentPrice;

    // Check if user is attempting to save an empty alert where none existed
    if (alertModal.activeTab === 'target' && !alertModal.targetPrice) {
      if (!alertModal.stock.targetPrice) {
        toast.error('Please enter a Target Price!');
        return;
      }
    }
    if (alertModal.activeTab === 'stop' && !alertModal.stopLossPrice) {
      if (!alertModal.stock.stopLossPrice) {
        toast.error('Please enter a Stop Loss Price!');
        return;
      }
    }

    // Standard alerts validations
    if (alertModal.activeTab === 'target' && tp && cmp && tp <= cmp) {
      toast.error(`Target Price must be greater than Current Price (₹${cmp})`);
      return;
    }
    if (alertModal.activeTab === 'stop' && sl && cmp && sl >= cmp) {
      toast.error(`Stop Loss must be less than Current Price (₹${cmp})`);
      return;
    }

    try {
      const updates = { 
        targetPrice: alertModal.activeTab === 'target' ? tp : (alertModal.stock.targetPrice || null),
        stopLossPrice: alertModal.activeTab === 'stop' ? sl : (alertModal.stock.stopLossPrice || null)
      };
      await api.put(`/stocks/${alertModal.stock._id}`, updates);
      
      const wasCleared = (alertModal.activeTab === 'target' && !tp) || (alertModal.activeTab === 'stop' && !sl);
      toast.success(wasCleared ? 'Price alert cleared successfully' : 'Price alerts updated');
      
      setAlertModal({ show: false, stock: null, targetPrice: '', stopLossPrice: '', activeTab: 'target' });
      load();
    } catch(err) {
      toast.error('Failed to set alerts');
    }
  };

  const refreshPricesBackground = async (stockList) => {
    if (!stockList || stockList.length === 0) return;
    let updated = false;
    await Promise.all(stockList.map(async (stk) => {
       try {
         const res = await api.get(`/stocks/price/${stk.symbol}`);
         if (res.data.success && res.data.price) {
           const price = res.data.price;
           const change = res.data.change || 0;
           const changePercent = res.data.changePercent || 0;
           
           if (Math.abs(price - (stk.currentPrice || 0)) > 0.01 || stk.dayChange !== change) {
             await api.put(`/stocks/${stk._id}`, { currentPrice: price, dayChange: change, dayChangePercent: changePercent, lastPriceUpdate: new Date() });
             updated = true;
           }
         }
       } catch(e) {}
    }));
    if (updated) {
       const refreshed = await api.get('/stocks');
       setStocks(refreshed.data.data);
    }
  };

  useEffect(() => {
    load();
    // Real-time polling every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setStocks(currentStocks => {
          if (currentStocks.length > 0) refreshPricesBackground(currentStocks);
          return currentStocks;
        });
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const load = async () => {
    try {
      const [s, m] = await Promise.all([api.get('/stocks'), api.get('/members')]);
      setStocks(s.data.data); 
      setMembers(m.data.data);
      refreshPricesBackground(s.data.data);
    } catch(e) { toast.error('Error loading stocks'); }
    finally { setLoading(false); }
  };

  const handleStockSubmit = async (formData) => {
    try {
      const selectedMemberId = formData.memberId || (members.length > 0 ? members[0]._id : '');
      const sym = formData.symbol.toUpperCase();
      
      if (formData.type === 'sell') {
        const existing = stocks.find(s => s.symbol === sym && s.memberId?._id === selectedMemberId);
        const holding = existing ? (existing.holdingQuantity || 0) : 0;
        if (Number(formData.quantity) > holding) {
          toast.error(`You only hold ${holding} shares of ${sym}! You cannot sell ${formData.quantity}.`);
          return;
        }
      }

      await api.post('/stocks', {
        symbol: sym, memberId: selectedMemberId, exchange: formData.exchange,
        transactions: [{ type: formData.type, date: formData.date, quantity: Number(formData.quantity), pricePerUnit: Number(formData.pricePerUnit), brokerage: Number(formData.brokerage || 0) }]
      });
      toast.success('Transaction added!');
      setShowForm(false); load();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try { 
      await api.delete(`/stocks/${deleteModal.id}`); 
      toast.success('Stock deleted successfully'); 
      setDeleteModal({ show: false, id: null });
      load(); 
    } catch(e) { 
      toast.error('Error deleting stock'); 
    }
  };

  if (loading) return (<><Topbar title="Stocks"/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);

  return (
    <><Topbar title="Stock Portfolio"/>
      <div className="page-content animate-fade">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:16,fontWeight:600}}>Holdings ({stocks.length})</h2>
          <button className="btn btn-primary" onClick={()=>{setShowForm(true);setForm({symbol:'',memberId:members[0]?._id||'',exchange:'NSE',type:'buy',date:'',quantity:'',pricePerUnit:'',brokerage:0});}}><Plus size={16}/> Add Transaction</button>
        </div>

        {stocks.length > 0 ? (
          <>
            {/* Desktop Table Layout */}
          <div className="card table-responsive desktop-table-container" style={{ padding: 0 }}>
            <table className="data-table"><thead><tr><th>Symbol</th><th>Member</th><th>Qty</th><th>Avg Buy</th><th>CMP</th><th>Day's Change</th><th>P&L</th><th>Actions</th></tr></thead>
              <tbody>{stocks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(stk => {
                const holding = stk.holdingQuantity || 0;
                const pl = stk.unrealizedPL || 0;
                const plPct = stk.unrealizedPLPercent || 0;
                const isUp = pl >= 0;
                const dayChange = stk.dayChange || 0;
                const dayPct = stk.dayChangePercent || 0;
                const totalDayChange = dayChange * holding;
                const isDayUp = totalDayChange >= 0;
                return (
                  <tr key={stk._id} onClick={() => setViewingAsset(stk)} style={{ cursor: 'pointer' }} className="hover-row">
                    <td style={{fontWeight:700,color:'var(--text-primary)'}}>{stk.symbol}<br/><span style={{fontSize:11,color:'var(--text-muted)'}}>{stk.exchange}</span></td>
                    <td>{stk.memberId?.avatar} {stk.memberId?.name||'-'}</td>
                    <td>{holding}</td>
                    <td>{formatCurrency(Math.round(stk.avgBuyPrice||0))}</td>
                    <td style={{fontWeight:600}}>{stk.currentPrice ? formatCurrency(stk.currentPrice) : <span style={{color:'var(--text-muted)'}}>--</span>}</td>
                    <td style={{color:isDayUp?'var(--success)':'var(--danger)',fontWeight:600}}>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <span style={{fontSize:13}}>{isDayUp?'+':''}{formatCurrency(Math.abs(Math.round(totalDayChange)))}</span>
                        <span style={{fontSize:11}}>{isDayUp?'+':''}{dayPct.toFixed(2)}%</span>
                      </div>
                    </td>
                    <td style={{color:isUp?'var(--success)':'var(--danger)',fontWeight:600}}>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <span style={{fontSize:13}}>{isUp?'+':''}{formatCurrency(Math.abs(Math.round(pl)))}</span>
                        <span style={{fontSize:11}}>{isUp?'+':''}{plPct.toFixed(2)}%</span>
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}><div style={{display:'flex',gap:4}}><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setAlertModal({show:true, stock:stk, targetPrice:stk.targetPrice||'', stopLossPrice:stk.stopLossPrice||'', activeTab: 'target'})} title="Set Price Alert"><Bell size={14} color={(stk.targetPrice || stk.stopLossPrice) ? 'var(--accent)' : 'currentColor'}/></button><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setDeleteModal({show:true, id:stk._id})}><Trash2 size={14}/></button></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>

          {/* Mobile Cards Layout */}
          <div className="mobile-asset-cards">
            {stocks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(stk => {
              const holding = stk.holdingQuantity || 0;
              const pl = stk.unrealizedPL || 0;
              const plPct = stk.unrealizedPLPercent || 0;
              const isUp = pl >= 0;
              const dayChange = stk.dayChange || 0;
              const dayPct = stk.dayChangePercent || 0;
              const totalDayChange = dayChange * holding;
              const isDayUp = totalDayChange >= 0;
              return (
                <div key={stk._id} className="mobile-asset-card" onClick={() => setViewingAsset(stk)}>
                  <div className="mobile-asset-card-header">
                    <div>
                      <h4 className="mobile-asset-card-title">{stk.symbol}</h4>
                      <span className="mobile-asset-card-subtitle">{stk.exchange}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setAlertModal({show:true, stock:stk, targetPrice:stk.targetPrice||'', stopLossPrice:stk.stopLossPrice||'', activeTab: 'target'})} title="Set Price Alert"><Bell size={14} color={(stk.targetPrice || stk.stopLossPrice) ? 'var(--accent)' : 'currentColor'}/></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setDeleteModal({show:true, id:stk._id})}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div className="mobile-asset-card-body">
                    <div className="mobile-asset-card-field">
                      <span className="mobile-asset-card-label">Member</span>
                      <span className="mobile-asset-card-value">{stk.memberId?.avatar} {stk.memberId?.name||'-'}</span>
                    </div>
                    <div className="mobile-asset-card-field">
                      <span className="mobile-asset-card-label">Quantity</span>
                      <span className="mobile-asset-card-value">{holding}</span>
                    </div>
                    <div className="mobile-asset-card-field">
                      <span className="mobile-asset-card-label">Avg Buy</span>
                      <span className="mobile-asset-card-value">{formatCurrency(Math.round(stk.avgBuyPrice||0))}</span>
                    </div>
                    <div className="mobile-asset-card-field">
                      <span className="mobile-asset-card-label">CMP</span>
                      <span className="mobile-asset-card-value" style={{ fontWeight: 700 }}>{stk.currentPrice ? formatCurrency(stk.currentPrice) : '--'}</span>
                    </div>
                    <div className="mobile-asset-card-field">
                      <span className="mobile-asset-card-label">Day Change</span>
                      <span className="mobile-asset-card-value" style={{ color: isDayUp ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {isDayUp ? '+' : ''}{dayPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mobile-asset-card-field">
                      <span className="mobile-asset-card-label">Total P&L</span>
                      <span className="mobile-asset-card-value" style={{ color: isUp ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {isUp ? '+' : ''}{plPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="mobile-asset-card-footer">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap to view details</span>
                  </div>
                </div>
              );
            })}
          </div>

            <Pagination
              currentPage={currentPage}
              totalItems={stocks.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>) : (
          <EmptyState
            icon="📉"
            title="No stocks yet"
            text={members.length === 0 ? 'Add family members first, then come back to add stocks' : 'Add buy/sell transactions to track your stock portfolio'}
            buttonText={members.length === 0 ? 'Add Members' : 'Add Stock'}
            onButtonClick={() => {
              if (members.length === 0) {
                toast.error('Add family members first!');
                navigate('/members');
                return;
              }
              setShowForm(true);
              setForm({ symbol:'', memberId:members[0]._id, exchange:'NSE', type:'buy', date:'', quantity:'', pricePerUnit:'', brokerage:0 });
            }}
          />
        )}

        {showForm && (
          <div className="modal-overlay" onClick={()=>setShowForm(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Add Stock Transaction</h2><button className="modal-close" onClick={()=>setShowForm(false)}><X size={16}/></button></div>
              <StockForm
                initialData={form}
                members={members}
                saving={false}
                onSubmit={handleStockSubmit}
                onCancel={()=>setShowForm(false)}
                submitLabel="Add Transaction"
              />
            </div>
          </div>
        )}

        {alertModal.show && (
          <div className="modal-overlay" onClick={()=>setAlertModal({...alertModal, show:false})}>
            <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth: 400}}>
              <div className="modal-header"><h2 className="modal-title">Set Price Alert</h2><button className="modal-close" onClick={()=>setAlertModal({...alertModal, show:false})}><X size={16}/></button></div>
              <form onSubmit={handleSetAlert}>
                <div style={{marginBottom: 15, fontSize: 13, color: 'var(--text-muted)'}}>We will notify you when <strong>{alertModal.stock.symbol}</strong> crosses your limit.</div>
                
                <div style={{display: 'flex', gap: 10, marginBottom: 20, background: 'var(--bg-secondary)', padding: 4, borderRadius: 8}}>
                   <button type="button" onClick={()=>setAlertModal({...alertModal, activeTab: 'target'})} style={{flex: 1, padding: '8px 0', border: 'none', background: alertModal.activeTab === 'target' ? '#fff' : 'transparent', borderRadius: 6, fontWeight: 600, color: alertModal.activeTab === 'target' ? 'var(--success)' : 'var(--text-secondary)', cursor: 'pointer', boxShadow: alertModal.activeTab === 'target' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s'}}>🎯 Target Price</button>
                   <button type="button" onClick={()=>setAlertModal({...alertModal, activeTab: 'stop'})} style={{flex: 1, padding: '8px 0', border: 'none', background: alertModal.activeTab === 'stop' ? '#fff' : 'transparent', borderRadius: 6, fontWeight: 600, color: alertModal.activeTab === 'stop' ? 'var(--danger)' : 'var(--text-secondary)', cursor: 'pointer', boxShadow: alertModal.activeTab === 'stop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s'}}>🛑 Stop Loss</button>
                </div>

                {alertModal.activeTab === 'target' ? (
                  <div className="form-group"><label className="form-label">Set Target Price (₹)</label><input className="form-input" type="number" step="0.01" value={alertModal.targetPrice} onChange={e=>setAlertModal({...alertModal, targetPrice: e.target.value})} placeholder="Alert when price goes ABOVE..." /></div>
                ) : (
                  <div className="form-group"><label className="form-label">Set Stop Loss Price (₹)</label><input className="form-input" type="number" step="0.01" value={alertModal.stopLossPrice} onChange={e=>setAlertModal({...alertModal, stopLossPrice: e.target.value})} placeholder="Alert when price drops BELOW..." /></div>
                )}
                
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setAlertModal({...alertModal, show:false})}>Cancel</button><button type="submit" className="btn btn-primary">Save Alert</button></div>
              </form>
            </div>
          </div>
        )}

        {deleteModal.show && (
          <DeleteConfirmModal 
            title="Delete Stock" 
            message="Are you sure you want to delete this stock and all its transaction history?" 
            onConfirm={handleDelete} 
            onCancel={() => setDeleteModal({ show: false, id: null })} 
          />
        )}

        <AssetDetailsModal asset={viewingAsset} type="stock" onClose={() => setViewingAsset(null)} />
      </div>
    </>
  );
}
