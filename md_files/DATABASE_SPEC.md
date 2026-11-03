# Database Specification (Supabase / PostgreSQL)

## Entity Relationship Overview
The database models 5 primary entities:
1. `members` (23 roster records)
2. `events` (Event container metadata)
3. `event_coordinators` (Junction linking members to events)
4. `feedback_responses` (Participant responses driving certificates)
5. `winners` (1st, 2nd, 3rd place assignments)

---

## Schema DDL

```sql
-- 1. Members Table (Fixed 23 member roster)
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    class_division VARCHAR(50) NOT NULL,
    role VARCHAR(100) DEFAULT 'Executive Member',
    is_available BOOLEAN DEFAULT TRUE,
    events_coordinated_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Events Master Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    mode VARCHAR(10) CHECK (mode IN ('Offline', 'Online')) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    target_class VARCHAR(255) NOT NULL,
    faculty_in_charge VARCHAR(255) NOT NULL,
    brief_description TEXT NOT NULL,
    registration_url TEXT,
    bitly_url TEXT,
    feedback_url TEXT,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Event Coordinators Junction Table
CREATE TABLE event_coordinators (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, member_id)
);

-- 4. Feedback Responses Table
CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    participant_email VARCHAR(255) NOT NULL,
    college_roll_no VARCHAR(100),
    department_class VARCHAR(100),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Event Winners Table
CREATE TABLE event_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    feedback_response_id UUID REFERENCES feedback_responses(id) ON DELETE CASCADE,
    position INT CHECK (position IN (1, 2, 3)),
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (event_id, position)
);
```

