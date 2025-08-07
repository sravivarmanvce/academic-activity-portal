// Frontend notification service for API calls
import API from '../Api';

class NotificationInboxService {
  // Get all notifications for current user
  async getNotifications(unreadOnly = false, limit = 50) {
    try {
      const response = await API.get(`/notifications/notifications?unread_only=${unreadOnly}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await API.get('/notifications/notifications/unread-count');
      return response.data.unread_count;
    } catch (error) {
      console.error('❌ Failed to fetch unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await API.patch(`/notifications/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await API.patch('/notifications/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await API.delete(`/notifications/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      throw error;
    }
  }
}

const notificationInboxService = new NotificationInboxService();
export default notificationInboxService;
