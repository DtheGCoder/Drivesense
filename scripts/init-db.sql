-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE trip_mode AS ENUM ('driving_school', 'racing', 'eco', 'free');
CREATE TYPE trip_status AS ENUM ('recording', 'processing', 'completed', 'failed');
CREATE TYPE record_type AS ENUM ('fastest', 'safest', 'smoothest', 'most_efficient');
CREATE TYPE trip_event_type AS ENUM (
  'hard_brake', 'hard_accel', 'sharp_turn', 'smooth_turn',
  'speeding', 'perfect_stop', 'lane_drift', 'jerky_steering'
);
