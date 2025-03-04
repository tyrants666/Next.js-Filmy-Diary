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

            // Create profile if it doesn't exist
            if (!profile) {
              // Extract name from metadata - Google provides different keys than expected
              // first_name is in given_name, last_name is in family_name
              const firstName = session.user.user_metadata?.given_name ||
                session.user.user_metadata?.name?.split(' ')[0] || '';
              const lastName = session.user.user_metadata?.family_name ||
                (session.user.user_metadata?.name?.split(' ').length > 1
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
      (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

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