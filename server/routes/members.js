const express = require('express');
const router = express.Router();
const { getMembers, addMember, updateMember, deleteMember } = require('../controllers/memberController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getMembers)
  .post(addMember);

router.route('/:id')
  .put(updateMember)
  .delete(deleteMember);

module.exports = router;
