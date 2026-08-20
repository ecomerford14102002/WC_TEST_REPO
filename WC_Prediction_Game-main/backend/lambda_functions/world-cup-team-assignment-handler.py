# team_assignment/lambda_function.py
"""
Lambda Team Assignment Handler
Purpose: Handle team assignment with proper round-robin distribution with randomized country selection

Request Format (Team Assignment):
{
    "action": "assign_team",
    "user_id": 42,
    "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
"""

import json
import logging
import mysql.connector
import random
from datetime import datetime
from shared.db_connection import get_db_connection, close_db_connection
from shared.error_handler import (
    error_invalid_token, error_db_connection, error_internal_server_error,
    error_missing_field, error_already_assigned,
    success_sweepstake_assigned
)
from shared.jwt_utils import verify_jwt_token
from shared.constants import USERS_TABLE

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# All 48 World Cup 2026 Teams (original order - will be shuffled)
SWEEPSTAKE_COUNTRIES = [
    # CONCACAF (6)
    'United States', 'Mexico', 'Canada', 'Curaçao', 'Haiti', 'Panama',
    
    # CONMEBOL (6)
    'Argentina', 'Brazil', 'Colombia', 'Ecuador', 'Paraguay', 'Uruguay',
    
    # UEFA (16)
    'Austria', 'Belgium', 'Bosnia and Herzegovina', 'Croatia', 'Czechia',
    'England', 'France', 'Germany', 'Netherlands', 'Norway', 'Portugal',
    'Scotland', 'Spain', 'Sweden', 'Switzerland', 'Türkiye',
    
    # AFC (9)
    'Australia', 'Iraq', 'IR Iran', 'Japan', 'Jordan', 'Korea Republic',
    'Qatar', 'Saudi Arabia', 'Uzbekistan',
    
    # CAF (10)
    'Algeria', 'Cabo Verde', 'Congo DR', 'Côte d\'Ivoire', 'Egypt',
    'Ghana', 'Morocco', 'Senegal', 'South Africa', 'Tunisia',
    
    # OFC (1)
    'New Zealand'
]


def get_randomized_country_list_from_db(cursor):
    """
    Fetch countries from database and return them in randomized order.
    Uses a fixed seed to ensure consistent randomization across all Lambda invocations.
    
    Args:
        cursor: Database cursor to execute queries
    
    Returns:
        list: List of country names in randomized order
    """
    try:
        logger.info("[TEAM_ASSIGNMENT] Attempting to fetch countries from database")
        
        # Query database to get all countries in their stored order
        # Using the sweepstake_countries table with country_name column
        query = "SELECT country_name FROM sweepstake_countries ORDER BY country_id"
        
        logger.info(f"[TEAM_ASSIGNMENT] Executing query: {query}")
        cursor.execute(query)
        results = cursor.fetchall()
        
        logger.info(f"[TEAM_ASSIGNMENT] Query returned {len(results) if results else 0} results")
        
        if not results:
            logger.warning("[TEAM_ASSIGNMENT] No countries found in database, using fallback list")
            return SWEEPSTAKE_COUNTRIES
        
        # Extract country names from query results
        # Handle both tuple and dictionary cursor formats
        countries = []
        for row in results:
            try:
                if isinstance(row, dict):
                    country_name = row.get('country_name')
                elif isinstance(row, tuple):
                    country_name = row[0]
                else:
                    country_name = str(row)
                
                if country_name:
                    countries.append(country_name)
            except Exception as row_error:
                logger.warning(f"[TEAM_ASSIGNMENT] Error processing row {row}: {str(row_error)}")
                continue
        
        if not countries:
            logger.error("[TEAM_ASSIGNMENT] No valid country names extracted from results")
            return SWEEPSTAKE_COUNTRIES
        
        # Shuffle with fixed seed for deterministic randomization
        random.seed(42)
        random.shuffle(countries)
        
        logger.info(f"[TEAM_ASSIGNMENT] Successfully fetched and randomized {len(countries)} countries from database")
        logger.info(f"[TEAM_ASSIGNMENT] First 5 randomized countries: {countries[:5]}")
        
        return countries
    
    except Exception as e:
        logger.error(f"[TEAM_ASSIGNMENT] Error fetching countries from database: {str(e)}", exc_info=True)
        logger.warning("[TEAM_ASSIGNMENT] Falling back to hardcoded country list")
        # Fallback to hardcoded list if database query fails
        return SWEEPSTAKE_COUNTRIES


def lambda_handler(event, context):
    """
    Main Lambda handler for team assignment and predictions
    """
    try:
        logger.info("[TEAM_ASSIGNMENT] Request received")
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            logger.error("[TEAM_ASSIGNMENT] Invalid JSON in request body")
            return error_internal_server_error("Invalid JSON format")
        
        # Extract action
        action = body.get('action', '').strip()
        
        if not action:
            logger.warning("[TEAM_ASSIGNMENT] Missing action field")
            return error_missing_field('action')
        
        # Route to appropriate handler
        if action == 'assign_team':
            return handle_team_assignment(body)
        elif action == 'predict_tournament_winner':
            return handle_tournament_winner_prediction(body)
        elif action == 'predict_golden_boot':
            return handle_golden_boot_prediction(body)
        elif action == 'predict_golden_glove':
            return handle_golden_glove_prediction(body)
        else:
            logger.warning(f"[TEAM_ASSIGNMENT] Invalid action: {action}")
            return error_internal_server_error(f"Invalid action: {action}")
    
    except Exception as e:
        logger.error(f"[TEAM_ASSIGNMENT] Unexpected error: {str(e)}", exc_info=True)
        return error_internal_server_error(str(e))


def handle_team_assignment(body):
    """
    Handle round-robin team assignment to user with randomized country distribution
    
    Assigns countries in randomized round-robin order:
    - User 1: Random country from shuffled list
    - User 2: Next random country
    - User 3: Next random country
    - ...
    - User 49: Cycles back to first random country
    - User 50: Cycles back to second random country
    """
    try:
        logger.info("[TEAM_ASSIGNMENT] Processing team assignment")
        
        # Extract and validate fields
        user_id = body.get('user_id')
        jwt_token = body.get('jwt_token', '').strip()
        
        if not user_id:
            logger.warning("[TEAM_ASSIGNMENT] Missing user_id field")
            return error_missing_field('user_id')
        
        if not jwt_token:
            logger.warning("[TEAM_ASSIGNMENT] Missing jwt_token field")
            return error_missing_field('jwt_token')
        
        # Verify JWT token
        token_result = verify_jwt_token(jwt_token)
        if not token_result['valid']:
            logger.warning(f"[TEAM_ASSIGNMENT] Invalid token for user_id: {user_id}")
            return error_invalid_token()
        
        # Verify token user_id matches request user_id
        token_user_id = token_result['payload'].get('user_id')
        if int(token_user_id) != int(user_id):
            logger.warning(f"[TEAM_ASSIGNMENT] Token user_id mismatch: {token_user_id} != {user_id}")
            return error_invalid_token()
        
        connection = None
        cursor = None
        
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            
            # Check if user already has a sweepstake country assigned
            check_query = f"""
            SELECT sweepstake_country FROM {USERS_TABLE}
            WHERE user_id = %s
            """
            
            cursor.execute(check_query, (user_id,))
            user = cursor.fetchone()
            
            if not user:
                logger.warning(f"[TEAM_ASSIGNMENT] User not found: {user_id}")
                return error_internal_server_error("User not found")
            
            if user['sweepstake_country']:
                logger.warning(f"[TEAM_ASSIGNMENT] User already has team assigned: {user_id}")
                return error_already_assigned()
            
            # Count how many users have been assigned teams
            count_query = f"""
            SELECT COUNT(*) as total_assigned FROM {USERS_TABLE}
            WHERE sweepstake_country IS NOT NULL
            """
            
            cursor.execute(count_query)
            result = cursor.fetchone()
            total_assigned = result['total_assigned'] if result else 0
            
            logger.info(f"[TEAM_ASSIGNMENT] Total users already assigned: {total_assigned}")
            
            try:
                # Get randomized country list from database
                # This ensures round-robin fairness with randomized order based on actual DB data
                randomized_countries = get_randomized_country_list_from_db(cursor)
                
                if not randomized_countries or len(randomized_countries) == 0:
                    logger.error("[TEAM_ASSIGNMENT] Randomized country list is empty")
                    return error_internal_server_error("Country list initialization failed")
                
                country_index = total_assigned % len(randomized_countries)
                assigned_country = randomized_countries[country_index]
                
                assignment_date = datetime.utcnow().isoformat()
                
                logger.info(f"[TEAM_ASSIGNMENT] Assigning country: {assigned_country} (index: {country_index}, total assigned so far: {total_assigned})")
            
            except Exception as e:
                logger.error(f"[TEAM_ASSIGNMENT] Error during country selection: {str(e)}", exc_info=True)
                return error_internal_server_error(f"Country assignment calculation failed: {str(e)}")
            
            # Update user with assigned country
            update_query = f"""
            UPDATE {USERS_TABLE}
            SET sweepstake_country = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """
            
            cursor.execute(update_query, (assigned_country, user_id))
            connection.commit()
            
            logger.info(f"[TEAM_ASSIGNMENT] Team assigned successfully: user_id={user_id}, team={assigned_country}")
            
            return success_sweepstake_assigned(user_id, assigned_country, assignment_date)
        
        except mysql.connector.Error as e:
            logger.error(f"[TEAM_ASSIGNMENT] Database error: {str(e)}")
            return error_db_connection()
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[TEAM_ASSIGNMENT] Error closing cursor: {str(e)}")
            
            if connection:
                close_db_connection(connection)
    
    except Exception as e:
        logger.error(f"[TEAM_ASSIGNMENT] Error in team assignment: {str(e)}", exc_info=True)
        return error_internal_server_error(str(e))


def handle_tournament_winner_prediction(body):
    """
    Handle tournament winner prediction
    """
    try:
        logger.info("[TOURNAMENT_PREDICTION] Processing tournament winner prediction")
        
        # Extract and validate fields
        user_id = body.get('user_id')
        jwt_token = body.get('jwt_token', '').strip()
        country = body.get('country', '').strip()
        
        if not user_id:
            logger.warning("[TOURNAMENT_PREDICTION] Missing user_id field")
            return error_missing_field('user_id')
        
        if not jwt_token:
            logger.warning("[TOURNAMENT_PREDICTION] Missing jwt_token field")
            return error_missing_field('jwt_token')
        
        if not country:
            logger.warning("[TOURNAMENT_PREDICTION] Missing country field")
            return error_missing_field('country')
        
        # Verify JWT token
        token_result = verify_jwt_token(jwt_token)
        if not token_result['valid']:
            logger.warning(f"[TOURNAMENT_PREDICTION] Invalid token for user_id: {user_id}")
            return error_invalid_token()
        
        # Verify token user_id matches request user_id
        token_user_id = token_result['payload'].get('user_id')
        if int(token_user_id) != int(user_id):
            logger.warning(f"[TOURNAMENT_PREDICTION] Token user_id mismatch: {token_user_id} != {user_id}")
            return error_invalid_token()
        
        connection = None
        cursor = None
        
        try:
            connection = get_db_connection()
            cursor = connection.cursor()
            
            # Update user's country_guess (tournament winner prediction)
            update_query = f"""
            UPDATE {USERS_TABLE}
            SET country_guess = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """
            
            cursor.execute(update_query, (country, user_id))
            connection.commit()
            
            logger.info(f"[TOURNAMENT_PREDICTION] Tournament winner prediction saved: user_id={user_id}, country={country}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'message': 'Tournament winner prediction saved',
                    'user_id': user_id,
                    'country_guess': country
                }),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        except mysql.connector.Error as e:
            logger.error(f"[TOURNAMENT_PREDICTION] Database error: {str(e)}")
            return error_db_connection()
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[TOURNAMENT_PREDICTION] Error closing cursor: {str(e)}")
            
            if connection:
                close_db_connection(connection)
    
    except Exception as e:
        logger.error(f"[TOURNAMENT_PREDICTION] Error in tournament prediction: {str(e)}", exc_info=True)
        return error_internal_server_error(str(e))


def handle_golden_boot_prediction(body):
    """
    Handle golden boot (top scorer) prediction
    """
    try:
        logger.info("[GOLDEN_BOOT_PREDICTION] Processing golden boot prediction")
        
        # Extract and validate fields
        user_id = body.get('user_id')
        jwt_token = body.get('jwt_token', '').strip()
        player_name = body.get('player_name', '').strip()
        
        if not user_id:
            logger.warning("[GOLDEN_BOOT_PREDICTION] Missing user_id field")
            return error_missing_field('user_id')
        
        if not jwt_token:
            logger.warning("[GOLDEN_BOOT_PREDICTION] Missing jwt_token field")
            return error_missing_field('jwt_token')
        
        if not player_name:
            logger.warning("[GOLDEN_BOOT_PREDICTION] Missing player_name field")
            return error_missing_field('player_name')
        
        # Verify JWT token
        token_result = verify_jwt_token(jwt_token)
        if not token_result['valid']:
            logger.warning(f"[GOLDEN_BOOT_PREDICTION] Invalid token for user_id: {user_id}")
            return error_invalid_token()
        
        # Verify token user_id matches request user_id
        token_user_id = token_result['payload'].get('user_id')
        if int(token_user_id) != int(user_id):
            logger.warning(f"[GOLDEN_BOOT_PREDICTION] Token user_id mismatch: {token_user_id} != {user_id}")
            return error_invalid_token()
        
        # Validate player name length
        if len(player_name) < 2 or len(player_name) > 100:
            logger.warning(f"[GOLDEN_BOOT_PREDICTION] Invalid player name length: {player_name}")
            return error_internal_server_error("Player name must be between 2 and 100 characters")
        
        connection = None
        cursor = None
        
        try:
            connection = get_db_connection()
            cursor = connection.cursor()
            
            # Update user's golden_boot_guess
            update_query = f"""
            UPDATE {USERS_TABLE}
            SET golden_boot_guess = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """
            
            cursor.execute(update_query, (player_name, user_id))
            connection.commit()
            
            logger.info(f"[GOLDEN_BOOT_PREDICTION] Golden boot prediction saved: user_id={user_id}, player={player_name}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'message': 'Golden boot prediction saved',
                    'user_id': user_id,
                    'golden_boot_guess': player_name
                }),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        except mysql.connector.Error as e:
            logger.error(f"[GOLDEN_BOOT_PREDICTION] Database error: {str(e)}")
            return error_db_connection()
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[GOLDEN_BOOT_PREDICTION] Error closing cursor: {str(e)}")
            
            if connection:
                close_db_connection(connection)
    
    except Exception as e:
        logger.error(f"[GOLDEN_BOOT_PREDICTION] Error in golden boot prediction: {str(e)}", exc_info=True)
        return error_internal_server_error(str(e))


def handle_golden_glove_prediction(body):
    """
    Handle golden glove (best goalkeeper) prediction
    """
    try:
        logger.info("[GOLDEN_GLOVE_PREDICTION] Processing golden glove prediction")
        
        # Extract and validate fields
        user_id = body.get('user_id')
        jwt_token = body.get('jwt_token', '').strip()
        player_name = body.get('player_name', '').strip()
        
        if not user_id:
            logger.warning("[GOLDEN_GLOVE_PREDICTION] Missing user_id field")
            return error_missing_field('user_id')
        
        if not jwt_token:
            logger.warning("[GOLDEN_GLOVE_PREDICTION] Missing jwt_token field")
            return error_missing_field('jwt_token')
        
        if not player_name:
            logger.warning("[GOLDEN_GLOVE_PREDICTION] Missing player_name field")
            return error_missing_field('player_name')
        
        # Verify JWT token
        token_result = verify_jwt_token(jwt_token)
        if not token_result['valid']:
            logger.warning(f"[GOLDEN_GLOVE_PREDICTION] Invalid token for user_id: {user_id}")
            return error_invalid_token()
        
        # Verify token user_id matches request user_id
        token_user_id = token_result['payload'].get('user_id')
        if int(token_user_id) != int(user_id):
            logger.warning(f"[GOLDEN_GLOVE_PREDICTION] Token user_id mismatch: {token_user_id} != {user_id}")
            return error_invalid_token()
        
        # Validate player name length
        if len(player_name) < 2 or len(player_name) > 100:
            logger.warning(f"[GOLDEN_GLOVE_PREDICTION] Invalid player name length: {player_name}")
            return error_internal_server_error("Player name must be between 2 and 100 characters")
        
        connection = None
        cursor = None
        
        try:
            connection = get_db_connection()
            cursor = connection.cursor()
            
            # Update user's golden_glove_guess
            update_query = f"""
            UPDATE {USERS_TABLE}
            SET golden_glove_guess = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """
            
            cursor.execute(update_query, (player_name, user_id))
            connection.commit()
            
            logger.info(f"[GOLDEN_GLOVE_PREDICTION] Golden glove prediction saved: user_id={user_id}, player={player_name}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'message': 'Golden glove prediction saved',
                    'user_id': user_id,
                    'golden_glove_guess': player_name
                }),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        except mysql.connector.Error as e:
            logger.error(f"[GOLDEN_GLOVE_PREDICTION] Database error: {str(e)}")
            return error_db_connection()
        
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"[GOLDEN_GLOVE_PREDICTION] Error closing cursor: {str(e)}")
            
            if connection:
                close_db_connection(connection)
    
    except Exception as e:
        logger.error(f"[GOLDEN_GLOVE_PREDICTION] Error in golden glove prediction: {str(e)}", exc_info=True)
        return error_internal_server_error(str(e))