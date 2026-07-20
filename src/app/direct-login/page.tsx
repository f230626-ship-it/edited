'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DirectLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleDirectLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      
      // Clear any existing session first
      await supabase.auth.signOut();
      
      console.log('Attempting direct login...');
      
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'mabdullahshafiq100@gmail.com',
        password: 'MindVista@Dev2026',
      });

      if (loginError) {
        console.error('Login error:', loginError);
        setError(`Login failed: ${loginError.message}`);
        return;
      }

      console.log('Login successful:', data);
      setSuccess('Login successful! Redirecting...');
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force reload to update all auth states
      window.location.href = '/dashboard';
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Clear Supabase auth
      const supabase = createClient();
      await supabase.auth.signOut();
      
      alert('All browser data cleared! You can now try logging in again.');
      router.refresh();
    } catch (err) {
      console.error('Error clearing data:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Direct Login Tool
        </h1>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This page will log you in directly using hardcoded credentials to bypass any form or cookie issues.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <button
            onClick={handleDirectLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Logging in...' : 'Login as Admin'}
          </button>

          <button
            onClick={clearAllData}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium"
          >
            Clear All Browser Data & Sign Out
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2 font-semibold">Debug Info:</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Email: mabdullahshafiq100@gmail.com</p>
              <p>User ID: 116055c1-04bb-4aba-a648-970c81fcdb33</p>
              <p>Role: admin</p>
              <p>Status: active</p>
            </div>
          </div>

          <a 
            href="/login" 
            className="block text-center text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to normal login
          </a>
        </div>
      </div>
    </div>
  );
}