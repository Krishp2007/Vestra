const FamilyMember = require('../models/FamilyMember');

// @desc    Get all family members
// @route   GET /api/members
exports.getMembers = async (req, res) => {
  try {
    const members = await FamilyMember.find({ familyId: req.user.familyId, isActive: true })
      .sort('name');
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching family members' });
  }
};

// @desc    Add family member
// @route   POST /api/members
exports.addMember = async (req, res) => {
  try {
    const { name, relation, avatar } = req.body;

    const member = await FamilyMember.create({
      name,
      relation,
      avatar: avatar || '👤',
      familyId: req.user.familyId,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Error adding family member' });
  }
};

// @desc    Update family member
// @route   PUT /api/members/:id
exports.updateMember = async (req, res) => {
  try {
    const member = await FamilyMember.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    const { name, relation, avatar } = req.body;
    if (name) member.name = name;
    if (relation) member.relation = relation;
    if (avatar) member.avatar = avatar;

    await member.save();
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ message: 'Error updating family member' });
  }
};

// @desc    Delete (soft) family member
// @route   DELETE /api/members/:id
exports.deleteMember = async (req, res) => {
  try {
    const member = await FamilyMember.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    member.isActive = false;
    await member.save();
    res.json({ success: true, message: 'Family member removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting family member' });
  }
};
