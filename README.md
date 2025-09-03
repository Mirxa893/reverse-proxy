# Framer Reverse Proxy

A professional reverse proxy for Framer sites that removes "Built with Framer" branding, implements intelligent caching, and provides seamless deployment on Vercel.

## Features

- ✅ **Branding Removal**: Automatically removes "Built with Framer" text, links, and watermarks
- ✅ **7-Day Caching**: Intelligent caching using Vercel Blob storage with 7-day TTL
- ✅ **Route Handling**: Supports all routes and sub-routes from your Framer site
- ✅ **Dynamic Content**: Preserves all dynamic functionality and interactions
- ✅ **Manual Cache Control**: Clear cache manually when needed
- ✅ **Vercel Optimized**: Built specifically for Vercel deployment
- ✅ **No Tokens Required**: Uses Vercel's automatic blob storage configuration

## Quick Setup

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy the project
vercel

# Set your Framer site URL
vercel env add FRAMER_SITE_URL
```

### 2. Configure Environment Variables

In your Vercel dashboard, add the following environment variable:

- `FRAMER_SITE_URL`: Your Framer site URL (e.g., `https://your-site.framer.website`)

### 3. Enable Blob Storage

1. Go to your Vercel project dashboard
2. Navigate to Storage tab
3. Create a new Blob database
4. The proxy will automatically use it (no configuration needed)

## How It Works

### Caching Strategy
- **Cache Duration**: 7 days (604,800 seconds)
- **Storage**: Vercel Blob storage (automatic)
- **Cache Key**: Based on path and query parameters
- **Cache Headers**: Proper cache-control headers for optimal performance

### Branding Removal
The proxy automatically removes:
- "Built with Framer" text and links
- Framer attribution in meta tags
- Framer watermark CSS
- Framer branding scripts

### Route Handling
- **All Routes**: Supports any path from your Framer site
- **Sub-routes**: Handles nested paths correctly
- **Query Parameters**: Preserves all URL parameters
- **HTTP Methods**: Supports GET, POST, PUT, DELETE, etc.

## Manual Cache Management

### Clear Cache
To force fresh content from your Framer site:

```
https://your-proxy-domain.vercel.app/any-path?clear_cache=true
```

This will bypass the cache and fetch fresh content from your Framer site.

### Cache Status
The proxy adds helpful headers:
- `X-Cache-Status`: HIT or MISS
- `X-Cache-Timestamp`: When content was cached
- `Cache-Control`: 7-day cache duration

## API Endpoints

### Main Proxy
```
GET /api/[...path]
```
Proxies all requests to your Framer site with caching and branding removal.

### Cache Management
```
GET /api/[...path]?clear_cache=true
```
Forces fresh content fetch and cache update.

## Performance Benefits

1. **Reduced Load**: Only 1 request to Framer per 7 days per unique path
2. **Faster Response**: Cached content serves instantly
3. **Bandwidth Savings**: Reduced data transfer from Framer
4. **Better SEO**: Faster page loads improve search rankings
5. **Cost Effective**: Minimizes Framer bandwidth usage

## Security Features

- Content-Type validation
- XSS protection headers
- CSRF protection
- Secure headers configuration
- Input sanitization

## Monitoring

The proxy logs:
- Cache hits and misses
- Fetch operations
- Error conditions
- Performance metrics

Check your Vercel function logs for detailed monitoring.

## Troubleshooting

### Common Issues

1. **404 Errors**: Ensure your `FRAMER_SITE_URL` is correct
2. **Cache Issues**: Use `?clear_cache=true` to force refresh
3. **Slow Loading**: Check Vercel function logs for errors
4. **Missing Content**: Verify the original Framer site is accessible

### Debug Mode

Add `?debug=true` to any URL to see additional logging information.

## Customization

### Modify Cache Duration
Edit the `CACHE_DURATION` constant in `api/[...path].js`:

```javascript
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### Add Custom Branding Removal
Extend the `removeFramerBranding` function to remove additional elements.

### Custom Headers
Modify the `headersToCopy` array to include additional headers from the original response.

## Support

For issues or questions:
1. Check Vercel function logs
2. Verify environment variables
3. Test with `?clear_cache=true`
4. Ensure Framer site is accessible

## License

MIT License - Feel free to modify and use for your projects.
