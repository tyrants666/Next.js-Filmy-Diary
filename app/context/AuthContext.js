'use client';

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

        //Add Authenticated user info to Profiles column
        if (session?.user) {
            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

            // First time Login - Create profile if it doesn't exist
            {console.log( session.user.user_metadata)}
            if (!profile) {
              // Extract name from metadata - Google provides different keys than expected
              const firstName = session.user.user_metadata?.name?.split(' ')[0] || '';
              const lastName = (session.user.user_metadata?.name?.split(' ').length > 1
                  ? session.user.user_metadata?.name?.split(' ').slice(1).join(' ')
                  : '');

              const { error } = await supabase
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

              if (error) console.error('Error creating profile:', error);
            }
        }

      setUser(session?.user || null)
      setLoading(false)
    }
    
    getSession()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      }
    )

    // Function to update login count on sign-in events
    const updateLoginCount = async (userId) => {
      // Get current count
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_login')
        .eq('id', userId)
        .single();

      if (profile) {
        // Increment the count
        await supabase
          .from('profiles')
          .update({
            total_login: profile.total_login + 1
          })
          .eq('id', userId);
      }
    };

    return () => {
      subscription.unsubscribe()
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