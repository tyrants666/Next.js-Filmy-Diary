'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IoBookmark, IoPlayCircle, IoCheckmarkCircle } from 'react-icons/io5';
import UserDropdown from './UserDropdown';
import GoogleLoginButton from './GoogleLoginButton';
import SearchInput from './SearchInput';
import { useAuth } from '../context/AuthContext';

const Header = ({ currentPage = 'home', showSearch = false, searchProps = {} }) => {
    const { user, signOut, isSigningOut } = useAuth();
    const router = useRouter();

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
