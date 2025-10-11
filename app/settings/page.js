'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function Settings() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const { user, loading, signOut } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();

    // Banner slider settings
    const [bannerAutoplayEnabled, setBannerAutoplayEnabled] = useState(true);
    const [bannerAutoplayDelayMs, setBannerAutoplayDelayMs] = useState(5000);

    // Load persisted settings on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedEnabled = localStorage.getItem('bannerAutoplayEnabled');
        const storedDelay = localStorage.getItem('bannerAutoplayDelayMs');
        if (storedEnabled !== null) {
            setBannerAutoplayEnabled(storedEnabled === 'true');
        }
        if (storedDelay !== null) {
            const parsed = parseInt(storedDelay, 10);
            if (!isNaN(parsed)) {
                const clamped = Math.min(20000, Math.max(1000, parsed));
                setBannerAutoplayDelayMs(clamped);
            }
        }
    }, []);

    // Persist settings when changed
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('bannerAutoplayEnabled', String(bannerAutoplayEnabled));
    }, [bannerAutoplayEnabled]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('bannerAutoplayDelayMs', String(bannerAutoplayDelayMs));
    }, [bannerAutoplayDelayMs]);

    // Redirect to login if not authenticated
    if (!loading && !user) {
        router.push('/login');
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Image 
                    src="/images/babu-rao-stickers.png" 
                    alt="Babu Rao" 
                    width={240} 
                    height={250} 
                    className='mb-2'
                    priority
                />
                <p className='text-center text-md px-4'>Loading settings...
                    <svg className="animate-spin h-4 w-4 inline-block text-black ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
            </div>
        );
    }

    const handleDeleteAllData = async () => {
        if (confirmText !== 'DELETE ALL MY DATA') {
            showError('Please type "DELETE ALL MY DATA" to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            // Delete all user movie data
            const response = await fetch('/api/settings/delete-all-data', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete data: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            
            showSuccess('All your movie data has been deleted successfully!');
            setShowDeleteConfirm(false);
            setConfirmText('');
            
            // Redirect to home page after successful deletion
            setTimeout(() => {
                router.push('/');
            }, 2000);

        } catch (error) {
            console.error('Error deleting all data:', error);
            showError('Failed to delete your data. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto text-black">
                {/* Header */}
                <header className="py-4 m-4 mb-0 rounded-xl text-center flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/')}
                            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-black transition-colors"
                            title="Back to Home"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold">Settings</h1>
                    </div>
                    
                    <Image
                        src="/images/logo.png"
                        alt="Filmy Diary Logo"
                        width={100}
                        height={100}
                        priority
                    />
                </header>

                {/* Main Content */}
                <main className="flex-grow p-4">
                    <div className="max-w-2xl mx-auto">
                        {/* User Info Section */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
                            <div className="space-y-2">
                                <p><span className="font-medium">Name:</span> {user.user_metadata?.name || 'Not provided'}</p>
                                <p><span className="font-medium">Email:</span> {user.email}</p>
                                <p><span className="font-medium">Account created:</span> {new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Banner Slider Settings */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Banner Slider</h2>
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Autoplay</label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={bannerAutoplayEnabled}
                                            onChange={(e) => setBannerAutoplayEnabled(e.target.checked)}
                                        />
                                        <div className="relative inline-block w-11 h-6 rounded-full bg-gray-200 transition-colors peer-checked:bg-green-500">
                                            <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
                                        </div>
                                    </label>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium">Autoplay speed</label>
                                        <span className="text-xs text-gray-600">{bannerAutoplayDelayMs} ms ({(bannerAutoplayDelayMs / 1000).toFixed(1)}s)</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1000}
                                        max={20000}
                                        step={500}
                                        value={bannerAutoplayDelayMs}
                                        onChange={(e) => {
                                            const next = parseInt(e.target.value, 10);
                                            if (!isNaN(next)) {
                                                const clamped = Math.min(20000, Math.max(1000, next));
                                                setBannerAutoplayDelayMs(clamped);
                                            }
                                        }}
                                        className="w-full accent-black"
                                        disabled={!bannerAutoplayEnabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                                Danger Zone
                            </h2>
                            
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-red-700 mb-2">Delete All Movie Data</h3>
                                <p className="text-red-600 mb-4">
                                    This will permanently delete all your saved movies, watchlist, and watch history. 
                                    This action cannot be undone.
                                </p>
                                
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                                    >
                                        Delete All My Movie Data
                                    </button>
                                ) : (
                                    <div className="bg-white border border-red-300 rounded-lg p-4">
                                        <h4 className="font-medium text-red-800 mb-3">Confirm Data Deletion</h4>
                                        <p className="text-red-700 mb-3">
                                            Type <span className="font-mono bg-red-100 px-1 rounded">DELETE ALL MY DATA</span> to confirm:
                                        </p>
                                        <input
                                            type="text"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            className="w-full p-2 border border-red-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Type: DELETE ALL MY DATA"
                                            disabled={isDeleting}
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleDeleteAllData}
                                                disabled={isDeleting || confirmText !== 'DELETE ALL MY DATA'}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    isDeleting || confirmText !== 'DELETE ALL MY DATA'
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                                }`}
                                            >
                                                {isDeleting ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Deleting...
                                                    </span>
                                                ) : (
                                                    'Yes, Delete All My Data'
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setConfirmText('');
                                                }}
                                                disabled={isDeleting}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
