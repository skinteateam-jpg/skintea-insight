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
      brand_retailers: {
        Row: {
          brand: string
          created_at: string
          id: string
          retailer_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          retailer_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          retailer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_retailers_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      category_images: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          depicts: string
          id: string
          identifiable_people: boolean
          image_url: string
          inactive_reason: string | null
          license_name: string
          license_url: string
          license_verification: string
          photo_page_url: string | null
          photographer: string | null
          photographer_url: string | null
          provider: string
          sort_order: number
          source: string
        }
        Insert: {
          active: boolean
          category?: string | null
          created_at?: string
          depicts: string
          id?: string
          identifiable_people: boolean
          image_url: string
          inactive_reason?: string | null
          license_name: string
          license_url: string
          license_verification: string
          photo_page_url?: string | null
          photographer?: string | null
          photographer_url?: string | null
          provider: string
          sort_order?: number
          source?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          depicts?: string
          id?: string
          identifiable_people?: boolean
          image_url?: string
          inactive_reason?: string | null
          license_name?: string
          license_url?: string
          license_verification?: string
          photo_page_url?: string | null
          photographer?: string | null
          photographer_url?: string | null
          provider?: string
          sort_order?: number
          source?: string
        }
        Relationships: []
      }
      celebrity_mentions: {
        Row: {
          active: boolean
          celeb_name: string
          created_at: string
          embed_url: string | null
          evidence_type: string
          field_provenance: Json
          follower_count: number | null
          follower_count_at: string | null
          id: string
          instagram_handle: string | null
          platform: string
          profile_photo_url: string | null
          profile_url: string | null
          quote: string | null
          said_on: string
          source_name: string
          source_url: string
          source_year: number | null
          tier: string
          treatment_id: string
          verified_at: string | null
        }
        Insert: {
          active?: boolean
          celeb_name: string
          created_at?: string
          embed_url?: string | null
          evidence_type: string
          field_provenance?: Json
          follower_count?: number | null
          follower_count_at?: string | null
          id?: string
          instagram_handle?: string | null
          platform: string
          profile_photo_url?: string | null
          profile_url?: string | null
          quote?: string | null
          said_on: string
          source_name: string
          source_url: string
          source_year?: number | null
          tier: string
          treatment_id: string
          verified_at?: string | null
        }
        Update: {
          active?: boolean
          celeb_name?: string
          created_at?: string
          embed_url?: string | null
          evidence_type?: string
          field_provenance?: Json
          follower_count?: number | null
          follower_count_at?: string | null
          id?: string
          instagram_handle?: string | null
          platform?: string
          profile_photo_url?: string | null
          profile_url?: string | null
          quote?: string | null
          said_on?: string
          source_name?: string
          source_url?: string
          source_year?: number | null
          tier?: string
          treatment_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_mentions_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_contacts: {
        Row: {
          clinic_id: string
          created_at: string
          emails: string[] | null
          field_provenance: Json
          social_profiles: Json | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          emails?: string[] | null
          field_provenance: Json
          social_profiles?: Json | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          emails?: string[] | null
          field_provenance?: Json
          social_profiles?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_intent_events: {
        Row: {
          action: string
          channel: string | null
          clinic_id: string
          id: string
          occurred_at: string
          page: string
          session_id: string | null
          surface: string | null
          treatment_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          channel?: string | null
          clinic_id: string
          id?: string
          occurred_at?: string
          page: string
          session_id?: string | null
          surface?: string | null
          treatment_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          channel?: string | null
          clinic_id?: string
          id?: string
          occurred_at?: string
          page?: string
          session_id?: string | null
          surface?: string | null
          treatment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_intent_events_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_intent_events_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_practitioners: {
        Row: {
          clinic_id: string | null
          created_at: string
          field_provenance: Json
          id: string
          name: string | null
          role: string | null
          specialty: string | null
          years_experience: number | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          field_provenance?: Json
          id?: string
          name?: string | null
          role?: string | null
          specialty?: string | null
          years_experience?: number | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          field_provenance?: Json
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
          display_name_public: boolean
          field_provenance: Json
          id: string
          skin_type: string | null
          surprised_by: string | null
          treatment_id: string | null
          user_id: string | null
          wish_known: string | null
        }
        Insert: {
          agree_count?: number | null
          body?: string | null
          clinic_id?: string | null
          created_at?: string
          display_name_public?: boolean
          field_provenance?: Json
          id?: string
          skin_type?: string | null
          surprised_by?: string | null
          treatment_id?: string | null
          user_id?: string | null
          wish_known?: string | null
        }
        Update: {
          agree_count?: number | null
          body?: string | null
          clinic_id?: string | null
          created_at?: string
          display_name_public?: boolean
          field_provenance?: Json
          id?: string
          skin_type?: string | null
          surprised_by?: string | null
          treatment_id?: string | null
          user_id?: string | null
          wish_known?: string | null
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
          field_provenance: Json
          id: string
          recommend_pct: number | null
          skin_type: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          field_provenance?: Json
          id?: string
          recommend_pct?: number | null
          skin_type?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          field_provenance?: Json
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
      clinic_social_links: {
        Row: {
          clinic_id: string
          created_at: string
          field_provenance: Json
          handle: string | null
          id: string
          platform: string
          url: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          field_provenance: Json
          handle?: string | null
          id?: string
          platform: string
          url: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          field_provenance?: Json
          handle?: string | null
          id?: string
          platform?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_social_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_submissions: {
        Row: {
          address: string | null
          clinic_id: string | null
          clinic_name: string
          created_at: string
          hours_text: string | null
          id: string
          message: string | null
          permission_granted: boolean
          permission_granted_at: string
          permission_signed_name: string
          permission_statement: string
          permission_statement_version: string
          phone: string | null
          photo_paths: string[]
          review_notes: string | null
          reviewed_at: string | null
          status: string
          submitter_email: string
          submitter_name: string
          submitter_role: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          clinic_id?: string | null
          clinic_name: string
          created_at?: string
          hours_text?: string | null
          id: string
          message?: string | null
          permission_granted: boolean
          permission_granted_at?: string
          permission_signed_name: string
          permission_statement: string
          permission_statement_version: string
          phone?: string | null
          photo_paths?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitter_email: string
          submitter_name: string
          submitter_role: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          clinic_id?: string | null
          clinic_name?: string
          created_at?: string
          hours_text?: string | null
          id?: string
          message?: string | null
          permission_granted?: boolean
          permission_granted_at?: string
          permission_signed_name?: string
          permission_statement?: string
          permission_statement_version?: string
          phone?: string | null
          photo_paths?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitter_email?: string
          submitter_name?: string
          submitter_role?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_submissions_clinic_id_fkey"
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
          field_provenance: Json
          id: string
          price_from: number | null
          price_unit: string | null
          treatment_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          field_provenance?: Json
          id?: string
          price_from?: number | null
          price_unit?: string | null
          treatment_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          field_provenance?: Json
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
      clinic_videos: {
        Row: {
          author_handle: string
          caption: string | null
          clinic_id: string
          created_at: string
          disclosed_paid: boolean | null
          field_provenance: Json
          id: string
          is_active: boolean
          likes: number | null
          platform: string
          posted_at: string | null
          relationship: string | null
          source_url: string
          thumbnail_url: string | null
          views: number | null
        }
        Insert: {
          author_handle: string
          caption?: string | null
          clinic_id: string
          created_at?: string
          disclosed_paid?: boolean | null
          field_provenance?: Json
          id?: string
          is_active?: boolean
          likes?: number | null
          platform: string
          posted_at?: string | null
          relationship?: string | null
          source_url: string
          thumbnail_url?: string | null
          views?: number | null
        }
        Update: {
          author_handle?: string
          caption?: string | null
          clinic_id?: string
          created_at?: string
          disclosed_paid?: boolean | null
          field_provenance?: Json
          id?: string
          is_active?: boolean
          likes?: number | null
          platform?: string
          posted_at?: string | null
          relationship?: string | null
          source_url?: string
          thumbnail_url?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_videos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_who_visited: {
        Row: {
          clinic_id: string | null
          id: string
          is_public: boolean
          source: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          clinic_id?: string | null
          id?: string
          is_public?: boolean
          source?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          clinic_id?: string | null
          id?: string
          is_public?: boolean
          source?: string | null
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
          business_status: string | null
          category: string | null
          closes_at: string | null
          created_at: string
          distance_miles: number | null
          field_provenance: Json
          google_categories: Json | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          hours: Json | null
          id: string
          image_url: string | null
          instagram_url: string | null
          is_featured: boolean | null
          is_open_now: boolean | null
          is_verified: boolean
          known_for: string | null
          last_google_sync: string | null
          last_website_sync: string | null
          latitude: number | null
          listing_filter: string | null
          longitude: number | null
          name: string
          neighborhood: string | null
          parking_available: boolean | null
          parking_is_free: boolean | null
          parking_notes: string | null
          phone: string | null
          photos: Json
          price_from: number | null
          price_tier: string | null
          review_count: number | null
          skintea_score: number | null
          tea_quote: string | null
          tea_skin_type: string | null
          tiktok_url: string | null
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
          business_status?: string | null
          category?: string | null
          closes_at?: string | null
          created_at?: string
          distance_miles?: number | null
          field_provenance?: Json
          google_categories?: Json | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_open_now?: boolean | null
          is_verified?: boolean
          known_for?: string | null
          last_google_sync?: string | null
          last_website_sync?: string | null
          latitude?: number | null
          listing_filter?: string | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          parking_available?: boolean | null
          parking_is_free?: boolean | null
          parking_notes?: string | null
          phone?: string | null
          photos?: Json
          price_from?: number | null
          price_tier?: string | null
          review_count?: number | null
          skintea_score?: number | null
          tea_quote?: string | null
          tea_skin_type?: string | null
          tiktok_url?: string | null
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
          business_status?: string | null
          category?: string | null
          closes_at?: string | null
          created_at?: string
          distance_miles?: number | null
          field_provenance?: Json
          google_categories?: Json | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_open_now?: boolean | null
          is_verified?: boolean
          known_for?: string | null
          last_google_sync?: string | null
          last_website_sync?: string | null
          latitude?: number | null
          listing_filter?: string | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          parking_available?: boolean | null
          parking_is_free?: boolean | null
          parking_notes?: string | null
          phone?: string | null
          photos?: Json
          price_from?: number | null
          price_tier?: string | null
          review_count?: number | null
          skintea_score?: number | null
          tea_quote?: string | null
          tea_skin_type?: string | null
          tiktok_url?: string | null
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
          lead_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          clinic_id?: string | null
          id?: string
          lead_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          clinic_id?: string | null
          id?: string
          lead_id?: string | null
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
          {
            foreignKeyName: "consultation_clicks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_handover_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_clicks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_wishlist: {
        Row: {
          affiliate_store: string | null
          affiliate_url: string | null
          brand: string | null
          category: string | null
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          is_public: boolean
          product_id: string | null
          product_name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_store?: string | null
          affiliate_url?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          product_id?: string | null
          product_name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_store?: string | null
          affiliate_url?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          product_id?: string | null
          product_name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      google_import_staging: {
        Row: {
          address: string | null
          business_status: string | null
          category: string | null
          google_categories: Json | null
          google_maps_url: string | null
          google_rating: number | null
          google_review_count: number | null
          hours: Json | null
          is_new: boolean
          latitude: number | null
          listing_filter: string
          longitude: number | null
          name: string
          neighborhood: string | null
          phone: string | null
          photos: Json
          place_id: string
          scraped_at: string
          target_clinic_id: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          business_status?: string | null
          category?: string | null
          google_categories?: Json | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          hours?: Json | null
          is_new: boolean
          latitude?: number | null
          listing_filter: string
          longitude?: number | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          photos: Json
          place_id: string
          scraped_at: string
          target_clinic_id?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          business_status?: string | null
          category?: string | null
          google_categories?: Json | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          hours?: Json | null
          is_new?: boolean
          latitude?: number | null
          listing_filter?: string
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          photos?: Json
          place_id?: string
          scraped_at?: string
          target_clinic_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_handover_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_treatments: {
        Row: {
          created_at: string
          lead_id: string
          treatment_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          treatment_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_treatments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_handover_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_treatments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          age_bracket: string | null
          budget_band: string | null
          city: string | null
          contact_consent: boolean
          created_at: string
          email: string | null
          id: string
          intent_stage: number
          intent_stage_version: number
          is_first_time: boolean | null
          other_treatment_note: string | null
          session_id: string
          skin_type: string | null
          stage_1_at: string | null
          stage_2_at: string | null
          updated_at: string
          user_id: string | null
          zip: string | null
        }
        Insert: {
          age_bracket?: string | null
          budget_band?: string | null
          city?: string | null
          contact_consent?: boolean
          created_at?: string
          email?: string | null
          id?: string
          intent_stage?: number
          intent_stage_version?: number
          is_first_time?: boolean | null
          other_treatment_note?: string | null
          session_id: string
          skin_type?: string | null
          stage_1_at?: string | null
          stage_2_at?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          age_bracket?: string | null
          budget_band?: string | null
          city?: string | null
          contact_consent?: boolean
          created_at?: string
          email?: string | null
          id?: string
          intent_stage?: number
          intent_stage_version?: number
          is_first_time?: boolean | null
          other_treatment_note?: string | null
          session_id?: string
          skin_type?: string | null
          stage_1_at?: string | null
          stage_2_at?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Relationships: []
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
      outbound_clicks: {
        Row: {
          created_at: string
          id: string
          link_type: string
          product_id: string | null
          retailer_id: string | null
          source_page: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_type: string
          product_id?: string | null
          retailer_id?: string | null
          source_page?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_type?: string
          product_id?: string | null
          retailer_id?: string | null
          source_page?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_clicks_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
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
      product_categories: {
        Row: {
          created_at: string
          is_navigable: boolean
          label: string
          level: number
          parent_slug: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          is_navigable?: boolean
          label: string
          level: number
          parent_slug?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          is_navigable?: boolean
          label?: string
          level?: number
          parent_slug?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      product_dedupe_log: {
        Row: {
          brand: string | null
          canonical_id: string
          dup_id: string
          merged_at: string | null
          name: string | null
        }
        Insert: {
          brand?: string | null
          canonical_id: string
          dup_id: string
          merged_at?: string | null
          name?: string | null
        }
        Update: {
          brand?: string | null
          canonical_id?: string
          dup_id?: string
          merged_at?: string | null
          name?: string | null
        }
        Relationships: []
      }
      product_posts: {
        Row: {
          agree_count: number | null
          avatar_url: string | null
          body: string
          created_at: string
          headline: string | null
          id: string
          photo_urls: string[] | null
          product_id: string
          skin_type: string | null
          updated_at: string
          usage_duration: string | null
          user_id: string
          username: string | null
          verdict: string | null
        }
        Insert: {
          agree_count?: number | null
          avatar_url?: string | null
          body: string
          created_at?: string
          headline?: string | null
          id?: string
          photo_urls?: string[] | null
          product_id: string
          skin_type?: string | null
          updated_at?: string
          usage_duration?: string | null
          user_id: string
          username?: string | null
          verdict?: string | null
        }
        Update: {
          agree_count?: number | null
          avatar_url?: string | null
          body?: string
          created_at?: string
          headline?: string | null
          id?: string
          photo_urls?: string[] | null
          product_id?: string
          skin_type?: string | null
          updated_at?: string
          usage_duration?: string | null
          user_id?: string
          username?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_retailer_links: {
        Row: {
          affiliate_url: string | null
          created_at: string
          id: string
          in_stock: boolean
          price: number | null
          product_id: string
          product_url: string | null
          retailer_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          affiliate_url?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          price?: number | null
          product_id: string
          product_url?: string | null
          retailer_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          affiliate_url?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          price?: number | null
          product_id?: string
          product_url?: string | null
          retailer_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_retailer_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_retailer_links_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          aliases: string[] | null
          brand: string
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          field_provenance: Json
          id: string
          image_url: string | null
          image_urls: string[] | null
          ingredients: string[] | null
          is_active: boolean | null
          is_priority_review_target: boolean | null
          is_top_pick: boolean | null
          key_ingredients: string[] | null
          legacy_category: string | null
          legacy_product_type: string | null
          legacy_subcategory: string | null
          name: string
          price: number | null
          product_family_name: string | null
          product_type: string | null
          product_url: string | null
          shade_name: string | null
          size_variant: string | null
          skintea_score: number | null
          source: string | null
          subcategory: string | null
        }
        Insert: {
          aliases?: string[] | null
          brand: string
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          field_provenance?: Json
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          ingredients?: string[] | null
          is_active?: boolean | null
          is_priority_review_target?: boolean | null
          is_top_pick?: boolean | null
          key_ingredients?: string[] | null
          legacy_category?: string | null
          legacy_product_type?: string | null
          legacy_subcategory?: string | null
          name: string
          price?: number | null
          product_family_name?: string | null
          product_type?: string | null
          product_url?: string | null
          shade_name?: string | null
          size_variant?: string | null
          skintea_score?: number | null
          source?: string | null
          subcategory?: string | null
        }
        Update: {
          aliases?: string[] | null
          brand?: string
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          field_provenance?: Json
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          ingredients?: string[] | null
          is_active?: boolean | null
          is_priority_review_target?: boolean | null
          is_top_pick?: boolean | null
          key_ingredients?: string[] | null
          legacy_category?: string | null
          legacy_product_type?: string | null
          legacy_subcategory?: string | null
          name?: string
          price?: number | null
          product_family_name?: string | null
          product_type?: string | null
          product_url?: string | null
          shade_name?: string | null
          size_variant?: string | null
          skintea_score?: number | null
          source?: string | null
          subcategory?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
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
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
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
          username?: string | null
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          answers: Json
          created_at: string
          derived_concerns: string[] | null
          derived_skin_type: string | null
          id: string
          lead_id: string
          quiz_version: number
          share_slug: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          derived_concerns?: string[] | null
          derived_skin_type?: string | null
          id?: string
          lead_id: string
          quiz_version?: number
          share_slug?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          derived_concerns?: string[] | null
          derived_skin_type?: string | null
          id?: string
          lead_id?: string
          quiz_version?: number
          share_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_handover_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          affiliate_id: string | null
          affiliate_param_template: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          search_url_template: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          affiliate_param_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          search_url_template?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          affiliate_param_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          search_url_template?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      saved_clinics: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_clinics_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          post_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          post_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_clinic_archive: {
        Row: {
          archived_at: string
          id: number
          reason: string
          row_data: Json
          source_table: string
        }
        Insert: {
          archived_at?: string
          id?: number
          reason: string
          row_data: Json
          source_table: string
        }
        Update: {
          archived_at?: string
          id?: number
          reason?: string
          row_data?: Json
          source_table?: string
        }
        Relationships: []
      }
      shelf_items: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          is_public: boolean
          is_top_pick: boolean
          match: string | null
          product_id: string | null
          product_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          is_top_pick?: boolean
          match?: string | null
          product_id?: string | null
          product_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          is_top_pick?: boolean
          match?: string | null
          product_id?: string | null
          product_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      social_review_tags: {
        Row: {
          age_bracket: string | null
          author_handle: string | null
          brand: string | null
          comment_id: string | null
          confidence: string | null
          content: string | null
          created_at: string | null
          disclosure: string[] | null
          id: string
          language: string | null
          likes: number | null
          platform: string
          post_created_utc: string | null
          post_id: string | null
          product_family_name: string | null
          product_id: string | null
          quote: string | null
          sentiment: string | null
          skin_type: string | null
          source_query_type: string | null
          source_thumbnail_url: string | null
          source_url: string | null
          subreddit: string | null
          tagged_at: string | null
          thumbnail_path: string | null
          views: number | null
        }
        Insert: {
          age_bracket?: string | null
          author_handle?: string | null
          brand?: string | null
          comment_id?: string | null
          confidence?: string | null
          content?: string | null
          created_at?: string | null
          disclosure?: string[] | null
          id?: string
          language?: string | null
          likes?: number | null
          platform: string
          post_created_utc?: string | null
          post_id?: string | null
          product_family_name?: string | null
          product_id?: string | null
          quote?: string | null
          sentiment?: string | null
          skin_type?: string | null
          source_query_type?: string | null
          source_thumbnail_url?: string | null
          source_url?: string | null
          subreddit?: string | null
          tagged_at?: string | null
          thumbnail_path?: string | null
          views?: number | null
        }
        Update: {
          age_bracket?: string | null
          author_handle?: string | null
          brand?: string | null
          comment_id?: string | null
          confidence?: string | null
          content?: string | null
          created_at?: string | null
          disclosure?: string[] | null
          id?: string
          language?: string | null
          likes?: number | null
          platform?: string
          post_created_utc?: string | null
          post_id?: string | null
          product_family_name?: string | null
          product_id?: string | null
          quote?: string | null
          sentiment?: string | null
          skin_type?: string | null
          source_query_type?: string | null
          source_thumbnail_url?: string | null
          source_url?: string | null
          subreddit?: string | null
          tagged_at?: string | null
          thumbnail_path?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_review_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      treatment_before_afters: {
        Row: {
          after_url: string | null
          age: number | null
          before_url: string | null
          created_at: string | null
          field_provenance: Json
          id: string
          is_active: boolean | null
          outcome: string | null
          sessions: string | null
          skin_type: string | null
          treatment_id: string | null
        }
        Insert: {
          after_url?: string | null
          age?: number | null
          before_url?: string | null
          created_at?: string | null
          field_provenance?: Json
          id?: string
          is_active?: boolean | null
          outcome?: string | null
          sessions?: string | null
          skin_type?: string | null
          treatment_id?: string | null
        }
        Update: {
          after_url?: string | null
          age?: number | null
          before_url?: string | null
          created_at?: string | null
          field_provenance?: Json
          id?: string
          is_active?: boolean | null
          outcome?: string | null
          sessions?: string | null
          skin_type?: string | null
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_before_afters_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_influencers: {
        Row: {
          created_at: string
          display_name: string | null
          field_provenance: Json
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
          field_provenance?: Json
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
          field_provenance?: Json
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
      treatment_logs: {
        Row: {
          category: string | null
          clinic_id: string | null
          clinic_name: string | null
          cost: string | null
          created_at: string
          date: string | null
          emoji: string | null
          fixed: string[]
          id: string
          is_public: boolean
          notes: string | null
          rating: number | null
          treatment_id: string | null
          treatment_name: string
          treatment_slug: string | null
          updated_at: string
          user_id: string
          working: string[]
        }
        Insert: {
          category?: string | null
          clinic_id?: string | null
          clinic_name?: string | null
          cost?: string | null
          created_at?: string
          date?: string | null
          emoji?: string | null
          fixed?: string[]
          id?: string
          is_public?: boolean
          notes?: string | null
          rating?: number | null
          treatment_id?: string | null
          treatment_name: string
          treatment_slug?: string | null
          updated_at?: string
          user_id: string
          working?: string[]
        }
        Update: {
          category?: string | null
          clinic_id?: string | null
          clinic_name?: string | null
          cost?: string | null
          created_at?: string
          date?: string | null
          emoji?: string | null
          fixed?: string[]
          id?: string
          is_public?: boolean
          notes?: string | null
          rating?: number | null
          treatment_id?: string | null
          treatment_name?: string
          treatment_slug?: string | null
          updated_at?: string
          user_id?: string
          working?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "treatment_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_logs_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_reviews: {
        Row: {
          age_bracket: string | null
          author_handle: string | null
          comment_count: number | null
          content: string | null
          cost_paid_usd: number | null
          created_at: string | null
          field_provenance: Json
          id: string
          is_first_time: boolean | null
          likes: number | null
          platform: string
          regret_reason: string | null
          sensitive_skin: boolean | null
          sentiment: string | null
          source_url: string | null
          subreddit: string | null
          tag_confidence: string | null
          tagged_at: string | null
          treatment_id: string | null
          upvotes: number | null
          verdict: string | null
          views: number | null
        }
        Insert: {
          age_bracket?: string | null
          author_handle?: string | null
          comment_count?: number | null
          content?: string | null
          cost_paid_usd?: number | null
          created_at?: string | null
          field_provenance?: Json
          id?: string
          is_first_time?: boolean | null
          likes?: number | null
          platform: string
          regret_reason?: string | null
          sensitive_skin?: boolean | null
          sentiment?: string | null
          source_url?: string | null
          subreddit?: string | null
          tag_confidence?: string | null
          tagged_at?: string | null
          treatment_id?: string | null
          upvotes?: number | null
          verdict?: string | null
          views?: number | null
        }
        Update: {
          age_bracket?: string | null
          author_handle?: string | null
          comment_count?: number | null
          content?: string | null
          cost_paid_usd?: number | null
          created_at?: string | null
          field_provenance?: Json
          id?: string
          is_first_time?: boolean | null
          likes?: number | null
          platform?: string
          regret_reason?: string | null
          sensitive_skin?: boolean | null
          sentiment?: string | null
          source_url?: string | null
          subreddit?: string | null
          tag_confidence?: string | null
          tagged_at?: string | null
          treatment_id?: string | null
          upvotes?: number | null
          verdict?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_reviews_treatment_id_fkey"
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
          field_provenance: Json
          how_it_works: string | null
          id: string
          majority_pct: number | null
          minority_opinion: string | null
          name: string
          results_duration: string | null
          results_pct: number | null
          sessions_recommended: string | null
          slug: string | null
          sort_order: number
          subtitle: string | null
          updated_at: string
          what_it_is: string | null
          who_its_for: string | null
          who_its_not_for: string | null
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
          field_provenance?: Json
          how_it_works?: string | null
          id?: string
          majority_pct?: number | null
          minority_opinion?: string | null
          name: string
          results_duration?: string | null
          results_pct?: number | null
          sessions_recommended?: string | null
          slug?: string | null
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
          what_it_is?: string | null
          who_its_for?: string | null
          who_its_not_for?: string | null
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
          field_provenance?: Json
          how_it_works?: string | null
          id?: string
          majority_pct?: number | null
          minority_opinion?: string | null
          name?: string
          results_duration?: string | null
          results_pct?: number | null
          sessions_recommended?: string | null
          slug?: string | null
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
          what_it_is?: string | null
          who_its_for?: string | null
          who_its_not_for?: string | null
        }
        Relationships: []
      }
      trending_treatments: {
        Row: {
          created_at: string | null
          emoji: string
          field_provenance: Json
          id: string
          is_active: boolean
          keywords: string[]
          label: string
          month: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          emoji: string
          field_provenance?: Json
          id?: string
          is_active?: boolean
          keywords?: string[]
          label: string
          month: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          emoji?: string
          field_provenance?: Json
          id?: string
          is_active?: boolean
          keywords?: string[]
          label?: string
          month?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      clinic_visitor_profile: {
        Row: {
          clinic_id: string | null
          combination: number | null
          dry: number | null
          normal: number | null
          oily: number | null
          sensitive: number | null
          skin_type_unknown: number | null
          visitors: number | null
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
      lead_funnel_daily: {
        Row: {
          contactable: number | null
          day: string | null
          drive_by_sessions: number | null
          leads_created: number | null
          qualified_leads: number | null
          reached_stage_1: number | null
          reached_stage_2: number | null
          with_zip: number | null
        }
        Relationships: []
      }
      lead_handover_queue: {
        Row: {
          age_bracket: string | null
          budget_band: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string | null
          intent_stage_version: number | null
          interest_treatments: string[] | null
          is_first_time: boolean | null
          session_id: string | null
          skin_type: string | null
          stage_2_at: string | null
          zip: string | null
        }
        Insert: {
          age_bracket?: string | null
          budget_band?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          intent_stage_version?: number | null
          interest_treatments?: never
          is_first_time?: boolean | null
          session_id?: string | null
          skin_type?: string | null
          stage_2_at?: string | null
          zip?: string | null
        }
        Update: {
          age_bracket?: string | null
          budget_band?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          intent_stage_version?: number | null
          interest_treatments?: never
          is_first_time?: boolean | null
          session_id?: string | null
          skin_type?: string | null
          stage_2_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      publish_replacement_list: {
        Row: {
          clinic_id: string | null
          clinic_name: string | null
          item: string | null
          kind: string | null
          listing_filter: string | null
          recorded_at: string | null
          source: string | null
          url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      browse_facets: {
        Args: {
          p_category?: string
          p_product_type?: string
          p_q?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          max_price: number
          min_price: number
          product_count: number
        }[]
      }
      browse_products: {
        Args: {
          p_brands?: string[]
          p_category?: string
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_product_type?: string
          p_q?: string
          p_sort?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          decisive_tags: number
          id: string
          image_url: string
          name: string
          price: number
          product_family_name: string
          product_type: string
          recommend_pct: number
          subcategory: string
          total_count: number
          total_views: number
          video_count: number
        }[]
      }
      catalog_brand_facets: {
        Args: {
          p_category?: string
          p_product_type?: string
          p_search?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          n: number
        }[]
      }
      catalog_products: {
        Args: {
          p_brands?: string[]
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_price_max?: number
          p_price_min?: number
          p_product_type?: string
          p_search?: string
          p_sort?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          name: string
          price: number
          product_family_name: string
          product_type: string
          product_url: string
          shade_count: number
          shade_name: string
          size_variant: string
          social_count: number
          source: string
          subcategory: string
          tiktok_views: number
          total_count: number
        }[]
      }
      category_counts: {
        Args: never
        Returns: {
          category: string
          product_count: number
        }[]
      }
      clinic_intent_report: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          bookings: number
          bookings_via_call: number
          bookings_via_website: number
          calls: number
          clinic_id: string
          clinic_name: string
          directions: number
          first_event: string
          last_event: string
          listed: boolean
          phone_intents: number
          sessions: number
          social_opens: number
          total_actions: number
          website_opens: number
        }[]
      }
      clinic_photos_valid: { Args: { p: Json }; Returns: boolean }
      distinct_product_subcategories: {
        Args: never
        Returns: {
          category: string
          product_type: string
          subcategory: string
        }[]
      }
      lead_event_add: {
        Args: { p_event_type: string; p_payload?: Json; p_session_id: string }
        Returns: string
      }
      lead_upsert: {
        Args: {
          p_age_bracket?: string
          p_budget_band?: string
          p_city?: string
          p_contact_consent?: boolean
          p_email?: string
          p_is_first_time?: boolean
          p_other_treatment_note?: string
          p_session_id: string
          p_skin_type?: string
          p_treatment_ids?: string[]
          p_zip?: string
        }
        Returns: string
      }
      quiz_response_save: {
        Args: {
          p_answers: Json
          p_budget_band?: string
          p_derived_concerns?: string[]
          p_derived_skin_type?: string
          p_is_first_time?: boolean
          p_quiz_version?: number
          p_session_id: string
          p_treatment_ids?: string[]
          p_treatment_interest?: string
          p_zip?: string
        }
        Returns: string
      }
      random_active_products: {
        Args: {
          p_category?: string
          p_limit?: number
          p_product_type?: string
          p_subcategory?: string
        }
        Returns: {
          aliases: string[] | null
          brand: string
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          field_provenance: Json
          id: string
          image_url: string | null
          image_urls: string[] | null
          ingredients: string[] | null
          is_active: boolean | null
          is_priority_review_target: boolean | null
          is_top_pick: boolean | null
          key_ingredients: string[] | null
          legacy_category: string | null
          legacy_product_type: string | null
          legacy_subcategory: string | null
          name: string
          price: number | null
          product_family_name: string | null
          product_type: string | null
          product_url: string | null
          shade_name: string | null
          size_variant: string | null
          skintea_score: number | null
          source: string | null
          subcategory: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ranked_products: {
        Args: {
          p_category?: string
          p_limit?: number
          p_metric?: string
          p_product_type?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          metric_count: number
          metric_value: number
          name: string
          price: number
          product_family_name: string
          product_type: string
          product_url: string
          shade_name: string
          size_variant: string
          source: string
          subcategory: string
        }[]
      }
      ranked_products_recommended: {
        Args: {
          p_category?: string
          p_limit?: number
          p_min_tags?: number
          p_product_type?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          metric_secondary: number
          metric_value: number
          name: string
          price: number
          product_family_name: string
          product_type: string
          product_url: string
          shade_name: string
          size_variant: string
          source: string
          subcategory: string
        }[]
      }
      ranked_products_soaring: {
        Args: {
          p_category?: string
          p_days?: number
          p_limit?: number
          p_product_type?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          metric_secondary: number
          metric_value: number
          name: string
          price: number
          product_family_name: string
          product_type: string
          product_url: string
          shade_name: string
          size_variant: string
          source: string
          subcategory: string
        }[]
      }
      ranked_products_tiktok: {
        Args: {
          p_category?: string
          p_limit?: number
          p_product_type?: string
          p_subcategory?: string
        }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          metric_secondary: number
          metric_value: number
          name: string
          price: number
          product_family_name: string
          product_type: string
          product_url: string
          shade_name: string
          size_variant: string
          source: string
          subcategory: string
        }[]
      }
      ranking_recommended: {
        Args: { p_category?: string; p_limit?: number; p_min_tags?: number }
        Returns: {
          brand: string
          category: string
          currency: string
          decisive_tags: number
          id: string
          image_url: string
          min_tags: number
          name: string
          positive_tags: number
          price: number
          product_family_name: string
          product_type: string
          recommend_pct: number
          subcategory: string
        }[]
      }
      ranking_soaring: {
        Args: { p_category?: string; p_days?: number; p_limit?: number }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          name: string
          price: number
          product_family_name: string
          product_type: string
          recent_posts: number
          subcategory: string
          total_views: number
          window_days: number
        }[]
      }
      ranking_tiktok: {
        Args: { p_category?: string; p_limit?: number }
        Returns: {
          brand: string
          category: string
          currency: string
          id: string
          image_url: string
          name: string
          price: number
          product_family_name: string
          product_type: string
          subcategory: string
          total_views: number
          video_count: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
