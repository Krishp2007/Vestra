/**
 * Generate rule-based wealth allocation insights from portfolio data
 * Fully translated from Python to highly optimized JavaScript
 * 
 * @param {Object} data 
 * @param {Array} data.members
 * @param {Array} data.sips
 * @param {Array} data.fds
 * @param {Array} data.stocks
 * @returns {Array} List of smart insights
 */
const generateInsights = (data) => {
  const insights = [];
  const members = data.members || [];
  const sips = data.sips || [];
  const fds = data.fds || [];
  const stocks = data.stocks || [];

  // --- SIP Insights ---
  const activeSips = sips.filter(s => s.status === 'active');
  if (activeSips.length > 0) {
    const totalMonthly = activeSips.reduce((sum, s) => sum + Number(s.amountPerMonth || 0), 0);
    insights.push({
      type: 'sip',
      icon: '📈',
      severity: 'info',
      title: 'Monthly SIP Commitment',
      message: `Your family invests ₹${totalMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per month across ${activeSips.length} active SIPs`
    });

    // Best performing SIP
    const sipsWithReturns = sips.filter(s => Number(s.totalInvested || 0) > 0);
    if (sipsWithReturns.length > 0) {
      let best = sipsWithReturns[0];
      let bestReturn = -999999;
      
      sipsWithReturns.forEach(s => {
        const curVal = Number(s.currentValue || 0);
        const invVal = Number(s.totalInvested || 0);
        const ret = ((curVal - invVal) / invVal) * 100;
        if (ret > bestReturn) {
          bestReturn = ret;
          best = s;
        }
      });

      insights.push({
        type: 'sip',
        icon: '🏆',
        severity: 'info',
        title: `Top Performer: ${best.fundName || 'Unknown'}`,
        message: `This SIP has returned ${bestReturn.toFixed(1)}% — your best performing mutual fund!`
      });
    }
  }

  // --- FD Insights ---
  const activeFds = fds.filter(f => f.status === 'active');
  const today = new Date();
  const maturingSoon = [];

  activeFds.forEach(fd => {
    try {
      if (fd.maturityDate) {
        const matDate = new Date(fd.maturityDate);
        const diffTime = matDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 30) {
          maturingSoon.push({ fd, daysLeft });
        }
      }
    } catch (e) {
      // Graceful catch for malformed dates
    }
  });

  maturingSoon.forEach(({ fd, daysLeft }) => {
    const principal = Number(fd.principalAmount || 0);
    insights.push({
      type: 'fd',
      icon: '🏦',
      severity: 'warning',
      title: `FD Maturing in ${daysLeft} days`,
      message: `₹${principal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} FD at ${fd.bankName || 'Unknown'} (${fd.interestRate || 0}%) — consider renewal`
    });
  });

  if (activeFds.length > 0) {
    const avgRate = activeFds.reduce((sum, f) => sum + Number(f.interestRate || 0), 0) / activeFds.length;
    if (avgRate < 6.5) {
      insights.push({
        type: 'fd',
        icon: '💡',
        severity: 'info',
        title: 'FD Rate Optimization',
        message: `Your average FD rate is ${avgRate.toFixed(1)}%. Consider moving to banks offering 7%+ rates.`
      });
    }
  }

  // --- Stock Insights ---
  if (stocks.length > 0) {
    let totalHoldingValue = 0;
    let totalInvested = 0;

    stocks.forEach(stock => {
      const txns = stock.transactions || [];
      const holding = txns.reduce((sum, t) => sum + (Number(t.quantity || 0) * (t.type === 'buy' ? 1 : -1)), 0);
      const inv = txns.filter(t => t.type === 'buy').reduce((sum, t) => sum + (Number(t.quantity || 0) * Number(t.pricePerUnit || 0)), 0);
      
      totalInvested += inv;
      totalHoldingValue += holding * Number(stock.currentPrice || 0);
    });

    if (totalInvested > 0) {
      const stockReturn = ((totalHoldingValue - totalInvested) / totalInvested) * 100;
      insights.push({
        type: 'stock',
        icon: '📊',
        severity: stockReturn >= 0 ? 'info' : 'warning',
        title: `Stock Portfolio: ${stockReturn >= 0 ? '+' : ''}${stockReturn.toFixed(1)}%`,
        message: `Invested ₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, Current value ₹${totalHoldingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      });
    }
  }

  // --- Allocation Insights ---
  const totalSip = sips.reduce((sum, s) => sum + Number(s.currentValue || 0), 0);
  const totalFd = fds.reduce((sum, f) => sum + Number(f.principalAmount || 0), 0);
  const totalStock = stocks.reduce((sum, stock) => {
    const txns = stock.transactions || [];
    const holding = txns.reduce((sSum, t) => sSum + (Number(t.quantity || 0) * (t.type === 'buy' ? 1 : -1)), 0);
    return sum + (holding * Number(stock.currentPrice || 0));
  }, 0);

  const total = totalSip + totalFd + totalStock;

  if (total > 0) {
    const equityPct = ((totalSip + totalStock) / total) * 100;
    if (equityPct > 75) {
      insights.push({
        type: 'allocation',
        icon: '⚖️',
        severity: 'warning',
        title: 'High Equity Exposure',
        message: `${Math.round(equityPct)}% of your portfolio is in equity. Consider diversifying into FDs or debt funds.`
      });
    } else if (equityPct < 30) {
      insights.push({
        type: 'allocation',
        icon: '📈',
        severity: 'info',
        title: 'Low Equity Allocation',
        message: `Only ${Math.round(equityPct)}% in equity. For long-term growth, consider increasing equity exposure.`
      });
    }
  }

  // --- Milestones ---
  if (total >= 5000000) {
    insights.push({
      type: 'milestone',
      icon: '🎉',
      severity: 'info',
      title: 'Milestone: ₹50 Lakh+!',
      message: `Your family portfolio has crossed ₹${(total / 100000).toFixed(0)} Lakhs. Amazing progress!`
    });
  } else if (total >= 1000000) {
    insights.push({
      type: 'milestone',
      icon: '🎯',
      severity: 'info',
      title: 'Milestone: ₹10 Lakh+!',
      message: `Your family portfolio is at ₹${(total / 100000).toFixed(1)} Lakhs. Keep investing!`
    });
  }

  // --- Member Comparison ---
  if (members.length > 1 && (sips.length > 0 || fds.length > 0 || stocks.length > 0)) {
    const memberValues = {};
    members.forEach(m => {
      const mid = String(m._id || '');
      let val = 0;
      val += sips.filter(s => String(s.memberId || '') === mid).reduce((sum, s) => sum + Number(s.currentValue || 0), 0);
      val += fds.filter(f => String(f.memberId || '') === mid).reduce((sum, f) => sum + Number(f.principalAmount || 0), 0);
      
      val += stocks.reduce((sum, stock) => {
        if (String(stock.memberId || '') !== mid) return sum;
        const txns = stock.transactions || [];
        const holding = txns.reduce((sSum, t) => sSum + (Number(t.quantity || 0) * (t.type === 'buy' ? 1 : -1)), 0);
        return sum + (holding * Number(stock.currentPrice || 0));
      }, 0);

      memberValues[m.name || 'Unknown'] = val;
    });

    const entries = Object.entries(memberValues);
    if (entries.length > 0) {
      let topName = entries[0][0];
      let topVal = entries[0][1];
      
      entries.forEach(([name, val]) => {
        if (val > topVal) {
          topVal = val;
          topName = name;
        }
      });

      if (topVal > 0) {
        insights.push({
          type: 'family',
          icon: '👑',
          severity: 'info',
          title: `Top Contributor: ${topName}`,
          message: `${topName} has the highest portfolio value at ₹${topVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        });
      }
    }
  }

  return insights;
};

module.exports = { generateInsights };
