import numpy as np
from datetime import datetime


def calculate_xirr(cashflows):
    if not cashflows or len(cashflows) < 2:
        return {'xirr': 0, 'error': 'Need at least 2 cashflows'}
    try:
        dates = [datetime.strptime(cf['date'], '%Y-%m-%d') for cf in cashflows]
        amounts = [float(cf['amount']) for cf in cashflows]
        if all(a >= 0 for a in amounts) or all(a <= 0 for a in amounts):
            return {'xirr': 0, 'error': 'Need both investments and returns'}
        first_date = min(dates)
        days = [(d - first_date).days / 365.25 for d in dates]
        def npv(rate):
            return sum(a / (1 + rate) ** d for a, d in zip(amounts, days))
        def npv_deriv(rate):
            return sum(-d * a / (1 + rate) ** (d + 1) for a, d in zip(amounts, days))
        rate = 0.1
        for _ in range(100):
            nv = npv(rate)
            nd = npv_deriv(rate)
            if abs(nd) < 1e-10: break
            nr = rate - nv / nd
            if abs(nr - rate) < 1e-8:
                rate = nr; break
            rate = nr
        return {'xirr': round(rate * 100, 2), 'annualized': True}
    except Exception as e:
        return {'xirr': 0, 'error': str(e)}


def calculate_cagr(begin_value, end_value, years):
    try:
        bv, ev, y = float(begin_value), float(end_value), float(years)
        if bv <= 0 or y <= 0: return {'cagr': 0, 'error': 'Invalid inputs'}
        cagr = (pow(ev / bv, 1 / y) - 1) * 100
        return {'cagr': round(cagr, 2), 'beginValue': bv, 'endValue': ev, 'years': y}
    except Exception as e:
        return {'cagr': 0, 'error': str(e)}


def calculate_fd_maturity(principal, rate, years, compounding='quarterly'):
    try:
        p = float(principal); r = float(rate) / 100; t = float(years)
        n_map = {'monthly': 12, 'quarterly': 4, 'half-yearly': 2, 'yearly': 1}
        n = n_map.get(compounding, 4)
        maturity = p * pow(1 + r / n, n * t)
        return {
            'principal': round(p, 2), 'maturityAmount': round(maturity, 2),
            'interestEarned': round(maturity - p, 2),
            'effectiveRate': round((pow(1 + r / n, n) - 1) * 100, 2)
        }
    except Exception as e:
        return {'maturityAmount': 0, 'error': str(e)}


def portfolio_summary(portfolio):
    try:
        sips = portfolio.get('sips', [])
        fds = portfolio.get('fds', [])
        stocks = portfolio.get('stocks', [])
        sip_inv = sum(float(s.get('totalInvested', 0)) for s in sips)
        sip_val = sum(float(s.get('currentValue', 0)) for s in sips)
        fd_prin = sum(float(f.get('principalAmount', 0)) for f in fds)
        fd_mat = sum(float(f.get('maturityAmount', 0)) for f in fds)
        avg_fd = np.mean([float(f.get('interestRate', 0)) for f in fds]) if fds else 0
        stk_inv, stk_val = 0, 0
        for stock in stocks:
            for txn in stock.get('transactions', []):
                if txn.get('type') == 'buy':
                    stk_inv += float(txn.get('quantity', 0)) * float(txn.get('pricePerUnit', 0))
            holding = sum(float(t.get('quantity',0))*(1 if t.get('type')=='buy' else -1) for t in stock.get('transactions',[]))
            stk_val += holding * float(stock.get('currentPrice', 0))
        tot_inv = sip_inv + fd_prin + stk_inv
        tot_val = sip_val + fd_prin + stk_val
        return {
            'totalInvested': round(tot_inv, 2), 'totalCurrentValue': round(tot_val, 2),
            'overallReturns': round(((tot_val - tot_inv) / tot_inv * 100) if tot_inv > 0 else 0, 2),
            'sip': {'invested': round(sip_inv,2), 'currentValue': round(sip_val,2), 'count': len(sips)},
            'fd': {'principal': round(fd_prin,2), 'maturityValue': round(fd_mat,2), 'avgRate': round(float(avg_fd),2), 'count': len(fds)},
            'stocks': {'invested': round(stk_inv,2), 'currentValue': round(stk_val,2), 'count': len(stocks)}
        }
    except Exception as e:
        return {'error': str(e)}
