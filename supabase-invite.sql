-- Add invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add membership field to users (if not already added)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS member_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_code TEXT DEFAULT NULL;

-- Enable RLS on invite_codes
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON invite_codes FOR ALL USING (true) WITH CHECK (true);
