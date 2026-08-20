import json
import mysql.connector
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda handler to fetch matches from database
    """
    try:
        
# Get query parameters

        query_params = event.get('queryStringParameters', {}) or {}
        status_filter = query_params.get('status', None) if query_params else None
        
        
# Connect to database

        connection = mysql.connector.connect(
            host=os.environ.get('DB_HOST'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            database=os.environ.get('DB_NAME')
        )
        cursor = connection.cursor(dictionary=True)
        
        
# Build query

        if status_filter:
            query = """
            SELECT 
                match_id,
                home_team,
                away_team,
                match_date_utc,
                home_score,
                away_score,
                status,
                home_fifa_rank,
                away_fifa_rank
            FROM matches
            WHERE status = %s
            ORDER BY match_date_utc ASC
            """
            cursor.execute(query, (status_filter,))
        else:
            query = """
            SELECT 
                match_id,
                home_team,
                away_team,
                match_date_utc,
                home_score,
                away_score,
                status,
                home_fifa_rank,
                away_fifa_rank
            FROM matches
            ORDER BY match_date_utc ASC
            """
            cursor.execute(query)
        
        matches = cursor.fetchall()
        
        
# Convert datetime to ISO format

        matches_list = []
        for match in matches:
            match_dict = {
                'match_id': match['match_id'],
                'home_team': match['home_team'],
                'away_team': match['away_team'],
                'match_date_utc': match['match_date_utc'].isoformat() if match['match_date_utc'] else None,
                'home_score': match['home_score'],
                'away_score': match['away_score'],
                'status': match['status'],
                'home_fifa_rank': match['home_fifa_rank'],
                'away_fifa_rank': match['away_fifa_rank']
            }
            matches_list.append(match_dict)
        
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
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'message': 'Database connection error',
                'error_code': 'DB_ERROR',
                'error_details': str(e)
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }