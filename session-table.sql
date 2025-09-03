-- PostgreSQL session table schema for connect-pg-simple
-- This table will be created automatically by connect-pg-simple if createTableIfMissing: true
-- But you can create it manually if needed

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Create index on expire column for cleanup performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Optional: Clean up expired sessions (run periodically)
-- DELETE FROM session WHERE expire < NOW();