/**
 * Web Scraper Configuration
 *
 * Ethical scraping guidelines and configuration for event platforms
 */

export const SCRAPER_CONFIG = {
  rateLimit: {
    requestsPerSecond: 0.5, // 1 request per 2 seconds
    concurrent: 1, // No parallel requests
    retryDelay: 5000, // 5 seconds between retries
  },

  userAgent: 'TheGlocalBot/1.0 (+https://theglocal.in/bot)',

  timeout: 15000, // 15 seconds

  retries: 2,

  respectRobotsTxt: true,

  cacheExpiry: 3600, // 1 hour cache in seconds

  headers: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    DNT: '1',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
}

export const PLATFORM_CONFIGS = {
  'paytm-insider': {
    baseUrl: 'https://insider.in',
    rateLimit: 0.5, // 1 request per 2 seconds
    timeout: 15000,
  },
  townscript: {
    baseUrl: 'https://www.townscript.com',
    rateLimit: 0.5,
    timeout: 15000,
  },
  explara: {
    baseUrl: 'https://www.explara.com',
    rateLimit: 0.5,
    timeout: 15000,
  },
}

/**
 * City mappings for different platforms
 */
export const CITY_MAPPINGS = {
  'paytm-insider': {
    Mumbai: 'mumbai',
    Delhi: 'delhi',
    Bengaluru: 'bangalore',
    Bangalore: 'bangalore',
    Hyderabad: 'hyderabad',
    Pune: 'pune',
    Chennai: 'chennai',
    Kolkata: 'kolkata',
    Goa: 'goa',
    Ahmedabad: 'ahmedabad',
    Jaipur: 'jaipur',
    Chandigarh: 'chandigarh',
  },
  townscript: {
    Mumbai: 'mumbai',
    Delhi: 'delhi',
    Bengaluru: 'bengaluru',
    Bangalore: 'bengaluru',
    Hyderabad: 'hyderabad',
    Pune: 'pune',
    Chennai: 'chennai',
    Kolkata: 'kolkata',
  },
  explara: {
    Mumbai: 'Mumbai',
    Delhi: 'Delhi',
    Bengaluru: 'Bangalore',
    Bangalore: 'Bangalore',
    Hyderabad: 'Hyderabad',
    Pune: 'Pune',
    Chennai: 'Chennai',
    Kolkata: 'Kolkata',
  },
}
