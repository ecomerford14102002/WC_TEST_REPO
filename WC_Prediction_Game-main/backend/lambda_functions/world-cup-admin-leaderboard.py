
# lambda_admin_leaderboard.py - ULTRA OPTIMIZED

import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rds = boto3.client('rds-data')

DB_CLUSTER_ARN = 'arn:aws:rds:eu-west-1:YOUR_ACCOUNT_ID:cluster:world-cup-db'
DB_SECRET_ARN = 'arn:aws:secretsmanager:eu-west-1:YOUR_ACCOUNT_ID:secret:rds-db-credentials'
DB_NAME = 'world_cup_db'

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'get_admin_leaderboard')
        
        if action == 'get_admin_leaderboard':
            return get_admin_leaderboard()
        else:
            return error_response('Invalid action', 400)
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return error_response(str(e), 500)

def get_admin_leaderboard():
    """Get leaderboard - ULTRA OPTIMIZED"""
    try:
        
# ✅ ULTRA SIMPLE: Just get top 50 users

        query = """
        SELECT 
            u.user_id,
            u.username,
            u.sweepstake_country,
            u.office_location,
            COALESCE(SUM(p.points_earned), 0) as total_points,
            COUNT(p.prediction_id) as prediction_count
        FROM users u
        LEFT JOIN predictions p ON u.user_id = p.user_id
        GROUP BY u.user_id, u.username, u.sweepstake_country, u.office_location
        ORDER BY total_points DESC
        LIMIT 50
        """
        
        result = rds.execute_statement(
            resourceArn=DB_CLUSTER_ARN,
            secretArn=DB_SECRET_ARN,
            database=DB_NAME,
            sql=query
        )
        
        leaderboard = []
        for i, record in enumerate(result.get('records', []), 1):
            leaderboard.append({
                'rank': i,
                'user_id': int(record[0]['longValue']),
                'username': record[1]['stringValue'],
                'sweepstake_country': record[2].get('stringValue', '-'),
                'office_location': record[3]['stringValue'],
                'total_points': int(record[4]['longValue']),
                'prediction_count': int(record[5]['longValue']),
                'accuracy_percentage': 0
            })
        
        
# Get stats

        stats_query = "SELECT COUNT(DISTINCT user_id), COUNT(DISTINCT prediction_id) FROM predictions"
        stats_result = rds.execute_statement(
            resourceArn=DB_CLUSTER_ARN,
            secretArn=DB_SECRET_ARN,
            database=DB_NAME,
            sql=stats_query
        )
        
        stats = {
            'total_users': int(stats_result['records'][0][0]['longValue']),
            'total_predictions': int(stats_result['records'][0][1]['longValue']),
            'completed_matches': 0
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'data': {
                    'leaderboard': leaderboard,
                    'stats': stats
                }
            })
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return error_response(str(e), 500)

def error_response(message, status_code):
    return {
        'statusCode': status_code,
        'body': json.dumps({'status': 'error', 'message': message})
    }