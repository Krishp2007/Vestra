from flask import Flask, request, jsonify
from flask_cors import CORS
from services.csv_parser import parse_csv_file, validate_data
from services.calculator import calculate_xirr, calculate_cagr, calculate_fd_maturity, portfolio_summary
from services.insights import generate_insights
from services.anomaly import detect_anomalies

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': '🐍 Python Analytics Service is running'})


@app.route('/parse-csv', methods=['POST'])
def parse_csv():
    """Parse uploaded CSV/Excel file and return structured data"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        data_type = request.form.get('type', 'sip')  # sip, fd, stock

        result = parse_csv_file(file, data_type)
        return jsonify({
            'success': True,
            'data': result['data'],
            'columns': result['columns'],
            'rowCount': result['rowCount'],
            'warnings': result.get('warnings', [])
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/validate', methods=['POST'])
def validate():
    """Validate parsed data before import"""
    try:
        data = request.json
        result = validate_data(data.get('records', []), data.get('type', 'sip'))
        return jsonify({
            'success': True,
            'valid': result['valid'],
            'errors': result['errors'],
            'warnings': result['warnings']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/calculate', methods=['POST'])
def calculate():
    """Run financial calculations"""
    try:
        data = request.json
        calc_type = data.get('type', 'summary')

        if calc_type == 'xirr':
            result = calculate_xirr(data.get('cashflows', []))
        elif calc_type == 'cagr':
            result = calculate_cagr(
                data.get('beginValue', 0),
                data.get('endValue', 0),
                data.get('years', 1)
            )
        elif calc_type == 'fd_maturity':
            result = calculate_fd_maturity(
                data.get('principal', 0),
                data.get('rate', 0),
                data.get('years', 1),
                data.get('compounding', 'quarterly')
            )
        elif calc_type == 'summary':
            result = portfolio_summary(data.get('portfolio', {}))
        else:
            return jsonify({'error': f'Unknown calculation type: {calc_type}'}), 400

        return jsonify({'success': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/insights', methods=['POST'])
def insights():
    """Generate rule-based insights from portfolio data"""
    try:
        data = request.json
        result = generate_insights(data)
        return jsonify({'success': True, 'insights': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/detect-anomalies', methods=['POST'])
def anomalies():
    """Detect anomalies in financial data"""
    try:
        data = request.json
        result = detect_anomalies(data.get('records', []), data.get('type', 'sip'))
        return jsonify({'success': True, 'anomalies': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('🐍 Starting Python Analytics Service on port 5001...')
    app.run(host='0.0.0.0', port=5001, debug=True)
