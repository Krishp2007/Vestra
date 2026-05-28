const cron = require('node-cron');
const Stock = require('../models/Stock');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { sendAlertEmail } = require('../utils/sendAlertEmail');

const startStocksJob = () => {
  // Run stock price crawler and threshold evaluation every 30 seconds (Mon-Fri, active market hours 9:00 AM to 3:59 PM only)
  cron.schedule('*/30 * 9-15 * * 1-5', async () => {
    try {
      const stocks = await Stock.find().populate('memberId', 'name');
      if (stocks.length > 0) {
        // Shared symbol fetching: gather unique tickers to minimize external API loads
        const uniqueSymbols = [...new Set(stocks.map(s => s.symbol))];
        let fetchedCount = 0;

        for (const symbol of uniqueSymbols) {
          try {
            const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
              }
            });
            if (res.ok) {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
                if (price) {
                  await Stock.updateMany({ symbol }, { currentPrice: price });
                  fetchedCount++;
                }
              }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) { 
            logger.error('StocksJob', `Error updating price for ${symbol}: ${err.message}`); 
          }
        }

        logger.info('StocksJob', `Fetched prices for ${fetchedCount}/${uniqueSymbols.length} unique symbols.`);

        // Individual user processing: check targets and stop-losses
        let alertsFired = 0;
        for (const stk of stocks) {
          const freshStock = await Stock.findById(stk._id);
          if (!freshStock || !freshStock.currentPrice) continue;
          const price = freshStock.currentPrice;

          if (freshStock.targetPrice && price >= freshStock.targetPrice) {
            await Alert.create({
              familyId: freshStock.familyId, memberId: freshStock.memberId,
              type: 'price_alert', title: `🎯 Target Hit: ${freshStock.symbol}`,
              message: `${freshStock.symbol} has crossed your target price of ₹${freshStock.targetPrice}! Current: ₹${price}`,
              severity: 'info', relatedEntity: { id: freshStock._id, type: 'stock' }
            });
            sendAlertEmail(freshStock.familyId, 'stockPriceAlert', {
              alertType: 'target', symbol: freshStock.symbol, currentPrice: price.toLocaleString('en-IN'),
              triggerPrice: freshStock.targetPrice.toLocaleString('en-IN'), memberName: freshStock.memberId?.name || ''
            }, `🎯 Target Hit: ${freshStock.symbol} — Vestra Vault`);
            
            logger.info('StocksJob', `Fired Target Price Hit for ${freshStock.symbol} (Price: ${price}, Target: ${freshStock.targetPrice})`);
            freshStock.targetPrice = null;
            await freshStock.save();
            alertsFired++;
          }

          if (freshStock.stopLossPrice && price <= freshStock.stopLossPrice) {
            await Alert.create({
              familyId: freshStock.familyId, memberId: freshStock.memberId,
              type: 'price_alert', title: `🛑 Stop Loss Hit: ${freshStock.symbol}`,
              message: `${freshStock.symbol} has dropped below your stop loss of ₹${freshStock.stopLossPrice}! Current: ₹${price}`,
              severity: 'warning', relatedEntity: { id: freshStock._id, type: 'stock' }
            });
            sendAlertEmail(freshStock.familyId, 'stockPriceAlert', {
              alertType: 'stop', symbol: freshStock.symbol, currentPrice: price.toLocaleString('en-IN'),
              triggerPrice: freshStock.stopLossPrice.toLocaleString('en-IN'), memberName: freshStock.memberId?.name || ''
            }, `🛑 Stop Loss Hit: ${freshStock.symbol} — Vestra Vault`);
            
            logger.warn('StocksJob', `Fired Stop Loss Hit for ${freshStock.symbol} (Price: ${price}, Stop: ${freshStock.stopLossPrice})`);
            freshStock.stopLossPrice = null;
            await freshStock.save();
            alertsFired++;
          }
        }
        
        if (alertsFired > 0) {
          logger.info('StocksJob', `Fired ${alertsFired} individual stock price alerts.`);
        }
      }
    } catch (error) {
      logger.error('StocksJob', `Automation runtime exception: ${error.message}`);
    }
  });
};

module.exports = { startStocksJob };
