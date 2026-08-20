"""
AWS Lambda Function: admin_score_entry (FIXED & COMPLETE VERSION)
Purpose: Allow admin users to enter actual match scores and calculate user points

Request Format:
{
    "action": "enter_score",
    "admin_user_id": 1,
    "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "match_id": "match_001",
    "home_score": 2,
    "away_score": 1
}

Response Format (Success - HTTP 200):
{
    "status": "success",
    "message": "Score entered and points calculated",
    "match_id": "match_001",
    "home_team": "France",
    "away_team": "Argentina",
    "home_score": 2,
    "away_score": 1,
    "predictions_updated": 45,
    "admin_action_id": 123
}
"""

import json
import logging
import mysql.connector
from datetime import datetime
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
    Main Lambda handler for admin score entry
    """
    try:
        logger.info("[ADMIN_SCORE_ENTRY] Request received")
        
        # Parse request body
        try:
            if isinstance(event.get('body'), str):
                body = json.loads(event['body'])
            else:
                body = event.get('body', {})
        except json.JSONDecodeError:
            logger.error("[ADMIN_SCORE_ENTRY] Invalid JSON in request body")
            return error_response(400, "Invalid JSON format")
        
        # Extract action
        action = body.get('action', '').strip()
        
        if not action:
            logger.warning("[ADMIN_SCORE_ENTRY] Missing action field")
            return error_response(400, "Missing action field")
        
        # Route to appropriate handler
        if action == 'enter_score':
            return handle_enter_score(body)
        else:
            logger.warning(f"[ADMIN_SCORE_ENTRY] Invalid action: {action}")
            return error_response(400, f"Invalid action: {action}")
    
    except Exception as e:
        logger.error(f"[ADMIN_SCORE_ENTRY] Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, str(e))


def handle_enter_score(body):
    """
    Handle score entry and point calculation
    """
    try:
        logger.info("[ENTER_SCORE] Processing score entry")
        
        # Extract and validate fields
        admin_user_id = body.get('admin_user_id')
        jwt_token = body.get('jwt_token', '').strip()
        match_id = body.get('match_id', '').strip()
        home_score = body.get('home_score')
        away_score = body.get('away_score')
        
        # Validate required fields
        if not admin_user_id:
            logger.warning("[ENTER_SCORE] Missing admin_user_id field")
            return error_response(400, "Missing admin_user_id field")
        
        if not jwt_token:
            logger.warning("[ENTER_SCORE] Missing jwt_token field")
            return error_response(400, "Missing jwt_token field")
        
        if not match_id:
            logger.warning("[ENTER_SCORE] Missing match_id field")
            return error_response(400, "Missing match_id field")
        
        if home_score is None:
            logger.warning("[ENTER_SCORE] Missing home_score field")
            return error_response(400, "Missing home_score field")
        
        if away_score is None:
            logger.warning("[ENTER_SCORE] Missing away_score field")
            return error_response(400, "Missing away_score field")
        
        # Validate scores are non-negative integers
        try:
            home_score = int(home_score)
            away_score = int(away_score)
            
            if home_score < 0 or home_score > 20:
                logger.warning(f"[ENTER_SCORE] Invalid home score: {home_score}")
                return error_response(400, "Home score must be between 0 and 20")
            
            if away_score < 0 or away_score > 20:
                logger.warning(f"[ENTER_SCORE] Invalid away score: {away_score}")
                return error_response(400, "Away score must be between 0 and 20")
        
        except (ValueError, TypeError):
            logger.warning("[ENTER_SCORE] Scores must be integers")
            return error_response(400, "Scores must be integers")
        
        connection = None
        cursor = None
        
        try:
            connection = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                charset='utf8mb4',
                connect_timeout=5
            )
            cursor = connection.cursor(dictionary=True)
            
            logger.info("[ENTER_SCORE] Database connected")
            
            # Verify admin user has admin privileges
            admin_check_query = "SELECT is_admin FROM users WHERE user_id = %s"
            cursor.execute(admin_check_query, (admin_user_id,))
            admin_user = cursor.fetchone()
            
            if not admin_user:
                logger.warning(f"[ENTER_SCORE] Admin user not found: {admin_user_id}")
                return error_response(400, "Admin user not found")
            
            if not admin_user['is_admin']:
                logger.warning(f"[ENTER_SCORE] User is not admin: {admin_user_id}")
                return error_response(403, "User does not have admin privileges")
            
            # Get match details
            match_query = """
            SELECT match_id, home_team, away_team, status, home_score, away_score
            FROM matches
            WHERE match_id = %s
            """
            cursor.execute(match_query, (match_id,))
            match = cursor.fetchone()
            
            if not match:
                logger.warning(f"[ENTER_SCORE] Match not found: {match_id}")
                return error_response(400, "Match not found")
            
            # Check if score was already entered (for update scenario)
            previous_home_score = match['home_score']
            previous_away_score = match['away_score']
            is_update = previous_home_score is not None and previous_away_score is not None
            
            logger.info(f"[ENTER_SCORE] Match found: {match['home_team']} vs {match['away_team']}, is_update={is_update}")
            
            # If this is an update, we need to recalculate points for all predictions
            if is_update:
                logger.info(f"[ENTER_SCORE] Score update detected. Previous: {previous_home_score}-{previous_away_score}, New: {home_score}-{away_score}")
                # Reset all points for this match to 0 first
                reset_query = "UPDATE predictions SET points_earned = 0 WHERE match_id = %s"
                cursor.execute(reset_query, (match_id,))
            
            # Update match with scores and status
            update_match_query = """
            UPDATE matches
            SET home_score = %s, away_score = %s, status = 'finished', updated_at = CURRENT_TIMESTAMP
            WHERE match_id = %s
            """
            cursor.execute(update_match_query, (home_score, away_score, match_id))
            
            # Determine match outcome
            if home_score > away_score:
                home_outcome = 'win'
                away_outcome = 'loss'
            elif home_score < away_score:
                home_outcome = 'loss'
                away_outcome = 'win'
            else:
                home_outcome = 'draw'
                away_outcome = 'draw'
            
            logger.info(f"[ENTER_SCORE] Match outcome: {home_outcome} vs {away_outcome}")
            
            # Update sweepstake countries with W/D/L and goal difference
            home_team = match['home_team']
            away_team = match['away_team']
            
            # Update home team
            if home_outcome == 'win':
                update_country_query = """
                UPDATE sweepstake_countries
                SET wins = wins + 1, goal_difference = goal_difference + %s, updated_at = CURRENT_TIMESTAMP
                WHERE country_name = %s
                """
                cursor.execute(update_country_query, (home_score - away_score, home_team))
            elif home_outcome == 'draw':
                update_country_query = """
                UPDATE sweepstake_countries
                SET draws = draws + 1, goal_difference = goal_difference + %s, updated_at = CURRENT_TIMESTAMP
                WHERE country_name = %s
                """
                cursor.execute(update_country_query, (home_score - away_score, home_team))
            else:  # loss
                update_country_query = """
                UPDATE sweepstake_countries
                SET losses = losses + 1, goal_difference = goal_difference + %s, updated_at = CURRENT_TIMESTAMP
                WHERE country_name = %s
                """
                cursor.execute(update_country_query, (home_score - away_score, home_team))
            
            # Update away team
            if away_outcome == 'win':
                update_country_query = """
                UPDATE sweepstake_countries
                SET wins = wins + 1, goal_difference = goal_difference + %s, updated_at = CURRENT_TIMESTAMP
                WHERE country_name = %s
                """
                cursor.execute(update_country_query, (away_score - home_score, away_team))
            elif away_outcome == 'draw':
                update_country_query = """
                UPDATE sweepstake_countries
                SET draws = draws + 1, goal_difference = goal_difference + %s, updated_at = CURRENT_TIMESTAMP
                WHERE country_name = %s
                """
                cursor.execute(update_country_query, (away_score - home_score, away_team))
            else:  # loss
                update_country_query = """
                UPDATE sweepstake_countries
                SET losses = losses + 1, goal_difference = goal_difference + %s, updated_at = CURRENT_TIMESTAMP
                WHERE country_name = %s
                """
                cursor.execute(update_country_query, (away_score - home_score, away_team))
            
            logger.info(f"[ENTER_SCORE] Updated sweepstake countries for {home_team} and {away_team}")
            
            # Get all predictions for this match
            predictions_query = """
            SELECT prediction_id, user_id, predicted_home_score, predicted_away_score
            FROM predictions
            WHERE match_id = %s
            """
            cursor.execute(predictions_query, (match_id,))
            predictions = cursor.fetchall()
            
            logger.info(f"[ENTER_SCORE] Found {len(predictions)} predictions for this match")
            
            # Calculate points for each prediction
            predictions_updated = 0
            for prediction in predictions:
                points = calculate_points(
                    prediction['predicted_home_score'],
                    prediction['predicted_away_score'],
                    home_score,
                    away_score
                )
                
                logger.info(f"[ENTER_SCORE] User {prediction['user_id']}: predicted {prediction['predicted_home_score']}-{prediction['predicted_away_score']}, actual {home_score}-{away_score}, points={points}")
                
                # Update prediction with points
                update_prediction_query = """
                UPDATE predictions
                SET points_earned = %s, updated_at = CURRENT_TIMESTAMP
                WHERE prediction_id = %s
                """
                cursor.execute(update_prediction_query, (points, prediction['prediction_id']))
                predictions_updated += 1
            
            # Log admin action
            action_description = f"Entered score for match {match_id}: {home_team} {home_score}-{away_score} {away_team}"
            
            admin_action_query = """
            INSERT INTO admin_actions
            (admin_user_id, action_type, match_id, home_score, away_score, action_description)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(admin_action_query, (
                admin_user_id,
                'SCORE_ENTRY',
                match_id,
                home_score,
                away_score,
                action_description
            ))
            
            connection.commit()
            admin_action_id = cursor.lastrowid
            
            logger.info(f"[ENTER_SCORE] Score entered successfully: match_id={match_id}, predictions_updated={predictions_updated}, admin_action_id={admin_action_id}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'message': 'Score entered and points calculated',
                    'match_id': match_id,
                    'home_team': home_team,
                    'away_team': away_team,
                    'home_score': home_score,
                    'away_score': away_score,
                    'predictions_updated': predictions_updated,
                    'admin_action_id': admin_action_id
                }),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        except mysql.connector.Error as e:
            logger.error(f"[ENTER_SCORE] Database error: {str(e)}")
            if connection:
                connection.rollback()
            return error_response(500, "Database error")
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[ENTER_SCORE] Error closing cursor: {str(e)}")
            
            if connection:
                try:
                    connection.close()
                except Exception as e:
                    logger.warning(f"[ENTER_SCORE] Error closing connection: {str(e)}")
    
    except Exception as e:
        logger.error(f"[ENTER_SCORE] Error in score entry: {str(e)}", exc_info=True)
        return error_response(500, str(e))


def calculate_points(predicted_home, predicted_away, actual_home, actual_away):
    """
    Calculate points earned for a prediction using cumulative system:
    - +3 points if outcome (win/loss/draw) is correct
    - +5 points if ONE team's score is correct
    - +10 points if BOTH teams' scores are correct
    - Maximum: 18 points
    
    Args:
        predicted_home (int): Predicted home score
        predicted_away (int): Predicted away score
        actual_home (int): Actual home score
        actual_away (int): Actual away score
        
    Returns:
        int: Points earned
    """
    points = 0
    
    # Determine predicted outcome
    if predicted_home > predicted_away:
        predicted_outcome = 'win'
    elif predicted_home < predicted_away:
        predicted_outcome = 'loss'
    else:
        predicted_outcome = 'draw'
    
    # Determine actual outcome
    if actual_home > actual_away:
        actual_outcome = 'win'
    elif actual_home < actual_away:
        actual_outcome = 'loss'
    else:
        actual_outcome = 'draw'
    
    # +3 for correct outcome (even if scores are wrong)
    if predicted_outcome == actual_outcome:
        points += 3
        logger.debug(f"[CALCULATE_POINTS] +3 for correct outcome: {predicted_outcome}")
    
    # +5 if ONE team's score is correct
    home_score_correct = predicted_home == actual_home
    away_score_correct = predicted_away == actual_away
    
    if home_score_correct and away_score_correct:
        # Both scores correct: +10 points
        points += 15
        logger.debug(f"[CALCULATE_POINTS] +10 for both scores correct: {predicted_home}-{predicted_away}")
    elif home_score_correct or away_score_correct:
        # One score correct: +5 points
        points += 5
        logger.debug(f"[CALCULATE_POINTS] +5 for one score correct")
    
    logger.debug(f"[CALCULATE_POINTS] Total points: {points} (predicted {predicted_home}-{predicted_away}, actual {actual_home}-{actual_away})")
    return points


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