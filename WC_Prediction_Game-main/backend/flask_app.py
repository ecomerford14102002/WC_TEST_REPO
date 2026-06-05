"""
Flask Backend for World Cup Prediction Game - ADMIN UPDATED
FINAL VERSION: Uses Lambda for ALL database queries (no direct DB connection)
Includes admin endpoints for score entry, users, predictions, and leaderboard
"""

import os
import json
import logging
import requests
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv  

# Load environment variables
load_dotenv()

# Get the absolute path to the public folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(os.path.dirname(BASE_DIR), 'public')

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Lambda URLs from environment
LAMBDA_REGISTRATION_URL = os.getenv('LAMBDA_REGISTRATION_URL')
LAMBDA_LOGIN_URL = os.getenv('LAMBDA_LOGIN_URL')
LAMBDA_TEAM_ASSIGNMENT_URL = os.getenv('LAMBDA_TEAM_ASSIGNMENT_URL')
LAMBDA_LEADERBOARD_URL = os.getenv('LAMBDA_LEADERBOARD_URL')
LAMBDA_MATCHES_URL = os.getenv('LAMBDA_MATCHES_URL')
LAMBDA_SCORE_PREDICTION_URL = os.getenv('LAMBDA_SCORE_PREDICTION_URL')
LAMBDA_USER_PREDICTIONS_URL = os.getenv('LAMBDA_USER_PREDICTIONS_URL')
LAMBDA_PREDICTION_HISTORY_URL = os.getenv('LAMBDA_PREDICTION_HISTORY_URL')

# Admin Lambda URLs
LAMBDA_ADMIN_SCORE_ENTRY_URL = os.getenv('LAMBDA_ADMIN_SCORE_ENTRY_URL')
LAMBDA_ADMIN_USERS_URL = os.getenv('LAMBDA_ADMIN_USERS_URL')
LAMBDA_ADMIN_PREDICTIONS_URL = os.getenv('LAMBDA_ADMIN_PREDICTIONS_URL')
LAMBDA_ADMIN_LEADERBOARD_URL = os.getenv('LAMBDA_ADMIN_LEADERBOARD_URL')
LAMBDA_ADMIN_GET_MATCHES_URL = os.getenv('LAMBDA_ADMIN_GET_MATCHES_URL')

# Log startup
logger.info("=" * 60)
logger.info("Flask Backend Starting")
logger.info("=" * 60)
logger.info(f"Base Directory: {BASE_DIR}")
logger.info(f"Public Directory: {PUBLIC_DIR}")
logger.info(f"Public Directory Exists: {os.path.exists(PUBLIC_DIR)}")
logger.info(f"Index.html Exists: {os.path.exists(os.path.join(PUBLIC_DIR, 'index.html'))}")
logger.info(f"Matches Lambda URL: {LAMBDA_MATCHES_URL}")
logger.info(f"User Predictions Lambda URL: {LAMBDA_USER_PREDICTIONS_URL}")
logger.info(f"Admin Score Entry Lambda URL: {LAMBDA_ADMIN_SCORE_ENTRY_URL}")
logger.info("=" * 60)


# ============================================================================
# FRONTEND ROUTES
# ============================================================================

@app.route('/')
def index():
    """Serve the main HTML file"""
    logger.info("[FRONTEND] Serving index.html")
    index_path = os.path.join(PUBLIC_DIR, 'index.html')
    
    try:
        return send_file(index_path, mimetype='text/html')
    except Exception as e:
        logger.error(f"[FRONTEND] Error serving index.html: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/src/<path:path>')
def serve_src(path):
    """Serve files from src folder"""
    logger.info(f"[FRONTEND] Serving src file: {path}")
    file_path = os.path.join(PUBLIC_DIR, 'src', path)
    
    try:
        return send_file(file_path)
    except Exception as e:
        logger.error(f"[FRONTEND] Error serving src file: {str(e)}")
        return jsonify({'error': str(e)}), 404


# ============================================================================
# API ROUTES - ALL FORWARD TO LAMBDA
# ============================================================================

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Forward matches request to Lambda"""
    try:
        logger.info("[GET_MATCHES] Matches request received")
        
        status_filter = request.args.get('status', None)
        
        if not LAMBDA_MATCHES_URL:
            logger.error("[GET_MATCHES] Lambda URL not configured")
            return jsonify({
                'status': 'error',
                'message': 'Lambda URL not configured'
            }), 500
        
        query_string = ""
        if status_filter:
            query_string = f"?status={status_filter}"
        
        logger.info(f"[GET_MATCHES] Forwarding to Lambda: {LAMBDA_MATCHES_URL}{query_string}")
        
        try:
            response = requests.get(
                f"{LAMBDA_MATCHES_URL}{query_string}",
                timeout=30
            )
            
            logger.info(f"[GET_MATCHES] Lambda response status: {response.status_code}")
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except requests.exceptions.Timeout:
            logger.error("[GET_MATCHES] Lambda request timed out (30 seconds)")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request timed out',
                'error_code': 'TIMEOUT'
            }), 504
        
        except Exception as e:
            logger.error(f"[GET_MATCHES] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[GET_MATCHES] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

    
@app.route('/api/predict', methods=['POST'])
def submit_prediction():
    """Submit a score prediction for a match - forwards to Lambda"""
    try:
        logger.info("[PREDICT] Prediction submission request received")
        
        data = request.get_json()
        logger.info(f"[PREDICT] Request data: {data}")
        
        required_fields = ['user_id', 'jwt_token', 'match_id', 'predicted_home_score', 'predicted_away_score']
        if not data or not all(field in data for field in required_fields):
            logger.error("[PREDICT] Missing required fields")
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400
        
        LAMBDA_SCORE_PREDICTION_URL_LOCAL = os.getenv('LAMBDA_SCORE_PREDICTION_URL')
        
        if not LAMBDA_SCORE_PREDICTION_URL_LOCAL:
            logger.error("[PREDICT] Lambda URL not configured")
            return jsonify({
                'status': 'error',
                'message': 'Lambda URL not configured'
            }), 500
        
        lambda_event = {
            'body': json.dumps({
                'action': 'submit_prediction',
                'user_id': data.get('user_id'),
                'jwt_token': data.get('jwt_token'),
                'match_id': data.get('match_id'),
                'predicted_home_score': data.get('predicted_home_score'),
                'predicted_away_score': data.get('predicted_away_score')
            })
        }
        
        logger.info(f"[PREDICT] Forwarding to Lambda: {LAMBDA_SCORE_PREDICTION_URL_LOCAL}")
        
        try:
            response = requests.post(
                LAMBDA_SCORE_PREDICTION_URL_LOCAL,
                json=lambda_event,
                timeout=30
            )
            
            logger.info(f"[PREDICT] Lambda response status: {response.status_code}")
            logger.info(f"[PREDICT] Lambda response body: {response.text}")
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    logger.info(f"[PREDICT] Parsed response: {actual_response}, Status: {status_code}")
                    return actual_response, status_code
                except json.JSONDecodeError as e:
                    logger.error(f"[PREDICT] Failed to parse body as JSON: {str(e)}")
                    logger.error(f"[PREDICT] Body content: {lambda_response['body']}")
                    return lambda_response, response.status_code
            else:
                logger.info(f"[PREDICT] No body field in response, returning full response")
                return lambda_response, response.status_code
        
        except requests.exceptions.Timeout:
            logger.error("[PREDICT] Lambda request timed out")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request timed out',
                'error_code': 'TIMEOUT'
            }), 504
        
        except requests.exceptions.RequestException as e:
            logger.error(f"[PREDICT] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[PREDICT] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

    
@app.route('/api/user-predictions/<int:user_id>', methods=['GET'])
def get_user_predictions(user_id):
    try:
        logger.info(f"[GET_USER_PREDICTIONS] Fetching predictions for user: {user_id}")
        
        if not LAMBDA_USER_PREDICTIONS_URL:
            logger.error("[GET_USER_PREDICTIONS] Lambda URL not configured")
            return jsonify({'status': 'error', 'message': 'Lambda URL not configured'}), 500
        
        logger.info(f"[GET_USER_PREDICTIONS] Forwarding to Lambda: {LAMBDA_USER_PREDICTIONS_URL}")
        
        try:
            response = requests.post(
                LAMBDA_USER_PREDICTIONS_URL,
                json={
                    'body': json.dumps({
                        'action': 'fetch_user_predictions',
                        'user_id': user_id
                    })
                },
                timeout=30
            )
            
            logger.info(f"[GET_USER_PREDICTIONS] Lambda response status: {response.status_code}")
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except Exception as e:
            logger.error(f"[GET_USER_PREDICTIONS] Lambda request failed: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Lambda request failed'}), 500
    
    except Exception as e:
        logger.error(f"[GET_USER_PREDICTIONS] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@app.route('/api/prediction-history/<int:user_id>', methods=['GET'])
def get_prediction_history(user_id):
    try:
        logger.info(f"[GET_PREDICTION_HISTORY] Fetching finished predictions for user: {user_id}")
        
        if not LAMBDA_PREDICTION_HISTORY_URL:
            logger.error("[GET_PREDICTION_HISTORY] Lambda URL not configured")
            return jsonify({'status': 'error', 'message': 'Lambda URL not configured'}), 500
        
        logger.info(f"[GET_PREDICTION_HISTORY] Forwarding to Lambda: {LAMBDA_PREDICTION_HISTORY_URL}")
        
        try:
            response = requests.post(
                LAMBDA_PREDICTION_HISTORY_URL,
                json={
                    'body': json.dumps({
                        'action': 'fetch_prediction_history',
                        'user_id': user_id
                    })
                },
                timeout=30
            )
            
            logger.info(f"[GET_PREDICTION_HISTORY] Lambda response status: {response.status_code}")
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except Exception as e:
            logger.error(f"[GET_PREDICTION_HISTORY] Lambda request failed: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Lambda request failed'}), 500
    
    except Exception as e:
        logger.error(f"[GET_PREDICTION_HISTORY] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    logger.info("[HEALTH] Health check requested")
    return jsonify({
        'status': 'success',
        'message': 'Flask backend is running'
    }), 200


@app.route('/api/register', methods=['POST'])
def register():
    """Forward registration request to Lambda"""
    try:
        logger.info("[REGISTER] Registration request received")
        
        data = request.get_json()
        
        if not data or not all(k in data for k in ['email', 'username', 'password', 'office_location']):
            logger.error("[REGISTER] Missing required fields")
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400
        
        lambda_event = {
            'body': json.dumps({
                'email': data.get('email'),
                'username': data.get('username'),
                'password': data.get('password'),
                'office_location': data.get('office_location')
            })
        }
        
        logger.info(f"[REGISTER] Forwarding to Lambda: {LAMBDA_REGISTRATION_URL}")
        
        try:
            response = requests.post(
                LAMBDA_REGISTRATION_URL,
                json=lambda_event,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
            
        except Exception as e:
            logger.error(f"[REGISTER] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[REGISTER] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


@app.route('/api/login', methods=['POST'])
def login():
    """Forward login request to Lambda"""
    try:
        logger.info("[LOGIN] Login request received")
        
        data = request.get_json()
        
        if not data or not all(k in data for k in ['email', 'password']):
            logger.error("[LOGIN] Missing required fields")
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400
        
        lambda_event = {
            'body': json.dumps({
                'email': data.get('email'),
                'password': data.get('password')
            })
        }
        
        logger.info(f"[LOGIN] Forwarding to Lambda: {LAMBDA_LOGIN_URL}")
        
        try:
            response = requests.post(
                LAMBDA_LOGIN_URL,
                json=lambda_event,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
            
        except Exception as e:
            logger.error(f"[LOGIN] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[LOGIN] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


@app.route('/api/team-assignment', methods=['POST'])
def team_assignment():
    """Forward team assignment requests to Lambda"""
    try:
        logger.info("[TEAM_ASSIGNMENT] Team assignment request received")
        
        data = request.get_json()
        
        if not data or 'action' not in data:
            logger.error("[TEAM_ASSIGNMENT] Missing action field")
            return jsonify({
                'status': 'error',
                'message': 'Missing action field'
            }), 400
        
        lambda_event = {
            'body': json.dumps(data)
        }
        
        logger.info(f"[TEAM_ASSIGNMENT] Forwarding to Lambda: {LAMBDA_TEAM_ASSIGNMENT_URL}")
        
        try:
            response = requests.post(
                LAMBDA_TEAM_ASSIGNMENT_URL,
                json=lambda_event,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
            
        except Exception as e:
            logger.error(f"[TEAM_ASSIGNMENT] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[TEAM_ASSIGNMENT] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


@app.route('/api/leaderboard', methods=['POST'])
def leaderboard():
    """Forward leaderboard requests to Lambda"""
    try:
        logger.info("[LEADERBOARD] Leaderboard request received")
        
        data = request.get_json()
        
        if not data or 'action' not in data:
            logger.error("[LEADERBOARD] Missing action field")
            return jsonify({
                'status': 'error',
                'message': 'Missing action field'
            }), 400
        
        lambda_event = {
            'body': json.dumps(data)
        }
        
        logger.info(f"[LEADERBOARD] Forwarding to Lambda: {LAMBDA_LEADERBOARD_URL}")
        
        try:
            response = requests.post(
                LAMBDA_LEADERBOARD_URL,
                json=lambda_event,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
            
        except Exception as e:
            logger.error(f"[LEADERBOARD] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[LEADERBOARD] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


# ============================================================================
# ADMIN ROUTES
# ============================================================================

@app.route('/api/admin/enter-score', methods=['POST'])
def admin_enter_score():
    """
    Forward admin score entry to Lambda
    
    Request body:
    {
        "action": "enter_score",
        "admin_user_id": 1,
        "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "match_id": "match_001",
        "home_score": 2,
        "away_score": 1
    }
    
    Response:
    {
        "status": "success",
        "message": "Score entered and points calculated",
        "match_id": "match_001",
        "home_team": "France",
        "away_team": "Argentina",
        "home_score": 2,
        "away_score": 1,
        "predictions_updated": 45,
        "admin_action_id": 123
    }
    """
    try:
        logger.info("[ADMIN_SCORE] Score entry request received")
        
        data = request.get_json()
        
        if not data:
            logger.error("[ADMIN_SCORE] Missing request body")
            return jsonify({
                'status': 'error',
                'message': 'Missing request body'
            }), 400
        
        if not LAMBDA_ADMIN_SCORE_ENTRY_URL:
            logger.error("[ADMIN_SCORE] Lambda URL not configured")
            return jsonify({
                'status': 'error',
                'message': 'Lambda URL not configured'
            }), 500
        
        lambda_event = {'body': json.dumps(data)}
        
        logger.info(f"[ADMIN_SCORE] Forwarding to Lambda: {LAMBDA_ADMIN_SCORE_ENTRY_URL}")
        
        try:
            response = requests.post(
                LAMBDA_ADMIN_SCORE_ENTRY_URL,
                json=lambda_event,
                timeout=30
            )
            
            logger.info(f"[ADMIN_SCORE] Lambda response status: {response.status_code}")
            logger.info(f"[ADMIN_SCORE] Lambda response body: {response.text}")
            
            lambda_response = response.json()
            
            # Handle wrapped response from Lambda
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    logger.info(f"[ADMIN_SCORE] Parsed response: {actual_response}, Status: {status_code}")
                    return actual_response, status_code
                except json.JSONDecodeError as e:
                    logger.error(f"[ADMIN_SCORE] Failed to parse body as JSON: {str(e)}")
                    logger.error(f"[ADMIN_SCORE] Body content: {lambda_response['body']}")
                    return lambda_response, response.status_code
            else:
                logger.info(f"[ADMIN_SCORE] No body field in response, returning full response")
                return lambda_response, response.status_code
        
        except requests.exceptions.Timeout:
            logger.error("[ADMIN_SCORE] Lambda request timed out")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request timed out',
                'error_code': 'TIMEOUT'
            }), 504
        
        except requests.exceptions.RequestException as e:
            logger.error(f"[ADMIN_SCORE] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[ADMIN_SCORE] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    """Forward admin users request to Lambda"""
    try:
        logger.info("[ADMIN_USERS] Users request received")
        
        if not LAMBDA_ADMIN_USERS_URL:
            logger.error("[ADMIN_USERS] Lambda URL not configured")
            return jsonify({'status': 'error', 'message': 'Lambda URL not configured'}), 500
        
        logger.info(f"[ADMIN_USERS] Forwarding to Lambda: {LAMBDA_ADMIN_USERS_URL}")
        
        try:
            response = requests.get(
                LAMBDA_ADMIN_USERS_URL,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except Exception as e:
            logger.error(f"[ADMIN_USERS] Lambda request failed: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Lambda request failed'}), 500
    
    except Exception as e:
        logger.error(f"[ADMIN_USERS] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@app.route('/api/admin/predictions', methods=['GET'])
def admin_get_predictions():
    """Forward admin predictions request to Lambda"""
    try:
        logger.info("[ADMIN_PREDICTIONS] Predictions request received")
        
        if not LAMBDA_ADMIN_PREDICTIONS_URL:
            logger.error("[ADMIN_PREDICTIONS] Lambda URL not configured")
            return jsonify({'status': 'error', 'message': 'Lambda URL not configured'}), 500
        
        logger.info(f"[ADMIN_PREDICTIONS] Forwarding to Lambda: {LAMBDA_ADMIN_PREDICTIONS_URL}")
        
        try:
            response = requests.get(
                LAMBDA_ADMIN_PREDICTIONS_URL,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except Exception as e:
            logger.error(f"[ADMIN_PREDICTIONS] Lambda request failed: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Lambda request failed'}), 500
    
    except Exception as e:
        logger.error(f"[ADMIN_PREDICTIONS] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@app.route('/api/admin/leaderboard', methods=['GET'])
def admin_get_leaderboard():
    """Forward admin leaderboard request to Lambda"""
    try:
        logger.info("[ADMIN_LEADERBOARD] Leaderboard request received")
        
        if not LAMBDA_ADMIN_LEADERBOARD_URL:
            logger.error("[ADMIN_LEADERBOARD] Lambda URL not configured")
            return jsonify({'status': 'error', 'message': 'Lambda URL not configured'}), 500
        
        logger.info(f"[ADMIN_LEADERBOARD] Forwarding to Lambda: {LAMBDA_ADMIN_LEADERBOARD_URL}")
        
        try:
            response = requests.get(
                LAMBDA_ADMIN_LEADERBOARD_URL,
                timeout=30
            )
            
            lambda_response = response.json()
            
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except Exception as e:
            logger.error(f"[ADMIN_LEADERBOARD] Lambda request failed: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Lambda request failed'}), 500
    
    except Exception as e:
        logger.error(f"[ADMIN_LEADERBOARD] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500
    
# ============================================================================
# ADMIN GET MATCHES ROUTE
# ============================================================================

@app.route('/api/admin/get-matches', methods=['POST'])
def admin_get_matches():
    """
    Forward admin get matches request to Lambda
    
    Request body:
    {
        "action": "get_matches"
    }
    
    Response:
    {
        "status": "success",
        "message": "Matches retrieved successfully",
        "total_matches": 64,
        "matches": [...]
    }
    """
    try:
        logger.info("[ADMIN_GET_MATCHES] Request received")
        
        data = request.get_json()
        
        if not data:
            logger.error("[ADMIN_GET_MATCHES] Missing request body")
            return jsonify({
                'status': 'error',
                'message': 'Missing request body'
            }), 400
        
        if not LAMBDA_ADMIN_GET_MATCHES_URL:
            logger.error("[ADMIN_GET_MATCHES] Lambda URL not configured")
            return jsonify({
                'status': 'error',
                'message': 'Lambda URL not configured'
            }), 500
        
        lambda_event = {'body': json.dumps(data)}
        
        logger.info(f"[ADMIN_GET_MATCHES] Forwarding to Lambda: {LAMBDA_ADMIN_GET_MATCHES_URL}")
        
        try:
            response = requests.post(
                LAMBDA_ADMIN_GET_MATCHES_URL,
                json=lambda_event,
                timeout=30
            )
            
            logger.info(f"[ADMIN_GET_MATCHES] Lambda response status: {response.status_code}")
            
            lambda_response = response.json()
            
            # Handle wrapped response from Lambda
            if 'body' in lambda_response:
                try:
                    actual_response = json.loads(lambda_response['body'])
                    status_code = lambda_response.get('statusCode', 200)
                    return actual_response, status_code
                except json.JSONDecodeError:
                    return lambda_response, response.status_code
            else:
                return lambda_response, response.status_code
        
        except requests.exceptions.Timeout:
            logger.error("[ADMIN_GET_MATCHES] Lambda request timed out")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request timed out',
                'error_code': 'TIMEOUT'
            }), 504
        
        except requests.exceptions.RequestException as e:
            logger.error(f"[ADMIN_GET_MATCHES] Lambda request failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Lambda request failed',
                'error_code': 'LAMBDA_ERROR'
            }), 500
    
    except Exception as e:
        logger.error(f"[ADMIN_GET_MATCHES] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)