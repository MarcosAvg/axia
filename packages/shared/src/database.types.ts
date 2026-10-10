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
      catalog_aliases: {
        Row: {
          alias: string
          catalog: string
          created_at: string
          id: string
          record_id: string
        }
        ComputedFields: never
        Insert: {
          alias: string
          catalog: string
          created_at?: string
          id?: string
          record_id: string
        }
        Update: {
          alias?: string
          catalog?: string
          created_at?: string
          id?: string
          record_id?: string
        }
        Relationships: []
      }
      catalog_import_rows: {
        Row: {
          catalog_key: string
          created_at: string
          error: string | null
          id: string
          raw: NonNullable<Json>
          record_id: string | null
          result: string
          row_number: number | null
          run_id: string
        }
        ComputedFields: never
        Insert: {
          catalog_key: string
          created_at?: string
          error?: string | null
          id?: string
          raw?: NonNullable<Json>
          record_id?: string | null
          result: string
          row_number?: number | null
          run_id: string
        }
        Update: {
          catalog_key?: string
          created_at?: string
          error?: string | null
          id?: string
          raw?: NonNullable<Json>
          record_id?: string | null
          result?: string
          row_number?: number | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'catalog_import_rows_run_id_fkey'
            columns: ['run_id']
            isOneToOne: false
            referencedRelation: 'catalog_import_runs'
            referencedColumns: ['id']
          },
        ]
      }
      catalog_import_runs: {
        Row: {
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          mode: string
          source_file: string | null
          started_at: string
          status: string
          summary: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          source_file?: string | null
          started_at?: string
          status?: string
          summary?: NonNullable<Json>
        }
        Update: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          source_file?: string | null
          started_at?: string
          status?: string
          summary?: NonNullable<Json>
        }
        Relationships: []
      }
      catalog_import_specs: {
        Row: {
          catalog_key: string
          columns: NonNullable<Json>
          match_columns: NonNullable<Json>
          table_name: string
        }
        ComputedFields: never
        Insert: {
          catalog_key: string
          columns: NonNullable<Json>
          match_columns: NonNullable<Json>
          table_name: string
        }
        Update: {
          catalog_key?: string
          columns?: NonNullable<Json>
          match_columns?: NonNullable<Json>
          table_name?: string
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
          is_platform: boolean
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_platform?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_platform?: boolean
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
            foreignKeyName: 'evidence_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_timeline'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evidence_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
            referencedColumns: ['id']
          },
        ]
      }
      external_systems: {
        Row: {
          active: boolean
          authority: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          authority?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          authority?: string
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
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          finished_at: string | null
          id: string
          mode: string
          started_at: string
          status: string
          summary: NonNullable<Json>
          system: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          status?: string
          summary?: NonNullable<Json>
          system: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          status?: string
          summary?: NonNullable<Json>
          system?: string
        }
        Relationships: [
          {
            foreignKeyName: 'import_batches_system_fkey'
            columns: ['system']
            isOneToOne: false
            referencedRelation: 'external_systems'
            referencedColumns: ['name']
          },
        ]
      }
      import_records: {
        Row: {
          batch_id: string
          created_at: string
          error: string | null
          id: string
          raw: NonNullable<Json>
          result: string
          row_number: number | null
          ticket_id: string | null
        }
        ComputedFields: never
        Insert: {
          batch_id: string
          created_at?: string
          error?: string | null
          id?: string
          raw: NonNullable<Json>
          result?: string
          row_number?: number | null
          ticket_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          error?: string | null
          id?: string
          raw?: NonNullable<Json>
          result?: string
          row_number?: number | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_records_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'import_batches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_records_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_records_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_records_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_records_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_records_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'import_records_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
            referencedColumns: ['id']
          },
        ]
      }
      import_status_map: {
        Row: {
          created_at: string
          external_status: string
          id: string
          system: string
          ticket_status: Database['public']['Enums']['ticket_status']
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          external_status: string
          id?: string
          system: string
          ticket_status: Database['public']['Enums']['ticket_status']
        }
        Update: {
          created_at?: string
          external_status?: string
          id?: string
          system?: string
          ticket_status?: Database['public']['Enums']['ticket_status']
        }
        Relationships: [
          {
            foreignKeyName: 'import_status_map_system_fkey'
            columns: ['system']
            isOneToOne: false
            referencedRelation: 'external_systems'
            referencedColumns: ['name']
          },
        ]
      }
      instance_settings: {
        Row: {
          auto_validation_days: number | null
          claim_window: string
          created_at: string
          default_calendar_id: string | null
          default_priority_id: string | null
          duplicate_shown_fields: string[]
          duplicate_similarity: number
          duplicate_window: string
          folio_pattern: string
          id: string
          request_evidence_policy: string
          requester_visible_event_types: Database['public']['Enums']['event_type'][]
          singleton: boolean
          sla_clock_mode: string
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
          default_priority_id?: string | null
          duplicate_shown_fields?: string[]
          duplicate_similarity?: number
          duplicate_window?: string
          folio_pattern?: string
          id?: string
          request_evidence_policy?: string
          requester_visible_event_types?: Database['public']['Enums']['event_type'][]
          singleton?: boolean
          sla_clock_mode?: string
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
          default_priority_id?: string | null
          duplicate_shown_fields?: string[]
          duplicate_similarity?: number
          duplicate_window?: string
          folio_pattern?: string
          id?: string
          request_evidence_policy?: string
          requester_visible_event_types?: Database['public']['Enums']['event_type'][]
          singleton?: boolean
          sla_clock_mode?: string
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
          {
            foreignKeyName: 'instance_settings_default_priority_id_fkey'
            columns: ['default_priority_id']
            isOneToOne: false
            referencedRelation: 'priorities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'instance_settings_default_priority_id_fkey'
            columns: ['default_priority_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_sla_by_priority'
            referencedColumns: ['priority_id']
          },
        ]
      }
      integration_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          status: string
          system: string
          ticket_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          status?: string
          system: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          status?: string
          system?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'integration_tasks_system_fkey'
            columns: ['system']
            isOneToOne: false
            referencedRelation: 'external_systems'
            referencedColumns: ['name']
          },
          {
            foreignKeyName: 'integration_tasks_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_tasks_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_tasks_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_tasks_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_tasks_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_tasks_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            foreignKeyName: 'notifications_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_timeline'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
          default_priority_id: string | null
          id: string
          name: string
          subcategory_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          default_priority_id?: string | null
          id?: string
          name: string
          subcategory_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_priority_id?: string | null
          id?: string
          name?: string
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'problems_default_priority_id_fkey'
            columns: ['default_priority_id']
            isOneToOne: false
            referencedRelation: 'priorities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'problems_default_priority_id_fkey'
            columns: ['default_priority_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_sla_by_priority'
            referencedColumns: ['priority_id']
          },
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        ComputedFields: never
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
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
          {
            foreignKeyName: 'reasons_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'reasons_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
          target_minutes: number | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          target_minutes?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          target_minutes?: number | null
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
          work_calendar_id: string | null
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          work_calendar_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          work_calendar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'teams_work_calendar_id_fkey'
            columns: ['work_calendar_id']
            isOneToOne: false
            referencedRelation: 'work_calendars'
            referencedColumns: ['id']
          },
        ]
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
            foreignKeyName: 'ticket_assignments_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_assignments_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_assignments_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            foreignKeyName: 'ticket_captures_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_captures_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_captures_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_captures_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_captures_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_captures_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            foreignKeyName: 'ticket_claims_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_claims_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_claims_result_id_fkey'
            columns: ['result_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_result_id_fkey'
            columns: ['result_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_claims_result_id_fkey'
            columns: ['result_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_claims_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_candidate_ticket_id_fkey'
            columns: ['candidate_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_candidate_ticket_id_fkey'
            columns: ['candidate_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
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
            foreignKeyName: 'ticket_duplicate_candidates_candidate_ticket_id_fkey'
            columns: ['candidate_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_duplicate_candidates_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            foreignKeyName: 'ticket_events_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_events_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_external_refs: {
        Row: {
          created_at: string
          external_id: string
          external_status: string | null
          id: string
          system: string
          ticket_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          external_id: string
          external_status?: string | null
          id?: string
          system: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          external_status?: string | null
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_external_refs_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_external_refs_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_external_refs_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_external_refs_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_linked_ticket_id_fkey'
            columns: ['linked_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_linked_ticket_id_fkey'
            columns: ['linked_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
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
            foreignKeyName: 'ticket_links_linked_ticket_id_fkey'
            columns: ['linked_ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_links_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_offers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_offers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_offers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_offers_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_participants_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
          {
            foreignKeyName: 'ticket_pause_steps_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_pause_steps_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            foreignKeyName: 'ticket_pauses_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_pauses_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pauses_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pauses_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pauses_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_pauses_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_by: string | null
          requester_id: string | null
          score: number
          ticket_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_by?: string | null
          requester_id?: string | null
          score: number
          ticket_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_by?: string | null
          requester_id?: string | null
          score?: number
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_ratings_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'requesters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_ratings_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: true
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_ratings_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: true
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_ratings_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: true
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_ratings_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: true
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_ratings_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: true
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_ratings_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: true
            referencedRelation: 'v_ticket_sla'
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_validations_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_validations_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_validations_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_validations_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
          service_type_id: string | null
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
          service_type_id?: string | null
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
          service_type_id?: string | null
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_duplicate_of_id_fkey'
            columns: ['duplicate_of_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_duplicate_of_id_fkey'
            columns: ['duplicate_of_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
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
            foreignKeyName: 'tickets_duplicate_of_id_fkey'
            columns: ['duplicate_of_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
            foreignKeyName: 'tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_sla_by_priority'
            referencedColumns: ['priority_id']
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
          subject_technician_id: string | null
          ticket_id: string
          voided_at: string | null
          voided_by: string | null
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
          subject_technician_id?: string | null
          ticket_id: string
          voided_at?: string | null
          voided_by?: string | null
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
          subject_technician_id?: string | null
          ticket_id?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'time_spans_subject_technician_id_fkey'
            columns: ['subject_technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_spans_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_spans_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_spans_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_spans_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
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
      v_metrics_aging: {
        Row: {
          age: string | null
          age_labor: string | null
          category_id: string | null
          folio: string | null
          id: string | null
          pause_time: string | null
          priority_id: string | null
          reported_at: string | null
          status: Database['public']['Enums']['ticket_status'] | null
          team_id: string | null
          wait_start_time: string | null
        }
        ComputedFields: never
        Insert: {
          age?: never
          age_labor?: never
          category_id?: string | null
          folio?: string | null
          id?: string | null
          pause_time?: never
          priority_id?: string | null
          reported_at?: string | null
          status?: Database['public']['Enums']['ticket_status'] | null
          team_id?: string | null
          wait_start_time?: never
        }
        Update: {
          age?: never
          age_labor?: never
          category_id?: string | null
          folio?: string | null
          id?: string | null
          pause_time?: never
          priority_id?: string | null
          reported_at?: string | null
          status?: Database['public']['Enums']['ticket_status'] | null
          team_id?: string | null
          wait_start_time?: never
        }
        Relationships: [
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
            foreignKeyName: 'tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_sla_by_priority'
            referencedColumns: ['priority_id']
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
      v_metrics_by_dimension: {
        Row: {
          avg_active_work_time: string | null
          avg_active_work_time_labor: string | null
          avg_assignment_time: string | null
          avg_net_time: string | null
          avg_net_time_labor: string | null
          avg_pause_time: string | null
          avg_reassignment_time: string | null
          avg_response_time: string | null
          avg_total_time: string | null
          avg_total_time_labor: string | null
          avg_validation_time: string | null
          avg_wait_start_time: string | null
          dimension: string | null
          dimension_id: string | null
          dimension_name: string | null
          first_time_fix_rate: number | null
          reassigned: number | null
          reassignment_rate: number | null
          recapture_rate: number | null
          recaptured: number | null
          reopen_rate: number | null
          reopened: number | null
          tickets: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_by_technician: {
        Row: {
          assigned_count: number | null
          auxiliary_count: number | null
          leader_count: number | null
          participation_time: string | null
          participation_time_extra: string | null
          participation_time_labor: string | null
          technician_id: string | null
          technician_name: string | null
          tickets: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'ticket_participants_technician_id_fkey'
            columns: ['technician_id']
            isOneToOne: false
            referencedRelation: 'technicians'
            referencedColumns: ['id']
          },
        ]
      }
      v_metrics_duplicate_alerts: {
        Row: {
          candidates: number | null
          decision: string | null
          tickets: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_duplicate_tickets: {
        Row: {
          building_id: string | null
          category_id: string | null
          dependency_id: string | null
          id: string | null
          marked_at: string | null
          reported_at: string | null
          requester_id: string | null
          team_id: string | null
          time_to_mark: string | null
        }
        ComputedFields: never
        Insert: {
          building_id?: string | null
          category_id?: string | null
          dependency_id?: string | null
          id?: string | null
          marked_at?: never
          reported_at?: string | null
          requester_id?: string | null
          team_id?: string | null
          time_to_mark?: never
        }
        Update: {
          building_id?: string | null
          category_id?: string | null
          dependency_id?: string | null
          id?: string | null
          marked_at?: never
          reported_at?: string | null
          requester_id?: string | null
          team_id?: string | null
          time_to_mark?: never
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
            foreignKeyName: 'tickets_dependency_id_fkey'
            columns: ['dependency_id']
            isOneToOne: false
            referencedRelation: 'dependencies'
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
            foreignKeyName: 'tickets_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      v_metrics_duplicates_by_dimension: {
        Row: {
          dimension: string | null
          dimension_id: string | null
          dimension_name: string | null
          duplicate_rate: number | null
          duplicates: number | null
          tickets: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_pauses_by_reason: {
        Row: {
          pause_time: string | null
          pause_time_labor: string | null
          pauses: number | null
          reason_id: string | null
          reason_name: string | null
          tickets: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_reject_cancel_by_reason: {
        Row: {
          event_type: Database['public']['Enums']['event_type'] | null
          reason_id: string | null
          reason_name: string | null
          tickets: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_routing: {
        Row: {
          building_id: string | null
          folio: string | null
          id: string | null
          offers_count: number | null
          pending_offers: number | null
          reported_at: string | null
          status: Database['public']['Enums']['ticket_status'] | null
          taken_offers: number | null
          team_id: string | null
          time_to_take: string | null
        }
        ComputedFields: never
        Insert: {
          building_id?: string | null
          folio?: string | null
          id?: string | null
          offers_count?: never
          pending_offers?: never
          reported_at?: string | null
          status?: Database['public']['Enums']['ticket_status'] | null
          taken_offers?: never
          team_id?: string | null
          time_to_take?: never
        }
        Update: {
          building_id?: string | null
          folio?: string | null
          id?: string | null
          offers_count?: never
          pending_offers?: never
          reported_at?: string | null
          status?: Database['public']['Enums']['ticket_status'] | null
          taken_offers?: never
          team_id?: string | null
          time_to_take?: never
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
            foreignKeyName: 'tickets_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      v_metrics_satisfaction: {
        Row: {
          average_score: number | null
          ratings: number | null
          score_1: number | null
          score_2: number | null
          score_3: number | null
          score_4: number | null
          score_5: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_sla: {
        Row: {
          avg_resolution_minutes: number | null
          avg_target_minutes: number | null
          compliance_rate: number | null
          met: number | null
          with_target: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      v_metrics_sla_by_priority: {
        Row: {
          compliance_rate: number | null
          met: number | null
          priority_id: string | null
          priority_name: string | null
          with_target: number | null
        }
        ComputedFields: never
        Relationships: []
      }
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
            referencedColumns: ['id']
          },
        ]
      }
      v_ticket_metrics_base: {
        Row: {
          active_work_time: string | null
          active_work_time_extra: string | null
          active_work_time_labor: string | null
          assignment_time: string | null
          assignment_time_labor: string | null
          auxiliary_count: number | null
          auxiliary_time: string | null
          building_id: string | null
          category_id: string | null
          claim_time: string | null
          claim_time_labor: string | null
          closed_at: string | null
          dependency_id: string | null
          folio: string | null
          has_after_evidence: boolean | null
          has_before_evidence: boolean | null
          has_request_evidence: boolean | null
          id: string | null
          net_time: string | null
          net_time_labor: string | null
          pause_time: string | null
          pause_time_labor: string | null
          priority_id: string | null
          reassigned_supervisor: boolean | null
          reassigned_technician: boolean | null
          reassignment_time: string | null
          reassignment_time_labor: string | null
          recapture_count: number | null
          recaptured: boolean | null
          reopen_count: number | null
          reopened: boolean | null
          reported_at: string | null
          requester_id: string | null
          response_time: string | null
          response_time_labor: string | null
          status: Database['public']['Enums']['ticket_status'] | null
          team_id: string | null
          ticket_number: number | null
          total_time: string | null
          total_time_labor: string | null
          validated_requester: boolean | null
          validated_supervisor: boolean | null
          validation_time: string | null
          validation_time_labor: string | null
          wait_start_time: string | null
          wait_start_time_labor: string | null
        }
        ComputedFields: never
        Insert: {
          active_work_time?: never
          active_work_time_extra?: never
          active_work_time_labor?: never
          assignment_time?: never
          assignment_time_labor?: never
          auxiliary_count?: never
          auxiliary_time?: never
          building_id?: string | null
          category_id?: string | null
          claim_time?: never
          claim_time_labor?: never
          closed_at?: string | null
          dependency_id?: string | null
          folio?: string | null
          has_after_evidence?: never
          has_before_evidence?: never
          has_request_evidence?: never
          id?: string | null
          net_time?: never
          net_time_labor?: never
          pause_time?: never
          pause_time_labor?: never
          priority_id?: string | null
          reassigned_supervisor?: never
          reassigned_technician?: never
          reassignment_time?: never
          reassignment_time_labor?: never
          recapture_count?: never
          recaptured?: never
          reopen_count?: never
          reopened?: never
          reported_at?: string | null
          requester_id?: string | null
          response_time?: never
          response_time_labor?: never
          status?: Database['public']['Enums']['ticket_status'] | null
          team_id?: string | null
          ticket_number?: number | null
          total_time?: never
          total_time_labor?: never
          validated_requester?: never
          validated_supervisor?: never
          validation_time?: never
          validation_time_labor?: never
          wait_start_time?: never
          wait_start_time_labor?: never
        }
        Update: {
          active_work_time?: never
          active_work_time_extra?: never
          active_work_time_labor?: never
          assignment_time?: never
          assignment_time_labor?: never
          auxiliary_count?: never
          auxiliary_time?: never
          building_id?: string | null
          category_id?: string | null
          claim_time?: never
          claim_time_labor?: never
          closed_at?: string | null
          dependency_id?: string | null
          folio?: string | null
          has_after_evidence?: never
          has_before_evidence?: never
          has_request_evidence?: never
          id?: string | null
          net_time?: never
          net_time_labor?: never
          pause_time?: never
          pause_time_labor?: never
          priority_id?: string | null
          reassigned_supervisor?: never
          reassigned_technician?: never
          reassignment_time?: never
          reassignment_time_labor?: never
          recapture_count?: never
          recaptured?: never
          reopen_count?: never
          reopened?: never
          reported_at?: string | null
          requester_id?: string | null
          response_time?: never
          response_time_labor?: never
          status?: Database['public']['Enums']['ticket_status'] | null
          team_id?: string | null
          ticket_number?: number | null
          total_time?: never
          total_time_labor?: never
          validated_requester?: never
          validated_supervisor?: never
          validation_time?: never
          validation_time_labor?: never
          wait_start_time?: never
          wait_start_time_labor?: never
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
            foreignKeyName: 'tickets_dependency_id_fkey'
            columns: ['dependency_id']
            isOneToOne: false
            referencedRelation: 'dependencies'
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
            foreignKeyName: 'tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_sla_by_priority'
            referencedColumns: ['priority_id']
          },
          {
            foreignKeyName: 'tickets_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'requesters'
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
      v_ticket_sla: {
        Row: {
          building_id: string | null
          category_id: string | null
          closed_at: string | null
          description: string | null
          folio: string | null
          id: string | null
          meets: boolean | null
          priority_id: string | null
          reported_at: string | null
          resolution_minutes: number | null
          service_type_id: string | null
          status: Database['public']['Enums']['ticket_status'] | null
          target_minutes: number | null
          team_id: string | null
          ticket_number: number | null
        }
        ComputedFields: never
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
            foreignKeyName: 'tickets_priority_id_fkey'
            columns: ['priority_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_sla_by_priority'
            referencedColumns: ['priority_id']
          },
          {
            foreignKeyName: 'tickets_service_type_id_fkey'
            columns: ['service_type_id']
            isOneToOne: false
            referencedRelation: 'service_types'
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
      v_ticket_timeline: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          cycle: number | null
          id: number | null
          occurred_at: string | null
          payload: Json | null
          reason_id: string | null
          reason_name: string | null
          recorded_at: string | null
          subject_technician_id: string | null
          subject_technician_name: string | null
          subject_user_id: string | null
          subject_user_name: string | null
          ticket_id: string | null
          type: Database['public']['Enums']['event_type'] | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'ticket_events_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'reasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_pauses_by_reason'
            referencedColumns: ['reason_id']
          },
          {
            foreignKeyName: 'ticket_events_reason_id_fkey'
            columns: ['reason_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_reject_cancel_by_reason'
            referencedColumns: ['reason_id']
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
            referencedRelation: 'v_metrics_aging'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_duplicate_tickets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_metrics_routing'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_metrics_base'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'v_ticket_sla'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      can_act_on_behalf: { Args: { p_technician_id: string }; Returns: boolean }
      can_see_ticket: { Args: { p_ticket_id: string }; Returns: boolean }
      catalog_import_finish: {
        Args: { p_run_id: string; p_status: string; p_summary?: Json }
        Returns: undefined
      }
      catalog_import_sheet: {
        Args: { p_catalog: string; p_rows: Json; p_run_id: string }
        Returns: Json
      }
      catalog_import_start: {
        Args: { p_mode?: string; p_source_file?: string }
        Returns: string
      }
      evidence_add: {
        Args: {
          p_client_request_id?: string
          p_mime_type?: string
          p_note?: string
          p_occurred_at?: string
          p_size_bytes?: number
          p_storage_path: string
          p_ticket_id: string
          p_type: Database['public']['Enums']['evidence_type']
        }
        Returns: string
      }
      external_status_set: {
        Args: {
          p_external_id: string
          p_external_status: string
          p_system: string
        }
        Returns: undefined
      }
      has_permission: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
      import_alias_get: {
        Args: { p_alias: string; p_catalog: string }
        Returns: string
      }
      import_alias_set: {
        Args: { p_alias: string; p_catalog: string; p_record_id: string }
        Returns: undefined
      }
      import_batch_finish: {
        Args: { p_batch_id: string; p_status: string; p_summary?: Json }
        Returns: undefined
      }
      import_batch_start: {
        Args: { p_mode?: string; p_system: string }
        Returns: string
      }
      import_record_add: {
        Args: {
          p_batch_id: string
          p_error?: string
          p_raw: Json
          p_result: string
          p_row_number: number
          p_ticket_id?: string
        }
        Returns: string
      }
      import_status_get: {
        Args: { p_external_status: string; p_system: string }
        Returns: Database['public']['Enums']['ticket_status']
      }
      import_status_set: {
        Args: {
          p_external_status: string
          p_system: string
          p_ticket_status: Database['public']['Enums']['ticket_status']
        }
        Returns: undefined
      }
      import_system: { Args: { p_system: string }; Returns: undefined }
      import_ticket_assign: {
        Args: {
          p_assigned_at?: string
          p_technician_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      import_ticket_timeline: {
        Args: {
          p_assigned_at?: string
          p_closed_at?: string
          p_finished_at?: string
          p_reported_at?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      import_ticket_upsert: {
        Args: { p_data: Json; p_external_id: string; p_system: string }
        Returns: string
      }
      integration_task_create: {
        Args: {
          p_assigned_to?: string
          p_description: string
          p_due_date?: string
          p_system: string
          p_ticket_id: string
        }
        Returns: string
      }
      integration_task_resolve: {
        Args: { p_status?: string; p_task_id: string }
        Returns: undefined
      }
      me: { Args: Record<PropertyKey, never>; Returns: Json }
      metrics_by_technician: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          assigned_count: number
          auxiliary_count: number
          leader_count: number
          participation_time: string
          participation_time_extra: string
          participation_time_labor: string
          technician_id: string
          technician_name: string
          tickets: number
        }[]
      }
      metrics_date_in: {
        Args: { p_at: string; p_from: string; p_to: string }
        Returns: boolean
      }
      metrics_dims_in: {
        Args: {
          p_building: string
          p_category: string
          p_dependency: string
          p_team: string
          t_building: string
          t_category: string
          t_dependency: string
          t_team: string
        }
        Returns: boolean
      }
      metrics_duplicate_alerts: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          candidates: number
          decision: string
          tickets: number
        }[]
      }
      metrics_duplicate_tickets: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          time_to_mark: string
        }[]
      }
      metrics_duplicates_by_dimension: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          dimension: string
          dimension_id: string
          dimension_name: string
          duplicate_rate: number
          duplicates: number
          tickets: number
        }[]
      }
      metrics_pauses_by_reason: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          pause_time: string
          pause_time_labor: string
          pauses: number
          reason_name: string
        }[]
      }
      metrics_reject_cancel_by_reason: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          event_type: string
          reason_name: string
          tickets: number
        }[]
      }
      metrics_routing: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          avg_time_to_take: string
          offers: number
          pending_offers: number
          taken: number
        }[]
      }
      metrics_satisfaction: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          average_score: number
          ratings: number
        }[]
      }
      metrics_sla: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          avg_resolution_minutes: number
          avg_target_minutes: number
          compliance_rate: number
          met: number
          with_target: number
        }[]
      }
      metrics_sla_by_priority: {
        Args: {
          p_building?: string
          p_category?: string
          p_dependency?: string
          p_from?: string
          p_team?: string
          p_to?: string
        }
        Returns: {
          compliance_rate: number
          met: number
          priority_id: string
          priority_name: string
          with_target: number
        }[]
      }
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
      require_technician_action: {
        Args: {
          p_action_permission: string
          p_require_participant?: boolean
          p_technician_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
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
          p_subject_technician_id?: string
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
          p_service_type_id?: string
          p_subject_technician_id?: string
          p_ticket_id: string
          p_work_description: string
        }
        Returns: undefined
      }
      ticket_calendar: { Args: { p_ticket_id: string }; Returns: string }
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
          p_subject_technician_id?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_rate: {
        Args: {
          p_client_request_id?: string
          p_comment?: string
          p_score: number
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
          p_subject_technician_id?: string
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
        Args: {
          p_client_request_id?: string
          p_subject_technician_id?: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      ticket_route: { Args: { p_ticket_id: string }; Returns: undefined }
      ticket_start: {
        Args: {
          p_client_request_id?: string
          p_subject_technician_id?: string
          p_ticket_id: string
        }
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
      ticket_time_by_kind_extra: {
        Args: {
          p_kind: Database['public']['Enums']['time_span_kind']
          p_ticket_id: string
        }
        Returns: string
      }
      ticket_time_by_kind_laboral: {
        Args: {
          p_kind: Database['public']['Enums']['time_span_kind']
          p_ticket_id: string
        }
        Returns: string
      }
      ticket_time_net: { Args: { p_ticket_id: string }; Returns: string }
      ticket_time_net_laboral: {
        Args: { p_ticket_id: string }
        Returns: string
      }
      ticket_time_total: { Args: { p_ticket_id: string }; Returns: string }
      ticket_time_total_laboral: {
        Args: { p_ticket_id: string }
        Returns: string
      }
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
          p_subject_technician_id?: string
          p_ticket_id: string
        }
        Returns: string
      }
      time_span_void: {
        Args: {
          p_client_request_id?: string
          p_span_id: string
          p_ticket_id: string
        }
        Returns: undefined
      }
      work_calendar_overlap: {
        Args: { p_calendar_id: string; p_end: string; p_start: string }
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
        | 'manual_time_recorded'
        | 'rated'
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
        'manual_time_recorded',
        'rated',
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
