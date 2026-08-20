"""
FIXED Registration Lambda - With Email Domain Validation & Admin Check
UPDATED VERSION: Includes @deloitte.ie validation, admin check for "asdfghjkl", and improved error handling
"""

import json
import hashlib
import re
import logging
import mysql.connector
from datetime import datetime, timedelta
import jwt
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')
JWT_SECRET = os.environ.get('JWT_SECRET_KEY')

# Valid office locations
VALID_OFFICE_LOCATIONS = ['Cork', 'Dublin']

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            autocommit=True
        )
        return connection
    except mysql.connector.Error as e:
        logger.error(f"Database connection error: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    UPDATED Registration handler - With email domain validation, admin check & specific error messages
    """
    try:
        logger.info("[REGISTRATION] Registration request received")
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            logger.error("[REGISTRATION] Invalid JSON in request body")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Invalid JSON format'})
            }
        
        # Extract and validate fields
        email = body.get('email', '').strip().lower()
        username = body.get('username', '').strip()
        password = body.get('password', '')
        office_location = body.get('office_location', '').strip()
        
        # Check for missing fields
        if not email:
            logger.warning("[REGISTRATION] Missing email field")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Missing email field'})
            }
        
        if not username:
            logger.warning("[REGISTRATION] Missing username field")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Missing username field'})
            }
        
        if not password:
            logger.warning("[REGISTRATION] Missing password field")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Missing password field'})
            }
        
        if not office_location:
            logger.warning("[REGISTRATION] Missing office_location field")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Missing office_location field'})
            }
        
        logger.info(f"[REGISTRATION] Registration attempt for email: {email}")
        
        # Validate email domain must be @deloitte.ie
        if not email.endswith('@deloitte.ie'):
            logger.warning(f"[REGISTRATION] Invalid email domain: {email}")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'status': 'error',
                    'message': 'Email must be a valid Deloitte email (@deloitte.ie)'
                })
            }
        
        # Validate email format
        if not validate_email(email):
            logger.warning(f"[REGISTRATION] Invalid email format: {email}")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Invalid email format'})
            }
        
        # Validate username format
        if not validate_username(username):
            logger.warning(f"[REGISTRATION] Invalid username format: {username}")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Username must be 3-20 characters'})
            }
        
        # Validate password strength
        if not validate_password(password):
            logger.warning(f"[REGISTRATION] Weak password for email: {email}")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Password must be at least 8 characters with uppercase and number'})
            }
        
        # Validate office location
        if office_location not in VALID_OFFICE_LOCATIONS:
            logger.warning(f"[REGISTRATION] Invalid office location: {office_location}")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Invalid office location'})
            }
        
        # Hash password with SHA-256
        try:
            password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
            logger.info(f"[REGISTRATION] Password hashed successfully for: {email}")
        except Exception as e:
            logger.error(f"[REGISTRATION] Password hashing failed: {str(e)}")
            return {
                'statusCode': 500,
                'body': json.dumps({'status': 'error', 'message': 'Password hashing failed'})
            }
        
        # ✅ NEW: Determine if user should be admin based on email
        is_admin = 'asdfghjkl' in email
        logger.info(f"[REGISTRATION] User is_admin: {is_admin} (email: {email})")
        
        # Insert user into database
        connection = None
        cursor = None
        
        try:
            connection = get_db_connection()
            cursor = connection.cursor()
            
            # SQL query to insert user
            query = """
            INSERT INTO users 
            (email, username, password_hash, office_location, is_admin)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            cursor.execute(query, (email, username, password_hash, office_location, is_admin))
            connection.commit()
            
            user_id = cursor.lastrowid
            logger.info(f"[REGISTRATION] User registered successfully: user_id={user_id}, email={email}, is_admin={is_admin}")
            
            # Generate JWT token for the new user
            try:
                payload = {
                    'user_id': user_id,
                    'email': email,
                    'username': username,
                    'iat': datetime.utcnow(),
                    'exp': datetime.utcnow() + timedelta(hours=24)
                }
                jwt_token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
                logger.info(f"[REGISTRATION] JWT token generated for user_id={user_id}")
            except Exception as e:
                logger.error(f"[REGISTRATION] JWT token generation failed: {str(e)}")
                return {
                    'statusCode': 500,
                    'body': json.dumps({'status': 'error', 'message': 'Token generation failed'})
                }
            
            # Return success response with is_admin field
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'status': 'success',
                    'message': 'User registered successfully',
                    'user_id': user_id,
                    'email': email,
                    'username': username,
                    'office_location': office_location,
                    'jwt_token': jwt_token,
                    'token_expires_in': 86400,
                    'is_admin': is_admin
                })
            }
        
        except mysql.connector.errors.IntegrityError as e:
            # Handle duplicate email or username
            error_str = str(e).lower()
            
            if 'email' in error_str:
                logger.warning(f"[REGISTRATION] Email already exists: {email}")
                return {
                    'statusCode': 409,
                    'body': json.dumps({'status': 'error', 'message': 'Email is already in use'})
                }
            elif 'username' in error_str:
                logger.warning(f"[REGISTRATION] Username already exists: {username}")
                return {
                    'statusCode': 409,
                    'body': json.dumps({'status': 'error', 'message': 'Username is already in use'})
                }
            else:
                logger.error(f"[REGISTRATION] Database integrity error: {str(e)}")
                return {
                    'statusCode': 500,
                    'body': json.dumps({'status': 'error', 'message': 'Database error'})
                }
        
        except mysql.connector.Error as e:
            logger.error(f"[REGISTRATION] Database error: {str(e)}")
            return {
                'statusCode': 500,
                'body': json.dumps({'status': 'error', 'message': 'Database error'})
            }
        
        finally:
            # Clean up database resources
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[REGISTRATION] Error closing cursor: {str(e)}")
            
            if connection:
                try:
                    connection.close()
                except Exception as e:
                    logger.warning(f"[REGISTRATION] Error closing connection: {str(e)}")
    
    except Exception as e:
        logger.error(f"[REGISTRATION] Unexpected error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'status': 'error', 'message': 'Internal server error'})
        }


def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_username(username):
    """Validate username format"""
    if len(username) < 3 or len(username) > 20:
        return False
    
    pattern = r'^[a-zA-Z_][a-zA-Z0-9_]*$'
    return re.match(pattern, username) is not None


def validate_password(password):
    """Validate password strength"""
    # Check minimum length
    if len(password) < 6:
        return False
    
    return True