'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function GoogleLoginButton() {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { signInWithGoogle } = useAuth();
    const { showError } = useToast();

    const handleGoogleLogin = async () => {
        if (isLoggingIn) return; // Prevent double clicks
        
        try {
            setIsLoggingIn(true);
            await signInWithGoogle();
            // Success - the auth state will update automatically
            console.log('Login successful');
        } catch (error) {
            console.error('Error logging in with Google:', error.message);
            
            // Handle specific error cases
            if (error.message === 'Authentication was cancelled or failed') {
                showError('Login was cancelled. Please try again.');
            } else if (error.message === 'Authentication timeout') {
                showError('Login timed out. Please try again.');
            } else {
                showError(`Login failed: ${error.error_description || error.message}`);
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition duration-200 ${
                isLoggingIn 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm'
            }`}
            title={isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            <span className="inline">
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
            </span>
        </button>
    );
}
