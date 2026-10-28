import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { DateTime } from 'luxon';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Poll unread count every 15 seconds
  useEffect(() => {
    let intervalId;

    const fetchUnreadCount = async () => {
      // Don't poll if page is hidden
      if (document.hidden) return;
      try {
        const { data } = await api.get('/notifications/unread-count');
        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        // Silently ignore polling errors
      }
    };

    fetchUnreadCount();
    intervalId = setInterval(fetchUnreadCount, 15000);

    // Pause when tab becomes hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchUnreadCount();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    if (!isOpen) {
      setIsOpen(true);
      setLoading(true);
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-xl text-slate-600 hover:text-teal-600 hover:bg-slate-100 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No notifications right now
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !notif.isRead ? 'bg-teal-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs ${!notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {DateTime.fromISO(notif.createdAt).toRelative()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

