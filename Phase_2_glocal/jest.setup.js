// Polyfill for Next.js Request object in Jest environment (BUG-002)
// MUST be set up before any Next.js imports
// Node.js 18+ has fetch but Request might not be available in Jest
if (typeof globalThis.Request === 'undefined') {
  // Use undici if available (Next.js includes it)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require('undici')
    if (undici.Request && undici.Response && undici.Headers) {
      globalThis.Request = undici.Request
      globalThis.Response = undici.Response
      globalThis.Headers = undici.Headers
      // Ensure Response.json static method exists for NextResponse compatibility
      if (!globalThis.Response.json) {
        globalThis.Response.json = function (data, init) {
          return new globalThis.Response(JSON.stringify(data), {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              ...init?.headers,
            },
          })
        }
      }
    } else {
      throw new Error('undici not fully available')
    }
  } catch (e) {
    // Fallback: create minimal polyfill
    // Use Object.defineProperty to avoid conflicts with getter-only properties
    const RequestImpl = class Request {
      constructor(input, init) {
        const url = typeof input === 'string' ? input : input?.url || ''
        Object.defineProperty(this, 'url', { value: url, writable: false, enumerable: true })
        Object.defineProperty(this, 'method', {
          value: (init?.method || 'GET').toUpperCase(),
          writable: false,
          enumerable: true,
        })
        Object.defineProperty(this, 'headers', {
          value: new (globalThis.Headers || HeadersImpl)(init?.headers),
          writable: false,
          enumerable: true,
        })
        Object.defineProperty(this, 'body', {
          value: init?.body,
          writable: false,
          enumerable: true,
        })
        Object.defineProperty(this, 'bodyUsed', { value: false, writable: true, enumerable: true })
      }
      clone() {
        return new RequestImpl(this.url, {
          method: this.method,
          headers: this.headers,
          body: this.body,
        })
      }
    }
    const ResponseImpl = class Response {
      constructor(body, init) {
        Object.defineProperty(this, 'body', { value: body, writable: false, enumerable: true })
        Object.defineProperty(this, 'status', {
          value: init?.status || 200,
          writable: false,
          enumerable: true,
        })
        Object.defineProperty(this, 'statusText', {
          value: init?.statusText || 'OK',
          writable: false,
          enumerable: true,
        })
        Object.defineProperty(this, 'headers', {
          value: new (globalThis.Headers || HeadersImpl)(init?.headers),
          writable: false,
          enumerable: true,
        })
        Object.defineProperty(this, 'ok', {
          value: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
          writable: false,
          enumerable: true,
        })
      }
      json() {
        return Promise.resolve(JSON.parse(this.body || '{}'))
      }
      text() {
        return Promise.resolve(String(this.body || ''))
      }
      clone() {
        return new ResponseImpl(this.body, {
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
        })
      }
      static json(data, init) {
        return new ResponseImpl(JSON.stringify(data), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        })
      }
    }
    const HeadersImpl = class Headers {
      constructor(init) {
        this._headers = {}
        if (init) {
          if (init instanceof HeadersImpl) {
            // Copy from another Headers instance
            init.forEach((value, key) => {
              this._headers[key.toLowerCase()] = value
            })
          } else if (Array.isArray(init)) {
            init.forEach(([key, value]) => {
              this._headers[key.toLowerCase()] = value
            })
          } else {
            Object.entries(init).forEach(([key, value]) => {
              this._headers[key.toLowerCase()] = value
            })
          }
        }
      }
      get(name) {
        return this._headers[name.toLowerCase()] || null
      }
      set(name, value) {
        this._headers[name.toLowerCase()] = value
      }
      has(name) {
        return name.toLowerCase() in this._headers
      }
      forEach(callback) {
        Object.entries(this._headers).forEach(([key, value]) => {
          callback(value, key, this)
        })
      }
      entries() {
        return Object.entries(this._headers)[Symbol.iterator]()
      }
      keys() {
        return Object.keys(this._headers)[Symbol.iterator]()
      }
      values() {
        return Object.values(this._headers)[Symbol.iterator]()
      }
      [Symbol.iterator]() {
        return this.entries()
      }
    }
    globalThis.Request = RequestImpl
    globalThis.Response = ResponseImpl
    globalThis.Headers = HeadersImpl
  }
}

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Setup jest-axe for accessibility testing
import './__tests__/setup/jest-axe.setup'

// Mock Redis client for tests
jest.mock('@/lib/redis/client', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  }
  return {
    getRedisClient: jest.fn(() => mockRedis),
    isRedisAvailable: jest.fn().mockResolvedValue(true),
    closeRedisConnection: jest.fn().mockResolvedValue(undefined),
    RedisKeys: {
      rateLimit: jest.fn((id, action) => `rate_limit:${action}:${id}`),
      cache: {
        posts: jest.fn((id) => `cache:posts:${id}`),
        artists: jest.fn((id) => `cache:artists:${id}`),
        events: jest.fn((id) => `cache:events:${id}`),
        communities: jest.fn((id) => `cache:communities:${id}`),
        feed: jest.fn((userId, type) => `cache:feed:${userId}:${type}`),
      },
    },
  }
})

// Mock Razorpay for tests
jest.mock('@/lib/integrations/razorpay', () => {
  return {
    createOrder: jest.fn().mockResolvedValue({ id: 'order_test', amount: 1000 }),
    createSubscription: jest.fn().mockResolvedValue({ id: 'sub_test' }),
    getSubscription: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
    cancelSubscription: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'cancelled' }),
    pauseSubscription: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'paused' }),
    resumeSubscription: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
    getPayment: jest.fn().mockResolvedValue({ id: 'pay_test', status: 'captured' }),
    createPlan: jest.fn().mockResolvedValue({ id: 'plan_test' }),
    getPlans: jest.fn().mockResolvedValue([]),
  }
})

// Set test environment variables
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'test_key_id'
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_key_secret'
