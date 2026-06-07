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
      profiles: {
        Row: {
          area: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      app_role:
        | "guest"
        | "user"
        | "detective"
        | "analyst"
        | "moderator"
        | "admin"
        | "super_admin"
      case_status: "active" | "found" | "closed"
      danger_level: "high" | "medium" | "low"
      disappearance_circumstance:
        | "voluntary"
        | "family_conflict"
        | "endangered"
        | "medical"
        | "unknown"
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
      app_role: [
        "guest",
        "user",
        "detective",
        "analyst",
        "moderator",
        "admin",
        "super_admin",
      ],
      case_status: ["active", "found", "closed"],
      danger_level: ["high", "medium", "low"],
      disappearance_circumstance: [
        "voluntary",
        "family_conflict",
        "endangered",
        "medical",
        "unknown",
      ],
    },
  },
} as const
