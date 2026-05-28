const mongoose = require('mongoose');

const fdSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true
  },
  familyId: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  principalAmount: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: [1000, 'Minimum FD amount is ₹1,000']
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: 0,
    max: 25
  },
  compounding: {
    type: String,
    enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    default: 'quarterly'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  maturityDate: {
    type: Date,
    required: [true, 'Maturity date is required']
  },
  maturityAmount: Number,
  status: {
    type: String,
    enum: ['active', 'matured', 'premature-closed'],
    default: 'active'
  },
  isAutoRenew: {
    type: Boolean,
    default: false
  },
  nominee: String,
}, {
  timestamps: true
});

// Highly optimized database indexes for fast background sweeps and UI searches
fdSchema.index({ status: 1, maturityDate: 1 });
fdSchema.index({ familyId: 1 });

// Pre-save: calculate maturity amount if not provided
fdSchema.pre('save', function() {
  if (!this.maturityAmount && this.principalAmount && this.interestRate) {
    const compoundingMap = {
      'monthly': 12,
      'quarterly': 4,
      'half-yearly': 2,
      'yearly': 1
    };
    const n = compoundingMap[this.compounding] || 4;
    const r = this.interestRate / 100;
    const startDate = new Date(this.startDate);
    const maturityDate = new Date(this.maturityDate);
    const t = (maturityDate - startDate) / (365.25 * 24 * 60 * 60 * 1000); // years

    // Compound interest: A = P * (1 + r/n)^(n*t)
    this.maturityAmount = Math.round(this.principalAmount * Math.pow(1 + r / n, n * t));
  }
});

// Virtual: days until maturity
fdSchema.virtual('daysToMaturity').get(function() {
  const now = new Date();
  const maturity = new Date(this.maturityDate);
  const diff = maturity - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual: interest earned
fdSchema.virtual('interestEarned').get(function() {
  return (this.maturityAmount || 0) - this.principalAmount;
});

fdSchema.set('toJSON', { virtuals: true });
fdSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FD', fdSchema);
