export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      buildings: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      channels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dependencies: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      escalation_rules: {
        Row: {
          active: boolean
          condition: Database['public']['Enums']['escalation_condition']
          created_at: string
          id: string
          notify: string
          threshold: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          condition: Database['public']['Enums']['escalation_condition']
          created_at?: string
          id?: string
          notify?: string
          threshold: string
        }
        Update: {
          active?: boolean
          condition?: Database['public']['Enums']['escalation_condition']
          created_at?: string
          id?: string
          notify?: string
          threshold?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          captured_by_technician_id: string | null
          captured_by_user_id: string | null
          client_request_id: string | null
          created_at: string
          cycle: number
          event_id: number | null
          id: string
          mime_type: string | null
          occurred_at: string
          recorded_at: string
          size_bytes: number | null
          storage_path: string | null
          ticket_id: string
          type: Database['public']['Enums']['evidence_type']
          uploaded_by: string | null
        }
        ComputedFields: never
        Insert: {
          captured_by_technician_id?: string | null
          captured_by_user_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle: number
          event_id?: number | null
          id?: string
          mime_type?: string | null
          occurred_at?: string
          recorded_at?: string
          size_bytes?: number | null
          storage_path?: string | null
          ticket_id: string
          type: Database['public']['Enums']['evidence_type']
          uploaded_by?: string | null
        }
        Update: {
          captured_by_technician_id?: string | null
          captured_by_user_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle?: number
          event_id?: number | null
          id?: string
          mime_type?: string | null
          occurred_at?: string
          recorded_at?: string
          size_bytes?: number | null
          storage_path?: string | null
          ticket_id?: string
          type?: Database['public']['Enums']['evidence_type']
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'evidence_captured_by_technician_id_fkey'
            columns: ['captured_by_technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'ticket_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_events_requester'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      external_systems: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          actor_id: string | null
          client_request_id: string
          created_at: string
          operation: string
        }
        ComputedFields: never
        Insert: {
          actor_id?: string | null
          client_request_id: string
          created_at?: string
          operation: string
        }
        Update: {
          actor_id?: string | null
          client_request_id?: string
          created_at?: string
          operation?: string
        }
        Relationships: []
      }
      instance_settings: {
        Row: {
          auto_validation_days: number | null
          claim_window: string
          created_at: string
          default_calendar_id: string | null
          duplicate_shown_fields: string[]
          duplicate_similarity: number
          duplicate_window: string
          folio_pattern: string
          id: string
          request_evidence_policy: string
          requester_visible_event_types: Database['public']['Enums']['event_type'][]
          singleton: boolean
          team_label: string
          timezone: string
          updated_at: string
          validation_policy: string
        }
        ComputedFields: never
        Insert: {
          auto_validation_days?: number | null
          claim_window?: string
          created_at?: string
          default_calendar_id?: string | null
          duplicate_shown_fields?: string[]
          duplicate_similarity?: number
          duplicate_window?: string
          folio_pattern?: string
          id?: string
          request_evidence_policy?: string
          requester_visible_event_types?: Database['public']['Enums']['event_type'][]
          singleton?: boolean
          team_label?: string
          timezone?: string
          updated_at?: string
          validation_policy?: string
        }
        Update: {
          auto_validation_days?: number | null
          claim_window?: string
          created_at?: string
          default_calendar_id?: string | null
          duplicate_shown_fields?: string[]
          duplicate_similarity?: number
          duplicate_window?: string
          folio_pattern?: string
          id?: string
          request_evidence_policy?: string
          requester_visible_event_types?: Database['public']['Enums']['event_type'][]
          singleton?: boolean
          team_label?: string
          timezone?: string
          updated_at?: string
          validation_policy?: string
        }
        Relationships: [
          {
            foreignKeyName: 'instance_settings_default_calendar_id_fkey'
            columns: ['default_calendar_id']
            isOneToOne: false
            referencedRelation: 'work_calendars'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          building_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          building_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          building_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
        ]
      }
      notification_rules: {
        Row: {
          active: boolean
          channel: Database['public']['Enums']['notification_channel']
          created_at: string
          event_type: Database['public']['Enums']['event_type']
          id: string
          recipient: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string
          event_type: Database['public']['Enums']['event_type']
          id?: string
          recipient: string
        }
        Update: {
          active?: boolean
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string
          event_type?: Database['public']['Enums']['event_type']
          id?: string
          recipient?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: Database['public']['Enums']['notification_channel']
          created_at: string
          event_id: number | null
          id: string
          payload: NonNullable<Json>
          read_at: string | null
          recipient_requester_id: string | null
          recipient_user_id: string | null
          ticket_id: string | null
          type: Database['public']['Enums']['event_type']
        }
        ComputedFields: never
        Insert: {
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string
          event_id?: number | null
          id?: string
          payload?: NonNullable<Json>
          read_at?: string | null
          recipient_requester_id?: string | null
          recipient_user_id?: string | null
          ticket_id?: string | null
          type: Database['public']['Enums']['event_type']
        }
        Update: {
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string
          event_id?: number | null
          id?: string
          payload?: NonNullable<Json>
          read_at?: string | null
          recipient_requester_id?: string | null
          recipient_user_id?: string | null
          ticket_id?: string | null
          type?: Database['public']['Enums']['event_type']
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'ticket_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_events_requester'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_recipient_requester_id_fkey'
            columns: ['recipient_requester_id']
            isOneToOne: false
            referencedRelation: 'requesters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string
          id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          description: string
          id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      priorities: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
          target_minutes: number | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
          target_minutes?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
          target_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          subcategory_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          subcategory_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'problems_subcategory_id_fkey'
            columns: ['subcategory_id']
            isOneToOne: false
            referencedRelation: 'subcategories'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reasons: {
        Row: {
          active: boolean
          allows_estimated_date: boolean
          clock_class: Database['public']['Enums']['clock_class']
          created_at: string
          id: string
          name: string
          parent_id: string | null
          position: number
          requires_note: boolean
          updated_at: string
          use: Database['public']['Enums']['reason_use']
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          allows_estimated_date?: boolean
          clock_class?: Database['public']['Enums']['clock_class']
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          requires_note?: boolean
          updated_at?: string
          use: Database['public']['Enums']['reason_use']
        }
        Update: {
          active?: boolean
          allows_estimated_date?: boolean
          clock_class?: Database['public']['Enums']['clock_class']
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          requires_note?: boolean
          updated_at?: string
          use?: Database['public']['Enums']['reason_use']
        }
        Relationships: [
          {
            foreignKeyName: 'reasons_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
        ]
      }
      requesters: {
        Row: {
          active: boolean
          contact: string | null
          created_at: string
          dependency_id: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          contact?: string | null
          created_at?: string
          dependency_id?: string | null
          full_name: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          contact?: string | null
          created_at?: string
          dependency_id?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'requesters_dependency_id_fkey'
            columns: ['dependency_id']
            isOneToOne: false
            referencedRelation: 'dependencies'
            referencedColumns: ['id']
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
          scope: Database['public']['Enums']['permission_scope']
        }
        ComputedFields: never
        Insert: {
          permission_id: string
          role_id: string
          scope: Database['public']['Enums']['permission_scope']
        }
        Update: {
          permission_id?: string
          role_id?: string
          scope?: Database['public']['Enums']['permission_scope']
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subcategories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      supervisor_scope_buildings: {
        Row: {
          building_id: string
          scope_id: string
        }
        ComputedFields: never
        Insert: {
          building_id: string
          scope_id: string
        }
        Update: {
          building_id?: string
          scope_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supervisor_scope_buildings_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supervisor_scope_buildings_scope_id_fkey'
            columns: ['scope_id']
            isOneToOne: false
            referencedRelation: 'supervisor_scopes'
            referencedColumns: ['id']
          },
        ]
      }
      supervisor_scopes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          team_id: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supervisor_scopes_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      technician_categories: {
        Row: {
          category_id: string
          technician_id: string
        }
        ComputedFields: never
        Insert: {
          category_id: string
          technician_id: string
        }
        Update: {
          category_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'technician_categories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'technician_categories_technician_id_fkey'
            columns: ['technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          team_id: string
          updated_at: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'technicians_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignee_technician_id: string | null
          assignee_user_id: string | null
          client_request_id: string | null
          created_at: string
          cycle: number
          ended_at: string | null
          id: string
          note: string | null
          reason_id: string | null
          stage: Database['public']['Enums']['assignment_stage']
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_technician_id?: string | null
          assignee_user_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle: number
          ended_at?: string | null
          id?: string
          note?: string | null
          reason_id?: string | null
          stage: Database['public']['Enums']['assignment_stage']
          ticket_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_technician_id?: string | null
          assignee_user_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle?: number
          ended_at?: string | null
          id?: string
          note?: string | null
          reason_id?: string | null
          stage?: Database['public']['Enums']['assignment_stage']
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_assignments_assignee_technician_id_fkey'
            columns: ['assignee_technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_captures: {
        Row: {
          changed_at: string
          changed_by: string | null
          changes: NonNullable<Json>
          created_at: string
          cycle: number
          id: string
          reason_id: string | null
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changes: NonNullable<Json>
          created_at?: string
          cycle: number
          id?: string
          reason_id?: string | null
          ticket_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changes?: NonNullable<Json>
          created_at?: string
          cycle?: number
          id?: string
          reason_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_captures_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_captures_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_captures_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_claims: {
        Row: {
          client_request_id: string | null
          created_at: string
          cycle: number
          description: string
          id: string
          opened_at: string
          opened_by: string | null
          prior_status: Database['public']['Enums']['ticket_status']
          reason_id: string
          resolution: Database['public']['Enums']['claim_resolution'] | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          result_id: string | null
          status: Database['public']['Enums']['claim_status']
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          client_request_id?: string | null
          created_at?: string
          cycle: number
          description: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          prior_status: Database['public']['Enums']['ticket_status']
          reason_id: string
          resolution?: Database['public']['Enums']['claim_resolution'] | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result_id?: string | null
          status?: Database['public']['Enums']['claim_status']
          ticket_id: string
        }
        Update: {
          client_request_id?: string | null
          created_at?: string
          cycle?: number
          description?: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          prior_status?: Database['public']['Enums']['ticket_status']
          reason_id?: string
          resolution?: Database['public']['Enums']['claim_resolution'] | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result_id?: string | null
          status?: Database['public']['Enums']['claim_status']
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_claims_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_result_id_fkey'
            columns: ['result_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_duplicate_candidates: {
        Row: {
          candidate_ticket_id: string
          decision: string | null
          id: string
          shown_at: string
          similarity: number
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          candidate_ticket_id: string
          decision?: string | null
          id?: string
          shown_at?: string
          similarity: number
          ticket_id: string
        }
        Update: {
          candidate_ticket_id?: string
          decision?: string | null
          id?: string
          shown_at?: string
          similarity?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_duplicate_candidates_candidate_ticket_id_fkey'
            columns: ['candidate_ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_candidate_ticket_id_fkey'
            columns: ['candidate_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_id: string | null
          client_request_id: string | null
          created_at: string
          cycle: number
          id: number
          occurred_at: string
          payload: NonNullable<Json>
          reason_id: string | null
          recorded_at: string
          source: Database['public']['Enums']['event_source']
          subject_technician_id: string | null
          subject_user_id: string | null
          ticket_id: string
          type: Database['public']['Enums']['event_type']
        }
        ComputedFields: never
        Insert: {
          actor_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle: number
          id?: never
          occurred_at?: string
          payload?: NonNullable<Json>
          reason_id?: string | null
          recorded_at?: string
          source?: Database['public']['Enums']['event_source']
          subject_technician_id?: string | null
          subject_user_id?: string | null
          ticket_id: string
          type: Database['public']['Enums']['event_type']
        }
        Update: {
          actor_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle?: number
          id?: never
          occurred_at?: string
          payload?: NonNullable<Json>
          reason_id?: string | null
          recorded_at?: string
          source?: Database['public']['Enums']['event_source']
          subject_technician_id?: string | null
          subject_user_id?: string | null
          ticket_id?: string
          type?: Database['public']['Enums']['event_type']
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_events_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_subject_technician_id_fkey'
            columns: ['subject_technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_external_refs: {
        Row: {
          created_at: string
          external_id: string
          id: string
          system: string
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          system: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          system?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_external_refs_system_fkey'
            columns: ['system']
            isOneToOne: false
            referencedRelation: 'external_systems'
            referencedColumns: ['name']
          },
          {
            foreignKeyName: 'ticket_external_refs_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_external_refs_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_type: Database['public']['Enums']['link_type']
          linked_ticket_id: string
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type: Database['public']['Enums']['link_type']
          linked_ticket_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: Database['public']['Enums']['link_type']
          linked_ticket_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_links_linked_ticket_id_fkey'
            columns: ['linked_ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_linked_ticket_id_fkey'
            columns: ['linked_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_offers: {
        Row: {
          cycle: number
          id: string
          offered_at: string
          resolved_at: string | null
          status: Database['public']['Enums']['offer_status']
          supervisor_user_id: string
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          cycle: number
          id?: string
          offered_at?: string
          resolved_at?: string | null
          status?: Database['public']['Enums']['offer_status']
          supervisor_user_id: string
          ticket_id: string
        }
        Update: {
          cycle?: number
          id?: string
          offered_at?: string
          resolved_at?: string | null
          status?: Database['public']['Enums']['offer_status']
          supervisor_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_offers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_offers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_participants: {
        Row: {
          category_id: string | null
          client_request_id: string | null
          created_at: string
          cycle: number
          ended_at: string | null
          id: string
          origin: Database['public']['Enums']['span_origin']
          participation_type: Database['public']['Enums']['participation_type']
          recorded_by: string | null
          started_at: string
          technician_id: string
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          category_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle: number
          ended_at?: string | null
          id?: string
          origin?: Database['public']['Enums']['span_origin']
          participation_type: Database['public']['Enums']['participation_type']
          recorded_by?: string | null
          started_at?: string
          technician_id: string
          ticket_id: string
        }
        Update: {
          category_id?: string | null
          client_request_id?: string | null
          created_at?: string
          cycle?: number
          ended_at?: string | null
          id?: string
          origin?: Database['public']['Enums']['span_origin']
          participation_type?: Database['public']['Enums']['participation_type']
          recorded_by?: string | null
          started_at?: string
          technician_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_participants_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_technician_id_fkey'
            columns: ['technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_pause_steps: {
        Row: {
          actor_id: string | null
          entered_at: string
          exited_at: string | null
          id: string
          note: string | null
          pause_id: string
          reason_id: string
        }
        ComputedFields: never
        Insert: {
          actor_id?: string | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          note?: string | null
          pause_id: string
          reason_id: string
        }
        Update: {
          actor_id?: string | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          note?: string | null
          pause_id?: string
          reason_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_pause_steps_pause_id_fkey'
            columns: ['pause_id']
            isOneToOne: false
            referencedRelation: 'ticket_pauses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pause_steps_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_pauses: {
        Row: {
          client_request_id: string | null
          closed_at: string | null
          created_at: string
          cycle: number
          estimated_date: string | null
          id: string
          note: string | null
          opened_at: string
          opened_by: string | null
          origin: Database['public']['Enums']['span_origin']
          reason_id: string
          recorded_by: string | null
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          client_request_id?: string | null
          closed_at?: string | null
          created_at?: string
          cycle: number
          estimated_date?: string | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          origin?: Database['public']['Enums']['span_origin']
          reason_id: string
          recorded_by?: string | null
          ticket_id: string
        }
        Update: {
          client_request_id?: string | null
          closed_at?: string | null
          created_at?: string
          cycle?: number
          estimated_date?: string | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          origin?: Database['public']['Enums']['span_origin']
          reason_id?: string
          recorded_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_pauses_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pauses_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pauses_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_validations: {
        Row: {
          cycle: number
          id: string
          ticket_id: string
          validated_at: string
          validator_role: string
          validator_user_id: string | null
        }
        ComputedFields: never
        Insert: {
          cycle: number
          id?: string
          ticket_id: string
          validated_at?: string
          validator_role: string
          validator_user_id?: string | null
        }
        Update: {
          cycle?: number
          id?: string
          ticket_id?: string
          validated_at?: string
          validator_role?: string
          validator_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_validations_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_validations_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      tickets: {
        Row: {
          building_id: string
          category_id: string
          channel_id: string
          closed_at: string | null
          created_at: string
          cycle: number
          dependency_id: string
          description: string
          duplicate_of_id: string | null
          folio: string
          id: string
          location_id: string
          possible_duplicate: boolean
          priority_id: string
          problem_id: string | null
          registered_by: string | null
          reported_at: string
          requester_contact: string | null
          requester_id: string
          requester_name: string
          service_type_id: string
          status: Database['public']['Enums']['ticket_status']
          status_before_discard:
            Database['public']['Enums']['ticket_status'] | null
          subcategory_id: string | null
          team_id: string
          ticket_number: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          building_id: string
          category_id: string
          channel_id: string
          closed_at?: string | null
          created_at?: string
          cycle?: number
          dependency_id: string
          description: string
          duplicate_of_id?: string | null
          folio: string
          id?: string
          location_id: string
          possible_duplicate?: boolean
          priority_id: string
          problem_id?: string | null
          registered_by?: string | null
          reported_at?: string
          requester_contact?: string | null
          requester_id: string
          requester_name: string
          service_type_id: string
          status?: Database['public']['Enums']['ticket_status']
          status_before_discard?:
            Database['public']['Enums']['ticket_status'] | null
          subcategory_id?: string | null
          team_id: string
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          building_id?: string
          category_id?: string
          channel_id?: string
          closed_at?: string | null
          created_at?: string
          cycle?: number
          dependency_id?: string
          description?: string
          duplicate_of_id?: string | null
          folio?: string
          id?: string
          location_id?: string
          possible_duplicate?: boolean
          priority_id?: string
          problem_id?: string | null
          registered_by?: string | null
          reported_at?: string
          requester_contact?: string | null
          requester_id?: string
          requester_name?: string
          service_type_id?: string
          status?: Database['public']['Enums']['ticket_status']
          status_before_discard?:
            Database['public']['Enums']['ticket_status'] | null
          subcategory_id?: string | null
          team_id?: string
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tickets_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_dependency_id_fkey'
            columns: ['dependency_id']
            isOneToOne: false
            referencedRelation: 'dependencies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_duplicate_of_id_fkey'
            columns: ['duplicate_of_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_duplicate_of_id_fkey'
            columns: ['duplicate_of_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'priorities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_problem_id_fkey'
            columns: ['problem_id']
            isOneToOne: false
            referencedRelation: 'problems'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'requesters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_service_type_id_fkey'
            columns: ['service_type_id']
            isOneToOne: false
            referencedRelation: 'service_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_subcategory_id_fkey'
            columns: ['subcategory_id']
            isOneToOne: false
            referencedRelation: 'subcategories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      time_spans: {
        Row: {
          client_request_id: string | null
          clock_class: Database['public']['Enums']['clock_class']
          created_at: string
          cycle: number
          ended_at: string | null
          id: string
          kind: Database['public']['Enums']['time_span_kind']
          origin: Database['public']['Enums']['span_origin']
          recorded_by: string | null
          ref_id: string | null
          started_at: string
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          client_request_id?: string | null
          clock_class?: Database['public']['Enums']['clock_class']
          created_at?: string
          cycle: number
          ended_at?: string | null
          id?: string
          kind: Database['public']['Enums']['time_span_kind']
          origin?: Database['public']['Enums']['span_origin']
          recorded_by?: string | null
          ref_id?: string | null
          started_at: string
          ticket_id: string
        }
        Update: {
          client_request_id?: string | null
          clock_class?: Database['public']['Enums']['clock_class']
          created_at?: string
          cycle?: number
          ended_at?: string | null
          id?: string
          kind?: Database['public']['Enums']['time_span_kind']
          origin?: Database['public']['Enums']['span_origin']
          recorded_by?: string | null
          ref_id?: string | null
          started_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_spans_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_spans_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      work_calendar_holidays: {
        Row: {
          calendar_id: string
          holiday: string
          id: string
          name: string | null
        }
        ComputedFields: never
        Insert: {
          calendar_id: string
          holiday: string
          id?: string
          name?: string | null
        }
        Update: {
          calendar_id?: string
          holiday?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'work_calendar_holidays_calendar_id_fkey'
            columns: ['calendar_id']
            isOneToOne: false
            referencedRelation: 'work_calendars'
            referencedColumns: ['id']
          },
        ]
      }
      work_calendar_intervals: {
        Row: {
          calendar_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        ComputedFields: never
        Insert: {
          calendar_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          calendar_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: 'work_calendar_intervals_calendar_id_fkey'
            columns: ['calendar_id']
            isOneToOne: false
            referencedRelation: 'work_calendars'
            referencedColumns: ['id']
          },
        ]
      }
      work_calendars: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          timezone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_ticket_events_requester: {
        Row: {
          cycle: number | null
          id: number | null
          occurred_at: string | null
          payload: Json | null
          recorded_at: string | null
          ticket_id: string | null
          type: Database['public']['Enums']['event_type'] | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
        ]
      }
      v_ticket_metrics_base: {
        Row: {
          active_work_time: string | null
          building_id: string | null
          category_id: string | null
          closed_at: string | null
          folio: string | null
          id: string | null
          net_time: string | null
          priority_id: string | null
          reported_at: string | null
          status: Database['public']['Enums']['ticket_status'] | null
          team_id: string | null
          ticket_number: number | null
          total_time: string | null
        }
        ComputedFields: never
        Insert: {
          active_work_time?: never
          building_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          folio?: string | null
          id?: string | null
          net_time?: never
          priority_id?: string | null
          reported_at?: string | null
          status?: Database['public']['Enums']['ticket_status'] | null
          team_id?: string | null
          ticket_number?: number | null
          total_time?: never
        }
        Update: {
          active_work_time?: never
          building_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          folio?: string | null
          id?: string | null
          net_time?: never
          priority_id?: string | null
          reported_at?: string | null
          status?: Database['public']['Enums']['ticket_status'] | null
          team_id?: string | null
          ticket_number?: number | null
          total_time?: never
        }
        Relationships: [
          {
            foreignKeyName: 'tickets_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'priorities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      can_see_ticket: { Args: { p_ticket_id: string }; Returns: boolean }
      evidence_add: {
        Args: {
          p_client_request_id?: string
          p_mime_type?: string
          p_occurred_at?: string
          p_size_bytes?: number
          p_storage_path: string
          p_ticket_id: string
          p_type: Database['public']['Enums']['evidence_type']
        }
        Returns: string
      }
      has_permission: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
      me: { Args: Record<PropertyKey, never>; Returns: Json }
      notification_mark_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      notify_event: { Args: { p_event_id: number }; Returns: undefined }
      profile_update: {
        Args: { p_full_name: string; p_phone?: string }
        Returns: undefined
      }
      request_already_handled: {
        Args: { p_client_request_id: string }
        Returns: boolean
      }
      require_permission: { Args: { p_permission: string }; Returns: undefined }
      ticket_add_auxiliary: {
        Args: {
          p_client_request_id?: string
          p_note?: string
          p_reason_id: string
          p_technician_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_advance_pause: {
        Args: {
          p_client_request_id?: string
          p_note?: string
          p_reason_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_assign_supervisor: {
        Args: {
          p_client_request_id?: string
          p_note?: string
          p_reason_id: string
          p_supervisor_user_id?: string
          p_team_id?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_assign_technician: {
        Args: {
          p_client_request_id?: string
          p_reason_id?: string
          p_technician_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_attend: {
        Args: {
          p_client_request_id?: string
          p_ticket_id: string
          p_work_description: string
        }
        Returns: undefined
      }
      ticket_cancel: {
        Args: {
          p_client_request_id?: string
          p_note?: string
          p_reason_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_change_priority: {
        Args: {
          p_client_request_id?: string
          p_priority_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_check_duplicates: { Args: { p_data: Json }; Returns: Json }
      ticket_comment: {
        Args: {
          p_client_request_id?: string
          p_is_internal?: boolean
          p_text: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_create: {
        Args: { p_client_request_id?: string; p_data: Json }
        Returns: string
      }
      ticket_detect_duplicates: {
        Args: { p_ticket_id: string }
        Returns: undefined
      }
      ticket_mark_duplicate: {
        Args: {
          p_client_request_id?: string
          p_original_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_open_claim: {
        Args: {
          p_client_request_id?: string
          p_description: string
          p_reason_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_pause: {
        Args: {
          p_client_request_id?: string
          p_estimated_date?: string
          p_note?: string
          p_reason_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_reactivate: {
        Args: {
          p_client_request_id?: string
          p_reason_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_recapture: {
        Args: {
          p_changes: Json
          p_client_request_id?: string
          p_reason_id?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_reject: {
        Args: {
          p_client_request_id?: string
          p_note?: string
          p_reason_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_resolve_claim: {
        Args: {
          p_client_request_id?: string
          p_note?: string
          p_resolution: Database['public']['Enums']['claim_resolution']
          p_result_id?: string
          p_ticket_id: string
        }
        Returns: string
      }
      ticket_resume: {
        Args: { p_client_request_id?: string; p_ticket_id: string }
        Returns: undefined
      }
      ticket_route: { Args: { p_ticket_id: string }; Returns: undefined }
      ticket_start: {
        Args: { p_client_request_id?: string; p_ticket_id: string }
        Returns: undefined
      }
      ticket_take: {
        Args: { p_client_request_id?: string; p_ticket_id: string }
        Returns: undefined
      }
      ticket_time_by_kind: {
        Args: {
          p_kind: Database['public']['Enums']['time_span_kind']
          p_ticket_id: string
        }
        Returns: string
      }
      ticket_time_net: { Args: { p_ticket_id: string }; Returns: string }
      ticket_time_total: { Args: { p_ticket_id: string }; Returns: string }
      ticket_validate: {
        Args: { p_client_request_id?: string; p_ticket_id: string }
        Returns: undefined
      }
      time_span_record: {
        Args: {
          p_client_request_id?: string
          p_clock_class?: Database['public']['Enums']['clock_class']
          p_ended_at: string
          p_kind: Database['public']['Enums']['time_span_kind']
          p_started_at: string
          p_ticket_id: string
        }
        Returns: string
      }
      write_event: {
        Args: {
          p_client_request_id?: string
          p_payload?: Json
          p_reason_id?: string
          p_subject_technician_id?: string
          p_subject_user_id?: string
          p_ticket_id: string
          p_type: Database['public']['Enums']['event_type']
        }
        Returns: undefined
      }
    }
    Enums: {
      assignment_stage: 'supervisor' | 'technician'
      claim_resolution: 'upheld' | 'dismissed' | 'new_ticket'
      claim_status: 'open' | 'resolved'
      clock_class: 'counted' | 'not_counted'
      escalation_condition:
        | 'untaken'
        | 'unassigned'
        | 'no_candidate'
        | 'target_near'
        | 'target_overdue'
      event_source: 'app' | 'import' | 'integration'
      event_type:
        | 'created'
        | 'offered'
        | 'taken'
        | 'reassigned_supervisor'
        | 'assigned_technician'
        | 'reassigned_technician'
        | 'auxiliary_added'
        | 'capture_recaptured'
        | 'started'
        | 'paused'
        | 'pause_advanced'
        | 'resumed'
        | 'attended'
        | 'validated'
        | 'claim_opened'
        | 'claim_resolved'
        | 'reopened'
        | 'rejected'
        | 'cancelled'
        | 'duplicate_marked'
        | 'reactivated'
        | 'priority_changed'
        | 'comment'
        | 'evidence_added'
        | 'imported'
      evidence_type:
        'request' | 'before' | 'during' | 'after' | 'claim' | 'other'
      link_type: 'duplicate_of' | 'derived_from' | 'related_to' | 'blocked_by'
      notification_channel: 'in_app' | 'email' | 'push' | 'sms'
      offer_status: 'offered' | 'taken' | 'withdrawn'
      participation_type: 'leader' | 'auxiliary'
      permission_scope: 'own' | 'team' | 'buildings' | 'all'
      reason_use:
        | 'pause'
        | 'rejection'
        | 'cancellation'
        | 'supervisor_reassignment'
        | 'technician_reassignment'
        | 'recapture'
        | 'claim'
        | 'claim_outcome'
        | 'reactivation'
        | 'auxiliary_support'
      span_origin: 'system' | 'manual'
      ticket_status:
        | 'registered'
        | 'with_supervisor'
        | 'assigned'
        | 'in_progress'
        | 'paused'
        | 'attended'
        | 'under_claim'
        | 'closed'
        | 'rejected'
        | 'cancelled'
        | 'duplicate'
      time_span_kind:
        | 'supervisor_response'
        | 'reassignment'
        | 'technician_assignment'
        | 'recapture'
        | 'wait_start'
        | 'active_work'
        | 'pause'
        | 'validation'
        | 'claim'
        | 'duplicate_review'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_stage: ['supervisor', 'technician'],
      claim_resolution: ['upheld', 'dismissed', 'new_ticket'],
      claim_status: ['open', 'resolved'],
      clock_class: ['counted', 'not_counted'],
      escalation_condition: [
        'untaken',
        'unassigned',
        'no_candidate',
        'target_near',
        'target_overdue',
      ],
      event_source: ['app', 'import', 'integration'],
      event_type: [
        'created',
        'offered',
        'taken',
        'reassigned_supervisor',
        'assigned_technician',
        'reassigned_technician',
        'auxiliary_added',
        'capture_recaptured',
        'started',
        'paused',
        'pause_advanced',
        'resumed',
        'attended',
        'validated',
        'claim_opened',
        'claim_resolved',
        'reopened',
        'rejected',
        'cancelled',
        'duplicate_marked',
        'reactivated',
        'priority_changed',
        'comment',
        'evidence_added',
        'imported',
      ],
      evidence_type: ['request', 'before', 'during', 'after', 'claim', 'other'],
      link_type: ['duplicate_of', 'derived_from', 'related_to', 'blocked_by'],
      notification_channel: ['in_app', 'email', 'push', 'sms'],
      offer_status: ['offered', 'taken', 'withdrawn'],
      participation_type: ['leader', 'auxiliary'],
      permission_scope: ['own', 'team', 'buildings', 'all'],
      reason_use: [
        'pause',
        'rejection',
        'cancellation',
        'supervisor_reassignment',
        'technician_reassignment',
        'recapture',
        'claim',
        'claim_outcome',
        'reactivation',
        'auxiliary_support',
      ],
      span_origin: ['system', 'manual'],
      ticket_status: [
        'registered',
        'with_supervisor',
        'assigned',
        'in_progress',
        'paused',
        'attended',
        'under_claim',
        'closed',
        'rejected',
        'cancelled',
        'duplicate',
      ],
      time_span_kind: [
        'supervisor_response',
        'reassignment',
        'technician_assignment',
        'recapture',
        'wait_start',
        'active_work',
        'pause',
        'validation',
        'claim',
        'duplicate_review',
      ],
    },
  },
} as const
