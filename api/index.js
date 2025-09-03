import { put, head } from '@vercel/blob';
import fetch from 'node-fetch';

// Cache duration: 7 days in milliseconds
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// Your Framer site URL
const FRAMER_SITE_URL = process.env.FRAMER_SITE_URL || 'https://your-framer-site.framer.website';

// Function to generate domain-aware cache key
function generateDomainAwareCacheKey(path, framerDomain, incomingDomain) {
  const framerDomainHash = framerDomain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const incomingDomainHash = incomingDomain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `framer-cache:${framerDomainHash}:${incomingDomainHash}:${path}`;
}

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

export default async function handler(req, res) {
  try {
    // DEBUG mode
    if (req.query.debug === 'true') {
      const targetUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
      const response = await fetch(targetUrl);
      const content = await response.text();
      
      return res.status(200).send(`
        <html>
          <body>
            <h1>DEBUG: Raw HTML from Framer</h1>
            <textarea style="width:100%;height:500px;">${content}</textarea>
          </body>
        </html>
      `);
    }

    // FORMS: Always fetch fresh for POST requests (form submissions)
    if (req.method === 'POST') {
      console.log('Form submission detected - bypassing cache');
      const targetUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
      
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
    
    // TEST mode
    if (req.query.test === 'true') {
      return res.status(200).send(`
        <html>
          <body>
            <h1 style="color: red; font-size: 50px;">PROXY HANDLER IS WORKING!</h1>
            <p>Method: ${req.method}</p>
            <p>URL: ${req.url}</p>
          </body>
        </html>
      `);
    }
    
    // Get the incoming domain from request headers
    const incomingDomain = req.headers.host || 'unknown';
    // Create domain-aware cache key
    const cacheKey = generateDomainAwareCacheKey('root', FRAMER_SITE_URL, incomingDomain);
    
    console.log(`Processing request: ${req.method} ${req.url}`);
    console.log(`Incoming domain: "${incomingDomain}"`);
    console.log(`Framer domain: "${FRAMER_SITE_URL}"`);
    console.log(`Cache key: "${cacheKey}"`);

    // Manual cache clear
    if (req.query.clear_cache === 'true') {
      console.log('Cache clear requested - fetching fresh content');
      
      const targetUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'text/html';
      const content = await response.text();
      
      // Remove ONLY Framer branding
      const cleanContent = removeFramerBranding(content, contentType);

      // Cache the clean content
      try {
        await put(cacheKey, cleanContent, {
          access: 'public',
          contentType: contentType,
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        console.log('Fresh content cached');
      } catch (cacheError) {
        console.error('Failed to cache:', cacheError);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('X-Cache-Status', 'CLEARED_AND_UPDATED');

      return res.status(200).send(cleanContent);
    }

    // Try cache first
    try {
      const { blobs } = await head(cacheKey);
      if (blobs && blobs.length > 0) {
        const cachedBlob = blobs[0];
        const cacheTime = new Date(cachedBlob.uploadedAt).getTime();
        
        if (Date.now() - cacheTime < CACHE_DURATION) {
          const response = await fetch(cachedBlob.url);
          const cachedContent = await response.text();
          const contentType = response.headers.get('content-type') || 'text/html';
          
          // Apply branding removal to cached content as well
          const cleanCachedContent = removeFramerBranding(cachedContent, contentType);
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=604800');
          res.setHeader('X-Cache-Status', 'HIT');
          
          return res.status(200).send(cleanCachedContent);
        }
      }
    } catch (cacheError) {
      console.log('Cache miss:', cacheError.message);
    }

    // Fetch from Framer
    const targetUrl = FRAMER_SITE_URL.endsWith('/') ? FRAMER_SITE_URL.slice(0, -1) : FRAMER_SITE_URL;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
      return res.status(response.status).send(`Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    const content = await response.text();
    
    console.log(`Fetched content length: ${content.length}`);

    // Remove ONLY Framer branding - nothing else
    const cleanContent = removeFramerBranding(content, contentType);
    
    console.log(`After branding removal: ${cleanContent.length}`);

    // Cache the result
    try {
      await put(cacheKey, cleanContent, {
        access: 'public',
        contentType: contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      console.log('Content cached successfully');
    } catch (cacheError) {
      console.error('Failed to cache:', cacheError);
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('X-Cache-Status', 'MISS');

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
