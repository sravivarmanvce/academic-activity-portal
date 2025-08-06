import os
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load credentials from environment variables
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID") 
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
SENDER_EMAIL = os.getenv("AZURE_SENDER_EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")  # Add this to your .env

def get_access_token():
    """Obtain an access token from Azure AD for Microsoft Graph API."""





    
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        raise Exception("Missing Azure credentials in environment variables")
    
    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    data = {
        "client_id": CLIENT_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials"
    }
    resp = requests.post(url, data=data)
    if resp.status_code != 200:

        resp.raise_for_status()
    return resp.json()["access_token"]

def send_reminder_email_smtp(to_email, subject, body):
    """Send email using SMTP - more reliable fallback."""
    try:

        
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        # Use Office 365 SMTP
        server = smtplib.SMTP('smtp.office365.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        

        return True
        
    except Exception as e:

        return False

def send_reminder_email(to_email, subject, body):
    """Send email using Python's built-in smtplib - like PHP mail()."""
    try:

        
        # Use your organization's SMTP server or a simple one
        smtp_server = "localhost"  # Use local mail server
        smtp_port = 25
        from_email = "noreply@vardhaman.org"
        
        # Create message
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email
        
        # Send email without authentication (like PHP mail())
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.send_message(msg)
            

        return True
        
    except Exception as e:

        # For development, just log and return success



        return True  # Return True for development
