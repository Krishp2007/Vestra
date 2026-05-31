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

export const INDIAN_BANKS = [
  // Public Sector Banks
  'State Bank of India (SBI)',
  'Bank of Baroda',
  'Punjab National Bank (PNB)',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'Indian Overseas Bank',
  'UCO Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
  // Private Sector Banks
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'Yes Bank',
  'IDBI Bank',
  'Federal Bank',
  'South Indian Bank',
  'RBL Bank',
  'Bandhan Bank',
  'IDFC First Bank',
  'Karur Vysya Bank',
  'City Union Bank',
  'Tamilnad Mercantile Bank',
  'CSB Bank',
  'DCB Bank',
  'Dhanlaxmi Bank',
  'Jammu & Kashmir Bank',
  'Karnataka Bank',
  'Lakshmi Vilas Bank',
  'Nainital Bank',
  // Small Finance Banks
  'AU Small Finance Bank',
  'Equitas Small Finance Bank',
  'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank',
  'Suryoday Small Finance Bank',
  'Fincare Small Finance Bank',
  'ESAF Small Finance Bank',
  'North East Small Finance Bank',
  'Capital Small Finance Bank',
  'Unity Small Finance Bank',
  // Payment Banks & Others
  'Paytm Payments Bank',
  'Airtel Payments Bank',
  'India Post Payments Bank',
  // NBFCs / Popular FD Providers
  'Bajaj Finance',
  'Mahindra Finance',
  'Shriram Finance',
  'LIC Housing Finance',
  'PNB Housing Finance',
  'HDFC Ltd',
  'Post Office (NSC/KVP)',
];

export const calculateFdMaturityAmount = (principal, interestRate, compoundingOption, years) => {
  const principalVal = parseFloat(principal);
  const rateVal = parseFloat(interestRate);
  const yearsVal = parseFloat(years);
  if (isNaN(principalVal) || isNaN(rateVal) || isNaN(yearsVal) || yearsVal <= 0) return principalVal || 0;

  let n = 4; // Default quarterly compounding
  const comp = (compoundingOption || 'quarterly').toLowerCase();
  if (comp.includes('month')) n = 12;
  else if (comp.includes('half')) n = 2;
  else if (comp.includes('year') || comp.includes('annual')) n = 1;
  
  const effectiveN = comp.includes('maturity') ? (1 / yearsVal) : n;
  const amount = principalVal * Math.pow(1 + (rateVal / 100) / effectiveN, effectiveN * yearsVal);
  return amount;
};

export const calculateCagr = (currentValue, investedValue, diffDays) => {
  const current = parseFloat(currentValue);
  const invested = parseFloat(investedValue);
  const days = parseFloat(diffDays);
  if (isNaN(current) || isNaN(invested) || isNaN(days) || invested <= 0 || days <= 0) return 0;
  return (Math.pow(current / invested, 365.25 / days) - 1) * 100;
};
