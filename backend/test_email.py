# test_email.py - Test script for email functionality

import asyncio
import os
from dotenv import load_dotenv

# Add the app directory to the path
import sys
sys.path.append('app')

from email_service import email_service

async def test_email_notification():
    """Test email notification system"""
    print("🧪 Testing Email Notification System...")
    
    # Test email configuration
    test_email = "your-test-email@example.com"  # Replace with your email
    
    try:
        # Test deadline reminder
        success = await email_service.send_deadline_reminder(
            user_email=test_email,
            user_name="Test User",
            department_name="Computer Science & Engineering",
            academic_year="2024-25",
            deadline_date="2025-08-10",
            days_remaining=3,
            module_name="Budget Submission"
        )
        
        if success:
            print("✅ Test email sent successfully!")
            print(f"   📧 Sent to: {test_email}")
            print("   📋 Type: Deadline Reminder")
        else:
            print("❌ Failed to send test email")
            
    except Exception as e:
        print(f"❌ Error testing email: {str(e)}")
        print("\n💡 Make sure to:")
        print("   1. Update SMTP credentials in .env file")
        print("   2. Enable 'Less secure app access' or use App Password for Gmail")
        print("   3. Replace test email address with your actual email")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Run test
    asyncio.run(test_email_notification())
