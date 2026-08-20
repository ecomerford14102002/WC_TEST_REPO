"""
AWS Lambda Function: admin-users
Purpose: Get all users with their points and prediction counts
Database: AWS RDS MySQL
"""

import json
import logging
import os
import mysql.connector
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Database configuration from environment variables
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')


def lambda_handler(event, context):
    """
    Main Lambda handler for getting all users
    
    Returns:
        dict: Lambda response with status code and body
    """
    
    logger.info("[ADMIN_USERS] Request received")
    logger.info(f"[ADMIN_USERS] Event: {json.dumps(event)}")
    
    try:
        # Validate database configuration
        if not all([DB_HOST, DB_USER, DB_PASSWORD, DB_NAME]):
            logger.error("[ADMIN_USERS] Missing database configuration")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'error',
                    'message': 'Database configuration missing'
                })
            }
        
        # Connect to database
        logger.info("[ADMIN_USERS] Connecting to database...")
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            connect_timeout=5,
            autocommit=True
        )
        cursor = connection.cursor(dictionary=True)
        
        logger.info("[ADMIN_USERS] Database connected successfully")
        
        # Query to get users with their points and prediction counts
        query = """
        SELECT 
            u.user_id as id,
            u.username,
            u.email,
            u.office_location,
            u.sweepstake_country,
            COALESCE(SUM(p.points_earned), 0) as total_points,
            COUNT(DISTINCT p.prediction_id) as prediction_count,
            u.is_admin,
            u.created_at
        FROM users u
        LEFT JOIN predictions p ON u.user_id = p.user_id
        GROUP BY u.user_id
        ORDER BY u.created_at DESC
        """
        
        logger.info("[ADMIN_USERS] Executing query...")
        cursor.execute(query)
        users = cursor.fetchall()
        
        logger.info(f"[ADMIN_USERS] Retrieved {len(users)} users")
        
        cursor.close()
        connection.close()
        
        logger.info("[ADMIN_USERS] Database connection closed")
        
        # Format users for response
        users_list = []
        for user in users:
            try:
                users_list.append({
                    'id': user['id'],
                    'username': user['username'] or 'Unknown',
                    'email': user['email'] or 'Unknown',
                    'office_location': user['office_location'] or 'Unknown',
                    'sweepstake_country': user['sweepstake_country'] or 'Not Assigned',
                    'total_points': int(user['total_points']) if user['total_points'] else 0,
                    'prediction_count': int(user['prediction_count']) if user['prediction_count'] else 0,
                    'is_admin': bool(user['is_admin']),
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None
                })
            except Exception as e:
                logger.warning(f"[ADMIN_USERS] Error formatting user {user.get('id')}: {str(e)}")
                continue
        
        logger.info(f"[ADMIN_USERS] Formatted {len(users_list)} users for response")
        
        # Return success response
        response = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'status': 'success',
                'message': 'Users retrieved successfully',
                'users': users_list,
                'total': len(users_list)
            })
        }
        
        logger.info(f"[ADMIN_USERS] Returning response with {len(users_list)} users")
        return response
    
    except mysql.connector.Error as e:
        logger.error(f"[ADMIN_USERS] Database error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'error',
                'message': f'Database error: {str(e)}'
            })
        }
    
    except Exception as e:
        logger.error(f"[ADMIN_USERS] Unexpected error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'error',
                'message': f'Internal server error: {str(e)}'
            })
        }