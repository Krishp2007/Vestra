const express = require('express');
const router = express.Router();
const { getMemberDashboard, getFamilyDashboard, importData, getPortfolioInsights } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/family', getFamilyDashboard);
router.get('/member/:memberId', getMemberDashboard);
router.post('/import', importData);
router.post('/insights', getPortfolioInsights);

module.exports = router;
