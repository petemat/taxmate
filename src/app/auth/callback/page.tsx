'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RefreshCw } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback from URL hash/search params
        const { data, error } = await supabase.auth.getSession()
        
        console.log('Auth callback - current origin:', window.location.origin)
        console.log('Auth callback - full URL:', window.location.href)
        console.log('Auth callback - session data:', data.session?.user?.email || 'no session')
        
        // Log URL parameters to see what Supabase is sending
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        console.log('URL search params:', Object.fromEntries(urlParams))
        console.log('URL hash params:', Object.fromEntries(hashParams))
        
        if (error) {
          console.error('Auth callback error:', error)
          // Force redirect to current origin, not localhost
          window.location.href = `${window.location.origin}/?error=auth_error`
          return
        }

        if (data.session) {
          console.log('Auth callback - redirecting authenticated user to dashboard')
          // Force redirect to current origin dashboard
          window.location.href = `${window.location.origin}/`
        } else {
          console.log('Auth callback - no session, redirecting to login')
          // Force redirect to current origin login
          window.location.href = `${window.location.origin}/`
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        window.location.href = `${window.location.origin}/?error=auth_error`
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Anmeldung wird verarbeitet...</p>
      </div>
    </div>
  )
}
