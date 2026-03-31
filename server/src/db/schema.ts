import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  bigserial,
  real,
  doublePrecision,
  index,
  uniqueIndex,
  inet,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin']);
export const tripModeEnum = pgEnum('trip_mode', ['driving_school', 'racing', 'eco', 'free']);
export const tripStatusEnum = pgEnum('trip_status', ['recording', 'processing', 'completed', 'failed']);
export const recordTypeEnum = pgEnum('record_type', ['fastest', 'safest', 'smoothest', 'most_efficient']);
export const tripEventTypeEnum = pgEnum('trip_event_type', [
  'hard_brake',
  'hard_accel',
  'sharp_turn',
  'smooth_turn',
  'speeding',
  'perfect_stop',
  'lane_drift',
  'jerky_steering',
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email').notNull(), // encrypted with pgcrypto
    emailHash: text('email_hash').notNull(), // SHA-256 for lookups
    passwordHash: text('password_hash').notNull(),
    username: text('username').notNull(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').default('user').notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    failedAttempts: integer('failed_attempts').default(0).notNull(),
    preferences: jsonb('preferences').default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    uniqueIndex('users_email_hash_idx').on(table.emailHash),
    uniqueIndex('users_username_idx').on(table.username),
  ],
);

// ─── Refresh Tokens ──────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('refresh_tokens_token_hash_idx').on(table.tokenHash),
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_user_id_idx').on(table.userId),
  ],
);

// ─── Trips ───────────────────────────────────────────────────────────────────

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    mode: tripModeEnum('mode').notNull(),
    status: tripStatusEnum('status').default('recording').notNull(),
    summary: jsonb('summary'),
    // PostGIS geometry columns are handled via raw SQL migrations
    // routeGeojson and boundingBox will be added via migration
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('trips_user_id_idx').on(table.userId),
    index('trips_status_idx').on(table.status),
  ],
);

// ─── Trip Datapoints ─────────────────────────────────────────────────────────

export const tripDatapoints = pgTable(
  'trip_datapoints',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    accuracy: real('accuracy'),
    speed: real('speed'),
    heading: real('heading'),
    altitude: real('altitude'),
    accelX: real('accel_x'),
    accelY: real('accel_y'),
    accelZ: real('accel_z'),
    gyroAlpha: real('gyro_alpha'),
    gyroBeta: real('gyro_beta'),
    gyroGamma: real('gyro_gamma'),
    gForceLateral: real('g_force_lateral'),
    gForceLongitudinal: real('g_force_longitudinal'),
    isFiltered: boolean('is_filtered').default(false).notNull(),
  },
  (table) => [
    index('trip_datapoints_trip_timestamp_idx').on(table.tripId, table.timestamp),
  ],
);

// ─── Trip Events ─────────────────────────────────────────────────────────────

export const tripEvents = pgTable(
  'trip_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    eventType: tripEventTypeEnum('event_type').notNull(),
    severity: real('severity').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    // location geometry handled via raw SQL migration
    details: jsonb('details'),
    scoreImpact: real('score_impact'),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('trip_events_trip_timestamp_idx').on(table.tripId, table.timestamp),
  ],
);

// ─── Street Segments ─────────────────────────────────────────────────────────

export const streetSegments = pgTable('street_segments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  osmWayId: bigserial('osm_way_id', { mode: 'bigint' }),
  name: text('name'),
  // geometry handled via raw SQL migration (PostGIS)
  speedLimit: integer('speed_limit'),
  roadType: text('road_type'),
  curveData: jsonb('curve_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
});

// ─── Street Records ──────────────────────────────────────────────────────────

export const streetRecords = pgTable(
  'street_records',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    segmentId: uuid('segment_id')
      .notNull()
      .references(() => streetSegments.id),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    recordType: recordTypeEnum('record_type').notNull(),
    mode: tripModeEnum('mode').notNull(),
    score: real('score').notNull(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('street_records_segment_type_mode_idx').on(table.segmentId, table.recordType, table.mode),
  ],
);

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: uuid('user_id'),
    action: text('action').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('audit_log_user_id_idx').on(table.userId),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_created_at_idx').on(table.createdAt),
  ],
);

// ─── Email Verification Tokens ───────────────────────────────────────────────

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('email_verification_tokens_hash_idx').on(table.tokenHash),
  ],
);

// ─── Password Reset Tokens ──────────────────────────────────────────────────

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`).notNull(),
  },
  (table) => [
    index('password_reset_tokens_hash_idx').on(table.tokenHash),
  ],
);
