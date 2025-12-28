'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import { IoTime, IoPerson, IoFilm, IoEye, IoBookmark, IoCheckmarkCircle, IoPersonAdd, IoPersonRemove, IoCheckmark, IoClose } from 'react-icons/io5';
import Image from 'next/image';

export default function UserLogsPage() {
    const { user, loading: authLoading } = useAuth();
    const { showError, showSuccess } = useToast();
    const router = useRouter();
    
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [userRole, setUserRole] = useState(null);

    // Check user role and redirect if not superadmin
    useEffect(() => {
        const checkUserRole = async () => {
            if (!user) return;
            
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user role:', error);
                    showError('Failed to verify permissions');
                    router.push('/');
                    return;
                }

                if (profile.role !== 'superadmin') {
                    showError('Access denied. Superadmin role required.');
                    router.push('/');
                    return;
                }

                setUserRole(profile.role);
            } catch (error) {
                console.error('Error checking user role:', error);
                showError('Failed to verify permissions');
                router.push('/');
            }
        };

        if (user && !authLoading) {
            checkUserRole();
        }
    }, [user, authLoading, router, showError]);

    // Fetch logs data
    const fetchLogs = useCallback(async (pageNum = 1, append = false) => {
        if (!user) return;
        
        // Only fetch if user is superadmin
        if (userRole !== 'superadmin') {
            console.log('User is not superadmin, skipping fetch');
            return;
        }

        try {
            if (!append) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await fetch(`/api/user-logs?userId=${user.id}&page=${pageNum}&limit=20`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch logs');
            }

            if (append) {
                setLogs(prev => [...prev, ...result.data]);
            } else {
                setLogs(result.data);
                // Debug: Log the first item to see user data
                if (result.data.length > 0) {
                    console.log('Frontend received log entry:', result.data[0]);
                }
            }

            setHasMore(result.pagination.hasMore);
            setPage(pageNum);

        } catch (error) {
            console.error('Error fetching logs:', error);
            showError(error.message || 'Failed to load user logs');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user, userRole, showError]);

    // Initial load
    useEffect(() => {
        if (userRole === 'superadmin') {
            fetchLogs(1, false);
        }
    }, [userRole, fetchLogs]);

    // Load more function for infinite scroll
    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchLogs(page + 1, true);
        }
    };

    // Infinite scroll handler
    useEffect(() => {
        const handleScroll = () => {
            // Check if we're near the bottom of the page
            const scrollTop = document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            
            if (scrollTop + clientHeight >= scrollHeight - 5 && !loadingMore && hasMore) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadingMore, hasMore, loadMore]);

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status icon and color for movie logs
    const getMovieStatusInfo = (status) => {
        switch (status) {
            case 'watched':
                return { icon: IoCheckmarkCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Watched' };
            case 'currently_watching':
                return { icon: IoEye, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Watching' };
            case 'wishlist':
                return { icon: IoBookmark, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Wishlist' };
            default:
                return { icon: IoFilm, color: 'text-gray-600', bg: 'bg-gray-100', label: status };
        }
    };

    // Get status icon and color for friend request logs
    const getFriendStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { icon: IoPersonAdd, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Request Sent' };
            case 'accepted':
                return { icon: IoCheckmark, color: 'text-green-600', bg: 'bg-green-100', label: 'Accepted' };
            case 'rejected':
                return { icon: IoClose, color: 'text-red-600', bg: 'bg-red-100', label: 'Declined' };
            case 'unfriended':
                return { icon: IoPersonRemove, color: 'text-red-600', bg: 'bg-red-100', label: 'Unfriended' };
            default:
                return { icon: IoPerson, color: 'text-gray-600', bg: 'bg-gray-100', label: status };
        }
    };

    // Loading state - match community page style
    if (authLoading || (loading && logs.length === 0)) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <Image 
                    src="/images/babu-rao-stickers.png" 
                    alt="Loading" 
                    width={240} 
                    height={250} 
                    className='mb-2'
                    priority
                />
                <p className='text-center text-md px-4 text-gray-800'>
                    Loading user activity logs...
                    <svg className="animate-spin h-4 w-4 inline-block text-gray-600 ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
            </div>
        );
    }

    // Access denied or not superadmin
    if (!user || userRole !== 'superadmin') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 pt-4">
                    <Header />
                </div>
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                        <p className="text-gray-600">You don't have permission to view this page.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/30">
            <div className="container mx-auto px-4 pt-4">
                <Header />
            </div>
            
            <div className="container mx-auto px-4 py-6">
                {/* Page Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <IoFilm className="w-7 h-7 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900">User Activity Logs</h1>
                    </div>
                    <p className="text-gray-500 text-sm">Recent movie and friend activities from all users</p>
                </div>

                {/* Stats */}
                {/* <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-2">
                                <IoFilm className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                <span className="text-sm text-gray-600">Showing:</span>
                                <span className="font-semibold text-gray-900">{logs.length} entries</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <IoTime className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                                <span className="text-sm text-gray-600">Page:</span>
                                <span className="font-semibold text-gray-900">{page}</span>
                            </div>
                        </div>
                        {hasMore && (
                            <div className="text-sm text-green-600 text-center sm:text-right">
                                Scroll for more
                            </div>
                        )}
                    </div>
                </div> */}

                {/* Logs List */}
                <div className="space-y-2">
                    {logs.map((log, index) => {
                        // Determine if this is a movie log or friend request log
                        const isFriendLog = log.log_type === 'friend_request';
                        const statusInfo = isFriendLog 
                            ? getFriendStatusInfo(log.status) 
                            : getMovieStatusInfo(log.status);
                        const StatusIcon = statusInfo.icon;
                        
                        // For friend request logs, render different UI
                        if (isFriendLog) {
                            const senderName = log.sender?.first_name && log.sender?.last_name 
                                ? `${log.sender.first_name} ${log.sender.last_name}`
                                : log.sender_email || 'Unknown';
                            const receiverName = log.receiver?.first_name && log.receiver?.last_name 
                                ? `${log.receiver.first_name} ${log.receiver.last_name}`
                                : log.receiver_email || 'Unknown';

                            return (
                                <div key={`friend-${log.id}-${index}`} className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow border-l-4 border-amber-400">
                                    <div className="flex items-center gap-3">
                                        {/* Friend Icon */}
                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                                        </div>

                                        {/* Friend Request Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-900">{senderName}</span>
                                                <span className="text-gray-500">→</span>
                                                <span className="font-medium text-gray-900">{receiverName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <span>{log.sender_email || log.sender?.user_email}</span>
                                                <span>→</span>
                                                <span>{log.receiver_email || log.receiver?.user_email}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                <IoTime className="w-3 h-3" />
                                                <span>{formatDate(log.created_at)}</span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${statusInfo.bg} flex-shrink-0`}>
                                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                                            <span className={`text-sm font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        // Movie log rendering (original code)
                        return (
                            <div key={`${log.id}-${index}`} className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow">
                                {/* Mobile Layout */}
                                <div className="block sm:hidden">
                                    {/* Top Row: Image + Info + Badge */}
                                    <div className="flex items-start gap-3 mb-3">
                                        {/* Movie Poster */}
                                        <div className="flex-shrink-0">
                                            {log.movies?.poster ? (
                                                <img
                                                    src={log.movies.poster}
                                                    alt={log.movies.title}
                                                    className="w-12 h-18 object-cover rounded-md"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-12 h-18 bg-gray-200 rounded-md flex items-center justify-center">
                                                    <IoFilm className="w-4 h-4 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Movie Info + User Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900 break-words mb-1">
                                                {log.movies?.title || 'Unknown Movie'}
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-2">
                                                {log.movies?.year && `${log.movies.year} • `}
                                                {log.movies?.type || 'Movie'}
                                            </p>
                                            
                                            {/* User Info */}
                                            <div className="flex items-center gap-2">
                                                <IoPerson className="w-3 h-3 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {log.profiles?.first_name && log.profiles?.last_name 
                                                        ? `${log.profiles.first_name} ${log.profiles.last_name}`
                                                        : log.profiles?.user_email || `User ID: ${log.user_id?.slice(0, 8)}...`
                                                    }
                                                </span>
                                            </div>
                                            {log.profiles?.user_email && (log.profiles?.first_name || log.profiles?.last_name) && (
                                                <div className="text-xs text-gray-500 ml-5 mt-1">
                                                    {log.profiles.user_email}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.bg} self-start`}>
                                            <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                                            <span className={`text-xs font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Timestamps */}
                                    <div className="flex flex-col gap-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
                                        <div className="flex items-center gap-1">
                                            <IoTime className="w-3 h-3" />
                                            <span>Updated: {formatDate(log.updated_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden sm:flex items-start gap-4">
                                    {/* Movie Poster */}
                                    <div className="flex-shrink-0">
                                        {log.movies?.poster ? (
                                            <img
                                                src={log.movies.poster}
                                                alt={log.movies.title}
                                                className="w-16 h-24 object-cover rounded-md"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-16 h-24 bg-gray-200 rounded-md flex items-center justify-center">
                                                <IoFilm className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Log Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 break-words">
                                                    {log.movies?.title || 'Unknown Movie'}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {log.movies?.year && `${log.movies.year} • `}
                                                    {log.movies?.type || 'Movie'}
                                                </p>
                                            </div>
                                            
                                            {/* Status Badge */}
                                            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${statusInfo.bg}`}>
                                                <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                                                <span className={`text-sm font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* User Info */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <IoPerson className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {log.profiles?.first_name && log.profiles?.last_name 
                                                    ? `${log.profiles.first_name} ${log.profiles.last_name}`
                                                    : log.profiles?.user_email || `User ID: ${log.user_id?.slice(0, 8)}...`
                                                }
                                            </span>
                                            {log.profiles?.user_email && (log.profiles?.first_name || log.profiles?.last_name) && (
                                                <>
                                                    <span className="text-sm text-gray-400">•</span>
                                                    <span className="text-sm text-gray-500">
                                                        {log.profiles.user_email}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Timestamps */}
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <IoTime className="w-4 h-4" />
                                                <span>Updated: {formatDate(log.updated_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Loading More Indicator */}
                {loadingMore && (
                    <div className="flex justify-center py-6">
                        <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}

                {/* No More Data */}
                {!hasMore && logs.length > 0 && (
                    <div className="text-center py-6">
                        <p className="text-gray-400 text-sm">No more logs to load</p>
                    </div>
                )}

                {/* Empty State */}
                {logs.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <IoFilm className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                        <p className="text-gray-500">No user movie activities to display yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
