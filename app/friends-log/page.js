'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Image from 'next/image';
import Link from 'next/link';
import { IoTime, IoPerson, IoPersonAdd, IoPersonRemove, IoCheckmark, IoClose, IoPeople, IoArrowForward, IoArrowBack, IoFilm, IoEye, IoBookmark, IoCheckmarkCircle } from 'react-icons/io5';

export default function FriendsLogPage() {
    const { user, loading: authLoading } = useAuth();
    const { showError } = useToast();
    const router = useRouter();
    
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Fetch logs data
    const fetchLogs = useCallback(async (pageNum = 1, append = false) => {
        if (!user) return;

        try {
            if (!append) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await fetch(`/api/friends-log?userId=${user.id}&page=${pageNum}&limit=20`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch logs');
            }

            if (append) {
                setLogs(prev => [...prev, ...result.data]);
            } else {
                setLogs(result.data);
            }

            setHasMore(result.pagination.hasMore);
            setPage(pageNum);

        } catch (error) {
            console.error('Error fetching logs:', error);
            showError(error.message || 'Failed to load friend logs');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user, showError]);

    // Initial load
    useEffect(() => {
        if (user && !authLoading) {
            fetchLogs(1, false);
        }
    }, [user, authLoading, fetchLogs]);

    // Load more function for infinite scroll
    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchLogs(page + 1, true);
        }
    }, [loadingMore, hasMore, page, fetchLogs]);

    // Infinite scroll handler
    useEffect(() => {
        const handleScroll = () => {
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
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    // Get friend request status info
    const getFriendStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { icon: IoPersonAdd, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pending', border: 'border-amber-400' };
            case 'accepted':
                return { icon: IoCheckmark, color: 'text-green-600', bg: 'bg-green-100', label: 'Accepted', border: 'border-green-400' };
            case 'rejected':
                return { icon: IoClose, color: 'text-red-600', bg: 'bg-red-100', label: 'Declined', border: 'border-red-400' };
            case 'unfriended':
                return { icon: IoPersonRemove, color: 'text-red-600', bg: 'bg-red-100', label: 'Unfriended', border: 'border-red-400' };
            default:
                return { icon: IoPerson, color: 'text-gray-600', bg: 'bg-gray-100', label: status, border: 'border-gray-400' };
        }
    };

    // Get movie status info
    const getMovieStatusInfo = (status) => {
        switch (status) {
            case 'watched':
                return { icon: IoCheckmarkCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Watched', border: 'border-green-400' };
            case 'currently_watching':
                return { icon: IoEye, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Watching', border: 'border-blue-400' };
            case 'wishlist':
                return { icon: IoBookmark, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Watchlist', border: 'border-purple-400' };
            default:
                return { icon: IoFilm, color: 'text-gray-600', bg: 'bg-gray-100', label: status, border: 'border-gray-400' };
        }
    };

    // Get user display name
    const getUserName = (profile, email) => {
        if (profile?.first_name && profile?.last_name) {
            return `${profile.first_name} ${profile.last_name}`;
        }
        return email || profile?.user_email || 'Unknown';
    };

    // Get action description for friend requests
    const getFriendActionDescription = (log) => {
        const isSender = log.sender_id === user?.id;
        const senderName = getUserName(log.sender, log.sender_email);
        const receiverName = getUserName(log.receiver, log.receiver_email);

        switch (log.status) {
            case 'pending':
                return isSender 
                    ? `You sent a friend request to ${receiverName}`
                    : `${senderName} sent you a friend request`;
            case 'accepted':
                return isSender 
                    ? `${receiverName} accepted your friend request`
                    : `You accepted ${senderName}'s friend request`;
            case 'rejected':
                return isSender 
                    ? `${receiverName} declined your friend request`
                    : `You declined ${senderName}'s friend request`;
            case 'unfriended':
                return isSender 
                    ? `You removed ${receiverName} from friends`
                    : `${senderName} removed you from friends`;
            default:
                return `Friend activity with ${isSender ? receiverName : senderName}`;
        }
    };

    // Get the other user in friend request interaction
    const getOtherUser = (log) => {
        return log.sender_id === user?.id ? log.receiver : log.sender;
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
                    Loading friend activities...
                    <svg className="animate-spin h-4 w-4 inline-block text-gray-600 ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/30">
            <div className="container mx-auto px-4">
                <Header />
            </div>
            
            <div className="container mx-auto px-4 py-6">
                {/* Page Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <IoPeople className="w-7 h-7 text-[#414141]" />
                        <h1 className="text-2xl font-bold text-gray-900">Friends Activity</h1>
                    </div>
                    <p className="text-gray-500 text-sm">See what your friends are watching and your connection history</p>
                </div>

                {/* Logs List */}
                <div className="space-y-3">
                    {logs.map((log, index) => {
                        // Friend Movie Log
                        if (log.log_type === 'friend_movie') {
                            const statusInfo = getMovieStatusInfo(log.status);
                            const StatusIcon = statusInfo.icon;
                            const friendProfile = log.profiles;
                            const movie = log.movies;

                            return (
                                <div 
                                    key={`movie-${log.id}-${index}`} 
                                    className={`bg-white rounded-md shadow-sm p-4 hover:shadow-md transition-shadow border-l-4 ${statusInfo.border}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Movie Poster */}
                                        <div className="flex-shrink-0">
                                            {movie?.poster ? (
                                                <img
                                                    src={movie.poster}
                                                    alt={movie.title}
                                                    className="w-12 h-18 object-cover rounded-lg shadow-sm"
                                                    style={{ minHeight: '72px' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-12 h-18 bg-gray-200 rounded-lg flex items-center justify-center" style={{ minHeight: '72px' }}>
                                                    <IoFilm className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Friend info */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <Link href={`/friend/${friendProfile?.id}`} className="flex items-center gap-2">
                                                    {friendProfile?.avatar_url ? (
                                                        <Image
                                                            src={friendProfile.avatar_url}
                                                            alt={getUserName(friendProfile, null)}
                                                            width={20}
                                                            height={20}
                                                            className="w-5 h-5 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-5 h-5 bg-[#414141] rounded-full flex items-center justify-center">
                                                            <span className="text-white text-xs font-medium">
                                                                {(friendProfile?.first_name?.[0] || '?').toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-900 hover:text-[#414141]">
                                                        {getUserName(friendProfile, null)}
                                                    </span>
                                                </Link>
                                                {/* Time - only show on desktop */}
                                                <span className="hidden sm:inline text-gray-400 text-sm">•</span>
                                                <span className="hidden sm:inline text-xs text-gray-500">{formatDate(log.updated_at)}</span>
                                            </div>

                                            {/* Movie title and action */}
                                            <p className="text-gray-700 text-sm mb-1">
                                                {log.status === 'watched' && 'Watched '}
                                                {log.status === 'currently_watching' && 'Started watching '}
                                                {log.status === 'wishlist' && 'Added to watchlist: '}
                                                <span className="font-semibold text-gray-900">{movie?.title || 'Unknown Movie'}</span>
                                                {movie?.year && <span className="text-gray-500"> ({movie.year})</span>}
                                            </p>

                                            {/* Movie type */}
                                            <span className="text-xs text-gray-400">
                                                {movie?.type === 'series' ? 'TV Series' : 'Movie'}
                                            </span>
                                        </div>

                                        {/* Status Badge - Desktop */}
                                        <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full ${statusInfo.bg} flex-shrink-0`}>
                                            <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                                            <span className={`text-xs font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        
                                        {/* Status Badge - Mobile (with time below) */}
                                        <div className="sm:hidden flex flex-col items-center gap-0.5 flex-shrink-0">
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bg}`}>
                                                <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                                                <span className={`text-[10px] font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-500">{formatDate(log.updated_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Friend Request Log
                        if (log.log_type === 'friend_request') {
                            const statusInfo = getFriendStatusInfo(log.status);
                            const StatusIcon = statusInfo.icon;
                            const otherUser = getOtherUser(log);
                            const isSender = log.sender_id === user?.id;
                            
                            return (
                                <div 
                                    key={`request-${log.id}-${index}`} 
                                    className={`bg-white rounded-md shadow-sm p-4 hover:shadow-md transition-shadow border-l-4 ${statusInfo.border}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* User Avatar */}
                                        <Link href={`/friend/${otherUser?.id}`} className="flex-shrink-0">
                                            {otherUser?.avatar_url ? (
                                                <Image
                                                    src={otherUser.avatar_url}
                                                    alt={getUserName(otherUser, null)}
                                                    width={44}
                                                    height={44}
                                                    className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 bg-[#414141] rounded-full flex items-center justify-center ring-2 ring-gray-100">
                                                    <span className="text-white font-semibold text-base">
                                                        {(otherUser?.first_name?.[0] || otherUser?.user_email?.[0] || '?').toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </Link>

                                        {/* Activity Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {isSender ? (
                                                    <IoArrowForward className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                ) : (
                                                    <IoArrowBack className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                )}
                                                <p className="text-gray-700 text-sm truncate">
                                                    {getFriendActionDescription(log)}
                                                </p>
                                            </div>
                                            
                                            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                                                <span className="truncate">
                                                    @{otherUser?.username || otherUser?.user_email?.split('@')[0] || 'user'}
                                                </span>
                                                <span>•</span>
                                                <span>{formatDate(log.created_at)}</span>
                                            </div>
                                            
                                            {/* Mobile: Just show username */}
                                            <div className="sm:hidden text-xs text-gray-500 truncate">
                                                @{otherUser?.username || otherUser?.user_email?.split('@')[0] || 'user'}
                                            </div>
                                        </div>

                                        {/* Status Badge - Desktop */}
                                        <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full ${statusInfo.bg} flex-shrink-0`}>
                                            <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                                            <span className={`text-xs font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        
                                        {/* Status Badge - Mobile (with time below) */}
                                        <div className="sm:hidden flex flex-col items-center gap-0.5 flex-shrink-0">
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bg}`}>
                                                <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                                                <span className={`text-[10px] font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-500">{formatDate(log.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })}
                </div>

                {/* Loading More Indicator */}
                {loadingMore && (
                    <div className="flex justify-center py-6">
                        <svg className="animate-spin h-6 w-6 text-[#414141]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}

                {/* No More Data */}
                {!hasMore && logs.length > 0 && (
                    <div className="text-center py-6">
                        <p className="text-gray-400 text-sm">No more activity to load</p>
                    </div>
                )}

                {/* Empty State */}
                {logs.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <IoPeople className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No friend activity yet</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start connecting with other movie lovers to see what they&apos;re watching!</p>
                        <Link 
                            href="/community"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#414141] text-white rounded-full hover:bg-[#333333] transition-colors font-medium"
                        >
                            <IoPeople className="w-4 h-4" />
                            <span>Find Friends</span>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
