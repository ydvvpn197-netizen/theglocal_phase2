/**
 * Major Indian cities for autocomplete functionality
 * Organized by popularity and population
 */

export interface City {
  name: string
  state: string
  popular?: boolean
}

export const INDIAN_CITIES: City[] = [
  // Tier 1 Cities (Most Popular)
  { name: 'Mumbai', state: 'Maharashtra', popular: true },
  { name: 'Delhi', state: 'Delhi', popular: true },
  { name: 'Bangalore', state: 'Karnataka', popular: true },
  { name: 'Hyderabad', state: 'Telangana', popular: true },
  { name: 'Chennai', state: 'Tamil Nadu', popular: true },
  { name: 'Kolkata', state: 'West Bengal', popular: true },
  { name: 'Pune', state: 'Maharashtra', popular: true },
  { name: 'Ahmedabad', state: 'Gujarat', popular: true },
  { name: 'Surat', state: 'Gujarat', popular: true },
  { name: 'Jaipur', state: 'Rajasthan', popular: true },

  // Tier 2 Cities (Major Cities)
  { name: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Nagpur', state: 'Maharashtra' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Thane', state: 'Maharashtra' },
  { name: 'Bhopal', state: 'Madhya Pradesh' },
  { name: 'Patna', state: 'Bihar' },
  { name: 'Vadodara', state: 'Gujarat' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh' },
  { name: 'Ludhiana', state: 'Punjab' },
  { name: 'Coimbatore', state: 'Tamil Nadu' },
  { name: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Madurai', state: 'Tamil Nadu' },
  { name: 'Nashik', state: 'Maharashtra' },
  { name: 'Meerut', state: 'Uttar Pradesh' },
  { name: 'Rajkot', state: 'Gujarat' },
  { name: 'Varanasi', state: 'Uttar Pradesh' },
  { name: 'Srinagar', state: 'Jammu and Kashmir' },
  { name: 'Amritsar', state: 'Punjab' },
  { name: 'Allahabad', state: 'Uttar Pradesh' },
  { name: 'Jabalpur', state: 'Madhya Pradesh' },
  { name: 'Jamshedpur', state: 'Jharkhand' },
  { name: 'Vijayawada', state: 'Andhra Pradesh' },
  { name: 'Raipur', state: 'Chhattisgarh' },

  // Metro Cities (Tier 2)
  { name: 'Chandigarh', state: 'Chandigarh' },
  { name: 'Gwalior', state: 'Madhya Pradesh' },
  { name: 'Kolhapur', state: 'Maharashtra' },
  { name: 'Mysore', state: 'Karnataka' },
  { name: 'Warangal', state: 'Telangana' },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu' },
  { name: 'Salem', state: 'Tamil Nadu' },
  { name: 'Jalandhar', state: 'Punjab' },
  { name: 'Dhanbad', state: 'Jharkhand' },
  { name: 'Bhubaneswar', state: 'Odisha' },

  // Important Regional Cities
  { name: 'Hubli', state: 'Karnataka' },
  { name: 'Mangalore', state: 'Karnataka' },
  { name: 'Noida', state: 'Uttar Pradesh' },
  { name: 'Gurgaon', state: 'Haryana' },
  { name: 'Faridabad', state: 'Haryana' },
  { name: 'Kalyan', state: 'Maharashtra' },
  { name: 'Vasai', state: 'Maharashtra' },
  { name: 'Aurangabad', state: 'Maharashtra' },
  { name: 'Navi Mumbai', state: 'Maharashtra' },
  { name: 'Solapur', state: 'Maharashtra' },
  { name: 'Ranchi', state: 'Jharkhand' },
  { name: 'Guwahati', state: 'Assam' },
  { name: 'Dehradun', state: 'Uttarakhand' },
  { name: 'Shimla', state: 'Himachal Pradesh' },
  { name: 'Panaji', state: 'Goa' },
  { name: 'Kochi', state: 'Kerala' },
  { name: 'Thiruvananthapuram', state: 'Kerala' },
  { name: 'Calicut', state: 'Kerala' },
  { name: 'Kozhikode', state: 'Kerala' },
  { name: 'Pondicherry', state: 'Puducherry' },
  { name: 'Port Blair', state: 'Andaman and Nicobar Islands' },

  // Major Cities (Additional)
  { name: 'Bareilly', state: 'Uttar Pradesh' },
  { name: 'Moradabad', state: 'Uttar Pradesh' },
  { name: 'Bikaner', state: 'Rajasthan' },
  { name: 'Jodhpur', state: 'Rajasthan' },
  { name: 'Udaipur', state: 'Rajasthan' },
  { name: 'Kota', state: 'Rajasthan' },
  { name: 'Ajmer', state: 'Rajasthan' },
  { name: 'Aligarh', state: 'Uttar Pradesh' },
  { name: 'Gorakhpur', state: 'Uttar Pradesh' },
  { name: 'Durgapur', state: 'West Bengal' },
  { name: 'Asansol', state: 'West Bengal' },
  { name: 'Siliguri', state: 'West Bengal' },
  { name: 'Hubballi', state: 'Karnataka' },
  { name: 'Belgaum', state: 'Karnataka' },
  { name: 'Tumkur', state: 'Karnataka' },
  { name: 'Davangere', state: 'Karnataka' },
  { name: 'Bellary', state: 'Karnataka' },
  { name: 'Tirunelveli', state: 'Tamil Nadu' },
  { name: 'Erode', state: 'Tamil Nadu' },
  { name: 'Dindigul', state: 'Tamil Nadu' },
  { name: 'Thanjavur', state: 'Tamil Nadu' },
  { name: 'Kolar', state: 'Karnataka' },
  { name: 'Shimoga', state: 'Karnataka' },
  { name: 'Gulbarga', state: 'Karnataka' },
  { name: 'Bijapur', state: 'Karnataka' },
  { name: 'Karimnagar', state: 'Telangana' },
  { name: 'Nizamabad', state: 'Telangana' },
  { name: 'Kurnool', state: 'Andhra Pradesh' },
  { name: 'Guntur', state: 'Andhra Pradesh' },
  { name: 'Rajahmundry', state: 'Andhra Pradesh' },
  { name: 'Tirupati', state: 'Andhra Pradesh' },
  { name: 'Vizianagaram', state: 'Andhra Pradesh' },
  { name: 'Bilaspur', state: 'Chhattisgarh' },
  { name: 'Raigarh', state: 'Chhattisgarh' },
  { name: 'Korba', state: 'Chhattisgarh' },
  { name: 'Rourkela', state: 'Odisha' },
  { name: 'Berhampur', state: 'Odisha' },
  { name: 'Cuttack', state: 'Odisha' },
  { name: 'Bhavnagar', state: 'Gujarat' },
  { name: 'Jamnagar', state: 'Gujarat' },
  { name: 'Gandhinagar', state: 'Gujarat' },
  { name: 'Junagadh', state: 'Gujarat' },
  { name: 'Dhule', state: 'Maharashtra' },
  { name: 'Nagpur', state: 'Maharashtra' },
  { name: 'Akola', state: 'Maharashtra' },
  { name: 'Amravati', state: 'Maharashtra' },
  { name: 'Jalgaon', state: 'Maharashtra' },
  { name: 'Ratnagiri', state: 'Maharashtra' },
  { name: 'Sangli', state: 'Maharashtra' },
  { name: 'Sambalpur', state: 'Odisha' },
  { name: 'Cuttack', state: 'Odisha' },
]

/**
 * Get all city names for autocomplete
 */
export function getAllCityNames(): string[] {
  return INDIAN_CITIES.map((city) => city.name)
}

/**
 * Get popular cities only
 */
export function getPopularCities(): City[] {
  return INDIAN_CITIES.filter((city) => city.popular)
}

/**
 * Search cities by name (fuzzy matching)
 */
export function searchCities(query: string, limit = 10): City[] {
  if (!query || query.trim().length === 0) {
    return getPopularCities().slice(0, limit)
  }

  const normalizedQuery = query.toLowerCase().trim()
  const results: City[] = []

  // Exact match first
  for (const city of INDIAN_CITIES) {
    if (city.name.toLowerCase() === normalizedQuery) {
      results.unshift(city)
      break
    }
  }

  // Starts with match
  for (const city of INDIAN_CITIES) {
    if (city.name.toLowerCase().startsWith(normalizedQuery) && !results.includes(city)) {
      results.push(city)
    }
  }

  // Contains match
  for (const city of INDIAN_CITIES) {
    if (
      city.name.toLowerCase().includes(normalizedQuery) &&
      !results.includes(city) &&
      results.length < limit
    ) {
      results.push(city)
    }
  }

  return results.slice(0, limit)
}

/**
 * Get city details by name
 */
export function getCityByName(name: string): City | undefined {
  return INDIAN_CITIES.find((city) => city.name.toLowerCase() === name.toLowerCase())
}
