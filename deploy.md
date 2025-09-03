# Deployment Guide

## Step-by-Step Deployment to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy the Project
```bash
# From the project directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name: framer-reverse-proxy (or your preferred name)
# - Directory: ./
```

### 4. Set Environment Variables
```bash
# Set your Framer site URL
vercel env add FRAMER_SITE_URL

# When prompted, enter your Framer site URL:
# Example: https://your-site.framer.website
```

### 5. Enable Blob Storage
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Storage tab
4. Click "Create Database"
5. Select "Blob"
6. Name it (e.g., "framer-cache")
7. Click "Create"

### 6. Test Your Deployment
1. Visit your Vercel domain
2. Add `?clear_cache=true` to force fresh content
3. Verify branding is removed
4. Check that all routes work

### 7. Custom Domain (Optional)
1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Configure DNS as instructed

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `FRAMER_SITE_URL` | Your Framer site URL | `https://your-site.framer.website` |

## Post-Deployment Checklist

- [ ] Environment variables set correctly
- [ ] Blob storage enabled
- [ ] Custom domain configured (if needed)
- [ ] Test main page loads
- [ ] Test sub-routes work
- [ ] Verify branding removal
- [ ] Test cache functionality
- [ ] Test cache clearing

## Monitoring

After deployment, monitor:
- Vercel function logs
- Blob storage usage
- Response times
- Cache hit rates

## Troubleshooting

### Common Deployment Issues

1. **Build Errors**: Ensure Node.js version is 18+
2. **Environment Variables**: Double-check `FRAMER_SITE_URL` format
3. **Blob Storage**: Must be enabled before first use
4. **Domain Issues**: Check DNS configuration

### Testing Commands

```bash
# Test cache clearing
curl "https://your-domain.vercel.app/?clear_cache=true"

# Test specific route
curl "https://your-domain.vercel.app/about"

# Check headers
curl -I "https://your-domain.vercel.app/"
```
