/**
 * Types of the database schema, in the format `supabase gen types` produces.
 *
 * Written by hand because there is no running database to generate them from
 * yet. src/backend/schemaTypes.test.ts compares every table, column and function
 * below with the real schema built from supabase/migrations, so they cannot
 * drift silently. Once a project exists, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/services/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      games: {
        Row: { id: string; name: string; rounds: number; max_score: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          show_in_leaderboards: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          username?: string;
          display_name?: string | null;
          show_in_leaderboards?: boolean;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: { user_id?: string; key: string; value: string };
        Update: { value?: string };
        Relationships: [];
      };
      daily_results: {
        Row: {
          id: number;
          user_id: string;
          game_id: string;
          challenge_date: string;
          score: number;
          won: boolean;
          completed: boolean;
          rounds: number;
          answers: Json | null;
          detail: Json;
          duration_ms: number | null;
          verification: string;
          generator_version: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      free_results: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          level_id: string;
          mode: string;
          score: number;
          won: boolean;
          completed: boolean;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          game_id: string;
          level_id: string;
          mode: string;
          score: number;
          won: boolean;
          completed: boolean;
          detail?: Json;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      import_guest_results: {
        Args: { p_daily: Json; p_free: Json };
        Returns: Json;
      };
      daily_leaderboard: {
        Args: {
          p_game_id: string;
          p_challenge_date: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          rank: number;
          username: string;
          display_name: string | null;
          score: number;
          is_me: boolean;
        }[];
      };
      my_daily_standing: {
        Args: { p_game_id: string; p_challenge_date: string };
        Returns: { rank: number; participants: number; score: number }[];
      };
      weekly_leaderboard: {
        Args: {
          p_game_id: string;
          p_week_start: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          rank: number;
          username: string;
          display_name: string | null;
          total: number;
          days_played: number;
          is_me: boolean;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
