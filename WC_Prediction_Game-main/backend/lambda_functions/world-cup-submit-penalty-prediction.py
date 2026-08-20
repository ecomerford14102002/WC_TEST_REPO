"""
AWS Lambda Function: submit_penalty_prediction
Purpose: Handle penalty shootout predictions
Database: AWS RDS MySQL

Request Format:
{
    "body": {
        "user_id": 1,
        "match_id": "M001",
        "predicted_winner": "France"
    }
}

Response Format (Success - HTTP 200):
{
    "status": "success",
    "message": "Penalty prediction saved",
    "penalty_prediction_id": 123
}
"""

import json
import mysql.connector
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Database configuration

DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def lambda_handler(event, context):
    """
    Main Lambda handler for penalty predictions
    """
    try:
        print(f"Lambda invoked with event: {json.dumps(event)}")
        
        
# Parse the request body

        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        print(f"Parsed body: {json.dumps(body)}")
        
        
# Extract fields

        user_id = body.get('user_id')
        match_id = body.get('match_id')
        predicted_winner = body.get('predicted_winner')
        
        
# Validate required fields

        if user_id is None or match_id is None or predicted_winner is None:
            print("Missing required fields")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required fields: user_id, match_id, predicted_winner'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        return save_penalty_prediction(user_id, match_id, predicted_winner)
    
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

def save_penalty_prediction(user_id, match_id, predicted_winner):
    """
    Save or update a penalty prediction for a user and match.
    Uses INSERT with ON DUPLICATE KEY UPDATE to handle both new and existing predictions.
    
    Args:
        user_id (int): The user ID
        match_id (str): The match ID
        predicted_winner (str): Predicted penalty winner (team name)
    
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
        
        if not isinstance(predicted_winner, str) or not predicted_winner.strip():
            print(f"Invalid predicted_winner: {predicted_winner}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid predicted_winner'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        
# Connect to database

        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = connection.cursor(dictionary=True)
        
        print("Database connection established successfully")
        
        
# SQL query to insert or update penalty prediction

        sql = """
            INSERT INTO penalty_predictions 
            (user_id, match_id, predicted_winner, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            predicted_winner = VALUES(predicted_winner),
            updated_at = NOW()
        """
        
        cursor.execute(sql, (user_id, match_id, predicted_winner))
        connection.commit()
        
        
# Get the penalty_prediction_id

        select_sql = "SELECT penalty_prediction_id FROM penalty_predictions WHERE user_id = %s AND match_id = %s"
        cursor.execute(select_sql, (user_id, match_id))
        result = cursor.fetchone()
        penalty_prediction_id = result['penalty_prediction_id'] if result else None
        
        print(f"Penalty prediction saved for user {user_id}, match {match_id}, penalty_prediction_id {penalty_prediction_id}")
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'Penalty prediction saved',
                'penalty_prediction_id': penalty_prediction_id
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        print(f"Database error while saving penalty prediction: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except Exception as e:
        print(f"Unexpected error in save_penalty_prediction: {str(e)}")
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