// Application-wide constants — no secrets here, only configuration values

export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  PASSWORD_MIN_LENGTH: 10,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,
  // Argon2id settings
  ARGON2_MEMORY_COST: 65536, // 64 MB
  ARGON2_TIME_COST: 3,
  ARGON2_PARALLELISM: 4,
  // Rate limiting
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  ACCOUNT_LOCK_THRESHOLD: 10,
  ACCOUNT_LOCK_DURATION_MS: 30 * 60 * 1000, // 30 minutes
} as const;

export const API = {
  PREFIX: '/api/v1',
  MAX_BODY_SIZE: 100 * 1024, // 100KB
  MAX_FILE_SIZE: 1 * 1024 * 1024, // 1MB
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const WEBSOCKET = {
  MAX_MESSAGES_PER_SECOND: 10,
  HEARTBEAT_INTERVAL_MS: 30_000,
  HEARTBEAT_TIMEOUT_MS: 10_000,
  BATCH_SIZE_MIN: 30,
  BATCH_SIZE_MAX: 60,
} as const;

export const COOKIE = {
  ACCESS_TOKEN: 'drivesense_access',
  REFRESH_TOKEN: 'drivesense_refresh',
} as const;
