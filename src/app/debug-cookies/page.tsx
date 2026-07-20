'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugCookiesPage() {
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      setInfo({
        hasSession: !!session,
        sessionUser: session?.user?.email || 'No user',
        error: error?.message || 'No error',
        cookies: document.cookie || 'No cookies',
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        env: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      });
    }
    
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Cookie & Auth Debug Info</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-2">Environment</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(info.env, null, 2)}
            </pre>
          </div>

          <div className="bg-blue-100 p-4 rounded">
            <h2 className="font-semibold mb-2">Session Status</h2>
            <pre className="text-xs overflow-auto">
              Has Session: {String(info.hasSession)}
              {'\n'}User: {info.sessionUser}
              {'\n'}Error: {info.error}
            </pre>
          </div>

          <div className="bg-yellow-100 p-4 rounded">
            <h2 className="font-semibold mb-2">Cookies</h2>
            <pre className="text-xs overflow-auto whitespace-pre-wrap break-all">
              {info.cookies}
            </pre>
          </div>

          <div className="bg-green-100 p-4 rounded">
            <h2 className="font-semibold mb-2">Browser Info</h2>
            <pre className="text-xs overflow-auto">
              Origin: {info.origin}
              {'\n'}Secure Context: {String(info.isSecureContext)}
              {'\n'}User Agent: {info.userAgent}
            </pre>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          
          <a
            href="/login"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}