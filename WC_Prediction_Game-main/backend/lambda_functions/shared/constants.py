# shared/constants.py
"""
Shared constants for all Lambda functions
"""

# Database table names
USERS_TABLE = 'users'
MATCHES_TABLE = 'matches'
PREDICTIONS_TABLE = 'predictions'
ADMIN_ACTIONS_TABLE = 'admin_actions'

# Password requirements
MIN_PASSWORD_LENGTH = 8
REQUIRE_UPPERCASE = True
REQUIRE_NUMBERS = True
REQUIRE_SPECIAL_CHARS = False  # Optional, set to True if needed

# JWT Configuration
JWT_SECRET_KEY = 'your-secret-key-change-in-aws'  # Override with environment variable
TOKEN_EXPIRY_HOURS = 1
JWT_ALGORITHM = 'HS256'

# Available countries for sweepstake
SWEEPSTAKE_COUNTRIES = [
    'Argentina', 'Brazil', 'France', 'Germany', 'Spain',
    'England', 'Netherlands', 'Belgium', 'Portugal', 'Italy',
    'Mexico', 'USA', 'Canada', 'Uruguay', 'Colombia',
    'Chile', 'Peru', 'Ecuador', 'Paraguay', 'Venezuela',
    'Japan', 'South Korea', 'Australia', 'Iran', 'Saudi Arabia',
    'Morocco', 'Senegal', 'Tunisia', 'Cameroon', 'Ghana',
    'Ivory Coast', 'Mali', 'Burkina Faso', 'Nigeria'
]

# HTTP Status Codes
HTTP_OK = 200
HTTP_CREATED = 201
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_NOT_FOUND = 404
HTTP_CONFLICT = 409
HTTP_INTERNAL_ERROR = 500