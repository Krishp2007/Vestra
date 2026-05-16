from datetime import datetime


def detect_anomalies(records, data_type='sip'):
    """Detect anomalies and suspicious entries in financial data"""
    anomalies = []
    today = datetime.now()

    if data_type == 'sip':
        amounts = [float(r.get('amountPerMonth', 0)) for r in records if float(r.get('amountPerMonth', 0)) > 0]
        avg_amount = sum(amounts) / len(amounts) if amounts else 0

        for i, record in enumerate(records):
            amount = float(record.get('amountPerMonth', 0))

            # Unusually large amount (>3x average)
            if avg_amount > 0 and amount > avg_amount * 3:
                anomalies.append({
                    'row': i, 'severity': 'warning', 'type': 'unusual_amount',
                    'message': f'SIP amount ₹{amount:,.0f} is {amount/avg_amount:.1f}x the average (₹{avg_amount:,.0f})',
                    'field': 'amountPerMonth'
                })

            # Future start date
            try:
                start = datetime.strptime(str(record.get('startDate', ''))[:10], '%Y-%m-%d')
                if start > today:
                    anomalies.append({
                        'row': i, 'severity': 'info', 'type': 'future_date',
                        'message': f'SIP start date is in the future: {start.strftime("%d %b %Y")}',
                        'field': 'startDate'
                    })
            except: pass

            # Negative amount
            if amount < 0:
                anomalies.append({
                    'row': i, 'severity': 'critical', 'type': 'negative_amount',
                    'message': 'SIP amount is negative',
                    'field': 'amountPerMonth'
                })

        # Check for duplicates
        seen = {}
        for i, record in enumerate(records):
            key = f"{record.get('fundName','')}-{record.get('amountPerMonth','')}-{record.get('memberId','')}"
            if key in seen:
                anomalies.append({
                    'row': i, 'severity': 'warning', 'type': 'duplicate',
                    'message': f'Possible duplicate of row {seen[key] + 1}',
                    'field': 'fundName'
                })
            else:
                seen[key] = i

    elif data_type == 'fd':
        for i, record in enumerate(records):
            rate = float(record.get('interestRate', 0))
            principal = float(record.get('principalAmount', 0))

            if rate > 15:
                anomalies.append({
                    'row': i, 'severity': 'warning', 'type': 'high_rate',
                    'message': f'FD interest rate {rate}% seems unusually high',
                    'field': 'interestRate'
                })

            if principal < 0:
                anomalies.append({
                    'row': i, 'severity': 'critical', 'type': 'negative_amount',
                    'message': 'FD principal is negative',
                    'field': 'principalAmount'
                })

    elif data_type == 'stock':
        for i, record in enumerate(records):
            for j, txn in enumerate(record.get('transactions', [])):
                qty = float(txn.get('quantity', 0))
                price = float(txn.get('pricePerUnit', 0))

                if qty <= 0:
                    anomalies.append({
                        'row': i, 'severity': 'critical', 'type': 'invalid_quantity',
                        'message': f'Transaction {j+1}: Invalid quantity ({qty})',
                        'field': 'quantity'
                    })

                if price <= 0:
                    anomalies.append({
                        'row': i, 'severity': 'critical', 'type': 'invalid_price',
                        'message': f'Transaction {j+1}: Invalid price (₹{price})',
                        'field': 'pricePerUnit'
                    })

    return anomalies
