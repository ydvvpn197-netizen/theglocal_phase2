/**
 * Theglocal Database Types
 *
 * This file is generated from the Supabase schema.
 * To regenerate: npm run generate-types
 *
 * Note: These types will be auto-generated once you:
 * 1. Apply migrations to your Supabase project
 * 2. Run: npm run generate-types
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          anonymous_handle: string
          avatar_seed: string
          location_city: string | null
          location_coordinates: unknown | null
          join_date: string
          is_banned: boolean
          ban_reason: string | null
          banned_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          phone?: string | null
          anonymous_handle: string
          avatar_seed: string
          location_city?: string | null
          location_coordinates?: unknown | null
          join_date?: string
          is_banned?: boolean
          ban_reason?: string | null
          banned_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          anonymous_handle?: string
          avatar_seed?: string
          location_city?: string | null
          location_coordinates?: unknown | null
          join_date?: string
          is_banned?: boolean
          ban_reason?: string | null
          banned_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      communities: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          rules: string | null
          location_city: string
          location_coordinates: unknown | null
          created_by: string
          member_count: number
          post_count: number
          is_private: boolean
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          rules?: string | null
          location_city: string
          location_coordinates?: unknown | null
          created_by: string
          member_count?: number
          post_count?: number
          is_private?: boolean
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          rules?: string | null
          location_city?: string
          location_coordinates?: unknown | null
          created_by?: string
          member_count?: number
          post_count?: number
          is_private?: boolean
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          community_id: string
          author_id: string
          title: string
          body: string | null
          image_url: string | null
          location_city: string | null
          location_coordinates: unknown | null
          upvotes: number
          downvotes: number
          comment_count: number
          is_deleted: boolean
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          community_id: string
          author_id: string
          title: string
          body?: string | null
          image_url?: string | null
          location_city?: string | null
          location_coordinates?: unknown | null
          upvotes?: number
          downvotes?: number
          comment_count?: number
          is_deleted?: boolean
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          author_id?: string
          title?: string
          body?: string | null
          image_url?: string | null
          location_city?: string | null
          location_coordinates?: unknown | null
          upvotes?: number
          downvotes?: number
          comment_count?: number
          is_deleted?: boolean
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      artists: {
        Row: {
          id: string
          stage_name: string
          service_category: string
          description: string | null
          portfolio_images: string[] | null
          location_city: string
          location_coordinates: unknown | null
          rate_min: number | null
          rate_max: number | null
          subscription_status: string
          subscription_start_date: string | null
          subscription_next_billing_date: string | null
          subscription_end_date: string | null
          trial_ends_at: string | null
          razorpay_subscription_id: string | null
          razorpay_customer_id: string | null
          profile_views: number
          rating_avg: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          stage_name: string
          service_category: string
          description?: string | null
          portfolio_images?: string[] | null
          location_city: string
          location_coordinates?: unknown | null
          rate_min?: number | null
          rate_max?: number | null
          subscription_status?: string
          subscription_start_date?: string | null
          subscription_next_billing_date?: string | null
          subscription_end_date?: string | null
          trial_ends_at?: string | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          profile_views?: number
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage_name?: string
          service_category?: string
          description?: string | null
          portfolio_images?: string[] | null
          location_city?: string
          location_coordinates?: unknown | null
          rate_min?: number | null
          rate_max?: number | null
          subscription_status?: string
          subscription_start_date?: string | null
          subscription_next_billing_date?: string | null
          subscription_end_date?: string | null
          trial_ends_at?: string | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          profile_views?: number
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_community_admin: {
        Args: { community_id_param: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
