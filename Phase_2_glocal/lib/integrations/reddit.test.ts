import { fetchLocalRedditPosts, fetchMultipleSubreddits } from './reddit'

// Mock global fetch
global.fetch = jest.fn()

describe('Reddit API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchLocalRedditPosts', () => {
    it('should fetch posts from location-based subreddit', async () => {
      const mockResponse = {
        kind: 'Listing',
        data: {
          children: [
            {
              kind: 't3',
              data: {
                id: 'abc123',
                title: 'Test Reddit Post',
                selftext: 'This is a test post',
                url: 'https://reddit.com/r/test/comments/abc123',
                subreddit: 'test',
                author: 'testuser',
                ups: 100,
                num_comments: 20,
                created_utc: 1704067200,
                stickied: false,
                thumbnail: 'https://example.com/thumb.jpg',
                permalink: '/r/test/comments/abc123/test',
              },
            },
          ],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const posts = await fetchLocalRedditPosts('Mumbai', 10)

      expect(posts).toHaveLength(1)
      expect(posts[0].title).toBe('Test Reddit Post')
      expect(posts[0].subreddit).toBe('test')
      expect(posts[0].upvotes).toBe(100)
      expect(posts[0].comments).toBe(20)
    })

    it('should map location to correct subreddits', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { children: [] } }),
      })

      await fetchLocalRedditPosts('Mumbai')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/r/mumbai/hot.json'),
        expect.any(Object)
      )
    })

    it('should filter out stickied posts', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: '1',
                title: 'Regular Post',
                selftext: 'Content',
                url: 'https://reddit.com/1',
                subreddit: 'test',
                author: 'user',
                ups: 50,
                num_comments: 10,
                created_utc: 1704067200,
                stickied: false,
                permalink: '/r/test/1',
              },
            },
            {
              data: {
                id: '2',
                title: 'Stickied Post',
                selftext: 'Announcement',
                url: 'https://reddit.com/2',
                subreddit: 'test',
                author: 'mod',
                ups: 100,
                num_comments: 50,
                created_utc: 1704067200,
                stickied: true,
                permalink: '/r/test/2',
              },
            },
          ],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const posts = await fetchLocalRedditPosts('test')

      expect(posts).toHaveLength(1)
      expect(posts[0].title).toBe('Regular Post')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
      })

      const posts = await fetchLocalRedditPosts('Mumbai')

      expect(posts).toEqual([])
    })

    it('should extract image from preview', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: '1',
                title: 'Post with Image',
                selftext: '',
                url: 'https://reddit.com/1',
                subreddit: 'test',
                author: 'user',
                ups: 50,
                num_comments: 10,
                created_utc: 1704067200,
                permalink: '/1',
                preview: {
                  images: [
                    {
                      source: {
                        url: 'https://example.com/image.jpg',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const posts = await fetchLocalRedditPosts('test')

      expect(posts[0].imageUrl).toBe('https://example.com/image.jpg')
    })
  })

  describe('fetchMultipleSubreddits', () => {
    it('should fetch from multiple subreddits', async () => {
      const mockResponse1 = {
        data: {
          children: [
            {
              data: {
                id: '1',
                title: 'Post 1',
                selftext: '',
                url: 'https://reddit.com/1',
                subreddit: 'sub1',
                author: 'user1',
                ups: 100,
                num_comments: 10,
                created_utc: 1704067200,
                permalink: '/1',
              },
            },
          ],
        },
      }

      const mockResponse2 = {
        data: {
          children: [
            {
              data: {
                id: '2',
                title: 'Post 2',
                selftext: '',
                url: 'https://reddit.com/2',
                subreddit: 'sub2',
                author: 'user2',
                ups: 50,
                num_comments: 5,
                created_utc: 1704067200,
                permalink: '/2',
              },
            },
          ],
        },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        })

      const posts = await fetchMultipleSubreddits(['sub1', 'sub2'], 10)

      expect(posts).toHaveLength(2)
      expect(posts[0].subreddit).toBe('sub1')
      expect(posts[1].subreddit).toBe('sub2')
    })

    it('should sort by upvotes', async () => {
      const mockResponses = [
        {
          data: {
            children: [
              {
                data: {
                  id: '1',
                  title: 'Low Upvotes',
                  selftext: '',
                  url: 'https://reddit.com/1',
                  subreddit: 'test',
                  author: 'user',
                  ups: 10,
                  num_comments: 5,
                  created_utc: 1704067200,
                  permalink: '/1',
                },
              },
            ],
          },
        },
        {
          data: {
            children: [
              {
                data: {
                  id: '2',
                  title: 'High Upvotes',
                  selftext: '',
                  url: 'https://reddit.com/2',
                  subreddit: 'test',
                  author: 'user',
                  ups: 1000,
                  num_comments: 100,
                  created_utc: 1704067200,
                  permalink: '/2',
                },
              },
            ],
          },
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[1] })

      const posts = await fetchMultipleSubreddits(['sub1', 'sub2'], 10)

      expect(posts[0].upvotes).toBeGreaterThan(posts[1].upvotes)
      expect(posts[0].title).toBe('High Upvotes')
    })
  })
})
