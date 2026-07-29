import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

  return createBrowserClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          // Ensure we're reading fresh cookies from the browser
          if (typeof document === 'undefined') return undefined;
          const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`));
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined;
        },
        set(name: string, value: string, options: any) {
          // Ensure proper cookie attributes for cross-site compatibility
          if (typeof document === 'undefined') return;
          
          const cookieOptions = {
            ...options,
            sameSite: options.sameSite || 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: options.path || '/',
          };
          
          let cookie = `${name}=${encodeURIComponent(value)}`;
          
          if (cookieOptions.maxAge) {
            cookie += `; Max-Age=${cookieOptions.maxAge}`;
          }
          if (cookieOptions.expires) {
            cookie += `; Expires=${cookieOptions.expires.toUTCString()}`;
          }
          if (cookieOptions.path) {
            cookie += `; Path=${cookieOptions.path}`;
          }
          if (cookieOptions.domain) {
            cookie += `; Domain=${cookieOptions.domain}`;
          }
          if (cookieOptions.sameSite) {
            cookie += `; SameSite=${cookieOptions.sameSite}`;
          }
          if (cookieOptions.secure) {
            cookie += '; Secure';
          }
          
          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return;
          
          // Set expiry to past date to remove cookie
          this.set(name, '', {
            ...options,
            maxAge: -1,
          });
        },
      },
    }
  );
}

