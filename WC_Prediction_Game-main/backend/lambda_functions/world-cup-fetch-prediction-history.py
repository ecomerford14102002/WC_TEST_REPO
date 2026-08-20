"""
AWS Lambda Function: fetch_prediction_history
Purpose: Retrieve user's prediction history (SIMPLIFIED VERSION)
Note: JWT verification is done by Flask
Author: World Cup Prediction Game Team
Date: 2026-06-04
"""

import json
import logging
import os
import mysql.connector

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
    Main Lambda handler for prediction history requests
    SIMPLIFIED: Just fetch predictions without complex joins
    """
    
    logger.info(f"[PREDICTION_HISTORY] Request received")
    
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        user_id = body.get('user_id')
        
        logger.info(f"[PREDICTION_HISTORY] user_id={user_id}")
        
        # Validate required fields
        if not user_id:
            logger.error(f"[PREDICTION_HISTORY] Missing user_id")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'status': 'error',
                    'message': 'Missing required field: user_id'
                })
            }
        
        # Connect to database
        logger.info("[PREDICTION_HISTORY] Connecting to database...")
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            connect_timeout=5
        )
        cursor = connection.cursor(dictionary=True)
        
        logger.info("[PREDICTION_HISTORY] Database connected, executing query...")
        
        # Simple query - just get predictions for this user
        query = """
        SELECT 
            p.prediction_id,
            p.user_id,
            p.match_id,
            p.predicted_home_score,
            p.predicted_away_score,
            p.points_earned,
            p.created_at,
            m.home_team,
            m.away_team,
            m.match_date_utc,
            m.home_score,
            m.away_score,
            m.status
        FROM predictions p
        LEFT JOIN matches m ON p.match_id = m.match_id
        WHERE p.user_id = %s
        ORDER BY m.match_date_utc DESC
        LIMIT 100
        """
        
        cursor.execute(query, (user_id,))
        predictions = cursor.fetchall()
        
        logger.info(f"[PREDICTION_HISTORY] Fetched {len(predictions)} predictions")
        
        cursor.close()
        connection.close()
        
        # Format response
        predictions_list = []
        for pred in predictions:
            predictions_list.append({
                'prediction_id': pred['prediction_id'],
                'match_id': pred['match_id'],
                'home_team': pred['home_team'],
                'away_team': pred['away_team'],
                'predicted_home_score': pred['predicted_home_score'],
                'predicted_away_score': pred['predicted_away_score'],
                'home_score': pred['home_score'],
                'away_score': pred['away_score'],
                'status': pred['status'],
                'points_earned': pred['points_earned'],
                'created_at': str(pred['created_at']) if pred['created_at'] else None,
                'match_date_utc': str(pred['match_date_utc']) if pred['match_date_utc'] else None
            })
        
        logger.info(f"[PREDICTION_HISTORY] Returning {len(predictions_list)} predictions")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'predictions': predictions_list
            })
        }
    
    except Exception as e:
        logger.error(f"[PREDICTION_HISTORY] Error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'message': str(e)
            })
        }