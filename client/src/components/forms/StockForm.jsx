import React, { useState, useEffect } from 'react';
import SearchSelect from '../SearchSelect';
import { EXCHANGES } from '../../utils/helpers';
import api from '../../utils/api';

const StockForm = React.memo(({ initialData, members, saving, onSubmit, onCancel, submitLabel }) => {
  const [form, setForm] = useState({
    symbol: '',
    memberId: '',
    exchange: 'NSE',
    type: 'buy',
    date: '',
    quantity: '',
    pricePerUnit: '',
    brokerage: 0
  });

  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (initialData) {
      setForm({
        symbol: initialData.symbol || '',
        memberId: initialData.memberId || (members.length > 0 ? members[0]._id : ''),
        exchange: initialData.exchange || 'NSE',
        type: initialData.type || 'buy',
        date: initialData.date || '',
        quantity: initialData.quantity || '',
        pricePerUnit: initialData.pricePerUnit || '',
        brokerage: initialData.brokerage !== undefined ? initialData.brokerage : 0
      });
    }
  }, [initialData, members]);

  const fetchSuggestions = async (query) => {
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

  const handleSymbolChange = (e) => {
    const val = e.target.value.toUpperCase();
    const cleanVal = val.replace('.NS', '').replace('.BO', '');
    setForm(prev => ({ ...prev, symbol: cleanVal }));
    fetchSuggestions(cleanVal);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Stock Symbol *</label>
          <input
            className="form-input"
            list="stock-suggestions-shared"
            value={form.symbol}
            onChange={handleSymbolChange}
            required
            placeholder="Search symbol or name..."
            autoComplete="off"
            style={{ textTransform: 'uppercase' }}
          />
          <datalist id="stock-suggestions-shared">
            {suggestions.map((s, i) => (
              <option key={i} value={s.symbol.replace('.NS', '').replace('.BO', '')}>
                {s.shortname} ({s.exchDisp})
              </option>
            ))}
          </datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Exchange</label>
          <SearchSelect
            options={EXCHANGES}
            value={form.exchange}
            onChange={(val) => setForm(prev => ({ ...prev, exchange: val }))}
            placeholder="Exchange"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Family Member *</label>
          <SearchSelect
            options={members.map(m => ({ value: m._id, label: `${m.avatar} ${m.name}`, searchLabel: m.name }))}
            value={form.memberId}
            onChange={(val) => setForm(prev => ({ ...prev, memberId: val }))}
            placeholder="Select member..."
            searchKey="searchLabel"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <SearchSelect
            options={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' }
            ]}
            value={form.type}
            onChange={(val) => setForm(prev => ({ ...prev, type: val }))}
            placeholder="Type"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Quantity *</label>
          <input
            className="form-input"
            type="number"
            value={form.quantity}
            onChange={(e) => setForm(prev => ({ ...prev, quantity: e.target.value }))}
            required
            min="1"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Price per Unit (₹) *</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            value={form.pricePerUnit}
            onChange={(e) => setForm(prev => ({ ...prev, pricePerUnit: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Brokerage (₹)</label>
          <input
            className="form-input"
            type="number"
            value={form.brokerage}
            onChange={(e) => setForm(prev => ({ ...prev, brokerage: e.target.value }))}
          />
        </div>
      </div>

      <div className={onCancel ? "modal-footer" : ""} style={onCancel ? {} : { marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel || 'Save'}
        </button>
      </div>
    </form>
  );
});

export default StockForm;
