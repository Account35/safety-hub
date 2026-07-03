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
      campaign_delivery: {
        Row: {
          campaign_id: string
          created_at: string
          delivered_timestamp: string | null
          device_token: string | null
          id: string
          opened_timestamp: string | null
          recipient_user_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivered_timestamp?: string | null
          device_token?: string | null
          id?: string
          opened_timestamp?: string | null
          recipient_user_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivered_timestamp?: string | null
          device_token?: string | null
          id?: string
          opened_timestamp?: string | null
          recipient_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_delivery_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body_content: string
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          case_id: string | null
          case_type: string | null
          created_at: string
          created_by: string | null
          id: string
          language_code: string
          scheduled_send_timestamp: string
          sent_timestamp: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_audience: Database["public"]["Enums"]["campaign_audience"]
          target_townships: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body_content: string
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          case_id?: string | null
          case_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          language_code?: string
          scheduled_send_timestamp: string
          sent_timestamp?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_audience?: Database["public"]["Enums"]["campaign_audience"]
          target_townships?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body_content?: string
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          case_id?: string | null
          case_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          language_code?: string
          scheduled_send_timestamp?: string
          sent_timestamp?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_audience?: Database["public"]["Enums"]["campaign_audience"]
          target_townships?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          case_id: string
          case_name: string | null
          case_photo: string | null
          case_type: string
          closure_reason: string | null
          created_at: string
          id: string
          last_activity_at: string
          officer_id: string | null
          report_id: string
          reporter_anon_code: string
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          case_id: string
          case_name?: string | null
          case_photo?: string | null
          case_type: string
          closure_reason?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          officer_id?: string | null
          report_id: string
          reporter_anon_code: string
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          case_name?: string | null
          case_photo?: string | null
          case_type?: string
          closure_reason?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          officer_id?: string | null
          report_id?: string
          reporter_anon_code?: string
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_reference: string | null
          conversation_id: string
          delivered_at: string | null
          id: string
          is_deleted: boolean
          message_content: string
          read_at: string | null
          sender_type: string
          sent_at: string
        }
        Insert: {
          attachment_reference?: string | null
          conversation_id: string
          delivered_at?: string | null
          id?: string
          is_deleted?: boolean
          message_content: string
          read_at?: string | null
          sender_type: string
          sent_at?: string
        }
        Update: {
          attachment_reference?: string | null
          conversation_id?: string
          delivered_at?: string | null
          id?: string
          is_deleted?: boolean
          message_content?: string
          read_at?: string | null
          sender_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_persons: {
        Row: {
          age_at_disappearance: number | null
          build: string | null
          case_status: Database["public"]["Enums"]["case_status"]
          circumstances: Database["public"]["Enums"]["disappearance_circumstance"]
          circumstances_narrative: string | null
          cognitive_impairment: boolean
          complexion: string | null
          created_at: string
          distinguishing_features: string[]
          ethnicity: string | null
          eye_color: string | null
          family_contact_name: string | null
          family_contact_phone: string | null
          full_name: string
          gender: string | null
          hair_color: string | null
          height_cm: number | null
          id: string
          is_endangered: boolean
          last_seen_at: string | null
          last_seen_clothing: string | null
          last_seen_location: string | null
          medical_conditions: string[]
          photos: string[]
          possessions: string[]
          special_needs: string[]
          updated_at: string
          vulnerability_indicators: string[]
          weight_kg: number | null
        }
        Insert: {
          age_at_disappearance?: number | null
          build?: string | null
          case_status?: Database["public"]["Enums"]["case_status"]
          circumstances?: Database["public"]["Enums"]["disappearance_circumstance"]
          circumstances_narrative?: string | null
          cognitive_impairment?: boolean
          complexion?: string | null
          created_at?: string
          distinguishing_features?: string[]
          ethnicity?: string | null
          eye_color?: string | null
          family_contact_name?: string | null
          family_contact_phone?: string | null
          full_name: string
          gender?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          is_endangered?: boolean
          last_seen_at?: string | null
          last_seen_clothing?: string | null
          last_seen_location?: string | null
          medical_conditions?: string[]
          photos?: string[]
          possessions?: string[]
          special_needs?: string[]
          updated_at?: string
          vulnerability_indicators?: string[]
          weight_kg?: number | null
        }
        Update: {
          age_at_disappearance?: number | null
          build?: string | null
          case_status?: Database["public"]["Enums"]["case_status"]
          circumstances?: Database["public"]["Enums"]["disappearance_circumstance"]
          circumstances_narrative?: string | null
          cognitive_impairment?: boolean
          complexion?: string | null
          created_at?: string
          distinguishing_features?: string[]
          ethnicity?: string | null
          eye_color?: string | null
          family_contact_name?: string | null
          family_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          is_endangered?: boolean
          last_seen_at?: string | null
          last_seen_clothing?: string | null
          last_seen_location?: string | null
          medical_conditions?: string[]
          photos?: string[]
          possessions?: string[]
          special_needs?: string[]
          updated_at?: string
          vulnerability_indicators?: string[]
          weight_kg?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          delivery_channel: string
          new_message_notifications: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          report_status_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_channel?: string
          new_message_notifications?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          report_status_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_channel?: string
          new_message_notifications?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          report_status_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          created_at: string
          data_retention_acknowledged: boolean
          location_sharing_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_retention_acknowledged?: boolean
          location_sharing_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_retention_acknowledged?: boolean
          location_sharing_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          language_preference: string
          last_login_at: string | null
          phone_number: string | null
          phone_verified: boolean
          primary_township: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          language_preference?: string
          last_login_at?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          primary_township?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          language_preference?: string
          last_login_at?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          primary_township?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_ai_analysis: {
        Row: {
          analyst_reviewed: boolean
          cluster_confidence:
            | Database["public"]["Enums"]["cluster_confidence"]
            | null
          cluster_contradictions: Json
          cluster_id: string | null
          cluster_primary: boolean
          cluster_role: Database["public"]["Enums"]["cluster_role"] | null
          cluster_supporting_count: number
          concentrated_sighting: boolean
          created_at: string
          id: string
          key_details_extracted: Json
          quality_factors: string[]
          quality_score: number
          quality_tier: Database["public"]["Enums"]["quality_tier"]
          report_id: string
          status: Database["public"]["Enums"]["analysis_status"]
          suggested_case_matches: Json
          updated_at: string
        }
        Insert: {
          analyst_reviewed?: boolean
          cluster_confidence?:
            | Database["public"]["Enums"]["cluster_confidence"]
            | null
          cluster_contradictions?: Json
          cluster_id?: string | null
          cluster_primary?: boolean
          cluster_role?: Database["public"]["Enums"]["cluster_role"] | null
          cluster_supporting_count?: number
          concentrated_sighting?: boolean
          created_at?: string
          id?: string
          key_details_extracted?: Json
          quality_factors?: string[]
          quality_score?: number
          quality_tier?: Database["public"]["Enums"]["quality_tier"]
          report_id: string
          status?: Database["public"]["Enums"]["analysis_status"]
          suggested_case_matches?: Json
          updated_at?: string
        }
        Update: {
          analyst_reviewed?: boolean
          cluster_confidence?:
            | Database["public"]["Enums"]["cluster_confidence"]
            | null
          cluster_contradictions?: Json
          cluster_id?: string | null
          cluster_primary?: boolean
          cluster_role?: Database["public"]["Enums"]["cluster_role"] | null
          cluster_supporting_count?: number
          concentrated_sighting?: boolean
          created_at?: string
          id?: string
          key_details_extracted?: Json
          quality_factors?: string[]
          quality_score?: number
          quality_tier?: Database["public"]["Enums"]["quality_tier"]
          report_id?: string
          status?: Database["public"]["Enums"]["analysis_status"]
          suggested_case_matches?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_ai_analysis_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          accuracy_confirmed: boolean
          case_id: string
          case_type: string
          companion_description: string | null
          confidence_level: number | null
          created_at: string
          id: string
          location_approximate: Json | null
          location_landmarks: string[]
          location_privacy_level: string
          location_township: string | null
          photos: Json
          report_id: string
          reporter_anon_code: string
          reporter_id: string | null
          reporting_methods: string[]
          safety_acknowledgment: boolean
          sighting_date: string | null
          sighting_time: string | null
          status: string
          submission_timestamp: string
          text_description: string | null
          updated_at: string
          voice_recording_path: string | null
          voluntary_confirmed: boolean
        }
        Insert: {
          accuracy_confirmed?: boolean
          case_id: string
          case_type: string
          companion_description?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          location_approximate?: Json | null
          location_landmarks?: string[]
          location_privacy_level?: string
          location_township?: string | null
          photos?: Json
          report_id: string
          reporter_anon_code: string
          reporter_id?: string | null
          reporting_methods?: string[]
          safety_acknowledgment?: boolean
          sighting_date?: string | null
          sighting_time?: string | null
          status?: string
          submission_timestamp?: string
          text_description?: string | null
          updated_at?: string
          voice_recording_path?: string | null
          voluntary_confirmed?: boolean
        }
        Update: {
          accuracy_confirmed?: boolean
          case_id?: string
          case_type?: string
          companion_description?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          location_approximate?: Json | null
          location_landmarks?: string[]
          location_privacy_level?: string
          location_township?: string | null
          photos?: Json
          report_id?: string
          reporter_anon_code?: string
          reporter_id?: string | null
          reporting_methods?: string[]
          safety_acknowledgment?: boolean
          sighting_date?: string | null
          sighting_time?: string | null
          status?: string
          submission_timestamp?: string
          text_description?: string | null
          updated_at?: string
          voice_recording_path?: string | null
          voluntary_confirmed?: boolean
        }
        Relationships: []
      }
      townships_ref: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wanted_persons: {
        Row: {
          age: number | null
          aliases: string[]
          armed: boolean
          build: string | null
          complexion: string | null
          created_at: string
          crime_category: string | null
          crimes: Json
          danger_level: Database["public"]["Enums"]["danger_level"]
          distinguishing_features: string[]
          ethnicity: string | null
          eye_color: string | null
          full_name: string
          gender: string | null
          hair_color: string | null
          height_cm: number | null
          id: string
          investigating_officer: string | null
          is_active: boolean
          known_associates: string[]
          known_hangouts: string[]
          last_seen_at: string | null
          last_seen_location: string | null
          last_seen_notes: string | null
          photos: string[]
          reward_amount: number | null
          station: string | null
          updated_at: string
          vehicle: string | null
          warrant_number: string | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          aliases?: string[]
          armed?: boolean
          build?: string | null
          complexion?: string | null
          created_at?: string
          crime_category?: string | null
          crimes?: Json
          danger_level?: Database["public"]["Enums"]["danger_level"]
          distinguishing_features?: string[]
          ethnicity?: string | null
          eye_color?: string | null
          full_name: string
          gender?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          investigating_officer?: string | null
          is_active?: boolean
          known_associates?: string[]
          known_hangouts?: string[]
          last_seen_at?: string | null
          last_seen_location?: string | null
          last_seen_notes?: string | null
          photos?: string[]
          reward_amount?: number | null
          station?: string | null
          updated_at?: string
          vehicle?: string | null
          warrant_number?: string | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          aliases?: string[]
          armed?: boolean
          build?: string | null
          complexion?: string | null
          created_at?: string
          crime_category?: string | null
          crimes?: Json
          danger_level?: Database["public"]["Enums"]["danger_level"]
          distinguishing_features?: string[]
          ethnicity?: string | null
          eye_color?: string | null
          full_name?: string
          gender?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          investigating_officer?: string | null
          is_active?: boolean
          known_associates?: string[]
          known_hangouts?: string[]
          last_seen_at?: string | null
          last_seen_location?: string | null
          last_seen_notes?: string | null
          photos?: string[]
          reward_amount?: number | null
          station?: string | null
          updated_at?: string
          vehicle?: string | null
          warrant_number?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      analysis_status: "pending" | "complete" | "partial" | "failed"
      app_role:
        | "guest"
        | "user"
        | "detective"
        | "analyst"
        | "moderator"
        | "admin"
        | "super_admin"
      campaign_audience: "all_users" | "registered_only"
      campaign_status: "draft" | "scheduled" | "sent" | "cancelled"
      campaign_type:
        | "safety_tip"
        | "missing_person_alert"
        | "wanted_person_alert"
        | "general_announcement"
      case_status: "active" | "found" | "closed"
      cluster_confidence: "high" | "medium"
      cluster_role: "primary" | "supporting"
      danger_level: "high" | "medium" | "low"
      disappearance_circumstance:
        | "voluntary"
        | "family_conflict"
        | "endangered"
        | "medical"
        | "unknown"
      quality_tier: "detailed" | "standard" | "limited"
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
      analysis_status: ["pending", "complete", "partial", "failed"],
      app_role: [
        "guest",
        "user",
        "detective",
        "analyst",
        "moderator",
        "admin",
        "super_admin",
      ],
      campaign_audience: ["all_users", "registered_only"],
      campaign_status: ["draft", "scheduled", "sent", "cancelled"],
      campaign_type: [
        "safety_tip",
        "missing_person_alert",
        "wanted_person_alert",
        "general_announcement",
      ],
      case_status: ["active", "found", "closed"],
      cluster_confidence: ["high", "medium"],
      cluster_role: ["primary", "supporting"],
      danger_level: ["high", "medium", "low"],
      disappearance_circumstance: [
        "voluntary",
        "family_conflict",
        "endangered",
        "medical",
        "unknown",
      ],
      quality_tier: ["detailed", "standard", "limited"],
    },
  },
} as const
