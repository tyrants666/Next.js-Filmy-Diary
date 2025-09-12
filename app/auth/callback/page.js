'use client';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback page loaded');
        
        // Check if this is a popup window
        const isPopup = window.opener && window.opener !== window;
        console.log('Is popup window:', isPopup);
        
        if (!isPopup) {
          // If not a popup, this is a redirect flow - handle the auth and redirect to home
          console.log('Not a popup, handling redirect flow');
          
          // Handle OAuth callback from URL hash or search params
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const searchParams = new URLSearchParams(window.location.search);
          
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          
          if (accessToken) {
            try {
              // Set the session using the tokens from the URL
              const { data: { session }, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (error) {
                console.error('Error setting session in redirect flow:', error);
              } else if (session) {
                console.log('Session set successfully in redirect flow:', session.user.email);
              }
            } catch (error) {
              console.error('Error in redirect flow:', error);
            }
          }
          
          // Redirect to home page
          window.location.href = '/';
          return;
        }

        // Handle OAuth callback from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('Hash params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken 
        });

        if (accessToken) {
          // Set the session using the tokens from the URL
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_ERROR',
              error: error.message
            }, window.location.origin);
          } else if (session) {
            console.log('Session set successfully:', session.user.email);
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_SUCCESS',
              session: session
            }, window.location.origin);
          } else {
            console.error('No session after setting tokens');
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_ERROR',
              error: 'Failed to create session'
            }, window.location.origin);
          }
        } else {
          // Try to get existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_ERROR',
              error: error.message
            }, window.location.origin);
          } else if (session) {
            console.log('Existing session found:', session.user.email);
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_SUCCESS',
              session: session
            }, window.location.origin);
          } else {
            console.error('No session or tokens found');
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_ERROR',
              error: 'No authentication data found'
            }, window.location.origin);
          }
        }
        
        // Close the popup window after a short delay
        setTimeout(() => {
          window.close();
        }, 500);
        
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        if (window.opener) {
          window.opener.postMessage({
            type: 'SUPABASE_AUTH_ERROR',
            error: 'Authentication failed'
          }, window.location.origin);
        }
        setTimeout(() => {
          window.close();
        }, 500);
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
