const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 50
  },
  relation: {
    type: String,
    enum: ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'],
    required: true
  },
  avatar: {
    type: String,
    default: '👤'
  },
  familyId: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

familyMemberSchema.index({ familyId: 1 });

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
