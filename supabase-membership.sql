-- Add password hash and membership fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS member_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Make password_hash nullable for existing users (they can set it on first login)
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash of the user password';
COMMENT ON COLUMN users.member_expires_at IS 'Membership expiration date, NULL means no membership';
