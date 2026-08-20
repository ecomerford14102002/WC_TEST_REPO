
# lambda_admin_predictions.py - ULTRA OPTIMIZED

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
        action = body.get('action', 'get_all_predictions')
        
        if action == 'get_all_predictions':
            return get_all_predictions()
        elif action == 'get_accuracy_metrics':
            return get_accuracy_metrics()
        else:
            return error_response('Invalid action', 400)
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return error_response(str(e), 500)

def get_all_predictions():
    """Get predictions - ULTRA OPTIMIZED"""
    try:
        
# ✅ ULTRA SIMPLE: Just get last 200 predictions

        query = """
        SELECT 
            p.prediction_id,
            p.user_id,
            u.username,
            p.match_id,
            m.home_team,
            m.away_team,
            p.predicted_home_score,
            p.predicted_away_score,
            m.home_score,
            m.away_score,
            p.points_earned,
            p.prediction_type,
            p.created_at
        FROM predictions p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN matches m ON p.match_id = m.match_id
        ORDER BY p.created_at DESC
        LIMIT 200
        """
        
        result = rds.execute_statement(
            resourceArn=DB_CLUSTER_ARN,
            secretArn=DB_SECRET_ARN,
            database=DB_NAME,
            sql=query
        )
        
        predictions = []
        for record in result.get('records', []):
            predictions.append({
                'prediction_id': int(record[0]['longValue']),
                'user_id': int(record[1]['longValue']),
                'username': record[2]['stringValue'],
                'match_id': record[3].get('stringValue'),
                'home_team': record[4].get('stringValue'),
                'away_team': record[5].get('stringValue'),
                'predicted_home_score': int(record[6]['longValue']) if record[6].get('longValue') else None,
                'predicted_away_score': int(record[7]['longValue']) if record[7].get('longValue') else None,
                'home_score': int(record[8]['longValue']) if record[8].get('longValue') else None,
                'away_score': int(record[9]['longValue']) if record[9].get('longValue') else None,
                'points_earned': int(record[10]['longValue']) if record[10].get('longValue') else 0,
                'prediction_type': record[11]['stringValue'],
                'created_at': record[12]['stringValue'],
                'accuracy': 0
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'data': {
                    'predictions': predictions,
                    'total_count': len(predictions)
                }
            })
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return error_response(str(e), 500)

def get_accuracy_metrics():
    """Get accuracy metrics - ULTRA OPTIMIZED"""
    try:
        query = """
        SELECT 
            u.user_id,
            u.username,
            COUNT(p.prediction_id) as total_predictions,
            COALESCE(SUM(p.points_earned), 0) as total_points
        FROM users u
        LEFT JOIN predictions p ON u.user_id = p.user_id
        GROUP BY u.user_id, u.username
        ORDER BY total_points DESC
        LIMIT 50
        """
        
        result = rds.execute_statement(
            resourceArn=DB_CLUSTER_ARN,
            secretArn=DB_SECRET_ARN,
            database=DB_NAME,
            sql=query
        )
        
        metrics = []
        for record in result.get('records', []):
            metrics.append({
                'user_id': int(record[0]['longValue']),
                'username': record[1]['stringValue'],
                'total_predictions': int(record[2]['longValue']),
                'correct_predictions': 0,
                'accuracy_percentage': 0,
                'total_points': int(record[3]['longValue'])
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'data': {'accuracy_metrics': metrics}
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