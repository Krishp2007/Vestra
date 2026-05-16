const express = require('express');
const router = express.Router();
const { getFDs, getFD, createFD, updateFD, deleteFD } = require('../controllers/fdController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getFDs)
  .post(createFD);

router.route('/:id')
  .get(getFD)
  .put(updateFD)
  .delete(deleteFD);

module.exports = router;
