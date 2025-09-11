'use client';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_ERROR',
              error: error.message
            }, window.location.origin);
          }
          window.close();
          return;
        }

        if (session) {
          console.log('Auth callback successful:', session.user.email);
          // Send success message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_SUCCESS',
              session: session
            }, window.location.origin);
          }
        } else {
          // No session found, send error
          if (window.opener) {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_ERROR',
              error: 'No session found'
            }, window.location.origin);
          }
        }
        
        // Close the popup window
        window.close();
        
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        if (window.opener) {
          window.opener.postMessage({
            type: 'SUPABASE_AUTH_ERROR',
            error: 'Authentication failed'
          }, window.location.origin);
        }
        window.close();
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
