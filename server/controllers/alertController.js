const Alert = require('../models/Alert');

// @desc    Get all alerts
// @route   GET /api/alerts
exports.getAlerts = async (req, res) => {
  try {
    const query = { familyId: req.user.familyId };
    if (req.query.unreadOnly === 'true') query.isRead = false;
    if (req.query.type) query.type = req.query.type;

    const alerts = await Alert.find(query)
      .populate('memberId', 'name avatar')
      .sort('-createdAt')
      .limit(50);

    const unreadCount = await Alert.countDocuments({
      familyId: req.user.familyId,
      isRead: false
    });

    res.json({ success: true, data: alerts, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts' });
  }
};

// @desc    Mark alert as read
// @route   PUT /api/alerts/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user.familyId },
      { isRead: true },
      { new: true }
    );

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ message: 'Error marking alert as read' });
  }
};

// @desc    Mark all alerts as read
// @route   PUT /api/alerts/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Alert.updateMany(
      { familyId: req.user.familyId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking alerts as read' });
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting alert' });
  }
};

// @desc    Create alert
// @route   POST /api/alerts
exports.createAlert = async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      familyId: req.user.familyId
    };
    const alert = await Alert.create(alertData);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ message: 'Error creating alert' });
  }
};
