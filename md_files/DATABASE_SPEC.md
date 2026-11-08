# Database Specification (Supabase / PostgreSQL)

## Updated Schema Based on Real Data

---

## Members Table
Stores the fixed 23-member CSI roster with role, domain, classification, and activity tracking.

| Column | Type | Constraints | Example |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generated | — |
| `name` | VARCHAR(255) | NOT NULL | Aron Varghese John |
| `role` | VARCHAR(100) | NOT NULL | Operations Lead |
| `domain` | VARCHAR(50) | NOT NULL | Operations |
| `class_batch` | VARCHAR(20) | NOT NULL | S7 CS A |
| `member_type` | VARCHAR(20) | CHECK (`old_coordinator`, `new_coordinator`) | old_coordinator |
| `is_active` | BOOLEAN | DEFAULT TRUE | TRUE |
| `events_coordinated_count` | INT | DEFAULT 0, auto-computed | 3 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |

### Valid `domain` values:
`Executive`, `Operations`, `Creative`, `Documentation`, `Marketing`, `Technical`

### Valid `member_type` values:
- `old_coordinator` — returning/senior coordinators
- `new_coordinator` — newly onboarded coordinators

---

## Events Table
Stores all hosted and upcoming events with coordinator allocation metadata.

| Column | Type | Constraints | Example |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, auto-generated | — |
| `event_name` | VARCHAR(255) | NOT NULL | Cache Quest + Magazine launch |
| `event_date` | DATE | NOT NULL | 2026-07-10 |
| `status` | VARCHAR(20) | CHECK (`planned`, `confirmed`, `completed`) | completed |
| `required_coordinators` | INT | NOT NULL | 3 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |

---

## Event Coordinators (Junction Table)
Links members to events they are assigned to coordinate.

| Column | Type | Constraints |
|---|---|---|
| `event_id` | UUID | FK → events(id), ON DELETE CASCADE |
| `member_id` | UUID | FK → members(id), ON DELETE CASCADE |
| `assigned_at` | TIMESTAMPTZ | DEFAULT now() |
| PRIMARY KEY | | (event_id, member_id) |

---

## SQL DDL

```sql
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    class_batch VARCHAR(20) NOT NULL,
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('old_coordinator', 'new_coordinator')),
    is_active BOOLEAN DEFAULT TRUE,
    events_coordinated_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed')),
    required_coordinators INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_coordinators (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (event_id, member_id)
);
```
