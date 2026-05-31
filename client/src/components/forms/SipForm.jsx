import React, { useState, useEffect } from 'react';
import SearchSelect from '../SearchSelect';
import { SIP_CATEGORIES } from '../../utils/helpers';

const SipForm = React.memo(({ initialData, members, saving, onSubmit, onCancel, submitLabel }) => {
  const [form, setForm] = useState({
    fundName: '',
    schemeCode: '',
    memberId: '',
    amountPerMonth: '',
    sipDate: 1,
    startDate: '',
    category: 'Equity',
    status: 'active',
    totalInvested: '',
    totalUnits: '',
    notes: ''
  });

  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (initialData) {
      setForm({
        fundName: initialData.fundName || '',
        schemeCode: initialData.schemeCode || '',
        memberId: initialData.memberId || (members.length > 0 ? members[0]._id : ''),
        amountPerMonth: initialData.amountPerMonth || '',
        sipDate: initialData.sipDate || 1,
        startDate: initialData.startDate || '',
        category: initialData.category || 'Equity',
        status: initialData.status || 'active',
        totalInvested: initialData.totalInvested || '',
        totalUnits: initialData.totalUnits || '',
        notes: initialData.notes || ''
      });
    }
  }, [initialData, members]);

  const handleFundSearch = async (query) => {
    setForm(prev => ({ ...prev, fundName: query }));
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${query}`);
      let data = await res.json();

      // Sort to prioritize Direct Growth plans
      data.sort((a, b) => {
        const aScore = (a.schemeName.toLowerCase().includes('direct') ? 2 : 0) + (a.schemeName.toLowerCase().includes('growth') ? 1 : 0);
        const bScore = (b.schemeName.toLowerCase().includes('direct') ? 2 : 0) + (b.schemeName.toLowerCase().includes('growth') ? 1 : 0);
        return bScore - aScore;
      });

      setSuggestions(data.slice(0, 30));
    } catch (e) {
      // ignore
    }
  };

  const handleFundSelect = (e) => {
    const val = e.target.value;
    const selected = suggestions.find(s => s.schemeName === val);
    if (selected) {
      setForm(prev => ({ ...prev, fundName: selected.schemeName, schemeCode: selected.schemeCode }));
    } else {
      setForm(prev => ({ ...prev, fundName: val }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade">
      <div className="form-group">
        <label className="form-label">Fund Name *</label>
        <input
          className="form-input"
          list="mf-suggestions-shared"
          value={form.fundName}
          onChange={handleFundSelect}
          onInput={(e) => handleFundSearch(e.target.value)}
          required
          placeholder="Search for Indian Mutual Funds (e.g. Parag Parikh Flexi)"
          autoComplete="off"
        />
        <datalist id="mf-suggestions-shared">
          {suggestions.map((s) => (
            <option key={s.schemeCode} value={s.schemeName}>
              {s.schemeName}
            </option>
          ))}
        </datalist>
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
          <label className="form-label">Category</label>
          <SearchSelect
            options={SIP_CATEGORIES}
            value={form.category}
            onChange={(val) => setForm(prev => ({ ...prev, category: val }))}
            placeholder="Category"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Monthly Amount (₹) *</label>
          <input
            className="form-input"
            type="number"
            value={form.amountPerMonth}
            onChange={(e) => setForm(prev => ({ ...prev, amountPerMonth: e.target.value }))}
            required
            min="100"
            placeholder="5000"
          />
        </div>
        <div className="form-group">
          <label className="form-label">SIP Date (day)</label>
          <input
            className="form-input"
            type="number"
            value={form.sipDate}
            onChange={(e) => setForm(prev => ({ ...prev, sipDate: e.target.value }))}
            min="1"
            max="28"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Total Invested Value (₹) *</label>
          <input
            className="form-input"
            type="number"
            value={form.totalInvested}
            onChange={(e) => setForm(prev => ({ ...prev, totalInvested: e.target.value }))}
            required
            placeholder="50000"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Total Units</label>
          <input
            className="form-input"
            type="number"
            step="0.001"
            value={form.totalUnits}
            onChange={(e) => setForm(prev => ({ ...prev, totalUnits: e.target.value }))}
            placeholder="150.5"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date *</label>
          <input
            className="form-input"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <SearchSelect
            options={[
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'completed', label: 'Completed' }
            ]}
            value={form.status}
            onChange={(val) => setForm(prev => ({ ...prev, status: val }))}
            placeholder="Status"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <input
          className="form-input"
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional notes"
        />
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

export default SipForm;
