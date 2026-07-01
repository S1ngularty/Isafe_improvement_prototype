-- schemas/family_messages.sql
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
CREATE POLICY "Family members can view messages" ON family_messages
    FOR SELECT USING (
        family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    );

-- Allow members to insert messages into their family
CREATE POLICY "Family members can insert messages" ON family_messages
    FOR INSERT WITH CHECK (
        family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    );
