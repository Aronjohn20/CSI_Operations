-- ============================================
-- CSI Operations - Row Level Security (RLS)
-- Run this FOURTH
-- ============================================
-- This makes your data publicly READABLE (since it's a dashboard)
-- but only authenticated users (you/admins) can INSERT/UPDATE/DELETE

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_coordinators ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ access (anyone visiting your Vercel site can read)
CREATE POLICY "Allow public read on members"
    ON members FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on events"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on event_coordinators"
    ON event_coordinators FOR SELECT
    USING (true);

-- AUTHENTICATED WRITE access (only logged-in users can modify)
-- Members table
CREATE POLICY "Allow authenticated insert on members"
    ON members FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on members"
    ON members FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on members"
    ON members FOR DELETE
    TO authenticated
    USING (true);

-- Events table
CREATE POLICY "Allow authenticated insert on events"
    ON events FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on events"
    ON events FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on events"
    ON events FOR DELETE
    TO authenticated
    USING (true);

-- Event Coordinators table
CREATE POLICY "Allow authenticated insert on event_coordinators"
    ON event_coordinators FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on event_coordinators"
    ON event_coordinators FOR DELETE
    TO authenticated
    USING (true);

