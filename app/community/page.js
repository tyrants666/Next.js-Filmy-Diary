'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { IoPeople, IoSearch, IoPersonAdd, IoTrophy, IoSparkles, IoChevronForward, IoClose } from 'react-icons/io5';

// Dummy friends data (to be replaced with real data later)
const DUMMY_FRIENDS = [
    { id: '1', first_name: 'Rahul', last_name: 'Sharma', user_email: 'rahul@example.com', avatar_url: null },
    { id: '2', first_name: 'Priya', last_name: 'Patel', user_email: 'priya@example.com', avatar_url: null },
    { id: '3', first_name: 'Amit', last_name: 'Kumar', user_email: 'amit@example.com', avatar_url: null },
    { id: '4', first_name: 'Sneha', last_name: 'Gupta', user_email: 'sneha@example.com', avatar_url: null },
    { id: '5', first_name: 'Vikram', last_name: 'Singh', user_email: 'vikram@example.com', avatar_url: null },
    { id: '6', first_name: 'Anjali', last_name: 'Verma', user_email: 'anjali@example.com', avatar_url: null },
    { id: '7', first_name: 'Karan', last_name: 'Malhotra', user_email: 'karan@example.com', avatar_url: null },
    { id: '8', first_name: 'Neha', last_name: 'Agarwal', user_email: 'neha@example.com', avatar_url: null },
];

// User Card Component
const UserCard = ({ user, onAddFriend, isFriend = false, showStats = false, rank = null }) => {
    const router = useRouter();
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.user_email?.[0]?.toUpperCase() || '?';
    
    const handleClick = () => {
        router.push(`/friend/${user.id}`);
    };

    return (
        <div 
            className="flex flex-col items-center p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer group relative"
            onClick={handleClick}
        >
            {/* Avatar */}
            <div className="relative mb-3">
                {user.avatar_url ? (
                    <Image
                        src={user.avatar_url}
                        alt={`${user.first_name || 'User'}'s avatar`}
                        width={72}
                        height={72}
                        className="w-18 h-18 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="w-18 h-18 rounded-full bg-[#414141] flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-105 transition-transform"
                         style={{ width: '72px', height: '72px' }}>
                        {initials}
                    </div>
                )}
            </div>
            
            {/* Name */}
            <h3 className="font-semibold text-gray-800 text-sm text-center truncate w-full">
                {user.first_name || user.last_name 
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : 'Filmy User'}
            </h3>
            
            {/* Email/Username */}
            <p className="text-xs text-gray-500 truncate w-full text-center mt-0.5">
                {user.user_email?.split('@')[0] || 'user'}
            </p>
            
            {/* Movie Stats for Top Users */}
            {showStats && user.saved_movies !== undefined && (
                <div className="flex items-center gap-1 mt-2 text-xs text-orange-500 font-medium">
                    <IoTrophy className="w-3.5 h-3.5" />
                    <span>{user.saved_movies || 0} movies</span>
                </div>
            )}
            
            {/* Add Friend Button - Solid color */}
            {!isFriend && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddFriend?.(user);
                    }}
                    className="mt-3 px-4 py-1.5 border-2 border-[#414141] text-[#414141] hover:bg-[#414141] hover:text-white text-xs font-medium rounded-full transition-colors flex items-center gap-1"
                >
                    <IoPersonAdd className="w-3.5 h-3.5" />
                    Add+
                </button>
            )}
        </div>
    );
};

// Friend List Item Component (for sidebar)
const FriendListItem = ({ friend, onClick }) => {
    const initials = `${friend.first_name?.[0] || ''}${friend.last_name?.[0] || ''}`.toUpperCase() || '?';
    
    return (
        <div 
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
            onClick={() => onClick?.(friend)}
        >
            {friend.avatar_url ? (
                <Image
                    src={friend.avatar_url}
                    alt={friend.first_name || 'Friend'}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover"
                />
            ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-medium">
                    {initials}
                </div>
            )}
            <span className="text-sm text-gray-700 font-medium truncate">
                {friend.first_name || friend.last_name 
                    ? `${friend.first_name || ''} ${friend.last_name || ''}`.trim()
                    : 'Filmy User'}
            </span>
        </div>
    );
};

export default function CommunityPage() {
    const { user, loading } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();
    
    const [topUsers, setTopUsers] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState(DUMMY_FRIENDS);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [loadingTopUsers, setLoadingTopUsers] = useState(true);
    const [loadingSuggested, setLoadingSuggested] = useState(true);
    const [showMobileFriends, setShowMobileFriends] = useState(false);

    // Fetch top users
    const fetchTopUsers = useCallback(async () => {
        try {
            setLoadingTopUsers(true);
            const response = await fetch(`/api/users?type=top`);
            const data = await response.json();
            
            if (response.ok) {
                setTopUsers(data.users || []);
            } else {
                console.error('Error fetching top users:', data.error);
            }
        } catch (error) {
            console.error('Error fetching top users:', error);
        } finally {
            setLoadingTopUsers(false);
        }
    }, []);

    // Fetch suggested users
    const fetchSuggestedUsers = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoadingSuggested(true);
            const response = await fetch(`/api/users?type=all&userId=${user.id}`);
            const data = await response.json();
            
            if (response.ok) {
                setSuggestedUsers(data.users || []);
            } else {
                console.error('Error fetching suggested users:', data.error);
            }
        } catch (error) {
            console.error('Error fetching suggested users:', error);
        } finally {
            setLoadingSuggested(false);
        }
    }, [user]);

    // Search users
    const searchUsers = useCallback(async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/api/users?type=search&q=${encodeURIComponent(query)}&userId=${user?.id || ''}`);
            const data = await response.json();
            
            if (response.ok) {
                setSearchResults(data.users || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setIsSearching(false);
        }
    }, [user?.id]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchUsers(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    // Handle add friend (placeholder for now)
    const handleAddFriend = (targetUser) => {
        showSuccess(`Friend request sent to ${targetUser.first_name || targetUser.user_email}!`);
        // TODO: Implement actual friend request logic
    };

    // Navigate to friend profile
    const handleFriendClick = (friend) => {
        router.push(`/friend/${friend.id}`);
    };

    // Fetch data on mount
    useEffect(() => {
        if (user && !loading) {
            fetchTopUsers();
            fetchSuggestedUsers();
        }
    }, [user, loading, fetchTopUsers, fetchSuggestedUsers]);

    if (loading) {
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
                    Finding film enthusiasts...
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

    const displayUsers = searchQuery.trim().length >= 2 ? searchResults : suggestedUsers;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/30">
            <div className="container mx-auto px-4 pb-8">
                <Header currentPage="community" showSearch={false} />

                <div className="flex gap-6 mt-6">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <IoPeople className="w-8 h-8 text-[#414141]" />
                                Community
                            </h1>
                            <p className="text-gray-600 mt-2">Connect with fellow movie enthusiasts</p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-8">
                            <div className="relative">
                                <IoSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#414141] focus:border-transparent transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <IoClose className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            {isSearching && (
                                <div className="absolute right-14 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-[#414141] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Top Users Section */}
                        {!searchQuery && (
                            <section className="mb-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <IoTrophy className="w-5 h-5 text-[#414141]" />
                                        Top Movie Buffs
                                    </h2>
                                </div>
                                
                                {loadingTopUsers ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse"></div>
                                        ))}
                                    </div>
                                ) : topUsers.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                        {topUsers.slice(0, 6).map((topUser) => (
                                            <UserCard 
                                                key={topUser.id}
                                                user={topUser} 
                                                onAddFriend={handleAddFriend}
                                                showStats={true}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No top users found yet</p>
                                )}
                            </section>
                        )}

                        {/* Suggested Friends / Search Results Section */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <IoSparkles className="w-5 h-5 text-[#414141]" />
                                    {searchQuery ? 'Search Results' : 'Discover People'}
                                </h2>
                                {searchQuery && searchResults.length > 0 && (
                                    <span className="text-sm text-gray-500">{searchResults.length} found</span>
                                )}
                            </div>

                            {loadingSuggested && !searchQuery ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse"></div>
                                    ))}
                                </div>
                            ) : displayUsers.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {displayUsers.map((suggestedUser) => (
                                        <UserCard 
                                            key={suggestedUser.id}
                                            user={suggestedUser} 
                                            onAddFriend={handleAddFriend}
                                        />
                                    ))}
                                </div>
                            ) : searchQuery ? (
                                <div className="text-center py-12">
                                    <IoSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No users found for &ldquo;{searchQuery}&rdquo;</p>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <IoPeople className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No users to suggest right now</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Friends Sidebar - Desktop */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="sticky top-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <IoPeople className="w-5 h-5 text-[#414141]" />
                                Friends
                                <span className="ml-auto text-xs text-gray-400 font-normal">{friends.length}</span>
                            </h3>
                            
                            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {friends.length > 0 ? (
                                    friends.map((friend) => (
                                        <FriendListItem 
                                            key={friend.id} 
                                            friend={friend} 
                                            onClick={handleFriendClick}
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        No friends yet. Start adding!
                                    </p>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Mobile Friends Button */}
                <button
                    onClick={() => setShowMobileFriends(true)}
                    className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#414141] hover:bg-[#2d2d2d] text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all z-40"
                >
                    <IoPeople className="w-6 h-6" />
                    {friends.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {friends.length}
                        </span>
                    )}
                </button>

                {/* Mobile Friends Modal */}
                {showMobileFriends && (
                    <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end">
                        <div 
                            className="absolute inset-0" 
                            onClick={() => setShowMobileFriends(false)}
                        ></div>
                        <div className="relative w-full bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto animate-slide-up">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <IoPeople className="w-5 h-5 text-[#414141]" />
                                    Friends ({friends.length})
                                </h3>
                                <button
                                    onClick={() => setShowMobileFriends(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <IoClose className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            
                            <div className="space-y-1">
                                {friends.length > 0 ? (
                                    friends.map((friend) => (
                                        <FriendListItem 
                                            key={friend.id} 
                                            friend={friend} 
                                            onClick={(f) => {
                                                setShowMobileFriends(false);
                                                handleFriendClick(f);
                                            }}
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-8">
                                        No friends yet. Start connecting!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

