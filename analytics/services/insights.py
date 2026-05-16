from datetime import datetime, timedelta


def generate_insights(data):
    """Generate rule-based insights from portfolio data"""
    insights = []
    members = data.get('members', [])
    sips = data.get('sips', [])
    fds = data.get('fds', [])
    stocks = data.get('stocks', [])

    # --- SIP Insights ---
    active_sips = [s for s in sips if s.get('status') == 'active']
    if active_sips:
        total_monthly = sum(float(s.get('amountPerMonth', 0)) for s in active_sips)
        insights.append({
            'type': 'sip', 'icon': '📈', 'severity': 'info',
            'title': 'Monthly SIP Commitment',
            'message': f'Your family invests ₹{total_monthly:,.0f} per month across {len(active_sips)} active SIPs'
        })

        # Best performing SIP
        sips_with_returns = [s for s in sips if float(s.get('totalInvested', 0)) > 0]
        if sips_with_returns:
            best = max(sips_with_returns, key=lambda s: (float(s.get('currentValue',0)) - float(s.get('totalInvested',0))) / float(s.get('totalInvested',1)) * 100)
            ret = (float(best.get('currentValue',0)) - float(best.get('totalInvested',0))) / float(best.get('totalInvested',1)) * 100
            insights.append({
                'type': 'sip', 'icon': '🏆', 'severity': 'info',
                'title': f'Top Performer: {best.get("fundName", "Unknown")}',
                'message': f'This SIP has returned {ret:.1f}% — your best performing mutual fund!'
            })

    # --- FD Insights ---
    active_fds = [f for f in fds if f.get('status') == 'active']
    today = datetime.now()
    maturing_soon = []
    for fd in active_fds:
        try:
            mat_date = datetime.strptime(fd.get('maturityDate', '')[:10], '%Y-%m-%d')
            days_left = (mat_date - today).days
            if 0 <= days_left <= 30:
                maturing_soon.append((fd, days_left))
        except: pass

    for fd, days in maturing_soon:
        insights.append({
            'type': 'fd', 'icon': '🏦', 'severity': 'warning',
            'title': f'FD Maturing in {days} days',
            'message': f'₹{float(fd.get("principalAmount",0)):,.0f} FD at {fd.get("bankName","Unknown")} ({fd.get("interestRate",0)}%) — consider renewal'
        })

    if active_fds:
        avg_rate = sum(float(f.get('interestRate',0)) for f in active_fds) / len(active_fds)
        if avg_rate < 6.5:
            insights.append({
                'type': 'fd', 'icon': '💡', 'severity': 'info',
                'title': 'FD Rate Optimization',
                'message': f'Your average FD rate is {avg_rate:.1f}%. Consider moving to banks offering 7%+ rates.'
            })

    # --- Stock Insights ---
    if stocks:
        total_holding_value = 0
        total_invested = 0
        for stock in stocks:
            txns = stock.get('transactions', [])
            holding = sum(float(t.get('quantity',0))*(1 if t.get('type')=='buy' else -1) for t in txns)
            inv = sum(float(t.get('quantity',0))*float(t.get('pricePerUnit',0)) for t in txns if t.get('type')=='buy')
            total_invested += inv
            total_holding_value += holding * float(stock.get('currentPrice', 0))

        if total_invested > 0:
            stock_return = ((total_holding_value - total_invested) / total_invested) * 100
            insights.append({
                'type': 'stock', 'icon': '📊', 'severity': 'info' if stock_return >= 0 else 'warning',
                'title': f'Stock Portfolio: {"+" if stock_return >= 0 else ""}{stock_return:.1f}%',
                'message': f'Invested ₹{total_invested:,.0f}, Current value ₹{total_holding_value:,.0f}'
            })

    # --- Allocation Insights ---
    total_sip = sum(float(s.get('currentValue', 0)) for s in sips)
    total_fd = sum(float(f.get('principalAmount', 0)) for f in fds)
    total_stock = sum(
        sum(float(t.get('quantity',0))*(1 if t.get('type')=='buy' else -1) for t in s.get('transactions',[])) * float(s.get('currentPrice',0))
        for s in stocks
    )
    total = total_sip + total_fd + total_stock

    if total > 0:
        equity_pct = ((total_sip + total_stock) / total) * 100
        if equity_pct > 75:
            insights.append({
                'type': 'allocation', 'icon': '⚖️', 'severity': 'warning',
                'title': 'High Equity Exposure',
                'message': f'{equity_pct:.0f}% of your portfolio is in equity. Consider diversifying into FDs or debt funds.'
            })
        elif equity_pct < 30:
            insights.append({
                'type': 'allocation', 'icon': '📈', 'severity': 'info',
                'title': 'Low Equity Allocation',
                'message': f'Only {equity_pct:.0f}% in equity. For long-term growth, consider increasing equity exposure.'
            })

    # --- Milestones ---
    if total >= 5000000:
        insights.append({
            'type': 'milestone', 'icon': '🎉', 'severity': 'info',
            'title': 'Milestone: ₹50 Lakh+!',
            'message': f'Your family portfolio has crossed ₹{total/100000:.0f} Lakhs. Amazing progress!'
        })
    elif total >= 1000000:
        insights.append({
            'type': 'milestone', 'icon': '🎯', 'severity': 'info',
            'title': 'Milestone: ₹10 Lakh+!',
            'message': f'Your family portfolio is at ₹{total/100000:.1f} Lakhs. Keep investing!'
        })

    # --- Member comparison ---
    if len(members) > 1 and (sips or fds or stocks):
        member_values = {}
        for m in members:
            mid = str(m.get('_id', ''))
            val = 0
            val += sum(float(s.get('currentValue',0)) for s in sips if str(s.get('memberId',''))==mid)
            val += sum(float(f.get('principalAmount',0)) for f in fds if str(f.get('memberId',''))==mid)
            member_values[m.get('name','Unknown')] = val
        if member_values:
            top = max(member_values, key=member_values.get)
            insights.append({
                'type': 'family', 'icon': '👑', 'severity': 'info',
                'title': f'Top Contributor: {top}',
                'message': f'{top} has the highest portfolio value at ₹{member_values[top]:,.0f}'
            })

    return insights
