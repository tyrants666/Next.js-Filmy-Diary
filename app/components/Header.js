'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { IoBookmark, IoPlayCircle, IoCheckmarkCircle, IoCompass, IoPeople, IoNotifications, IoPersonAdd, IoClose, IoTime } from 'react-icons/io5';
import UserDropdown from './UserDropdown';
import GoogleLoginButton from './GoogleLoginButton';
import SearchInput from './SearchInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Header = ({ currentPage = 'home', showSearch = false, searchProps = {} }) => {
    const { user, signOut, isSigningOut } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [processingRequest, setProcessingRequest] = useState(null);
    const notificationRef = useRef(null);

    // Calculate time ago
    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    // Fetch friend requests as notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoadingNotifications(true);
            
            // Fetch received requests (pending ones you need to respond to)
            const receivedResponse = await fetch(`/api/friend-requests?userId=${user.id}`);
            const receivedData = await receivedResponse.json();
            
            // Fetch sent requests (to see if they were accepted)
            const sentResponse = await fetch(`/api/friend-requests?userId=${user.id}&type=sent`);
            const sentData = await sentResponse.json();
            
            let allNotifs = [];
            
            if (receivedResponse.ok) {
                // Transform received requests into notifications
                const receivedNotifs = (receivedData.requests || [])
                    .filter(req => req.status === 'pending') // Only show pending requests
                    .map(req => ({
                        id: req.id,
                        type: 'friend_request',
                        from: req.sender?.first_name && req.sender?.last_name 
                            ? `${req.sender.first_name} ${req.sender.last_name}` 
                            : req.sender?.username || 'Someone',
                        senderId: req.sender_id,
                        avatar: req.sender?.avatar_url,
                        time: getTimeAgo(req.created_at),
                        read: false,
                        status: req.status
                    }));
                allNotifs = [...allNotifs, ...receivedNotifs];
            }
            
            if (sentResponse.ok) {
                // Transform accepted sent requests into notifications (someone accepted your request!)
                const acceptedNotifs = (sentData.requests || [])
                    .filter(req => req.status === 'accepted')
                    .map(req => ({
                        id: `accepted-${req.id}`,
                        type: 'friend_accepted',
                        from: req.receiver?.first_name && req.receiver?.last_name 
                            ? `${req.receiver.first_name} ${req.receiver.last_name}` 
                            : req.receiver?.username || 'Someone',
                        receiverId: req.receiver_id,
                        avatar: req.receiver?.avatar_url,
                        time: getTimeAgo(req.created_at),
                        read: localStorage.getItem(`notif_read_accepted-${req.id}`) === 'true',
                        status: req.status
                    }));
                allNotifs = [...allNotifs, ...acceptedNotifs];
            }
            
            setNotifications(allNotifs);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoadingNotifications(false);
        }
    }, [user]);

    // Fetch notifications on mount and when user changes
    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll for new notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user, fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle accept friend request
    const handleAcceptRequest = async (notification) => {
        if (!user) return;
        
        setProcessingRequest(notification.id);
        try {
            const response = await fetch('/api/friend-requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: notification.id,
                    action: 'accept',
                    userId: user.id
                })
            });
            
            if (response.ok) {
                showSuccess(`🎉 You are now friends with ${notification.from}!`);
                // Update local state
                setNotifications(prev => prev.map(n => 
                    n.id === notification.id ? { ...n, read: true, status: 'accepted', type: 'friend_accepted' } : n
                ));
                // Emit custom event so other components (like community page) can refresh their data
                window.dispatchEvent(new CustomEvent('friendRequestAccepted', { 
                    detail: { friendId: notification.senderId, friendName: notification.from } 
                }));
            } else {
                const data = await response.json();
                showError(data.error || 'Failed to accept request');
            }
        } catch (error) {
            console.error('Error accepting request:', error);
            showError('Failed to accept request');
        } finally {
            setProcessingRequest(null);
        }
    };

    // Handle decline friend request
    const handleDeclineRequest = async (notification) => {
        if (!user) return;
        
        setProcessingRequest(notification.id);
        try {
            const response = await fetch('/api/friend-requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: notification.id,
                    action: 'reject',
                    userId: user.id
                })
            });
            
            if (response.ok) {
                showSuccess(`Declined friend request from ${notification.from}`);
                // Remove from notifications
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            } else {
                const data = await response.json();
                showError(data.error || 'Failed to decline request');
            }
        } catch (error) {
            console.error('Error declining request:', error);
            showError('Failed to decline request');
        } finally {
            setProcessingRequest(null);
        }
    };

    const clearNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <header className="py-4 m-4 mx-0 mb-0 rounded-xl text-center flex justify-between items-center">
            <Link href="/">
                <Image
                    src="/images/logo.png"
                    alt="Filmy Diary Logo"
                    width={100}
                    height={100}
                    priority
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                />
            </Link>
            
            {/* Search Component - Desktop Only */}
            {showSearch && (
                <div className="hidden md:block flex-1 max-w-md mx-8">
                    <SearchInput {...searchProps} />
                </div>
            )}
            
            <div className="flex items-center">
                {user ? (
                    // Authenticated user header
                    <>
                        {/* Navigation Icons */}
                        <div className="flex items-center sm:gap-1">
                            <button 
                                onClick={() => router.push('/explore')}
                                className="p-1 text-blue-600 hover:opacity-80 transition-opacity"
                                title="Explore Movies"
                            >
                                <IoCompass className="w-[22px] h-[22px]" />
                            </button>
                            <button 
                                onClick={() => router.push('/watchlist')}
                                className="p-1 text-purple-600 hover:opacity-80 transition-opacity"
                                title="Watchlist"
                            >
                                <IoBookmark className="w-[22px] h-[22px]" />
                            </button>
                            <button 
                                onClick={() => router.push('/watching')}
                                className="p-1 text-red-600 hover:opacity-80 transition-opacity"
                                title="Currently Watching"
                            >
                                <IoPlayCircle className="w-[22px] h-[22px]" />
                            </button>
                            <button 
                                onClick={() => router.push('/watched')}
                                className="p-1 text-green-600 hover:opacity-80 transition-opacity"
                                title="Watched Movies"
                            >
                                <IoCheckmarkCircle className="w-[22px] h-[22px]" />
                            </button>
                            <button 
                                onClick={() => router.push('/community')}
                                className="p-1 text-[#414141] hover:opacity-80 transition-opacity"
                                title="Community"
                            >
                                <IoPeople className="w-[22px] h-[22px]" />
                            </button>

                            {/* Friends Activity */}
                            <button 
                                onClick={() => router.push('/friends-log')}
                                className="p-1 text-orange-500 hover:opacity-80 transition-opacity"
                                title="Friends Activity"
                            >
                                <IoTime className="w-[22px] h-[22px]" />
                            </button>
                            
                            {/* Notification Bell */}
                            <div className="relative" ref={notificationRef}>
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-1 text-gray-600 hover:text-gray-800 transition-colors relative"
                                    title="Notifications"
                                >
                                    <IoNotifications className="w-[22px] h-[22px]" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                
                                {/* Notifications Dropdown - Compact */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="text-xs text-[#414141] font-medium">{unreadCount} new</span>
                                            )}
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            {loadingNotifications ? (
                                                <div className="p-4 space-y-3">
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse"></div>
                                                            <div className="flex-1 space-y-1">
                                                                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                                                <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : notifications.length > 0 ? (
                                                notifications.map((notification) => (
                                                    <div 
                                                        key={notification.id}
                                                        className={`px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            {notification.avatar ? (
                                                                <Image
                                                                    src={notification.avatar}
                                                                    alt={notification.from}
                                                                    width={28}
                                                                    height={28}
                                                                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                                                                    {notification.from?.[0] || '?'}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <p className="text-xs text-gray-800 text-left">
                                                                    <span className="font-medium">{notification.from}</span>
                                                                    {notification.type === 'friend_request' && ' sent a request'}
                                                                    {notification.type === 'friend_accepted' && ' accepted your request 🎉'}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 text-left">{notification.time}</p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Mark as read if it's an accepted notification
                                                                    if (notification.type === 'friend_accepted') {
                                                                        localStorage.setItem(`notif_read_${notification.id}`, 'true');
                                                                    }
                                                                    clearNotification(notification.id);
                                                                }}
                                                                className="p-0.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 flex-shrink-0"
                                                            >
                                                                <IoClose className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        {notification.type === 'friend_request' && (
                                                            <div className="flex gap-2 mt-1.5 ml-9">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAcceptRequest(notification);
                                                                    }}
                                                                    disabled={processingRequest === notification.id}
                                                                    className="px-2.5 py-0.5 bg-[#52a9ff] hover:bg-[#3d9aef] text-white text-[10px] rounded-full font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    {processingRequest === notification.id ? '...' : 'Accept'}
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeclineRequest(notification);
                                                                    }}
                                                                    disabled={processingRequest === notification.id}
                                                                    className="px-2.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] rounded-full font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center">
                                                    <IoNotifications className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-xs text-gray-500">No notifications yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Dropdown */}
                        <UserDropdown 
                            user={user}
                            isSigningOut={isSigningOut}
                            onSignOut={async () => {
                                try {
                                    await signOut();
                                } catch (error) {
                                    console.error('Sign out error:', error);
                                    window.location.reload();
                                }
                            }}
                        />
                    </>
                ) : (
                    // Non-authenticated user header - Google Login button
                    <GoogleLoginButton />
                )}
            </div>
        </header>
    );
};

export default Header;
