-- ============================================
-- CSI Operations - Seed Events & Assignments
-- Run this THIRD (after members are seeded)
-- ============================================

-- Insert all 13 events
INSERT INTO events (event_name, event_date, status, required_coordinators) VALUES
('Cache Quest + Magazine launch', '2026-07-10', 'completed', 3),
('Coder of the Month - July', '2026-07-16', 'completed', 2),
('Tech-Jeopardy', '2026-08-14', 'completed', 2),
('Bug Se Azadi', '2026-08-16', 'completed', 2),
('Build & Ship AI product', '2026-09-01', 'completed', 3),
('Traceback', '2026-09-15', 'completed', 2),
('Retro Rumble', '2026-09-16', 'completed', 2),
('Real or Cake', '2026-09-17', 'completed', 3),
('Say Cheese', '2026-09-18', 'completed', 4),
('Coder of the Month - September', '2026-09-19', 'completed', 2),
('Keeping it Reel', '2026-09-21', 'completed', 2),
('History But Wrong', '2026-09-23', 'completed', 4),
('Off the Script', '2026-09-25', 'completed', 5);

-- Assign coordinators to events using subqueries (matches your existing data)
-- Event 1: Cache Quest + Magazine launch
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Cache Quest + Magazine launch'
  AND m.name IN ('Aafiya Shameer', 'Fathima Naja', 'June Maria Sudhil');

-- Event 2: Coder of the Month - July
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Coder of the Month - July'
  AND m.name IN ('Jovit Jerry', 'Vaishnavi Dev Thekke Veedu');

-- Event 4: Bug Se Azadi
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Bug Se Azadi'
  AND m.name IN ('Anjali Shaju', 'Elizabeth Joby');

-- Event 5: Build & Ship AI product
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Build & Ship AI product'
  AND m.name IN ('Soorya Das K S', 'Aron Varghese John', 'Aafiya Shameer');

-- Event 6: Traceback
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Traceback'
  AND m.name IN ('Soorya Das K S', 'Ben George Simon');

-- Event 7: Retro Rumble
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Retro Rumble'
  AND m.name IN ('Ayyappadas S', 'Fathima Naja');

-- Event 8: Real or Cake
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Real or Cake'
  AND m.name IN ('Soorya Das K S', 'June Maria Sudhil', 'Kripa Ann John');

-- Event 9: Say Cheese
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Say Cheese'
  AND m.name IN ('Alina Mary John', 'Elizabeth Joby', 'Avanthika S', 'Vishnu M P');

-- Event 10: Coder of the Month - September
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Coder of the Month - September'
  AND m.name IN ('Aron Varghese John', 'Aafiya Shameer');

-- Event 11: Keeping it Reel
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Keeping it Reel'
  AND m.name IN ('Anjali Shaju', 'Kripa Ann John');

-- Event 12: History But Wrong
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'History But Wrong'
  AND m.name IN ('Abhishek Joby', 'Vaishnavi Dev Thekke Veedu', 'Riyan Raz', 'Krishna Priya K R');

-- Event 13: Off the Script
INSERT INTO event_coordinators (event_id, member_id)
SELECT e.id, m.id FROM events e, members m
WHERE e.event_name = 'Off the Script'
  AND m.name IN ('Ayyappadas S', 'Ben George Simon', 'Jovit Jerry', 'Sneha Phinoo', 'Gayathri Binoj');

-- NOTE: Tech-Jeopardy (Event 3) had no coordinators assigned in the original data

