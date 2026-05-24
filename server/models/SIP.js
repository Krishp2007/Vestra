const mongoose = require('mongoose');

const sipPaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  nav: Number,
  units: Number,
  status: {
    type: String,
    enum: ['completed', 'missed', 'pending'],
    default: 'pending'
  },
  notes: String
});

const sipSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true
  },
  familyId: {
    type: String,
    required: true
  },
  fundName: {
    type: String,
    required: [true, 'Fund name is required'],
    trim: true
  },
  schemeCode: Number,
  amountPerMonth: {
    type: Number,
    required: [true, 'Monthly amount is required'],
    min: [100, 'Minimum SIP amount is ₹100']
  },
  sipDate: {
    type: Number,
    min: 1,
    max: 28,
    default: 1
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: Date,
  currentValue: {
    type: Number,
    default: 0
  },
  totalInvested: {
    type: Number,
    required: [true, 'Total invested amount is required'],
    default: 0
  },
  totalUnits: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  category: {
    type: String,
    enum: ['Equity', 'Debt', 'Hybrid', 'ELSS', 'Index', 'Liquid', 'Other'],
    default: 'Equity'
  },
  payments: [sipPaymentSchema],
  notes: String
}, {
  timestamps: true
});

// Virtual: returns (gain/loss)
sipSchema.virtual('returns').get(function() {
  if (this.totalInvested === 0) return 0;
  return ((this.currentValue - this.totalInvested) / this.totalInvested) * 100;
});

// Virtual: absolute gain/loss
sipSchema.virtual('absoluteReturns').get(function() {
  return this.currentValue - this.totalInvested;
});

// Removed recalculateTotalInvested hook to allow manual input

sipSchema.set('toJSON', { virtuals: true });
sipSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SIP', sipSchema);
