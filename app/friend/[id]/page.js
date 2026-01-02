'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/Header';
import MovieCard from '../../components/MovieCard';
import MovieInfoSlider from '../../components/MovieInfoSlider';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import { 
    IoArrowBack, 
    IoCheckmarkCircle,
    IoPlayCircle, 
    IoBookmark, 
    IoFilm,
    IoCalendar,
    IoPersonAdd,
    IoChevronDown,
    IoChevronUp,
    IoTime,
    IoHourglass,
    IoPersonRemove
} from 'react-icons/io5';

export default function FriendProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();
    const params = useParams();
    const friendId = params.id;

    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ watched: 0, watching: 0, wishlist: 0, total: 0 });
    const [movies, setMovies] = useState({ watched: [], watching: [], wishlist: [] });
    const [loading, setLoading] = useState(true);
    const [loadingMovies, setLoadingMovies] = useState(true);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        watched: true,
        watching: true,
        wishlist: true
    });
    const [canViewMovies, setCanViewMovies] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [checkingAccess, setCheckingAccess] = useState(true);

    // Transform saved movie data to match MovieCard expected format
    const transformMovieToCardFormat = (savedMovie) => {
        const movieId = savedMovie.movies.movie_id;
        
        return {
            imdbID: movieId && movieId.startsWith('tt') ? movieId : "N/A",
            tmdbID: movieId && !movieId.startsWith('tt') ? movieId : "N/A",
            Title: savedMovie.movies.title,
            Poster: savedMovie.movies.poster,
            Year: savedMovie.movies.year,
            Type: savedMovie.movies.type || "movie",
            imdbRating: savedMovie.movies.rating || "N/A",
            ratingSource: savedMovie.movies.rating_source || "N/A",
            Plot: savedMovie.movies.description || "N/A",
            watchedDate: savedMovie.watched_date || null
        };
    };

    // Fetch friend's profile
    const fetchProfile = useCallback(async () => {
        try {
            const response = await fetch(`/api/users?type=profile&profileId=${friendId}`);
            const data = await response.json();

            if (response.ok) {
                setProfile(data.profile);
                setStats(data.stats);
            } else {
                showError('Failed to load profile');
                router.push('/community');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            showError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, [friendId, router, showError]);

    // Fetch friend's movies
    const fetchMovies = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoadingMovies(true);
            // Pass requesterId for server-side access control
            const response = await fetch(`/api/users/movies?userId=${friendId}&requesterId=${user.id}&status=all`);
            const data = await response.json();

            if (response.ok) {
                setMovies(data.movies || { watched: [], watching: [], wishlist: [] });
            } else if (data.accessDenied) {
                // Access denied by server - user is not friends/superadmin
                setCanViewMovies(false);
            }
        } catch (error) {
            console.error('Error fetching movies:', error);
        } finally {
            setLoadingMovies(false);
        }
    }, [friendId, user]);

    // Handle movie click
    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
        setIsSliderOpen(true);
    };

    // Toggle section expansion
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const [friendshipStatus, setFriendshipStatus] = useState('none'); // 'none', 'friends', 'request_sent', 'request_received'
    const [sendingRequest, setSendingRequest] = useState(false);

    // Check user role (superadmin check)
    const checkUserRole = useCallback(async () => {
        if (!user) return null;
        
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
            if (!error && profile) {
                setUserRole(profile.role);
                return profile.role;
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
        return null;
    }, [user]);

    // Check friendship status and determine if user can view movies
    const checkFriendshipStatus = useCallback(async () => {
        if (!user || !friendId) {
            setCheckingAccess(false);
            return;
        }
        
        // If viewing own profile, always allow
        if (user.id === friendId) {
            setCanViewMovies(true);
            setFriendshipStatus('self');
            setCheckingAccess(false);
            return;
        }
        
        try {
            // Check user role first
            const role = await checkUserRole();
            
            // Superadmin can view all profiles
            if (role === 'superadmin') {
                setCanViewMovies(true);
                setCheckingAccess(false);
            }
            
            // Check friendship status
            const response = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    targetUserId: friendId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                setFriendshipStatus(data.status);
                
                // Can view if friends or superadmin
                if (data.status === 'friends' || role === 'superadmin') {
                    setCanViewMovies(true);
                } else {
                    setCanViewMovies(false);
                }
            }
        } catch (error) {
            console.error('Error checking friendship status:', error);
            setCanViewMovies(false);
        } finally {
            setCheckingAccess(false);
        }
    }, [user, friendId, checkUserRole]);

    // Handle add friend
    const handleAddFriend = async () => {
        if (!user) return;
        
        setSendingRequest(true);
        try {
            const response = await fetch('/api/friend-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: user.id,
                    receiverId: friendId
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess(`Friend request sent to ${profile?.first_name || profile?.username || 'user'}!`);
                setFriendshipStatus('request_sent');
            } else {
                showError(data.error || 'Failed to send friend request');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            showError('Failed to send friend request');
        } finally {
            setSendingRequest(false);
        }
    };

    // Handle remove friend
    const [removingFriend, setRemovingFriend] = useState(false);
    
    const handleRemoveFriend = async () => {
        if (!user) return;
        
        // Confirm before removing
        if (!window.confirm(`Are you sure you want to remove ${profile?.first_name || 'this user'} from your friends?`)) {
            return;
        }
        
        setRemovingFriend(true);
        try {
            const response = await fetch(`/api/friends?userId=${user.id}&friendId=${friendId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showSuccess(`${profile?.first_name || 'User'} has been removed from your friends`);
                setFriendshipStatus('none');
                setCanViewMovies(false);
                // Emit event to refresh friends list on community page
                window.dispatchEvent(new CustomEvent('friendRemoved', { 
                    detail: { friendId } 
                }));
            } else {
                const data = await response.json();
                showError(data.error || 'Failed to remove friend');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            showError('Failed to remove friend');
        } finally {
            setRemovingFriend(false);
        }
    };

    // Add movie to watched list
    const addToWatched = async (movieData, watchedDate = null) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                showError('You need to be logged in to add movies');
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: sessionData.session.user.id,
                    userEmail: sessionData.session.user.email,
                    movieData,
                    status: 'watched',
                    watchedDate
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to add movie');
            }

            showSuccess(`"${movieData.Title}" added to your watched movies`);
            setIsSliderOpen(false);
        } catch (error) {
            console.error('Error adding to watched:', error);
            showError('Failed to add movie to watched list');
        }
    };

    // Add movie to watching list
    const addToWatching = async (movieData) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                showError('You need to be logged in to add movies');
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: sessionData.session.user.id,
                    userEmail: sessionData.session.user.email,
                    movieData,
                    status: 'currently_watching'
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to add movie');
            }

            showSuccess(`"${movieData.Title}" added to your currently watching`);
            setIsSliderOpen(false);
        } catch (error) {
            console.error('Error adding to watching:', error);
            showError('Failed to add movie to watching list');
        }
    };

    // Add movie to watchlist
    const addToWatchlist = async (movieData) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                showError('You need to be logged in to add movies');
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: sessionData.session.user.id,
                    userEmail: sessionData.session.user.email,
                    movieData,
                    status: 'wishlist'
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to add movie');
            }

            showSuccess(`"${movieData.Title}" added to your watchlist`);
            setIsSliderOpen(false);
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            showError('Failed to add movie to watchlist');
        }
    };

    // Format last active time
    const formatLastActive = (lastLogin) => {
        if (!lastLogin) return null;
        const now = new Date();
        const lastActive = new Date(lastLogin);
        const diffMs = now - lastActive;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 5) return 'Active now';
        if (diffMins < 60) return `Active ${diffMins} mins ago`;
        if (diffHours < 24) return `Active ${diffHours} hours ago`;
        if (diffDays < 7) return `Active ${diffDays} days ago`;
        return lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    useEffect(() => {
        if (friendId && !authLoading) {
            fetchProfile();
            checkFriendshipStatus();
        }
    }, [friendId, authLoading, fetchProfile, checkFriendshipStatus]);

    // Fetch movies only when user can view them
    useEffect(() => {
        if (canViewMovies && friendId) {
            fetchMovies();
        } else if (!checkingAccess && !canViewMovies) {
            setLoadingMovies(false);
        }
    }, [canViewMovies, friendId, fetchMovies, checkingAccess]);

    if (authLoading || loading) {
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
                    Loading profile...
                    <svg className="animate-spin h-4 w-4 inline-block text-gray-600 ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
            </div>
        );
    }

    if (!user) {
        router.push('/');
        return null;
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Profile not found</p>
                    <Link href="/community" className="text-[#414141] hover:underline">
                        Back to Community
                    </Link>
                </div>
            </div>
        );
    }

    const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || profile.user_email?.[0]?.toUpperCase() || '?';
    const displayName = profile.first_name || profile.last_name 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : 'Filmy User';
    const joinDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
    const lastActive = formatLastActive(profile.last_login);

    // Movie Section Component
    const MovieSection = ({ title, icon: Icon, iconColor, movies: sectionMovies, sectionKey }) => {
        const isExpanded = expandedSections[sectionKey];
        
        return (
            <section className="mb-8">
                <button 
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between mb-4 group"
                >
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                        {title}
                        <span className="text-sm font-normal text-gray-500">({sectionMovies.length})</span>
                    </h2>
                    <div className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
                        {isExpanded ? (
                            <IoChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                            <IoChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                    </div>
                </button>
                
                {isExpanded && (
                    sectionMovies.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                            {sectionMovies.map(item => (
                                <MovieCard
                                    key={item.id}
                                    movie={transformMovieToCardFormat(item)}
                                    onHover={() => null}
                                    onLeave={() => null}
                                    watched={item.status === 'watched'}
                                    wishlist={item.status === 'wishlist'}
                                    cardType="friend_view"
                                    onClick={() => handleMovieClick(transformMovieToCardFormat(item))}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                            <Icon className={`w-12 h-12 ${iconColor} opacity-30 mx-auto mb-2`} />
                            <p className="text-gray-500 text-sm">No {title.toLowerCase()} yet</p>
                        </div>
                    )
                )}
            </section>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/30">
            <div className="container mx-auto px-4 pb-8">
                <Header currentPage="community" showSearch={false} />

                {/* Back Button */}
                <button
                    onClick={() => router.push('/community')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 mt-4 transition-colors"
                >
                    <IoArrowBack className="w-5 h-5" />
                    <span>Back to Community</span>
                </button>

                {/* Profile Header - Compact on mobile */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 mb-6 shadow-sm">
                    {/* Mobile: Horizontal layout */}
                    <div className="flex items-center gap-4 md:hidden">
                        {/* Avatar - Small on mobile */}
                        {profile.avatar_url ? (
                            <Image
                                src={profile.avatar_url}
                                alt={displayName}
                                width={72}
                                height={72}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-[#414141] flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-md flex-shrink-0">
                                {initials}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold text-gray-900 truncate">{displayName}</h1>
                            <p className="text-sm text-gray-500 truncate">@{profile.username || profile.user_email?.split('@')[0] || 'user'}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                {lastActive && (
                                    <span className={`flex items-center gap-0.5 ${lastActive === 'Active now' ? 'text-green-500' : ''}`}>
                                        <IoTime className="w-3 h-3" />
                                        {lastActive}
                                    </span>
                                )}
                            </div>
                        </div>
                        {user.id !== friendId && (
                            friendshipStatus === 'friends' ? (
                                <button
                                    onClick={handleRemoveFriend}
                                    disabled={removingFriend}
                                    className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-full flex items-center gap-1 transition-colors disabled:opacity-50"
                                    title="Remove friend"
                                >
                                    <IoPersonRemove className="w-3.5 h-3.5" />
                                    <span>{removingFriend ? 'Removing...' : 'Remove Friend'}</span>
                                </button>
                            ) : friendshipStatus === 'request_sent' ? (
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full flex items-center gap-1">
                                    <IoHourglass className="w-3.5 h-3.5" />
                                    Pending
                                </span>
                            ) : (
                                <button
                                    onClick={handleAddFriend}
                                    disabled={sendingRequest}
                                    className="px-2.5 py-1 border-2 border-[#414141] text-[#414141] hover:bg-[#414141] hover:text-white text-xs font-medium rounded-full transition-colors flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <IoPersonAdd className="w-3.5 h-3.5" />
                                    {sendingRequest ? '...' : 'Add'}
                                </button>
                            )
                        )}
                    </div>

                    {/* Mobile: Stats grid below */}
                    <div className="grid grid-cols-4 gap-2 mt-4 md:hidden">
                        <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
                            <p className="text-base font-bold text-gray-800">{canViewMovies ? stats.watched : '--'}</p>
                            <p className="text-[10px] text-gray-500">Watched</p>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg">
                            <p className="text-base font-bold text-gray-800">{canViewMovies ? stats.watching : '--'}</p>
                            <p className="text-[10px] text-gray-500">Watching</p>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-purple-50 rounded-lg">
                            <p className="text-base font-bold text-gray-800">{canViewMovies ? stats.wishlist : '--'}</p>
                            <p className="text-[10px] text-gray-500">Watchlist</p>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-gray-100 rounded-lg">
                            <p className="text-base font-bold text-gray-800">{canViewMovies ? stats.total : '--'}</p>
                            <p className="text-[10px] text-gray-500">Total</p>
                        </div>
                    </div>

                    {/* Desktop: Original layout */}
                    <div className="hidden md:flex md:flex-row items-start gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            {profile.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt={displayName}
                                    width={120}
                                    height={120}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-[#414141] flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                                    {initials}
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1">
                            {/* Name with Add Button */}
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                                {user.id !== friendId && (
                                    friendshipStatus === 'friends' ? (
                                        <button
                                            onClick={handleRemoveFriend}
                                            disabled={removingFriend}
                                            className="ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium rounded-full transition-colors disabled:opacity-50"
                                            title="Remove friend"
                                        >
                                            <IoPersonRemove className="w-4 h-4" />
                                            <span>{removingFriend ? 'Removing...' : 'Remove Friend'}</span>
                                        </button>
                                    ) : friendshipStatus === 'request_sent' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-full">
                                            <IoHourglass className="w-4 h-4" />
                                            Pending
                                        </span>
                                    ) : (
                                        <button
                                            onClick={handleAddFriend}
                                            disabled={sendingRequest}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-[#414141] text-[#414141] hover:bg-[#414141] hover:text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50"
                                        >
                                            <IoPersonAdd className="w-4 h-4" />
                                            {sendingRequest ? '...' : 'Add'}
                                        </button>
                                    )
                                )}
                            </div>
                            <p className="text-gray-500 mb-2">@{profile.username || profile.user_email?.split('@')[0] || 'user'}</p>
                            
                            {/* Last Active & Join Date */}
                            <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                                {lastActive && (
                                    <p className={`flex items-center gap-1 ${lastActive === 'Active now' ? 'text-green-500' : ''}`}>
                                        <IoTime className="w-4 h-4" />
                                        {lastActive}
                                    </p>
                                )}
                                {joinDate && (
                                    <p className="flex items-center gap-1">
                                        <IoCalendar className="w-4 h-4" />
                                        Joined {joinDate}
                                    </p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                                    <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="text-xl font-bold text-gray-800">{canViewMovies ? stats.watched : '--'}</p>
                                        <p className="text-xs text-gray-500">Watched</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl">
                                    <IoPlayCircle className="w-5 h-5 text-red-500" />
                                    <div>
                                        <p className="text-xl font-bold text-gray-800">{canViewMovies ? stats.watching : '--'}</p>
                                        <p className="text-xs text-gray-500">Watching</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl">
                                    <IoBookmark className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <p className="text-xl font-bold text-gray-800">{canViewMovies ? stats.wishlist : '--'}</p>
                                        <p className="text-xs text-gray-500">Watchlist</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
                                    <IoFilm className="w-5 h-5 text-[#414141]" />
                                    <div>
                                        <p className="text-xl font-bold text-gray-800">{canViewMovies ? stats.total : '--'}</p>
                                        <p className="text-xs text-gray-500">Total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Movies Sections */}
                {checkingAccess ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-[#414141] rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Checking access...</p>
                    </div>
                ) : !canViewMovies ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <IoFilm className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Movie Lists are Private</h3>
                        <p className="text-gray-500 mb-4">
                            You need to be friends with {profile?.first_name || 'this user'} to view their movie collections.
                        </p>
                        {friendshipStatus === 'none' && (
                            <button
                                onClick={handleAddFriend}
                                disabled={sendingRequest}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#414141] hover:bg-[#2d2d2d] text-white font-medium rounded-full transition-colors disabled:opacity-50"
                            >
                                <IoPersonAdd className="w-4 h-4" />
                                {sendingRequest ? 'Sending...' : 'Send Friend Request'}
                            </button>
                        )}
                        {friendshipStatus === 'request_sent' && (
                            <p className="text-sm text-gray-500">Friend request sent. Waiting for response...</p>
                        )}
                        {friendshipStatus === 'request_received' && (
                            <p className="text-sm text-blue-600">This user has sent you a friend request. Check your notifications!</p>
                        )}
                    </div>
                ) : loadingMovies ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-[#414141] rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading movies...</p>
                    </div>
                ) : (
                    <div>
                        <MovieSection 
                            title="Currently Watching" 
                            icon={IoPlayCircle} 
                            iconColor="text-red-500"
                            movies={movies.watching}
                            sectionKey="watching"
                        />
                        
                        <MovieSection 
                            title="Watched" 
                            icon={IoCheckmarkCircle} 
                            iconColor="text-green-600"
                            movies={movies.watched}
                            sectionKey="watched"
                        />
                        
                        <MovieSection 
                            title="Watchlist" 
                            icon={IoBookmark} 
                            iconColor="text-purple-600"
                            movies={movies.wishlist}
                            sectionKey="wishlist"
                        />
                    </div>
                )}
            </div>

            {/* Movie Info Slider with Actions */}
            <MovieInfoSlider
                isOpen={isSliderOpen}
                onClose={() => setIsSliderOpen(false)}
                movie={selectedMovie}
                onClickWatched={async (watchedDate) => {
                    if (selectedMovie) {
                        await addToWatched(selectedMovie, watchedDate);
                    }
                }}
                onClickWatching={async () => {
                    if (selectedMovie) {
                        await addToWatching(selectedMovie);
                    }
                }}
                onClickWishlist={async () => {
                    if (selectedMovie) {
                        await addToWatchlist(selectedMovie);
                    }
                }}
                onActionComplete={() => {
                    setIsSliderOpen(false);
                }}
                watched={false}
                wishlist={false}
                cardType="search"
            />
        </div>
    );
}

