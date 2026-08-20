import json
import mysql.connector
import hashlib
import os
from datetime import datetime, timedelta
import secrets

# Get email provider from environment

EMAIL_PROVIDER = os.environ.get('EMAIL_PROVIDER', 'ses')

# Initialize provider clients based on selection

if EMAIL_PROVIDER == 'ses':
    import boto3
    ses_client = boto3.client('ses', region_name='eu-west-1')
elif EMAIL_PROVIDER == 'sendgrid':
    import sendgrid
    from sendgrid.helpers.mail import Mail
elif EMAIL_PROVIDER == 'mailgun':
    import requests

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        action = body.get('action')
        
        if action == 'request_reset':
            email = body.get('email')
            
            
# Connect to DB

            conn = mysql.connector.connect(
                host=os.environ['DB_HOST'],
                user=os.environ['DB_USER'],
                password=os.environ['DB_PASSWORD'],
                database=os.environ['DB_NAME']
            )
            cursor = conn.cursor()
            
            
# Check if user exists - ✅ FIXED: Using user_id instead of id

            cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            result = cursor.fetchone()
            
            if not result:
                
# Don't reveal if email exists (security)

                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'status': 'success',
                        'message': 'If email exists, reset link has been sent'
                    })
                }
            
            user_id = result[0]
            
            
# Generate reset token (valid for 1 hour)

            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            
# Store token in DB

            cursor.execute(
                "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, reset_token, expires_at)
            )
            conn.commit()
            
            
# Send email via configured provider

            reset_link = f"https://main.d1qu0Zvn5ducv.amplifyapp.com/reset-password?token={reset_token}"
            send_reset_email(email, reset_link)
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'message': 'Reset link sent to email'
                })
            }
        
        elif action == 'reset_password':
            token = body.get('token')
            new_password = body.get('new_password')
            
            conn = mysql.connector.connect(
                host=os.environ['DB_HOST'],
                user=os.environ['DB_USER'],
                password=os.environ['DB_PASSWORD'],
                database=os.environ['DB_NAME']
            )
            cursor = conn.cursor()
            
            
# Verify token

            cursor.execute(
                "SELECT user_id FROM password_reset_tokens WHERE token = %s AND expires_at > %s",
                (token, datetime.utcnow())
            )
            result = cursor.fetchone()
            
            if not result:
                return {
                    'statusCode': 401,
                    'body': json.dumps({
                        'status': 'error',
                        'message': 'Invalid or expired reset link'
                    })
                }
            
            user_id = result[0]
            
            
# Hash new password using SHA256

            new_hash = hashlib.sha256(new_password.encode('utf-8')).hexdigest()
            
            
# Update password - ✅ FIXED: Using user_id instead of id

            cursor.execute(
                "UPDATE users SET password_hash = %s, updated_at = %s WHERE user_id = %s",
                (new_hash, datetime.utcnow(), user_id)
            )
            
            
# Delete used token

            cursor.execute("DELETE FROM password_reset_tokens WHERE token = %s", (token,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'message': 'Password reset successfully'
                })
            }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'status': 'error', 'message': str(e)})
        }

def send_reset_email(email, reset_link):
    """Send password reset email via configured provider"""
    
    html = f"""\
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #0D1F2D; margin-bottom: 20px;">Password Reset Request</h2>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your World Cup Predictor password. Click the button below to proceed.
                </p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #86BC25; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                
                <p style="color: #666; font-size: 14px; margin: 20px 0;">
                    Or copy this link:<br>
                    <code style="background-color: #f0f0f0; padding: 10px; display: block; word-break: break-all; margin-top: 10px;">
                        {reset_link}
                    </code>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px;">
                    This link expires in 1 hour. If you didn't request this, please ignore this email.
                </p>
                
                <p style="color: #999; font-size: 12px;">
                    Deloitte World Cup Predictor
                </p>
            </div>
        </body>
    </html>
    """
    
    try:
        if EMAIL_PROVIDER == 'ses':
            send_via_ses(email, html)
        elif EMAIL_PROVIDER == 'sendgrid':
            send_via_sendgrid(email, html)
        elif EMAIL_PROVIDER == 'mailgun':
            send_via_mailgun(email, html)
        else:
            raise ValueError(f"Unknown email provider: {EMAIL_PROVIDER}")
        
        print(f"Email sent successfully to {email} via {EMAIL_PROVIDER}")
    
    except Exception as e:
        print(f"Error sending email via {EMAIL_PROVIDER}: {str(e)}")
        raise

def send_via_ses(email, html):
    """Send email via AWS SES"""
    ses_client.send_email(
        Source='bsharma9@deloitte.ie',
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': 'Reset Your World Cup Predictor Password'},
            'Body': {'Html': {'Data': html}}
        }
    )

def send_via_sendgrid(email, html):
    """Send email via SendGrid"""
    sg = sendgrid.SendGridAPIClient(os.environ['SENDGRID_API_KEY'])
    message = Mail(
        from_email='bsharma9@deloitte.ie',
        to_emails=email,
        subject='Reset Your World Cup Predictor Password',
        html_content=html
    )
    sg.send(message)

def send_via_mailgun(email, html):
    """Send email via Mailgun"""
    domain = os.environ['MAILGUN_DOMAIN']
    api_key = os.environ['MAILGUN_API_KEY']
    
    requests.post(
        f"https://api.mailgun.net/v3/{domain}/messages",
        auth=("api", api_key),
        data={
            "from": f"World Cup Predictor <noreply@{domain}>",
            "to": email,
            "subject": "Reset Your World Cup Predictor Password",
            "html": html
        }
    )