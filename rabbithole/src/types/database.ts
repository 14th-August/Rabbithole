
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "id": string,"name": string,"parent_category_id": string | null,"position": number,"slug": string
                  }
                  Insert: {
                    "id"?: string,"name": string,"parent_category_id"?: string | null,"position"?: number,"slug": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"parent_category_id"?: string | null,"position"?: number,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_category_id_fkey"
      columns: ["parent_category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "buyer_id": string,"closed_at": string | null,"created_at": string,"id": string,"last_message_at": string,"listing_id": string,"seller_id": string
                  }
                  Insert: {
                    "buyer_id": string,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"last_message_at"?: string,"listing_id": string,"seller_id": string
                  }
                  Update: {
                    "buyer_id"?: string,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"last_message_at"?: string,"listing_id"?: string,"seller_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listing_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"followed_id": string,"follower_id": string,"notify": boolean
                  }
                  Insert: {
                    "created_at"?: string,"followed_id": string,"follower_id": string,"notify"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"followed_id"?: string,"follower_id"?: string,"notify"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_followed_id_fkey"
      columns: ["followed_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_followed_id_fkey"
      columns: ["followed_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_followed_id_fkey"
      columns: ["followed_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_categories": {
                  Row: {
                    "category_id": string,"listing_id": string
                  }
                  Insert: {
                    "category_id": string,"listing_id": string
                  }
                  Update: {
                    "category_id"?: string,"listing_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_categories_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listing_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_categories_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_images": {
                  Row: {
                    "height": number | null,"id": string,"listing_id": string,"position": number,"storage_path": string,"width": number | null
                  }
                  Insert: {
                    "height"?: number | null,"id"?: string,"listing_id": string,"position": number,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "height"?: number | null,"id"?: string,"listing_id"?: string,"position"?: number,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_images_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listing_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_images_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_tags": {
                  Row: {
                    "listing_id": string,"tag_id": string
                  }
                  Insert: {
                    "listing_id": string,"tag_id": string
                  }
                  Update: {
                    "listing_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_tags_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listing_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_tags_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "accepts_cash": boolean,"accepts_etransfer": boolean,"bumped_at": string,"campus": Database["public"]['Enums']["campus"],"category_id": string,"condition": Database["public"]['Enums']["listing_condition"],"created_at": string,"default_meetup_spot_id": string | null,"description": string,"expires_at": string,"id": string,"is_negotiable": boolean,"pickup_hint": string | null,"price_cents": number,"search_vector": unknown,"seller_id": string,"sold_at": string | null,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "accepts_cash"?: boolean,"accepts_etransfer"?: boolean,"bumped_at"?: string,"campus": Database["public"]['Enums']["campus"],"category_id": string,"condition": Database["public"]['Enums']["listing_condition"],"created_at"?: string,"default_meetup_spot_id"?: string | null,"description"?: string,"expires_at"?: string,"id"?: string,"is_negotiable"?: boolean,"pickup_hint"?: string | null,"price_cents": number,"search_vector"?: never,"seller_id": string,"sold_at"?: string | null,"status"?: Database["public"]['Enums']["listing_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "accepts_cash"?: boolean,"accepts_etransfer"?: boolean,"bumped_at"?: string,"campus"?: Database["public"]['Enums']["campus"],"category_id"?: string,"condition"?: Database["public"]['Enums']["listing_condition"],"created_at"?: string,"default_meetup_spot_id"?: string | null,"description"?: string,"expires_at"?: string,"id"?: string,"is_negotiable"?: boolean,"pickup_hint"?: string | null,"price_cents"?: number,"search_vector"?: never,"seller_id"?: string,"sold_at"?: string | null,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_default_meetup_spot_id_fkey"
      columns: ["default_meetup_spot_id"]
isOneToOne: false
      referencedRelation: "meetup_spots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meetup_spots": {
                  Row: {
                    "campus": Database["public"]['Enums']["campus"],"description": string | null,"id": string,"is_active": boolean,"name": string
                  }
                  Insert: {
                    "campus": Database["public"]['Enums']["campus"],"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "campus"?: Database["public"]['Enums']["campus"],"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"read_at": string | null,"sender_id": string
                  }
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "accepted_at": string | null,"amount_cents": number,"buyer_confirmed_at": string | null,"buyer_id": string,"cancelled_at": string | null,"completed_at": string | null,"created_at": string,"id": string,"listing_id": string,"meetup_at": string | null,"meetup_confirmed_at": string | null,"meetup_spot_id": string | null,"payment_method": Database["public"]['Enums']["payment_method"],"seller_confirmed_at": string | null,"seller_id": string,"status": Database["public"]['Enums']["order_status"]
                  }
                  Insert: {
                    "accepted_at"?: string | null,"amount_cents": number,"buyer_confirmed_at"?: string | null,"buyer_id": string,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"listing_id": string,"meetup_at"?: string | null,"meetup_confirmed_at"?: string | null,"meetup_spot_id"?: string | null,"payment_method": Database["public"]['Enums']["payment_method"],"seller_confirmed_at"?: string | null,"seller_id": string,"status"?: Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"amount_cents"?: number,"buyer_confirmed_at"?: string | null,"buyer_id"?: string,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"listing_id"?: string,"meetup_at"?: string | null,"meetup_confirmed_at"?: string | null,"meetup_spot_id"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"],"seller_confirmed_at"?: string | null,"seller_id"?: string,"status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listing_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_meetup_spot_id_fkey"
      columns: ["meetup_spot_id"]
isOneToOne: false
      referencedRelation: "meetup_spots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "allow_follows": boolean,"avatar_path": string | null,"bio": string | null,"campus": Database["public"]['Enums']["campus"] | null,"completed_sales": number,"created_at": string,"id": string,"last_active_at": string | null,"median_response_minutes": number | null,"notify_listing_expiry": boolean,"notify_messages": boolean,"notify_new_listings": boolean,"notify_orders": boolean,"rating_avg": number | null,"rating_count": number,"rating_sum": number,"response_rate": number | null,"show_last_active": boolean,"status": Database["public"]['Enums']["account_status"],"updated_at": string,"username": string,"viu_verified_at": string | null
                  }
                  Insert: {
                    "allow_follows"?: boolean,"avatar_path"?: string | null,"bio"?: string | null,"campus"?: Database["public"]['Enums']["campus"] | null,"completed_sales"?: number,"created_at"?: string,"id": string,"last_active_at"?: string | null,"median_response_minutes"?: number | null,"notify_listing_expiry"?: boolean,"notify_messages"?: boolean,"notify_new_listings"?: boolean,"notify_orders"?: boolean,"rating_avg"?: never,"rating_count"?: number,"rating_sum"?: number,"response_rate"?: number | null,"show_last_active"?: boolean,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string,"username": string,"viu_verified_at"?: string | null
                  }
                  Update: {
                    "allow_follows"?: boolean,"avatar_path"?: string | null,"bio"?: string | null,"campus"?: Database["public"]['Enums']["campus"] | null,"completed_sales"?: number,"created_at"?: string,"id"?: string,"last_active_at"?: string | null,"median_response_minutes"?: number | null,"notify_listing_expiry"?: boolean,"notify_messages"?: boolean,"notify_new_listings"?: boolean,"notify_orders"?: boolean,"rating_avg"?: never,"rating_count"?: number,"rating_sum"?: number,"response_rate"?: number | null,"show_last_active"?: boolean,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string,"username"?: string,"viu_verified_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"reviews": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"order_id": string,"rating": number,"reviewee_id": string,"reviewer_id": string
                  }
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"order_id": string,"rating": number,"reviewee_id": string,"reviewer_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"order_id"?: string,"rating"?: number,"reviewee_id"?: string,"reviewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_listings": {
                  Row: {
                    "created_at": string,"listing_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"listing_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"listing_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_listings_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listing_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_listings_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_listings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_listings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_listings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "id": string,"name": string
                  }
                  Insert: {
                    "id"?: string,"name": string
                  }
                  Update: {
                    "id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_devices": {
                  Row: {
                    "expo_push_token": string,"id": string,"platform": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "expo_push_token": string,"id"?: string,"platform": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "expo_push_token"?: string,"id"?: string,"platform"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "listing_summaries": {
                  Row: {
                    "accepts_cash": boolean | null,"accepts_etransfer": boolean | null,"bumped_at": string | null,"campus": Database["public"]['Enums']["campus"] | null,"category_id": string | null,"condition": Database["public"]['Enums']["listing_condition"] | null,"created_at": string | null,"description": string | null,"expires_at": string | null,"id": string | null,"image_count": number | null,"is_negotiable": boolean | null,"is_saved": boolean | null,"meetup_spot": Json | null,"pickup_hint": string | null,"price_cents": number | null,"primary_image": Json | null,"seller": Json | null,"seller_id": string | null,"sold_at": string | null,"status": Database["public"]['Enums']["listing_status"] | null,"title": string | null,"updated_at": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "my_profile"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"my_profile": {
                  Row: {
                    "allow_follows": boolean | null,"avatar_path": string | null,"bio": string | null,"campus": Database["public"]['Enums']["campus"] | null,"completed_sales": number | null,"created_at": string | null,"id": string | null,"last_active_at": string | null,"median_response_minutes": number | null,"notify_listing_expiry": boolean | null,"notify_messages": boolean | null,"notify_new_listings": boolean | null,"notify_orders": boolean | null,"rating_avg": number | null,"rating_count": number | null,"response_rate": number | null,"show_last_active": boolean | null,"status": Database["public"]['Enums']["account_status"] | null,"updated_at": string | null,"username": string | null,"viu_verified_at": string | null
                  }
                  Insert: {
                           "allow_follows"?: boolean | null,"avatar_path"?: string | null,"bio"?: string | null,"campus"?: Database["public"]['Enums']["campus"] | null,"completed_sales"?: number | null,"created_at"?: string | null,"id"?: string | null,"last_active_at"?: string | null,"median_response_minutes"?: number | null,"notify_listing_expiry"?: boolean | null,"notify_messages"?: boolean | null,"notify_new_listings"?: boolean | null,"notify_orders"?: boolean | null,"rating_avg"?: number | null,"rating_count"?: number | null,"response_rate"?: number | null,"show_last_active"?: boolean | null,"status"?: Database["public"]['Enums']["account_status"] | null,"updated_at"?: string | null,"username"?: string | null,"viu_verified_at"?: string | null
                         }
                        Update: {
                           "allow_follows"?: boolean | null,"avatar_path"?: string | null,"bio"?: string | null,"campus"?: Database["public"]['Enums']["campus"] | null,"completed_sales"?: number | null,"created_at"?: string | null,"id"?: string | null,"last_active_at"?: string | null,"median_response_minutes"?: number | null,"notify_listing_expiry"?: boolean | null,"notify_messages"?: boolean | null,"notify_new_listings"?: boolean | null,"notify_orders"?: boolean | null,"rating_avg"?: number | null,"rating_count"?: number | null,"response_rate"?: number | null,"show_last_active"?: boolean | null,"status"?: Database["public"]['Enums']["account_status"] | null,"updated_at"?: string | null,"username"?: string | null,"viu_verified_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"public_profiles": {
                  Row: {
                    "allow_follows": boolean | null,"avatar_path": string | null,"bio": string | null,"campus": Database["public"]['Enums']["campus"] | null,"completed_sales": number | null,"created_at": string | null,"id": string | null,"last_active_at": string | null,"median_response_minutes": number | null,"rating_avg": number | null,"rating_count": number | null,"response_rate": number | null,"status": Database["public"]['Enums']["account_status"] | null,"username": string | null,"viu_verified_at": string | null
                  }
                  Insert: {
                           "allow_follows"?: boolean | null,"avatar_path"?: string | null,"bio"?: string | null,"campus"?: Database["public"]['Enums']["campus"] | null,"completed_sales"?: number | null,"created_at"?: string | null,"id"?: string | null,"last_active_at"?: never,"median_response_minutes"?: number | null,"rating_avg"?: number | null,"rating_count"?: number | null,"response_rate"?: number | null,"status"?: Database["public"]['Enums']["account_status"] | null,"username"?: string | null,"viu_verified_at"?: string | null
                         }
                        Update: {
                           "allow_follows"?: boolean | null,"avatar_path"?: string | null,"bio"?: string | null,"campus"?: Database["public"]['Enums']["campus"] | null,"completed_sales"?: number | null,"created_at"?: string | null,"id"?: string | null,"last_active_at"?: never,"median_response_minutes"?: number | null,"rating_avg"?: number | null,"rating_count"?: number | null,"response_rate"?: number | null,"status"?: Database["public"]['Enums']["account_status"] | null,"username"?: string | null,"viu_verified_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "accept_order":
{ Args: { "p_meetup_at"?: string,"p_meetup_spot_id"?: string,"p_order_id": string }; Returns: undefined
                           },
"before_user_created_viu_gate":
{ Args: { "event": Json }; Returns: Json
                           },
"cancel_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"confirm_handoff":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"confirm_meetup":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"decline_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"expire_stale_listings":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"expire_stale_orders":
{ Args: { "p_after"?: string }; Returns: number
                           },
"generate_username":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_account_active":
{ Args: { "p_user": string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "p_one": string,"p_other": string }; Returns: boolean
                           },
"is_username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"mark_conversation_read":
{ Args: { "p_conversation_id": string }; Returns: number
                           },
"register_device":
{ Args: { "p_expo_push_token": string,"p_platform": string }; Returns: undefined
                           },
"renew_listing":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"request_order":
{ Args: { "p_listing_id": string,"p_payment_method": Database["public"]['Enums']["payment_method"] }; Returns: string
                           },
"submit_report":
{ Args: { "p_details"?: string,"p_listing_id"?: string,"p_message_id"?: string,"p_reason": Database["public"]['Enums']["report_reason"],"p_user_id"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "account_status": "active"|"suspended"|"banned"|"deleted","campus": "nanaimo"|"cowichan"|"powell_river"|"parksville_qualicum","listing_condition": "new"|"like_new"|"good"|"fair"|"poor","listing_status": "draft"|"active"|"reserved"|"sold"|"removed"|"expired","order_status": "requested"|"accepted"|"completed"|"declined"|"cancelled"|"expired","payment_method": "cash"|"etransfer","report_reason": "prohibited_item"|"academic_dishonesty"|"scam_or_fraud"|"counterfeit"|"harassment"|"spam"|"other","report_status": "open"|"reviewing"|"actioned"|"dismissed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "suspended", "banned", "deleted"],"campus": ["nanaimo", "cowichan", "powell_river", "parksville_qualicum"],"listing_condition": ["new", "like_new", "good", "fair", "poor"],"listing_status": ["draft", "active", "reserved", "sold", "removed", "expired"],"order_status": ["requested", "accepted", "completed", "declined", "cancelled", "expired"],"payment_method": ["cash", "etransfer"],"report_reason": ["prohibited_item", "academic_dishonesty", "scam_or_fraud", "counterfeit", "harassment", "spam", "other"],"report_status": ["open", "reviewing", "actioned", "dismissed"]
          }
        }
} as const
