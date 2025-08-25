'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const getDebugInfo = async () => {
      const { data: session } = await supabase.auth.getSession()
      const info = {
        currentOrigin: window.location.origin,
        currentHref: window.location.href,
        hasSession: !!session.session,
        sessionUser: session.session?.user?.email || 'none',
        localStorage: {
          supabaseAuth: localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token'),
        },
        sessionStorage: Object.keys(sessionStorage).filter(key => key.includes('supabase')),
      }
      setDebugInfo(info)
    }
    
    getDebugInfo()
  }, [])

  const clearAllAuth = async () => {
    // Clear Supabase session
    await supabase.auth.signOut()
    
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-md">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <pre className="whitespace-pre-wrap text-xs">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <button 
        onClick={clearAllAuth}
        className="mt-2 bg-red-600 px-2 py-1 rounded text-xs"
      >
        Clear All Auth
      </button>
    </div>
  )
}
