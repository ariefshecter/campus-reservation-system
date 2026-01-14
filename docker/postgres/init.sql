-- Extension untuk constraint waktu
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ENUM role user
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- ENUM status booking
CREATE TYPE booking_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'canceled'
);

-- ======================
-- TABLE: users
-- ======================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ======================
-- TABLE: facilities
-- ======================
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price NUMERIC(12,2),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ======================
-- TABLE: bookings
-- ======================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  status booking_status DEFAULT 'pending',
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CHECK (start_time < end_time)
);

-- ======================
-- ANTI DOUBLE BOOKING
-- ======================
ALTER TABLE bookings
ADD CONSTRAINT no_double_booking
EXCLUDE USING GIST (
  facility_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status IN ('pending', 'approved'));

-- USER TIDAK BISA BOOKING BENTROK
ALTER TABLE bookings
ADD CONSTRAINT no_user_overlap
EXCLUDE USING GIST (
  user_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status IN ('pending', 'approved'));
