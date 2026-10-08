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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      clock_class: 'counted' | 'not_counted'
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
      clock_class: ['counted', 'not_counted'],
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
    },
  },
} as const
