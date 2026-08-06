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
      activation_codes: {
        Row: {
          code: string
          course_ids: string[]
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          course_ids: string[]
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          course_ids?: string[]
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: []
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
      calibration_sessions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          cycle_id: string
          id: string
          notes: string | null
          participants: string[]
          session_date: string
          session_name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          cycle_id: string
          id?: string
          notes?: string | null
          participants?: string[]
          session_date: string
          session_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          cycle_id?: string
          id?: string
          notes?: string | null
          participants?: string[]
          session_date?: string
          session_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_sessions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          auth_code: string
          course_id: string
          course_name: string
          created_at: string | null
          hours: number
          id: string
          issue_date: string | null
          modules: Json | null
          student_name: string
          user_id: string | null
        }
        Insert: {
          auth_code: string
          course_id: string
          course_name: string
          created_at?: string | null
          hours: number
          id: string
          issue_date?: string | null
          modules?: Json | null
          student_name: string
          user_id?: string | null
        }
        Update: {
          auth_code?: string
          course_id?: string
          course_name?: string
          created_at?: string | null
          hours?: number
          id?: string
          issue_date?: string | null
          modules?: Json | null
          student_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          feedz_ref: string | null
          id: string
          imported_at: string | null
          is_recurring: boolean
          location: string | null
          metadata: Json | null
          source: string
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
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          is_recurring?: boolean
          location?: string | null
          metadata?: Json | null
          source?: string
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
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          is_recurring?: boolean
          location?: string | null
          metadata?: Json | null
          source?: string
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
          employee_code: string | null
          employment_type: string | null
          feedz_id: string | null
          hire_date: string | null
          id: string
          invited_by: string | null
          is_new_hire: boolean | null
          joined_at: string | null
          last_working_day: string | null
          manager_id: string | null
          okr_access_level: string
          pipefy_card_id: string | null
          position: string | null
          status: Database["public"]["Enums"]["membership_status"]
          termination_reason: string | null
          termination_type: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          employee_code?: string | null
          employment_type?: string | null
          feedz_id?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          is_new_hire?: boolean | null
          joined_at?: string | null
          last_working_day?: string | null
          manager_id?: string | null
          okr_access_level?: string
          pipefy_card_id?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          termination_reason?: string | null
          termination_type?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          department_id?: string | null
          employee_code?: string | null
          employment_type?: string | null
          feedz_id?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          is_new_hire?: boolean | null
          joined_at?: string | null
          last_working_day?: string | null
          manager_id?: string | null
          okr_access_level?: string
          pipefy_card_id?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          termination_reason?: string | null
          termination_type?: string | null
          unit?: string | null
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
            foreignKeyName: "company_memberships_manager_id_fkey"
            columns: ["manager_id"]
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
      course_lessons: {
        Row: {
          created_at: string | null
          duration: string
          hls_url: string | null
          id: string
          module_id: string
          order_index: number
          panda_video_id: string | null
          title: string
          type: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: string
          hls_url?: string | null
          id?: string
          module_id: string
          order_index?: number
          panda_video_id?: string | null
          title: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: string
          hls_url?: string | null
          id?: string
          module_id?: string
          order_index?: number
          panda_video_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      employee_demographics: {
        Row: {
          company_id: string
          cpf: string | null
          created_at: string
          ethnicity: string | null
          gender: string | null
          id: string
          imported_at: string | null
          sex: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          cpf?: string | null
          created_at?: string
          ethnicity?: string | null
          gender?: string | null
          id?: string
          imported_at?: string | null
          sex?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          cpf?: string | null
          created_at?: string
          ethnicity?: string | null
          gender?: string | null
          id?: string
          imported_at?: string | null
          sex?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_demographics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_demographics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          answered_at: string | null
          company_id: string
          competency_tags: Json
          created_at: string
          declined_reason: string | null
          due_date: string | null
          feedz_ref: string | null
          id: string
          imported_at: string | null
          question: string
          requester_id: string
          respondent_id: string
          response: string | null
          source: string
          status: string
          subject_user_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          answered_at?: string | null
          company_id: string
          competency_tags?: Json
          created_at?: string
          declined_reason?: string | null
          due_date?: string | null
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          question: string
          requester_id: string
          respondent_id: string
          response?: string | null
          source?: string
          status?: string
          subject_user_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          answered_at?: string | null
          company_id?: string
          competency_tags?: Json
          created_at?: string
          declined_reason?: string | null
          due_date?: string | null
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          question?: string
          requester_id?: string
          respondent_id?: string
          response?: string | null
          source?: string
          status?: string
          subject_user_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_subject_user_id_fkey"
            columns: ["subject_user_id"]
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
          confidence: number | null
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
          confidence?: number | null
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
          confidence?: number | null
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
      meta_redistribution_changes: {
        Row: {
          bu: string
          created_at: string | null
          delta: number
          field: string
          id: string
          month: string
          session_id: string
          value_after: number
          value_before: number
          year: number
        }
        Insert: {
          bu: string
          created_at?: string | null
          delta: number
          field?: string
          id?: string
          month: string
          session_id: string
          value_after: number
          value_before: number
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string | null
          delta?: number
          field?: string
          id?: string
          month?: string
          session_id?: string
          value_after?: number
          value_before?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_redistribution_changes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "meta_redistribution_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_redistribution_sessions: {
        Row: {
          changes_count: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          total_after: number
          total_before: number
          user_id: string | null
        }
        Insert: {
          changes_count?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          total_after: number
          total_before: number
          user_id?: string | null
        }
        Update: {
          changes_count?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          total_after?: number
          total_before?: number
          user_id?: string | null
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          description: string | null
          id: string
          imported_at: string | null
          mood_label: string | null
          person_name: string
          recorded_at: string
          score: number | null
          source: string
          unit: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          imported_at?: string | null
          mood_label?: string | null
          person_name: string
          recorded_at: string
          score?: number | null
          source?: string
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          imported_at?: string | null
          mood_label?: string | null
          person_name?: string
          recorded_at?: string
          score?: number | null
          source?: string
          unit?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mood_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nine_box_placements: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          performance_axis: number
          performance_source: string
          placed_by: string
          potential_axis: number
          raw_evaluation_score: number | null
          snapshot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          performance_axis: number
          performance_source?: string
          placed_by: string
          potential_axis: number
          raw_evaluation_score?: number | null
          snapshot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          performance_axis?: number
          performance_source?: string
          placed_by?: string
          potential_axis?: number
          raw_evaluation_score?: number | null
          snapshot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nine_box_placements_placed_by_fkey"
            columns: ["placed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_placements_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "nine_box_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_placements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nine_box_positions: {
        Row: {
          calibration_session_id: string
          company_id: string
          evaluation_id: string
          id: string
          justification: string | null
          moved_at: string
          moved_by: string
          performance_score: number
          potential_score: number
          previous_position: Json | null
          user_id: string
        }
        Insert: {
          calibration_session_id: string
          company_id: string
          evaluation_id: string
          id?: string
          justification?: string | null
          moved_at?: string
          moved_by: string
          performance_score: number
          potential_score: number
          previous_position?: Json | null
          user_id: string
        }
        Update: {
          calibration_session_id?: string
          company_id?: string
          evaluation_id?: string
          id?: string
          justification?: string | null
          moved_at?: string
          moved_by?: string
          performance_score?: number
          potential_score?: number
          previous_position?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nine_box_positions_calibration_session_id_fkey"
            columns: ["calibration_session_id"]
            isOneToOne: false
            referencedRelation: "calibration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_positions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "my_evaluation_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_positions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "performance_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_positions_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nine_box_snapshots: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          cycle_id: string | null
          finalized_at: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          cycle_id?: string | null
          finalized_at?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          cycle_id?: string | null
          finalized_at?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nine_box_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nine_box_snapshots_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
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
      objective_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          key_result_id: string | null
          objective_id: string
          parent_comment_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          key_result_id?: string | null
          objective_id: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          key_result_id?: string | null
          objective_id?: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comments_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "objective_comments"
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
          commitment_type: string
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
          commitment_type?: string
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
          commitment_type?: string
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
          changed_by: string | null
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
          changed_by?: string | null
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
          changed_by?: string | null
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
      okr_comments: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          key_result_id: string | null
          objective_id: string | null
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          key_result_id?: string | null
          objective_id?: string | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          key_result_id?: string | null
          objective_id?: string | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_comments_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_comments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "okr_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_comments_user_id_fkey"
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
      one_on_one_meetings: {
        Row: {
          action_items: Json | null
          agenda: Json | null
          company_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          employee_id: string
          id: string
          location: string | null
          manager_id: string
          meeting_url: string | null
          next_meeting_date: string | null
          notes: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          agenda?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          id?: string
          location?: string | null
          manager_id: string
          meeting_url?: string | null
          next_meeting_date?: string | null
          notes?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          agenda?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          id?: string
          location?: string | null
          manager_id?: string
          meeting_url?: string | null
          next_meeting_date?: string | null
          notes?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_meetings_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          one_on_one_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          one_on_one_id: string
          updated_at?: string
          visibility: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          one_on_one_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_notes_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_topics: {
        Row: {
          content: string
          created_at: string
          created_by: string
          done: boolean
          id: string
          one_on_one_id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          done?: boolean
          id?: string
          one_on_one_id: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          done?: boolean
          id?: string
          one_on_one_id?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_topics_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_ones: {
        Row: {
          canceled_reason: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number
          feedz_ref: string | null
          id: string
          imported_at: string | null
          leader_id: string
          location: string | null
          member_id: string
          recurrence: string
          recurrence_parent_id: string | null
          scheduled_at: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          canceled_reason?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          leader_id: string
          location?: string | null
          member_id: string
          recurrence?: string
          recurrence_parent_id?: string | null
          scheduled_at: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          canceled_reason?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          leader_id?: string
          location?: string | null
          member_id?: string
          recurrence?: string
          recurrence_parent_id?: string | null
          scheduled_at?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_ones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_ones_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_ones_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_ones_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_actions: {
        Row: {
          competency_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          evidence_url: string | null
          feedback_request_id: string | null
          id: string
          order_index: number
          pdi_plan_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          competency_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_url?: string | null
          feedback_request_id?: string | null
          id?: string
          order_index?: number
          pdi_plan_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          competency_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_url?: string | null
          feedback_request_id?: string | null
          id?: string
          order_index?: number
          pdi_plan_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_actions_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "pdi_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_actions_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_actions_pdi_plan_id_fkey"
            columns: ["pdi_plan_id"]
            isOneToOne: false
            referencedRelation: "pdi_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_competencies: {
        Row: {
          category: string | null
          created_at: string
          current_level: number
          description: string | null
          id: string
          name: string
          order_index: number
          pdi_plan_id: string
          target_level: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_level: number
          description?: string | null
          id?: string
          name: string
          order_index?: number
          pdi_plan_id: string
          target_level: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_level?: number
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          pdi_plan_id?: string
          target_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_competencies_pdi_plan_id_fkey"
            columns: ["pdi_plan_id"]
            isOneToOne: false
            referencedRelation: "pdi_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_plans: {
        Row: {
          approval_requested_at: string | null
          approved_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          cycle_id: string | null
          description: string | null
          evaluation_id: string | null
          id: string
          manager_id: string | null
          progress: number
          review_comment: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_requested_at?: string | null
          approved_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          evaluation_id?: string | null
          id?: string
          manager_id?: string | null
          progress?: number
          review_comment?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_requested_at?: string | null
          approved_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          evaluation_id?: string | null
          id?: string
          manager_id?: string | null
          progress?: number
          review_comment?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plans_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plans_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "my_evaluation_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plans_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "performance_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plans_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_plans_user_id_fkey"
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
            referencedRelation: "my_evaluation_results"
            referencedColumns: ["id"]
          },
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
          evaluators_config: Json | null
          id: string
          imported_at: string | null
          name: string
          source: string
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
          evaluators_config?: Json | null
          id?: string
          imported_at?: string | null
          name: string
          source?: string
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
          evaluators_config?: Json | null
          id?: string
          imported_at?: string | null
          name?: string
          source?: string
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
          feedz_ref: string | null
          id: string
          imported_at: string | null
          overall_score: number | null
          relationship: string
          relationship_type: string | null
          source: string
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
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          overall_score?: number | null
          relationship: string
          relationship_type?: string | null
          source?: string
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
          feedz_ref?: string | null
          id?: string
          imported_at?: string | null
          overall_score?: number | null
          relationship?: string
          relationship_type?: string | null
          source?: string
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
      performance_reviews: {
        Row: {
          company_id: string
          created_at: string
          final_score: number | null
          id: string
          imported_at: string | null
          period_end: string | null
          period_start: string | null
          review_name: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          final_score?: number | null
          id?: string
          imported_at?: string | null
          period_end?: string | null
          period_start?: string | null
          review_name: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          final_score?: number | null
          id?: string
          imported_at?: string | null
          period_end?: string | null
          period_start?: string | null
          review_name?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      position_history: {
        Row: {
          changed_at: string
          changed_by_name: string | null
          company_id: string
          created_at: string
          department_name: string | null
          id: string
          imported_at: string | null
          manager_name: string | null
          notes: string | null
          position: string | null
          reason: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          changed_at: string
          changed_by_name?: string | null
          company_id: string
          created_at?: string
          department_name?: string | null
          id?: string
          imported_at?: string | null
          manager_name?: string | null
          notes?: string | null
          position?: string | null
          reason?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by_name?: string | null
          company_id?: string
          created_at?: string
          department_name?: string | null
          id?: string
          imported_at?: string | null
          manager_name?: string | null
          notes?: string | null
          position?: string | null
          reason?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      pulse_participants: {
        Row: {
          created_at: string
          id: string
          period_start: string
          pulse_survey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_start: string
          pulse_survey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_start?: string
          pulse_survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_participants_pulse_survey_id_fkey"
            columns: ["pulse_survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_responses: {
        Row: {
          comment: string | null
          created_at: string
          emoji: string | null
          id: string
          period_start: string
          pulse_survey_id: string
          score: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          period_start: string
          pulse_survey_id: string
          score: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          period_start?: string
          pulse_survey_id?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_responses_pulse_survey_id_fkey"
            columns: ["pulse_survey_id"]
            isOneToOne: false
            referencedRelation: "pulse_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_responses: {
        Row: {
          answers: Json
          company_id: string
          id: string
          submitted_at: string
          survey_id: string
          user_id: string | null
        }
        Insert: {
          answers: Json
          company_id: string
          id?: string
          submitted_at?: string
          survey_id: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          company_id?: string
          id?: string
          submitted_at?: string
          survey_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_surveys: {
        Row: {
          active: boolean
          anonymous: boolean
          company_id: string
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          feedz_ref: string | null
          frequency: string
          id: string
          imported_at: string | null
          last_dispatched_at: string | null
          name: string
          question: string
          question_type: string
          require_comment_below: number | null
          send_hour_utc: number
          source: string
          target_all: boolean
          target_departments: string[] | null
          target_teams: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          anonymous?: boolean
          company_id: string
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          feedz_ref?: string | null
          frequency: string
          id?: string
          imported_at?: string | null
          last_dispatched_at?: string | null
          name: string
          question: string
          question_type?: string
          require_comment_below?: number | null
          send_hour_utc?: number
          source?: string
          target_all?: boolean
          target_departments?: string[] | null
          target_teams?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          anonymous?: boolean
          company_id?: string
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          feedz_ref?: string | null
          frequency?: string
          id?: string
          imported_at?: string | null
          last_dispatched_at?: string | null
          name?: string
          question?: string
          question_type?: string
          require_comment_below?: number | null
          send_hour_utc?: number
          source?: string
          target_all?: boolean
          target_departments?: string[] | null
          target_teams?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          feedz_ref: string | null
          from_user_id: string
          id: string
          imported_at: string | null
          message: string
          points: number
          source: string
          to_user_id: string
        }
        Insert: {
          badge_id?: string | null
          company_id: string
          created_at?: string
          feedz_ref?: string | null
          from_user_id: string
          id?: string
          imported_at?: string | null
          message: string
          points?: number
          source?: string
          to_user_id: string
        }
        Update: {
          badge_id?: string | null
          company_id?: string
          created_at?: string
          feedz_ref?: string | null
          from_user_id?: string
          id?: string
          imported_at?: string | null
          message?: string
          points?: number
          source?: string
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
      support_messages: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          current_page: string | null
          id: string
          message: string
          screen_size: string | null
          status: string
          subject: string
          updated_at: string | null
          user_age_group: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          current_page?: string | null
          id?: string
          message: string
          screen_size?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_age_group?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          current_page?: string | null
          id?: string
          message?: string
          screen_size?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_age_group?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
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
          order_index: number
          parent_team_id: string | null
          status: string
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
          order_index?: number
          parent_team_id?: string | null
          status?: string
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
          order_index?: number
          parent_team_id?: string | null
          status?: string
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
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            foreignKeyName: "time_off_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      user_activated_codes: {
        Row: {
          activated_at: string | null
          activation_code_id: string
          id: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activation_code_id: string
          id?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activation_code_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activated_codes_activation_code_id_fkey"
            columns: ["activation_code_id"]
            isOneToOne: false
            referencedRelation: "activation_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activated_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_education: {
        Row: {
          area: string | null
          certificate_url: string | null
          company_id: string
          course: string | null
          created_at: string
          end_date: string | null
          id: string
          imported_at: string | null
          institution: string | null
          skill: string | null
          source: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          certificate_url?: string | null
          company_id: string
          course?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          imported_at?: string | null
          institution?: string | null
          skill?: string | null
          source?: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          certificate_url?: string | null
          company_id?: string
          course?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          imported_at?: string | null
          institution?: string | null
          skill?: string | null
          source?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_education_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_education_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          lesson_id: string
          module_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          lesson_id: string
          module_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          lesson_id?: string
          module_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          age_group: string | null
          avatar: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          last_active_at: string | null
          locale: string | null
          metadata: Json | null
          primary_company_id: string | null
          role: string
          theme_preference: string | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          avatar?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          locale?: string | null
          metadata?: Json | null
          primary_company_id?: string | null
          role?: string
          theme_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          avatar?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          locale?: string | null
          metadata?: Json | null
          primary_company_id?: string | null
          role?: string
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_primary_company_id_fkey"
            columns: ["primary_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_evaluation_results: {
        Row: {
          can_view: boolean | null
          company_id: string | null
          completed_at: string | null
          cycle_id: string | null
          evaluated_id: string | null
          evaluator_id: string | null
          id: string | null
          overall_score: number | null
          relationship: string | null
          status: Database["public"]["Enums"]["evaluation_status"] | null
        }
        Insert: {
          can_view?: never
          company_id?: string | null
          completed_at?: string | null
          cycle_id?: string | null
          evaluated_id?: string | null
          evaluator_id?: string | null
          id?: string | null
          overall_score?: never
          relationship?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
        }
        Update: {
          can_view?: never
          company_id?: string | null
          completed_at?: string | null
          cycle_id?: string | null
          evaluated_id?: string | null
          evaluator_id?: string | null
          id?: string | null
          overall_score?: never
          relationship?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
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
    }
    Functions: {
      activate_code_for_user: {
        Args: { code_text: string; user_uuid: string }
        Returns: Json
      }
      calculate_expected_progress: {
        Args: { p_due_date?: string; p_period_id: string }
        Returns: number
      }
      can_delete_objective: {
        Args: { p_obj_id: string; p_user: string }
        Returns: boolean
      }
      can_edit_kr: {
        Args: { p_kr_id: string; p_objective_id?: string; p_user: string }
        Returns: boolean
      }
      can_edit_objective: {
        Args: { p_obj_id: string; p_user: string }
        Returns: boolean
      }
      can_manage_collaborators: {
        Args: { p_obj_id: string; p_user: string }
        Returns: boolean
      }
      can_manage_relations: {
        Args: { p_parent_obj_id: string; p_user: string }
        Returns: boolean
      }
      can_view_evaluation_result: {
        Args: { _evaluation_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_objective: {
        Args: { p_obj_id: string; p_user: string }
        Returns: boolean
      }
      cascade_objective_progress: {
        Args: { p_objective_id: string }
        Returns: undefined
      }
      create_360_evaluations: {
        Args: {
          p_cycle_id: string
          p_evaluated_user_id: string
          p_evaluator_user_ids: string[]
          p_relationship_types: string[]
        }
        Returns: {
          evaluation_id: string
          evaluator_id: string
          relationship: string
        }[]
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
      evaluator_finished_cycle: {
        Args: { _cycle_id: string; _evaluator_id: string }
        Returns: boolean
      }
      get_360_evaluation_summary: {
        Args: { p_cycle_id: string }
        Returns: {
          completed_evaluations: number
          completion_percentage: number
          evaluated_avatar: string
          evaluated_id: string
          evaluated_name: string
          manager_completed: boolean
          peers_completed: number
          pending_evaluations: number
          self_completed: boolean
          subordinates_completed: number
          total_evaluations: number
        }[]
      }
      get_led_teams: { Args: { p_user_id: string }; Returns: string[] }
      get_nine_box_distribution: {
        Args: { session_uuid: string }
        Returns: {
          count: number
          performance: number
          potential: number
          users: Json
        }[]
      }
      get_org_ancestors: {
        Args: { comp_id: string; leaf_user_id: string }
        Returns: {
          depth: number
          user_id: string
        }[]
      }
      get_org_subtree: {
        Args: { comp_id: string; root_user_id: string }
        Returns: {
          depth: number
          path: string[]
          user_id: string
        }[]
      }
      get_pulse_survey_stats: {
        Args: { survey_uuid: string }
        Returns: {
          avg_rating: number
          question_stats: Json
          total_responses: number
        }[]
      }
      get_user_role: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["membership_role"]
      }
      get_user_unlocked_courses: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      has_okr_access: {
        Args: { p_company_id: string; p_min_level: string; p_user_id: string }
        Returns: boolean
      }
      is_activation_code_valid: {
        Args: { code_text: string }
        Returns: boolean
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
      is_objective_collaborator: {
        Args: { p_obj_id: string; p_user: string }
        Returns: boolean
      }
      is_okr_collaborator: {
        Args: { p_objective_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_leader: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_manager: {
        Args: { comp_id: string; manager_uid: string; subordinate_uid: string }
        Returns: boolean
      }
      publish_scheduled_announcements_now: { Args: never; Returns: Json }
      rollback_redistribution_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      save_redistribution_session: {
        Args: {
          p_changes: Json
          p_description: string
          p_total_after: number
          p_total_before: number
          p_user_id: string
        }
        Returns: string
      }
      unarchive_nine_box_snapshot: {
        Args: { snapshot_id: string }
        Returns: undefined
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
