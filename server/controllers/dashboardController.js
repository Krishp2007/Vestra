const SIP = require('../models/SIP');
const FD = require('../models/FD');
const Stock = require('../models/Stock');
const FamilyMember = require('../models/FamilyMember');
const Alert = require('../models/Alert');

// @desc    Get individual dashboard for a family member
// @route   GET /api/dashboard/member/:memberId
exports.getMemberDashboard = async (req, res) => {
  try {
    const { memberId } = req.params;
    const familyId = req.user.familyId;

    // Fetch all data in parallel
    const [member, sips, fds, stocks, alerts] = await Promise.all([
      FamilyMember.findOne({ _id: memberId, familyId }),
      SIP.find({ memberId, familyId }),
      FD.find({ memberId, familyId }),
      Stock.find({ memberId, familyId }),
      Alert.find({ memberId, familyId, isRead: false }).sort('-createdAt').limit(10)
    ]);

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    // Calculate SIP totals
    const sipTotalInvested = sips.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
    const sipCurrentValue = sips.reduce((sum, s) => sum + (s.currentValue || 0), 0);
    const activeSips = sips.filter(s => s.status === 'active').length;

    // Calculate FD totals
    const fdTotalPrincipal = fds.reduce((sum, f) => sum + (f.principalAmount || 0), 0);
    const fdTotalMaturity = fds.reduce((sum, f) => sum + (f.maturityAmount || 0), 0);
    const activeFds = fds.filter(f => f.status === 'active').length;
    const maturingSoon = fds.filter(f => {
      const days = f.daysToMaturity;
      return days >= 0 && days <= 30 && f.status === 'active';
    });

    // Calculate Stock totals
    const stockTotalInvested = stocks.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
    const stockCurrentValue = stocks.reduce((sum, s) => sum + (s.currentValue || 0), 0);
    const stockTotalSold = stocks.reduce((sum, s) => sum + (s.totalSold || 0), 0);

    // Total portfolio (matches family dashboard formula)
    const totalInvested = sipTotalInvested + fdTotalPrincipal + stockTotalInvested;
    const totalCurrentValue = sipCurrentValue + fdTotalPrincipal + stockCurrentValue;
    const totalReturns = totalInvested > 0
      ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
      : 0;

    // Asset allocation
    const totalValue = sipCurrentValue + fdTotalPrincipal + stockCurrentValue;
    const allocation = {
      sip: totalValue > 0 ? Math.round((sipCurrentValue / totalValue) * 100) : 0,
      fd: totalValue > 0 ? Math.round((fdTotalPrincipal / totalValue) * 100) : 0,
      stocks: totalValue > 0 ? Math.round((stockCurrentValue / totalValue) * 100) : 0
    };

    // Monthly investment data (last 12 months)
    const monthlyData = getMonthlyInvestmentData(sips, fds, stocks);

    // Recent activity (last 10 transactions)
    const recentActivity = getRecentActivity(sips, fds, stocks);

    res.json({
      success: true,
      data: {
        member,
        summary: {
          totalInvested: Math.round(totalInvested),
          totalCurrentValue: Math.round(totalCurrentValue),
          totalReturns: Math.round(totalReturns * 100) / 100,
          absoluteReturns: Math.round(totalCurrentValue - totalInvested)
        },
        sip: { total: sips.length, active: activeSips, invested: sipTotalInvested, currentValue: sipCurrentValue },
        fd: { total: fds.length, active: activeFds, principal: fdTotalPrincipal, maturityValue: fdTotalMaturity, maturingSoon: maturingSoon.length },
        stocks: { total: stocks.length, invested: stockTotalInvested, currentValue: stockCurrentValue },
        allocation,
        monthlyData,
        recentActivity,
        alerts
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

// @desc    Get family dashboard (combined)
// @route   GET /api/dashboard/family
exports.getFamilyDashboard = async (req, res) => {
  try {
    const familyId = req.user.familyId;

    const [members, sips, fds, stocks, alerts] = await Promise.all([
      FamilyMember.find({ familyId, isActive: true }),
      SIP.find({ familyId }).populate('memberId', 'name avatar relation'),
      FD.find({ familyId }).populate('memberId', 'name avatar relation'),
      Stock.find({ familyId }).populate('memberId', 'name avatar relation'),
      Alert.find({ familyId, isRead: false }).sort('-createdAt').limit(20)
    ]);

    // Per-member breakdown
    const memberBreakdown = members.map(member => {
      const memberSips = sips.filter(s => s.memberId?._id?.toString() === member._id.toString());
      const memberFds = fds.filter(f => f.memberId?._id?.toString() === member._id.toString());
      const memberStocks = stocks.filter(st => st.memberId?._id?.toString() === member._id.toString());

      const sipValue = memberSips.reduce((sum, s) => sum + (s.currentValue || 0), 0);
      const fdValue = memberFds.reduce((sum, f) => sum + (f.principalAmount || 0), 0);
      const stockValue = memberStocks.reduce((sum, s) => sum + (s.currentValue || 0), 0);

      const sipInvested = memberSips.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
      const fdInvested = memberFds.reduce((sum, f) => sum + (f.principalAmount || 0), 0);
      const stockInvested = memberStocks.reduce((sum, s) => sum + (s.totalInvested || 0), 0);

      return {
        member: { _id: member._id, name: member.name, avatar: member.avatar, relation: member.relation },
        totalValue: sipValue + fdValue + stockValue,
        totalInvested: sipInvested + fdInvested + stockInvested,
        sipValue,
        fdValue,
        stockValue,
        sipCount: memberSips.length,
        fdCount: memberFds.length,
        stockCount: memberStocks.length
      };
    });

    // Family totals
    const totalSipInvested = sips.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
    const totalSipValue = sips.reduce((sum, s) => sum + (s.currentValue || 0), 0);
    const totalFdPrincipal = fds.reduce((sum, f) => sum + (f.principalAmount || 0), 0);
    const totalFdMaturity = fds.reduce((sum, f) => sum + (f.maturityAmount || 0), 0);
    const totalStockInvested = stocks.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
    const totalStockValue = stocks.reduce((sum, s) => sum + (s.currentValue || 0), 0);

    const totalInvested = totalSipInvested + totalFdPrincipal + totalStockInvested;
    const totalCurrentValue = totalSipValue + totalFdPrincipal + totalStockValue;
    const overallReturns = totalInvested > 0
      ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
      : 0;

    // Family allocation
    const totalValue = totalSipValue + totalFdPrincipal + totalStockValue;
    const allocation = {
      sip: totalValue > 0 ? Math.round((totalSipValue / totalValue) * 100) : 0,
      fd: totalValue > 0 ? Math.round((totalFdPrincipal / totalValue) * 100) : 0,
      stocks: totalValue > 0 ? Math.round((totalStockValue / totalValue) * 100) : 0
    };

    // Monthly data
    const monthlyData = getMonthlyInvestmentData(sips, fds, stocks);

    // Category breakdown
    const categoryBreakdown = {};
    sips.forEach(s => {
      const cat = s.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (s.currentValue || 0);
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalMembers: members.length,
          totalInvested: Math.round(totalInvested),
          totalCurrentValue: Math.round(totalCurrentValue),
          overallReturns: Math.round(overallReturns * 100) / 100,
          absoluteReturns: Math.round(totalCurrentValue - totalInvested),
          totalSips: sips.length,
          totalFds: fds.length,
          totalStocks: stocks.length,
          sipInvested: Math.round(totalSipInvested),
          fdInvested: Math.round(totalFdPrincipal),
          stockInvested: Math.round(totalStockInvested),
          sipValue: Math.round(totalSipValue),
          fdValue: Math.round(totalFdPrincipal),
          stockValue: Math.round(totalStockValue)
        },
        allocation,
        memberBreakdown,
        monthlyData,
        categoryBreakdown,
        alerts,
        topPerformer: memberBreakdown.sort((a, b) => b.totalValue - a.totalValue)[0] || null
      }
    });
  } catch (error) {
    console.error('Family dashboard error:', error);
    res.status(500).json({ message: 'Error fetching family dashboard' });
  }
};

// Helper: Get monthly investment data for last 12 months
function getMonthlyInvestmentData(sips, fds, stocks) {
  const months = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('en-IN', { month: 'short', year: '2-digit' });

    let sipAmount = 0;
    sips.forEach(sip => {
      const monthPayments = sip.payments?.filter(p => {
        const payDate = new Date(p.date);
        return payDate.getFullYear() === date.getFullYear() && payDate.getMonth() === date.getMonth();
      }) || [];

      // Sum up recorded completed payments directly from the database (Single Source of Truth)
      sipAmount += monthPayments.reduce((sum, p) => p.status === 'completed' ? sum + (p.amount || 0) : sum, 0);
    });

    let fdAmount = 0;
    fds.forEach(fd => {
      const startDate = new Date(fd.startDate);
      if (startDate.getFullYear() === date.getFullYear() && startDate.getMonth() === date.getMonth()) {
        // Only count FD if the start date has actually passed (prevents future FDs from showing in current month bar)
        if (startDate <= now) {
          fdAmount += fd.principalAmount || 0;
        }
      }
    });

    let stockAmount = 0;
    stocks.forEach(stock => {
      stock.transactions?.forEach(t => {
        if (t.type === 'buy') {
          const txnDate = new Date(t.date);
          if (txnDate.getFullYear() === date.getFullYear() && txnDate.getMonth() === date.getMonth()) {
            stockAmount += t.quantity * t.pricePerUnit;
          }
        }
      });
    });

    months.push({
      month: monthName,
      key: monthKey,
      sip: Math.round(sipAmount),
      fd: Math.round(fdAmount),
      stocks: Math.round(stockAmount),
      total: Math.round(sipAmount + fdAmount + stockAmount)
    });
  }

  return months;
}

// Helper: Get recent activity across all investment types
function getRecentActivity(sips, fds, stocks) {
  const activities = [];

  sips.forEach(sip => {
    sip.payments?.forEach(p => {
      activities.push({
        type: 'sip',
        title: sip.fundName,
        amount: p.amount,
        date: p.date,
        status: p.status,
        icon: '📈'
      });
    });
  });

  fds.forEach(fd => {
    activities.push({
      type: 'fd',
      title: `${fd.bankName} FD`,
      amount: fd.principalAmount,
      date: fd.startDate,
      status: fd.status,
      icon: '🏦'
    });
  });

  stocks.forEach(stock => {
    stock.transactions?.forEach(t => {
      activities.push({
        type: 'stock',
        title: `${stock.symbol} (${t.type.toUpperCase()})`,
        amount: t.quantity * t.pricePerUnit,
        date: t.date,
        status: t.type,
        icon: t.type === 'buy' ? '🟢' : '🔴'
      });
    });
  });

  return activities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15);
}

// @desc    Import JSON data
// @route   POST /api/dashboard/import
exports.importData = async (req, res) => {
  try {
    const { members, sips, fds, stocks } = req.body;
    const familyId = req.user.familyId;

    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ message: 'Invalid data format: missing members array' });
    }

    // Map old member IDs to new member IDs
    const memberIdMap = {};

    // 1. Create new family members
    for (const oldMember of members) {
      const newMember = await FamilyMember.create({
        familyId,
        name: oldMember.name,
        relation: oldMember.relation,
        dateOfBirth: oldMember.dateOfBirth,
        panNumber: oldMember.panNumber,
        contactNumber: oldMember.contactNumber,
        email: oldMember.email,
        avatar: oldMember.avatar,
        isActive: oldMember.isActive !== false,
      });
      memberIdMap[oldMember._id] = newMember._id.toString();
    }

    // 2. Import SIPs
    if (Array.isArray(sips)) {
      const sipDocs = sips.map(sip => {
        const oldMemId = typeof sip.memberId === 'object' ? sip.memberId._id : sip.memberId;
        return {
          ...sip,
          _id: undefined, // Let MongoDB generate new ID
          familyId,
          memberId: memberIdMap[oldMemId] || Object.values(memberIdMap)[0],
          createdAt: undefined,
          updatedAt: undefined
        };
      });
      if (sipDocs.length > 0) await SIP.insertMany(sipDocs);
    }

    // 3. Import FDs
    if (Array.isArray(fds)) {
      const fdDocs = fds.map(fd => {
        const oldMemId = typeof fd.memberId === 'object' ? fd.memberId._id : fd.memberId;
        return {
          ...fd,
          _id: undefined,
          familyId,
          memberId: memberIdMap[oldMemId] || Object.values(memberIdMap)[0],
          createdAt: undefined,
          updatedAt: undefined
        };
      });
      if (fdDocs.length > 0) await FD.insertMany(fdDocs);
    }

    // 4. Import Stocks
    if (Array.isArray(stocks)) {
      const stockDocs = stocks.map(stock => {
        const oldMemId = typeof stock.memberId === 'object' ? stock.memberId._id : stock.memberId;
        return {
          ...stock,
          _id: undefined,
          familyId,
          memberId: memberIdMap[oldMemId] || Object.values(memberIdMap)[0],
          createdAt: undefined,
          updatedAt: undefined
        };
      });
      if (stockDocs.length > 0) await Stock.insertMany(stockDocs);
    }

    res.json({ success: true, message: 'Data imported successfully!' });
  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({ message: 'Error importing data' });
  }
};

// @desc    Get smart insights natively in JavaScript
// @route   POST /api/dashboard/insights
exports.getPortfolioInsights = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) return res.status(400).json({ message: 'Family ID is required' });

    // Fetch all family holdings
    const [sips, fds, stocks, members] = await Promise.all([
      SIP.find({ familyId }),
      FD.find({ familyId }),
      Stock.find({ familyId }),
      FamilyMember.find({ familyId, isActive: true })
    ]);

    const { generateInsights } = require('../utils/portfolioInsights');
    const insightsList = generateInsights({ sips, fds, stocks, members });

    res.json({ success: true, insights: insightsList });
  } catch (error) {
    console.error('Insights endpoint error:', error);
    res.status(500).json({ message: 'Error generating insights' });
  }
};
