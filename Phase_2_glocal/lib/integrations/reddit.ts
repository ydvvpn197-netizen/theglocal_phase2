/**
 * Reddit API Integration
 * Fetches trending posts from location-based subreddits
 * Uses public Reddit JSON API (no auth required)
 */

export interface RedditPost {
  id: string
  title: string
  description: string
  url: string
  subreddit: string
  author: string
  upvotes: number
  comments: number
  publishedAt: string
  imageUrl?: string
  permalink: string
}

interface RedditAPIResponse {
  kind: string
  data: {
    children: Array<{
      kind: string
      data: {
        id: string
        title: string
        selftext: string
        url: string
        subreddit: string
        author: string
        ups: number
        num_comments: number
        created_utc: number
        stickied?: boolean
        thumbnail?: string
        preview?: {
          images: Array<{
            source: { url: string }
          }>
        }
        permalink: string
      }
    }>
  }
}

// Location-to-subreddit mapping
const LOCATION_SUBREDDITS: Record<string, string[]> = {
  mumbai: ['mumbai', 'india'],
  delhi: ['delhi', 'india'],
  bangalore: ['bangalore', 'india'],
  'san francisco': ['sanfrancisco', 'bayarea'],
  'new york': ['nyc', 'newyork'],
  london: ['london', 'unitedkingdom'],
  default: ['all', 'news', 'worldnews'],
}

/**
 * Get subreddits for a given location
 */
function getSubredditsForLocation(location: string): string[] {
  const normalizedLocation = location.toLowerCase()
  return LOCATION_SUBREDDITS[normalizedLocation] || LOCATION_SUBREDDITS.default || []
}

/**
 * Fetch trending posts from local subreddits
 * @param location City name (e.g., "Mumbai", "San Francisco")
 * @param limit Number of posts to fetch
 * @returns Array of Reddit posts
 */
export async function fetchLocalRedditPosts(
  location: string,
  limit: number = 10
): Promise<RedditPost[]> {
  const subreddits = getSubredditsForLocation(location)

  try {
    // Fetch from first available subreddit
    const subreddit = subreddits[0]
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Theglocal/1.0',
      },
      next: { revalidate: 900 }, // Cache for 15 minutes
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data: RedditAPIResponse = await response.json()

    // Transform to unified format
    return data.data.children
      .filter((child) => child.data.title && !child.data.stickied)
      .map((child) => {
        const post = child.data

        // Get image URL from preview or thumbnail
        let imageUrl: string | undefined
        if (post.preview?.images?.[0]?.source?.url) {
          imageUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&')
        } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
          imageUrl = post.thumbnail
        }

        return {
          id: `reddit-${post.id}`,
          title: post.title,
          description: post.selftext.slice(0, 300),
          url: `https://reddit.com${post.permalink}`,
          subreddit: post.subreddit,
          author: post.author,
          upvotes: post.ups,
          comments: post.num_comments,
          publishedAt: new Date(post.created_utc * 1000).toISOString(),
          imageUrl,
          permalink: post.permalink,
        }
      })
      .slice(0, limit)
  } catch (error) {
    console.error('Reddit API error:', error)
    return []
  }
}

/**
 * Fetch posts from multiple subreddits
 * @param subreddits Array of subreddit names
 * @param limit Total number of posts to return
 */
export async function fetchMultipleSubreddits(
  subreddits: string[],
  limit: number = 10
): Promise<RedditPost[]> {
  const postsPerSubreddit = Math.ceil(limit / subreddits.length)

  try {
    const promises = subreddits.map(async (subreddit) => {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${postsPerSubreddit}`

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Theglocal/1.0' },
        next: { revalidate: 900 },
      })

      if (!response.ok) return []

      const data: RedditAPIResponse = await response.json()

      return data.data.children
        .filter((child) => child.data.title && !child.data.stickied)
        .map((child) => {
          const post = child.data
          let imageUrl: string | undefined
          if (post.preview?.images?.[0]?.source?.url) {
            imageUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&')
          } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
            imageUrl = post.thumbnail
          }

          return {
            id: `reddit-${post.id}`,
            title: post.title,
            description: post.selftext.slice(0, 300),
            url: `https://reddit.com${post.permalink}`,
            subreddit: post.subreddit,
            author: post.author,
            upvotes: post.ups,
            comments: post.num_comments,
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
            imageUrl,
            permalink: post.permalink,
          }
        })
    })

    const results = await Promise.all(promises)
    const allPosts = results.flat()

    // Sort by upvotes and return top N
    return allPosts.sort((a, b) => b.upvotes - a.upvotes).slice(0, limit)
  } catch (error) {
    console.error('Reddit API error:', error)
    return []
  }
}
