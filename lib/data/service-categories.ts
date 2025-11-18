/**
 * Service categories and subcategories for artists
 * Format: category:subcategory (e.g., "Musician:Instrumentalist")
 */

export interface ServiceCategory {
  id: string
  label: string
  subcategories?: string[]
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'musician',
    label: 'Musician',
    subcategories: [
      'Instrumentalist',
      'Vocalist',
      'Composer',
      'Music Producer',
      'Sound Engineer',
      'Other',
    ],
  },
  {
    id: 'dj',
    label: 'DJ',
    subcategories: ['Wedding DJ', 'Club DJ', 'Radio DJ', 'Event DJ', 'Music Producer', 'Other'],
  },
  {
    id: 'photographer',
    label: 'Photographer',
    subcategories: [
      'Wedding Photography',
      'Event Photography',
      'Portrait Photography',
      'Commercial Photography',
      'Product Photography',
      'Wildlife Photography',
      'Other',
    ],
  },
  {
    id: 'videographer',
    label: 'Videographer',
    subcategories: [
      'Wedding Videography',
      'Event Videography',
      'Corporate Videos',
      'Music Videos',
      'Documentary',
      'Live Streaming',
      'Other',
    ],
  },
  {
    id: 'makeup_artist',
    label: 'Makeup Artist',
    subcategories: [
      'Bridal Makeup',
      'Event Makeup',
      'Commercial Makeup',
      'Special Effects',
      'Film/TV Makeup',
      'Other',
    ],
  },
  {
    id: 'dancer',
    label: 'Dancer',
    subcategories: [
      'Classical Dance',
      'Bollywood',
      'Contemporary',
      'Hip Hop',
      'Folk Dance',
      'Belly Dance',
      'Choreographer',
      'Other',
    ],
  },
  {
    id: 'comedian',
    label: 'Comedian',
    subcategories: ['Stand-up Comedy', 'Mimicry', 'Skit/Impersonation', 'Roast Master', 'Other'],
  },
  {
    id: 'chef',
    label: 'Chef',
    subcategories: ['Home Chef', 'Tiffin Services', 'Catering', 'Baking', 'Live Cooking', 'Other'],
  },
  {
    id: 'event_planner',
    label: 'Event Planner',
    subcategories: [
      'Wedding Planner',
      'Corporate Events',
      'Birthday Parties',
      'Anniversary Celebrations',
      'Conference Management',
      'Other',
    ],
  },
  {
    id: 'decorator',
    label: 'Decorator',
    subcategories: [
      'Wedding Decoration',
      'Stage Decoration',
      'Home Decoration',
      'Floral Arrangements',
      'Theme Decoration',
      'Other',
    ],
  },
  {
    id: 'caterer',
    label: 'Caterer',
    subcategories: [
      'Vegetarian',
      'Non-Vegetarian',
      'Veg & Non-Veg',
      'Jain Food',
      'Regional Cuisine',
      'Fusion Cuisine',
      'Other',
    ],
  },
  {
    id: 'artist',
    label: 'Artist',
    subcategories: [
      'Painting',
      'Portrait Artist',
      'Digital Art',
      'Live Art Performance',
      'Puppet Show',
      'Magician',
      'Other',
    ],
  },
  {
    id: 'other',
    label: 'Other',
  },
]

export function formatServiceCategory(category: string, subcategory?: string): string {
  if (subcategory && subcategory.trim()) {
    return `${category}:${subcategory}`
  }
  return category
}

export function parseServiceCategory(fullCategory: string): {
  category: string
  subcategory?: string
} {
  const parts = fullCategory.split(':')
  if (parts.length === 2 && parts[1] && parts[1].trim()) {
    return { category: parts[0] || '', subcategory: parts[1] }
  }
  return { category: fullCategory }
}

export function getCategoryById(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((cat) => cat.id === id)
}

export function getAllCategoryLabels(): string[] {
  return SERVICE_CATEGORIES.map((cat) => cat.label)
}
