'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const getDebugInfo = async () => {
      const { data: session } = await supabase.auth.getSession()
      
      // Get receipt count to debug data visibility
      let receiptCount = 0
      if (session.session) {
        try {
          const { count } = await supabase
            .from('receipts')
            .select('*', { count: 'exact', head: true })
          receiptCount = count || 0
        } catch (error) {
          console.error('Error counting receipts:', error)
        }
      }
      
      const info = {
        currentOrigin: window.location.origin,
        currentHref: window.location.href,
        hasSession: !!session.session,
        sessionUser: session.session?.user?.email || 'none',
        userId: session.session?.user?.id || 'none',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        receiptCount: receiptCount,
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
    
    alert('Auth cleared! Reloading page...')
    window.location.reload()
  }

  const isWrongEnvironment = debugInfo.currentOrigin === 'http://localhost:3000' && debugInfo.hasSession

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-md">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      {isWrongEnvironment && (
        <div className="bg-red-600 p-2 rounded mb-2 text-xs">
          ⚠️ PROBLEM: Du bist auf localhost mit einer Produktions-Session!
          <br />Das verursacht das Redirect-Problem.
        </div>
      )}
      <pre className="whitespace-pre-wrap text-xs">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <button 
        onClick={clearAllAuth}
        className={`mt-2 px-2 py-1 rounded text-xs ${isWrongEnvironment ? 'bg-red-600 animate-pulse' : 'bg-red-600'}`}
      >
        {isWrongEnvironment ? '🚨 CLEAR AUTH NOW' : 'Clear All Auth'}
      </button>
    </div>
  )
}
