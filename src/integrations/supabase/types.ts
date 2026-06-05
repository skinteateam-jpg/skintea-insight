export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clinic_practitioners: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          name: string | null
          role: string | null
          specialty: string | null
          years_experience: number | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: string | null
          specialty?: string | null
          years_experience?: number | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: string | null
          specialty?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_practitioners_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_reviews: {
        Row: {
          agree_count: number | null
          body: string | null
          clinic_id: string | null
          created_at: string
          id: string
          skin_type: string | null
          treatment_id: string | null
          user_id: string | null
        }
        Insert: {
          agree_count?: number | null
          body?: string | null
          clinic_id?: string | null
          created_at?: string
          id?: string
          skin_type?: string | null
          treatment_id?: string | null
          user_id?: string | null
        }
        Update: {
          agree_count?: number | null
          body?: string | null
          clinic_id?: string | null
          created_at?: string
          id?: string
          skin_type?: string | null
          treatment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_reviews_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_skin_scores: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          recommend_pct: number | null
          skin_type: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          recommend_pct?: number | null
          skin_type?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          recommend_pct?: number | null
          skin_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_skin_scores_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_treatments: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          price_from: number | null
          price_unit: string | null
          treatment_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          price_from?: number | null
          price_unit?: string | null
          treatment_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          price_from?: number | null
          price_unit?: string | null
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_who_visited: {
        Row: {
          clinic_id: string | null
          id: string
          user_id: string | null
          visited_at: string
        }
        Insert: {
          clinic_id?: string | null
          id?: string
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          clinic_id?: string | null
          id?: string
          user_id?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_who_visited_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          avg_score: number | null
          badges: string[] | null
          best_for: string[] | null
          booking_url: string | null
          closes_at: string | null
          created_at: string
          distance_miles: number | null
          hours: Json | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_open_now: boolean | null
          is_verified: boolean
          name: string
          neighborhood: string | null
          parking_available: boolean | null
          parking_is_free: boolean | null
          parking_notes: string | null
          phone: string | null
          photos: Json | null
          price_from: number | null
          price_tier: string | null
          review_count: number | null
          skintea_score: number | null
          tea_quote: string | null
          tea_skin_type: string | null
          travel_minutes: number | null
          trust_score: number | null
          updated_at: string
          website_url: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Insert: {
          address?: string | null
          avg_score?: number | null
          badges?: string[] | null
          best_for?: string[] | null
          booking_url?: string | null
          closes_at?: string | null
          created_at?: string
          distance_miles?: number | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_open_now?: boolean | null
          is_verified?: boolean
          name: string
          neighborhood?: string | null
          parking_available?: boolean | null
          parking_is_free?: boolean | null
          parking_notes?: string | null
          phone?: string | null
          photos?: Json | null
          price_from?: number | null
          price_tier?: string | null
          review_count?: number | null
          skintea_score?: number | null
          tea_quote?: string | null
          tea_skin_type?: string | null
          travel_minutes?: number | null
          trust_score?: number | null
          updated_at?: string
          website_url?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Update: {
          address?: string | null
          avg_score?: number | null
          badges?: string[] | null
          best_for?: string[] | null
          booking_url?: string | null
          closes_at?: string | null
          created_at?: string
          distance_miles?: number | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_open_now?: boolean | null
          is_verified?: boolean
          name?: string
          neighborhood?: string | null
          parking_available?: boolean | null
          parking_is_free?: boolean | null
          parking_notes?: string | null
          phone?: string | null
          photos?: Json | null
          price_from?: number | null
          price_tier?: string | null
          review_count?: number | null
          skintea_score?: number | null
          tea_quote?: string | null
          tea_skin_type?: string | null
          travel_minutes?: number | null
          trust_score?: number | null
          updated_at?: string
          website_url?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Relationships: []
      }
      consultation_clicks: {
        Row: {
          clicked_at: string
          clinic_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          clinic_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          clinic_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_clicks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          plan: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          cost: string | null
          created_at: string
          id: string
          outcome: Database["public"]["Enums"]["post_outcome"] | null
          sessions: string | null
          skin_type: string | null
          surprised_me: string | null
          tags: string[]
          treatment_id: string | null
          updated_at: string
          user_id: string
          warn_if: string | null
          what_happened: string | null
          works_for: string | null
        }
        Insert: {
          cost?: string | null
          created_at?: string
          id?: string
          outcome?: Database["public"]["Enums"]["post_outcome"] | null
          sessions?: string | null
          skin_type?: string | null
          surprised_me?: string | null
          tags?: string[]
          treatment_id?: string | null
          updated_at?: string
          user_id: string
          warn_if?: string | null
          what_happened?: string | null
          works_for?: string | null
        }
        Update: {
          cost?: string | null
          created_at?: string
          id?: string
          outcome?: Database["public"]["Enums"]["post_outcome"] | null
          sessions?: string | null
          skin_type?: string | null
          surprised_me?: string | null
          tags?: string[]
          treatment_id?: string | null
          updated_at?: string
          user_id?: string
          warn_if?: string | null
          what_happened?: string | null
          works_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          is_derm: boolean
          is_member: boolean
          name: string | null
          skin_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          is_derm?: boolean
          is_member?: boolean
          name?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          is_derm?: boolean
          is_member?: boolean
          name?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      surgeries: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      surgery_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgery_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "surgery_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      surgery_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgery_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "surgery_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      surgery_posts: {
        Row: {
          city: string | null
          clinic_name: string | null
          comments_open: boolean
          country: string | null
          created_at: string
          hashtags: string[]
          id: string
          likes_count: number
          my_thoughts_vs_reality: string | null
          outcome: Database["public"]["Enums"]["surgery_outcome"] | null
          pain_level: number | null
          photos: Json
          recovery_time: string | null
          skin_type: Database["public"]["Enums"]["surgery_skin_type"] | null
          struggle: string | null
          surgery_id: string | null
          surprised_me: string | null
          total_cost: string | null
          updated_at: string
          user_id: string
          warn_if: string | null
          what_happened: string | null
          works_for: string | null
        }
        Insert: {
          city?: string | null
          clinic_name?: string | null
          comments_open?: boolean
          country?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          likes_count?: number
          my_thoughts_vs_reality?: string | null
          outcome?: Database["public"]["Enums"]["surgery_outcome"] | null
          pain_level?: number | null
          photos?: Json
          recovery_time?: string | null
          skin_type?: Database["public"]["Enums"]["surgery_skin_type"] | null
          struggle?: string | null
          surgery_id?: string | null
          surprised_me?: string | null
          total_cost?: string | null
          updated_at?: string
          user_id: string
          warn_if?: string | null
          what_happened?: string | null
          works_for?: string | null
        }
        Update: {
          city?: string | null
          clinic_name?: string | null
          comments_open?: boolean
          country?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          likes_count?: number
          my_thoughts_vs_reality?: string | null
          outcome?: Database["public"]["Enums"]["surgery_outcome"] | null
          pain_level?: number | null
          photos?: Json
          recovery_time?: string | null
          skin_type?: Database["public"]["Enums"]["surgery_skin_type"] | null
          struggle?: string | null
          surgery_id?: string | null
          surprised_me?: string | null
          total_cost?: string | null
          updated_at?: string
          user_id?: string
          warn_if?: string | null
          what_happened?: string | null
          works_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surgery_posts_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
        ]
      }
      surgery_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgery_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "surgery_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_influencers: {
        Row: {
          created_at: string
          display_name: string | null
          follower_count: number | null
          handle: string | null
          id: string
          platform: string | null
          post_url: string | null
          profile_photo_url: string | null
          profile_url: string | null
          sentiment: string | null
          treatment_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          handle?: string | null
          id?: string
          platform?: string | null
          post_url?: string | null
          profile_photo_url?: string | null
          profile_url?: string | null
          sentiment?: string | null
          treatment_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          handle?: string | null
          id?: string
          platform?: string | null
          post_url?: string | null
          profile_photo_url?: string | null
          profile_url?: string | null
          sentiment?: string | null
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_influencers_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          active: boolean
          average_cost: string | null
          best_for_skin: string | null
          category: string | null
          celebrity_handles: string[] | null
          created_at: string
          description: string | null
          downtime: string | null
          how_it_works: string | null
          id: string
          majority_pct: number | null
          minority_opinion: string | null
          name: string
          results_pct: number | null
          sessions_recommended: string | null
          slug: string | null
          sort_order: number
          subtitle: string | null
          updated_at: string
          what_it_is: string | null
          who_its_for: string | null
        }
        Insert: {
          active?: boolean
          average_cost?: string | null
          best_for_skin?: string | null
          category?: string | null
          celebrity_handles?: string[] | null
          created_at?: string
          description?: string | null
          downtime?: string | null
          how_it_works?: string | null
          id?: string
          majority_pct?: number | null
          minority_opinion?: string | null
          name: string
          results_pct?: number | null
          sessions_recommended?: string | null
          slug?: string | null
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
          what_it_is?: string | null
          who_its_for?: string | null
        }
        Update: {
          active?: boolean
          average_cost?: string | null
          best_for_skin?: string | null
          category?: string | null
          celebrity_handles?: string[] | null
          created_at?: string
          description?: string | null
          downtime?: string | null
          how_it_works?: string | null
          id?: string
          majority_pct?: number | null
          minority_opinion?: string | null
          name?: string
          results_pct?: number | null
          sessions_recommended?: string | null
          slug?: string | null
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
          what_it_is?: string | null
          who_its_for?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      post_outcome: "would_again" | "modified" | "wouldnt"
      surgery_outcome: "Would do again" | "Modified" | "Wouldn't"
      surgery_skin_type: "Oily" | "Dry" | "Combination" | "Sensitive" | "Normal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      post_outcome: ["would_again", "modified", "wouldnt"],
      surgery_outcome: ["Would do again", "Modified", "Wouldn't"],
      surgery_skin_type: ["Oily", "Dry", "Combination", "Sensitive", "Normal"],
    },
  },
} as const
