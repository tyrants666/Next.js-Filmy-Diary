'use client';

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Debug function to check localStorage state
  const debugStorageState = () => {
    if (typeof window === 'undefined') return;
    
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    );
    
    console.log('=== Storage Debug ===');
    console.log('Supabase keys in localStorage:', supabaseKeys);
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value ? 'Has data' : 'Empty');
    });
    console.log('==================');
  };

  useEffect(() => {
    // Set a timeout fallback to ensure loading never gets stuck
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    // Get initial session with retry mechanism
    const getSession = async (retryCount = 0) => {
      try {
        console.log(`Getting initial session... (attempt ${retryCount + 1})`);
        
        // Debug storage state
        debugStorageState();
        
        // Longer delay to ensure localStorage is ready in some browsers
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Check if localStorage has Supabase session data
        if (typeof window !== 'undefined') {
          const hasSupabaseData = Object.keys(localStorage).some(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          console.log('Has Supabase data in localStorage:', hasSupabaseData);
          
          // If we have localStorage data but no session, try again (up to 3 times)
          if (hasSupabaseData && retryCount < 2) {
            const { data: { session: testSession } } = await supabase.auth.getSession();
            if (!testSession) {
              console.log('Session not loaded yet, retrying...');
              await new Promise(resolve => setTimeout(resolve, 500));
              return getSession(retryCount + 1);
            }
          }
        }
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setUser(null);
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        console.log('Initial session result:', session ? 'Session found' : 'No session');

        //Add Authenticated user info to Profiles column
        if (session?.user) {
          console.log("%cSession User Details Below 👇",'color: lightgreen;');
          console.log(session.user);
          
          try {
            // Check if profile exists
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle(); // Use maybeSingle() instead of single()

            if (profileError) {
              console.error('Error checking profile:', profileError);
            } else if (!profile) {
              // First time Login - Create profile if it doesn't exist
              console.log('Creating new profile for user');
              const firstName = session.user.user_metadata?.name?.split(' ')[0] || '';
              const lastName = (session.user.user_metadata?.name?.split(' ').length > 1
                  ? session.user.user_metadata?.name?.split(' ').slice(1).join(' ')
                  : '');
                  
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  user_email: session.user.email,
                  first_name: firstName,
                  last_name: lastName,
                  avatar_url: session.user.user_metadata?.picture || session.user.user_metadata?.avatar_url,
                  phone: null, // Initialize phone as NULL
                  total_login: 1,  // Initialize total_login counter
                  last_login: new Date().toISOString() // Set initial last_login timestamp
                });

              if (insertError) {
                console.error('Filmy Diary - Error creating profile:', insertError);
              } else {
                console.log('Profile created successfully');
              }
            } else {
              console.log("%cProfile already exists in the database", "color: lightgreen;");
              // Update last_login for existing users when they restore session
              const { error: updateLastLoginError } = await supabase
                .from('profiles')
                .update({
                  last_login: new Date().toISOString()
                })
                .eq('id', session.user.id);

              if (updateLastLoginError) {
                console.error('Error updating last_login:', updateLastLoginError);
              }
            }
          } catch (profileErr) {
            console.error('Error handling profile operations:', profileErr);
          }
        }

        setUser(session?.user || null);
        setLoading(false);
        clearTimeout(loadingTimeout); // Clear timeout on successful completion
      } catch (error) {
        console.error('Error in getSession:', error);
        setUser(null);
        setLoading(false);
        clearTimeout(loadingTimeout); // Clear timeout on error
      }
    }
    
    getSession()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
        
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          
          // Only update login count on actual new sign-ins (not session restoration)
          if (event === 'SIGNED_IN') {
            updateLoginCount(session.user.id);
          }
        }
        
        if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Token refreshed successfully');
        }
        
        setUser(session?.user || null);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    )

    // Function to update login count on sign-in events
    const updateLoginCount = async (userId) => {
      try {
        // Get current count
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('total_login')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle() instead of single()

        if (profileError) {
          console.error('Error fetching profile for login count:', profileError);
          return;
        }

        if (profile) {
          // Increment the count and update last login timestamp
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              total_login: (profile.total_login || 0) + 1,
              last_login: new Date().toISOString()
            })
            .eq('id', userId);

          if (updateError) {
            console.error('Error updating login count:', updateError);
          }
        }
      } catch (error) {
        console.error('Error in updateLoginCount:', error);
      }
    };

    return () => {
      subscription.unsubscribe()
      clearTimeout(loadingTimeout) // Clear timeout on cleanup
    }
  }, [])

  // Wrapper for Supabase operations with automatic session validation
  const withSessionValidation = async (operation) => {
    try {
      const session = await validateSession();
      if (!session) {
        throw new Error('Session expired');
      }
      return await operation(session);
    } catch (error) {
      if (error.message === 'Session expired' || error.message?.includes('JWT')) {
        setUser(null);
        throw new Error('Your session has expired. Please log in again.');
      }
      throw error;
    }
  };

  // Helper function to validate and refresh session
  const validateSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session validation error:', error)
        setUser(null)
        return null
      }
      
      if (!session) {
        console.warn('No active session found')
        setUser(null)
        return null
      }
      
      // Check if token is close to expiry (within 10 minutes)
      const expiresAt = session.expires_at * 1000 // Convert to milliseconds
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now
      
      if (timeUntilExpiry < 600000) { // Less than 10 minutes
        console.log('Token expiring soon, attempting refresh...')
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError)
          setUser(null)
          return null
        }
        
        if (refreshedSession) {
          setUser(refreshedSession.user)
          return refreshedSession
        }
      }
      
      return session
    } catch (error) {
      console.error('Error validating session:', error)
      setUser(null)
      return null
    }
  }

  // Enhanced sign out with comprehensive cleanup
  const signOut = async () => {
    try {
      console.log('Attempting to sign out...');
      
      // Clear user state immediately for better UX
      setUser(null);
      setLoading(true);
      
      // First, try to sign out from Supabase properly
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.warn('Supabase sign out error (continuing cleanup):', error);
      } else {
        console.log('Supabase sign out successful');
      }
      
      // Comprehensive cleanup of all auth-related data
      if (typeof window !== 'undefined') {
        // Clear ALL localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Also clear any cookies (for Google OAuth)
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        });
      }
      
      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Complete logout cleanup finished');
      
      // Reload the page to show the logged-out state
      window.location.reload();
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      
      // Force cleanup even on error
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      window.location.reload();
    }
  };

  // Google login function with popup
  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google login with popup...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Force account selection
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          },
          // Skip browser redirect to handle popup manually
          skipBrowserRedirect: true,
        },
      })
      
      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
      
      if (data?.url) {
        // Open popup window
        const popup = window.open(
          data.url,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes,left=' + 
          (window.screen.width / 2 - 250) + ',top=' + (window.screen.height / 2 - 300)
        );
        
        // Listen for messages from popup or popup close
        return new Promise((resolve, reject) => {
          let resolved = false;
          
          // Listen for messages from the popup
          const messageListener = (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'SUPABASE_AUTH_SUCCESS') {
              resolved = true;
              popup.close();
              window.removeEventListener('message', messageListener);
              console.log('Google OAuth completed successfully');
              resolve(event.data.session);
            } else if (event.data.type === 'SUPABASE_AUTH_ERROR') {
              resolved = true;
              popup.close();
              window.removeEventListener('message', messageListener);
              reject(new Error(event.data.error || 'Authentication failed'));
            }
          };
          
          window.addEventListener('message', messageListener);
          
          // Check if popup is closed
          const checkClosed = setInterval(() => {
            if (popup.closed && !resolved) {
              clearInterval(checkClosed);
              window.removeEventListener('message', messageListener);
              
              // Give a small delay to check if we got a session
              setTimeout(async () => {
                try {
                  const { data: { session }, error } = await supabase.auth.getSession();
                  if (error) {
                    reject(error);
                  } else if (session) {
                    console.log('Google OAuth completed successfully (detected via session check)');
                    resolve(session);
                  } else {
                    reject(new Error('Authentication was cancelled or failed'));
                  }
                } catch (err) {
                  reject(new Error('Authentication was cancelled or failed'));
                }
              }, 1000);
            }
          }, 1000);
          
          // Timeout after 5 minutes
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              clearInterval(checkClosed);
              window.removeEventListener('message', messageListener);
              if (!popup.closed) {
                popup.close();
              }
              reject(new Error('Authentication timeout'));
            }
          }, 300000);
        });
      } else {
        throw new Error('No OAuth URL received');
      }
      
    } catch (error) {
      console.error('Error logging in with Google:', error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    validateSession,
    withSessionValidation,
    signOut,
    signInWithGoogle,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}