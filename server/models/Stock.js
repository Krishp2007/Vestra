const mongoose = require('mongoose');

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
    min: 0.01
  },
  brokerage: {
    type: Number,
    default: 0
  },
  notes: String
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
    default: 0
  },
  dayChange: {
    type: Number,
    default: 0
  },
  dayChangePercent: {
    type: Number,
    default: 0
  },
  targetPrice: {
    type: Number
  },
  stopLossPrice: {
    type: Number
  },
  lastPriceUpdate: Date,
  transactions: [stockTransactionSchema],
  notes: String
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
