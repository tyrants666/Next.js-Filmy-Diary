'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { IoSettings, IoLogOut, IoPerson, IoDocumentText } from 'react-icons/io5';

const UserDropdown = ({ user, isSigningOut, onSignOut }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const dropdownRef = useRef(null);
    const router = useRouter();

    // Fetch user role
    useEffect(() => {
        const fetchUserRole = async () => {
            if (!user) return;
            
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!error && profile) {
                    setUserRole(profile.role);
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            }
        };

        fetchUserRole();
    }, [user]);

    // Close dropdown when clicking outside
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

    const handleSignOut = async () => {
        setIsOpen(false);
        await onSignOut();
    };

    const handleSettingsClick = () => {
        setIsOpen(false);
        router.push('/settings');
    };

    const handleUserLogsClick = () => {
        setIsOpen(false);
        router.push('/user-logs');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* User Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 text-gray-500 hover:text-gray-600 transition-colors"
                title={user?.user_metadata?.name?.split(' ')[0] || user?.email}
            >
                <IoPerson className="w-[22px] h-[22px]" />
            </button>

            {/* Dropdown Menu - Styled like notification dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                            {user?.user_metadata?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        {/* Show User logs only for superadmin */}
                        {userRole === 'superadmin' && (
                            <button
                                onClick={handleUserLogsClick}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <IoDocumentText className="w-4 h-4 text-gray-500" />
                                User Logs
                            </button>
                        )}
                        
                        <button
                            onClick={handleSettingsClick}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <IoSettings className="w-4 h-4 text-gray-500" />
                            Settings
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                isSigningOut 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-red-600 hover:bg-red-50'
                            }`}
                        >
                            {isSigningOut ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                            ) : (
                                <IoLogOut className="w-4 h-4" />
                            )}
                            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
