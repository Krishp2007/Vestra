const Stock = require('../models/Stock');

// @desc    Get all stocks
// @route   GET /api/stocks
exports.getStocks = async (req, res) => {
  try {
    const query = { familyId: req.user.familyId };
    if (req.query.memberId) query.memberId = req.query.memberId;

    const stocks = await Stock.find(query)
      .populate('memberId', 'name avatar relation')
      .sort('-createdAt');

    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stocks' });
  }
};

// @desc    Get single stock
// @route   GET /api/stocks/:id
exports.getStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    }).populate('memberId', 'name avatar relation');

    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock' });
  }
};

// @desc    Create stock
// @route   POST /api/stocks
exports.createStock = async (req, res) => {
  try {
    const stockData = {
      ...req.body,
      familyId: req.user.familyId
    };

    // If a stock with same symbol + member already exists, add transaction to it
    let stock = await Stock.findOne({
      symbol: stockData.symbol.toUpperCase(),
      memberId: stockData.memberId,
      familyId: req.user.familyId
    });

    if (stock && stockData.transactions && stockData.transactions.length > 0) {
      stock.transactions.push(...stockData.transactions);
      await stock.save();
    } else {
      stock = await Stock.create(stockData);
    }

    const populated = await Stock.findById(stock._id).populate('memberId', 'name avatar relation');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create stock error:', error);
    res.status(500).json({ message: 'Error creating stock' });
  }
};

// @desc    Update stock (e.g., current price)
// @route   PUT /api/stocks/:id
exports.updateStock = async (req, res) => {
  try {
    const stock = await Stock.findOneAndUpdate(
      { _id: req.params.id, familyId: req.user.familyId },
      req.body,
      { new: true, runValidators: true }
    ).populate('memberId', 'name avatar relation');

    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock' });
  }
};

// @desc    Delete stock
// @route   DELETE /api/stocks/:id
exports.deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findOneAndDelete({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    res.json({ success: true, message: 'Stock deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting stock' });
  }
};

// @desc    Add transaction to stock
// @route   POST /api/stocks/:id/transactions
exports.addTransaction = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      familyId: req.user.familyId
    });

    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    stock.transactions.push(req.body);
    await stock.save();

    const populated = await Stock.findById(stock._id).populate('memberId', 'name avatar relation');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error adding transaction' });
  }
};

// @desc    Fetch live stock price (free API)
// @route   GET /api/stocks/price/:symbol
exports.getStockPrice = async (req, res) => {
  try {
    let { symbol } = req.params;

    // Clean symbol: remove spaces, uppercase, and strip user-provided .NS or .BO to avoid duplication
    symbol = symbol.replace(/\s+/g, '').toUpperCase().replace(/\.NS$/, '').replace(/\.BO$/, '');

    if (!symbol) {
      return res.status(400).json({ message: 'Stock symbol is required' });
    }

    // Try Yahoo Finance - NSE first
    let price = null;
    let exchange = 'NSE';

    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        price = data.chart?.result?.[0]?.meta?.regularMarketPrice || null;
        const previousClose = data.chart?.result?.[0]?.meta?.chartPreviousClose || data.chart?.result?.[0]?.meta?.previousClose || 0;
        if (price) {
          return res.json({
            success: true, price, previousClose, exchange: 'NSE',
            change: Math.round((price - previousClose) * 100) / 100,
            changePercent: previousClose > 0 ? Math.round(((price - previousClose) / previousClose) * 10000) / 100 : 0
          });
        }
      }
    } catch (e) { /* NSE failed, try BSE */ }

    // Try BSE
    try {
      const bseResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.BO?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (bseResponse.ok) {
        const bseData = await bseResponse.json();
        price = bseData.chart?.result?.[0]?.meta?.regularMarketPrice || null;
        const previousClose = bseData.chart?.result?.[0]?.meta?.chartPreviousClose || bseData.chart?.result?.[0]?.meta?.previousClose || 0;
        if (price) {
          return res.json({
            success: true, price, previousClose, exchange: 'BSE',
            change: Math.round((price - previousClose) * 100) / 100,
            changePercent: previousClose > 0 ? Math.round(((price - previousClose) / previousClose) * 10000) / 100 : 0
          });
        }
      }
    } catch (e) { /* BSE also failed */ }

    // Nothing found
    res.status(404).json({
      message: `Could not find price for "${symbol}". Make sure you enter the NSE/BSE ticker symbol (e.g., RELIANCE, TCS, INFY) without spaces.`
    });
  } catch (error) {
    console.error('Stock price fetch error:', error);
    res.status(500).json({ message: 'Error fetching stock price' });
  }
};

// @desc    Search stock symbols (Proxy to Yahoo Finance)
// @route   GET /api/stocks/search/:query
exports.searchStocks = async (req, res) => {
  try {
    const { query } = req.params;
    if (!query || query.length < 2) return res.json({ success: true, quotes: [] });

    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=5`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (response.ok) {
      const data = await response.json();
      const quotes = data.quotes ? data.quotes.filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'MUTUALFUND') : [];
      return res.json({ success: true, quotes });
    }
    
    res.json({ success: true, quotes: [] });
  } catch (error) {
    console.error('Stock search error:', error);
    res.status(500).json({ message: 'Error searching stocks' });
  }
};

// @desc    Fetch stock history chart
// @route   GET /api/stocks/history/:symbol
exports.getStockHistory = async (req, res) => {
  try {
    let { symbol } = req.params;
    symbol = symbol.replace(/\s+/g, '').toUpperCase().replace(/\.NS$/, '').replace(/\.BO$/, '');
    const { range = '6mo', interval = '1d' } = req.query;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result && result.timestamp) {
        const timestamps = result.timestamp;
        const close = result.indicators?.quote?.[0]?.close || [];
        const history = timestamps.map((t, i) => ({
          date: t * 1000,
          price: close[i] || 0
        })).filter(d => d.price > 0);
        return res.json({ success: true, history });
      }
    }
    res.status(404).json({ message: 'No history found' });
  } catch (err) {
    console.error('Stock history fetch error:', err);
    res.status(500).json({ message: 'Error fetching history' });
  }
};
