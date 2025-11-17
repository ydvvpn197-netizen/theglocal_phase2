/**
 * Distance Utilities Unit Tests
 *
 * Tests for all distance-related utility functions
 */

import {
  formatDistance,
  getDistanceColor,
  sortByDistance,
  filterByRadius,
  groupByDistanceRanges,
  getDistanceLabel,
  calculateDistance,
  isWithinRadius,
  coordinatesToPostGIS,
  postGISToCoordinates,
  RADIUS_OPTIONS,
} from '@/lib/utils/distance'

describe('formatDistance', () => {
  it('should format near distances correctly', () => {
    expect(formatDistance(0.05)).toBe('Near you')
    expect(formatDistance(0.09)).toBe('Near you')
  })

  it('should format meters for distances < 1km', () => {
    expect(formatDistance(0.5)).toBe('500 m')
    expect(formatDistance(0.75)).toBe('750 m')
  })

  it('should format kilometers with decimals for < 10km', () => {
    expect(formatDistance(2.3)).toBe('2.3 km')
    expect(formatDistance(5.7)).toBe('5.7 km')
  })

  it('should format kilometers without decimals for >= 10km', () => {
    expect(formatDistance(15.7)).toBe('16 km')
    expect(formatDistance(50.2)).toBe('50 km')
  })

  it('should handle null/undefined', () => {
    expect(formatDistance(null)).toBe('')
    expect(formatDistance(undefined)).toBe('')
  })
})

describe('getDistanceColor', () => {
  it('should return green for very close (<1km)', () => {
    expect(getDistanceColor(0.5)).toContain('green')
  })

  it('should return blue for close (<5km)', () => {
    expect(getDistanceColor(3)).toContain('blue')
  })

  it('should return yellow for moderate (<25km)', () => {
    expect(getDistanceColor(15)).toContain('yellow')
  })

  it('should return orange for far (>=25km)', () => {
    expect(getDistanceColor(50)).toContain('orange')
  })

  it('should handle null gracefully', () => {
    expect(getDistanceColor(null)).toBe('text-muted-foreground')
  })
})

describe('sortByDistance', () => {
  it('should sort items by distance ascending', () => {
    const items = [
      { id: '1', distance_km: 10 },
      { id: '2', distance_km: 5 },
      { id: '3', distance_km: 15 },
    ]

    const sorted = sortByDistance(items)

    expect(sorted[0]?.id).toBe('2') // 5 km
    expect(sorted[1]?.id).toBe('1') // 10 km
    expect(sorted[2]?.id).toBe('3') // 15 km
  })

  it('should place items without distance at the end', () => {
    const items = [
      { id: '1', distance_km: 10 },
      { id: '2', distance_km: undefined },
      { id: '3', distance_km: 5 },
    ]

    const sorted = sortByDistance(items)

    expect(sorted[0]?.id).toBe('3') // 5 km
    expect(sorted[1]?.id).toBe('1') // 10 km
    expect(sorted[2]?.id).toBe('2') // undefined
  })

  it('should support descending sort', () => {
    const items = [
      { id: '1', distance_km: 5 },
      { id: '2', distance_km: 15 },
      { id: '3', distance_km: 10 },
    ]

    const sorted = sortByDistance(items, false)

    expect(sorted[0]?.id).toBe('2') // 15 km
    expect(sorted[1]?.id).toBe('3') // 10 km
    expect(sorted[2]?.id).toBe('1') // 5 km
  })
})

describe('filterByRadius', () => {
  it('should filter items within radius', () => {
    const items = [
      { id: '1', distance_km: 5 },
      { id: '2', distance_km: 15 },
      { id: '3', distance_km: 30 },
    ]

    const filtered = filterByRadius(items, 20)

    expect(filtered).toHaveLength(2)
    expect(filtered[0]?.id).toBe('1')
    expect(filtered[1]?.id).toBe('2')
  })

  it('should exclude items without distance', () => {
    const items = [
      { id: '1', distance_km: 5 },
      { id: '2', distance_km: undefined },
    ]

    const filtered = filterByRadius(items, 20)

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('1')
  })
})

describe('groupByDistanceRanges', () => {
  it('should group items correctly', () => {
    const items = [
      { id: '1', distance_km: 2 },
      { id: '2', distance_km: 10 },
      { id: '3', distance_km: 50 },
      { id: '4', distance_km: undefined },
    ]

    const groups = groupByDistanceRanges(items)

    expect(groups.nearby).toHaveLength(1)
    expect(groups.close).toHaveLength(1)
    expect(groups.far).toHaveLength(1)
    expect(groups.unknown).toHaveLength(1)
  })
})

describe('calculateDistance', () => {
  it('should calculate distance between two points', () => {
    // Mumbai to Delhi (approx 1150 km)
    const mumbai = { latitude: 19.076, longitude: 72.8777 }
    const delhi = { latitude: 28.6139, longitude: 77.209 }

    const distance = calculateDistance(mumbai, delhi)

    // Should be approximately 1150 km (allowing 10% variance)
    expect(distance).toBeGreaterThan(1000)
    expect(distance).toBeLessThan(1300)
  })

  it('should return 0 for same location', () => {
    const point = { latitude: 19.076, longitude: 72.8777 }

    const distance = calculateDistance(point, point)

    expect(distance).toBe(0)
  })
})

describe('isWithinRadius', () => {
  it('should correctly identify points within radius', () => {
    const center = { latitude: 19.076, longitude: 72.8777 }

    // Point very close to center
    const nearPoint = { latitude: 19.077, longitude: 72.8787 }

    expect(isWithinRadius(center, nearPoint, 5)).toBe(true)
  })

  it('should correctly identify points outside radius', () => {
    const mumbai = { latitude: 19.076, longitude: 72.8777 }
    const delhi = { latitude: 28.6139, longitude: 77.209 }

    expect(isWithinRadius(mumbai, delhi, 100)).toBe(false)
  })
})

describe('PostGIS Conversion', () => {
  it('should convert coordinates to PostGIS format', () => {
    const coords = { latitude: 19.076, longitude: 72.8777 }

    const postgis = coordinatesToPostGIS(coords)

    expect(postgis).toBe('POINT(72.8777 19.076)')
  })

  it('should parse PostGIS format to coordinates', () => {
    const postgis = 'POINT(72.8777 19.0760)'

    const coords = postGISToCoordinates(postgis)

    expect(coords).not.toBeNull()
    expect(coords?.latitude).toBe(19.076)
    expect(coords?.longitude).toBe(72.8777)
  })

  it('should handle invalid PostGIS format', () => {
    expect(postGISToCoordinates('invalid')).toBeNull()
    expect(postGISToCoordinates('')).toBeNull()
    expect(postGISToCoordinates(null)).toBeNull()
  })
})

describe('getDistanceLabel', () => {
  it('should return appropriate labels', () => {
    expect(getDistanceLabel(0.5)).toBe('Near you')
    expect(getDistanceLabel(3)).toBe('Nearby')
    expect(getDistanceLabel(15)).toBe('In your area')
    expect(getDistanceLabel(50)).toBe('Farther away')
    expect(getDistanceLabel(null)).toBe('Unknown')
  })
})

describe('RADIUS_OPTIONS', () => {
  it('should have all expected radius options', () => {
    expect(RADIUS_OPTIONS).toHaveLength(6)
    expect(RADIUS_OPTIONS[0].value).toBe(1)
    expect(RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1]?.value).toBe(100)
  })

  it('should have labels and descriptions', () => {
    RADIUS_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value')
      expect(option).toHaveProperty('label')
      expect(option).toHaveProperty('description')
    })
  })
})

describe('Edge Cases', () => {
  it('should handle NaN values', () => {
    expect(formatDistance(NaN)).toBe('')
    expect(getDistanceColor(NaN)).toBe('text-muted-foreground')
  })

  it('should handle negative distances', () => {
    // Shouldn't happen in practice, but should handle gracefully
    const distance = -5
    expect(formatDistance(distance)).toBeDefined()
  })

  it('should handle very large distances', () => {
    const distance = 10000 // 10,000 km
    expect(formatDistance(distance)).toBe('10000 km')
  })
})
