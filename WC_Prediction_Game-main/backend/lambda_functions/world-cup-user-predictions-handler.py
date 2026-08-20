"""
AWS Lambda Function: score_prediction
Purpose: Handle BOTH saving and fetching World Cup predictions
Database: AWS RDS MySQL

This Lambda function handles two actions:
1. SAVE predictions (original functionality) - when no 'action' field is present
2. FETCH predictions (new functionality) - when action='fetch_user_predictions'
"""

import json
import mysql.connector
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Main Lambda handler function.
    Routes requests based on the 'action' field in the request body.
    
    Args:
        event (dict): Lambda event containing the request
        context (object): Lambda context object
    
    Returns:
        dict: Response with statusCode and body
    """
    try:
        print(f"Lambda invoked with event: {json.dumps(event)}")
        
        # Parse the request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        print(f"Parsed body: {json.dumps(body)}")
        
        # Get the action from the request
        action = body.get('action')
        
        # Route based on action
        if action == 'fetch_user_predictions':
            # FETCH action: retrieve predictions for a user
            user_id = body.get('user_id')
            
            if user_id is None:
                print("Missing user_id in fetch_user_predictions request")
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Missing user_id'}),
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            
            return fetch_user_predictions(user_id)
        
        else:
            # DEFAULT action: SAVE a new prediction
            # This is the original functionality
            # Handles both 'submit_prediction' action and no action field
            user_id = body.get('user_id')
            match_id = body.get('match_id')
            predicted_home_score = body.get('predicted_home_score')
            predicted_away_score = body.get('predicted_away_score')
            
            # Validate required fields for save action
            if user_id is None or match_id is None or predicted_home_score is None or predicted_away_score is None:
                print("Missing required fields for save prediction")
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Missing required fields: user_id, match_id, predicted_home_score, predicted_away_score'}),
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            
            return save_prediction(user_id, match_id, predicted_home_score, predicted_away_score)
    
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }


def fetch_user_predictions(user_id):
    """
    Fetch all predictions for a specific user.
    Joins predictions table with matches table to include match details.
    
    Args:
        user_id (int): The user ID to fetch predictions for
    
    Returns:
        dict: Response with statusCode and body (list of predictions or error)
    """
    connection = None
    try:
        # Validate input
        if not isinstance(user_id, int) or user_id <= 0:
            print(f"Invalid user_id: {user_id}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid user_id'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        # Connect to database
        connection = mysql.connector.connect(
            host=os.environ.get('DB_HOST'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            database=os.environ.get('DB_NAME')
        )
        cursor = connection.cursor(dictionary=True)
        
        print("Database connection established successfully")
        
        # SQL query to fetch predictions with match details
        sql = """
            SELECT 
                p.prediction_id,
                p.user_id,
                p.match_id,
                p.predicted_home_score,
                p.predicted_away_score,
                p.points_earned,
                p.created_at,
                p.updated_at,
                m.home_team,
                m.away_team,
                m.match_date_utc,
                m.status,
                m.home_score,
                m.away_score
            FROM predictions p
            LEFT JOIN matches m ON p.match_id = m.match_id
            WHERE p.user_id = %s
            ORDER BY m.match_date_utc DESC
        """
        
        cursor.execute(sql, (user_id,))
        predictions = cursor.fetchall()
        
        print(f"Fetched {len(predictions)} predictions for user {user_id}")
        
        # Convert datetime objects to ISO format strings for JSON serialization
        predictions_list = []
        for prediction in predictions:
            pred_dict = {
                'prediction_id': prediction['prediction_id'],
                'user_id': prediction['user_id'],
                'match_id': prediction['match_id'],
                'predicted_home_score': prediction['predicted_home_score'],
                'predicted_away_score': prediction['predicted_away_score'],
                'points_earned': prediction['points_earned'],
                'created_at': prediction['created_at'].isoformat() if prediction['created_at'] else None,
                'updated_at': prediction['updated_at'].isoformat() if prediction['updated_at'] else None,
                'home_team': prediction['home_team'],
                'away_team': prediction['away_team'],
                'match_date_utc': prediction['match_date_utc'].isoformat() if prediction['match_date_utc'] else None,
                'status': prediction['status'],
                'home_score': prediction['home_score'],
                'away_score': prediction['away_score']
            }
            predictions_list.append(pred_dict)
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps(predictions_list),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        print(f"Database error while fetching predictions: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except Exception as e:
        print(f"Unexpected error in fetch_user_predictions: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    finally:
        if connection:
            connection.close()
            print("Database connection closed")


def save_prediction(user_id, match_id, predicted_home_score, predicted_away_score):
    """
    Save or update a prediction for a user and match.
    Uses INSERT with ON DUPLICATE KEY UPDATE to handle both new and existing predictions.
    
    Args:
        user_id (int): The user ID
        match_id (str): The match ID
        predicted_home_score (int): Predicted home team score
        predicted_away_score (int): Predicted away team score
    
    Returns:
        dict: Response with statusCode and body (success message or error)
    """
    connection = None
    try:
        # Validate inputs
        if not isinstance(user_id, int) or user_id <= 0:
            print(f"Invalid user_id: {user_id}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid user_id'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        if not isinstance(match_id, str) or not match_id.strip():
            print(f"Invalid match_id: {match_id}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid match_id'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        if not isinstance(predicted_home_score, int) or predicted_home_score < 0:
            print(f"Invalid predicted_home_score: {predicted_home_score}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid predicted_home_score'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        if not isinstance(predicted_away_score, int) or predicted_away_score < 0:
            print(f"Invalid predicted_away_score: {predicted_away_score}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid predicted_away_score'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        # Connect to database
        connection = mysql.connector.connect(
            host=os.environ.get('DB_HOST'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            database=os.environ.get('DB_NAME')
        )
        cursor = connection.cursor(dictionary=True)
        
        print("Database connection established successfully")
        
        # SQL query to insert or update prediction
        # Uses ON DUPLICATE KEY UPDATE to handle both new and existing predictions
        sql = """
            INSERT INTO predictions 
            (user_id, match_id, predicted_home_score, predicted_away_score, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            predicted_home_score = VALUES(predicted_home_score),
            predicted_away_score = VALUES(predicted_away_score),
            updated_at = NOW()
        """
        
        cursor.execute(sql, (user_id, match_id, predicted_home_score, predicted_away_score))
        connection.commit()
        
        # Get the prediction_id (either newly inserted or existing)
        select_sql = "SELECT prediction_id FROM predictions WHERE user_id = %s AND match_id = %s"
        cursor.execute(select_sql, (user_id, match_id))
        result = cursor.fetchone()
        prediction_id = result['prediction_id'] if result else None
        
        print(f"Prediction saved for user {user_id}, match {match_id}, prediction_id {prediction_id}")
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'Prediction saved successfully',
                'prediction_id': prediction_id
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        print(f"Database error while saving prediction: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except Exception as e:
        print(f"Unexpected error in save_prediction: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    finally:
        if connection:
            connection.close()
            print("Database connection closed")