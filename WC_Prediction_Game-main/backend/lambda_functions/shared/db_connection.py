# shared/db_connection.py
"""
Database connection utility for MySQL RDS
"""

import mysql.connector
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def get_db_connection():
    """
    Get MySQL RDS connection
    
    Environment variables required:
    - DB_HOST: RDS endpoint
    - DB_USER: Database username
    - DB_PASSWORD: Database password
    - DB_NAME: Database name
    
    Returns:
        mysql.connector.MySQLConnection: Database connection
        
    Raises:
        mysql.connector.Error: If connection fails
    """
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            autocommit=False  # Manual commit for transaction control
        )
        logger.info("[DB] Database connection established")
        return connection
    except mysql.connector.Error as e:
        logger.error(f"[DB] Connection failed: {str(e)}")
        raise


def close_db_connection(connection):
    """
    Close database connection safely
    
    Args:
        connection: MySQL connection object
    """
    try:
        if connection and connection.is_connected():
            connection.close()
            logger.info("[DB] Database connection closed")
    except mysql.connector.Error as e:
        logger.error(f"[DB] Error closing connection: {str(e)}")


def execute_query(connection, query, params=None):
    """
    Execute a database query safely
    
    Args:
        connection: MySQL connection object
        query: SQL query string
        params: Query parameters (tuple or list)
        
    Returns:
        cursor: MySQL cursor object
        
    Raises:
        mysql.connector.Error: If query execution fails
    """
    try:
        cursor = connection.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        logger.info(f"[DB] Query executed successfully")
        return cursor
    except mysql.connector.Error as e:
        logger.error(f"[DB] Query execution failed: {str(e)}")
        raise