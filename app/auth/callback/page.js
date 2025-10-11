'use client';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback page loaded - redirect flow');
        
        // Handle OAuth callback from URL hash or search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        
        console.log('Token extraction:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken 
        });

        if (accessToken) {
          try {
            // Set the session using the tokens from the URL
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              console.error('Error setting session:', error);
            } else if (session) {
              console.log('Session set successfully:', session.user.email);
            }
          } catch (error) {
            console.error('Error in auth callback:', error);
          }
        } else {
          // Try to get existing session (fallback)
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
          } else if (session) {
            console.log('Existing session found:', session.user.email);
          } else {
            console.log('No session or tokens found');
          }
        }
        
        // Always redirect to home page after processing
        console.log('Redirecting to home page...');
        window.location.href = '/';
        
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        // Still redirect to home even on error
        window.location.href = '/';
      }
    };

    // Handle the auth callback
    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
