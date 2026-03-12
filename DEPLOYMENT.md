# AxixOS Deployment Guide

## Domain Configuration

**Domain**: axixos.com  
**Hosting**: Vercel  
**DNS Provider**: EasyName

---

## Current DNS Records

Your DNS is already configured correctly:

```
Name/Host        TTL   Type     Priority   Value
────────────────────────────────────────────────────────────
@                600   A                   216.198.79.1
mail-in          600   A                   185.3.235.176
www              600   CNAME               9e8845193b75538e.vercel-dns-017.com
@                600   MX       10         mx03.secure-mailgate.com
@                600   MX       10         mx04.secure-mailgate.com
```

✅ **www.axixos.com** is already pointing to Vercel via CNAME

---

## Vercel Setup Steps

### 1. Push to GitHub

```powershell
# Commit all changes
git add .
git commit -m "Rebrand to AxixOS"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `siparrott/pulse.onlinev1`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
```

### 4. Add Custom Domain

In Vercel Dashboard → Settings → Domains:

1. Click **"Add Domain"**
2. Enter: `axixos.com`
3. Click **"Add"**
4. Vercel will detect your DNS configuration

**Expected Status:**
- ✅ `www.axixos.com` - Already configured (CNAME detected)
- ⚠️ `axixos.com` - Needs redirect configuration

### 5. Configure Root Domain Redirect

For the root domain (`axixos.com`), you have two options:

#### Option A: Redirect to www (Recommended)

Update your A record in EasyName:
```
Name/Host: @
Type: A
Value: 76.76.21.21  (Vercel's redirect IP)
```

This will redirect `axixos.com` → `www.axixos.com`

#### Option B: Use Both Domains

Keep your current A record and add both domains in Vercel:
1. Add `axixos.com`
2. Add `www.axixos.com`
3. Set one as primary in Vercel

---

## Deployment Workflow

### Automatic Deployments

Vercel will automatically deploy on every push to `main`:

```powershell
git push origin main
# ✓ Triggers production deployment
```

### Preview Deployments

Every pull request gets a preview URL:
```powershell
git checkout -b feature/new-feature
git push origin feature/new-feature
# ✓ Creates preview deployment URL
```

### Manual Deploy

```powershell
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

---

## Post-Deployment Checklist

- [ ] Verify `www.axixos.com` loads correctly
- [ ] Test all pages and routes
- [ ] Verify Supabase connection works
- [ ] Test image generation API (60s timeout configured)
- [ ] Check all environment variables are set
- [ ] Test marketing landing page
- [ ] Verify navigation and branding show "AxixOS"
- [ ] Test CSV import functionality
- [ ] Check audit logs are working

---

## Monitoring

### Vercel Dashboard

- **Deployments**: Check build logs and status
- **Analytics**: Track pageviews and performance
- **Functions**: Monitor serverless function execution
- **Logs**: Real-time application logs

### Performance Settings

Your functions are configured with custom timeouts:

- `/api/generate-variant-image`: 60s (for AI image generation)
- `/api/generation-jobs/[jobId]`: 30s (for job status checks)

---

## Troubleshooting

### DNS Not Propagating

```powershell
# Check DNS propagation
nslookup www.axixos.com
nslookup axixos.com
```

Wait up to 48 hours for full propagation (usually much faster).

### Build Failures

1. Check Vercel build logs
2. Verify all environment variables are set
3. Test build locally: `npm run build`

### 404 Errors

- Ensure `next.config.ts` doesn't have conflicting rules
- Check Vercel rewrites/redirects configuration
- Verify all routes are properly generated

---

## Domain Email

Your email MX records are configured separately and won't be affected:
- ✅ Email continues to work via Secure Mailgate
- ✅ mail-in.axixos.com remains functional

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **DNS Issues**: Check EasyName control panel

---

**Last Updated**: March 12, 2026  
**Status**: Ready to deploy
