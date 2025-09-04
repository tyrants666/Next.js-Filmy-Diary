'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  useEffect(() => {
    if (user && !loading) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return; // Prevent double clicks
    
    try {
      setIsLoggingIn(true);
      console.log('Starting Google login...');
      
      // Clear any existing session data before login
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
          // Force account selection
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          },
          // Ensure we get a fresh token
          skipBrowserRedirect: false,
        },
      })
      
      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
      
      console.log('Google OAuth initiated successfully');
      
    } catch (error) {
      console.error('Error logging in with Google:', error.message)
      alert(`Login failed: ${error.error_description || error.message}`)
      setIsLoggingIn(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (user) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="w-full max-w-md p-8 space-y-8 bg-black/30 backdrop-blur-md rounded-xl border border-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Filmy Diary</h1>
          <p className="mt-2 text-gray-400">Track your movies and share with friends</p>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition duration-200 ${
            isLoggingIn 
              ? 'bg-white/5 text-gray-400 cursor-not-allowed' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          {isLoggingIn ? 'Redirecting to Google...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}