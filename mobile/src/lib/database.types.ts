export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      availabilities: {
        Row: {
          activity: string | null;
          audience_all: boolean;
          created_at: string;
          duration: string;
          ended_at: string | null;
          expires_at: string;
          id: string;
          starts_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          activity?: string | null;
          audience_all: boolean;
          created_at?: string;
          duration: string;
          ended_at?: string | null;
          expires_at: string;
          id?: string;
          starts_at: string;
          user_id: string;
        };
        Update: {
          activity?: string | null;
          audience_all?: boolean;
          created_at?: string;
          duration?: string;
          ended_at?: string | null;
          expires_at?: string;
          id?: string;
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availabilities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_joins: {
        Row: {
          availability_id: string;
          joined_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          availability_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          availability_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_joins_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: false;
            referencedRelation: "availabilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_joins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_recipients: {
        Row: {
          availability_id: string;
          notified_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          availability_id: string;
          notified_at?: string | null;
          user_id: string;
        };
        Update: {
          availability_id?: string;
          notified_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_recipients_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: false;
            referencedRelation: "availabilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_recipients_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      circle_members: {
        Row: {
          circle_id: string;
          created_at: string;
          member_id: string;
        };
        ComputedFields: never;
        Insert: {
          circle_id: string;
          created_at?: string;
          member_id: string;
        };
        Update: {
          circle_id?: string;
          created_at?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "circle_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      circles: {
        Row: {
          created_at: string;
          emoji: string | null;
          id: string;
          name: string;
          owner_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          emoji?: string | null;
          id?: string;
          name: string;
          owner_id?: string;
        };
        Update: {
          created_at?: string;
          emoji?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "circles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entitlements: {
        Row: {
          entitlement: string;
          expires_at: string | null;
          period_type: string | null;
          product_id: string | null;
          store: string | null;
          updated_at: string;
          user_id: string;
          will_renew: boolean | null;
        };
        ComputedFields: never;
        Insert: {
          entitlement?: string;
          expires_at?: string | null;
          period_type?: string | null;
          product_id?: string | null;
          store?: string | null;
          updated_at?: string;
          user_id: string;
          will_renew?: boolean | null;
        };
        Update: {
          entitlement?: string;
          expires_at?: string | null;
          period_type?: string | null;
          product_id?: string | null;
          store?: string | null;
          updated_at?: string;
          user_id?: string;
          will_renew?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      friendships: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          requested_by: string;
          status: string;
          user_high: string;
          user_low: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          requested_by: string;
          status?: string;
          user_high: string;
          user_low: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          requested_by?: string;
          status?: string;
          user_high?: string;
          user_low?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_user_high_fkey";
            columns: ["user_high"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_user_low_fkey";
            columns: ["user_low"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meetup_messages: {
        Row: {
          availability_id: string;
          body: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        ComputedFields: never;
        Insert: {
          availability_id: string;
          body: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Update: {
          availability_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetup_messages_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: false;
            referencedRelation: "availabilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetup_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meetup_reads: {
        Row: {
          availability_id: string;
          last_read_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          availability_id: string;
          last_read_at?: string;
          user_id: string;
        };
        Update: {
          availability_id?: string;
          last_read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetup_reads_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: false;
            referencedRelation: "availabilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetup_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          platform: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          availability_id: string | null;
          created_at: string;
          details: string | null;
          id: string;
          message_id: string | null;
          reason: string;
          reported_user_id: string | null;
          reporter_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          availability_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string | null;
          reason: string;
          reported_user_id?: string | null;
          reporter_id?: string | null;
          status?: string;
        };
        Update: {
          availability_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string | null;
          reason?: string;
          reported_user_id?: string | null;
          reporter_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_availability_id_fkey";
            columns: ["availability_id"];
            isOneToOne: false;
            referencedRelation: "availabilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "meetup_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_events: {
        Row: {
          event_id: string;
          event_type: string;
          id: string;
          payload: NonNullable<Json>;
          provider: string;
          received_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          event_type: string;
          id?: string;
          payload: NonNullable<Json>;
          provider?: string;
          received_at?: string;
          user_id?: string | null;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          id?: string;
          payload?: NonNullable<Json>;
          provider?: string;
          received_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          age_confirmed_at: string | null;
          notifications_enabled: boolean;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          age_confirmed_at?: string | null;
          notifications_enabled?: boolean;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          age_confirmed_at?: string | null;
          notifications_enabled?: boolean;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      badge_count_for: { Args: { p_user: string }; Returns: number };
      block_user: { Args: { p_target: string }; Returns: undefined };
      complete_onboarding: {
        Args: {
          p_date_of_birth: string;
          p_display_name: string;
          p_timezone: string;
          p_username: string;
        };
        Returns: undefined;
      };
      end_availability: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      find_user: {
        Args: { p_username: string };
        Returns: {
          avatar_path: string;
          display_name: string;
          id: string;
          username: string;
        }[];
      };
      free_now: {
        Args: Record<PropertyKey, never>;
        Returns: {
          activity: string;
          availability_id: string;
          avatar_path: string;
          display_name: string;
          expires_at: string;
          join_count: number;
          joined: boolean;
          starts_at: string;
          user_id: string;
          username: string;
        }[];
      };
      go_free: {
        Args: {
          p_activity: string;
          p_audience_all: boolean;
          p_circle_ids?: string[];
          p_duration: string;
          p_friend_ids?: string[];
        };
        Returns: Json;
      };
      join_availability: {
        Args: { p_availability_id: string };
        Returns: undefined;
      };
      leave_availability: {
        Args: { p_availability_id: string };
        Returns: undefined;
      };
      mark_meetup_read: {
        Args: { p_availability_id: string };
        Returns: undefined;
      };
      meetup_participants: {
        Args: { p_availability_id: string };
        Returns: {
          avatar_path: string;
          display_name: string;
          is_owner: boolean;
          user_id: string;
        }[];
      };
      meetup_thread: {
        Args: {
          p_availability_id: string;
          p_before_created_at?: string;
          p_before_id?: string;
          p_limit?: number;
        };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          sender_avatar_path: string;
          sender_id: string;
          sender_name: string;
        }[];
      };
      my_blocked: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avatar_path: string;
          blocked_at: string;
          display_name: string;
          user_id: string;
          username: string;
        }[];
      };
      my_friends: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avatar_path: string;
          display_name: string;
          since: string;
          status: string;
          user_id: string;
          username: string;
        }[];
      };
      my_meetups: {
        Args: Record<PropertyKey, never>;
        Returns: {
          activity: string;
          availability_id: string;
          ends_at: string;
          is_live: boolean;
          last_message: string;
          last_message_at: string;
          owner_avatar_path: string;
          owner_id: string;
          owner_name: string;
          participant_count: number;
          starts_at: string;
          unread_count: number;
        }[];
      };
      my_status: { Args: Record<PropertyKey, never>; Returns: Json };
      register_push_token: {
        Args: { p_platform: string; p_token: string };
        Returns: undefined;
      };
      remove_friend: { Args: { p_other: string }; Returns: undefined };
      respond_friend_request: {
        Args: { p_accept: boolean; p_requester: string };
        Returns: undefined;
      };
      send_friend_request: { Args: { p_target: string }; Returns: string };
      unblock_user: { Args: { p_target: string }; Returns: undefined };
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
