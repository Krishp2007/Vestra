import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatDate, EXCHANGES } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({ symbol:'', memberId:'', exchange:'NSE', type:'buy', date:'', quantity:'', pricePerUnit:'', brokerage:0 });
  const [priceLoading, setPriceLoading] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [alertModal, setAlertModal] = useState({ show: false, stock: null, targetPrice: '', stopLossPrice: '', activeTab: 'target' });

  const handleSetAlert = async (e) => {
    e.preventDefault();
    try {
      const updates = { 
        targetPrice: alertModal.targetPrice ? Number(alertModal.targetPrice) : null,
        stopLossPrice: alertModal.stopLossPrice ? Number(alertModal.stopLossPrice) : null
      };
      await api.put(`/stocks/${alertModal.stock._id}`, updates);
      toast.success('Price alerts updated');
      setAlertModal({ show: false, stock: null, targetPrice: '', stopLossPrice: '' });
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
           
           let updates = {};
           if (Math.abs(price - (stk.currentPrice || 0)) > 0.01 || stk.dayChange !== change) {
             updates = { currentPrice: price, dayChange: change, dayChangePercent: changePercent, lastPriceUpdate: new Date() };
           }

           if (stk.targetPrice && price >= stk.targetPrice) {
             await api.post('/alerts', { type: 'price_alert', title: `🎯 Target Hit: ${stk.symbol}`, message: `${stk.symbol} has crossed your target price of ₹${stk.targetPrice}!`, severity: 'info', relatedEntity: { id: stk._id, type: 'stock' }});
             updates.targetPrice = null;
             toast.success(`🎯 ${stk.symbol} Hit Target Price!`, { icon: '🎯' });
           }
           if (stk.stopLossPrice && price <= stk.stopLossPrice) {
             await api.post('/alerts', { type: 'price_alert', title: `🛑 Stop Loss Hit: ${stk.symbol}`, message: `${stk.symbol} has dropped below your stop loss of ₹${stk.stopLossPrice}!`, severity: 'warning', relatedEntity: { id: stk._id, type: 'stock' }});
             updates.stopLossPrice = null;
             toast.error(`🛑 ${stk.symbol} Hit Stop Loss!`);
           }

           if (Object.keys(updates).length > 0) {
             await api.put(`/stocks/${stk._id}`, updates);
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
      setStocks(currentStocks => {
        if (currentStocks.length > 0) refreshPricesBackground(currentStocks);
        return currentStocks;
      });
    }, 30000);
    return () => clearInterval(interval);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedMemberId = form.memberId || (members.length > 0 ? members[0]._id : '');
      await api.post('/stocks', {
        symbol: form.symbol.toUpperCase(), memberId: selectedMemberId, exchange: form.exchange,
        transactions: [{ type: form.type, date: form.date, quantity: Number(form.quantity), pricePerUnit: Number(form.pricePerUnit), brokerage: Number(form.brokerage || 0) }]
      });
      toast.success('Transaction added!');
      setShowForm(false); load();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handleSymbolSearch = async (query) => {
    setForm({...form, symbol: query.toUpperCase()});
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/stocks/search/${query}`);
      if (res.data.success && res.data.quotes) {
        setSuggestions(res.data.quotes);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this stock and all transactions?')) return;
    try { await api.delete(`/stocks/${id}`); toast.success('Deleted'); load(); } catch(e) { toast.error('Error'); }
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
          <div className="card table-responsive" style={{padding:0}}>
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
                    <td onClick={e => e.stopPropagation()}><div style={{display:'flex',gap:4}}><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setAlertModal({show:true, stock:stk, targetPrice:stk.targetPrice||'', stopLossPrice:stk.stopLossPrice||'', activeTab: 'target'})} title="Set Price Alert"><Bell size={14} color={(stk.targetPrice || stk.stopLossPrice) ? 'var(--accent)' : 'currentColor'}/></button><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleDelete(stk._id)}><Trash2 size={14}/></button></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
            
            {/* Pagination Controls */}
            {stocks.length > itemsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, stocks.length)} of {stocks.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={currentPage === Math.ceil(stocks.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">📉</div><div className="empty-state-title">No stocks yet</div><div className="empty-state-text">{members.length === 0 ? 'Add family members first, then come back to add stocks' : 'Add buy/sell transactions to track your stock portfolio'}</div><button className="btn btn-primary" onClick={() => { if (members.length === 0) { toast.error('Add family members first!'); navigate('/members'); return; } setShowForm(true); setForm({ symbol:'', memberId:members[0]._id, exchange:'NSE', type:'buy', date:'', quantity:'', pricePerUnit:'', brokerage:0 }); }}>{members.length === 0 ? 'Add Members' : 'Add Stock'}</button></div></div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={()=>setShowForm(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Add Stock Transaction</h2><button className="modal-close" onClick={()=>setShowForm(false)}><X size={16}/></button></div>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stock Symbol *</label>
                    <input className="form-input" list="stock-suggestions" value={form.symbol} onChange={e=>handleSymbolSearch(e.target.value)} required placeholder="Search symbol or name..." autoComplete="off"/>
                    <datalist id="stock-suggestions">
                      {suggestions.map((s, i) => <option key={i} value={s.symbol.replace('.NS', '').replace('.BO', '')}>{s.shortname} ({s.exchDisp})</option>)}
                    </datalist>
                  </div>
                  <div className="form-group"><label className="form-label">Exchange</label><select className="form-select" value={form.exchange} onChange={e=>setForm({...form,exchange:e.target.value})}>{EXCHANGES.map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                </div>
                <div className="form-row"><div className="form-group"><label className="form-label">Member *</label><select className="form-select" value={form.memberId} onChange={e=>setForm({...form,memberId:e.target.value})} required>{members.map(m=><option key={m._id} value={m._id}>{m.avatar} {m.name}</option>)}</select></div><div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="buy">Buy</option><option value="sell">Sell</option></select></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></div><div className="form-group"><label className="form-label">Quantity *</label><input className="form-input" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} required min="1"/></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Price per Unit (₹) *</label><input className="form-input" type="number" step="0.01" value={form.pricePerUnit} onChange={e=>setForm({...form,pricePerUnit:e.target.value})} required/></div><div className="form-group"><label className="form-label">Brokerage (₹)</label><input className="form-input" type="number" value={form.brokerage} onChange={e=>setForm({...form,brokerage:e.target.value})}/></div></div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add Transaction</button></div>
              </form>
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

        <AssetDetailsModal asset={viewingAsset} type="stock" onClose={() => setViewingAsset(null)} />
      </div>
    </>
  );
}
