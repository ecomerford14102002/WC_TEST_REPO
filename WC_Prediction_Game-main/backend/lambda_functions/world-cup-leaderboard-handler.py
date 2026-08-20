"""
AWS Lambda Function: leaderboard (UPDATED VERSION)
Purpose: Calculate and return leaderboards with regional normalization

This version includes:
1. User leaderboard (ranked by total points)
2. Team leaderboard (ranked by W/D/L and goal difference)
3. Regional comparison (Cork vs Dublin with NORMALIZED scoring)
4. User statistics

Request Format (User Leaderboard):
{
    "action": "get_user_leaderboard",
    "limit": 10
}

Request Format (Team Leaderboard):
{
    "action": "get_team_leaderboard"
}

Request Format (Regional Comparison):
{
    "action": "get_regional_comparison"
}

Request Format (User Stats):
{
    "action": "get_user_stats",
    "user_id": 42,
    "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
"""

import json
import logging
import mysql.connector
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')


def lambda_handler(event, context):
    """
    Main Lambda handler for leaderboard operations
    """
    try:
        logger.info("[LEADERBOARD] Request received")
        
        # Parse request body
        try:
            if isinstance(event.get('body'), str):
                body = json.loads(event['body'])
            else:
                body = event.get('body', {})
        except json.JSONDecodeError:
            logger.error("[LEADERBOARD] Invalid JSON in request body")
            return error_response(400, "Invalid JSON format")
        
        # Extract action
        action = body.get('action', '').strip()
        
        if not action:
            logger.warning("[LEADERBOARD] Missing action field")
            return error_response(400, "Missing action field")
        
        # Route to appropriate handler
        if action == 'get_user_leaderboard':
            return handle_get_user_leaderboard(body)
        elif action == 'get_team_leaderboard':
            return handle_get_team_leaderboard(body)
        elif action == 'get_regional_comparison':
            return handle_get_regional_comparison(body)
        elif action == 'get_user_stats':
            return handle_get_user_stats(body)
        else:
            logger.warning(f"[LEADERBOARD] Invalid action: {action}")
            return error_response(400, f"Invalid action: {action}")
    
    except Exception as e:
        logger.error(f"[LEADERBOARD] Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, str(e))


def handle_get_user_leaderboard(body):
    """
    Get user leaderboard ranked by total points
    """
    connection = None
    cursor = None
    
    try:
        logger.info("[GET_USER_LEADERBOARD] Fetching user leaderboard")
        
        # Extract limit (default 10, max 100)
        limit = body.get('limit', 10)
        try:
            limit = int(limit)
            if limit < 1 or limit > 100:
                limit = 10
        except (ValueError, TypeError):
            limit = 10
        
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
        
        logger.info("[GET_USER_LEADERBOARD] Database connected")
        
        # Get user leaderboard
        query = """
        SELECT 
            u.user_id,
            u.username,
            u.sweepstake_country,
            u.office_location,
            COALESCE(SUM(p.points_earned), 0) as total_points,
            COUNT(p.prediction_id) as predictions_made
        FROM users u
        LEFT JOIN predictions p ON u.user_id = p.user_id
        GROUP BY u.user_id, u.username, u.sweepstake_country, u.office_location
        ORDER BY total_points DESC, u.user_id ASC
        LIMIT %s
        """
        
        cursor.execute(query, (limit,))
        users = cursor.fetchall()
        
        logger.info(f"[GET_USER_LEADERBOARD] Retrieved {len(users)} users")
        
        # Add rank
        leaderboard = []
        for rank, user in enumerate(users, 1):
            leaderboard.append({
                'rank': rank,
                'user_id': user['user_id'],
                'username': user['username'],
                'sweepstake_country': user['sweepstake_country'],
                'office_location': user['office_location'],
                'total_points': int(user['total_points']),
                'predictions_made': user['predictions_made']
            })
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'User leaderboard retrieved successfully',
                'total_users': len(leaderboard),
                'leaderboard': leaderboard
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        logger.error(f"[GET_USER_LEADERBOARD] Database error: {str(e)}")
        return error_response(500, "Database error")
    
    except Exception as e:
        logger.error(f"[GET_USER_LEADERBOARD] Error: {str(e)}", exc_info=True)
        return error_response(500, str(e))
    
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if connection:
            try:
                connection.close()
            except:
                pass


def handle_get_team_leaderboard(body):
    """
    Get team leaderboard ranked by W/D/L and goal difference
    """
    connection = None
    cursor = None
    
    try:
        logger.info("[GET_TEAM_LEADERBOARD] Fetching team leaderboard")
        
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
        
        logger.info("[GET_TEAM_LEADERBOARD] Database connected")
        
        # Get team leaderboard with W/D/L stats
        query = """
        SELECT 
            sc.country_name,
            sc.wins,
            sc.draws,
            sc.losses,
            sc.goal_difference,
            COUNT(DISTINCT u.user_id) as team_members,
            COALESCE(SUM(p.points_earned), 0) as total_points
        FROM sweepstake_countries sc
        LEFT JOIN users u ON u.sweepstake_country = sc.country_name
        LEFT JOIN predictions p ON u.user_id = p.user_id
        GROUP BY sc.country_name, sc.wins, sc.draws, sc.losses, sc.goal_difference
        ORDER BY sc.wins DESC, sc.goal_difference DESC, sc.draws DESC, sc.country_name ASC
        """
        
        cursor.execute(query)
        teams = cursor.fetchall()
        
        logger.info(f"[GET_TEAM_LEADERBOARD] Retrieved {len(teams)} teams")
        
        # Add rank
        leaderboard = []
        for rank, team in enumerate(teams, 1):
            leaderboard.append({
                'rank': rank,
                'team': team['country_name'],
                'team_members': team['team_members'],
                'total_points': int(team['total_points']),
                'wins': int(team['wins']),
                'draws': int(team['draws']),
                'losses': int(team['losses']),
                'goal_difference': int(team['goal_difference']),
                'average_points_per_member': round(int(team['total_points']) / team['team_members'], 2) if team['team_members'] > 0 else 0
            })
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'Team leaderboard retrieved successfully',
                'total_teams': len(leaderboard),
                'leaderboard': leaderboard
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        logger.error(f"[GET_TEAM_LEADERBOARD] Database error: {str(e)}")
        return error_response(500, "Database error")
    
    except Exception as e:
        logger.error(f"[GET_TEAM_LEADERBOARD] Error: {str(e)}", exc_info=True)
        return error_response(500, str(e))
    
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if connection:
            try:
                connection.close()
            except:
                pass


def handle_get_regional_comparison(body):
    """
    Get regional comparison (Cork vs Dublin) with NORMALIZED scoring
    
    Normalization: Total Points / Number of Users in Region
    This ensures fair comparison regardless of region size
    """
    connection = None
    cursor = None
    
    try:
        logger.info("[GET_REGIONAL_COMPARISON] Fetching regional comparison")
        
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
        
        logger.info("[GET_REGIONAL_COMPARISON] Database connected")
        
        # Get regional stats
        query = """
        SELECT 
            u.office_location,
            COUNT(DISTINCT u.user_id) as total_users,
            COALESCE(SUM(p.points_earned), 0) as total_points,
            COUNT(p.prediction_id) as total_predictions
        FROM users u
        LEFT JOIN predictions p ON u.user_id = p.user_id
        WHERE u.office_location IS NOT NULL
        GROUP BY u.office_location
        ORDER BY total_points DESC
        """
        
        cursor.execute(query)
        regions = cursor.fetchall()
        
        logger.info(f"[GET_REGIONAL_COMPARISON] Retrieved data for {len(regions)} regions")
        
        # Format response with NORMALIZED scoring
        regional_data = []
        for region in regions:
            total_points = int(region['total_points'])
            total_users = region['total_users']
            
            # NORMALIZED SCORE: Total Points / Number of Users
            normalized_score = round(total_points / total_users, 2) if total_users > 0 else 0
            
            regional_data.append({
                'office_location': region['office_location'],
                'total_users': total_users,
                'total_points': total_points,
                'total_predictions': region['total_predictions'],
                'normalized_score': normalized_score,
                'average_points_per_user': normalized_score  # Same as normalized_score
            })
        
        # Sort by normalized score (descending)
        regional_data.sort(key=lambda x: x['normalized_score'], reverse=True)
        
        cursor.close()
        connection.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'Regional comparison retrieved successfully',
                'regions': regional_data
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        logger.error(f"[GET_REGIONAL_COMPARISON] Database error: {str(e)}")
        return error_response(500, "Database error")
    
    except Exception as e:
        logger.error(f"[GET_REGIONAL_COMPARISON] Error: {str(e)}", exc_info=True)
        return error_response(500, str(e))
    
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if connection:
            try:
                connection.close()
            except:
                pass


def handle_get_user_stats(body):
    """
    Get individual user statistics
    """
    connection = None
    cursor = None
    
    try:
        logger.info("[GET_USER_STATS] Fetching user statistics")
        
        # Extract and validate fields
        user_id = body.get('user_id')
        
        if not user_id:
            logger.warning("[GET_USER_STATS] Missing user_id field")
            return error_response(400, "Missing user_id field")
        
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
        
        logger.info("[GET_USER_STATS] Database connected")
        
        # Get user details
        user_query = """
        SELECT 
            user_id,
            username,
            email,
            sweepstake_country,
            country_guess,
            golden_boot_guess,
            golden_glove_guess,
            office_location
        FROM users
        WHERE user_id = %s
        """
        
        cursor.execute(user_query, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            logger.warning(f"[GET_USER_STATS] User not found: {user_id}")
            return error_response(400, "User not found")
        
        # Get user statistics
        stats_query = """
        SELECT 
            COUNT(p.prediction_id) as total_predictions,
            COALESCE(SUM(p.points_earned), 0) as total_points,
            SUM(CASE WHEN p.points_earned = 18 THEN 1 ELSE 0 END) as perfect_predictions,
            SUM(CASE WHEN p.points_earned >= 10 THEN 1 ELSE 0 END) as high_accuracy,
            SUM(CASE WHEN p.points_earned >= 5 THEN 1 ELSE 0 END) as medium_accuracy,
            SUM(CASE WHEN p.points_earned > 0 THEN 1 ELSE 0 END) as any_points
        FROM predictions p
        WHERE p.user_id = %s
        """
        
        cursor.execute(stats_query, (user_id,))
        stats = cursor.fetchone()
        
        # Get user rank
        rank_query = """
        SELECT COUNT(*) + 1 as rank
        FROM (
            SELECT u.user_id, COALESCE(SUM(p.points_earned), 0) as total_points
            FROM users u
            LEFT JOIN predictions p ON u.user_id = p.user_id
            GROUP BY u.user_id
            HAVING COALESCE(SUM(p.points_earned), 0) > (
                SELECT COALESCE(SUM(p2.points_earned), 0)
                FROM predictions p2
                WHERE p2.user_id = %s
            )
        ) as ranked_users
        """
        
        cursor.execute(rank_query, (user_id,))
        rank_result = cursor.fetchone()
        user_rank = rank_result['rank'] if rank_result else 1
        
        logger.info(f"[GET_USER_STATS] Retrieved stats for user_id={user_id}")
        
        cursor.close()
        connection.close()
        
        total_predictions = stats['total_predictions']
        accuracy_percentage = round(
            (stats['any_points'] / total_predictions * 100) if total_predictions > 0 else 0,
            2
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'User statistics retrieved successfully',
                'user': {
                    'user_id': user['user_id'],
                    'username': user['username'],
                    'email': user['email'],
                    'sweepstake_country': user['sweepstake_country'],
                    'country_guess': user['country_guess'],
                    'golden_boot_guess': user['golden_boot_guess'],
                    'golden_glove_guess': user['golden_glove_guess'],
                    'office_location': user['office_location']
                },
                'statistics': {
                    'rank': user_rank,
                    'total_points': int(stats['total_points']),
                    'total_predictions': stats['total_predictions'],
                    'perfect_predictions': stats['perfect_predictions'] or 0,
                    'high_accuracy': stats['high_accuracy'] or 0,
                    'medium_accuracy': stats['medium_accuracy'] or 0,
                    'any_points': stats['any_points'] or 0,
                    'accuracy_percentage': accuracy_percentage
                }
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except mysql.connector.Error as e:
        logger.error(f"[GET_USER_STATS] Database error: {str(e)}")
        return error_response(500, "Database error")
    
    except Exception as e:
        logger.error(f"[GET_USER_STATS] Error: {str(e)}", exc_info=True)
        return error_response(500, str(e))
    
    finally:
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if connection:
            try:
                connection.close()
            except:
                pass


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