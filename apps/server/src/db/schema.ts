import {
  pgTable,
  unique,
  uuid,
  text,
  timestamp,
  jsonb,
  interval,
  boolean,
  check,
  index,
  foreignKey,
  bigint,
  integer,
  numeric,
  uniqueIndex,
  date,
  smallint,
  inet,
  time,
  primaryKey,
  pgView,
  pgSequence,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const assignmentStage = pgEnum('assignment_stage', [
  'supervisor',
  'technician',
])
export const claimResolution = pgEnum('claim_resolution', [
  'upheld',
  'dismissed',
  'new_ticket',
])
export const claimStatus = pgEnum('claim_status', ['open', 'resolved'])
export const clockClass = pgEnum('clock_class', ['counted', 'not_counted'])
export const escalationCondition = pgEnum('escalation_condition', [
  'untaken',
  'unassigned',
  'no_candidate',
  'target_near',
  'target_overdue',
])
export const eventSource = pgEnum('event_source', [
  'app',
  'import',
  'integration',
])
export const eventType = pgEnum('event_type', [
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
])
export const evidenceType = pgEnum('evidence_type', [
  'request',
  'before',
  'during',
  'after',
  'claim',
  'other',
])
export const linkType = pgEnum('link_type', [
  'duplicate_of',
  'derived_from',
  'related_to',
  'blocked_by',
])
export const notificationChannel = pgEnum('notification_channel', [
  'in_app',
  'push',
])
export const offerStatus = pgEnum('offer_status', [
  'offered',
  'taken',
  'withdrawn',
])
export const participationType = pgEnum('participation_type', [
  'leader',
  'auxiliary',
])
export const permissionScope = pgEnum('permission_scope', [
  'own',
  'team',
  'buildings',
  'all',
])
export const reasonUse = pgEnum('reason_use', [
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
])
export const spanOrigin = pgEnum('span_origin', ['system', 'manual'])
export const ticketStatus = pgEnum('ticket_status', [
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
])
export const timeSpanKind = pgEnum('time_span_kind', [
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
])

export const ticketsNumberSeq = pgSequence('tickets_number_seq', {
  startWith: '1',
  increment: '1',
  minValue: '1',
  maxValue: '9223372036854775807',
  cache: '1',
  cycle: false,
})

export const catalogAliases = pgTable(
  'catalog_aliases',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    catalog: text().notNull(),
    alias: text().notNull(),
    recordId: uuid('record_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('catalog_aliases_catalog_alias_key').on(table.catalog, table.alias),
  ],
)

export const catalogImportSpecs = pgTable('catalog_import_specs', {
  catalogKey: text('catalog_key').primaryKey().notNull(),
  tableName: text('table_name').notNull(),
  columns: jsonb().notNull(),
  matchColumns: jsonb('match_columns').notNull(),
})

export const escalationRules = pgTable(
  'escalation_rules',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    condition: escalationCondition().notNull(),
    threshold: interval().notNull(),
    notify: text().default('supervisor').notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('escalation_rules_condition_key').on(table.condition)],
)

export const notificationRules = pgTable(
  'notification_rules',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    eventType: eventType('event_type').notNull(),
    recipient: text().notNull(),
    channel: notificationChannel().default('in_app').notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('notification_rules_event_type_recipient_channel_key').on(
      table.eventType,
      table.recipient,
      table.channel,
    ),
    check(
      'notification_rules_recipient_check',
      sql`recipient = ANY (ARRAY['requester'::text, 'assigned_technician'::text, 'supervisor'::text, 'offers'::text, 'administrators'::text])`,
    ),
  ],
)

export const tickets = pgTable(
  'tickets',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    ticketNumber: bigint('ticket_number', { mode: 'number' })
      .default(sql`nextval('tickets_number_seq'::regclass)`)
      .notNull(),
    folio: text().notNull(),
    status: ticketStatus().default('registered').notNull(),
    cycle: integer().default(1).notNull(),
    teamId: uuid('team_id').notNull(),
    buildingId: uuid('building_id').notNull(),
    locationId: uuid('location_id').notNull(),
    dependencyId: uuid('dependency_id').notNull(),
    categoryId: uuid('category_id').notNull(),
    subcategoryId: uuid('subcategory_id'),
    problemId: uuid('problem_id'),
    serviceTypeId: uuid('service_type_id'),
    priorityId: uuid('priority_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    description: text().notNull(),
    requesterId: uuid('requester_id').notNull(),
    requesterName: text('requester_name').notNull(),
    requesterContact: text('requester_contact'),
    registeredBy: uuid('registered_by'),
    reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
    possibleDuplicate: boolean('possible_duplicate').default(false).notNull(),
    duplicateOfId: uuid('duplicate_of_id'),
    statusBeforeDiscard: ticketStatus('status_before_discard'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_tickets_building').using(
      'btree',
      table.buildingId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_tickets_category').using(
      'btree',
      table.categoryId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_tickets_description_trgm').using(
      'gin',
      table.description.asc().nullsLast().op('gin_trgm_ops'),
    ),
    index('idx_tickets_reported_at').using(
      'btree',
      table.reportedAt.asc().nullsLast().op('timestamptz_ops'),
    ),
    index('idx_tickets_status').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops'),
    ),
    index('idx_tickets_status_reported').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops'),
      table.reportedAt.asc().nullsLast().op('enum_ops'),
    ),
    foreignKey({
      columns: [table.buildingId],
      foreignColumns: [buildings.id],
      name: 'tickets_building_id_fkey',
    }),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'tickets_category_id_fkey',
    }),
    foreignKey({
      columns: [table.channelId],
      foreignColumns: [channels.id],
      name: 'tickets_channel_id_fkey',
    }),
    foreignKey({
      columns: [table.dependencyId],
      foreignColumns: [dependencies.id],
      name: 'tickets_dependency_id_fkey',
    }),
    foreignKey({
      columns: [table.duplicateOfId],
      foreignColumns: [table.id],
      name: 'tickets_duplicate_of_id_fkey',
    }),
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'tickets_location_id_fkey',
    }),
    foreignKey({
      columns: [table.priorityId],
      foreignColumns: [priorities.id],
      name: 'tickets_priority_id_fkey',
    }),
    foreignKey({
      columns: [table.problemId],
      foreignColumns: [problems.id],
      name: 'tickets_problem_id_fkey',
    }),
    foreignKey({
      columns: [table.registeredBy],
      foreignColumns: [users.id],
      name: 'tickets_registered_by_fkey',
    }),
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [requesters.id],
      name: 'tickets_requester_id_fkey',
    }),
    foreignKey({
      columns: [table.serviceTypeId],
      foreignColumns: [serviceTypes.id],
      name: 'tickets_service_type_id_fkey',
    }),
    foreignKey({
      columns: [table.subcategoryId],
      foreignColumns: [subcategories.id],
      name: 'tickets_subcategory_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'tickets_team_id_fkey',
    }),
    unique('tickets_ticket_number_key').on(table.ticketNumber),
    unique('tickets_folio_key').on(table.folio),
    check('tickets_cycle_check', sql`cycle > 0`),
  ],
)

export const evidence = pgTable(
  'evidence',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    eventId: bigint('event_id', { mode: 'number' }),
    type: evidenceType().notNull(),
    storagePath: text('storage_path'),
    mimeType: text('mime_type'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    capturedByTechnicianId: uuid('captured_by_technician_id'),
    capturedByUserId: uuid('captured_by_user_id'),
    uploadedBy: uuid('uploaded_by'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    clientRequestId: uuid('client_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    thumbnailPath: text('thumbnail_path'),
    sha256: text(),
    width: integer(),
    height: integer(),
    processingState: text('processing_state').default('pending').notNull(),
    processedAt: timestamp('processed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    processingError: text('processing_error'),
  },
  (table) => [
    index('idx_evidence_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_evidence_ticket_type').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
      table.type.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.capturedByTechnicianId],
      foreignColumns: [technicians.id],
      name: 'evidence_captured_by_technician_id_fkey',
    }),
    foreignKey({
      columns: [table.capturedByUserId],
      foreignColumns: [users.id],
      name: 'evidence_captured_by_user_id_fkey',
    }),
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [ticketEvents.id],
      name: 'evidence_event_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'evidence_ticket_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [users.id],
      name: 'evidence_uploaded_by_fkey',
    }),
    unique('evidence_client_request_id_key').on(table.clientRequestId),
    check('evidence_cycle_check', sql`cycle > 0`),
    check('evidence_height_check', sql`(height IS NULL) OR (height > 0)`),
    check(
      'evidence_processing_state_check',
      sql`processing_state = ANY (ARRAY['pending'::text, 'ready'::text, 'failed'::text])`,
    ),
    check(
      'evidence_size_bytes_check',
      sql`(size_bytes IS NULL) OR (size_bytes >= 0)`,
    ),
    check('evidence_width_check', sql`(width IS NULL) OR (width > 0)`),
  ],
)

export const instanceSettings = pgTable(
  'instance_settings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    singleton: boolean().default(true).notNull(),
    teamLabel: text('team_label').default('Equipo').notNull(),
    validationPolicy: text('validation_policy').default('both').notNull(),
    autoValidationDays: integer('auto_validation_days'),
    claimWindow: interval('claim_window').default('1 day').notNull(),
    duplicateWindow: interval('duplicate_window').default('7 days').notNull(),
    duplicateSimilarity: numeric('duplicate_similarity', {
      precision: 4,
      scale: 3,
    })
      .default('0.300')
      .notNull(),
    duplicateShownFields: text('duplicate_shown_fields')
      .array()
      .default([
        'folio',
        'status',
        'reported_at',
        'building',
        'problem',
        'requester_contact',
      ])
      .notNull(),
    folioPattern: text('folio_pattern').default('AX-{yyyy}-{num}').notNull(),
    timezone: text().default('America/Mexico_City').notNull(),
    defaultCalendarId: uuid('default_calendar_id'),
    requestEvidencePolicy: text('request_evidence_policy')
      .default('recommended')
      .notNull(),
    requesterVisibleEventTypes: eventType('requester_visible_event_types')
      .array()
      .default([
        'created',
        'taken',
        'assigned_technician',
        'reassigned_supervisor',
        'reassigned_technician',
        'started',
        'paused',
        'resumed',
        'attended',
        'validated',
        'priority_changed',
        'capture_recaptured',
        'claim_opened',
        'claim_resolved',
        'reopened',
        'rejected',
        'cancelled',
        'duplicate_marked',
      ])
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    slaClockMode: text('sla_clock_mode').default('calendar').notNull(),
    defaultPriorityId: uuid('default_priority_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.defaultCalendarId],
      foreignColumns: [workCalendars.id],
      name: 'instance_settings_default_calendar_id_fkey',
    }),
    foreignKey({
      columns: [table.defaultPriorityId],
      foreignColumns: [priorities.id],
      name: 'instance_settings_default_priority_id_fkey',
    }),
    unique('instance_settings_singleton_key').on(table.singleton),
    check(
      'instance_settings_auto_validation_days_check',
      sql`(auto_validation_days IS NULL) OR (auto_validation_days > 0)`,
    ),
    check(
      'instance_settings_duplicate_similarity_check',
      sql`(duplicate_similarity >= (0)::numeric) AND (duplicate_similarity <= (1)::numeric)`,
    ),
    check(
      'instance_settings_request_evidence_policy_check',
      sql`request_evidence_policy = ANY (ARRAY['optional'::text, 'recommended'::text, 'required'::text])`,
    ),
    check('instance_settings_singleton_check', sql`CHECK (singleton)`),
    check(
      'instance_settings_sla_clock_mode_check',
      sql`sla_clock_mode = ANY (ARRAY['calendar'::text, 'laboral'::text])`,
    ),
    check(
      'instance_settings_validation_policy_check',
      sql`validation_policy = ANY (ARRAY['requester'::text, 'supervisor'::text, 'both'::text])`,
    ),
  ],
)

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    username: text().notNull(),
    fullName: text('full_name').notNull(),
    phone: text(),
    passwordHash: text('password_hash').notNull(),
    mustChangePassword: boolean('must_change_password').default(true).notNull(),
    active: boolean().default(true).notNull(),
    passwordChangedAt: timestamp('password_changed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    lastLoginAt: timestamp('last_login_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('users_username_key').using(
      'btree',
      table.username.asc().nullsLast().op('text_ops'),
    ),
    check(
      'users_username_format_check',
      sql`username ~ '^[a-z0-9][a-z0-9._-]{2,63}$'::text`,
    ),
    check('users_username_lower_check', sql`username = lower(username)`),
  ],
)

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    system: text().notNull(),
    mode: text().default('dry_run').notNull(),
    status: text().default('running').notNull(),
    summary: jsonb().default({}).notNull(),
    createdBy: uuid('created_by'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp('finished_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'import_batches_created_by_fkey',
    }),
    foreignKey({
      columns: [table.system],
      foreignColumns: [externalSystems.name],
      name: 'import_batches_system_fkey',
    }),
    check(
      'import_batches_mode_check',
      sql`mode = ANY (ARRAY['dry_run'::text, 'commit'::text])`,
    ),
    check(
      'import_batches_status_check',
      sql`status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])`,
    ),
  ],
)

export const importRecords = pgTable(
  'import_records',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    batchId: uuid('batch_id').notNull(),
    rowNumber: integer('row_number'),
    raw: jsonb().notNull(),
    result: text().default('pending').notNull(),
    ticketId: uuid('ticket_id'),
    error: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_import_records_batch').using(
      'btree',
      table.batchId.asc().nullsLast().op('text_ops'),
      table.result.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.batchId],
      foreignColumns: [importBatches.id],
      name: 'import_records_batch_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'import_records_ticket_id_fkey',
    }),
    check(
      'import_records_result_check',
      sql`result = ANY (ARRAY['pending'::text, 'inserted'::text, 'updated'::text, 'skipped'::text, 'error'::text])`,
    ),
  ],
)

export const ticketAssignments = pgTable(
  'ticket_assignments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    stage: assignmentStage().notNull(),
    assigneeUserId: uuid('assignee_user_id'),
    assigneeTechnicianId: uuid('assignee_technician_id'),
    assignedBy: uuid('assigned_by'),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    reasonId: uuid('reason_id'),
    note: text(),
    clientRequestId: uuid('client_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ticket_assignments_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.assignedBy],
      foreignColumns: [users.id],
      name: 'ticket_assignments_assigned_by_fkey',
    }),
    foreignKey({
      columns: [table.assigneeTechnicianId],
      foreignColumns: [technicians.id],
      name: 'ticket_assignments_assignee_technician_id_fkey',
    }),
    foreignKey({
      columns: [table.assigneeUserId],
      foreignColumns: [users.id],
      name: 'ticket_assignments_assignee_user_id_fkey',
    }),
    foreignKey({
      columns: [table.reasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_assignments_reason_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_assignments_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_assignments_client_request_id_key').on(
      table.clientRequestId,
    ),
    check(
      'ticket_assignments_assignee_check',
      sql`((stage = 'supervisor'::assignment_stage) AND (assignee_user_id IS NOT NULL) AND (assignee_technician_id IS NULL)) OR ((stage = 'technician'::assignment_stage) AND (assignee_technician_id IS NOT NULL))`,
    ),
    check('ticket_assignments_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketClaims = pgTable(
  'ticket_claims',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    openedBy: uuid('opened_by'),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    reasonId: uuid('reason_id').notNull(),
    description: text().notNull(),
    status: claimStatus().default('open').notNull(),
    priorStatus: ticketStatus('prior_status').notNull(),
    resolution: claimResolution(),
    resultId: uuid('result_id'),
    resolvedBy: uuid('resolved_by'),
    resolvedAt: timestamp('resolved_at', {
      withTimezone: true,
      mode: 'string',
    }),
    resolutionNote: text('resolution_note'),
    clientRequestId: uuid('client_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ticket_claims_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.openedBy],
      foreignColumns: [users.id],
      name: 'ticket_claims_opened_by_fkey',
    }),
    foreignKey({
      columns: [table.reasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_claims_reason_id_fkey',
    }),
    foreignKey({
      columns: [table.resolvedBy],
      foreignColumns: [users.id],
      name: 'ticket_claims_resolved_by_fkey',
    }),
    foreignKey({
      columns: [table.resultId],
      foreignColumns: [reasons.id],
      name: 'ticket_claims_result_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_claims_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_claims_client_request_id_key').on(table.clientRequestId),
    check('ticket_claims_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketDuplicateCandidates = pgTable(
  'ticket_duplicate_candidates',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    candidateTicketId: uuid('candidate_ticket_id').notNull(),
    similarity: numeric({ precision: 4, scale: 3 }).notNull(),
    shownAt: timestamp('shown_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    decision: text(),
  },
  (table) => [
    index('idx_ticket_duplicate_candidates_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.candidateTicketId],
      foreignColumns: [tickets.id],
      name: 'ticket_duplicate_candidates_candidate_ticket_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_duplicate_candidates_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_duplicate_candidates_ticket_id_candidate_ticket_id_key').on(
      table.ticketId,
      table.candidateTicketId,
    ),
    check(
      'ticket_duplicate_candidates_decision_check',
      sql`decision = ANY (ARRAY['ignored'::text, 'linked'::text, 'dismissed'::text])`,
    ),
  ],
)

export const ticketLinks = pgTable(
  'ticket_links',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    linkedTicketId: uuid('linked_ticket_id').notNull(),
    linkType: linkType('link_type').notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ticket_links_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'ticket_links_created_by_fkey',
    }),
    foreignKey({
      columns: [table.linkedTicketId],
      foreignColumns: [tickets.id],
      name: 'ticket_links_linked_ticket_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_links_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_links_ticket_id_linked_ticket_id_link_type_key').on(
      table.ticketId,
      table.linkedTicketId,
      table.linkType,
    ),
  ],
)

export const ticketOffers = pgTable(
  'ticket_offers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    supervisorUserId: uuid('supervisor_user_id').notNull(),
    status: offerStatus().default('offered').notNull(),
    offeredAt: timestamp('offered_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp('resolved_at', {
      withTimezone: true,
      mode: 'string',
    }),
  },
  (table) => [
    index('idx_ticket_offers_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('int4_ops'),
      table.cycle.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.supervisorUserId],
      foreignColumns: [users.id],
      name: 'ticket_offers_supervisor_user_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_offers_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_offers_ticket_id_cycle_supervisor_user_id_key').on(
      table.ticketId,
      table.cycle,
      table.supervisorUserId,
    ),
    check('ticket_offers_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketParticipants = pgTable(
  'ticket_participants',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    technicianId: uuid('technician_id').notNull(),
    participationType: participationType('participation_type').notNull(),
    categoryId: uuid('category_id'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    origin: spanOrigin().default('system').notNull(),
    recordedBy: uuid('recorded_by'),
    clientRequestId: uuid('client_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ticket_participants_technician').using(
      'btree',
      table.technicianId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_ticket_participants_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('ticket_participants_active_unique')
      .using(
        'btree',
        table.ticketId.asc().nullsLast().op('uuid_ops'),
        table.technicianId.asc().nullsLast().op('uuid_ops'),
      )
      .where(sql`(ended_at IS NULL)`),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'ticket_participants_category_id_fkey',
    }),
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: 'ticket_participants_recorded_by_fkey',
    }),
    foreignKey({
      columns: [table.technicianId],
      foreignColumns: [technicians.id],
      name: 'ticket_participants_technician_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_participants_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_participants_client_request_id_key').on(
      table.clientRequestId,
    ),
    check('ticket_participants_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketPauseSteps = pgTable(
  'ticket_pause_steps',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    pauseId: uuid('pause_id').notNull(),
    reasonId: uuid('reason_id').notNull(),
    enteredAt: timestamp('entered_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    exitedAt: timestamp('exited_at', { withTimezone: true, mode: 'string' }),
    actorId: uuid('actor_id'),
    note: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.id],
      name: 'ticket_pause_steps_actor_id_fkey',
    }),
    foreignKey({
      columns: [table.pauseId],
      foreignColumns: [ticketPauses.id],
      name: 'ticket_pause_steps_pause_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.reasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_pause_steps_reason_id_fkey',
    }),
  ],
)

export const ticketPauses = pgTable(
  'ticket_pauses',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    reasonId: uuid('reason_id').notNull(),
    openedBy: uuid('opened_by'),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
    note: text(),
    estimatedDate: date('estimated_date'),
    origin: spanOrigin().default('system').notNull(),
    recordedBy: uuid('recorded_by'),
    clientRequestId: uuid('client_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    rootReasonId: uuid('root_reason_id').notNull(),
  },
  (table) => [
    uniqueIndex('ticket_pauses_one_open')
      .using('btree', table.ticketId.asc().nullsLast().op('uuid_ops'))
      .where(sql`(closed_at IS NULL)`),
    foreignKey({
      columns: [table.openedBy],
      foreignColumns: [users.id],
      name: 'ticket_pauses_opened_by_fkey',
    }),
    foreignKey({
      columns: [table.reasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_pauses_reason_id_fkey',
    }),
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: 'ticket_pauses_recorded_by_fkey',
    }),
    foreignKey({
      columns: [table.rootReasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_pauses_root_reason_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_pauses_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_pauses_client_request_id_key').on(table.clientRequestId),
    check('ticket_pauses_cycle_check', sql`cycle > 0`),
  ],
)

export const timeSpans = pgTable(
  'time_spans',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    kind: timeSpanKind().notNull(),
    refId: uuid('ref_id'),
    startedAt: timestamp('started_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    clockClass: clockClass('clock_class').default('counted').notNull(),
    origin: spanOrigin().default('system').notNull(),
    recordedBy: uuid('recorded_by'),
    clientRequestId: uuid('client_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    subjectTechnicianId: uuid('subject_technician_id'),
    voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'string' }),
    voidedBy: uuid('voided_by'),
  },
  (table) => [
    index('idx_time_spans_kind').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
      table.kind.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_time_spans_manual').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
      table.origin.asc().nullsLast().op('enum_ops'),
    ),
    index('idx_time_spans_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('int4_ops'),
      table.cycle.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: 'time_spans_recorded_by_fkey',
    }),
    foreignKey({
      columns: [table.subjectTechnicianId],
      foreignColumns: [technicians.id],
      name: 'time_spans_subject_technician_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'time_spans_ticket_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.voidedBy],
      foreignColumns: [users.id],
      name: 'time_spans_voided_by_fkey',
    }),
    unique('time_spans_client_request_id_key').on(table.clientRequestId),
    check(
      'time_spans_check',
      sql`(ended_at IS NULL) OR (ended_at >= started_at)`,
    ),
    check('time_spans_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketEvents = pgTable(
  'ticket_events',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({
        name: 'ticket_events_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    type: eventType().notNull(),
    actorId: uuid('actor_id'),
    subjectUserId: uuid('subject_user_id'),
    subjectTechnicianId: uuid('subject_technician_id'),
    reasonId: uuid('reason_id'),
    payload: jsonb().default({}).notNull(),
    source: eventSource().default('app').notNull(),
    clientRequestId: uuid('client_request_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_ticket_events_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    index('idx_ticket_events_ticket_type').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
      table.type.asc().nullsLast().op('enum_ops'),
    ),
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.id],
      name: 'ticket_events_actor_id_fkey',
    }),
    foreignKey({
      columns: [table.reasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_events_reason_id_fkey',
    }),
    foreignKey({
      columns: [table.subjectTechnicianId],
      foreignColumns: [technicians.id],
      name: 'ticket_events_subject_technician_id_fkey',
    }),
    foreignKey({
      columns: [table.subjectUserId],
      foreignColumns: [users.id],
      name: 'ticket_events_subject_user_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_events_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_events_client_request_id_key').on(table.clientRequestId),
    check('ticket_events_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketCaptures = pgTable(
  'ticket_captures',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    changedBy: uuid('changed_by'),
    changedAt: timestamp('changed_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    reasonId: uuid('reason_id'),
    changes: jsonb().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.changedBy],
      foreignColumns: [users.id],
      name: 'ticket_captures_changed_by_fkey',
    }),
    foreignKey({
      columns: [table.reasonId],
      foreignColumns: [reasons.id],
      name: 'ticket_captures_reason_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_captures_ticket_id_fkey',
    }).onDelete('cascade'),
    check('ticket_captures_cycle_check', sql`cycle > 0`),
  ],
)

export const ticketRatings = pgTable(
  'ticket_ratings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    score: smallint().notNull(),
    comment: text(),
    ratedBy: uuid('rated_by'),
    requesterId: uuid('requester_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.ratedBy],
      foreignColumns: [users.id],
      name: 'ticket_ratings_rated_by_fkey',
    }),
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [requesters.id],
      name: 'ticket_ratings_requester_id_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_ratings_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_ratings_ticket_id_key').on(table.ticketId),
    check('ticket_ratings_score_check', sql`(score >= 1) AND (score <= 5)`),
  ],
)

export const ticketValidations = pgTable(
  'ticket_validations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    cycle: integer().notNull(),
    validatorUserId: uuid('validator_user_id'),
    validatorRole: text('validator_role').notNull(),
    validatedAt: timestamp('validated_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_validations_ticket_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.validatorUserId],
      foreignColumns: [users.id],
      name: 'ticket_validations_validator_user_id_fkey',
    }),
    unique('ticket_validations_ticket_id_cycle_validator_role_key').on(
      table.ticketId,
      table.cycle,
      table.validatorRole,
    ),
    check('ticket_validations_cycle_check', sql`cycle > 0`),
    check(
      'ticket_validations_validator_role_check',
      sql`validator_role = ANY (ARRAY['requester'::text, 'supervisor'::text])`,
    ),
  ],
)

export const permissions = pgTable('permissions', {
  id: text().primaryKey().notNull(),
  description: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp('last_used_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    idleExpiresAt: timestamp('idle_expires_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    userAgent: text('user_agent'),
    ip: inet(),
  },
  (table) => [
    index('sessions_expires_at_idx').using(
      'btree',
      table.expiresAt.asc().nullsLast().op('timestamptz_ops'),
    ),
    index('sessions_idle_expires_at_idx').using(
      'btree',
      table.idleExpiresAt.asc().nullsLast().op('timestamptz_ops'),
    ),
    index('sessions_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'sessions_user_id_fkey',
    }).onDelete('cascade'),
    unique('sessions_token_hash_key').on(table.tokenHash),
  ],
)

export const loginAttempts = pgTable(
  'login_attempts',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({
        name: 'login_attempts_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    username: text().notNull(),
    userId: uuid('user_id'),
    ip: inet(),
    successful: boolean().notNull(),
    attemptedAt: timestamp('attempted_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('login_attempts_user_time_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('timestamptz_ops'),
      table.attemptedAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    index('login_attempts_username_time_idx').using(
      'btree',
      table.username.asc().nullsLast().op('text_ops'),
      table.attemptedAt.desc().nullsFirst().op('text_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'login_attempts_user_id_fkey',
    }).onDelete('set null'),
  ],
)

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    endpoint: text().notNull(),
    p256Dh: text().notNull(),
    auth: text().notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_push_subscriptions_user').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'push_subscriptions_user_id_fkey',
    }).onDelete('cascade'),
    unique('push_subscriptions_endpoint_key').on(table.endpoint),
  ],
)

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    notificationId: uuid('notification_id').notNull(),
    channel: notificationChannel().notNull(),
    status: text().default('pending').notNull(),
    attempts: integer().default(0).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    lastAttemptAt: timestamp('last_attempt_at', {
      withTimezone: true,
      mode: 'string',
    }),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'string' }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('notification_deliveries_notification_idx').using(
      'btree',
      table.notificationId.asc().nullsLast().op('uuid_ops'),
    ),
    index('notification_deliveries_pending_idx')
      .using(
        'btree',
        table.nextAttemptAt.asc().nullsLast().op('timestamptz_ops'),
      )
      .where(sql`(status = 'pending'::text)`),
    foreignKey({
      columns: [table.notificationId],
      foreignColumns: [notifications.id],
      name: 'notification_deliveries_notification_id_fkey',
    }).onDelete('cascade'),
    unique('notification_deliveries_notification_id_channel_key').on(
      table.notificationId,
      table.channel,
    ),
    check('notification_deliveries_attempts_check', sql`attempts >= 0`),
    check(
      'notification_deliveries_status_check',
      sql`status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'abandoned'::text])`,
    ),
  ],
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    recipientUserId: uuid('recipient_user_id'),
    recipientRequesterId: uuid('recipient_requester_id'),
    ticketId: uuid('ticket_id'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    eventId: bigint('event_id', { mode: 'number' }),
    type: eventType().notNull(),
    channel: notificationChannel().default('in_app').notNull(),
    payload: jsonb().default({}).notNull(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_notifications_recipient').using(
      'btree',
      table.recipientUserId.asc().nullsLast().op('timestamptz_ops'),
      table.readAt.asc().nullsLast().op('timestamptz_ops'),
    ),
    index('idx_notifications_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [ticketEvents.id],
      name: 'notifications_event_id_fkey',
    }),
    foreignKey({
      columns: [table.recipientRequesterId],
      foreignColumns: [requesters.id],
      name: 'notifications_recipient_requester_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.recipientUserId],
      foreignColumns: [users.id],
      name: 'notifications_recipient_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'notifications_ticket_id_fkey',
    }).onDelete('cascade'),
    check(
      'notifications_check',
      sql`(recipient_user_id IS NOT NULL) OR (recipient_requester_id IS NOT NULL)`,
    ),
  ],
)

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    clientRequestId: uuid('client_request_id').primaryKey().notNull(),
    actorId: uuid('actor_id'),
    operation: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    status: text().default('applied').notNull(),
    response: jsonb(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.id],
      name: 'idempotency_keys_actor_id_fkey',
    }),
    check(
      'idempotency_keys_status_check',
      sql`status = ANY (ARRAY['applied'::text, 'duplicate'::text, 'rejected'::text, 'conflict'::text])`,
    ),
  ],
)

export const importStatusMap = pgTable(
  'import_status_map',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    system: text().notNull(),
    externalStatus: text('external_status').notNull(),
    ticketStatus: ticketStatus('ticket_status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.system],
      foreignColumns: [externalSystems.name],
      name: 'import_status_map_system_fkey',
    }),
    unique('import_status_map_system_external_status_key').on(
      table.system,
      table.externalStatus,
    ),
  ],
)

export const catalogImportRows = pgTable(
  'catalog_import_rows',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    runId: uuid('run_id').notNull(),
    catalogKey: text('catalog_key').notNull(),
    rowNumber: integer('row_number'),
    raw: jsonb().default({}).notNull(),
    result: text().notNull(),
    recordId: uuid('record_id'),
    error: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_catalog_import_rows_run').using(
      'btree',
      table.runId.asc().nullsLast().op('text_ops'),
      table.catalogKey.asc().nullsLast().op('text_ops'),
      table.result.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.runId],
      foreignColumns: [catalogImportRuns.id],
      name: 'catalog_import_rows_run_id_fkey',
    }).onDelete('cascade'),
    check(
      'catalog_import_rows_result_check',
      sql`result = ANY (ARRAY['inserted'::text, 'updated'::text, 'skipped'::text, 'error'::text])`,
    ),
  ],
)

export const catalogImportRuns = pgTable(
  'catalog_import_runs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    mode: text().default('commit').notNull(),
    sourceFile: text('source_file'),
    status: text().default('running').notNull(),
    summary: jsonb().default({}).notNull(),
    createdBy: uuid('created_by'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp('finished_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'catalog_import_runs_created_by_fkey',
    }),
    check(
      'catalog_import_runs_mode_check',
      sql`mode = ANY (ARRAY['dry_run'::text, 'commit'::text])`,
    ),
    check(
      'catalog_import_runs_status_check',
      sql`status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])`,
    ),
  ],
)

export const externalSystems = pgTable(
  'external_systems',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    authority: text().default('source').notNull(),
  },
  (table) => [
    unique('external_systems_name_key').on(table.name),
    check(
      'external_systems_authority_check',
      sql`authority = ANY (ARRAY['source'::text, 'axia'::text, 'manual'::text])`,
    ),
  ],
)

export const ticketExternalRefs = pgTable(
  'ticket_external_refs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    system: text().notNull(),
    externalId: text('external_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    externalStatus: text('external_status'),
  },
  (table) => [
    foreignKey({
      columns: [table.system],
      foreignColumns: [externalSystems.name],
      name: 'ticket_external_refs_system_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_external_refs_ticket_id_fkey',
    }).onDelete('cascade'),
    unique('ticket_external_refs_system_external_id_key').on(
      table.system,
      table.externalId,
    ),
  ],
)

export const workCalendarHolidays = pgTable(
  'work_calendar_holidays',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    calendarId: uuid('calendar_id').notNull(),
    holiday: date().notNull(),
    name: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.calendarId],
      foreignColumns: [workCalendars.id],
      name: 'work_calendar_holidays_calendar_id_fkey',
    }).onDelete('cascade'),
    unique('work_calendar_holidays_calendar_id_holiday_key').on(
      table.calendarId,
      table.holiday,
    ),
  ],
)

export const workCalendarIntervals = pgTable(
  'work_calendar_intervals',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    calendarId: uuid('calendar_id').notNull(),
    weekday: smallint().notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.calendarId],
      foreignColumns: [workCalendars.id],
      name: 'work_calendar_intervals_calendar_id_fkey',
    }).onDelete('cascade'),
    check('work_calendar_intervals_check', sql`start_time < end_time`),
    check(
      'work_calendar_intervals_weekday_check',
      sql`(weekday >= 0) AND (weekday <= 6)`,
    ),
  ],
)

export const workCalendars = pgTable(
  'work_calendars',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    timezone: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('work_calendars_name_key').on(table.name)],
)

export const reasons = pgTable(
  'reasons',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    use: reasonUse().notNull(),
    parentId: uuid('parent_id'),
    name: text().notNull(),
    position: smallint().default(0).notNull(),
    requiresNote: boolean('requires_note').default(false).notNull(),
    allowsEstimatedDate: boolean('allows_estimated_date')
      .default(false)
      .notNull(),
    clockClass: clockClass('clock_class').default('counted').notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'reasons_parent_id_fkey',
    }),
    unique('reasons_use_parent_id_name_key').on(
      table.use,
      table.parentId,
      table.name,
    ),
  ],
)

export const teams = pgTable(
  'teams',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    workCalendarId: uuid('work_calendar_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.workCalendarId],
      foreignColumns: [workCalendars.id],
      name: 'teams_work_calendar_id_fkey',
    }),
    unique('teams_name_key').on(table.name),
  ],
)

export const buildings = pgTable(
  'buildings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('buildings_name_key').on(table.name)],
)

export const locations = pgTable(
  'locations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    buildingId: uuid('building_id').notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.buildingId],
      foreignColumns: [buildings.id],
      name: 'locations_building_id_fkey',
    }),
    unique('locations_building_id_name_key').on(table.buildingId, table.name),
  ],
)

export const dependencies = pgTable(
  'dependencies',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('dependencies_name_key').on(table.name)],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid('team_id').notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'categories_team_id_fkey',
    }),
    unique('categories_team_id_name_key').on(table.teamId, table.name),
  ],
)

export const subcategories = pgTable(
  'subcategories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    categoryId: uuid('category_id').notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'subcategories_category_id_fkey',
    }),
    unique('subcategories_category_id_name_key').on(
      table.categoryId,
      table.name,
    ),
  ],
)

export const problems = pgTable(
  'problems',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    subcategoryId: uuid('subcategory_id').notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    defaultPriorityId: uuid('default_priority_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.defaultPriorityId],
      foreignColumns: [priorities.id],
      name: 'problems_default_priority_id_fkey',
    }),
    foreignKey({
      columns: [table.subcategoryId],
      foreignColumns: [subcategories.id],
      name: 'problems_subcategory_id_fkey',
    }),
    unique('problems_subcategory_id_name_key').on(
      table.subcategoryId,
      table.name,
    ),
  ],
)

export const priorities = pgTable(
  'priorities',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    position: smallint().default(0).notNull(),
    targetMinutes: integer('target_minutes'),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('priorities_name_key').on(table.name),
    check(
      'priorities_target_minutes_check',
      sql`(target_minutes IS NULL) OR (target_minutes > 0)`,
    ),
  ],
)

export const serviceTypes = pgTable(
  'service_types',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    targetMinutes: integer('target_minutes'),
  },
  (table) => [
    unique('service_types_name_key').on(table.name),
    check(
      'service_types_target_minutes_check',
      sql`(target_minutes IS NULL) OR (target_minutes > 0)`,
    ),
  ],
)

export const channels = pgTable(
  'channels',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    isPlatform: boolean('is_platform').default(false).notNull(),
  },
  (table) => [unique('channels_name_key').on(table.name)],
)

export const requesters = pgTable(
  'requesters',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    fullName: text('full_name').notNull(),
    contact: text(),
    dependencyId: uuid('dependency_id'),
    userId: uuid('user_id'),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.dependencyId],
      foreignColumns: [dependencies.id],
      name: 'requesters_dependency_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'requesters_user_id_fkey',
    }).onDelete('set null'),
    unique('requesters_user_id_key').on(table.userId),
  ],
)

export const technicians = pgTable(
  'technicians',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    fullName: text('full_name').notNull(),
    userId: uuid('user_id'),
    teamId: uuid('team_id').notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'technicians_team_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'technicians_user_id_fkey',
    }).onDelete('set null'),
    unique('technicians_user_id_key').on(table.userId),
  ],
)

export const roles = pgTable(
  'roles',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    label: text().notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique('roles_name_key').on(table.name)],
)

export const supervisorScopes = pgTable(
  'supervisor_scopes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    teamId: uuid('team_id').notNull(),
    active: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'supervisor_scopes_team_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'supervisor_scopes_user_id_fkey',
    }).onDelete('cascade'),
    unique('supervisor_scopes_user_id_team_id_key').on(
      table.userId,
      table.teamId,
    ),
  ],
)

export const integrationTasks = pgTable(
  'integration_tasks',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    system: text().notNull(),
    description: text().notNull(),
    assignedTo: uuid('assigned_to'),
    dueDate: date('due_date'),
    status: text().default('open').notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_integration_tasks_ticket').using(
      'btree',
      table.ticketId.asc().nullsLast().op('text_ops'),
      table.status.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [users.id],
      name: 'integration_tasks_assigned_to_fkey',
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'integration_tasks_created_by_fkey',
    }),
    foreignKey({
      columns: [table.system],
      foreignColumns: [externalSystems.name],
      name: 'integration_tasks_system_fkey',
    }),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'integration_tasks_ticket_id_fkey',
    }).onDelete('cascade'),
    check(
      'integration_tasks_status_check',
      sql`status = ANY (ARRAY['open'::text, 'done'::text, 'cancelled'::text])`,
    ),
  ],
)

export const supervisorScopeBuildings = pgTable(
  'supervisor_scope_buildings',
  {
    scopeId: uuid('scope_id').notNull(),
    buildingId: uuid('building_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.buildingId],
      foreignColumns: [buildings.id],
      name: 'supervisor_scope_buildings_building_id_fkey',
    }),
    foreignKey({
      columns: [table.scopeId],
      foreignColumns: [supervisorScopes.id],
      name: 'supervisor_scope_buildings_scope_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.scopeId, table.buildingId],
      name: 'supervisor_scope_buildings_pkey',
    }),
  ],
)

export const technicianCategories = pgTable(
  'technician_categories',
  {
    technicianId: uuid('technician_id').notNull(),
    categoryId: uuid('category_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'technician_categories_category_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.technicianId],
      foreignColumns: [technicians.id],
      name: 'technician_categories_technician_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.technicianId, table.categoryId],
      name: 'technician_categories_pkey',
    }),
  ],
)

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id').notNull(),
    permissionId: text('permission_id').notNull(),
    scope: permissionScope().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [permissions.id],
      name: 'role_permissions_permission_id_fkey',
    }),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'role_permissions_role_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.roleId, table.permissionId],
      name: 'role_permissions_pkey',
    }),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'user_roles_role_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_roles_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [table.userId, table.roleId],
      name: 'user_roles_pkey',
    }),
  ],
)
export const vMetricsAging = pgView('v_metrics_aging', {
  id: uuid(),
  folio: text(),
  status: ticketStatus(),
  teamId: uuid('team_id'),
  categoryId: uuid('category_id'),
  priorityId: uuid('priority_id'),
  reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'string' }),
  age: interval(),
  ageLabor: interval('age_labor'),
  waitStartTime: interval('wait_start_time'),
  pauseTime: interval('pause_time'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT id, folio, status, team_id, category_id, priority_id, reported_at, now() - reported_at AS age, work_calendar_overlap(ticket_calendar(id), reported_at, now()) AS age_labor, ticket_time_by_kind(id, 'wait_start'::time_span_kind) AS wait_start_time, ticket_time_by_kind(id, 'pause'::time_span_kind) AS pause_time FROM tickets t WHERE status <> ALL (ARRAY['closed'::ticket_status, 'rejected'::ticket_status, 'cancelled'::ticket_status, 'duplicate'::ticket_status])`,
  )

export const vTicketMetricsBase = pgView('v_ticket_metrics_base', {
  id: uuid(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  ticketNumber: bigint('ticket_number', { mode: 'number' }),
  folio: text(),
  status: ticketStatus(),
  buildingId: uuid('building_id'),
  categoryId: uuid('category_id'),
  priorityId: uuid('priority_id'),
  teamId: uuid('team_id'),
  reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'string' }),
  closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
  totalTime: interval('total_time'),
  netTime: interval('net_time'),
  activeWorkTime: interval('active_work_time'),
  totalTimeLabor: interval('total_time_labor'),
  netTimeLabor: interval('net_time_labor'),
  activeWorkTimeLabor: interval('active_work_time_labor'),
  responseTime: interval('response_time'),
  responseTimeLabor: interval('response_time_labor'),
  assignmentTime: interval('assignment_time'),
  assignmentTimeLabor: interval('assignment_time_labor'),
  reassignmentTime: interval('reassignment_time'),
  reassignmentTimeLabor: interval('reassignment_time_labor'),
  waitStartTime: interval('wait_start_time'),
  waitStartTimeLabor: interval('wait_start_time_labor'),
  pauseTime: interval('pause_time'),
  pauseTimeLabor: interval('pause_time_labor'),
  validationTime: interval('validation_time'),
  validationTimeLabor: interval('validation_time_labor'),
  claimTime: interval('claim_time'),
  claimTimeLabor: interval('claim_time_labor'),
  requesterId: uuid('requester_id'),
  dependencyId: uuid('dependency_id'),
  reassignedSupervisor: boolean('reassigned_supervisor'),
  reassignedTechnician: boolean('reassigned_technician'),
  recaptured: boolean(),
  reopened: boolean(),
  hasRequestEvidence: boolean('has_request_evidence'),
  hasBeforeEvidence: boolean('has_before_evidence'),
  hasAfterEvidence: boolean('has_after_evidence'),
  validatedRequester: boolean('validated_requester'),
  validatedSupervisor: boolean('validated_supervisor'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  recaptureCount: bigint('recapture_count', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  reopenCount: bigint('reopen_count', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  auxiliaryCount: bigint('auxiliary_count', { mode: 'number' }),
  auxiliaryTime: interval('auxiliary_time'),
  activeWorkTimeExtra: interval('active_work_time_extra'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT id, ticket_number, folio, status, building_id, category_id, priority_id, team_id, reported_at, closed_at, ticket_time_total(id) AS total_time, ticket_time_net(id) AS net_time, ticket_time_by_kind(id, 'active_work'::time_span_kind) AS active_work_time, ticket_time_total_laboral(id) AS total_time_labor, ticket_time_net_laboral(id) AS net_time_labor, ticket_time_by_kind_laboral(id, 'active_work'::time_span_kind) AS active_work_time_labor, ticket_time_by_kind(id, 'supervisor_response'::time_span_kind) AS response_time, ticket_time_by_kind_laboral(id, 'supervisor_response'::time_span_kind) AS response_time_labor, ticket_time_by_kind(id, 'technician_assignment'::time_span_kind) AS assignment_time, ticket_time_by_kind_laboral(id, 'technician_assignment'::time_span_kind) AS assignment_time_labor, ticket_time_by_kind(id, 'reassignment'::time_span_kind) AS reassignment_time, ticket_time_by_kind_laboral(id, 'reassignment'::time_span_kind) AS reassignment_time_labor, ticket_time_by_kind(id, 'wait_start'::time_span_kind) AS wait_start_time, ticket_time_by_kind_laboral(id, 'wait_start'::time_span_kind) AS wait_start_time_labor, ticket_time_by_kind(id, 'pause'::time_span_kind) AS pause_time, ticket_time_by_kind_laboral(id, 'pause'::time_span_kind) AS pause_time_labor, ticket_time_by_kind(id, 'validation'::time_span_kind) AS validation_time, ticket_time_by_kind_laboral(id, 'validation'::time_span_kind) AS validation_time_labor, ticket_time_by_kind(id, 'claim'::time_span_kind) AS claim_time, ticket_time_by_kind_laboral(id, 'claim'::time_span_kind) AS claim_time_labor, requester_id, dependency_id, (EXISTS ( SELECT 1 FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'reassigned_supervisor'::event_type)) AS reassigned_supervisor, (EXISTS ( SELECT 1 FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'reassigned_technician'::event_type)) AS reassigned_technician, (EXISTS ( SELECT 1 FROM ticket_captures c WHERE c.ticket_id = t.id)) AS recaptured, (EXISTS ( SELECT 1 FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'reopened'::event_type)) AS reopened, (EXISTS ( SELECT 1 FROM evidence ev WHERE ev.ticket_id = t.id AND ev.type = 'request'::evidence_type)) AS has_request_evidence, (EXISTS ( SELECT 1 FROM evidence ev WHERE ev.ticket_id = t.id AND ev.type = 'before'::evidence_type)) AS has_before_evidence, (EXISTS ( SELECT 1 FROM evidence ev WHERE ev.ticket_id = t.id AND ev.type = 'after'::evidence_type)) AS has_after_evidence, (EXISTS ( SELECT 1 FROM ticket_validations v WHERE v.ticket_id = t.id AND v.validator_role = 'requester'::text)) AS validated_requester, (EXISTS ( SELECT 1 FROM ticket_validations v WHERE v.ticket_id = t.id AND v.validator_role = 'supervisor'::text)) AS validated_supervisor, ( SELECT count(*) AS count FROM ticket_captures c WHERE c.ticket_id = t.id) AS recapture_count, ( SELECT count(*) AS count FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'reopened'::event_type) AS reopen_count, ( SELECT count(*) AS count FROM ticket_participants p WHERE p.ticket_id = t.id AND p.participation_type = 'auxiliary'::participation_type) AS auxiliary_count, ( SELECT sum(COALESCE(p.ended_at, now()) - p.started_at) AS sum FROM ticket_participants p WHERE p.ticket_id = t.id AND p.participation_type = 'auxiliary'::participation_type) AS auxiliary_time, ticket_time_by_kind_extra(id, 'active_work'::time_span_kind) AS active_work_time_extra FROM tickets t WHERE status <> 'duplicate'::ticket_status`,
  )

export const vMetricsByDimension = pgView('v_metrics_by_dimension', {
  dimension: text(),
  dimensionId: uuid('dimension_id'),
  dimensionName: text('dimension_name'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tickets: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  reassigned: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  recaptured: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  reopened: bigint({ mode: 'number' }),
  reassignmentRate: numeric('reassignment_rate'),
  recaptureRate: numeric('recapture_rate'),
  reopenRate: numeric('reopen_rate'),
  firstTimeFixRate: numeric('first_time_fix_rate'),
  avgResponseTime: interval('avg_response_time'),
  avgAssignmentTime: interval('avg_assignment_time'),
  avgReassignmentTime: interval('avg_reassignment_time'),
  avgWaitStartTime: interval('avg_wait_start_time'),
  avgActiveWorkTime: interval('avg_active_work_time'),
  avgPauseTime: interval('avg_pause_time'),
  avgValidationTime: interval('avg_validation_time'),
  avgTotalTime: interval('avg_total_time'),
  avgNetTime: interval('avg_net_time'),
  avgTotalTimeLabor: interval('avg_total_time_labor'),
  avgNetTimeLabor: interval('avg_net_time_labor'),
  avgActiveWorkTimeLabor: interval('avg_active_work_time_labor'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT CASE WHEN GROUPING(m.team_id) = 0 THEN 'team'::text WHEN GROUPING(m.category_id) = 0 THEN 'category'::text WHEN GROUPING(m.building_id) = 0 THEN 'building'::text WHEN GROUPING(m.dependency_id) = 0 THEN 'dependency'::text ELSE 'requester'::text END AS dimension, COALESCE(m.team_id, m.category_id, m.building_id, m.dependency_id, m.requester_id) AS dimension_id, COALESCE(tm.name, cat.name, bld.name, dep.name, req.full_name) AS dimension_name, count(*) AS tickets, count(*) FILTER (WHERE m.reassigned_supervisor) AS reassigned, count(*) FILTER (WHERE m.recaptured) AS recaptured, count(*) FILTER (WHERE m.reopened) AS reopened, round(count(*) FILTER (WHERE m.reassigned_supervisor)::numeric / NULLIF(count(*), 0)::numeric, 4) AS reassignment_rate, round(count(*) FILTER (WHERE m.recaptured)::numeric / NULLIF(count(*), 0)::numeric, 4) AS recapture_rate, round(count(*) FILTER (WHERE m.reopened)::numeric / NULLIF(count(*), 0)::numeric, 4) AS reopen_rate, round(count(*) FILTER (WHERE m.status = 'closed'::ticket_status AND NOT m.reopened)::numeric / NULLIF(count(*) FILTER (WHERE m.status = 'closed'::ticket_status), 0)::numeric, 4) AS first_time_fix_rate, avg(m.response_time) AS avg_response_time, avg(m.assignment_time) AS avg_assignment_time, avg(m.reassignment_time) AS avg_reassignment_time, avg(m.wait_start_time) AS avg_wait_start_time, avg(m.active_work_time) AS avg_active_work_time, avg(m.pause_time) AS avg_pause_time, avg(m.validation_time) AS avg_validation_time, avg(m.total_time) AS avg_total_time, avg(m.net_time) AS avg_net_time, avg(m.total_time_labor) AS avg_total_time_labor, avg(m.net_time_labor) AS avg_net_time_labor, avg(m.active_work_time_labor) AS avg_active_work_time_labor FROM v_ticket_metrics_base m LEFT JOIN teams tm ON tm.id = m.team_id LEFT JOIN categories cat ON cat.id = m.category_id LEFT JOIN buildings bld ON bld.id = m.building_id LEFT JOIN dependencies dep ON dep.id = m.dependency_id LEFT JOIN requesters req ON req.id = m.requester_id GROUP BY GROUPING SETS ((m.team_id, tm.name), (m.category_id, cat.name), (m.building_id, bld.name), (m.dependency_id, dep.name), (m.requester_id, req.full_name))`,
  )

export const vMetricsByTechnician = pgView('v_metrics_by_technician', {
  technicianId: uuid('technician_id'),
  technicianName: text('technician_name'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tickets: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  leaderCount: bigint('leader_count', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  auxiliaryCount: bigint('auxiliary_count', { mode: 'number' }),
  participationTime: interval('participation_time'),
  participationTimeLabor: interval('participation_time_labor'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  assignedCount: bigint('assigned_count', { mode: 'number' }),
  participationTimeExtra: interval('participation_time_extra'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT p.technician_id, tech.full_name AS technician_name, count(DISTINCT p.ticket_id) AS tickets, count(*) FILTER (WHERE p.participation_type = 'leader'::participation_type) AS leader_count, count(*) FILTER (WHERE p.participation_type = 'auxiliary'::participation_type) AS auxiliary_count, sum(COALESCE(p.ended_at, now()) - p.started_at) AS participation_time, sum(work_calendar_overlap(ticket_calendar(p.ticket_id), p.started_at, COALESCE(p.ended_at, now()))) AS participation_time_labor, ( SELECT count(*) AS count FROM ticket_assignments a WHERE a.assignee_technician_id = p.technician_id AND a.stage = 'technician'::assignment_stage) AS assigned_count, sum(COALESCE(p.ended_at, now()) - p.started_at) - sum(work_calendar_overlap(ticket_calendar(p.ticket_id), p.started_at, COALESCE(p.ended_at, now()))) AS participation_time_extra FROM ticket_participants p JOIN technicians tech ON tech.id = p.technician_id GROUP BY p.technician_id, tech.full_name`,
  )

export const vMetricsDuplicateAlerts = pgView('v_metrics_duplicate_alerts', {
  decision: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  candidates: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tickets: bigint({ mode: 'number' }),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT COALESCE(decision, 'pending'::text) AS decision, count(*) AS candidates, count(DISTINCT ticket_id) AS tickets FROM ticket_duplicate_candidates c GROUP BY (COALESCE(decision, 'pending'::text))`,
  )

export const vMetricsDuplicateTickets = pgView('v_metrics_duplicate_tickets', {
  id: uuid(),
  buildingId: uuid('building_id'),
  categoryId: uuid('category_id'),
  teamId: uuid('team_id'),
  dependencyId: uuid('dependency_id'),
  requesterId: uuid('requester_id'),
  reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'string' }),
  markedAt: timestamp('marked_at', { withTimezone: true, mode: 'string' }),
  timeToMark: interval('time_to_mark'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT id, building_id, category_id, team_id, dependency_id, requester_id, reported_at, ( SELECT min(e.occurred_at) AS min FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'duplicate_marked'::event_type) AS marked_at, (( SELECT min(e.occurred_at) AS min FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'duplicate_marked'::event_type)) - reported_at AS time_to_mark FROM tickets t WHERE status = 'duplicate'::ticket_status`,
  )

export const vMetricsDuplicatesByDimension = pgView(
  'v_metrics_duplicates_by_dimension',
  {
    dimension: text(),
    dimensionId: uuid('dimension_id'),
    dimensionName: text('dimension_name'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    tickets: bigint({ mode: 'number' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    duplicates: bigint({ mode: 'number' }),
    duplicateRate: numeric('duplicate_rate'),
  },
)
  .with({ securityInvoker: true })
  .as(
    sql`WITH agg AS ( SELECT GROUPING(t.team_id) AS g_team, GROUPING(t.building_id) AS g_building, GROUPING(t.dependency_id) AS g_dependency, GROUPING(t.requester_id) AS g_requester, t.team_id, t.building_id, t.dependency_id, t.requester_id, count(*) AS tickets, count(*) FILTER (WHERE t.status = 'duplicate'::ticket_status) AS duplicates FROM tickets t GROUP BY GROUPING SETS ((t.team_id), (t.building_id), (t.dependency_id), (t.requester_id)) ) SELECT CASE WHEN agg.g_team = 0 THEN 'team'::text WHEN agg.g_building = 0 THEN 'building'::text WHEN agg.g_dependency = 0 THEN 'dependency'::text ELSE 'requester'::text END AS dimension, COALESCE(agg.team_id, agg.building_id, agg.dependency_id, agg.requester_id) AS dimension_id, COALESCE(tm.name, bld.name, dep.name, req.full_name) AS dimension_name, agg.tickets, agg.duplicates, round(agg.duplicates::numeric / NULLIF(agg.tickets, 0)::numeric, 4) AS duplicate_rate FROM agg LEFT JOIN teams tm ON tm.id = agg.team_id LEFT JOIN buildings bld ON bld.id = agg.building_id LEFT JOIN dependencies dep ON dep.id = agg.dependency_id LEFT JOIN requesters req ON req.id = agg.requester_id`,
  )

export const vMetricsPausesByReason = pgView('v_metrics_pauses_by_reason', {
  reasonId: uuid('reason_id'),
  reasonName: text('reason_name'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  pauses: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tickets: bigint({ mode: 'number' }),
  pauseTime: interval('pause_time'),
  pauseTimeLabor: interval('pause_time_labor'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT r.id AS reason_id, r.name AS reason_name, count(*) AS pauses, count(DISTINCT p.ticket_id) AS tickets, sum(COALESCE(p.closed_at, now()) - p.opened_at) AS pause_time, sum(work_calendar_overlap(ticket_calendar(p.ticket_id), p.opened_at, COALESCE(p.closed_at, now()))) AS pause_time_labor FROM ticket_pauses p JOIN reasons r ON r.id = p.reason_id GROUP BY r.id, r.name`,
  )

export const vMetricsRejectCancelByReason = pgView(
  'v_metrics_reject_cancel_by_reason',
  {
    eventType: eventType('event_type'),
    reasonId: uuid('reason_id'),
    reasonName: text('reason_name'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    tickets: bigint({ mode: 'number' }),
  },
)
  .with({ securityInvoker: true })
  .as(
    sql`SELECT e.type AS event_type, r.id AS reason_id, r.name AS reason_name, count(*) AS tickets FROM ticket_events e JOIN reasons r ON r.id = e.reason_id WHERE e.type = ANY (ARRAY['rejected'::event_type, 'cancelled'::event_type]) GROUP BY e.type, r.id, r.name`,
  )

export const vMetricsRouting = pgView('v_metrics_routing', {
  id: uuid(),
  folio: text(),
  status: ticketStatus(),
  buildingId: uuid('building_id'),
  teamId: uuid('team_id'),
  reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  offersCount: bigint('offers_count', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  pendingOffers: bigint('pending_offers', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  takenOffers: bigint('taken_offers', { mode: 'number' }),
  timeToTake: interval('time_to_take'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT id, folio, status, building_id, team_id, reported_at, ( SELECT count(*) AS count FROM ticket_offers o WHERE o.ticket_id = t.id) AS offers_count, ( SELECT count(*) AS count FROM ticket_offers o WHERE o.ticket_id = t.id AND o.status = 'offered'::offer_status) AS pending_offers, ( SELECT count(*) AS count FROM ticket_offers o WHERE o.ticket_id = t.id AND o.status = 'taken'::offer_status) AS taken_offers, (( SELECT min(o.resolved_at) AS min FROM ticket_offers o WHERE o.ticket_id = t.id AND o.status = 'taken'::offer_status)) - reported_at AS time_to_take FROM tickets t`,
  )

export const vMetricsSatisfaction = pgView('v_metrics_satisfaction', {
  averageScore: numeric('average_score'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  ratings: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  score1: bigint('score_1', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  score2: bigint('score_2', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  score3: bigint('score_3', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  score4: bigint('score_4', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  score5: bigint('score_5', { mode: 'number' }),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT round(avg(score), 3) AS average_score, count(*) AS ratings, count(*) FILTER (WHERE score = 1) AS score_1, count(*) FILTER (WHERE score = 2) AS score_2, count(*) FILTER (WHERE score = 3) AS score_3, count(*) FILTER (WHERE score = 4) AS score_4, count(*) FILTER (WHERE score = 5) AS score_5 FROM ticket_ratings r`,
  )

export const vTicketSla = pgView('v_ticket_sla', {
  id: uuid(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  ticketNumber: bigint('ticket_number', { mode: 'number' }),
  folio: text(),
  status: ticketStatus(),
  description: text(),
  priorityId: uuid('priority_id'),
  serviceTypeId: uuid('service_type_id'),
  buildingId: uuid('building_id'),
  categoryId: uuid('category_id'),
  teamId: uuid('team_id'),
  reportedAt: timestamp('reported_at', { withTimezone: true, mode: 'string' }),
  closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
  targetMinutes: integer('target_minutes'),
  resolutionMinutes: numeric('resolution_minutes'),
  meets: boolean(),
})
  .with({ securityInvoker: true })
  .as(
    sql`WITH base AS ( SELECT t.id, t.ticket_number, t.folio, t.status, t.description, t.priority_id, t.service_type_id, t.building_id, t.category_id, t.team_id, t.reported_at, t.closed_at, COALESCE(st.target_minutes, pr.target_minutes) AS target_minutes, CASE WHEN t.closed_at IS NULL THEN NULL::numeric WHEN (( SELECT instance_settings.sla_clock_mode FROM instance_settings LIMIT 1)) = 'laboral'::text THEN EXTRACT(epoch FROM ticket_time_total_laboral(t.id)) / 60::numeric ELSE EXTRACT(epoch FROM t.closed_at - t.reported_at) / 60::numeric END AS resolution_minutes FROM tickets t LEFT JOIN service_types st ON st.id = t.service_type_id LEFT JOIN priorities pr ON pr.id = t.priority_id WHERE t.status <> 'duplicate'::ticket_status ) SELECT id, ticket_number, folio, status, description, priority_id, service_type_id, building_id, category_id, team_id, reported_at, closed_at, target_minutes, resolution_minutes, CASE WHEN resolution_minutes IS NOT NULL AND target_minutes IS NOT NULL THEN resolution_minutes <= target_minutes::numeric ELSE NULL::boolean END AS meets FROM base`,
  )

export const vMetricsSla = pgView('v_metrics_sla', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  withTarget: bigint('with_target', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  met: bigint({ mode: 'number' }),
  complianceRate: numeric('compliance_rate'),
  avgTargetMinutes: numeric('avg_target_minutes'),
  avgResolutionMinutes: numeric('avg_resolution_minutes'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT count(*) FILTER (WHERE target_minutes IS NOT NULL AND closed_at IS NOT NULL) AS with_target, count(*) FILTER (WHERE meets) AS met, round(count(*) FILTER (WHERE meets)::numeric / NULLIF(count(*) FILTER (WHERE target_minutes IS NOT NULL AND closed_at IS NOT NULL), 0)::numeric, 4) AS compliance_rate, avg(target_minutes) FILTER (WHERE target_minutes IS NOT NULL AND closed_at IS NOT NULL) AS avg_target_minutes, avg(resolution_minutes) FILTER (WHERE target_minutes IS NOT NULL AND closed_at IS NOT NULL) AS avg_resolution_minutes FROM v_ticket_sla`,
  )

export const vMetricsSlaByPriority = pgView('v_metrics_sla_by_priority', {
  priorityId: uuid('priority_id'),
  priorityName: text('priority_name'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  withTarget: bigint('with_target', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  met: bigint({ mode: 'number' }),
  complianceRate: numeric('compliance_rate'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT pr.id AS priority_id, pr.name AS priority_name, count(*) FILTER (WHERE s.target_minutes IS NOT NULL AND s.closed_at IS NOT NULL) AS with_target, count(*) FILTER (WHERE s.meets) AS met, round(count(*) FILTER (WHERE s.meets)::numeric / NULLIF(count(*) FILTER (WHERE s.target_minutes IS NOT NULL AND s.closed_at IS NOT NULL), 0)::numeric, 4) AS compliance_rate FROM v_ticket_sla s JOIN priorities pr ON pr.id = s.priority_id GROUP BY pr.id, pr.name`,
  )

export const vTicketTimeline = pgView('v_ticket_timeline', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' }),
  ticketId: uuid('ticket_id'),
  cycle: integer(),
  type: eventType(),
  payload: jsonb(),
  occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' }),
  recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' }),
  actorId: uuid('actor_id'),
  actorName: text('actor_name'),
  subjectUserId: uuid('subject_user_id'),
  subjectUserName: text('subject_user_name'),
  subjectTechnicianId: uuid('subject_technician_id'),
  subjectTechnicianName: text('subject_technician_name'),
  reasonId: uuid('reason_id'),
  reasonName: text('reason_name'),
})
  .with({ securityInvoker: true })
  .as(
    sql`SELECT e.id, e.ticket_id, e.cycle, e.type, e.payload, e.occurred_at, e.recorded_at, e.actor_id, actor.full_name AS actor_name, e.subject_user_id, subject.full_name AS subject_user_name, e.subject_technician_id, technician.full_name AS subject_technician_name, e.reason_id, reason.name AS reason_name FROM ticket_events e LEFT JOIN users actor ON actor.id = e.actor_id LEFT JOIN users subject ON subject.id = e.subject_user_id LEFT JOIN technicians technician ON technician.id = e.subject_technician_id LEFT JOIN reasons reason ON reason.id = e.reason_id`,
  )
