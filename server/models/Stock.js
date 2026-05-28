const mongoose = require('mongoose');

// Helper to automatically round decimal numbers to exactly 2 decimal places before saving to MongoDB
const roundToTwo = (val) => {
  if (typeof val !== 'number') return val;
  return Math.round(val * 100) / 100;
};

const stockTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0.01,
    set: roundToTwo
  },
  brokerage: {
    type: Number,
    default: 0,
    set: roundToTwo
  }
});

const stockSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true
  },
  familyId: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: [true, 'Stock symbol is required'],
    uppercase: true,
    trim: true
  },
  exchange: {
    type: String,
    enum: ['NSE', 'BSE'],
    default: 'NSE'
  },
  currentPrice: {
    type: Number,
    default: 0,
    set: roundToTwo
  },
  dayChange: {
    type: Number,
    default: 0,
    set: roundToTwo
  },
  dayChangePercent: {
    type: Number,
    default: 0,
    set: roundToTwo
  },
  targetPrice: {
    type: Number,
    set: roundToTwo
  },
  stopLossPrice: {
    type: Number,
    set: roundToTwo
  },
  lastPriceUpdate: Date,
  transactions: [stockTransactionSchema]
}, {
  timestamps: true
});

// Virtual: current holdings (buy qty - sell qty)
stockSchema.virtual('holdingQuantity').get(function() {
  return this.transactions.reduce((total, txn) => {
    return txn.type === 'buy' ? total + txn.quantity : total - txn.quantity;
  }, 0);
});

// Virtual: total invested (sum of buys)
stockSchema.virtual('totalInvested').get(function() {
  return this.transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + (t.quantity * t.pricePerUnit) + (t.brokerage || 0), 0);
});

// Virtual: total sold value
stockSchema.virtual('totalSold').get(function() {
  return this.transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + (t.quantity * t.pricePerUnit) - (t.brokerage || 0), 0);
});

// Virtual: average buy price
stockSchema.virtual('avgBuyPrice').get(function() {
  const buys = this.transactions.filter(t => t.type === 'buy');
  const totalQty = buys.reduce((sum, t) => sum + t.quantity, 0);
  const totalCost = buys.reduce((sum, t) => sum + (t.quantity * t.pricePerUnit), 0);
  return totalQty > 0 ? totalCost / totalQty : 0;
});

// Virtual: current value
stockSchema.virtual('currentValue').get(function() {
  return this.holdingQuantity * (this.currentPrice || 0);
});

// Virtual: unrealized P&L
stockSchema.virtual('unrealizedPL').get(function() {
  const holdQty = this.holdingQuantity;
  if (holdQty <= 0 || !this.currentPrice) return 0;
  return (this.currentPrice - this.avgBuyPrice) * holdQty;
});

// Virtual: unrealized P&L percentage
stockSchema.virtual('unrealizedPLPercent').get(function() {
  if (this.avgBuyPrice === 0) return 0;
  return ((this.currentPrice - this.avgBuyPrice) / this.avgBuyPrice) * 100;
});

stockSchema.set('toJSON', { virtuals: true });
stockSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Stock', stockSchema);
