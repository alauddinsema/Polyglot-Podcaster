'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClientComponentClient } from './supabase'

// Fallback API call function that uses Next.js API routes to bypass browser extensions
const fallbackAuth = async (action: 'signin' | 'signup', payload: any) => {
  const endpoint = `/api/auth/${action}`

  // Use XMLHttpRequest to bypass extension interference
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)
    xhr.setRequestHeader('Content-Type', 'application/json')

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response)
        } else {
          resolve({ data: null, error: response.error || { message: 'Authentication failed' } })
        }
      } catch (e) {
        reject(new Error('Failed to parse response'))
      }
    }

    xhr.onerror = () => reject(new Error('Network request failed'))
    xhr.ontimeout = () => reject(new Error('Request timed out'))
    xhr.timeout = 30000

    const body = action === 'signin'
      ? JSON.stringify({ email: payload.email, password: payload.password })
      : JSON.stringify({ email: payload.email, password: payload.password, metadata: payload.data })

    xhr.send(body)
  })
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()

        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
          setMounted(true)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (isMounted) {
          setLoading(false)
          setMounted(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      return { data, error }
    } catch (err: any) {
      console.error('Sign up error:', err)

      // Check if error is caused by browser extension interference
      if (err?.message?.includes('Failed to fetch') || err?.toString?.().includes('chrome-extension')) {
        // Try fallback API route
        try {
          const response = await fallbackAuth('signup', { email, password, data: metadata })
          return response
        } catch (directErr) {
          return {
            data: null,
            error: {
              message: 'Browser extension is blocking the request. Please try disabling extensions or use incognito mode.'
            }
          }
        }
      }

      return { data: null, error: { message: 'Network error. Please check your connection and try again.' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    } catch (err: any) {
      console.error('Sign in error:', err)

      // Check if error is caused by browser extension interference
      if (err?.message?.includes('Failed to fetch') || err?.toString?.().includes('chrome-extension')) {
        // Try fallback API route
        try {
          const response = await fallbackAuth('signin', { email, password })
          return response
        } catch (directErr) {
          return {
            data: null,
            error: {
              message: 'Browser extension is blocking the request. Please try disabling extensions or use incognito mode.'
            }
          }
        }
      }

      return { data: null, error: { message: 'Network error. Please check your connection and try again.' } }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return { data, error }
    } catch (err: any) {
      console.error('Google sign in error:', err)

      // Check if error is caused by browser extension interference
      if (err?.message?.includes('Failed to fetch') || err?.toString?.().includes('chrome-extension')) {
        return {
          data: null,
          error: {
            message: 'Browser extension is blocking the request. Please try disabling extensions or use incognito mode.'
          }
        }
      }

      return { data: null, error: { message: 'Network error. Please check your connection and try again.' } }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { data, error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        ...value,
        user: null,
        session: null,
        loading: true
      }}>
        {children}
      </AuthContext.Provider>
    )
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