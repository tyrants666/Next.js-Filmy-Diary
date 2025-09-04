'use client';

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set a timeout fallback to ensure loading never gets stuck
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    // Get initial session
    const getSession = async () => {
      try {
        console.log('Getting initial session...');
        
        // Small delay to ensure localStorage is ready in some browsers
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
                  total_login: 1  // Initialize total_login counter
                });

              if (insertError) {
                console.error('Filmy Diary - Error creating profile:', insertError);
              } else {
                console.log('Profile created successfully');
              }
            } else {
              console.log("%cProfile already exists in the database", "color: lightgreen;");
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
        
        // Only update login count on SIGNED_IN event that's not from an initial session
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: existingSession } = await supabase.auth.getSession();
          // Check if this is a new sign-in rather than an existing session
          const isNewSignIn = !existingSession?.data?.session?.user;
          if (isNewSignIn) {
            updateLoginCount(session.user.id);
          }
        }
        
        setUser(session?.user || null)
        setLoading(false)
        clearTimeout(loadingTimeout)
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
          // Increment the count
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              total_login: (profile.total_login || 0) + 1
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

  const value = {
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
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