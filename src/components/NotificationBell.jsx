import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

import useSmartPolling from '../hooks/useSmartPolling';

const getRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHour < 24) return `${diffHour} saat önce`;
    if (diffDay < 7) return `${diffDay} gün önce`;
    return date.toLocaleDateString('tr-TR');
};

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // 1. Lightweight Polling for Badge
    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/notifications/unread-count/');
            setUnreadCount(response.data.count);
        } catch (error) {
            // silent fail
        }
    };

    useSmartPolling(fetchUnreadCount, 15000); // Poll count every 15s

    // 2. Heavy Fetch for List (Only when open or initial)
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get('/notifications/');
            const data = response.data.results || response.data;
            setNotifications(data);
            // Sync count from full data just in case
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchUnreadCount();
    }, []);

    // Fetch list when opened
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Click-outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Escape key handler
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const markAsRead = async (id) => {
        try {
            await api.post(`/notifications/${id}/mark_read/`);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications/mark_all_read/');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'SUCCESS': return 'bg-emerald-500';
            case 'WARNING': return 'bg-amber-500';
            case 'ERROR': return 'bg-red-500';
            default: return 'bg-blue-500';
        }
    };

    const getTypeBorderColor = (type) => {
        switch (type) {
            case 'SUCCESS': return 'border-l-emerald-500';
            case 'WARNING': return 'border-l-amber-500';
            case 'ERROR': return 'border-l-red-500';
            default: return 'border-l-blue-500';
        }
    };

    const renderBadge = () => {
        if (unreadCount <= 0) return null;

        if (unreadCount > 99) {
            return (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white leading-none">99+</span>
                </span>
            );
        }

        return (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
                <Bell size={20} />
                {renderBadge()}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Bildirimler</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Tümünü Okundu İşaretle
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] md:max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">
                                <Loader2 size={24} className="mx-auto mb-2 animate-spin opacity-50" />
                                <p className="text-sm">Yükleniyor...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 border-l-[3px] ${getTypeBorderColor(notification.type)} ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!notification.is_read ? getIconColor(notification.type) : 'bg-transparent'}`}></div>
                                        <div className="flex-1">
                                            <p className={`text-sm truncate ${!notification.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-2">
                                                {getRelativeTime(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Bildiriminiz yok</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
