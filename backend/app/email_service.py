# app/email_service.py

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
import aiofiles
from jinja2 import Environment, FileSystemLoader
from pathlib import Path

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.sender_email = os.getenv("SENDER_EMAIL", "")
        self.sender_name = os.getenv("SENDER_NAME", "Academic Activity Portal")
        
        # Setup Jinja2 environment for templates
        template_dir = Path(__file__).parent / "email_templates"
        template_dir.mkdir(exist_ok=True)
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        template_name: str,
        template_data: dict,
        cc_emails: Optional[List[str]] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Send email using SMTP with HTML template
        """
        try:
            # Load and render template
            template = self.jinja_env.get_template(template_name)
            html_content = template.render(**template_data)
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.sender_name} <{self.sender_email}>"
            msg['To'] = ", ".join(to_emails)
            
            if cc_emails:
                msg['Cc'] = ", ".join(cc_emails)
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for file_path in attachments:
                    if os.path.isfile(file_path):
                        with open(file_path, "rb") as attachment:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {os.path.basename(file_path)}'
                            )
                            msg.attach(part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                
                all_recipients = to_emails + (cc_emails or [])
                server.send_message(msg, to_addrs=all_recipients)
            
            print(f"✅ Email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email: {str(e)}")
            return False
    
    async def send_budget_submission_notification(
        self, 
        hod_email: str, 
        hod_name: str,
        department_name: str,
        academic_year: str,
        principal_email: str,
        principal_name: str = "Principal"
    ):
        """Notify Principal when HoD submits budget for approval"""
        template_data = {
            "hod_name": hod_name,
            "department_name": department_name,
            "academic_year": academic_year,
            "principal_name": principal_name,
            "portal_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "year": "2025"
        }
        
        subject = f"Budget Submission for Approval - {department_name} ({academic_year})"
        
        return await self.send_email(
            to_emails=[principal_email],
            subject=subject,
            template_name="budget_submission.html",
            template_data=template_data,
            cc_emails=[hod_email]
        )
    
    async def send_budget_approval_notification(
        self,
        hod_email: str,
        hod_name: str,
        department_name: str,
        academic_year: str,
        approved: bool,
        remarks: str = ""
    ):
        """Notify HoD when Principal approves/rejects budget"""
        template_data = {
            "hod_name": hod_name,
            "department_name": department_name,
            "academic_year": academic_year,
            "approved": approved,
            "remarks": remarks,
            "portal_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "year": "2025"
        }
        
        status = "Approved" if approved else "Requires Revision"
        subject = f"Budget {status} - {department_name} ({academic_year})"
        
        return await self.send_email(
            to_emails=[hod_email],
            subject=subject,
            template_name="budget_approval.html",
            template_data=template_data
        )
    
    async def send_event_submission_notification(
        self,
        hod_email: str,
        hod_name: str,
        department_name: str,
        academic_year: str,
        principal_email: str,
        principal_name: str = "Principal",
        event_count: int = 0
    ):
        """Notify Principal when HoD submits events for approval"""
        template_data = {
            "hod_name": hod_name,
            "department_name": department_name,
            "academic_year": academic_year,
            "principal_name": principal_name,
            "event_count": event_count,
            "portal_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "year": "2025"
        }
        
        subject = f"Event Plans Submitted for Approval - {department_name} ({academic_year})"
        
        return await self.send_email(
            to_emails=[principal_email],
            subject=subject,
            template_name="event_submission.html",
            template_data=template_data,
            cc_emails=[hod_email]
        )
    
    async def send_deadline_reminder(
        self,
        user_email: str,
        user_name: str,
        department_name: str,
        academic_year: str,
        deadline_date: str,
        days_remaining: int,
        module_name: str = "Budget Submission"
    ):
        """Send deadline reminder notification"""
        template_data = {
            "user_name": user_name,
            "department_name": department_name,
            "academic_year": academic_year,
            "deadline_date": deadline_date,
            "days_remaining": days_remaining,
            "module_name": module_name,
            "portal_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "year": "2025"
        }
        
        subject = f"Reminder: {module_name} Deadline - {days_remaining} day(s) remaining"
        
        return await self.send_email(
            to_emails=[user_email],
            subject=subject,
            template_name="deadline_reminder.html",
            template_data=template_data
        )

# Create singleton instance
email_service = EmailService()
