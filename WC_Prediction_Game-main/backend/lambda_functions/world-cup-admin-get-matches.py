"""
AWS Lambda Function: admin_get_matches
Purpose: Fetch all matches for the admin dropdown

This function retrieves all matches from the database and returns them
in a format suitable for populating the admin panel dropdown.

Request Format:
{
    "action": "get_matches"
}

Response Format (Success - HTTP 200):
{
    "status": "success",
    "message": "Matches retrieved successfully",
    "matches": [
        {
            "match_id": "match_001",
            "home_team": "France",
            "away_team": "Argentina",
            "match_date_utc": "2026-06-15T18:00:00",
            "status": "scheduled",
            "home_score": null,
            "away_score": null
        }
    ]
}
"""

import json
import logging
import mysql.connector
import os
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')


def lambda_handler(event, context):
    """
    Main Lambda handler for fetching matches
    """
    try:
        logger.info("[ADMIN_GET_MATCHES] Request received")
        
        # Parse request body
        try:
            if isinstance(event.get('body'), str):
                body = json.loads(event['body'])
            else:
                body = event.get('body', {})
        except json.JSONDecodeError:
            logger.error("[ADMIN_GET_MATCHES] Invalid JSON in request body")
            return error_response(400, "Invalid JSON format")
        
        # Extract action
        action = body.get('action', '').strip()
        
        if not action:
            logger.warning("[ADMIN_GET_MATCHES] Missing action field")
            return error_response(400, "Missing action field")
        
        # Route to appropriate handler
        if action == 'get_matches':
            return handle_get_matches(body)
        else:
            logger.warning(f"[ADMIN_GET_MATCHES] Invalid action: {action}")
            return error_response(400, f"Invalid action: {action}")
    
    except Exception as e:
        logger.error(f"[ADMIN_GET_MATCHES] Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, str(e))


def handle_get_matches(body):
    """
    Fetch all matches from the database
    """
    connection = None
    cursor = None
    
    try:
        logger.info("[GET_MATCHES] Fetching all matches")
        
        # Connect to database
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            connect_timeout=5
        )
        cursor = connection.cursor(dictionary=True)
        
        logger.info("[GET_MATCHES] Database connected")
        
        # Fetch all matches ordered by date
        query = """
        SELECT 
            match_id,
            home_team,
            away_team,
            match_date_utc,
            status,
            home_score,
            away_score,
            home_fifa_rank,
            away_fifa_rank
        FROM matches
        ORDER BY match_date_utc ASC
        """
        
        cursor.execute(query)
        matches = cursor.fetchall()
        
        logger.info(f"[GET_MATCHES] Retrieved {len(matches)} matches")
        
        # Format matches for response
        matches_list = []
        for match in matches:
            matches_list.append({
                'match_id': match['match_id'],
                'home_team': match['home_team'],
                'away_team': match['away_team'],
                'match_date_utc': match['match_date_utc'].isoformat() if match['match_date_utc'] else None,
                'status': match['status'],
                'home_score': match['home_score'],
                'away_score': match['away_score'],
                'home_fifa_rank': match['home_fifa_rank'],
                'away_fifa_rank': match['away_fifa_rank']
            })
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'Matches retrieved successfully',
                'total_matches': len(matches_list),
                'matches': matches_list
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        logger.error(f"[GET_MATCHES] Database error: {str(e)}")
        return error_response(500, "Database error")
    
    except Exception as e:
        logger.error(f"[GET_MATCHES] Error retrieving matches: {str(e)}", exc_info=True)
        return error_response(500, str(e))
    
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception as e:
                logger.warning(f"[GET_MATCHES] Error closing cursor: {str(e)}")
        
        if connection:
            try:
                connection.close()
            except Exception as e:
                logger.warning(f"[GET_MATCHES] Error closing connection: {str(e)}")


def error_response(status_code, message):
    """
    Create standardized error response
    """
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'status': 'error',
            'message': message
        }),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    }