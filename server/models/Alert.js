const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  },
  type: {
    type: String,
    enum: ['sip_due', 'fd_maturity', 'anomaly', 'milestone', 'price_alert', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: String,
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  triggerDate: Date,
  relatedEntity: {
    id: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
      enum: ['sip', 'fd', 'stock']
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ familyId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
