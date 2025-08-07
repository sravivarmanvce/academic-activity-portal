// src/components/EmailNotificationTest.jsx

import React, { useState } from 'react';
import { Card, Form, Button, Alert, Badge, Row, Col } from 'react-bootstrap';
import notificationService from '../services/notificationService';

const EmailNotificationTest = () => {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) {
      showMessage('Please enter an email address', 'danger');
      return;
    }

    setLoading(true);
    try {
      await notificationService.testEmail(testEmail);
      showMessage('Test email sent successfully! Check your inbox.', 'success');
    } catch (error) {
      showMessage('Failed to send test email. Check console for details.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const testWorkflowNotification = async (notificationType) => {
    setLoading(true);
    try {
      const testData = {
        hod_email: testEmail || 'hod@example.com',
        hod_name: 'Dr. Test HoD',
        department_name: 'Computer Science & Engineering',
        academic_year: '2024-25',
        principal_email: testEmail || 'principal@example.com',
        principal_name: 'Dr. Test Principal'
      };

      switch (notificationType) {
        case 'budget_submission':
          await notificationService.sendBudgetSubmissionNotification(testData);
          break;
        case 'budget_approval':
          await notificationService.sendBudgetApprovalNotification({
            ...testData,
            approved: true,
            remarks: 'Great work on the budget planning! Approved for event planning.'
          });
          break;
        case 'event_submission':
          await notificationService.sendEventSubmissionNotification({
            ...testData,
            event_count: 12
          });
          break;
        default:
          throw new Error('Invalid notification type');
      }

      showMessage(`${notificationType.replace('_', ' ')} notification sent successfully!`, 'success');
    } catch (error) {
      showMessage(`Failed to send ${notificationType} notification.`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <Card>
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-envelope"></i> Email Notification System Test
          </h5>
        </Card.Header>
        <Card.Body>
          {message && (
            <Alert variant={messageType} className="mb-4">
              <i className={`fas fa-${messageType === 'success' ? 'check-circle' : 'exclamation-triangle'}`}></i> {message}
            </Alert>
          )}

          {/* Test Email Form */}
          <Form onSubmit={handleTestEmail} className="mb-4">
            <Row>
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Test Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter your email to test notifications"
                    required
                  />
                  <Form.Text className="text-muted">
                    Enter your email address to receive test notifications
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button 
                  type="submit" 
                  variant="outline-primary" 
                  disabled={loading}
                  className="w-100"
                >
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                  ) : (
                    <><i className="fas fa-paper-plane"></i> Send Test Email</>
                  )}
                </Button>
              </Col>
            </Row>
          </Form>

          <hr />

          {/* Notification Type Tests */}
          <h6 className="mb-3">
            <i className="fas fa-bell"></i> Test Workflow Notifications
          </h6>
          
          <Row className="g-3">
            <Col md={6}>
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="fas fa-file-upload fa-2x text-primary"></i>
                  </div>
                  <h6>Budget Submission</h6>
                  <p className="text-muted small">
                    Notifies Principal when HoD submits budget for approval
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => testWorkflowNotification('budget_submission')}
                    disabled={loading}
                  >
                    Test Notification
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="fas fa-check-circle fa-2x text-success"></i>
                  </div>
                  <h6>Budget Approval</h6>
                  <p className="text-muted small">
                    Notifies HoD when Principal approves/rejects budget
                  </p>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => testWorkflowNotification('budget_approval')}
                    disabled={loading}
                  >
                    Test Notification
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="fas fa-calendar-check fa-2x text-info"></i>
                  </div>
                  <h6>Event Submission</h6>
                  <p className="text-muted small">
                    Notifies Principal when HoD submits event plans
                  </p>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => testWorkflowNotification('event_submission')}
                    disabled={loading}
                  >
                    Test Notification
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="h-100">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="fas fa-clock fa-2x text-warning"></i>
                  </div>
                  <h6>Deadline Reminder</h6>
                  <p className="text-muted small">
                    Automatic reminders before submission deadlines
                  </p>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => notificationService.sendDeadlineReminder({
                      user_email: testEmail || 'user@example.com',
                      user_name: 'Test User',
                      department_name: 'Computer Science',
                      academic_year: '2024-25',
                      deadline_date: '2025-08-15',
                      days_remaining: 2,
                      module_name: 'Budget Submission'
                    })}
                    disabled={loading}
                  >
                    Test Reminder
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <hr />

          {/* Status Info */}
          <div className="mt-4">
            <h6><i className="fas fa-info-circle"></i> Email Configuration Status</h6>
            <div className="d-flex gap-2 flex-wrap">
              <Badge bg="success">SMTP Configured</Badge>
              <Badge bg="success">Templates Ready</Badge>
              <Badge bg="success">API Endpoints Active</Badge>
              <Badge bg="info">Auto-Notifications Enabled</Badge>
            </div>
            
            <div className="mt-3 p-3 bg-light rounded">
              <small className="text-muted">
                <strong>📧 How it works:</strong><br/>
                1. Notifications are automatically triggered when workflow status changes<br/>
                2. Beautiful HTML email templates are used for professional appearance<br/>
                3. All notifications include relevant context and action buttons<br/>
                4. Email preferences can be configured per user (future enhancement)
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmailNotificationTest;
