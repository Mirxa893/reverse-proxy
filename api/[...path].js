import { put, head } from '@vercel/blob';
import fetch from 'node-fetch';

// Cache duration: 7 days in milliseconds
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// Your Framer site URL
const FRAMER_SITE_URL = process.env.FRAMER_SITE_URL || 'https://your-framer-site.framer.website';

// Function to remove ONLY Framer branding - MINIMAL APPROACH
function removeFramerBranding(content, contentType) {
  if (!contentType || !contentType.includes('text/html')) {
    return content;
  }

  console.log('Removing Framer branding only...');
  let modifiedContent = content;

  // Remove specific Framer branding text with more comprehensive patterns
  const brandingPatterns = [
    /Made in Framer/gi,
    /Made In Framer/gi,
    /MADE IN FRAMER/gi,
    /Built with Framer/gi,
    /Built With Framer/gi,
    /BUILT WITH FRAMER/gi,
    /the website builder loved by startups, designers and agencies/gi,
    /<[^>]*>Made in Framer<\/[^>]*>/gi,
    /<[^>]*>Built with Framer<\/[^>]*>/gi
  ];

  brandingPatterns.forEach(pattern => {
    modifiedContent = modifiedContent.replace(pattern, '');
  });

  // Add CSS to hide the complete Framer branding element
  modifiedContent = modifiedContent.replace(
    '</head>',
    `<style>
      /* Hide the complete Framer branding element */
      .framer-6jWyo[data-framer-name="Light"],
      .framer-6jWyo[href="https://www.framer.com"],
      [class*="framer-"][data-framer-name="Light"][href*="framer.com"],
      [class*="__framer-badge__"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
      }
      
      /* Hide the backdrop element */
      .framer-13yxzio[data-framer-name="Backdrop"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
      }
      
      /* Hide elements with exact combination of Framer class and Backdrop data attribute */
      [class*="framer-"][data-framer-name="Backdrop"][style*="background-color: rgb(255, 255, 255)"][style*="border-radius: 10px"] {
        display: none !important;
      }
    </style></head>`
  );

  return modifiedContent;
}

// Function to generate cache key
function generateCacheKey(path, query) {
  const queryString = query ? `?${new URLSearchParams(query).toString()}` : '';
  return `framer-cache:${path}${queryString}`;
}

// Function to check if cache is valid
function isCacheValid(cacheTime) {
  return Date.now() - cacheTime < CACHE_DURATION;
}

export default async function handler(req, res) {
  try {
    // DEBUG: Show the actual HTML content
    if (req.query.debug === 'true') {
      const baseUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
      const response = await fetch(baseUrl);
      const content = await response.text();
      
      return res.status(200).send(`
        <html>
          <body>
            <h1>DEBUG: Raw HTML from Framer</h1>
            <h3>Original Content Length: ${content.length}</h3>
            <h3>Contains "Framer": ${content.includes('Framer')}</h3>
            <h3>Contains "Made in": ${content.includes('Made in')}</h3>
            <h3>Contains "Built with": ${content.includes('Built with')}</h3>
            <textarea style="width:100%;height:500px;">${content}</textarea>
          </body>
        </html>
      `);
    }

    // FORMS: Always fetch fresh for POST requests (form submissions)
    if (req.method === 'POST') {
      console.log('Form submission detected - bypassing cache');
      
      const baseUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
      const pathParam = req.query['...path'];
      const { '...path': _, clear_cache, ...queryParams } = req.query;
      const fullPath = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '');
      const queryString = new URLSearchParams(queryParams).toString();
      const pathPart = fullPath ? `/${fullPath}` : '';
      const targetUrl = `${baseUrl}${pathPart}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        },
        body: req.body
      });

      const contentType = response.headers.get('content-type') || 'text/html';
      const content = await response.text();
      
      // Remove branding from form response
      const cleanContent = removeFramerBranding(content, contentType);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Cache-Status', 'BYPASSED_FOR_FORM');
      
      return res.status(response.status).send(cleanContent);
    }
    
    // Handle the case where the path is undefined (root path)
    const pathParam = req.query['...path'];
    const { '...path': _, clear_cache, ...queryParams } = req.query;
    const fullPath = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '');
    const queryString = new URLSearchParams(queryParams).toString();
    const cacheKey = generateCacheKey(fullPath, queryParams);
    
    console.log(`Processing request: ${req.method} ${req.url}`);
    console.log(`Path param: "${pathParam}"`);
    console.log(`Full path: "${fullPath}"`);
    console.log(`Query string: "${queryString}"`);

    // Check for manual cache clear
    if (req.query.clear_cache === 'true') {
      try {
        console.log('Cache clear requested - fetching fresh content immediately');

        const baseUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
        const pathPart = fullPath ? `/${fullPath}` : '';
        const targetUrl = `${baseUrl}${pathPart}${queryString ? `?${queryString}` : ''}`;

        console.log('Fetching fresh content from:', targetUrl);

        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
          },
        });

        if (!response.ok) {
          return res.status(response.status).send(`Error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'text/html';
        const content = await response.text();

        // Remove ONLY Framer branding
        const cleanContent = removeFramerBranding(content, contentType);

        // Update cache with fresh content
        try {
          await put(cacheKey, cleanContent, {
            access: 'public',
            contentType: contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
          });
          console.log('Fresh content cached with key:', cacheKey);
        } catch (cacheError) {
          console.error('Failed to cache fresh content:', cacheError);
        }

        // Set response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
        res.setHeader('X-Cache-Status', 'CLEARED_AND_UPDATED');
        res.setHeader('X-Cache-Timestamp', new Date().toISOString());

        return res.status(200).send(cleanContent);
      } catch (error) {
        console.error('Cache clear error:', error);
        return res.status(500).json({ error: 'Failed to clear cache' });
      }
    }

    // Try to get from cache first
    try {
      const { blobs } = await head(cacheKey);
      if (blobs && blobs.length > 0) {
        const cachedBlob = blobs[0];
        const cacheTime = new Date(cachedBlob.uploadedAt).getTime();
        
        if (isCacheValid(cacheTime)) {
          // Serve from cache
          const response = await fetch(cachedBlob.url);
          const cachedContent = await response.text();
          const contentType = response.headers.get('content-type') || 'text/html';
          
          // Apply branding removal to cached content as well
          const cleanCachedContent = removeFramerBranding(cachedContent, contentType);
          
          // Set appropriate headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
          res.setHeader('X-Cache-Status', 'HIT');
          res.setHeader('X-Cache-Timestamp', cachedBlob.uploadedAt);
          
          return res.status(200).send(cleanCachedContent);
        }
      }
    } catch (cacheError) {
      console.log('Cache miss or error:', cacheError.message);
    }

    // Fetch from Framer site
    const baseUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
    const pathPart = fullPath ? `/${fullPath}` : '';
    const targetUrl = `${baseUrl}${pathPart}${queryString ? `?${queryString}` : ''}`;
    console.log('Fetching from:', targetUrl);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (compatible; FramerProxy/1.0)',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Disable compression to avoid decoding issues
        'Cache-Control': req.headers['cache-control'] || 'no-cache',
        'Pragma': req.headers['pragma'] || 'no-cache',
        ...(req.headers['referer'] && { 'Referer': req.headers['referer'] }),
        ...(req.headers['origin'] && { 'Origin': req.headers['origin'] }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    if (!response.ok) {
      console.error(`Failed to fetch from Framer site: ${response.status} ${response.statusText}`);
      console.error(`Target URL: ${targetUrl}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch from Framer site',
        status: response.status,
        statusText: response.statusText,
        targetUrl: targetUrl
      });
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    const content = await response.text();
    
    console.log(`Fetched content length: ${content.length}`);

    // Remove ONLY Framer branding - nothing else
    const cleanContent = removeFramerBranding(content, contentType);
    
    console.log(`After branding removal: ${cleanContent.length}`);

    // Cache the clean content
    try {
      await put(cacheKey, cleanContent, {
        access: 'public',
        contentType: contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      console.log('Content cached with key:', cacheKey);
    } catch (cacheError) {
      console.error('Failed to cache content:', cacheError);
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    res.setHeader('X-Cache-Status', 'MISS');
    res.setHeader('X-Cache-Timestamp', new Date().toISOString());

    // Copy important headers from the original response
    const headersToCopy = [
      'content-encoding',
      'content-length',
      'last-modified',
      'etag',
      'vary',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
    ];

    headersToCopy.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    return res.status(response.status).send(cleanContent);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};