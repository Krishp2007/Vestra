const express = require('express');
const router = express.Router();
const { getAlerts, markAsRead, markAllAsRead, deleteAlert, createAlert, emailInsights } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAlerts);
router.put('/read-all', markAllAsRead);
router.post('/', createAlert);
router.post('/email-insights', emailInsights);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteAlert);

module.exports = router;
