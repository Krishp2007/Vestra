import pandas as pd
import io
from datetime import datetime


def parse_csv_file(file, data_type='sip'):
    """Parse CSV/Excel file and return structured data"""
    filename = file.filename.lower()

    # Read the file based on extension
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        df = pd.read_excel(file, engine='openpyxl')
    elif filename.endswith('.csv'):
        content = file.read().decode('utf-8')
        df = pd.read_csv(io.StringIO(content))
    else:
        raise ValueError('Unsupported file format. Please upload CSV or Excel files.')

    # Clean column names
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')

    # Remove completely empty rows
    df = df.dropna(how='all')

    # Basic cleaning
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).str.strip()

    # Try to detect and convert date columns
    for col in df.columns:
        if any(keyword in col for keyword in ['date', 'time', 'dt', 'start', 'end', 'maturity']):
            try:
                df[col] = pd.to_datetime(df[col], dayfirst=True, errors='coerce')
                df[col] = df[col].dt.strftime('%Y-%m-%d')
            except Exception:
                pass

    # Try to convert numeric columns
    for col in df.columns:
        if any(keyword in col for keyword in ['amount', 'price', 'value', 'rate', 'quantity',
                                                'units', 'nav', 'principal', 'interest', 'brokerage']):
            try:
                # Remove currency symbols and commas
                df[col] = df[col].astype(str).str.replace('₹', '').str.replace(',', '').str.replace(' ', '')
                df[col] = pd.to_numeric(df[col], errors='coerce')
            except Exception:
                pass

    # Generate column mapping suggestions
    column_mapping = suggest_column_mapping(df.columns.tolist(), data_type)

    # Generate warnings
    warnings = []
    null_counts = df.isnull().sum()
    for col in df.columns:
        if null_counts[col] > 0:
            warnings.append(f"Column '{col}' has {null_counts[col]} empty values")

    if len(df) == 0:
        warnings.append('No data rows found in the file')

    return {
        'data': df.where(pd.notnull(df), None).to_dict('records'),
        'columns': df.columns.tolist(),
        'rowCount': len(df),
        'columnMapping': column_mapping,
        'warnings': warnings
    }


def suggest_column_mapping(columns, data_type):
    """Suggest how CSV columns map to our data fields"""

    sip_fields = {
        'fund_name': ['fund', 'fund_name', 'scheme', 'scheme_name', 'mutual_fund', 'name'],
        'amount_per_month': ['amount', 'sip_amount', 'monthly_amount', 'installment'],
        'start_date': ['start_date', 'start', 'date', 'sip_date', 'commenced'],
        'end_date': ['end_date', 'end', 'maturity'],
        'current_value': ['current_value', 'market_value', 'nav_value', 'value'],
        'total_invested': ['total_invested', 'invested', 'cost', 'total_cost'],
        'category': ['category', 'type', 'fund_type', 'scheme_type'],
        'folio_number': ['folio', 'folio_number', 'folio_no'],
        'status': ['status', 'active']
    }

    fd_fields = {
        'bank_name': ['bank', 'bank_name', 'institution', 'name'],
        'principal_amount': ['principal', 'amount', 'deposit_amount', 'principal_amount'],
        'interest_rate': ['rate', 'interest_rate', 'roi', 'interest'],
        'start_date': ['start_date', 'start', 'date', 'deposit_date', 'opened'],
        'maturity_date': ['maturity_date', 'maturity', 'end_date', 'end'],
        'account_number': ['account', 'account_number', 'fd_number', 'receipt'],
        'status': ['status', 'active']
    }

    stock_fields = {
        'symbol': ['symbol', 'stock', 'ticker', 'script', 'scrip', 'name'],
        'type': ['type', 'transaction_type', 'buy_sell', 'action'],
        'date': ['date', 'trade_date', 'transaction_date'],
        'quantity': ['quantity', 'qty', 'shares', 'units'],
        'price_per_unit': ['price', 'rate', 'price_per_unit', 'avg_price', 'trade_price'],
        'brokerage': ['brokerage', 'charges', 'commission', 'fees']
    }

    field_map = {'sip': sip_fields, 'fd': fd_fields, 'stock': stock_fields}
    target_fields = field_map.get(data_type, sip_fields)

    mapping = {}
    columns_lower = [c.lower() for c in columns]

    for field, aliases in target_fields.items():
        for alias in aliases:
            if alias in columns_lower:
                idx = columns_lower.index(alias)
                mapping[field] = columns[idx]
                break

    return mapping


def validate_data(records, data_type='sip'):
    """Validate parsed records before import"""
    errors = []
    warnings = []
    valid = True

    for i, record in enumerate(records):
        row_num = i + 1

        if data_type == 'sip':
            if not record.get('fund_name') and not record.get('fundName'):
                errors.append(f"Row {row_num}: Fund name is required")
                valid = False
            amount = record.get('amount_per_month') or record.get('amountPerMonth') or 0
            if float(amount) <= 0:
                errors.append(f"Row {row_num}: SIP amount must be positive")
                valid = False
            if float(amount) > 1000000:
                warnings.append(f"Row {row_num}: Unusually large SIP amount ₹{amount}")

        elif data_type == 'fd':
            if not record.get('bank_name') and not record.get('bankName'):
                errors.append(f"Row {row_num}: Bank name is required")
                valid = False
            principal = record.get('principal_amount') or record.get('principalAmount') or 0
            if float(principal) <= 0:
                errors.append(f"Row {row_num}: Principal amount must be positive")
                valid = False
            rate = record.get('interest_rate') or record.get('interestRate') or 0
            if float(rate) > 20:
                warnings.append(f"Row {row_num}: Interest rate {rate}% seems unusually high")

        elif data_type == 'stock':
            if not record.get('symbol'):
                errors.append(f"Row {row_num}: Stock symbol is required")
                valid = False
            qty = record.get('quantity') or 0
            if float(qty) <= 0:
                errors.append(f"Row {row_num}: Quantity must be positive")
                valid = False

    return {
        'valid': valid,
        'errors': errors[:50],  # Limit error count
        'warnings': warnings[:20]
    }
