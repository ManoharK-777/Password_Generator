from flask import Flask, render_template, request, jsonify
import secrets
import string
import math

app = Flask(__name__)

def calculate_entropy(length, pool_size):
    if pool_size == 0 or length == 0:
        return 0
    return round(length * math.log2(pool_size))

def determine_strength(entropy):
    if entropy < 50:
        return 'Weak'
    elif entropy < 80:
        return 'Medium'
    else:
        return 'Strong'

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    # Increase max length support as requested by V2 framework
    length = int(data.get('length', 16))
    use_upper = data.get('uppercase', True)
    use_lower = data.get('lowercase', True)
    use_numbers = data.get('numbers', True)
    use_symbols = data.get('symbols', True)
    
    char_pools = []
    pool_size = 0
    
    if use_lower:
        char_pools.append(string.ascii_lowercase)
        pool_size += 26
    if use_upper:
        char_pools.append(string.ascii_uppercase)
        pool_size += 26
    if use_numbers:
        char_pools.append(string.digits)
        pool_size += 10
    if use_symbols:
        char_pools.append(string.punctuation)
        pool_size += len(string.punctuation)
        
    if not char_pools:
        # Failsafe if unassigned
        char_pools.append(string.ascii_lowercase)
        pool_size = 26
        
    # Ensure at least one character from each selected pool is used if length allows
    password_chars = []
    for pool in char_pools:
        if len(password_chars) < length:
            password_chars.append(secrets.choice(pool))
            
    # Fill the rest securely
    all_chars = "".join(char_pools)
    while len(password_chars) < length:
        password_chars.append(secrets.choice(all_chars))
        
    # Python securely shuffles
    # secrets does not have an in-place shuffle natively exposed safely in older pythons like random.shuffle, 
    # but we can use SystemRandom which uses os.urandom
    rng = secrets.SystemRandom()
    rng.shuffle(password_chars)
    password = "".join(password_chars)
    
    entropy_score = calculate_entropy(length, pool_size)
    strength = determine_strength(entropy_score)
    
    return jsonify({
        "password": password,
        "strength": strength,
        "entropy": entropy_score
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
