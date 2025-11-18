export interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  anonymous_handle: string
  avatar_seed: string
  location_city: string | null
  location_coordinates: string | null
  is_banned: boolean
  created_at: string
}
