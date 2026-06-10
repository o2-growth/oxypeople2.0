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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          key_result_id: string | null
          objective_id: string | null
          order_index: number
          owner_user_id: string
          status: string
          title: string
          updated_at: string
          week_bucket: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          key_result_id?: string | null
          objective_id?: string | null
          order_index?: number
          owner_user_id: string
          status?: string
          title: string
          updated_at?: string
          week_bucket: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          key_result_id?: string | null
          objective_id?: string | null
          order_index?: number
          owner_user_id?: string
          status?: string
          title?: string
          updated_at?: string
          week_bucket?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          company_id: string
          content: string
          created_at: string
          feed_post_id: string | null
          id: string
          is_pinned: boolean
          post_to_feed: boolean
          published_at: string | null
          scheduled_at: string | null
          slack_channel_id: string | null
          slack_sent_at: string | null
          target_audience: string[] | null
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at: string
        }
        Insert: {
          author_id: string
          company_id: string
          content: string
          created_at?: string
          feed_post_id?: string | null
          id?: string
          is_pinned?: boolean
          post_to_feed?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          slack_channel_id?: string | null
          slack_sent_at?: string | null
          target_audience?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          company_id?: string
          content?: string
          created_at?: string
          feed_post_id?: string | null
          id?: string
          is_pinned?: boolean
          post_to_feed?: boolean
          published_at?: string | null
          scheduled_at?: string | null
          slack_channel_id?: string | null
          slack_sent_at?: string | null
          target_audience?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string
          company_id: string
          created_at: string
          event_type: string
          id: string
          message_sent: string | null
          slack_response: Json | null
          status: Database["public"]["Enums"]["automation_log_status"]
          target_user_id: string | null
        }
        Insert: {
          automation_id: string
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          message_sent?: string | null
          slack_response?: Json | null
          status?: Database["public"]["Enums"]["automation_log_status"]
          target_user_id?: string | null
        }
        Update: {
          automation_id?: string
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          message_sent?: string | null
          slack_response?: Json | null
          status?: Database["public"]["Enums"]["automation_log_status"]
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          type: Database["public"]["Enums"]["automation_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          type: Database["public"]["Enums"]["automation_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          type?: Database["public"]["Enums"]["automation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          active: boolean
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          emoji: string | null
          icon_url: string | null
          id: string
          name: string
          points: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_attachments: {
        Row: {
          checkin_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
        }
        Insert: {
          checkin_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type?: string | null
        }
        Update: {
          checkin_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_attachments_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "okr_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_customer_id: string | null
          created_at: string
          domain: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          owner_id: string | null
          plan: string | null
          updated_at: string
        }
        Insert: {
          billing_customer_id?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          plan?: string | null
          updated_at?: string
        }
        Update: {
          billing_customer_id?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_events: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          is_recurring: boolean
          location: string | null
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_recurring?: boolean
          location?: string | null
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_recurring?: boolean
          location?: string | null
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          department_id: string | null
          employment_type: string | null
          hire_date: string | null
          id: string
          invited_by: string | null
          is_new_hire: boolean | null
          joined_at: string | null
          pipefy_card_id: string | null
          position: string | null
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          employment_type?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          is_new_hire?: boolean | null
          joined_at?: string | null
          pipefy_card_id?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          employment_type?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          is_new_hire?: boolean | null
          joined_at?: string | null
          pipefy_card_id?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          days: number
          end_date: string
          id: string
          manager_name: string | null
          membership_id: string | null
          notes: string | null
          person_name: string
          pipefy_card_id: string | null
          source: string
          start_date: string
          status: string
          substitute_name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          days?: number
          end_date: string
          id?: string
          manager_name?: string | null
          membership_id?: string | null
          notes?: string | null
          person_name: string
          pipefy_card_id?: string | null
          source?: string
          start_date: string
          status?: string
          substitute_name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          days?: number
          end_date?: string
          id?: string
          manager_name?: string | null
          membership_id?: string | null
          notes?: string | null
          person_name?: string
          pipefy_card_id?: string | null
          source?: string
          start_date?: string
          status?: string
          substitute_name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "company_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_settings: {
        Row: {
          alert_mode: string
          company_id: string
          overdue_months: number
          soon_months: number
          updated_at: string
        }
        Insert: {
          alert_mode?: string
          company_id: string
          overdue_months?: number
          soon_months?: number
          updated_at?: string
        }
        Update: {
          alert_mode?: string
          company_id?: string
          overdue_months?: number
          soon_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          leader_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_levels: {
        Row: {
          badge_emoji: string | null
          color: string | null
          company_id: string
          created_at: string
          id: string
          min_points: number
          name: string
        }
        Insert: {
          badge_emoji?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          min_points: number
          name: string
        }
        Update: {
          badge_emoji?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          min_points?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_points: {
        Row: {
          action_type: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_points_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gptw_responses: {
        Row: {
          answers: Json
          comment: string | null
          created_at: string
          enps_score: number
          id: string
          survey_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          comment?: string | null
          created_at?: string
          enps_score: number
          id?: string
          survey_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          comment?: string | null
          created_at?: string
          enps_score?: number
          id?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gptw_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "gptw_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gptw_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gptw_surveys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          status: string
          target_all: boolean | null
          target_departments: string[] | null
          target_teams: string[] | null
          target_users: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          status?: string
          target_all?: boolean | null
          target_departments?: string[] | null
          target_teams?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          status?: string
          target_all?: boolean | null
          target_departments?: string[] | null
          target_teams?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gptw_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gptw_surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["membership_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          checkin_frequency: string | null
          created_at: string
          current_value: number
          data_source: string | null
          deleted_at: string | null
          direction: string
          id: string
          initial_value: number
          is_automatic: boolean
          kr_type: string
          last_checkin_at: string | null
          objective_id: string
          owner_user_id: string | null
          status: string
          target_value: number
          title: string
          unit: string | null
          updated_at: string
          weight_percentage: number
        }
        Insert: {
          checkin_frequency?: string | null
          created_at?: string
          current_value?: number
          data_source?: string | null
          deleted_at?: string | null
          direction?: string
          id?: string
          initial_value?: number
          is_automatic?: boolean
          kr_type?: string
          last_checkin_at?: string | null
          objective_id: string
          owner_user_id?: string | null
          status?: string
          target_value?: number
          title: string
          unit?: string | null
          updated_at?: string
          weight_percentage?: number
        }
        Update: {
          checkin_frequency?: string | null
          created_at?: string
          current_value?: number
          data_source?: string | null
          deleted_at?: string | null
          direction?: string
          id?: string
          initial_value?: number
          is_automatic?: boolean
          kr_type?: string
          last_checkin_at?: string | null
          objective_id?: string
          owner_user_id?: string | null
          status?: string
          target_value?: number
          title?: string
          unit?: string | null
          updated_at?: string
          weight_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          score: number
          survey_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          score: number
          survey_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          score?: number
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "nps_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_surveys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          min_days_employed: number | null
          question: string
          require_comment_below: number | null
          status: string
          target_all: boolean | null
          target_departments: string[] | null
          target_teams: string[] | null
          target_users: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          min_days_employed?: number | null
          question?: string
          require_comment_below?: number | null
          status?: string
          target_all?: boolean | null
          target_departments?: string[] | null
          target_teams?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          min_days_employed?: number | null
          question?: string
          require_comment_below?: number | null
          status?: string
          target_all?: boolean | null
          target_departments?: string[] | null
          target_teams?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_collaborators: {
        Row: {
          created_at: string
          id: string
          objective_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objective_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_collaborators_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_relations: {
        Row: {
          child_objective_id: string
          created_at: string
          id: string
          parent_objective_id: string
          weight_percentage: number
        }
        Insert: {
          child_objective_id: string
          created_at?: string
          id?: string
          parent_objective_id: string
          weight_percentage?: number
        }
        Update: {
          child_objective_id?: string
          created_at?: string
          id?: string
          parent_objective_id?: string
          weight_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "objective_relations_child_objective_id_fkey"
            columns: ["child_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_relations_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          assignee_id: string | null
          auto_status: string | null
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          department: string | null
          description: string | null
          due_date: string | null
          expected_progress: number | null
          id: string
          is_active: boolean
          last_status_check: string | null
          owner_department_id: string | null
          owner_id: string
          parent_id: string | null
          period_id: string | null
          progress: number
          status: Database["public"]["Enums"]["objective_status"]
          tags: string[] | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["objective_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          assignee_id?: string | null
          auto_status?: string | null
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          expected_progress?: number | null
          id?: string
          is_active?: boolean
          last_status_check?: string | null
          owner_department_id?: string | null
          owner_id: string
          parent_id?: string | null
          period_id?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["objective_status"]
          tags?: string[] | null
          team_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["objective_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          assignee_id?: string | null
          auto_status?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          expected_progress?: number | null
          id?: string
          is_active?: boolean
          last_status_check?: string | null
          owner_department_id?: string | null
          owner_id?: string
          parent_id?: string | null
          period_id?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["objective_status"]
          tags?: string[] | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["objective_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "objectives_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_owner_department_id_fkey"
            columns: ["owner_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_audit_log: {
        Row: {
          action: string
          changed_by: string
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_by: string
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_checkins: {
        Row: {
          blocker_description: string | null
          comment: string
          company_id: string
          created_at: string
          deleted_at: string | null
          has_blocker: boolean
          id: string
          key_result_id: string
          new_value: number
          objective_id: string
          perceived_risk: string
          previous_value: number
          user_id: string
        }
        Insert: {
          blocker_description?: string | null
          comment: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          has_blocker?: boolean
          id?: string
          key_result_id: string
          new_value: number
          objective_id: string
          perceived_risk?: string
          previous_value?: number
          user_id: string
        }
        Update: {
          blocker_description?: string | null
          comment?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          has_blocker?: boolean
          id?: string
          key_result_id?: string
          new_value?: number
          objective_id?: string
          perceived_risk?: string
          previous_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_checkins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_settings: {
        Row: {
          checkin_frequency: string
          checkin_min_chars: number
          checkin_overdue_days: number
          company_id: string
          created_at: string
          deviation_attention_pct: number
          deviation_risk_pct: number
          id: string
          risk_days_before_escalation: number
          updated_at: string
        }
        Insert: {
          checkin_frequency?: string
          checkin_min_chars?: number
          checkin_overdue_days?: number
          company_id: string
          created_at?: string
          deviation_attention_pct?: number
          deviation_risk_pct?: number
          id?: string
          risk_days_before_escalation?: number
          updated_at?: string
        }
        Update: {
          checkin_frequency?: string
          checkin_min_chars?: number
          checkin_overdue_days?: number
          company_id?: string
          created_at?: string
          deviation_attention_pct?: number
          deviation_risk_pct?: number
          id?: string
          risk_days_before_escalation?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_feedbacks: {
        Row: {
          additional_comments: string | null
          clarity_level: string | null
          company_id: string
          completed_at: string | null
          complicated_tools: string | null
          created_at: string
          difficulties: string | null
          due_date: string
          forwarded_at: string | null
          forwarded_by: string | null
          forwarded_to: string[] | null
          has_all_access: boolean | null
          id: string
          improvement_suggestions: string | null
          integration_level: string | null
          manager_id: string | null
          missing_access: string | null
          onboarding_rating: number | null
          overall_feeling: string | null
          overall_rating: number | null
          pending_questions: string | null
          positive_surprise: string | null
          status: string
          tools_ease_rating: number | null
          training_rating: number | null
          updated_at: string
          user_id: string
          what_worked_well: string | null
        }
        Insert: {
          additional_comments?: string | null
          clarity_level?: string | null
          company_id: string
          completed_at?: string | null
          complicated_tools?: string | null
          created_at?: string
          difficulties?: string | null
          due_date: string
          forwarded_at?: string | null
          forwarded_by?: string | null
          forwarded_to?: string[] | null
          has_all_access?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          integration_level?: string | null
          manager_id?: string | null
          missing_access?: string | null
          onboarding_rating?: number | null
          overall_feeling?: string | null
          overall_rating?: number | null
          pending_questions?: string | null
          positive_surprise?: string | null
          status?: string
          tools_ease_rating?: number | null
          training_rating?: number | null
          updated_at?: string
          user_id: string
          what_worked_well?: string | null
        }
        Update: {
          additional_comments?: string | null
          clarity_level?: string | null
          company_id?: string
          completed_at?: string | null
          complicated_tools?: string | null
          created_at?: string
          difficulties?: string | null
          due_date?: string
          forwarded_at?: string | null
          forwarded_by?: string | null
          forwarded_to?: string[] | null
          has_all_access?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          integration_level?: string | null
          manager_id?: string | null
          missing_access?: string | null
          onboarding_rating?: number | null
          overall_feeling?: string | null
          overall_rating?: number | null
          pending_questions?: string | null
          positive_surprise?: string | null
          status?: string
          tools_ease_rating?: number | null
          training_rating?: number | null
          updated_at?: string
          user_id?: string
          what_worked_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_feedbacks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_feedbacks_forwarded_by_fkey"
            columns: ["forwarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_feedbacks_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_answers: {
        Row: {
          answer: Json
          created_at: string
          evaluation_id: string
          id: string
          question_id: string
          score: number | null
        }
        Insert: {
          answer: Json
          created_at?: string
          evaluation_id: string
          id?: string
          question_id: string
          score?: number | null
        }
        Update: {
          answer?: Json
          created_at?: string
          evaluation_id?: string
          id?: string
          question_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_answers_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "performance_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "performance_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cycles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["performance_cycle_status"]
          target_all: boolean | null
          target_departments: string[] | null
          target_teams: string[] | null
          target_users: string[] | null
          type: Database["public"]["Enums"]["performance_cycle_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["performance_cycle_status"]
          target_all?: boolean | null
          target_departments?: string[] | null
          target_teams?: string[] | null
          target_users?: string[] | null
          type?: Database["public"]["Enums"]["performance_cycle_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["performance_cycle_status"]
          target_all?: boolean | null
          target_departments?: string[] | null
          target_teams?: string[] | null
          target_users?: string[] | null
          type?: Database["public"]["Enums"]["performance_cycle_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluations: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          cycle_id: string
          due_date: string
          evaluated_id: string
          evaluator_id: string
          id: string
          overall_score: number | null
          relationship: string
          status: Database["public"]["Enums"]["evaluation_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          cycle_id: string
          due_date: string
          evaluated_id: string
          evaluator_id: string
          id?: string
          overall_score?: number | null
          relationship: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          cycle_id?: string
          due_date?: string
          evaluated_id?: string
          evaluator_id?: string
          id?: string
          overall_score?: number | null
          relationship?: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_evaluated_id_fkey"
            columns: ["evaluated_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_questions: {
        Row: {
          category: string | null
          created_at: string
          cycle_id: string
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string
          cycle_id: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
        }
        Update: {
          category?: string | null
          created_at?: string
          cycle_id?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "performance_questions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipefy_sync_config: {
        Row: {
          company_id: string
          created_at: string | null
          field_mapping: Json
          id: string
          last_sync_at: string | null
          organization_id: string | null
          sync_status: string | null
          table_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          field_mapping?: Json
          id?: string
          last_sync_at?: string | null
          organization_id?: string | null
          sync_status?: string | null
          table_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          field_mapping?: Json
          id?: string
          last_sync_at?: string | null
          organization_id?: string | null
          sync_status?: string | null
          table_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipefy_sync_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipefy_sync_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          records_created: number | null
          records_skipped: number | null
          records_synced: number | null
          records_updated: number | null
          started_at: string
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_skipped?: number | null
          records_synced?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_skipped?: number | null
          records_synced?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipefy_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          company_id: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          author_id: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          author_id?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recognitions: {
        Row: {
          badge_id: string | null
          company_id: string
          created_at: string
          from_user_id: string
          id: string
          message: string
          points: number
          to_user_id: string
        }
        Insert: {
          badge_id?: string | null
          company_id: string
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          points?: number
          to_user_id: string
        }
        Update: {
          badge_id?: string | null
          company_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          points?: number
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognitions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognitions_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          payload: Json
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          payload?: Json
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required: boolean
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answer: Json
          created_at: string
          id: string
          question_id: string
          survey_id: string
          user_id: string | null
        }
        Insert: {
          answer: Json
          created_at?: string
          id?: string
          question_id: string
          survey_id: string
          user_id?: string | null
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          question_id?: string
          survey_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          anonymous: boolean
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at: string
        }
        Insert: {
          anonymous?: boolean
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at?: string
        }
        Update: {
          anonymous?: boolean
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["survey_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_active_at: string | null
          locale: string | null
          metadata: Json | null
          primary_company_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_active_at?: string | null
          locale?: string | null
          metadata?: Json | null
          primary_company_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          locale?: string | null
          metadata?: Json | null
          primary_company_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_primary_company"
            columns: ["primary_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_expected_progress: {
        Args: { p_due_date?: string; p_period_id: string }
        Returns: number
      }
      cascade_objective_progress: {
        Args: { p_objective_id: string }
        Returns: undefined
      }
      determine_objective_auto_status: {
        Args: {
          p_checkin_overdue_days?: number
          p_deviation_attention?: number
          p_deviation_risk?: number
          p_expected_progress: number
          p_last_checkin_at: string
          p_progress: number
        }
        Returns: string
      }
      get_led_teams: { Args: { p_user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["membership_role"]
      }
      is_any_team_leader: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_company_admin: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_leader: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      update_objective_auto_status: {
        Args: { p_objective_id: string }
        Returns: undefined
      }
    }
    Enums: {
      announcement_type: "event" | "info" | "urgent" | "celebration"
      automation_log_status: "success" | "failed" | "pending"
      automation_type: "birthday" | "anniversary" | "new_hire" | "reminder"
      evaluation_status: "pending" | "in_progress" | "completed" | "expired"
      membership_role: "owner" | "admin" | "manager" | "member"
      membership_status: "active" | "invited" | "pending" | "inactive"
      objective_status: "planned" | "active" | "risk" | "completed" | "canceled"
      objective_type:
        | "personal"
        | "team"
        | "individual"
        | "strategic"
        | "tactical"
        | "operational"
      performance_cycle_status:
        | "draft"
        | "scheduled"
        | "active"
        | "completed"
        | "cancelled"
      performance_cycle_type:
        | "self"
        | "180"
        | "360"
        | "leader"
        | "custom"
        | "full"
        | "pocket"
      post_visibility: "public" | "company" | "private"
      question_type:
        | "text"
        | "rating"
        | "multiple_choice"
        | "single_choice"
        | "scale"
      survey_status: "draft" | "scheduled" | "active" | "completed"
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
      announcement_type: ["event", "info", "urgent", "celebration"],
      automation_log_status: ["success", "failed", "pending"],
      automation_type: ["birthday", "anniversary", "new_hire", "reminder"],
      evaluation_status: ["pending", "in_progress", "completed", "expired"],
      membership_role: ["owner", "admin", "manager", "member"],
      membership_status: ["active", "invited", "pending", "inactive"],
      objective_status: ["planned", "active", "risk", "completed", "canceled"],
      objective_type: [
        "personal",
        "team",
        "individual",
        "strategic",
        "tactical",
        "operational",
      ],
      performance_cycle_status: [
        "draft",
        "scheduled",
        "active",
        "completed",
        "cancelled",
      ],
      performance_cycle_type: [
        "self",
        "180",
        "360",
        "leader",
        "custom",
        "full",
        "pocket",
      ],
      post_visibility: ["public", "company", "private"],
      question_type: [
        "text",
        "rating",
        "multiple_choice",
        "single_choice",
        "scale",
      ],
      survey_status: ["draft", "scheduled", "active", "completed"],
    },
  },
} as const
