const express = require('express');
const router = express.Router();
const { getStocks, getStock, createStock, updateStock, deleteStock, addTransaction, getStockPrice, searchStocks, getStockHistory } = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/price/:symbol', getStockPrice);
router.get('/search/:query', searchStocks);
router.get('/history/:symbol', getStockHistory);

router.route('/')
  .get(getStocks)
  .post(createStock);

router.route('/:id')
  .get(getStock)
  .put(updateStock)
  .delete(deleteStock);

router.post('/:id/transactions', addTransaction);

module.exports = router;
