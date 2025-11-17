import { fetchLocalNews, fetchTopHeadlines } from './google-news'

// Mock global fetch
global.fetch = jest.fn()

describe('Google News API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_NEWS_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_NEWS_API_KEY
  })

  describe('fetchLocalNews', () => {
    it('should fetch news articles for a location', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 2,
        articles: [
          {
            source: { id: null, name: 'Test Source' },
            author: 'Test Author',
            title: 'Test Article 1',
            description: 'Test description 1',
            url: 'https://example.com/article1',
            urlToImage: 'https://example.com/image1.jpg',
            publishedAt: '2025-01-01T00:00:00Z',
            content: 'Test content 1',
          },
          {
            source: { id: null, name: 'Test Source 2' },
            author: null,
            title: 'Test Article 2',
            description: 'Test description 2',
            url: 'https://example.com/article2',
            urlToImage: null,
            publishedAt: '2025-01-01T01:00:00Z',
            content: null,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const articles = await fetchLocalNews('Mumbai', 10)

      expect(articles).toHaveLength(2)
      expect(articles[0]?.title).toBe('Test Article 1')
      expect(articles[0]?.source).toBe('Test Source')
      expect(articles[1]?.imageUrl).toBeUndefined()
    })

    it('should return empty array when API key is missing', async () => {
      delete process.env.GOOGLE_NEWS_API_KEY

      const articles = await fetchLocalNews('Mumbai')

      expect(articles).toEqual([])
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const articles = await fetchLocalNews('Mumbai')

      expect(articles).toEqual([])
    })

    it('should filter out articles without title or URL', async () => {
      const mockResponse = {
        status: 'ok',
        articles: [
          {
            source: { name: 'Source' },
            title: '',
            url: 'https://example.com',
            publishedAt: '2025-01-01T00:00:00Z',
          },
          {
            source: { name: 'Source' },
            title: 'Valid Title',
            url: '',
            publishedAt: '2025-01-01T00:00:00Z',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const articles = await fetchLocalNews('Mumbai')

      expect(articles).toEqual([])
    })
  })

  describe('fetchTopHeadlines', () => {
    it('should fetch top headlines by country', async () => {
      const mockResponse = {
        status: 'ok',
        articles: [
          {
            source: { name: 'News Source' },
            title: 'Breaking News',
            description: 'Important story',
            url: 'https://example.com/news',
            publishedAt: '2025-01-01T00:00:00Z',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const articles = await fetchTopHeadlines('in', 'general', 10)

      expect(articles).toHaveLength(1)
      expect(articles[0]?.title).toBe('Breaking News')
    })

    it('should use default parameters', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', articles: [] }),
      })

      await fetchTopHeadlines()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('country=in'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=general'),
        expect.any(Object)
      )
    })
  })
})
