"""
FIXED Login Lambda - With Password Hashing & is_admin Return
"""

import json
import logging
import mysql.connector
import jwt
import os
import hashlib
from datetime import datetime, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')
JWT_SECRET = os.environ.get('JWT_SECRET_KEY')

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
    FIXED Login handler - With proper password hashing and is_admin return
    """
    try:
        logger.info("[LOGIN] Request received")
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            logger.error("[LOGIN] Invalid JSON")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Invalid JSON'})
            }
        
        email = body.get('email', '').strip().lower()
        password = body.get('password', '').strip()
        
        logger.info(f"[LOGIN] Login attempt for: {email}")
        
        # Validate inputs
        if not email or not password:
            logger.warning("[LOGIN] Missing email or password")
            return {
                'statusCode': 400,
                'body': json.dumps({'status': 'error', 'message': 'Missing email or password'})
            }
        
        connection = None
        cursor = None
        
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            # Query user from database - INCLUDE is_admin
            query = """
            SELECT 
                user_id,
                username,
                email,
                password_hash,
                is_admin
            FROM users
            WHERE LOWER(email) = %s
            """
            
            cursor.execute(query, (email,))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"[LOGIN] User not found: {email}")
                return {
                    'statusCode': 401,
                    'body': json.dumps({'status': 'error', 'message': 'Invalid email or password'})
                }
            
            logger.info(f"[LOGIN] User found: {email}")
            
            # Hash the incoming password before comparison
            password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
            logger.info(f"[LOGIN] Password hashed for comparison")
            
            # Compare hashed passwords
            if user['password_hash'] != password_hash:
                logger.warning(f"[LOGIN] Invalid password for user: {email}")
                return {
                    'statusCode': 401,
                    'body': json.dumps({'status': 'error', 'message': 'Invalid email or password'})
                }
            
            logger.info(f"[LOGIN] Password verified for: {email}")
            
            # Generate JWT token
            payload = {
                'user_id': user['user_id'],
                'email': user['email'],
                'username': user['username'],
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=24)
            }
            
            jwt_token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
            
            logger.info(f"[LOGIN] User logged in: {email}, is_admin: {user['is_admin']}")
            
            # Return response with is_admin field
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'status': 'success',
                    'user_id': user['user_id'],
                    'username': user['username'],
                    'email': user['email'],
                    'jwt_token': jwt_token,
                    'is_admin': bool(user['is_admin'])
                })
            }
        
        except mysql.connector.Error as e:
            logger.error(f"[LOGIN] Database error: {str(e)}")
            return {
                'statusCode': 500,
                'body': json.dumps({'status': 'error', 'message': 'Database error'})
            }
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[LOGIN] Error closing cursor: {str(e)}")
            
            if connection:
                try:
                    connection.close()
                except Exception as e:
                    logger.warning(f"[LOGIN] Error closing connection: {str(e)}")
    
    except Exception as e:
        logger.error(f"[LOGIN] Unexpected error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'status': 'error', 'message': 'Internal server error'})
        }