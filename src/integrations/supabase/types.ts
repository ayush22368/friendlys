export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          companion_id: string
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          date: string
          duration: number
          id: string
          location: string
          notes: string | null
          status: string | null
          time: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          date: string
          duration: number
          id?: string
          location: string
          notes?: string | null
          status?: string | null
          time: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          companion_id?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          date?: string
          duration?: number
          id?: string
          location?: string
          notes?: string | null
          status?: string | null
          time?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_availability: {
        Row: {
          companion_id: string
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_available: boolean | null
          notes: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          companion_id: string
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          companion_id?: string
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_availability_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_unavailable_days: {
        Row: {
          companion_id: string
          created_at: string
          date: string
          id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          date: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      companions: {
        Row: {
          age: number
          availability: string[] | null
          bio: string
          created_at: string | null
          id: string
          image: string | null
          is_available: boolean | null
          location: string
          name: string
          rate: number
          status: string | null
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          age: number
          availability?: string[] | null
          bio: string
          created_at?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          location: string
          name: string
          rate?: number
          status?: string | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number
          availability?: string[] | null
          bio?: string
          created_at?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          location?: string
          name?: string
          rate?: number
          status?: string | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          companion_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          companion_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          companion_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booking_conflict: {
        Args: {
          _companion_id: string
          _date: string
          _start_time: string
          _duration: number
        }
        Returns: boolean
      }
      get_all_bookings_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          companion_id: string
          customer_name: string
          customer_email: string
          customer_phone: string
          date: string
          time: string
          duration: number
          location: string
          status: string
          total_amount: number
          notes: string
          created_at: string
          updated_at: string
          companions: Json
        }[]
      }
      get_available_slots: {
        Args: { _companion_id: string; _date: string }
        Returns: {
          id: string
          start_time: string
          end_time: string
          is_booked: boolean
        }[]
      }
      get_companion_time_slots: {
        Args: { _companion_id: string; _date: string }
        Returns: {
          slot_type: string
          start_time: string
          end_time: string
          is_available: boolean
          is_booked: boolean
          source: string
        }[]
      }
      get_user_companion_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "companion" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "companion", "user"],
    },
  },
} as const
