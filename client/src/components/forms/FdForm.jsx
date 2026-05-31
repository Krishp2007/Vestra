import React, { useState, useEffect } from 'react';
import SearchSelect from '../SearchSelect';
import { COMPOUNDING_OPTIONS, INDIAN_BANKS } from '../../utils/helpers';

const FdForm = React.memo(({ initialData, members, saving, onSubmit, onCancel, submitLabel }) => {
  const [form, setForm] = useState({
    bankName: '',
    memberId: '',
    principalAmount: '',
    interestRate: '',
    compounding: 'quarterly',
    startDate: '',
    durationDays: '',
    maturityDate: '',
    isAutoRenew: false,
    nominee: ''
  });

  useEffect(() => {
    if (initialData) {
      // Calculate duration days if missing but dates exist
      let days = initialData.durationDays || '';
      if (!days && initialData.startDate && initialData.maturityDate) {
        const s = new Date(initialData.startDate);
        const m = new Date(initialData.maturityDate);
        days = Math.round((m - s) / (1000 * 60 * 60 * 24)).toString();
      }

      setForm({
        bankName: initialData.bankName || '',
        memberId: initialData.memberId || (members.length > 0 ? members[0]._id : ''),
        principalAmount: initialData.principalAmount || '',
        interestRate: initialData.interestRate || '',
        compounding: initialData.compounding || 'quarterly',
        startDate: initialData.startDate || '',
        durationDays: days,
        maturityDate: initialData.maturityDate || '',
        isAutoRenew: initialData.isAutoRenew || false,
        nominee: initialData.nominee || ''
      });
    }
  }, [initialData, members]);

  // Dynamic Maturity Date Auto-calculation
  useEffect(() => {
    if (form.startDate && form.durationDays) {
      const start = new Date(form.startDate);
      const days = parseInt(form.durationDays, 10);
      if (!isNaN(days) && days > 0) {
        const maturity = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        const yyyy = maturity.getFullYear();
        const mm = String(maturity.getMonth() + 1).padStart(2, '0');
        const dd = String(maturity.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        if (formattedDate !== form.maturityDate) {
          setForm(prev => ({ ...prev, maturityDate: formattedDate }));
        }
      }
    }
  }, [form.startDate, form.durationDays]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Bank Name *</label>
          <SearchSelect
            options={INDIAN_BANKS}
            value={form.bankName}
            onChange={(val) => setForm(prev => ({ ...prev, bankName: val }))}
            placeholder="Search bank..."
            required
          />
        </div>
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
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Principal (₹) *</label>
          <input
            className="form-input"
            type="number"
            value={form.principalAmount}
            onChange={(e) => setForm(prev => ({ ...prev, principalAmount: e.target.value }))}
            required
            min="1000"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (%) *</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            value={form.interestRate}
            onChange={(e) => setForm(prev => ({ ...prev, interestRate: e.target.value }))}
            required
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
          <label className="form-label">Duration (Days) *</label>
          <input
            className="form-input"
            type="number"
            placeholder="e.g. 444"
            value={form.durationDays}
            onChange={(e) => setForm(prev => ({ ...prev, durationDays: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Compounding</label>
          <SearchSelect
            options={COMPOUNDING_OPTIONS}
            value={form.compounding}
            onChange={(val) => setForm(prev => ({ ...prev, compounding: val }))}
            placeholder="Compounding"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nominee</label>
          <input
            className="form-input"
            value={form.nominee}
            onChange={(e) => setForm(prev => ({ ...prev, nominee: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={form.isAutoRenew}
          onChange={(e) => setForm(prev => ({ ...prev, isAutoRenew: e.target.checked }))}
        />
        <label className="form-label" style={{ margin: 0 }}>
          Auto-renew on maturity
        </label>
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

export default FdForm;
