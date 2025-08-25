'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    // Safety timeout to ensure loading never gets stuck permanently
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Safety timeout triggered - forcing loading to false')
        setLoading(false)
      }
    }, 10000) // 10 second safety net
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial auth session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        console.log('Initial session:', session?.user?.email || 'No user')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            await fetchProfile(session.user.id)
          } catch (error) {
            console.error('Profile fetch failed, continuing anyway:', error)
          }
        }
        
        if (isMounted) {
          setLoading(false)
          clearTimeout(safetyTimeout)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (isMounted) {
          setLoading(false)
          clearTimeout(safetyTimeout)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        console.log('Auth state change:', event, session?.user?.email || 'No user')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            await fetchProfile(session.user.id)
          } catch (error) {
            console.error('Profile fetch failed during auth change, continuing anyway:', error)
          }
        } else {
          setProfile(null)
        }
        
        if (isMounted) {
          setLoading(false)
          clearTimeout(safetyTimeout)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating one')
          await createProfile(userId)
        } else {
          console.log('Profile fetch error (continuing without profile):', error.message)
          setProfile(null)
        }
        return
      }

      console.log('Profile fetched successfully')
      setProfile(data)
    } catch (error) {
      console.log('Profile fetch failed (continuing without profile):', error)
      setProfile(null)
    }
  }

  const createProfile = async (userId: string) => {
    try {
      console.log('Creating profile for user:', userId)
      const { data: userData } = await supabase.auth.getUser()
      
      if (userData.user) {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userData.user.email,
            name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0]
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating profile:', error)
          setProfile(null)
        } else {
          console.log('Profile created successfully:', data?.email)
          setProfile(data)
        }
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      setProfile(null)
    }
  }

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const value = {
    user,
    profile,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
