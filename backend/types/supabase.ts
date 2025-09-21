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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analyses_generic: {
        Row: {
          analysis_version: string
          content_hash: string
          document_id: string | null
          id: string
          options_hash: string
          result: Json
          risk_score: number | null
          ttl_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_version: string
          content_hash: string
          document_id?: string | null
          id?: string
          options_hash: string
          result: Json
          risk_score?: number | null
          ttl_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_version?: string
          content_hash?: string
          document_id?: string | null
          id?: string
          options_hash?: string
          result?: Json
          risk_score?: number | null
          ttl_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_generic_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses_personalized: {
        Row: {
          analysis_version: string
          content_hash: string
          document_id: string | null
          id: string
          options_hash: string
          personalization_hash: string
          result: Json
          risk_score: number | null
          ttl_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_version: string
          content_hash: string
          document_id?: string | null
          id?: string
          options_hash: string
          personalization_hash: string
          result: Json
          risk_score?: number | null
          ttl_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_version?: string
          content_hash?: string
          document_id?: string | null
          id?: string
          options_hash?: string
          personalization_hash?: string
          result?: Json
          risk_score?: number | null
          ttl_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_personalized_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_history: {
        Row: {
          analysis_data: Json
          created_at: string | null
          domain: string | null
          id: string
          risk_level: string | null
          risk_score: number | null
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          analysis_data: Json
          created_at?: string | null
          domain?: string | null
          id?: string
          risk_level?: string | null
          risk_score?: number | null
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          analysis_data?: Json
          created_at?: string | null
          domain?: string | null
          id?: string
          risk_level?: string | null
          risk_score?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          canonical_url: string | null
          content_hash: string
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          canonical_url?: string | null
          content_hash: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          canonical_url?: string | null
          content_hash?: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          analysis_preferences: Json | null
          created_at: string | null
          id: string
          notification_preferences: Json | null
          privacy_importance: string | null
          risk_tolerance: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_preferences?: Json | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json | null
          privacy_importance?: string | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_preferences?: Json | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json | null
          privacy_importance?: string | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          email_verified: boolean | null
          id: string
          last_sign_in: string | null
          preferences: Json | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          email_verified?: boolean | null
          id: string
          last_sign_in?: string | null
          preferences?: Json | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          email_verified?: boolean | null
          id?: string
          last_sign_in?: string | null
          preferences?: Json | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_dashboard: {
        Row: {
          avatar_url: string | null
          avg_risk_score: number | null
          created_at: string | null
          display_name: string | null
          email: string | null
          email_verified: boolean | null
          id: string | null
          last_analysis_date: string | null
          last_sign_in: string | null
          provider: string | null
          total_analyses: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_stats: {
        Args: { user_uuid: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
