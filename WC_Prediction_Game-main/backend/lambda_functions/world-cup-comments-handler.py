import json
import re
import boto3
import logging
import mysql.connector
import os
from datetime import datetime
import jwt

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Database config from environment
db_config = {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'charset': 'utf8mb4'
}

JWT_SECRET = os.environ.get('JWT_SECRET_KEY')

# Valid emoji reactions
VALID_REACTIONS = ['👍', '😂', '🔥', '❤️', '🤯', '😢']

def get_db_connection():
    """Create and return a database connection"""
    return mysql.connector.connect(**db_config)

def verify_jwt(token):
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('user_id')
    except Exception as e:
        logger.error(f"JWT verification failed: {str(e)}")
        return None

def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        logger.info(f"Event: {json.dumps(event)}")
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        logger.info(f"Action: {action}")
        
        # Route to appropriate handler
        if action == 'post_comment':
            return post_comment(body)
        elif action == 'get_comments':
            return get_comments(body)
        elif action == 'delete_comment':
            return delete_comment(body)
        elif action == 'add_reaction':
            return add_reaction(body)
        elif action == 'remove_reaction':
            return remove_reaction(body)
        else:
            return error_response('Invalid action', 400)
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def post_comment(data):
    """Post a new comment"""
    try:
        user_id = data.get('user_id')
        text = data.get('text', '').strip()
        jwt_token = data.get('jwt_token')
        
        # Validate content
        if not text or len(text) > 500:
            return error_response('Comment must be 1-500 characters', 400)
        
        if len(text) < 2:
            return error_response('Comment too short (min 2 characters)', 400)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Insert comment (using 'content' column, not 'text')
            # target_user_id is set to NULL for general comments (not replies)
            cursor.execute("""
                INSERT INTO comments (user_id, target_user_id, content, created_at, is_deleted)
                VALUES (%s, NULL, %s, NOW(), FALSE)
            """, (user_id, text))
            
            conn.commit()
            
            logger.info(f"Comment posted by user {user_id}")
            
            return success_response({
                'message': 'Comment posted successfully'
            })
        
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        logger.error(f"Post comment error: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def get_comments(data):
    """Get all comments with user information"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get all non-deleted comments with user email via JOIN
            cursor.execute("""
                SELECT 
                    c.id, 
                    c.user_id, 
                    u.email as username,
                    c.content as text, 
                    c.created_at
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.user_id
                WHERE c.is_deleted = FALSE
                ORDER BY c.created_at DESC
            """)
            
            comments_data = cursor.fetchall()
            comments = []
            
            for comment in comments_data:
                comment_id = comment['id']
                
                # Get reaction counts for this comment
                cursor.execute("""
                    SELECT reaction_type, COUNT(*) as count
                    FROM comment_reactions
                    WHERE comment_id = %s
                    GROUP BY reaction_type
                """, (comment_id,))
                
                reactions_data = cursor.fetchall()
                reactions = {}
                for r in reactions_data:
                    reactions[r['reaction_type']] = r['count']
                
                # Initialize all reactions to 0
                for emoji in VALID_REACTIONS:
                    if emoji not in reactions:
                        reactions[emoji] = 0
                
                comments.append({
                    'id': comment_id,
                    'user_id': comment['user_id'],
                    'username': comment['username'],
                    'text': comment['text'],
                    'created_at': comment['created_at'].isoformat() if comment['created_at'] else None,
                    'reactions': reactions
                })
            
            logger.info(f"Retrieved {len(comments)} comments")
            
            return success_response({'comments': comments})
        
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        logger.error(f"Get comments error: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def delete_comment(data):
    """Delete a comment (soft delete)"""
    try:
        comment_id = data.get('comment_id')
        user_id = data.get('user_id')
        
        if not comment_id:
            return error_response('comment_id required', 400)
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Check if user is comment author
            cursor.execute("""
                SELECT user_id FROM comments WHERE id = %s
            """, (comment_id,))
            
            result = cursor.fetchone()
            if not result:
                return error_response('Comment not found', 404)
            
            if result['user_id'] != user_id:
                return error_response('You can only delete your own comments', 403)
            
            # Soft delete
            cursor.execute("""
                UPDATE comments SET is_deleted = TRUE WHERE id = %s
            """, (comment_id,))
            
            conn.commit()
            
            logger.info(f"Comment {comment_id} deleted by user {user_id}")
            
            return success_response({'message': 'Comment deleted'})
        
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        logger.error(f"Delete comment error: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def add_reaction(data):
    """Add a reaction to a comment"""
    try:
        comment_id = data.get('comment_id')
        user_id = data.get('user_id')
        emoji = data.get('emoji')
        
        # Validate inputs
        if not all([comment_id, user_id, emoji]):
            return error_response('Missing required fields', 400)
        
        if emoji not in VALID_REACTIONS:
            return error_response(f'Invalid reaction type. Valid: {VALID_REACTIONS}', 400)
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Check if comment exists
            cursor.execute("""
                SELECT id FROM comments WHERE id = %s AND is_deleted = FALSE
            """, (comment_id,))
            
            if not cursor.fetchone():
                return error_response('Comment not found', 404)
            
            # Check if reaction already exists
            cursor.execute("""
                SELECT id FROM comment_reactions
                WHERE comment_id = %s AND user_id = %s AND reaction_type = %s
            """, (comment_id, user_id, emoji))
            
            if cursor.fetchone():
                return error_response('You already reacted with this emoji', 400)
            
            # Add reaction
            cursor.execute("""
                INSERT INTO comment_reactions (comment_id, user_id, reaction_type, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (comment_id, user_id, emoji))
            
            conn.commit()
            
            logger.info(f"Reaction {emoji} added to comment {comment_id} by user {user_id}")
            
            return success_response({'message': 'Reaction added'})
        
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        logger.error(f"Add reaction error: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def remove_reaction(data):
    """Remove a reaction from a comment"""
    try:
        comment_id = data.get('comment_id')
        user_id = data.get('user_id')
        emoji = data.get('emoji')
        
        if not all([comment_id, user_id, emoji]):
            return error_response('Missing required fields', 400)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Remove reaction
            cursor.execute("""
                DELETE FROM comment_reactions
                WHERE comment_id = %s AND user_id = %s AND reaction_type = %s
            """, (comment_id, user_id, emoji))
            
            conn.commit()
            
            logger.info(f"Reaction {emoji} removed from comment {comment_id} by user {user_id}")
            
            return success_response({'message': 'Reaction removed'})
        
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        logger.error(f"Remove reaction error: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def success_response(data):
    """Return success response"""
    return {
        'statusCode': 200,
        'body': json.dumps({'status': 'success', 'data': data})
    }

def error_response(message, status_code=400):
    """Return error response"""
    return {
        'statusCode': status_code,
        'body': json.dumps({'status': 'error', 'message': message})
    }
    