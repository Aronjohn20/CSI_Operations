-- ============================================
-- CSI Operations - Useful Views & Queries
-- OPTIONAL - Run for convenience views
-- ============================================

-- View: Events with their assigned coordinator names
CREATE OR REPLACE VIEW events_with_coordinators AS
SELECT
    e.id AS event_id,
    e.event_name,
    e.event_date,
    e.status,
    e.required_coordinators,
    COALESCE(
        json_agg(
            json_build_object('member_id', m.id, 'name', m.name, 'domain', m.domain)
        ) FILTER (WHERE m.id IS NOT NULL),
        '[]'::json
    ) AS coordinators,
    COUNT(m.id) AS assigned_count
FROM events e
LEFT JOIN event_coordinators ec ON e.id = ec.event_id
LEFT JOIN members m ON ec.member_id = m.id
GROUP BY e.id, e.event_name, e.event_date, e.status, e.required_coordinators
ORDER BY e.event_date DESC;

-- View: Member workload summary
CREATE OR REPLACE VIEW member_workload AS
SELECT
    m.id,
    m.name,
    m.role,
    m.domain,
    m.member_type,
    m.events_coordinated_count,
    m.is_active,
    COALESCE(
        json_agg(e.event_name ORDER BY e.event_date) FILTER (WHERE e.id IS NOT NULL),
        '[]'::json
    ) AS events_list
FROM members m
LEFT JOIN event_coordinators ec ON m.id = ec.member_id
LEFT JOIN events e ON ec.event_id = e.id
GROUP BY m.id, m.name, m.role, m.domain, m.member_type, m.events_coordinated_count, m.is_active
ORDER BY m.events_coordinated_count ASC;

-- View: Domain-wise stats
CREATE OR REPLACE VIEW domain_stats AS
SELECT
    domain,
    COUNT(*) AS total_members,
    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_members,
    SUM(events_coordinated_count) AS total_coordinations,
    ROUND(AVG(events_coordinated_count), 1) AS avg_coordinations
FROM members
GROUP BY domain
ORDER BY total_coordinations DESC;

