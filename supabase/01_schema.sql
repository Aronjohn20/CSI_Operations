-- ============================================
-- CSI Operations - Database Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================

-- 1. Members Table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('Executive', 'Operations', 'Creative', 'Documentation', 'Marketing', 'Technical')),
    class_batch VARCHAR(20) NOT NULL,
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('old_coordinator', 'new_coordinator')),
    is_active BOOLEAN DEFAULT TRUE,
    events_coordinated_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed')),
    required_coordinators INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Event Coordinators Junction Table
CREATE TABLE event_coordinators (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (event_id, member_id)
);

-- 4. Indexes for performance
CREATE INDEX idx_members_domain ON members(domain);
CREATE INDEX idx_members_member_type ON members(member_type);
CREATE INDEX idx_members_is_active ON members(is_active);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_event_coordinators_member ON event_coordinators(member_id);
CREATE INDEX idx_event_coordinators_event ON event_coordinators(event_id);

