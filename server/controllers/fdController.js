const FD = require('../models/FD');

// @desc    Get all FDs
// @route   GET /api/fds
exports.getFDs = async (req, res) => {
  try {
    const query = { familyId: req.user.familyId };
    if (req.query.memberId) query.memberId = req.query.memberId;
    if (req.query.status) query.status = req.query.status;

    const fds = await FD.find(query)
      .populate('memberId', 'name avatar relation')
      .sort('-createdAt');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let needsUpdate = false;
    for (let i = 0; i < fds.length; i++) {
      if (fds[i].status === 'active' && new Date(fds[i].maturityDate) <= today) {
        fds[i].status = 'matured';
        await fds[i].save();
        needsUpdate = true;
      }
    }

    res.json({ success: true, data: fds });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FDs' });
  }
};

// @desc    Get single FD
// @route   GET /api/fds/:id
exports.getFD = async (req, res) => {
  try {
    const fd = await FD.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    }).populate('memberId', 'name avatar relation');

    if (!fd) return res.status(404).json({ message: 'FD not found' });
    res.json({ success: true, data: fd });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FD' });
  }
};

// @desc    Create FD
// @route   POST /api/fds
exports.createFD = async (req, res) => {
  try {
    if (!req.body.memberId) {
      return res.status(400).json({ message: 'Please select a family member first. Go to Family Members to add one.' });
    }

    const fdData = {
      ...req.body,
      familyId: req.user.familyId
    };

    const fd = await FD.create(fdData);
    const populated = await FD.findById(fd._id).populate('memberId', 'name avatar relation');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create FD error:', error);
    res.status(500).json({ message: 'Error creating FD' });
  }
};

// @desc    Update FD
// @route   PUT /api/fds/:id
exports.updateFD = async (req, res) => {
  try {
    const fd = await FD.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!fd) return res.status(404).json({ message: 'FD not found' });

    Object.assign(fd, req.body);
    await fd.save(); // triggers maturity recalculation

    const populated = await FD.findById(fd._id).populate('memberId', 'name avatar relation');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating FD' });
  }
};

// @desc    Delete FD
// @route   DELETE /api/fds/:id
exports.deleteFD = async (req, res) => {
  try {
    const fd = await FD.findOneAndDelete({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!fd) return res.status(404).json({ message: 'FD not found' });
    res.json({ success: true, message: 'FD deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting FD' });
  }
};
