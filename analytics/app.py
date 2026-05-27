from flask import Flask, request, jsonify
from flask_cors import CORS
from services.insights import generate_insights

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': '🐍 Python Analytics Service is running'})


@app.route('/insights', methods=['POST'])
def insights():
    """Generate rule-based insights from portfolio data"""
    try:
        data = request.json
        result = generate_insights(data)
        return jsonify({'success': True, 'insights': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5001))
    print(f'🐍 Starting Python Analytics Service on port {port}...')
    app.run(host='0.0.0.0', port=port, debug=False)
