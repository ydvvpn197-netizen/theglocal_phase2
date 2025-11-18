import {
  calculateDistance,
  roundCoordinatesForPrivacy,
  isWithinRadius,
  formatDistance,
} from './location'

describe('calculateDistance', () => {
  it('calculates distance between two points', () => {
    // New York to Los Angeles (approx 3944 km)
    const ny = { latitude: 40.7128, longitude: -74.006 }
    const la = { latitude: 34.0522, longitude: -118.2437 }
    const distance = calculateDistance(ny, la)
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4000)
  })

  it('returns 0 for same point', () => {
    const point = { latitude: 40.7128, longitude: -74.006 }
    const distance = calculateDistance(point, point)
    expect(distance).toBe(0)
  })

  it('calculates short distances accurately', () => {
    // Points ~10km apart
    const point1 = { latitude: 28.6139, longitude: 77.209 }
    const point2 = { latitude: 28.7041, longitude: 77.1025 }
    const distance = calculateDistance(point1, point2)
    expect(distance).toBeGreaterThan(9)
    expect(distance).toBeLessThan(15)
  })
})

describe('roundCoordinatesForPrivacy', () => {
  it('rounds coordinates to 0.01 precision', () => {
    const coords = { latitude: 28.123456, longitude: 77.987654 }
    const rounded = roundCoordinatesForPrivacy(coords)
    expect(rounded.latitude).toBe(28.12)
    expect(rounded.longitude).toBe(77.99)
  })

  it('preserves already rounded coordinates', () => {
    const coords = { latitude: 28.12, longitude: 77.99 }
    const rounded = roundCoordinatesForPrivacy(coords)
    expect(rounded.latitude).toBe(28.12)
    expect(rounded.longitude).toBe(77.99)
  })
})

describe('isWithinRadius', () => {
  it('returns true for points within radius', () => {
    const center = { latitude: 28.6139, longitude: 77.209 }
    const nearby = { latitude: 28.62, longitude: 77.21 }
    expect(isWithinRadius(center, nearby, 5)).toBe(true)
  })

  it('returns false for points outside radius', () => {
    const center = { latitude: 28.6139, longitude: 77.209 }
    const far = { latitude: 29.0, longitude: 78.0 }
    expect(isWithinRadius(center, far, 5)).toBe(false)
  })
})

describe('formatDistance', () => {
  it('formats kilometers correctly', () => {
    expect(formatDistance(5.7)).toBe('5.7 km')
    expect(formatDistance(12.3)).toBe('12.3 km')
  })

  it('formats meters for distances < 1km', () => {
    expect(formatDistance(0.5)).toBe('500 m')
    expect(formatDistance(0.123)).toBe('123 m')
  })

  it('handles zero distance', () => {
    expect(formatDistance(0)).toBe('0 m')
  })
})
