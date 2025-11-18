/**
 * Indian cities data for autocomplete
 * Major cities sorted by population and popularity
 */
export const INDIAN_CITIES = [
  // Tier 1 Cities
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Hyderabad',
  'Ahmedabad',
  'Chennai',
  'Kolkata',
  'Surat',
  'Pune',
  'Jaipur',

  // Tier 2 Cities
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Thane',
  'Bhopal',
  'Visakhapatnam',
  'Patna',
  'Vadodara',
  'Ghaziabad',
  'Ludhiana',
  'Coimbatore',
  'Agra',
  'Madurai',
  'Nashik',
  'Meerut',
  'Rajkot',
  'Varanasi',
  'Srinagar',
  'Amritsar',

  // Tier 3 Popular Cities
  'Chandigarh',
  'Mysore',
  'Gurgaon',
  'Noida',
  'Kochi',
  'Goa',
  'Puducherry',
  'Shimla',
  'Manali',
  'Dehradun',
  'Mussoorie',
  'Rishikesh',
  'Udaipur',
  'Jodhpur',
  'Jaisalmer',
  'Pushkar',
  'Bikaner',

  // Metro/State Capitals
  'Patiala',
  'Ranchi',
  'Raipur',
  'Bhubaneswar',
  'Gangtok',
  'Agartala',
  'Aizawl',
  'Itanagar',
  'Shillong',
  'Imphal',
  'Kohima',
  'Panaji',

  // Other Notable Cities
  'Warangal',
  'Tiruchirappalli',
  'Salem',
  'Calicut',
  'Thrissur',
  'Hubli',
  'Mangalore',
  'Belgaum',
  'Kolhapur',
  'Solapur',
  'Aurangabad',
  'Jalgaon',
  'Sangli',
  'Nanded',
  'Latur',
  'Akola',
  'Barshi',
].sort()

/**
 * Get cities matching a search query (case-insensitive prefix match)
 */
export function getMatchingCities(query: string, limit = 10): string[] {
  if (!query || query.trim().length === 0) {
    return INDIAN_CITIES.slice(0, limit)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const matches = INDIAN_CITIES.filter((city) => city.toLowerCase().startsWith(normalizedQuery))

  return matches.slice(0, limit)
}

/**
 * Check if a city name exists in our list
 */
export function isValidCity(city: string): boolean {
  return INDIAN_CITIES.some((c) => c.toLowerCase() === city.toLowerCase())
}

/**
 * Get city suggestions if partial match
 */
export function getCitySuggestions(partialCity: string): string[] {
  if (partialCity.length < 2) return []

  const normalized = partialCity.toLowerCase()
  return INDIAN_CITIES.filter((city) => city.toLowerCase().includes(normalized)).slice(0, 5)
}
