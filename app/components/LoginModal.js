'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginModal({ isOpen, onClose, movieTitle }) {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { signInWithGoogle, user } = useAuth();
    const { showError } = useToast();

    // Close modal when user successfully logs in
    useEffect(() => {
        if (user && isOpen) {
            onClose();
        }
    }, [user, isOpen, onClose]);

    const handleGoogleLogin = async () => {
        if (isLoggingIn) return;
        
        try {
            setIsLoggingIn(true);
            await signInWithGoogle();
            // Modal will close automatically when user state changes
            console.log('Login successful from modal');
        } catch (error) {
            console.error('Error logging in with Google:', error.message);
            
            // Handle specific error cases
            if (error.message === 'Authentication was cancelled or failed') {
                showError('Login was cancelled. Please try again.');
            } else if (error.message === 'Authentication timeout') {
                showError('Login timed out. Please try again.');
            } else if (error.message.includes('Popup blocked')) {
                showError('Popup was blocked. Please allow popups and try again, or the page will redirect automatically.');
            } else {
                showError(`Login failed: ${error.error_description || error.message}`);
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoggingIn}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                {/* Content */}
                <div className="text-center">
                    {/* Movie icons */}
                    <div className="flex justify-center gap-2 mb-4">
                        <div className="p-2 bg-purple-100 rounded-full">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                            </svg>
                        </div>
                        <div className="p-2 bg-red-100 rounded-full">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                        </div>
                        <div className="p-2 bg-green-100 rounded-full">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-600">
                                <polyline points="20,6 9,17 4,12"></polyline>
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Login to Add Movies
                    </h2>
                    
                    {movieTitle && (
                        <p className="text-gray-600 mb-4">
                            Sign in to add <span className="font-semibold">"{movieTitle}"</span> to your watchlist, watching, or watched list!
                        </p>
                    )}
                    
                    <p className="text-gray-500 mb-6">
                        Keep track of what you want to watch, what you're currently watching, and what you've already seen.
                    </p>

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition duration-200 ${
                            isLoggingIn 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 shadow-sm'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                        </svg>
                        {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
                    </button>

                    <p className="text-xs text-gray-400 mt-4">
                        By signing in, you agree to our terms of service and privacy policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
