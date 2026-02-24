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
      agents: {
        Row: {
          api_endpoint: string
          avatar_url: string | null
          created_at: string
          elo_rating: number
          id: string
          losses: number
          matches_played: number
          name: string
          updated_at: string
          wallet_address: string
          wins: number
        }
        Insert: {
          api_endpoint: string
          avatar_url?: string | null
          created_at?: string
          elo_rating?: number
          id?: string
          losses?: number
          matches_played?: number
          name: string
          updated_at?: string
          wallet_address: string
          wins?: number
        }
        Update: {
          api_endpoint?: string
          avatar_url?: string | null
          created_at?: string
          elo_rating?: number
          id?: string
          losses?: number
          matches_played?: number
          name?: string
          updated_at?: string
          wallet_address?: string
          wins?: number
        }
        Relationships: []
      }
      bets: {
        Row: {
          agent_id: string
          amount_sol: number
          created_at: string
          id: string
          match_id: string
          payout_sol: number | null
          status: Database["public"]["Enums"]["bet_status"]
          wallet_address: string
        }
        Insert: {
          agent_id: string
          amount_sol: number
          created_at?: string
          id?: string
          match_id: string
          payout_sol?: number | null
          status?: Database["public"]["Enums"]["bet_status"]
          wallet_address: string
        }
        Update: {
          agent_id?: string
          amount_sol?: number
          created_at?: string
          id?: string
          match_id?: string
          payout_sol?: number | null
          status?: Database["public"]["Enums"]["bet_status"]
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "bets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          expected_output: Json
          id: string
          prompt: Json
          type: string
        }
        Insert: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          expected_output: Json
          id?: string
          prompt: Json
          type: string
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          expected_output?: Json
          id?: string
          prompt?: Json
          type?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          agent_a_id: string
          agent_a_response: Json | null
          agent_a_score: number | null
          agent_b_id: string
          agent_b_response: Json | null
          agent_b_score: number | null
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          solana_tx_hash: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          winner_id: string | null
        }
        Insert: {
          agent_a_id: string
          agent_a_response?: Json | null
          agent_a_score?: number | null
          agent_b_id: string
          agent_b_response?: Json | null
          agent_b_score?: number | null
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          solana_tx_hash?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          winner_id?: string | null
        }
        Update: {
          agent_a_id?: string
          agent_a_response?: Json | null
          agent_a_score?: number | null
          agent_b_id?: string
          agent_b_response?: Json | null
          agent_b_score?: number | null
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          solana_tx_hash?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_agent_a_id_fkey"
            columns: ["agent_a_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_agent_a_id_fkey"
            columns: ["agent_a_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "matches_agent_b_id_fkey"
            columns: ["agent_b_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_agent_b_id_fkey"
            columns: ["agent_b_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "matches_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      battle_royales: {
        Row: {
          id: string
          name: string
          tier: "bifrost" | "midgard" | "asgard"
          origin: "scheduled" | "custom"
          min_agents: number
          max_agents: number | null
          buy_in_sol: number
          payout_structure: "winner_takes_all" | "top_three"
          platform_fee_pct: number
          num_rounds: number
          registration_closes_at: string
          status: "open" | "in_progress" | "completed" | "cancelled"
          current_round: number
          participant_count: number
          winner_id: string | null
          second_place_id: string | null
          third_place_id: string | null
          total_pool_sol: number
          solana_tx_hash: string | null
          created_by_wallet: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          tier: "bifrost" | "midgard" | "asgard"
          origin?: "scheduled" | "custom"
          min_agents?: number
          max_agents?: number | null
          buy_in_sol: number
          payout_structure?: "winner_takes_all" | "top_three"
          platform_fee_pct?: number
          num_rounds?: number
          registration_closes_at: string
          status?: "open" | "in_progress" | "completed" | "cancelled"
          current_round?: number
          participant_count?: number
          winner_id?: string | null
          second_place_id?: string | null
          third_place_id?: string | null
          total_pool_sol?: number
          solana_tx_hash?: string | null
          created_by_wallet?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          tier?: "bifrost" | "midgard" | "asgard"
          origin?: "scheduled" | "custom"
          min_agents?: number
          max_agents?: number | null
          buy_in_sol?: number
          payout_structure?: "winner_takes_all" | "top_three"
          platform_fee_pct?: number
          num_rounds?: number
          registration_closes_at?: string
          status?: "open" | "in_progress" | "completed" | "cancelled"
          current_round?: number
          participant_count?: number
          winner_id?: string | null
          second_place_id?: string | null
          third_place_id?: string | null
          total_pool_sol?: number
          solana_tx_hash?: string | null
          created_by_wallet?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      battle_royale_participants: {
        Row: {
          id: string
          battle_id: string
          agent_id: string
          round_scores: Json
          total_score: number
          final_rank: number | null
          payout_sol: number
          joined_at: string
        }
        Insert: {
          id?: string
          battle_id: string
          agent_id: string
          round_scores?: Json
          total_score?: number
          final_rank?: number | null
          payout_sol?: number
          joined_at?: string
        }
        Update: {
          id?: string
          battle_id?: string
          agent_id?: string
          round_scores?: Json
          total_score?: number
          final_rank?: number | null
          payout_sol?: number
          joined_at?: string
        }
        Relationships: []
      }
      battle_royale_rounds: {
        Row: {
          id: string
          battle_id: string
          round_number: number
          challenge_id: string
          status: "pending" | "in_progress" | "completed"
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          battle_id: string
          round_number: number
          challenge_id: string
          status?: "pending" | "in_progress" | "completed"
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          battle_id?: string
          round_number?: number
          challenge_id?: string
          status?: "pending" | "in_progress" | "completed"
          started_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      battle_royale_bets: {
        Row: {
          id: string
          battle_id: string
          wallet_address: string
          agent_id: string
          amount_sol: number
          status: "pending" | "won" | "lost" | "refunded"
          payout_sol: number
          placed_at: string
        }
        Insert: {
          id?: string
          battle_id: string
          wallet_address: string
          agent_id: string
          amount_sol: number
          status?: "pending" | "won" | "lost" | "refunded"
          payout_sol?: number
          placed_at?: string
        }
        Update: {
          id?: string
          battle_id?: string
          wallet_address?: string
          agent_id?: string
          amount_sol?: number
          status?: "pending" | "won" | "lost" | "refunded"
          payout_sol?: number
          placed_at?: string
        }
        Relationships: []
      }
      matchmaking_queue: {
        Row: {
          id: string
          agent_id: string
          tier: "bifrost" | "midgard" | "asgard"
          queued_at: string
          status: "waiting" | "matched" | "expired"
          matched_with: string | null
          match_id: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          tier: "bifrost" | "midgard" | "asgard"
          queued_at?: string
          status?: "waiting" | "matched" | "expired"
          matched_with?: string | null
          match_id?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          tier?: "bifrost" | "midgard" | "asgard"
          queued_at?: string
          status?: "waiting" | "matched" | "expired"
          matched_with?: string | null
          match_id?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          id: string
          season_number: number
          name: string
          starts_at: string
          ends_at: string
          status: "upcoming" | "active" | "completed"
          created_at: string
        }
        Insert: {
          id?: string
          season_number: number
          name: string
          starts_at: string
          ends_at: string
          status?: "upcoming" | "active" | "completed"
          created_at?: string
        }
        Update: {
          id?: string
          season_number?: number
          name?: string
          starts_at?: string
          ends_at?: string
          status?: "upcoming" | "active" | "completed"
          created_at?: string
        }
        Relationships: []
      }
      season_standings: {
        Row: {
          id: string
          season_id: string
          agent_id: string
          final_elo: number
          final_rank: number
          total_matches: number
          total_wins: number
          total_earnings_sol: number
          battle_royale_wins: number
        }
        Insert: {
          id?: string
          season_id: string
          agent_id: string
          final_elo?: number
          final_rank?: number
          total_matches?: number
          total_wins?: number
          total_earnings_sol?: number
          battle_royale_wins?: number
        }
        Update: {
          id?: string
          season_id?: string
          agent_id?: string
          final_elo?: number
          final_rank?: number
          total_matches?: number
          total_wins?: number
          total_earnings_sol?: number
          battle_royale_wins?: number
        }
        Relationships: []
      }
      scheduled_events: {
        Row: {
          id: string
          name: string
          tier: "bifrost" | "midgard" | "asgard"
          cron_expression: string
          buy_in_sol: number
          min_agents: number
          num_rounds: number
          payout_structure: "winner_takes_all" | "top_three"
          registration_window_minutes: number
          is_active: boolean
          last_triggered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          tier: "bifrost" | "midgard" | "asgard"
          cron_expression: string
          buy_in_sol: number
          min_agents?: number
          num_rounds?: number
          payout_structure?: "winner_takes_all" | "top_three"
          registration_window_minutes?: number
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          tier?: "bifrost" | "midgard" | "asgard"
          cron_expression?: string
          buy_in_sol?: number
          min_agents?: number
          num_rounds?: number
          payout_structure?: "winner_takes_all" | "top_three"
          registration_window_minutes?: number
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          agent_id: string | null
          avatar_url: string | null
          elo_rating: number | null
          losses: number | null
          matches_played: number | null
          name: string | null
          rank: number | null
          wallet_address: string | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      bet_status: "pending" | "won" | "lost" | "refunded"
      difficulty_level: "easy" | "medium" | "hard"
      match_status: "pending" | "in_progress" | "completed" | "failed"
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
