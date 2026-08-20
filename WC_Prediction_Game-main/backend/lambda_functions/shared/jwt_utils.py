# shared/jwt_utils.py
"""
JWT token generation and verification utilities
"""

import jwt
import os
import logging
from datetime import datetime, timedelta
from shared.constants import JWT_ALGORITHM, TOKEN_EXPIRY_HOURS

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Get secret key from environment variable, fallback to constant
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-aws')


def generate_jwt_token(user_id, email, username):
    """
    Generate JWT token for authenticated user
    
    Args:
        user_id (int): User ID
        email (str): User email
        username (str): Username
        
    Returns:
        str: Encoded JWT token
        
    Raises:
        Exception: If token generation fails
    """
    try:
        payload = {
            'user_id': user_id,
            'email': email,
            'username': username,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
        }
        
        token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
        logger.info(f"[JWT] Token generated for user_id={user_id}")
        return token
    except Exception as e:
        logger.error(f"[JWT] Token generation failed: {str(e)}")
        raise


def verify_jwt_token(token):
    """
    Verify JWT token and extract payload
    
    Args:
        token (str): JWT token to verify
        
    Returns:
        dict: {
            'valid': bool,
            'payload': dict (if valid),
            'error': str (if invalid)
        }
        
    Example:
        result = verify_jwt_token(token)
        if result['valid']:
            user_id = result['payload']['user_id']
        else:
            error = result['error']
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        logger.info(f"[JWT] Token verified for user_id={payload.get('user_id')}")
        return {
            'valid': True,
            'payload': payload
        }
    except jwt.ExpiredSignatureError:
        logger.warning("[JWT] Token has expired")
        return {
            'valid': False,
            'error': 'Token expired'
        }
    except jwt.InvalidTokenError as e:
        logger.warning(f"[JWT] Invalid token: {str(e)}")
        return {
            'valid': False,
            'error': 'Invalid token'
        }
    except Exception as e:
        logger.error(f"[JWT] Token verification error: {str(e)}")
        return {
            'valid': False,
            'error': 'Token verification failed'
        }


def get_token_expiry_timestamp():
    """
    Get the expiry timestamp for a new token
    
    Returns:
        int: Unix timestamp when token expires
    """
    expiry = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
    return int(expiry.timestamp())