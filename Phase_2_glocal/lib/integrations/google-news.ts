/**
 * Google News API Integration
 * Uses NewsAPI.org for fetching local news articles
 * Docs: https://newsapi.org/docs
 */

export interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  imageUrl?: string
  source: string
  publishedAt: string
  author?: string
  content?: string
}

interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: Array<{
    source: { id: string | null; name: string }
    author: string | null
    title: string
    description: string | null
    url: string
    urlToImage: string | null
    publishedAt: string
    content: string | null
  }>
}

/**
 * Fetch local news by location
 * @param location City or country name (e.g., "Mumbai", "India")
 * @param limit Number of articles to fetch (default: 10)
 * @returns Array of news articles
 */
export async function fetchLocalNews(location: string, limit: number = 10): Promise<NewsArticle[]> {
  const apiKey = process.env.GOOGLE_NEWS_API_KEY

  if (!apiKey) {
    console.warn('Google News API key not configured')
    return []
  }

  try {
    // Build query: location-based search
    const query = encodeURIComponent(location)
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=${limit}&apiKey=${apiKey}`

    const response = await fetch(url, {
      next: { revalidate: 900 }, // Cache for 15 minutes
    })

    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`)
    }

    const data: NewsAPIResponse = await response.json()

    if (data.status !== 'ok') {
      throw new Error('News API returned error status')
    }

    // Transform to unified format
    return data.articles
      .filter((article) => article.title && article.url)
      .map((article, index) => ({
        id: `news-${Date.now()}-${index}`,
        title: article.title,
        description: article.description || '',
        url: article.url,
        imageUrl: article.urlToImage || undefined,
        source: article.source.name,
        publishedAt: article.publishedAt,
        author: article.author || undefined,
        content: article.content || undefined,
      }))
  } catch (error) {
    console.error('Google News API error:', error)
    return []
  }
}

/**
 * Fetch top headlines by country
 * @param country Country code (e.g., "in" for India, "us" for USA)
 * @param category Category (e.g., "general", "business", "technology")
 * @param limit Number of articles to fetch
 */
export async function fetchTopHeadlines(
  country: string = 'in',
  category: string = 'general',
  limit: number = 10
): Promise<NewsArticle[]> {
  const apiKey = process.env.GOOGLE_NEWS_API_KEY

  if (!apiKey) {
    console.warn('Google News API key not configured')
    return []
  }

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${limit}&apiKey=${apiKey}`

    const response = await fetch(url, {
      next: { revalidate: 900 }, // Cache for 15 minutes
    })

    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`)
    }

    const data: NewsAPIResponse = await response.json()

    if (data.status !== 'ok') {
      throw new Error('News API returned error status')
    }

    return data.articles
      .filter((article) => article.title && article.url)
      .map((article, index) => ({
        id: `news-${Date.now()}-${index}`,
        title: article.title,
        description: article.description || '',
        url: article.url,
        imageUrl: article.urlToImage || undefined,
        source: article.source.name,
        publishedAt: article.publishedAt,
        author: article.author || undefined,
      }))
  } catch (error) {
    console.error('Google News API error:', error)
    return []
  }
}
