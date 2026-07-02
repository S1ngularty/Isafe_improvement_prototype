-- schemas/family_messages.sql
-- Run in: Supabase SQL Editor
-- Safe to re-run (uses DROP IF EXISTS)

CREATE TABLE IF NOT EXISTS family_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;

-- Allow members to view messages of their family
DROP POLICY IF EXISTS "Family members can view messages" ON family_messages;
CREATE POLICY "Family members can view messages" ON family_messages
    FOR SELECT USING (
        family_id = (SELECT family_id FROM profiles WHERE id = auth.uid())
    );

-- Allow members to insert messages into their family
DROP POLICY IF EXISTS "Family members can insert messages" ON family_messages;
CREATE POLICY "Family members can insert messages" ON family_messages
    FOR INSERT WITH CHECK (
        family_id = (SELECT family_id FROM profiles WHERE id = auth.uid())
        AND sender_id = auth.uid()
    );
