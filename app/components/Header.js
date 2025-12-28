'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { IoBookmark, IoPlayCircle, IoCheckmarkCircle, IoCompass, IoPeople, IoNotifications, IoPersonAdd, IoClose } from 'react-icons/io5';
import UserDropdown from './UserDropdown';
import GoogleLoginButton from './GoogleLoginButton';
import SearchInput from './SearchInput';
import { useAuth } from '../context/AuthContext';

// Dummy notifications data (to be replaced with real data later)
const DUMMY_NOTIFICATIONS = [
    { id: '1', type: 'friend_request', from: 'Rahul Sharma', avatar: null, time: '2 hours ago', read: false },
    { id: '2', type: 'friend_request', from: 'Priya Patel', avatar: null, time: '5 hours ago', read: false },
    { id: '3', type: 'friend_accepted', from: 'Amit Kumar', avatar: null, time: '1 day ago', read: true },
];

const Header = ({ currentPage = 'home', showSearch = false, searchProps = {} }) => {
    const { user, signOut, isSigningOut } = useAuth();
    const router = useRouter();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
    const notificationRef = useRef(null);

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

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
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
                        <div className="flex items-center">
                            <button 
                                onClick={() => router.push('/explore')}
                                className="p-1.5 text-blue-600"
                                title="Explore Movies"
                            >
                                <IoCompass className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => router.push('/watchlist')}
                                className="p-1.5 text-purple-600"
                                title="Watchlist"
                            >
                                <IoBookmark className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => router.push('/watching')}
                                className="p-1.5 text-red-600"
                                title="Currently Watching"
                            >
                                <IoPlayCircle className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => router.push('/watched')}
                                className="p-1.5 text-green-600"
                                title="Watched Movies"
                            >
                                <IoCheckmarkCircle className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => router.push('/community')}
                                className="p-1.5 text-[#414141]"
                                title="Community"
                            >
                                <IoPeople className="w-5 h-5" />
                            </button>
                            
                            {/* Notification Bell */}
                            <div className="relative" ref={notificationRef}>
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-1.5 text-gray-600 hover:text-gray-800 relative"
                                    title="Notifications"
                                >
                                    <IoNotifications className="w-5 h-5" />
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
                                            {notifications.length > 0 ? (
                                                notifications.map((notification) => (
                                                    <div 
                                                        key={notification.id}
                                                        className={`px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-gray-100/50' : ''}`}
                                                        onClick={() => markAsRead(notification.id)}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                                                                {notification.from?.[0] || '?'}
                                                            </div>
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <p className="text-xs text-gray-800 text-left">
                                                                    <span className="font-medium">{notification.from}</span>
                                                                    {notification.type === 'friend_request' && ' sent a request'}
                                                                    {notification.type === 'friend_accepted' && ' accepted request'}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 text-left">{notification.time}</p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    clearNotification(notification.id);
                                                                }}
                                                                className="p-0.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 flex-shrink-0"
                                                            >
                                                                <IoClose className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        {notification.type === 'friend_request' && !notification.read && (
                                                            <div className="flex gap-2 mt-1.5 ml-9">
                                                                <button className="px-2.5 py-0.5 bg-[#52a9ff] hover:bg-[#3d9aef] text-white text-[10px] rounded-full font-medium transition-colors">
                                                                    Accept
                                                                </button>
                                                                <button className="px-2.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] rounded-full font-medium transition-colors">
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
