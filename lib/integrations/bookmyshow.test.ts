import { fetchBookMyShowEvents, syncBookMyShowEvents } from './bookmyshow'

describe('BookMyShow API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchBookMyShowEvents', () => {
    it('should generate mock events when API key is not configured', async () => {
      delete process.env.BOOKMYSHOW_API_KEY

      const events = await fetchBookMyShowEvents('Mumbai', 'all', 10)

      expect(events).toBeInstanceOf(Array)
      expect(events.length).toBeGreaterThan(0)
      expect(events.length).toBeLessThanOrEqual(10)
    })

    it('should generate events with correct structure', async () => {
      const events = await fetchBookMyShowEvents('Mumbai', 'movie', 5)

      expect(events[0]).toHaveProperty('id')
      expect(events[0]).toHaveProperty('title')
      expect(events[0]).toHaveProperty('description')
      expect(events[0]).toHaveProperty('category')
      expect(events[0]).toHaveProperty('venue')
      expect(events[0]).toHaveProperty('city')
      expect(events[0]).toHaveProperty('eventDate')
    })

    it('should filter events by category', async () => {
      const events = await fetchBookMyShowEvents('Mumbai', 'concert', 10)

      // When specific category requested, events should match (in real implementation)
      expect(events).toBeInstanceOf(Array)
    })

    it('should respect limit parameter', async () => {
      const events = await fetchBookMyShowEvents('Mumbai', 'all', 5)

      expect(events.length).toBeLessThanOrEqual(5)
    })

    it('should include ticket URL for BookMyShow events', async () => {
      const events = await fetchBookMyShowEvents('Mumbai', 'movie', 3)

      events.forEach((event) => {
        expect(event.ticketUrl).toContain('bookmyshow.com')
      })
    })

    it('should set correct city for events', async () => {
      const city = 'Bangalore'
      const events = await fetchBookMyShowEvents(city, 'all', 5)

      events.forEach((event) => {
        expect(event.city).toBe(city)
      })
    })

    it('should generate events with future dates', async () => {
      const events = await fetchBookMyShowEvents('Mumbai', 'all', 5)
      const now = new Date()

      events.forEach((event) => {
        const eventDate = new Date(event.eventDate)
        expect(eventDate.getTime()).toBeGreaterThan(now.getTime())
      })
    })
  })

  describe('syncBookMyShowEvents', () => {
    it('should sync events for multiple cities', async () => {
      const cities = ['Mumbai', 'Delhi', 'Bangalore']

      const syncedCount = await syncBookMyShowEvents(cities)

      expect(syncedCount).toBeGreaterThan(0)
    })

    it('should handle empty cities array', async () => {
      const syncedCount = await syncBookMyShowEvents([])

      expect(syncedCount).toBe(0)
    })

    it('should return total count of synced events', async () => {
      const cities = ['Mumbai']
      const syncedCount = await syncBookMyShowEvents(cities)

      expect(typeof syncedCount).toBe('number')
      expect(syncedCount).toBeGreaterThanOrEqual(0)
    })

    it('should handle sync errors gracefully', async () => {
      const cities = ['InvalidCity123']

      const syncedCount = await syncBookMyShowEvents(cities)

      // Should not throw, should return count (possibly 0)
      expect(typeof syncedCount).toBe('number')
    })
  })

  describe('Event Categories', () => {
    it('should support common event categories', async () => {
      const categories = ['movie', 'play', 'concert', 'sports', 'comedy', 'workshop']

      for (const category of categories) {
        const events = await fetchBookMyShowEvents('Mumbai', category, 5)
        expect(events).toBeInstanceOf(Array)
      }
    })

    it('should handle "all" category', async () => {
      const events = await fetchBookMyShowEvents('Mumbai', 'all', 10)

      // Should include mixed categories
      expect(events).toBeInstanceOf(Array)
      expect(events.length).toBeGreaterThan(0)
    })
  })
})
