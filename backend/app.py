from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This allows requests from React (frontend)

@app.route('/', methods=['GET'])
def home():
    return "Backend is running!"


@app.route('/sendPayment', methods=['POST'])
def send_payment():
    data = request.get_json()

    # Simulated processing
    upi_id = data.get('upi_id')
    amount = data.get('amount')

    print(f"Simulating payment of ₹{amount} to {upi_id}...")

    return jsonify({
        'status': 'success',
        'message': f'Successfully sent ₹{amount} to {upi_id}'
    })

if __name__ == '__main__':
    app.run(debug=True)
