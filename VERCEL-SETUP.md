# Vercel Deployment Setup

## Issue: Site works in incognito but not in normal browser

This is a **cookie/session issue**. Follow these steps to fix it:

## 1. Set Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://celsdouievgvgtdrgcgn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbHNkb3VpZXZndmd0ZHJnY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzIyODMsImV4cCI6MjA5Njc0ODI4M30.3tXM0axY_2JQ5XrsUCW9poNrmYse1YHo1767gkmm84M
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbHNkb3VpZXZndmd0ZHJnY2duIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3MjI4MywiZXhwIjoyMDk2NzQ4MjgzfQ.1Mp-Jlbp-6e7Cm-wwjqSSjYuhrC5BYTz72vm9A6xnFA
NEXT_PUBLIC_APP_URL=https://mindvista-crm.vercel.app
NEXT_PUBLIC_APP_NAME=MindVista HRMS
EMAIL_PROVIDER=brevo
BREVO_API_KEY=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
EMAIL_FROM=f230626@cfd.nu.edu.pk
EMAIL_FROM_NAME=MindVista HRMS
EMAILVERIFY_API_KEY=v0zKuSCoKUdefcU82x0NENjFDe0TL75M
```

**Important:** Make sure to set these for **Production**, **Preview**, and **Development** environments.

## 2. Configure Supabase Authentication URLs

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `celsdouievgvgtdrgcgn`
3. Go to **Authentication** → **URL Configuration**
4. Add these URLs:

**Site URL:**
```
https://mindvista-crm.vercel.app
```

**Redirect URLs (add all of these):**
```
https://mindvista-crm.vercel.app/**
https://mindvista-crm.vercel.app/auth/callback
https://mindvista-crm.vercel.app/login
https://mindvista-crm.vercel.app/dashboard
http://localhost:3000/**
```

## 3. Clear Browser Cookies

1. Open DevTools (F12)
2. Go to **Application** tab → **Cookies**
3. Find `mindvista-crm.vercel.app`
4. **Delete ALL cookies**
5. Close DevTools
6. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## 4. Redeploy on Vercel

After setting environment variables:

1. Go to your Vercel dashboard
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete
4. Visit: https://mindvista-crm.vercel.app

## 5. Test Debug Page

Visit this page to see cookie/auth status:
```
https://mindvista-crm.vercel.app/debug-cookies
```

This will show you:
- If environment variables are set correctly
- If cookies are being saved
- If session is working

## Common Issues & Solutions

### Issue: "Invalid email or password"
**Solution:** The password with `@` symbol might cause issues. Use the direct login page:
```
https://mindvista-crm.vercel.app/direct-login
```

### Issue: Cookies not persisting
**Solution:** 
1. Make sure `NEXT_PUBLIC_APP_URL` matches your Vercel domain exactly
2. Clear all browser cookies for the domain
3. Try in incognito first to verify it works with fresh cookies

### Issue: Infinite redirect loop
**Solution:**
1. Check that all environment variables are set in Vercel
2. Make sure Supabase redirect URLs include your Vercel domain
3. Clear cookies and try again

## Verification Checklist

- [ ] All environment variables set in Vercel
- [ ] Supabase redirect URLs configured
- [ ] Browser cookies cleared
- [ ] Redeployed after setting env vars
- [ ] Tested in incognito (should work)
- [ ] Tested in normal browser (should now work)

## Need Help?

If you're still having issues after following all steps:

1. Visit `/debug-cookies` page and share the output
2. Check browser console for errors (F12 → Console tab)
3. Check Vercel deployment logs for errors