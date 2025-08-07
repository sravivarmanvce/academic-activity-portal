# Email Notification System Documentation

## Overview

The Academic Activity Portal now includes a comprehensive email notification system that automatically sends notifications for key workflow events. This system improves communication between HoDs and Principals throughout the budget planning and event management process.

## ✨ Features Implemented

### 🔧 Backend Components

1. **Email Service (`app/email_service.py`)**
   - SMTP configuration with environment variables
   - Jinja2 template rendering
   - Support for HTML emails with attachments
   - Error handling and logging

2. **Email Templates (`app/email_templates/`)**
   - `budget_submission.html` - Notifies Principal of budget submission
   - `budget_approval.html` - Notifies HoD of approval/rejection
   - `event_submission.html` - Notifies Principal of event submission
   - `deadline_reminder.html` - Deadline reminders with urgency levels

3. **API Endpoints (`app/api/endpoints/notifications.py`)**
   - `/notifications/send-budget-submission-notification`
   - `/notifications/send-budget-approval-notification`
   - `/notifications/send-event-submission-notification`
   - `/notifications/send-deadline-reminder`
   - `/notifications/test-email`

4. **Workflow Integration**
   - Automatic email triggers on status changes
   - Context-aware notifications based on user roles
   - Asynchronous email sending

### 🎨 Frontend Components

1. **Notification Service (`src/services/notificationService.js`)**
   - Centralized email notification management
   - Integration with existing API calls
   - Auto-trigger functionality for workflow changes

2. **Test Interface (`src/components/EmailNotificationTest.jsx`)**
   - Email testing interface for administrators
   - Preview different notification types
   - Validation of email configuration

## 📧 Email Templates

### Template Features
- **Professional Design**: Modern, responsive HTML templates
- **Brand Consistency**: Academic Activity Portal branding
- **Clear Call-to-Actions**: Direct links to portal actions
- **Status Indicators**: Visual status badges and progress indicators
- **Responsive Design**: Works on desktop and mobile email clients

### Template Types

1. **Budget Submission Notification**
   - Recipient: Principal
   - Trigger: HoD submits budget for approval
   - Content: Department details, submission summary, review link

2. **Budget Approval Notification**
   - Recipient: HoD
   - Trigger: Principal approves/rejects budget
   - Content: Approval status, remarks, next steps

3. **Event Submission Notification**
   - Recipient: Principal
   - Trigger: HoD submits event plans
   - Content: Event count, department details, review link

4. **Deadline Reminder**
   - Recipient: Users with pending tasks
   - Trigger: Scheduled/manual
   - Content: Countdown, urgency indicators, task details

## 🛠️ Configuration

### Environment Variables (.env)
```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=your-email@gmail.com
SENDER_NAME=Academic Activity Portal
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use App Password in SMTP_PASSWORD

## 🚀 Usage Examples

### Manual Email Sending
```javascript
import notificationService from '../services/notificationService';

// Send budget submission notification
await notificationService.sendBudgetSubmissionNotification({
  hod_email: 'hod@university.edu',
  hod_name: 'Dr. John Doe',
  department_name: 'Computer Science',
  academic_year: '2024-25',
  principal_email: 'principal@university.edu',
  principal_name: 'Dr. Jane Smith'
});
```

### Automatic Workflow Notifications
The system automatically sends notifications when:
- Workflow status changes (draft → submitted → approved)
- Events are submitted for approval
- Deadlines approach (configurable)

## 📊 Notification Flow

```
HoD Submits Budget
       ↓
Email → Principal (Budget Submission)
       ↓
Principal Approves
       ↓
Email → HoD (Budget Approved)
       ↓
HoD Plans Events
       ↓
HoD Submits Events
       ↓
Email → Principal (Event Submission)
       ↓
Principal Approves Events
       ↓
Email → HoD (Events Approved)
```

## 🧪 Testing

### Email Testing Interface
Access the email testing interface at:
- **Route**: `/admin/email-test` (to be added to navigation)
- **Component**: `EmailNotificationTest.jsx`

### Features:
- Send test emails to any address
- Preview all notification types
- Validate SMTP configuration
- Check template rendering

### Backend Test Script
```bash
cd backend
python test_email.py
```

## 🔮 Future Enhancements

### Phase 1.2 Planned Features
- [ ] **User Email Preferences**
  - Opt-in/out for different notification types
  - Frequency settings (immediate, daily digest)
  - Notification channels (email, SMS, in-app)

- [ ] **Advanced Scheduling**
  - Recurring deadline reminders
  - Custom reminder intervals
  - Bulk reminder sending

- [ ] **Email Analytics**
  - Open/click tracking
  - Delivery status monitoring
  - Engagement metrics

- [ ] **Template Customization**
  - Admin interface for template editing
  - Multiple template themes
  - Internationalization support

## 📋 Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP credentials in .env
   - Verify firewall/port settings
   - Check Gmail security settings

2. **Template Rendering Errors**
   - Ensure template files exist in `email_templates/`
   - Validate template data structure
   - Check Jinja2 syntax

3. **Workflow Integration Issues**
   - Verify user email addresses in database
   - Check department/user associations
   - Monitor console logs for errors

### Debug Steps
1. Use the email test interface
2. Check backend console logs
3. Verify SMTP connection manually
4. Test with simple email content

## 📞 Support

For technical support or feature requests:
- Check the troubleshooting section
- Review backend logs for error details
- Test email configuration using provided tools
- Contact system administrator

---

**🎉 The Email Notification System is now live and ready to improve communication in your Academic Activity Portal!**
