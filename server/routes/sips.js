const express = require('express');
const router = express.Router();
const { getSIPs, getSIP, createSIP, updateSIP, deleteSIP, addPayment, updatePayment } = require('../controllers/sipController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSIPs)
  .post(createSIP);

router.route('/:id')
  .get(getSIP)
  .put(updateSIP)
  .delete(deleteSIP);

router.post('/:id/payments', addPayment);
router.put('/:id/payments/:paymentId', updatePayment);

module.exports = router;
