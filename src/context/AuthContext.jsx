import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isAuthEnabled } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthEnabled) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!isAuthEnabled) return { error: { message: 'Auth not configured' } }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    return { error }
  }

  const signInWithFacebook = async () => {
    if (!isAuthEnabled) return { error: { message: 'Auth not configured' } }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: window.location.origin
      }
    })
    return { error }
  }

  const signInWithEmail = async (email, password) => {
    if (!isAuthEnabled) return { error: { message: 'Auth not configured' } }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signUpWithEmail = async (email, password, name) => {
    if (!isAuthEnabled) return { error: { message: 'Auth not configured' } }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    if (!isAuthEnabled) return
    await supabase.auth.signOut()
  }

  const value = {
    user,
    loading,
    isAuthEnabled,
    signInWithGoogle,
    signInWithFacebook,
    signInWithEmail,
    signUpWithEmail,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

