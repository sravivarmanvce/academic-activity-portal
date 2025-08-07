// src/services/notificationService.js

import API from '../Api';

class NotificationService {
  // Send budget submission notification
  async sendBudgetSubmissionNotification(data) {
    try {
      const response = await API.post('/notifications/send-budget-submission-notification', data);
      console.log('✅ Budget submission notification sent');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send budget submission notification:', error);
      throw error;
    }
  }

  // Send budget approval notification
  async sendBudgetApprovalNotification(data) {
    try {
      const response = await API.post('/notifications/send-budget-approval-notification', data);
      console.log('✅ Budget approval notification sent');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send budget approval notification:', error);
      throw error;
    }
  }

  // Send event submission notification
  async sendEventSubmissionNotification(data) {
    try {
      const response = await API.post('/notifications/send-event-submission-notification', data);
      console.log('✅ Event submission notification sent');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send event submission notification:', error);
      throw error;
    }
  }

  // Send deadline reminder
  async sendDeadlineReminder(data) {
    try {
      const response = await API.post('/notifications/send-deadline-reminder', data);
      console.log('✅ Deadline reminder sent');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send deadline reminder:', error);
      throw error;
    }
  }

  // Test email functionality
  async testEmail(email) {
    try {
      const response = await API.post(`/notifications/test-email?to_email=${email}`);
      console.log('✅ Test email sent');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      throw error;
    }
  }

  // Get user details for email notifications
  async getUserDetails(departmentId, role = 'hod') {
    try {
      const response = await API.get(`/users?department_id=${departmentId}&role=${role}`);
      return response.data[0]; // Return first matching user
    } catch (error) {
      console.error('❌ Failed to get user details:', error);
      return null;
    }
  }

  // Get principal details
  async getPrincipalDetails() {
    try {
      const response = await API.get(`/users?role=principal`);
      return response.data[0]; // Return first principal
    } catch (error) {
      console.error('❌ Failed to get principal details:', error);
      return null;
    }
  }

  // Enhanced reminder methods to integrate with existing ProgramEntrySummary
  async sendReminderToHoD(deptId, academicYearId) {
    try {
      const response = await API.post('/reminder/send', {
        dept_id: deptId,
        academic_year_id: academicYearId
      });
      console.log('✅ Enhanced reminder sent to HoD');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send reminder to HoD:', error);
      throw error;
    }
  }

  // Bulk reminder for multiple departments
  async sendBulkReminders(deptIds, academicYearId) {
    try {
      const response = await API.post('/reminder/bulk-send', {
        dept_ids: deptIds,
        academic_year_id: academicYearId
      });
      console.log('✅ Bulk reminders sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send bulk reminders:', error);
      throw error;
    }
  }

  // Calculate deadline remaining days
  calculateDaysRemaining(deadlineDate) {
    const now = new Date();
    const deadline = new Date(deadlineDate);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Get appropriate urgency level for reminders
  getUrgencyLevel(daysRemaining) {
    if (daysRemaining <= 0) return 'overdue';
    if (daysRemaining <= 1) return 'critical';
    if (daysRemaining <= 3) return 'urgent';
    if (daysRemaining <= 7) return 'warning';
    return 'normal';
  }

  // Auto-trigger notification based on workflow status change
  async triggerWorkflowNotification(departmentId, academicYearId, oldStatus, newStatus) {
    try {
      // Get department details
      const deptResponse = await API.get('/departments');
      const department = deptResponse.data.find(d => d.id === departmentId);
      
      // Get academic year details
      const yearResponse = await API.get('/academic-years');
      const academicYear = yearResponse.data.find(y => y.id === academicYearId);
      
      if (!department || !academicYear) {
        throw new Error('Department or Academic Year not found');
      }

      // Get user details
      const hod = await this.getUserDetails(departmentId, 'hod');
      const principal = await this.getPrincipalDetails();

      if (!hod || !principal) {
        console.warn('⚠️ Could not find HoD or Principal for notifications');
        return;
      }

      // Trigger appropriate notification based on status change
      if (oldStatus === 'draft' && newStatus === 'submitted') {
        // Budget submitted for approval
        await this.sendBudgetSubmissionNotification({
          hod_email: hod.email,
          hod_name: hod.name,
          department_name: department.name,
          academic_year: academicYear.year,
          principal_email: principal.email,
          principal_name: principal.name
        });
      } else if (oldStatus === 'submitted' && newStatus === 'approved') {
        // Budget approved
        await this.sendBudgetApprovalNotification({
          hod_email: hod.email,
          hod_name: hod.name,
          department_name: department.name,
          academic_year: academicYear.year,
          approved: true,
          remarks: "Budget approved successfully! You can now plan individual events."
        });
      } else if (oldStatus === 'approved' && newStatus === 'events_submitted') {
        // Events submitted for approval
        await this.sendEventSubmissionNotification({
          hod_email: hod.email,
          hod_name: hod.name,
          department_name: department.name,
          academic_year: academicYear.year,
          principal_email: principal.email,
          principal_name: principal.name,
          event_count: 0 // TODO: Get actual event count
        });
      }
    } catch (error) {
      console.error('❌ Failed to trigger workflow notification:', error);
      // Don't throw error to prevent breaking the workflow
    }
  }
}

export default new NotificationService();
