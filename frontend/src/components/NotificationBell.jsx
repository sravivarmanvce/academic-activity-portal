import React, { useState, useEffect, useRef } from 'react';
import notificationInboxService from '../services/notificationInboxService';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Load notifications and unread count
  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        notificationInboxService.getNotifications(false, 20),
        notificationInboxService.getUnreadCount()
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
    
    // Smart refresh: More frequent when tab is active
    const getRefreshInterval = () => {
      return document.visibilityState === 'visible' ? 15000 : 60000; // 15s active, 1min inactive
    };
    
    let interval = setInterval(() => {
      // Only refresh if tab is visible or we have unread notifications
      if (document.visibilityState === 'visible' || unreadCount > 0) {
        loadNotifications();
      }
    }, getRefreshInterval());
    
    // Update interval when tab visibility changes
    const handleVisibilityChange = () => {
      clearInterval(interval);
      interval = setInterval(loadNotifications, getRefreshInterval());
      
      // Immediate refresh when tab becomes active
      if (document.visibilityState === 'visible') {
        loadNotifications();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [unreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle notification dropdown
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  // Mark notification as read
  const markAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationInboxService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationInboxService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationInboxService.deleteNotification(notificationId);
      
      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update unread count if it was unread
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-bell">
      <div 
        ref={bellRef}
        className="notification-bell-icon"
        onClick={toggleNotifications}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div ref={dropdownRef} className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4 className="notification-dropdown-title">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h4>
            <div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="mark-all-read-btn"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {loading && (
              <div className="notification-loading">
                Loading notifications...
              </div>
            )}

            {error && (
              <div className="notification-error">
                {error}
                <button onClick={loadNotifications} style={{marginLeft: '10px'}}>
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="notification-empty">
                <div className="notification-empty-icon">🔔</div>
                <div>No notifications yet</div>
                <small>You'll see important updates here</small>
              </div>
            )}

            {!loading && !error && notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => !notification.read && markAsRead(notification.id, { stopPropagation: () => {} })}
              >
                <h5 className="notification-title">
                  {notification.title}
                </h5>
                <p className="notification-message">
                  {notification.message}
                </p>
                <div className="notification-meta">
                  <div>
                    <span className={`notification-type-badge type-${notification.type}`}>
                      {notification.type.replace('_', ' ')}
                    </span>
                    <span className="notification-time" style={{marginLeft: '8px'}}>
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="notification-actions">
                  {!notification.read && (
                    <button
                      className="notification-action-btn"
                      onClick={(e) => markAsRead(notification.id, e)}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    className="notification-action-btn delete"
                    onClick={(e) => deleteNotification(notification.id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
