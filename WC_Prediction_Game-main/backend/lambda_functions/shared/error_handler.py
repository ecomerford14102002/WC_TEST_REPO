"""
Shared Error Handler
Purpose: Centralized error and success response formatting for all Lambda functions
"""

import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# HTTP Status Codes
HTTP_OK = 200
HTTP_CREATED = 201
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_CONFLICT = 409
HTTP_INTERNAL_SERVER_ERROR = 500


def error_response(status_code, message, error_code=None):
    """
    Generic error response formatter
    
    Args:
        status_code (int): HTTP status code
        message (str): Error message
        error_code (str): Error code identifier
        
    Returns:
        dict: Formatted error response
    """
    response = {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps({
            'status': 'error',
            'message': message,
            'error_code': error_code
        })
    }
    return response


def success_response(status_code, message, data=None):
    """
    Generic success response formatter
    
    Args:
        status_code (int): HTTP status code
        message (str): Success message
        data (dict): Additional data to include
        
    Returns:
        dict: Formatted success response
    """
    body = {
        'status': 'success',
        'message': message
    }
    
    if data:
        body.update(data)
    
    response = {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps(body)
    }
    return response


# ============================================================================
# ERROR RESPONSES
# ============================================================================

def error_invalid_email():
    """Invalid email format"""
    return error_response(
        HTTP_BAD_REQUEST,
        'Invalid email format',
        'INVALID_EMAIL'
    )


def error_invalid_password():
    """Password does not meet requirements"""
    return error_response(
        HTTP_BAD_REQUEST,
        'Password must be at least 8 characters, contain uppercase letter and number',
        'INVALID_PASSWORD'
    )


def error_invalid_username():
    """Invalid username format"""
    return error_response(
        HTTP_BAD_REQUEST,
        'Username must be 3-20 characters, alphanumeric and underscores only',
        'INVALID_USERNAME'
    )


def error_invalid_country():
    """Invalid country selection"""
    return error_response(
        HTTP_BAD_REQUEST,
        'Invalid office location or country selection',
        'INVALID_COUNTRY'
    )


def error_email_exists():
    """Email already registered"""
    return error_response(
        HTTP_CONFLICT,
        'Email already registered',
        'EMAIL_EXISTS'
    )


def error_username_exists():
    """Username already taken"""
    return error_response(
        HTTP_CONFLICT,
        'Username already taken',
        'USERNAME_EXISTS'
    )


def error_invalid_credentials():
    """Invalid email or password"""
    return error_response(
        HTTP_UNAUTHORIZED,
        'Invalid email or password',
        'INVALID_CREDENTIALS'
    )


def error_user_not_found():
    """User not found"""
    return error_response(
        HTTP_UNAUTHORIZED,
        'User not found',
        'USER_NOT_FOUND'
    )


def error_invalid_token():
    """Invalid or expired token"""
    return error_response(
        HTTP_UNAUTHORIZED,
        'Invalid or expired token',
        'INVALID_TOKEN'
    )


def error_missing_field(field_name):
    """Missing required field"""
    return error_response(
        HTTP_BAD_REQUEST,
        f'Missing required field: {field_name}',
        'MISSING_FIELD'
    )


def error_already_assigned():
    """User already has team assigned"""
    return error_response(
        HTTP_CONFLICT,
        'User already has a team assigned',
        'ALREADY_ASSIGNED'
    )


def error_all_countries_assigned():
    """All countries have been assigned"""
    return error_response(
        HTTP_CONFLICT,
        'All countries have been assigned',
        'ALL_COUNTRIES_ASSIGNED'
    )


def error_db_connection():
    """Database connection error"""
    return error_response(
        HTTP_INTERNAL_SERVER_ERROR,
        'Database connection error',
        'DB_CONNECTION_ERROR'
    )


def error_internal_server_error(message='Internal server error'):
    """Internal server error"""
    return error_response(
        HTTP_INTERNAL_SERVER_ERROR,
        message,
        'INTERNAL_SERVER_ERROR'
    )


# ============================================================================
# SUCCESS RESPONSES
# ============================================================================

def success_login(user_id, email, username, jwt_token, token_expires_in):
    """Successful login"""
    return success_response(
        HTTP_OK,
        'Login successful',
        {
            'user_id': user_id,
            'email': email,
            'username': username,
            'jwt_token': jwt_token,
            'token_expires_in': token_expires_in
        }
    )


def success_user_registered(user_id, email, username, office_location, jwt_token=None, token_expires_in=None):
    """Successful user registration"""
    data = {
        'user_id': user_id,
        'email': email,
        'username': username,
        'office_location': office_location
    }
    
    if jwt_token:
        data['jwt_token'] = jwt_token
    
    if token_expires_in:
        data['token_expires_in'] = token_expires_in
    
    return success_response(
        HTTP_CREATED,
        'User registered successfully',
        data
    )


def success_sweepstake_assigned(user_id, assigned_team, assignment_date):
    """Successful team assignment"""
    return success_response(
        HTTP_OK,
        'Team assigned successfully',
        {
            'user_id': user_id,
            'assigned_team': assigned_team,
            'assignment_date': assignment_date
        }
    )


def success_prediction_saved(user_id, prediction_type, prediction_value):
    """Successful prediction saved"""
    return success_response(
        HTTP_OK,
        f'{prediction_type} prediction saved',
        {
            'user_id': user_id,
            'prediction_type': prediction_type,
            'prediction_value': prediction_value
        }
    )