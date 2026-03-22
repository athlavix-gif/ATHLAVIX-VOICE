-- SQL Schema for Athlavix Voice Supabase Integration

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    whatsapp TEXT,
    avatar TEXT,
    bot_avatar TEXT,
    skin_type TEXT,
    concerns JSONB DEFAULT '[]',
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]',
    completed_challenges JSONB DEFAULT '[]',
    history JSONB DEFAULT '[]',
    analysis_history JSONB DEFAULT '[]',
    voice_settings JSONB DEFAULT '{"preset": "soft", "speed": 1}',
    notification_settings JSONB DEFAULT '{"enabled": false, "dailyAlerts": true, "updateAlerts": true}',
    last_notification_at BIGINT DEFAULT 0,
    onboarding_seen JSONB DEFAULT '{"welcome": false, "analysis": false, "gamification": false}',
    challenge_progress JSONB DEFAULT '{}',
    streak INTEGER DEFAULT 0,
    last_check_in BIGINT DEFAULT 0
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    whatsapp TEXT,
    created_at BIGINT
);

-- Enable Row Level Security (RLS)
-- For simplicity in this integration, we are using the service role or anon key with full access
-- but you should configure RLS for production.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for now as per simple integration)
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to staff" ON staff FOR ALL USING (true) WITH CHECK (true);
