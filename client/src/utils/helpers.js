export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num) => {
  if (!num) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const formatPercent = (num) => {
  if (!num) return '0%';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

export const formatDateShort = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short'
  });
};

export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'badge-active', paused: 'badge-paused',
    completed: 'badge-completed', matured: 'badge-matured',
    'premature-closed': 'badge-danger', missed: 'badge-danger',
    pending: 'badge-paused'
  };
  return colors[status] || 'badge-active';
};

export const AVATARS = ['👨', '👩', '👦', '👧', '👴', '👵', '🧑', '👨‍💼', '👩‍💼', '🧔', '👱‍♀️', '👶'];
export const RELATIONS = ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
export const SIP_CATEGORIES = ['Equity', 'Debt', 'Hybrid', 'ELSS', 'Index', 'Liquid', 'Other'];
export const COMPOUNDING_OPTIONS = ['monthly', 'quarterly', 'half-yearly', 'yearly'];
export const EXCHANGES = ['NSE', 'BSE'];
