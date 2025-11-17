/**
 * Poll Type Definitions
 * Extended Poll interface with edit tracking and multiple choice support
 */

export interface PollOption {
  id: string
  text: string
  vote_count: number
}

export interface Poll {
  id: string
  community_id: string
  author_id: string
  question: string
  category: string
  expires_at: string | null
  tagged_authority: string | null
  total_votes: number
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  edited_at?: string | null
  edit_count?: number
  is_multiple_choice?: boolean
  max_selections?: number
  location_city?: string
  media_type?: 'image' | 'gif' | null
  media_variants?: {
    original?: string
    large?: string
    medium?: string
    thumbnail?: string
    webp?: {
      large?: string
      medium?: string
      thumbnail?: string
    }
  } | null
  gif_url?: string | null
  image_url?: string | null
  media_items?: Array<{
    id: string
    media_type: 'image' | 'video' | 'gif'
    url: string
    variants?: Record<string, unknown>
    thumbnail_url?: string | null
    alt_text?: string | null
  }>
  author?: {
    anonymous_handle: string
    avatar_seed: string
  }
  community?: {
    name: string
    slug: string
  }
  options: PollOption[]
  user_voted?: boolean
  user_selected_option?: string
  user_selected_options?: string[] // For multiple choice
  user_vote?: 'upvote' | 'downvote' | null // For poll upvote/downvote (separate from poll option voting)
  vote_changed?: boolean // Indicates if user changed their vote
}

export interface PollPermissions {
  canDelete: boolean
  canEdit: boolean
  canVote: boolean
  isCreator: boolean
  isAdmin: boolean
}

export interface CreatePollRequest {
  community_id: string
  question: string
  options: string[]
  category: string
  expires_at?: string | null
  tagged_authority?: string | null
  is_multiple_choice?: boolean
  max_selections?: number
}

export interface UpdatePollRequest {
  question?: string
  options?: string[]
  category?: string
  expires_at?: string | null
  tagged_authority?: string | null
}

export interface MultipleChoiceVoteRequest {
  option_ids: string[]
}

export interface VoteRequest {
  option_id: string
  option_ids?: string[] // For multiple choice
}
